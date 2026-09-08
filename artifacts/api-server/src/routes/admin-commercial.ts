import { Router, type IRouter } from "express";
import {
  db, pricingPlansTable, planAddonsTable, subscriptionsTable, invoicesTable,
  tenantsTable, creditReportsTable, creditInquiriesTable, usersTable,
  insertPricingPlanSchema,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;

const periodRange = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return { start: new Date(Date.UTC(y, (m ?? 1) - 1, 1)), end: new Date(Date.UTC(y, m ?? 1, 1)) };
};
const thisPeriod = () => new Date().toISOString().slice(0, 7);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Metered usage per tenant for a period, priced against their plan */
async function usageFor(period: string) {
  const { start, end } = periodRange(period);
  const rows = (await db.execute(sql`
    select t.id as tenant_id, t.name as tenant_name, t.type as tenant_type, t.status as tenant_status,
           p.id as plan_id, p.name as plan_name, p.code as plan_code,
           p.monthly_price::float as monthly_price, p.included_reports, p.included_api_calls,
           p.overage_rate_per_report::float as overage_rate,
           s.status as subscription_status, s.addons, s.discount_pct::float as discount_pct, s.renews_at,
           (select count(*)::int from credit_reports r
              where r.tenant_id = t.id and r.status != 'failed'
                and r.created_at >= ${start} and r.created_at < ${end}) as reports,
           (select count(*)::int from credit_inquiries q
              where q.tenant_id = t.id and q.created_at >= ${start} and q.created_at < ${end}) as api_calls,
           (select count(*)::int from users u where u.tenant_id = t.id) as seats
    from tenants t
    left join subscriptions s on s.tenant_id = t.id
    left join pricing_plans p on p.id = s.plan_id
    order by t.name`)).rows as any[];

  const addons = await db.select().from(planAddonsTable);
  const addonMap = new Map(addons.map(a => [a.code, a]));

  return rows.map(r => {
    const included = r.included_reports ?? 0;
    const overageUnits = Math.max(0, (r.reports ?? 0) - included);
    const overageAmount = round2(overageUnits * (r.overage_rate ?? 0));
    const subscriptionAmount = round2(r.monthly_price ?? 0);
    const addonCodes: string[] = r.addons ?? [];
    const addonsAmount = round2(addonCodes.reduce((a, code) => {
      const addon = addonMap.get(code);
      if (!addon) return a;
      return a + (addon.unit === "per_report" ? Number(addon.price) * (r.reports ?? 0) : Number(addon.price));
    }, 0));
    const gross = subscriptionAmount + overageAmount + addonsAmount;
    const discountAmount = round2(gross * ((r.discount_pct ?? 0) / 100));
    return {
      tenantId: r.tenant_id, tenantName: r.tenant_name, tenantType: r.tenant_type, tenantStatus: r.tenant_status,
      planId: r.plan_id, planName: r.plan_name ?? "Unassigned", planCode: r.plan_code,
      subscriptionStatus: r.subscription_status ?? "none",
      renewsAt: r.renews_at,
      reports: r.reports ?? 0, apiCalls: r.api_calls ?? 0, seats: r.seats ?? 0,
      includedReports: included, includedApiCalls: r.included_api_calls ?? 0,
      quotaUsedPct: included > 0 ? Math.round(((r.reports ?? 0) / included) * 100) : 0,
      overageUnits, overageRate: r.overage_rate ?? 0,
      subscriptionAmount, overageAmount, addonsAmount, discountAmount,
      total: round2(gross - discountAmount),
      addons: addonCodes,
    };
  });
}

// ─── USAGE & METERING ────────────────────────────────────────────────────────

