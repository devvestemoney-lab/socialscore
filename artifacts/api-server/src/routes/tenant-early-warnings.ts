import { Router, type IRouter } from "express";
import {
  db, ewsActionsTable, tenantsTable, customersTable, usersTable,
  loansTable, creditInquiriesTable, creditScoresTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

export const SIGNAL_TYPES = {
  cross_default: "Cross-default risk",
  arrears_elsewhere: "Arrears elsewhere",
  credit_shopping: "Credit shopping",
  over_indebtedness: "Over-indebtedness",
  score_deterioration: "Score deterioration",
  loan_stacking: "Loan stacking",
} as const;

/**
 * Detect early-warning signals across the tenant's book.
 * Every signal is derived from live bureau data; case state is merged from ews_actions.
 */
function detectionSql(institution: string) {
  return sql`
    with book as (
      select cu.id as customer_id, cu.first_name, cu.last_name, cu.nrc, cu.phone, cu.province,
             coalesce(sum(l.outstanding_balance) filter (where l.status != 'closed'), 0)::float as my_exposure,
             coalesce(sum(l.missed_payments) filter (where l.status = 'active'), 0)::int as my_missed,
             count(*) filter (where l.status = 'active')::int as my_active
      from customers cu
      join loans l on l.customer_id = cu.id and l.institution = ${institution}
      group by cu.id
    ),
    elsewhere as (
      select b.customer_id,
             coalesce(sum(l.outstanding_balance) filter (where l.status != 'closed'), 0)::float as other_exposure,
             coalesce(sum(l.missed_payments) filter (where l.status = 'active'), 0)::int as other_missed,
             count(*) filter (where l.status in ('defaulted','written_off'))::int as other_defaults,
             count(distinct l.institution)::int as other_institutions,
             count(*) filter (where l.disbursed_at >= now() - interval '120 days')::int as recent_tradelines,
             max(l.institution) filter (where l.status in ('defaulted','written_off')) as default_institution,
             max(l.institution) filter (where l.status = 'active' and l.missed_payments > 0) as arrears_institution
      from book b join loans l on l.customer_id = b.customer_id and l.institution != ${institution}
      group by b.customer_id
    ),
    inq as (
      select b.customer_id,
             count(*) filter (where q.kind = 'hard' and q.created_at >= now() - interval '90 days')::int as hard_90d,
             count(distinct q.institution_name) filter (where q.kind = 'hard' and q.created_at >= now() - interval '90 days')::int as lenders_90d
      from book b join credit_inquiries q on q.customer_id = b.customer_id
      group by b.customer_id
    ),
    scores as (
      select customer_id,
             max(score) filter (where rn = 1)::float as latest,
             max(score) filter (where rn = 2)::float as previous,
             max(created_at) filter (where rn = 1) as scored_at
      from (select customer_id, score, created_at, row_number() over (partition by customer_id order by created_at desc) rn
            from credit_scores) t
      where rn <= 2 group by customer_id
    ),
    facts as (
      select b.*, coalesce(e.other_exposure,0) as other_exposure, coalesce(e.other_missed,0) as other_missed,
             coalesce(e.other_defaults,0) as other_defaults, coalesce(e.other_institutions,0) as other_institutions,
             coalesce(e.recent_tradelines,0) as recent_tradelines, e.default_institution, e.arrears_institution,
             coalesce(i.hard_90d,0) as hard_90d, coalesce(i.lenders_90d,0) as lenders_90d,
             s.latest as score, s.previous as prev_score, s.scored_at
      from book b left join elsewhere e on e.customer_id = b.customer_id
                  left join inq i on i.customer_id = b.customer_id
                  left join scores s on s.customer_id = b.customer_id
    ),
    signals as (
      select customer_id, 'cross_default' as signal_type,
             'Defaulted facility at ' || coalesce(default_institution, 'another institution') || ' while active with you' as detail,
             case when my_exposure > 100000 then 'high' when my_exposure > 20000 then 'medium' else 'low' end as severity
      from facts where other_defaults > 0 and my_active > 0
      union all
      select customer_id, 'arrears_elsewhere',
             'Missed payments reported by ' || coalesce(arrears_institution, 'another institution') || ' (' || other_missed || ' on active facilities)',
             case when other_missed >= 3 then 'high' when other_missed = 2 then 'medium' else 'low' end
      from facts where other_missed > 0 and my_active > 0
      union all
      select customer_id, 'credit_shopping',
             hard_90d || ' hard inquiries across ' || lenders_90d || ' lenders in 90 days',
             case when hard_90d >= 5 then 'high' when hard_90d >= 4 then 'medium' else 'low' end
      from facts where hard_90d >= 3 and lenders_90d >= 2
      union all
      select customer_id, 'over_indebtedness',
             'Exposure elsewhere (K' || round(other_exposure)::text || ') is ' || round(other_exposure / nullif(my_exposure,0))::text || 'x your position across ' || other_institutions || ' institutions',
             case when other_exposure > my_exposure * 4 then 'high' when other_exposure > my_exposure * 2.5 then 'medium' else 'low' end
      from facts where my_exposure > 0 and other_exposure > my_exposure * 2 and other_exposure > 30000
      union all
      select customer_id, 'score_deterioration',
             'Score fell ' || round(prev_score - score)::text || ' pts to ' || round(score)::text || ' since the last scoring run',
             case when prev_score - score >= 80 then 'high' when prev_score - score >= 50 then 'medium' else 'low' end
      from facts where score is not null and prev_score is not null and prev_score - score >= 30
      union all
      select customer_id, 'loan_stacking',
             recent_tradelines || ' new facilities opened elsewhere in the last 120 days',
             case when recent_tradelines >= 4 then 'high' when recent_tradelines = 3 then 'medium' else 'low' end
      from facts where recent_tradelines >= 2
    )
    select s.signal_type, s.detail, s.severity, f.*
    from signals s join facts f on f.customer_id = s.customer_id`;
}

router.get("/early-warnings", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const institution = tenant?.name ?? "";

  const [detected, actions] = await Promise.all([
    db.execute(detectionSql(institution)).then(r => r.rows as any[]),
    db.select().from(ewsActionsTable).where(eq(ewsActionsTable.tenantId, tenantId)),
  ]);

  const actionMap = new Map(actions.map(a => [`${a.customerId}:${a.signalType}`, a]));
  const sevRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

  let signals = detected.map(d => {
    const action = actionMap.get(`${d.customer_id}:${d.signal_type}`);
    return {
      key: `${d.customer_id}:${d.signal_type}`,
      customerId: d.customer_id,
      consumerName: `${d.first_name} ${d.last_name}`,
      nrc: d.nrc, phone: d.phone, province: d.province,
      signalType: d.signal_type,
      signalLabel: (SIGNAL_TYPES as any)[d.signal_type] ?? d.signal_type,
      detail: d.detail,
      severity: d.severity,
      myExposure: d.my_exposure, myMissed: d.my_missed, myActive: d.my_active,
      otherExposure: d.other_exposure, otherDefaults: d.other_defaults,
      otherInstitutions: d.other_institutions, hard90d: d.hard_90d,
      score: d.score != null ? Math.round(d.score) : null,
      prevScore: d.prev_score != null ? Math.round(d.prev_score) : null,
      status: action?.status ?? "open",
      assignee: action?.assignee ?? "",
      note: action?.note ?? null,
      actionTaken: action?.actionTaken ?? null,
      updatedAt: action?.updatedAt ?? null,
    };
  });

  const summary = {
    active: signals.filter(s => ["open", "reviewing"].includes(s.status)).length,
    high: signals.filter(s => s.severity === "high" && ["open", "reviewing"].includes(s.status)).length,
    consumers: new Set(signals.filter(s => ["open", "reviewing"].includes(s.status)).map(s => s.customerId)).size,
    exposureAtRisk: [...new Map(signals.filter(s => ["open", "reviewing"].includes(s.status))
      .map(s => [s.customerId, s.myExposure])).values()].reduce((a: number, v: any) => a + Number(v), 0),
    byType: Object.keys(SIGNAL_TYPES).map(t => ({
      type: t, label: (SIGNAL_TYPES as any)[t],
      count: signals.filter(s => s.signalType === t && ["open", "reviewing"].includes(s.status)).length,
    })),
    actioned: signals.filter(s => s.status === "actioned").length,
    dismissed: signals.filter(s => s.status === "dismissed").length,
  };

  const severity = String(req.query.severity ?? "");
  const type = String(req.query.type ?? "");
  const status = String(req.query.status ?? "active");
  const search = String(req.query.search ?? "").trim().toLowerCase();
  if (["high", "medium", "low"].includes(severity)) signals = signals.filter(s => s.severity === severity);
  if (type && type !== "all") signals = signals.filter(s => s.signalType === type);
  if (status === "active") signals = signals.filter(s => ["open", "reviewing"].includes(s.status));
  else if (["open", "reviewing", "actioned", "dismissed"].includes(status)) signals = signals.filter(s => s.status === status);
  if (search) signals = signals.filter(s => (s.consumerName + s.nrc).toLowerCase().includes(search));

  signals.sort((a, b) =>
    sevRank[a.severity] - sevRank[b.severity] || Number(b.myExposure) - Number(a.myExposure));

  res.json({ signals, summary, institution });
});

/** Case management: acknowledge, action or dismiss a signal */
router.put("/early-warnings/:customerId/:signalType", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const { status, note, actionTaken, assignee } = req.body ?? {};
  if (!["open", "reviewing", "actioned", "dismissed"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" });
    return;
  }
  if (["actioned", "dismissed"].includes(status) && !note) {
    res.status(400).json({ error: "Bad Request", message: "A note is required when actioning or dismissing a signal" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const values = {
    tenantId, customerId: req.params.customerId, signalType: req.params.signalType,
    status, note: note ?? null, actionTaken: actionTaken ?? null,
    assignee: assignee ?? user?.name ?? "", updatedBy: user?.name ?? "", updatedAt: new Date(),
  };
  const [action] = await db.insert(ewsActionsTable).values(values)
    .onConflictDoUpdate({
      target: [ewsActionsTable.tenantId, ewsActionsTable.customerId, ewsActionsTable.signalType],
      set: { status: values.status, note: values.note, actionTaken: values.actionTaken, assignee: values.assignee, updatedBy: values.updatedBy, updatedAt: values.updatedAt },
    })
    .returning();
  res.json({ action });
});

export default router;
