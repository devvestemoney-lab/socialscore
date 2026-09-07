import { Router, type IRouter } from "express";
import { db, alertsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const SEGMENT_SQL = `case when score >= 720 then 'Prime' when score >= 660 then 'Near-Prime' when score >= 580 then 'Subprime' else 'Deep Subprime' end`;
const SEGMENT_ORDER = ["Prime", "Near-Prime", "Subprime", "Deep Subprime"];

// ─── RISK SEGMENTATION ───────────────────────────────────────────────────────

router.get("/risk-segmentation", ...superAdmin, async (_req, res) => {
  const [segments, migration] = await Promise.all([
    db.execute(sql.raw(`
      with latest as (
        select distinct on (customer_id) customer_id, score::float as score, probability_of_default::float as pd
        from credit_scores order by customer_id, created_at desc
      )
      select ${SEGMENT_SQL} as segment,
             count(*)::int as consumers,
             round((avg(pd) * 100)::numeric, 1)::float as avg_pd,
             round(avg(score))::int as avg_score
      from latest group by 1
    `)),
    db.execute(sql.raw(`
      with ranked as (
        select customer_id, score::float as score,
               row_number() over (partition by customer_id order by created_at desc) as rn
        from credit_scores
      ),
      pairs as (
        select l.customer_id,
               (${SEGMENT_SQL.replace(/score/g, "p.score")}) as prev_segment,
               (${SEGMENT_SQL.replace(/score/g, "l.score")}) as curr_segment
        from ranked l join ranked p on p.customer_id = l.customer_id and p.rn = 2
        where l.rn = 1
      )
      select prev_segment, curr_segment, count(*)::int as consumers
      from pairs where prev_segment != curr_segment
      group by 1, 2 order by consumers desc
    `)),
  ]);

  const segRows = segments.rows as any[];
  const total = segRows.reduce((a, s) => a + s.consumers, 0);
  const ordered = SEGMENT_ORDER.map(name => {
    const row = segRows.find(s => s.segment === name);
    return {
      name,
      consumers: row?.consumers ?? 0,
      share: total ? Math.round(((row?.consumers ?? 0) / total) * 100) : 0,
      avgPd: row?.avg_pd ?? 0,
      avgScore: row?.avg_score ?? 0,
    };
  });

  const rank = (s: string) => SEGMENT_ORDER.indexOf(s);
  const migrations = (migration.rows as any[]).map(m => ({
    from: m.prev_segment,
    to: m.curr_segment,
    consumers: m.consumers,
    direction: rank(m.curr_segment) < rank(m.prev_segment) ? "improving" : "deteriorating",
  }));

  res.json({ segments: ordered, total, migrations });
});

// ─── PORTFOLIO MONITORING ────────────────────────────────────────────────────

router.get("/portfolio", ...superAdmin, async (_req, res) => {
  const result = await db.execute(sql.raw(`
    select institution,
           count(*) filter (where status = 'active')::int as active_loans,
           coalesce(sum(outstanding_balance) filter (where status != 'closed'), 0)::float as outstanding,
           coalesce(round(avg(amount)), 0)::float as avg_loan,
           coalesce(round(100.0 * sum(outstanding_balance) filter (where status in ('defaulted','written_off'))
             / nullif(sum(outstanding_balance) filter (where status != 'closed'), 0), 1), 0)::float as npl_ratio,
           coalesce(round(100.0 * count(*) filter (where status in ('defaulted','written_off') and disbursed_at >= now() - interval '180 days')
             / nullif(count(*) filter (where disbursed_at >= now() - interval '180 days'), 0), 1), 0)::float as recent_default_rate,
           coalesce(round(100.0 * count(*) filter (where status in ('defaulted','written_off'))
             / nullif(count(*), 0), 1), 0)::float as overall_default_rate
    from loans group by institution order by outstanding desc
  `));

  const books = (result.rows as any[]).map(b => ({
    institution: b.institution,
    activeLoans: b.active_loans,
    outstanding: b.outstanding,
    avgLoan: b.avg_loan,
    nplRatio: b.npl_ratio,
    trend: b.recent_default_rate < b.overall_default_rate - 1 ? "improving"
      : b.recent_default_rate > b.overall_default_rate + 1 ? "deteriorating" : "stable",
  }));

  const totalOutstanding = books.reduce((a, b) => a + b.outstanding, 0);
  const summary = {
    activeLoans: books.reduce((a, b) => a + b.activeLoans, 0),
    totalOutstanding,
    systemNpl: totalOutstanding
      ? Math.round(books.reduce((a, b) => a + (b.nplRatio / 100) * b.outstanding, 0) / totalOutstanding * 1000) / 10
      : 0,
    avgLoan: books.length ? Math.round(books.reduce((a, b) => a + b.avgLoan * b.activeLoans, 0) / Math.max(1, books.reduce((a, b) => a + b.activeLoans, 0))) : 0,
    breaches: books.filter(b => b.nplRatio > 10).map(b => b.institution),
  };

  res.json({ books, summary });
});

// ─── ALERTS ──────────────────────────────────────────────────────────────────

/** Scan live platform state and raise alerts that don't exist yet */
async function runDetections() {
  const detections: { severity: "critical" | "high" | "medium" | "low"; title: string; source: string; scope: string; dedupeKey: string }[] = [];

  const npl = (await db.execute(sql.raw(`
    select institution, round(100.0 * sum(outstanding_balance) filter (where status in ('defaulted','written_off'))
      / nullif(sum(outstanding_balance) filter (where status != 'closed'), 0), 1)::float as ratio
    from loans group by institution having
      round(100.0 * sum(outstanding_balance) filter (where status in ('defaulted','written_off'))
      / nullif(sum(outstanding_balance) filter (where status != 'closed'), 0), 1) > 10
  `))).rows as any[];
  for (const r of npl) {
    detections.push({ severity: "critical", title: `${r.institution} NPL ratio at ${r.ratio}% — exceeds 10% regulatory threshold`, source: "Portfolio Monitoring", scope: r.institution, dedupeKey: `npl:${r.institution}` });
  }

  const overdue = (await db.execute(sql.raw(`
    select i.name, s.period from data_submissions s join institutions i on i.id = s.institution_id where s.status = 'overdue'
  `))).rows as any[];
  for (const r of overdue) {
    detections.push({ severity: "high", title: `${r.name} data submission overdue for ${r.period}`, source: "Data Contributions", scope: r.name, dedupeKey: `overdue:${r.period}:${r.name}` });
  }

  const failedJobs = (await db.execute(sql.raw(`select job_no, type, source from processing_jobs where status = 'failed'`))).rows as any[];
  for (const r of failedJobs) {
    detections.push({ severity: "high", title: `Processing job ${r.job_no} failed — ${r.type} (${r.source})`, source: "Data Processing", scope: "Platform", dedupeKey: `job:${r.job_no}` });
  }

  const expiringKeys = (await db.execute(sql.raw(`
    select t.name, k.id from api_keys k join tenants t on t.id = k.tenant_id
    where k.status = 'active' and k.expires_at between now() and now() + interval '30 days'
  `))).rows as any[];
  for (const r of expiringKeys) {
    detections.push({ severity: "low", title: `API key for ${r.name} expires within 30 days`, source: "API Management", scope: r.name, dedupeKey: `keyexp:${r.id}` });
  }

  const [slaBreaches] = (await db.execute(sql.raw(`
    select count(*)::int as n from disputes
    where status in ('open','under_investigation','awaiting_institution','escalated') and due_at < now()
  `))).rows as any[];
  if (slaBreaches.n > 0) {
    detections.push({ severity: "high", title: `${slaBreaches.n} dispute(s) past the 21-day statutory SLA`, source: "Disputes", scope: "Platform", dedupeKey: "disputes:sla" });
  }

  const quality = (await db.execute(sql.raw(`
    select id, issue, source_label from data_quality_issues where status = 'open' and severity = 'high'
  `))).rows as any[];
  for (const r of quality) {
    detections.push({ severity: "medium", title: `Data quality: ${r.issue} (${r.source_label})`, source: "Data Quality", scope: r.source_label, dedupeKey: `dq:${r.id}` });
  }

  for (const d of detections) {
    await db.insert(alertsTable).values(d).onConflictDoNothing({ target: alertsTable.dedupeKey });
  }
}

router.get("/alerts", ...superAdmin, async (req, res) => {
  await runDetections();
  const severity = String(req.query.severity ?? "");
  const where = ["critical", "high", "medium", "low"].includes(severity) ? eq(alertsTable.severity, severity as "critical") : undefined;

  const [alerts, [summary]] = await Promise.all([
    db.select().from(alertsTable).where(where)
      .orderBy(sql`case status when 'open' then 0 when 'acknowledged' then 1 else 2 end`,
        sql`case severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
        desc(alertsTable.createdAt))
      .limit(100),
    db.select({
      open: sql<number>`count(*) filter (where status = 'open')::int`,
      critical: sql<number>`count(*) filter (where status = 'open' and severity = 'critical')::int`,
      acknowledged: sql<number>`count(*) filter (where status = 'acknowledged')::int`,
      resolved7d: sql<number>`count(*) filter (where resolved_at >= ${daysAgo(7)})::int`,
      mttrHours: sql<number>`coalesce(round(avg(extract(epoch from (resolved_at - created_at)) / 3600) filter (where resolved_at is not null))::int, 0)`,
    }).from(alertsTable),
  ]);

  res.json({ alerts, summary });
});

router.put("/alerts/:id/status", ...superAdmin, async (req, res) => {
  const status = String(req.body?.status ?? "");
  if (!["acknowledged", "resolved", "open"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" });
    return;
  }
  const [alert] = await db.update(alertsTable)
    .set({ status: status as "open", resolvedAt: status === "resolved" ? new Date() : null, updatedAt: new Date() })
    .where(eq(alertsTable.id, req.params.id))
    .returning();
  if (!alert) {
    res.status(404).json({ error: "Not Found", message: "Alert not found" });
    return;
  }
  res.json({ alert });
});

export default router;