router.get("/usage", ...superAdmin, async (req, res) => {
  const period = String(req.query.period ?? thisPeriod());
  const { start, end } = periodRange(period);
  const isCurrent = period === thisPeriod();
  const daysInMonth = new Date(end.getTime() - 1).getUTCDate();
  const daysElapsed = isCurrent ? new Date().getUTCDate() : daysInMonth;
  const pace = daysElapsed > 0 ? daysInMonth / daysElapsed : 1;

  const [usage, trend] = await Promise.all([
    usageFor(period),
    db.execute(sql`
      select to_char(date_trunc('day', created_at), 'DD Mon') as day,
             count(*)::int as reports
      from credit_reports where created_at >= ${start} and created_at < ${end} and status != 'failed'
      group by date_trunc('day', created_at) order by date_trunc('day', created_at)`).then(r => r.rows),
  ]);

  // project each tenant to month end and classify quota risk
  const enriched = usage.map(u => {
    const projectedReports = Math.round(u.reports * pace);
    const projectedOverage = Math.max(0, projectedReports - u.includedReports) * u.overageRate;
    const projectedTotal = round2(u.subscriptionAmount + projectedOverage + u.addonsAmount - u.discountAmount);
    const projectedQuotaPct = u.includedReports > 0 ? Math.round((projectedReports / u.includedReports) * 100) : 0;
    const risk = !u.planId ? "unassigned"
      : u.quotaUsedPct > 100 ? "over"
      : projectedQuotaPct >= 90 ? "at_risk"
      : u.includedReports > 0 && projectedQuotaPct < 20 ? "under_utilised"
      : "healthy";
    return { ...u, projectedReports, projectedQuotaPct, projectedTotal, risk };
  });

  const billable = enriched.filter(u => u.planId);
  const summary = {
    reports: enriched.reduce((a, u) => a + u.reports, 0),
    apiCalls: enriched.reduce((a, u) => a + u.apiCalls, 0),
    inOverage: enriched.filter(u => u.overageUnits > 0).length,
    overageRevenue: round2(enriched.reduce((a, u) => a + u.overageAmount, 0)),
    metered: round2(enriched.reduce((a, u) => a + u.total, 0)),
    projected: round2(enriched.reduce((a, u) => a + u.projectedTotal, 0)),
    unassigned: enriched.filter(u => !u.planId).length,
    billableTenants: billable.length,
    atRisk: enriched.filter(u => u.risk === "at_risk").length,
    underUtilised: enriched.filter(u => u.risk === "under_utilised").length,
    avgQuotaUsed: billable.length ? Math.round(billable.reduce((a, u) => a + u.quotaUsedPct, 0) / billable.length) : 0,
    daysElapsed, daysInMonth, isCurrent,
  };
  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  res.json({ period, periods, usage: enriched, summary, trend });
});

/** Per-tenant consumption detail for a period */
router.get("/usage/:tenantId", ...superAdmin, async (req, res) => {
  const period = String(req.query.period ?? thisPeriod());
  const { start, end } = periodRange(period);
  const usage = (await usageFor(period)).find(u => u.tenantId === req.params.tenantId);
  if (!usage) { res.status(404).json({ error: "Not Found", message: "Tenant not found" }); return; }

  const [daily, byPurpose, byBand, [invoice], [prior]] = await Promise.all([
    db.execute(sql`
      select to_char(date_trunc('day', created_at), 'DD Mon') as day, count(*)::int as reports
      from credit_reports where tenant_id = ${req.params.tenantId}
        and created_at >= ${start} and created_at < ${end} and status != 'failed'
      group by date_trunc('day', created_at) order by date_trunc('day', created_at)`).then(r => r.rows),
    db.execute(sql`
      select purpose, count(*)::int as n from credit_reports
      where tenant_id = ${req.params.tenantId} and created_at >= ${start} and created_at < ${end}
      group by purpose order by n desc limit 8`).then(r => r.rows),
    db.execute(sql`
      select coalesce(band, 'unscored') as band, count(*)::int as n from credit_reports
      where tenant_id = ${req.params.tenantId} and created_at >= ${start} and created_at < ${end}
      group by 1 order by 1`).then(r => r.rows),
    db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.tenantId, req.params.tenantId), eq(invoicesTable.period, period))),
    db.execute(sql`
      select coalesce(sum(total), 0)::float as total, count(*)::int as invoices
      from invoices where tenant_id = ${req.params.tenantId}`).then(r => r.rows as any[]),
  ]);

  res.json({ period, usage, daily, byPurpose, byBand, invoice: invoice ?? null, lifetime: prior });
});

// ─── PRICING PLANS ───────────────────────────────────────────────────────────

router.get("/pricing-plans", ...superAdmin, async (_req, res) => {
  const [plans, addons, counts] = await Promise.all([
    db.select().from(pricingPlansTable).orderBy(pricingPlansTable.tier),
    db.select().from(planAddonsTable).orderBy(planAddonsTable.name),
    db.select({ planId: subscriptionsTable.planId, n: sql<number>`count(*)::int` })
      .from(subscriptionsTable).groupBy(subscriptionsTable.planId),
  ]);
  const countMap = new Map(counts.map(c => [c.planId, c.n]));
  res.json({
    plans: plans.map(p => ({ ...p, subscribers: countMap.get(p.id) ?? 0 })),
    addons,
  });
});

router.post("/pricing-plans", ...superAdmin, async (req, res) => {
  const parsed = insertPricingPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  try {
    const [plan] = await db.insert(pricingPlansTable).values(parsed.data).returning();
    res.status(201).json({ plan });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "Conflict", message: "A plan with this code already exists" }); return; }
    throw e;
  }
});

