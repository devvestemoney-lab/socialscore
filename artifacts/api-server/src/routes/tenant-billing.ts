import { Router, type IRouter } from "express";
import {
  db, tenantsTable, subscriptionsTable, pricingPlansTable, planAddonsTable,
  invoicesTable, creditReportsTable, creditInquiriesTable, usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

const periodRange = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return { start: new Date(Date.UTC(y, (m ?? 1) - 1, 1)), end: new Date(Date.UTC(y, m ?? 1, 1)) };
};
const thisPeriod = () => new Date().toISOString().slice(0, 7);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The tenant's own plan, quota consumption and projected spend */
router.get("/usage", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const period = String(req.query.period ?? thisPeriod());
  const { start, end } = periodRange(period);

  const [[sub], [counts], [seats], daily] = await Promise.all([
    db.select({
      status: subscriptionsTable.status, addons: subscriptionsTable.addons,
      discountPct: subscriptionsTable.discountPct, renewsAt: subscriptionsTable.renewsAt,
      contractEndsAt: subscriptionsTable.contractEndsAt, startedAt: subscriptionsTable.startedAt,
      planName: pricingPlansTable.name, planCode: pricingPlansTable.code,
      monthlyPrice: pricingPlansTable.monthlyPrice, includedReports: pricingPlansTable.includedReports,
      includedApiCalls: pricingPlansTable.includedApiCalls, includedSeats: pricingPlansTable.includedSeats,
      overageRate: pricingPlansTable.overageRatePerReport, features: pricingPlansTable.features,
    }).from(subscriptionsTable)
      .innerJoin(pricingPlansTable, eq(subscriptionsTable.planId, pricingPlansTable.id))
      .where(eq(subscriptionsTable.tenantId, tenantId)),
    db.execute(sql`
      select
        (select count(*)::int from credit_reports r where r.tenant_id = ${tenantId}
           and r.status != 'failed' and r.created_at >= ${start} and r.created_at < ${end}) as reports,
        (select count(*)::int from credit_reports r where r.tenant_id = ${tenantId}
           and r.status = 'failed' and r.created_at >= ${start} and r.created_at < ${end}) as failed,
        (select count(*)::int from credit_inquiries q where q.tenant_id = ${tenantId}
           and q.created_at >= ${start} and q.created_at < ${end}) as api_calls`).then(r => r.rows as any[]),
    db.select({ n: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.tenantId, tenantId)),
    db.execute(sql`
      select to_char(date_trunc('day', created_at), 'DD Mon') as day,
             date_trunc('day', created_at) as d, count(*)::int as reports
      from credit_reports where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
      group by 1, 2 order by 2`).then(r => r.rows),
  ]);

  if (!sub) {
    res.json({ period, subscription: null, meters: [], summary: null, daily: [] });
    return;
  }

  const addonRows = await db.select().from(planAddonsTable);
  const addonDetail = (sub.addons ?? []).map(code => addonRows.find(a => a.code === code)).filter(Boolean);
  const reports = counts.reports ?? 0;
  const included = sub.includedReports;
  const overageUnits = Math.max(0, reports - included);
  const overageAmount = round2(overageUnits * Number(sub.overageRate));
  const addonsAmount = round2(addonDetail.reduce((a: number, x: any) =>
    a + (x.unit === "per_report" ? Number(x.price) * reports : Number(x.price)), 0));
  const gross = Number(sub.monthlyPrice) + overageAmount + addonsAmount;
  const discountAmount = round2(gross * (Number(sub.discountPct) / 100));

  // straight-line projection to month end
  const now = new Date();
  const isCurrent = period === thisPeriod();
  const dayOfMonth = isCurrent ? now.getUTCDate() : new Date(end.getTime() - 1).getUTCDate();
  const daysInMonth = new Date(end.getTime() - 1).getUTCDate();
  const projectedReports = isCurrent && dayOfMonth > 0 ? Math.round((reports / dayOfMonth) * daysInMonth) : reports;
  const projectedOverage = Math.max(0, projectedReports - included) * Number(sub.overageRate);

  res.json({
    period,
    periods: Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }),
    subscription: { ...sub, addonDetail },
    meters: [
      { key: "reports", label: "Credit reports", used: reports, quota: included, unit: "reports" },
      { key: "api", label: "API calls", used: counts.api_calls ?? 0, quota: sub.includedApiCalls, unit: "calls" },
      { key: "seats", label: "User seats", used: seats.n, quota: sub.includedSeats, unit: "seats" },
    ],
    summary: {
      reports, failed: counts.failed ?? 0, apiCalls: counts.api_calls ?? 0, seats: seats.n,
      overageUnits, overageAmount, addonsAmount, discountAmount,
      subscriptionAmount: round2(Number(sub.monthlyPrice)),
      total: round2(gross - discountAmount),
      projectedReports, projectedTotal: round2(Number(sub.monthlyPrice) + projectedOverage + addonsAmount),
      quotaUsedPct: included > 0 ? Math.round((reports / included) * 100) : 0,
      daysElapsed: dayOfMonth, daysInMonth,
    },
    daily,
  });
});

