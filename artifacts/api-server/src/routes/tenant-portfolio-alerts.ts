import { Router, type IRouter } from "express";
import {
  db, riskAppetiteTable, portfolioAlertStatesTable, tenantsTable, usersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

type Metric = {
  key: string; label: string; unit: "pct" | "score" | "count";
  direction: "max" | "min"; defaultThreshold: number; category: string; description: string;
};

const METRICS: Metric[] = [
  { key: "npl_ratio", label: "NPL ratio", unit: "pct", direction: "max", defaultThreshold: 10, category: "Credit quality",
    description: "Outstanding balance on defaulted or written-off facilities as a share of your book" },
  { key: "arrears_rate", label: "Arrears rate", unit: "pct", direction: "max", defaultThreshold: 8, category: "Credit quality",
    description: "Active facilities carrying at least one missed payment" },
  { key: "subprime_share", label: "Subprime share of book", unit: "pct", direction: "max", defaultThreshold: 30, category: "Portfolio mix",
    description: "Borrowers scoring below 580 as a share of your scored book" },
  { key: "avg_score", label: "Average borrower score", unit: "score", direction: "min", defaultThreshold: 600, category: "Portfolio mix",
    description: "Mean bureau score across your active borrowers" },
  { key: "multi_lender_share", label: "Multi-lender borrowers", unit: "pct", direction: "max", defaultThreshold: 45, category: "Concentration",
    description: "Borrowers holding facilities at three or more institutions" },
  { key: "single_name_concentration", label: "Single-name concentration", unit: "pct", direction: "max", defaultThreshold: 8, category: "Concentration",
    description: "Largest single borrower exposure as a share of total outstanding" },
  { key: "wallet_share", label: "Average wallet share", unit: "pct", direction: "min", defaultThreshold: 40, category: "Competitive",
    description: "Share of your borrowers' total bureau debt that sits with you" },
];

/** Compute every appetite metric from the tenant's live book */
async function computeMetrics(institution: string) {
  const rows = (await db.execute(sql`
    with book as (
      select cu.id,
        coalesce(sum(l.outstanding_balance) filter (where l.status != 'closed'), 0)::float as my_exposure,
        count(*) filter (where l.status = 'active')::int as active_loans,
        count(*) filter (where l.status = 'active' and l.missed_payments > 0)::int as arrears_loans,
        coalesce(sum(l.outstanding_balance) filter (where l.status in ('defaulted','written_off')), 0)::float as npl_exposure,
        (select round(cs.score)::int from credit_scores cs where cs.customer_id = cu.id order by cs.created_at desc limit 1) as score
      from customers cu join loans l on l.customer_id = cu.id and l.institution = ${institution}
      group by cu.id
    ),
    bureau as (
      select b.id,
        coalesce(sum(l.outstanding_balance) filter (where l.status != 'closed'), 0)::float as total_exposure,
        count(distinct l.institution)::int as institutions
      from book b join loans l on l.customer_id = b.id group by b.id
    )
    select
      coalesce(sum(b.my_exposure), 0)::float as total_outstanding,
      coalesce(sum(b.npl_exposure), 0)::float as npl_exposure,
      coalesce(sum(b.active_loans), 0)::int as active_loans,
      coalesce(sum(b.arrears_loans), 0)::int as arrears_loans,
      count(*) filter (where b.score is not null)::int as scored,
      count(*) filter (where b.score < 580)::int as subprime,
      coalesce(round(avg(b.score) filter (where b.score is not null))::int, 0) as avg_score,
      count(*)::int as borrowers,
      count(*) filter (where br.institutions >= 3)::int as multi_lender,
      coalesce(max(b.my_exposure), 0)::float as largest_exposure,
      coalesce(sum(br.total_exposure), 0)::float as bureau_exposure
    from book b left join bureau br on br.id = b.id`)).rows as any[];
  const f = rows[0] ?? {};
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

  return {
    facts: f,
    values: {
      npl_ratio: pct(f.npl_exposure, f.total_outstanding + f.npl_exposure),
      arrears_rate: pct(f.arrears_loans, f.active_loans),
      subprime_share: pct(f.subprime, f.scored),
      avg_score: f.avg_score,
      multi_lender_share: pct(f.multi_lender, f.borrowers),
      single_name_concentration: pct(f.largest_exposure, f.total_outstanding),
      wallet_share: pct(f.total_outstanding, f.bureau_exposure),
    } as Record<string, number>,
  };
}

router.get("/portfolio-alerts", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const institution = tenant?.name ?? "";

  const [{ facts, values }, appetite, states] = await Promise.all([
    computeMetrics(institution),
    db.select().from(riskAppetiteTable).where(eq(riskAppetiteTable.tenantId, tenantId)),
    db.select().from(portfolioAlertStatesTable).where(eq(portfolioAlertStatesTable.tenantId, tenantId)),
  ]);
  const thresholdMap = new Map(appetite.map(a => [a.metricKey, Number(a.threshold)]));
  const stateMap = new Map(states.map(s => [s.metricKey, s]));

  const metrics = METRICS.map(m => {
    const value = values[m.key] ?? 0;
    const threshold = thresholdMap.get(m.key) ?? m.defaultThreshold;
    const breached = m.direction === "max" ? value > threshold : value < threshold;
    // headroom: how far past (or short of) the limit, as a % of the limit
    const gap = threshold > 0 ? Math.abs((value - threshold) / threshold) * 100 : 0;
    const near = !breached && gap <= 15;
    const severity = breached ? (gap >= 30 ? "high" : "medium") : near ? "low" : "none";
    const state = stateMap.get(m.key);
    return {
      ...m, value, threshold, breached, near, severity,
      utilisation: m.direction === "max"
        ? (threshold > 0 ? Math.min(150, (value / threshold) * 100) : 0)
        : (value > 0 ? Math.min(150, (threshold / Math.max(value, 1)) * 100) : 150),
      status: state?.status ?? "open",
      note: state?.note ?? null,
      updatedBy: state?.updatedBy ?? null,
      updatedAt: state?.updatedAt ?? null,
    };
  });

  const alerts = metrics.filter(m => m.breached || m.near);
  const summary = {
    breaches: metrics.filter(m => m.breached && m.status !== "resolved").length,
    watch: metrics.filter(m => m.near && m.status !== "resolved").length,
    healthy: metrics.filter(m => !m.breached && !m.near).length,
    acknowledged: metrics.filter(m => (m.breached || m.near) && m.status === "acknowledged").length,
    totalOutstanding: facts.total_outstanding ?? 0,
    exposureAtRisk: facts.npl_exposure ?? 0,
    borrowers: facts.borrowers ?? 0,
  };

  res.json({ metrics, alerts, summary, facts, institution });
});