router.put("/pricing-plans/:id", ...superAdmin, async (req, res) => {
  const parsed = insertPricingPlanSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  const [plan] = await db.update(pricingPlansTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(pricingPlansTable.id, req.params.id)).returning();
  if (!plan) { res.status(404).json({ error: "Not Found", message: "Plan not found" }); return; }
  res.json({ plan });
});

/** Move a tenant onto a plan */
router.put("/subscriptions/:tenantId", ...superAdmin, async (req, res) => {
  const { planId, status = "active", addons = [], discountPct = 0 } = req.body ?? {};
  const [plan] = await db.select().from(pricingPlansTable).where(eq(pricingPlansTable.id, String(planId ?? "")));
  if (!plan) { res.status(400).json({ error: "Bad Request", message: "A valid planId is required" }); return; }
  const renewsAt = new Date(); renewsAt.setMonth(renewsAt.getMonth() + 1);
  const [subscription] = await db.insert(subscriptionsTable)
    .values({ tenantId: req.params.tenantId, planId: plan.id, status, addons, discountPct: String(discountPct), renewsAt })
    .onConflictDoUpdate({
      target: subscriptionsTable.tenantId,
      set: { planId: plan.id, status, addons, discountPct: String(discountPct), updatedAt: new Date() },
    }).returning();
  res.json({ subscription });
});

// ─── INVOICES ────────────────────────────────────────────────────────────────

router.get("/invoices", ...superAdmin, async (req, res) => {
  const status = String(req.query.status ?? "");
  const where = ["draft", "issued", "paid", "overdue", "void"].includes(status)
    ? eq(invoicesTable.status, status as "issued") : undefined;
  const [rows, [summary]] = await Promise.all([
    db.select({
      id: invoicesTable.id, reference: invoicesTable.reference, tenantName: tenantsTable.name,
      period: invoicesTable.period, subscriptionAmount: invoicesTable.subscriptionAmount,
      overageAmount: invoicesTable.overageAmount, addonsAmount: invoicesTable.addonsAmount,
      discountAmount: invoicesTable.discountAmount, total: invoicesTable.total,
      status: invoicesTable.status, issuedAt: invoicesTable.issuedAt,
      dueAt: invoicesTable.dueAt, paidAt: invoicesTable.paidAt, lineItems: invoicesTable.lineItems,
    })
      .from(invoicesTable).innerJoin(tenantsTable, eq(invoicesTable.tenantId, tenantsTable.id))
      .where(where).orderBy(desc(invoicesTable.period), desc(invoicesTable.total)).limit(200),
    db.select({
      issued: sql<number>`coalesce(sum(total) filter (where status in ('issued','overdue')), 0)::float`,
      paid: sql<number>`coalesce(sum(total) filter (where status = 'paid'), 0)::float`,
      overdue: sql<number>`coalesce(sum(total) filter (where status = 'overdue'), 0)::float`,
      count: sql<number>`count(*)::int`,
      unpaidCount: sql<number>`count(*) filter (where status in ('issued','overdue'))::int`,
    }).from(invoicesTable),
  ]);
  res.json({ invoices: rows, summary });
});

/** Generate invoices for a period from metered usage */
router.post("/invoices/generate", ...superAdmin, async (req, res) => {
  const period = String(req.body?.period ?? thisPeriod());
  const usage = (await usageFor(period)).filter(u => u.planId);
  if (usage.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "No tenants are on a pricing plan yet" });
    return;
  }
  const existing = await db.select({ tenantId: invoicesTable.tenantId })
    .from(invoicesTable).where(eq(invoicesTable.period, period));
  const already = new Set(existing.map(e => e.tenantId));
  const toCreate = usage.filter(u => !already.has(u.tenantId));

  // references are INV-YYYYMM-NNN, so the sequence is the third dash-delimited part
  const [{ maxNo }] = await db.select({
    maxNo: sql<number>`coalesce(max(nullif(split_part(reference, '-', 3), '')::int), 0)`,
  }).from(invoicesTable);
  let seq = Number(maxNo);
  const dueAt = new Date(); dueAt.setDate(dueAt.getDate() + 14);

  const created = toCreate.length ? await db.insert(invoicesTable).values(toCreate.map(u => {
    const lineItems = [
      { label: `${u.planName} subscription`, qty: 1, rate: u.subscriptionAmount, amount: u.subscriptionAmount },
      ...(u.overageUnits > 0 ? [{ label: `Report overage (${u.overageUnits} above ${u.includedReports.toLocaleString()})`, qty: u.overageUnits, rate: u.overageRate, amount: u.overageAmount }] : []),
      ...(u.addonsAmount > 0 ? [{ label: "Add-ons", qty: u.addons.length, rate: 0, amount: u.addonsAmount }] : []),
      ...(u.discountAmount > 0 ? [{ label: "Contract discount", qty: 1, rate: 0, amount: -u.discountAmount }] : []),
    ];
    return {
      reference: `INV-${period.replace("-", "")}-${String(++seq).padStart(3, "0")}`,
      tenantId: u.tenantId, period,
      subscriptionAmount: String(u.subscriptionAmount), overageAmount: String(u.overageAmount),
      addonsAmount: String(u.addonsAmount), discountAmount: String(u.discountAmount),
      total: String(u.total), status: "issued" as const, lineItems, dueAt,
    };
  })).returning() : [];

  res.status(201).json({ created: created.length, skipped: usage.length - toCreate.length, period });
});