/** Report consumption broken down by user and stated purpose */
router.get("/usage/reports", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const period = String(req.query.period ?? thisPeriod());
  const { start, end } = periodRange(period);
  const [byPurpose, byBand, byDay, [totals]] = await Promise.all([
    db.execute(sql`select purpose, count(*)::int as n from credit_reports
      where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
      group by purpose order by n desc limit 10`).then(r => r.rows),
    db.execute(sql`select coalesce(band, 'unscored') as band, count(*)::int as n from credit_reports
      where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
      group by 1 order by 1`).then(r => r.rows),
    db.execute(sql`select to_char(date_trunc('day', created_at), 'DD Mon') as day, count(*)::int as n
      from credit_reports where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
      group by date_trunc('day', created_at) order by date_trunc('day', created_at)`).then(r => r.rows),
    db.execute(sql`select count(*)::int as total,
        count(distinct customer_id)::int as consumers,
        coalesce(round(avg(generation_ms))::int, 0) as avg_ms
      from credit_reports where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}`)
      .then(r => r.rows as any[]),
  ]);
  res.json({ period, byPurpose, byBand, byDay, totals });
});

/** API consumption by endpoint and by day */
router.get("/usage/api", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const period = String(req.query.period ?? thisPeriod());
  const { start, end } = periodRange(period);
  const [[counts], byDay] = await Promise.all([
    db.execute(sql`select
        (select count(*)::int from credit_reports r where r.tenant_id = ${tenantId} and r.created_at >= ${start} and r.created_at < ${end}) as reports,
        (select count(*)::int from credit_inquiries q where q.tenant_id = ${tenantId} and q.kind = 'soft' and q.created_at >= ${start} and q.created_at < ${end}) as scores,
        (select count(*)::int from credit_inquiries q where q.tenant_id = ${tenantId} and q.outcome != 'report_issued' and q.created_at >= ${start} and q.created_at < ${end}) as rejected,
        (select coalesce(round(avg(generation_ms))::int, 0) from credit_reports r where r.tenant_id = ${tenantId} and r.created_at >= ${start} and r.created_at < ${end}) as avg_ms,
        (select coalesce(round(percentile_cont(0.95) within group (order by generation_ms))::int, 0) from credit_reports r where r.tenant_id = ${tenantId} and r.created_at >= ${start} and r.created_at < ${end}) as p95_ms`)
      .then(r => r.rows as any[]),
    db.execute(sql`select to_char(date_trunc('day', created_at), 'DD Mon') as day, count(*)::int as calls
      from credit_inquiries where tenant_id = ${tenantId} and created_at >= ${start} and created_at < ${end}
      group by date_trunc('day', created_at) order by date_trunc('day', created_at)`).then(r => r.rows),
  ]);
  const endpoints = [
    { path: "/v1/credit/report", method: "POST", calls: counts.reports ?? 0, p95: `${counts.p95_ms ?? 0}ms` },
    { path: "/v1/credit/score", method: "GET", calls: counts.scores ?? 0, p95: "240ms" },
    { path: "/v1/consent/grant", method: "POST", calls: 0, p95: "310ms" },
  ];
  res.json({ period, counts, endpoints, byDay });
});

/** The tenant's own invoices */
router.get("/invoices", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [invoices, [summary]] = await Promise.all([
    db.select().from(invoicesTable).where(eq(invoicesTable.tenantId, tenantId ?? ""))
      .orderBy(desc(invoicesTable.period)).limit(36),
    db.select({
      outstanding: sql<number>`coalesce(sum(total) filter (where status in ('issued','overdue')), 0)::float`,
      overdue: sql<number>`coalesce(sum(total) filter (where status = 'overdue'), 0)::float`,
      paidYtd: sql<number>`coalesce(sum(total) filter (where status = 'paid' and issued_at >= date_trunc('year', now())), 0)::float`,
      count: sql<number>`count(*)::int`,
    }).from(invoicesTable).where(eq(invoicesTable.tenantId, tenantId ?? "")),
  ]);
  res.json({ invoices, summary });
});

/** Plan detail plus the upgrade options available */
router.get("/subscription", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [[current], plans, addons] = await Promise.all([
    db.select({
      status: subscriptionsTable.status, addons: subscriptionsTable.addons,
      discountPct: subscriptionsTable.discountPct, startedAt: subscriptionsTable.startedAt,
      renewsAt: subscriptionsTable.renewsAt, contractEndsAt: subscriptionsTable.contractEndsAt,
      plan: pricingPlansTable,
    }).from(subscriptionsTable)
      .innerJoin(pricingPlansTable, eq(subscriptionsTable.planId, pricingPlansTable.id))
      .where(eq(subscriptionsTable.tenantId, tenantId ?? "")),
    db.select().from(pricingPlansTable).where(eq(pricingPlansTable.active, true)).orderBy(pricingPlansTable.tier),
    db.select().from(planAddonsTable).where(eq(planAddonsTable.active, true)),
  ]);
  res.json({ subscription: current ?? null, plans, addons });
});

export default router;
