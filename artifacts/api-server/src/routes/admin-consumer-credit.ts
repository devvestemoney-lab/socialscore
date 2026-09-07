import { Router, type IRouter } from "express";
import {
  db, customersTable, creditScoresTable, loansTable,
  creditInquiriesTable, creditReportsTable,
} from "@workspace/db";
import { eq, desc, sql, ilike, or, and, gte, countDistinct } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;

const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

export function bandFor(score: number): string {
  if (score >= 720) return "A";
  if (score >= 660) return "B";
  if (score >= 580) return "C";
  if (score >= 480) return "D";
  return "E";
}

// ─── CONSUMER REGISTRY ───────────────────────────────────────────────────────

router.get("/consumers", ...superAdmin, async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);

  const where = search
    ? or(
        ilike(customersTable.firstName, `%${search}%`),
        ilike(customersTable.lastName, `%${search}%`),
        ilike(customersTable.nrc, `%${search}%`),
        ilike(customersTable.phone, `%${search}%`),
      )
    : undefined;

  const [rows, [{ total }], [summary]] = await Promise.all([
    db.select({
      id: customersTable.id,
      firstName: customersTable.firstName,
      lastName: customersTable.lastName,
      nrc: customersTable.nrc,
      dateOfBirth: customersTable.dateOfBirth,
      province: customersTable.province,
      identityVerified: customersTable.identityVerified,
      consentGiven: customersTable.consentGiven,
      updatedAt: customersTable.updatedAt,
      tradelines: sql<number>`(select count(*)::int from loans where loans.customer_id = ${customersTable.id})`,
      institutions: sql<number>`(select count(distinct loans.institution)::int from loans where loans.customer_id = ${customersTable.id})`,
      latestScore: sql<number | null>`(select round(cs.score)::int from credit_scores cs where cs.customer_id = ${customersTable.id} order by cs.created_at desc limit 1)`,
    })
      .from(customersTable)
      .where(where)
      .orderBy(desc(customersTable.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(customersTable).where(where),
    db.select({
      all: sql<number>`count(*)::int`,
      verified: sql<number>`count(*) filter (where identity_verified)::int`,
      withHistory: sql<number>`count(*) filter (where exists (select 1 from loans l where l.customer_id = customers.id))::int`,
      thinFile: sql<number>`count(*) filter (where (select count(*) from loans l where l.customer_id = customers.id) < 3)::int`,
    }).from(customersTable),
  ]);

  res.json({ consumers: rows, total, page, limit, summary });
});

router.get("/consumers/:id", ...superAdmin, async (req, res) => {
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, req.params.id));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Consumer not found" });
    return;
  }
  const [loans, scores, inquiries] = await Promise.all([
    db.select().from(loansTable).where(eq(loansTable.customerId, customer.id)).orderBy(desc(loansTable.disbursedAt)),
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, customer.id)).orderBy(desc(creditScoresTable.createdAt)).limit(5),
    db.select().from(creditInquiriesTable).where(eq(creditInquiriesTable.customerId, customer.id)).orderBy(desc(creditInquiriesTable.createdAt)).limit(10),
  ]);
  res.json({ customer, loans, scores, inquiries });
});

router.put("/consumers/:id/verify", ...superAdmin, async (req, res) => {
  const [customer] = await db.update(customersTable)
    .set({ identityVerified: Boolean(req.body?.identityVerified), updatedAt: new Date() })
    .where(eq(customersTable.id, req.params.id))
    .returning();
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Consumer not found" });
    return;
  }
  res.json({ customer });
});

// ─── CREDIT REPORTS ──────────────────────────────────────────────────────────