router.put("/invoices/:id/status", ...superAdmin, async (req, res) => {
  const status = String(req.body?.status ?? "");
  if (!["draft", "issued", "paid", "overdue", "void"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" }); return;
  }
  const [invoice] = await db.update(invoicesTable)
    .set({ status: status as "paid", paidAt: status === "paid" ? new Date() : null })
    .where(eq(invoicesTable.id, req.params.id)).returning();
  if (!invoice) { res.status(404).json({ error: "Not Found", message: "Invoice not found" }); return; }
  res.json({ invoice });
});

// ─── REVENUE ANALYTICS ───────────────────────────────────────────────────────

router.get("/revenue", ...superAdmin, async (_req, res) => {
  const [subs, trendRows, planMix, topRows, [collections]] = await Promise.all([
    db.execute(sql`
      select p.name as plan_name, p.monthly_price::float as price, s.discount_pct::float as discount
      from subscriptions s join pricing_plans p on p.id = s.plan_id
      where s.status in ('active','trialing')`).then(r => r.rows as any[]),
    db.execute(sql`
      select period,
             coalesce(sum(subscription_amount), 0)::float as subscription,
             coalesce(sum(overage_amount + addons_amount), 0)::float as usage,
             coalesce(sum(total), 0)::float as total
      from invoices group by period order by period`).then(r => r.rows as any[]),
    db.execute(sql`
      select p.name as plan_name, count(s.id)::int as tenants,
             coalesce(sum(p.monthly_price * (1 - s.discount_pct / 100)), 0)::float as mrr
      from pricing_plans p left join subscriptions s on s.plan_id = p.id and s.status in ('active','trialing')
      group by p.id, p.name order by mrr desc`).then(r => r.rows as any[]),
    db.execute(sql`
      select t.name as tenant_name, p.name as plan_name,
             coalesce(sum(i.total), 0)::float as revenue,
             coalesce(sum(i.overage_amount), 0)::float as overage
      from invoices i join tenants t on t.id = i.tenant_id
      left join subscriptions s on s.tenant_id = t.id
      left join pricing_plans p on p.id = s.plan_id
      group by t.name, p.name order by revenue desc limit 8`).then(r => r.rows as any[]),
    db.select({
      billed: sql<number>`coalesce(sum(total), 0)::float`,
      collected: sql<number>`coalesce(sum(total) filter (where status = 'paid'), 0)::float`,
      outstanding: sql<number>`coalesce(sum(total) filter (where status in ('issued','overdue')), 0)::float`,
    }).from(invoicesTable),
  ]);

  const mrr = round2(subs.reduce((a, s) => a + s.price * (1 - (s.discount ?? 0) / 100), 0));
  const totalMix = planMix.reduce((a, p) => a + p.mrr, 0);
  const lastTwo = trendRows.slice(-2);
  const growth = lastTwo.length === 2 && lastTwo[0].total > 0
    ? round2(((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100) : 0;
  const usageShare = trendRows.length
    ? round2((trendRows.reduce((a, t) => a + t.usage, 0) / Math.max(1, trendRows.reduce((a, t) => a + t.total, 0))) * 100)
    : 0;

  res.json({
    summary: {
      mrr, arr: round2(mrr * 12), subscribers: subs.length, growth, usageShare,
      billed: round2(collections.billed), collected: round2(collections.collected),
      outstanding: round2(collections.outstanding),
      collectionRate: collections.billed > 0 ? round2((collections.collected / collections.billed) * 100) : 0,
      arpa: subs.length ? round2(mrr / subs.length) : 0,
    },
    trend: trendRows,
    planMix: planMix.map(p => ({ ...p, share: totalMix > 0 ? Math.round((p.mrr / totalMix) * 100) : 0 })),
    topTenants: topRows,
  });
});

export default router;