/** Update the appetite threshold for a metric */
router.put("/portfolio-alerts/appetite/:metricKey", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  if (!METRICS.some(m => m.key === req.params.metricKey)) {
    res.status(404).json({ error: "Not Found", message: "Unknown metric" }); return;
  }
  const threshold = Number(req.body?.threshold);
  if (!Number.isFinite(threshold) || threshold < 0) {
    res.status(400).json({ error: "Bad Request", message: "A non-negative threshold is required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [row] = await db.insert(riskAppetiteTable)
    .values({ tenantId, metricKey: req.params.metricKey, threshold: String(threshold), updatedBy: user?.name ?? "" })
    .onConflictDoUpdate({
      target: [riskAppetiteTable.tenantId, riskAppetiteTable.metricKey],
      set: { threshold: String(threshold), updatedBy: user?.name ?? "", updatedAt: new Date() },
    }).returning();
  res.json({ appetite: row });
});

/** Acknowledge or resolve a breach */
router.put("/portfolio-alerts/:metricKey/status", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const { status, note } = req.body ?? {};
  if (!["open", "acknowledged", "resolved"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" }); return;
  }
  if (status === "resolved" && !note) {
    res.status(400).json({ error: "Bad Request", message: "A note is required when resolving a portfolio alert" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [row] = await db.insert(portfolioAlertStatesTable)
    .values({ tenantId, metricKey: req.params.metricKey, status, note: note ?? null, updatedBy: user?.name ?? "" })
    .onConflictDoUpdate({
      target: [portfolioAlertStatesTable.tenantId, portfolioAlertStatesTable.metricKey],
      set: { status, note: note ?? null, updatedBy: user?.name ?? "", updatedAt: new Date() },
    }).returning();
  res.json({ state: row });
});

export default router;