router.get("/credit-reports", ...superAdmin, async (req, res) => {
  const status = String(req.query.status ?? "");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const where = ["delivered", "partial", "failed"].includes(status)
    ? eq(creditReportsTable.status, status as "delivered")
    : undefined;

  const [rows, [{ total }], [summary]] = await Promise.all([
    db.select({
      id: creditReportsTable.id,
      reference: creditReportsTable.reference,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
      institutionName: creditReportsTable.institutionName,
      purpose: creditReportsTable.purpose,
      score: creditReportsTable.score,
      band: creditReportsTable.band,
      status: creditReportsTable.status,
      generationMs: creditReportsTable.generationMs,
      createdAt: creditReportsTable.createdAt,
    })
      .from(creditReportsTable)
      .innerJoin(customersTable, eq(creditReportsTable.customerId, customersTable.id))
      .where(where)
      .orderBy(desc(creditReportsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(creditReportsTable).where(where),
    db.select({
      allTime: sql<number>`count(*)::int`,
      thisMonth: sql<number>`count(*) filter (where created_at >= ${monthStart()})::int`,
      avgGenerationMs: sql<number>`coalesce(round(avg(generation_ms)) , 0)::int`,
      failureRate: sql<number>`coalesce(round(100.0 * count(*) filter (where status = 'failed') / nullif(count(*) filter (where created_at >= ${daysAgo(30)}), 0), 2), 0)::float`,
    }).from(creditReportsTable),
  ]);

  res.json({ reports: rows, total, page, limit, summary });
});

// ─── CREDIT INQUIRIES ────────────────────────────────────────────────────────

router.get("/credit-inquiries", ...superAdmin, async (req, res) => {
  const kind = String(req.query.kind ?? "");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const where = ["hard", "soft"].includes(kind) ? eq(creditInquiriesTable.kind, kind as "hard") : undefined;

  const [rows, [{ total }], [summary]] = await Promise.all([
    db.select({
      id: creditInquiriesTable.id,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
      institutionName: creditInquiriesTable.institutionName,
      kind: creditInquiriesTable.kind,
      purpose: creditInquiriesTable.purpose,
      outcome: creditInquiriesTable.outcome,
      createdAt: creditInquiriesTable.createdAt,
    })
      .from(creditInquiriesTable)
      .innerJoin(customersTable, eq(creditInquiriesTable.customerId, customersTable.id))
      .where(where)
      .orderBy(desc(creditInquiriesTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(creditInquiriesTable).where(where),
    db.select({
      last30d: sql<number>`count(*) filter (where created_at >= ${daysAgo(30)})::int`,
      hard: sql<number>`count(*) filter (where kind = 'hard' and created_at >= ${daysAgo(30)})::int`,
      soft: sql<number>`count(*) filter (where kind = 'soft' and created_at >= ${daysAgo(30)})::int`,
      declined: sql<number>`count(*) filter (where outcome != 'report_issued' and created_at >= ${daysAgo(30)})::int`,
    }).from(creditInquiriesTable),
  ]);

  res.json({ inquiries: rows, total, page, limit, summary });
});

// ─── CREDIT SCORES OVERVIEW ──────────────────────────────────────────────────

router.get("/credit-scores/overview", ...superAdmin, async (_req, res) => {
  // latest score per consumer
  const latest = sql`(
    select distinct on (customer_id) customer_id, round(score)::int as score
    from credit_scores order by customer_id, created_at desc
  )`;

  const [[stats], bands, [population]] = await Promise.all([
    db.execute(sql`
      select coalesce(round(avg(score)), 0)::int as avg,
             coalesce(percentile_cont(0.5) within group (order by score), 0)::int as median,
             count(*)::int as scored
      from ${latest} s
    `),
    db.execute(sql`
      select case when score >= 720 then 'A' when score >= 660 then 'B'
                  when score >= 580 then 'C' when score >= 480 then 'D' else 'E' end as band,
             count(*)::int as count
      from ${latest} s group by 1 order by 1
    `),
    db.execute(sql`
      select count(*)::int as total,
             count(*) filter (where not exists (select 1 from credit_scores cs where cs.customer_id = customers.id))::int as unscorable
      from customers
    `),
  ]).then(([a, b, c]) => [a.rows as any[], b.rows as any[], c.rows as any[]] as const);

  res.json({
    avg: stats?.avg ?? 0,
    median: stats?.median ?? 0,
    scored: stats?.scored ?? 0,
    totalConsumers: population?.total ?? 0,
    unscorable: population?.unscorable ?? 0,
    bands,
    models: [
      { model: "SocialScore Consumer v4.2", calibratedAt: "2026-08-15", gini: 0.61, psi: 0.04, status: "production" },
      { model: "SocialScore Consumer v4.1", calibratedAt: "2026-02-02", gini: 0.58, psi: 0.09, status: "retired" },
      { model: "SocialScore SME v2.0", calibratedAt: "2026-06-20", gini: 0.54, psi: 0.06, status: "production" },
      { model: "Mobile Money Micro v1.3", calibratedAt: "2026-07-11", gini: 0.49, psi: 0.11, status: "monitoring" },
    ],
  });
});

export default router;
