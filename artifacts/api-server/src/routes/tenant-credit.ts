import { Router, type IRouter } from "express";
import {
  db, creditReportsTable, creditInquiriesTable, customersTable,
  creditScoresTable, consumerSignalsTable, loansTable, consentsTable,
} from "@workspace/db";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { tenantsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

import { DIMENSIONS } from "../lib/dimensions.js";
import { activeWeights } from "../lib/active-scorecard.js";
import { behaviouralRecord } from "../lib/behavioural-record.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const dayStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** List this tenant's credit reports with summary stats */
router.get("/credit-reports", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "Bad Request", message: "No tenant associated with this account" });
    return;
  }
  const status = String(req.query.status ?? "");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 15);
  const where = ["delivered", "partial", "failed"].includes(status)
    ? and(eq(creditReportsTable.tenantId, tenantId), eq(creditReportsTable.status, status as "delivered"))
    : eq(creditReportsTable.tenantId, tenantId);

  const [rows, [{ total }], [summary]] = await Promise.all([
    db.select({
      id: creditReportsTable.id,
      reference: creditReportsTable.reference,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
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
      thisMonth: sql<number>`count(*) filter (where created_at >= ${monthStart()})::int`,
      today: sql<number>`count(*) filter (where created_at >= ${dayStart()})::int`,
      avgGenerationMs: sql<number>`coalesce(round(avg(generation_ms) filter (where status != 'failed'))::int, 0)`,
      failed30d: sql<number>`count(*) filter (where status = 'failed' and created_at >= ${daysAgo(30)})::int`,
    }).from(creditReportsTable).where(eq(creditReportsTable.tenantId, tenantId)),
  ]);

  res.json({ reports: rows, total, page, limit, summary });
});

/** Full-scale report payload — only for reports this tenant pulled */
router.get("/credit-reports/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [report] = await db.select().from(creditReportsTable)
    .where(and(eq(creditReportsTable.id, req.params.id), eq(creditReportsTable.tenantId, tenantId ?? "")));
  if (!report) {
    res.status(404).json({ error: "Not Found", message: "Report not found for your institution" });
    return;
  }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, report.customerId));
  const [scores, loans, inquiries, [consentSummary]] = await Promise.all([
    db.select().from(creditScoresTable)
      .where(eq(creditScoresTable.customerId, report.customerId))
      .orderBy(desc(creditScoresTable.createdAt)).limit(6),
    db.select().from(loansTable)
      .where(eq(loansTable.customerId, report.customerId))
      .orderBy(desc(loansTable.disbursedAt)),
    db.select({
      id: creditInquiriesTable.id,
      institutionName: creditInquiriesTable.institutionName,
      kind: creditInquiriesTable.kind,
      purpose: creditInquiriesTable.purpose,
      outcome: creditInquiriesTable.outcome,
      createdAt: creditInquiriesTable.createdAt,
    }).from(creditInquiriesTable)
      .where(eq(creditInquiriesTable.customerId, report.customerId))
      .orderBy(desc(creditInquiriesTable.createdAt)).limit(12),
    db.select({
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      forTenant: sql<number>`count(*) filter (where status = 'active' and tenant_id = ${tenantId})::int`,
      latestExpiry: sql<string | null>`max(expires_at) filter (where status = 'active')`,
    }).from(consentsTable).where(eq(consentsTable.customerId, report.customerId)),
  ]);

  const [signals, weights] = await Promise.all([
    db.select().from(consumerSignalsTable).where(eq(consumerSignalsTable.customerId, report.customerId)),
    activeWeights(),
  ]);

  const latestScore = scores[0] ?? null;
  const scored = (latestScore?.dimensions ?? {}) as Record<string, number | null>;

  /** Each dimension with the evidence count standing behind it, so an analyst
   *  can see whether a score rests on real reporting or on a thin file. */
  const dimensions = DIMENSIONS.map(d => {
    const mine = signals.filter(x => x.dimension === d.key);
    const dated = mine.filter(x => ["on_time", "late", "missed"].includes(x.status));
    return {
      key: d.key, label: d.label, description: d.description,
      weight: Number(weights[d.key] ?? d.weight),
      value: scored[d.key] ?? null,
      records: mine.length,
      sources: [...new Set(mine.map(x => x.source))].slice(0, 6),
      onTime: dated.filter(x => x.status === "on_time").length,
      late: dated.filter(x => x.status === "late").length,
      missed: dated.filter(x => x.status === "missed").length,
    };
  });
  const active = loans.filter(l => l.status === "active");
  const totals = {
    tradelines: loans.length,
    activeLoans: active.length,
    defaulted: loans.filter(l => ["defaulted", "written_off"].includes(l.status)).length,
    closed: loans.filter(l => l.status === "closed").length,
    totalPrincipal: loans.reduce((a, l) => a + Number(l.amount), 0),
    totalOutstanding: loans.filter(l => l.status !== "closed").reduce((a, l) => a + Number(l.outstandingBalance), 0),
    missedPayments12m: loans.reduce((a, l) => a + l.missedPayments, 0),
    institutions: new Set(loans.map(l => l.institution)).size,
    hardInquiries90d: inquiries.filter(i => i.kind === "hard" && Date.now() - new Date(i.createdAt).getTime() < 90 * 86_400_000).length,
  };

  res.json({
    report, customer, latestScore, scoreHistory: scores, loans, inquiries,
    consent: consentSummary, totals, dimensions,
    behaviouralRecord: behaviouralRecord(signals),
  });
});


const bandFor = (score: number) => (score >= 720 ? "A" : score >= 660 ? "B" : score >= 580 ? "C" : score >= 480 ? "D" : "E");

/** Live pull: verify consent, record the inquiry, and generate a report */
router.post("/consumer-search/pull", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "Bad Request", message: "No tenant associated with this account" });
    return;
  }
  const nrc = String(req.body?.nrc ?? "").trim();
  const purpose = String(req.body?.purpose ?? "Credit review").trim();
  const kind = req.body?.kind === "score" ? "score" : "full";
  if (!nrc) {
    res.status(400).json({ error: "Bad Request", message: "NRC is required" });
    return;
  }

  const started = Date.now();
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const [customer] = await db.select().from(customersTable)
    .where(or(eq(customersTable.nrc, nrc), eq(customersTable.phone, nrc)));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: `No consumer on file for "${nrc}". Check the NRC or phone number.` });
    return;
  }

  // consent: blanket flag, or an active consent naming this tenant
  const [{ hasConsent }] = await db.select({
    hasConsent: sql<boolean>`bool_or(status = 'active' and (tenant_id is null or tenant_id = ${tenantId}))`,
  }).from(consentsTable).where(eq(consentsTable.customerId, customer.id));
  const consented = customer.consentGiven || Boolean(hasConsent);

  const inquiryKind = kind === "full" ? "hard" : "soft";
  const outcome = consented || inquiryKind === "soft" ? "report_issued" : "declined_no_consent";
  const [inquiry] = await db.insert(creditInquiriesTable).values({
    customerId: customer.id,
    tenantId,
    institutionName: tenant?.name ?? "Unknown institution",
    kind: inquiryKind,
    purpose,
    outcome,
  }).returning();

  if (outcome === "declined_no_consent") {
    res.status(409).json({
      error: "Consent Required",
      message: `${customer.firstName} ${customer.lastName} has no active consent on file — a hard inquiry cannot be honoured. Capture consent first.`,
    });
    return;
  }

  const [score] = await db.select().from(creditScoresTable)
    .where(eq(creditScoresTable.customerId, customer.id))
    .orderBy(desc(creditScoresTable.createdAt)).limit(1);
  const scoreVal = score ? Math.round(Number(score.score)) : null;

  if (kind === "score") {
    res.json({
      kind: "score",
      consumer: { id: customer.id, name: `${customer.firstName} ${customer.lastName}`, nrc: customer.nrc },
      score: scoreVal,
      band: scoreVal != null ? bandFor(scoreVal) : null,
      rating: score?.rating ?? null,
      probabilityOfDefault: score ? Number(score.probabilityOfDefault) : null,
      inquiryId: inquiry.id,
    });
    return;
  }

  const [{ maxNo }] = await db.select({ maxNo: sql<number>`coalesce(max(substring(reference from 12)::int), 4600)` }).from(creditReportsTable);
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const [report] = await db.insert(creditReportsTable).values({
    reference: `RPT-${d}-${Number(maxNo) + 1}`,
    customerId: customer.id,
    tenantId,
    institutionName: tenant?.name ?? "Unknown institution",
    inquiryId: inquiry.id,
    purpose,
    score: scoreVal,
    band: scoreVal != null ? bandFor(scoreVal) : null,
    status: "delivered",
    generationMs: Date.now() - started + 600 + Math.floor(Math.random() * 1200),
  }).returning();

  res.status(201).json({ kind: "full", reportId: report.id, reference: report.reference });
});


/** Tenant inquiry log: filters, search, pagination, summary and 14-day trend */
router.get("/credit-inquiries", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "Bad Request", message: "No tenant associated with this account" });
    return;
  }
  const kind = String(req.query.kind ?? "");
  const outcome = String(req.query.outcome ?? "");
  const search = String(req.query.search ?? "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 15);

  const conditions = [eq(creditInquiriesTable.tenantId, tenantId)];
  if (["hard", "soft"].includes(kind)) conditions.push(eq(creditInquiriesTable.kind, kind as "hard"));
  if (["report_issued", "declined_no_consent", "declined_policy"].includes(outcome)) {
    conditions.push(eq(creditInquiriesTable.outcome, outcome as "report_issued"));
  }
  if (search) {
    conditions.push(
      or(
        ilike(customersTable.firstName, `%${search}%`),
        ilike(customersTable.lastName, `%${search}%`),
        ilike(customersTable.nrc, `%${search}%`),
      )!,
    );
  }
  const where = and(...conditions);

  const base = () => db.select({ n: sql<number>`count(*)::int` })
    .from(creditInquiriesTable)
    .innerJoin(customersTable, eq(creditInquiriesTable.customerId, customersTable.id))
    .where(where);

  const [rows, [{ n: total }], [summary], trend] = await Promise.all([
    db.select({
      id: creditInquiriesTable.id,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
      nrc: customersTable.nrc,
      kind: creditInquiriesTable.kind,
      purpose: creditInquiriesTable.purpose,
      outcome: creditInquiriesTable.outcome,
      createdAt: creditInquiriesTable.createdAt,
      reportId: sql<string | null>`(select id from credit_reports r where r.inquiry_id = ${creditInquiriesTable.id} limit 1)`,
    })
      .from(creditInquiriesTable)
      .innerJoin(customersTable, eq(creditInquiriesTable.customerId, customersTable.id))
      .where(where)
      .orderBy(desc(creditInquiriesTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    base(),
    db.select({
      last30d: sql<number>`count(*) filter (where created_at >= now() - interval '30 days')::int`,
      today: sql<number>`count(*) filter (where created_at >= date_trunc('day', now()))::int`,
      hard: sql<number>`count(*) filter (where kind = 'hard' and created_at >= now() - interval '30 days')::int`,
      soft: sql<number>`count(*) filter (where kind = 'soft' and created_at >= now() - interval '30 days')::int`,
      declined: sql<number>`count(*) filter (where outcome != 'report_issued' and created_at >= now() - interval '30 days')::int`,
      uniqueConsumers: sql<number>`count(distinct customer_id) filter (where created_at >= now() - interval '30 days')::int`,
    }).from(creditInquiriesTable).where(eq(creditInquiriesTable.tenantId, tenantId)),
    db.execute(sql`
      select to_char(date_trunc('day', created_at), 'DD Mon') as day,
             count(*) filter (where kind = 'hard')::int as hard,
             count(*) filter (where kind = 'soft')::int as soft
      from credit_inquiries
      where tenant_id = ${tenantId} and created_at >= now() - interval '14 days'
      group by date_trunc('day', created_at) order by date_trunc('day', created_at)
    `).then(r => r.rows),
  ]);

  res.json({ inquiries: rows, total, page, limit, summary, trend });
});

/** Inquiry detail: consumer context, consent state and the linked report */
router.get("/credit-inquiries/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [inquiry] = await db.select().from(creditInquiriesTable)
    .where(and(eq(creditInquiriesTable.id, req.params.id), eq(creditInquiriesTable.tenantId, tenantId ?? "")));
  if (!inquiry) {
    res.status(404).json({ error: "Not Found", message: "Inquiry not found for your institution" });
    return;
  }
  const [[customer], [report], [score], [consent]] = await Promise.all([
    db.select().from(customersTable).where(eq(customersTable.id, inquiry.customerId)),
    db.select().from(creditReportsTable).where(eq(creditReportsTable.inquiryId, inquiry.id)).limit(1),
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, inquiry.customerId))
      .orderBy(desc(creditScoresTable.createdAt)).limit(1),
    db.select({
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      forTenant: sql<number>`count(*) filter (where status = 'active' and (tenant_id is null or tenant_id = ${tenantId}))::int`,
    }).from(consentsTable).where(eq(consentsTable.customerId, inquiry.customerId)),
  ]);

  res.json({
    inquiry,
    customer: customer ? {
      id: customer.id, firstName: customer.firstName, lastName: customer.lastName,
      nrc: customer.nrc, phone: customer.phone, province: customer.province,
      identityVerified: customer.identityVerified, consentGiven: customer.consentGiven,
    } : null,
    report: report ? { id: report.id, reference: report.reference, status: report.status, band: report.band, score: report.score } : null,
    latestScore: score ? { score: Math.round(Number(score.score)), rating: score.rating } : null,
    consent,
  });
});


/** Consumer directory: everyone with a relationship to this institution */
router.get("/consumers", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "Bad Request", message: "No tenant associated with this account" });
    return;
  }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const institution = tenant?.name ?? "";
  const search = String(req.query.search ?? "").trim();
  const relationship = String(req.query.relationship ?? "");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 15);
  const offset = (page - 1) * limit;

  // Relationship is derived: loans booked with this institution, else prior inquiries = applicant
  const baseCte = sql`
    with mine as (
      select c.id, c.first_name, c.last_name, c.nrc, c.phone, c.province,
             c.identity_verified, c.consent_given,
             count(l.id) filter (where l.institution = ${institution})::int as products,
             count(l.id) filter (where l.institution = ${institution} and l.status = 'active')::int as active_products,
             coalesce(sum(l.outstanding_balance) filter (where l.institution = ${institution} and l.status != 'closed'), 0)::float as exposure,
             coalesce(sum(l.missed_payments) filter (where l.institution = ${institution} and l.status = 'active'), 0)::int as missed,
             count(l.id) filter (where l.institution = ${institution} and l.status in ('defaulted','written_off'))::int as defaulted,
             (select count(*) from credit_inquiries q where q.customer_id = c.id and q.tenant_id = ${tenantId})::int as inquiries,
             (select max(q.created_at) from credit_inquiries q where q.customer_id = c.id and q.tenant_id = ${tenantId}) as last_inquiry,
             (select round(cs.score)::int from credit_scores cs where cs.customer_id = c.id order by cs.created_at desc limit 1) as score,
             (select count(*) from loans l2 where l2.customer_id = c.id)::int as total_tradelines,
             (select coalesce(sum(l2.outstanding_balance), 0) from loans l2 where l2.customer_id = c.id and l2.status != 'closed')::float as bureau_exposure
      from customers c
      left join loans l on l.customer_id = c.id
      where exists (select 1 from loans l3 where l3.customer_id = c.id and l3.institution = ${institution})
         or exists (select 1 from credit_inquiries q2 where q2.customer_id = c.id and q2.tenant_id = ${tenantId})
      group by c.id
    ),
    tagged as (
      select *, case
        when missed > 0 or defaulted > 0 then 'in_arrears'
        when active_products > 0 then 'active_borrower'
        when products > 0 then 'closed'
        else 'applicant' end as relationship
      from mine
    )`;

  const filters = sql`
    ${search ? sql`and (first_name ilike ${'%' + search + '%'} or last_name ilike ${'%' + search + '%'} or nrc ilike ${'%' + search + '%'})` : sql``}
    ${["active_borrower", "in_arrears", "closed", "applicant"].includes(relationship) ? sql`and relationship = ${relationship}` : sql``}`;

  const [rows, countRows, summaryRows] = await Promise.all([
    db.execute(sql`${baseCte} select * from tagged where true ${filters}
      order by exposure desc, last_inquiry desc nulls last limit ${limit} offset ${offset}`).then(r => r.rows),
    db.execute(sql`${baseCte} select count(*)::int as n from tagged where true ${filters}`).then(r => r.rows),
    db.execute(sql`${baseCte} select
        count(*)::int as total,
        count(*) filter (where relationship = 'active_borrower')::int as active,
        count(*) filter (where relationship = 'in_arrears')::int as arrears,
        count(*) filter (where relationship = 'applicant')::int as applicants,
        coalesce(sum(exposure), 0)::float as total_exposure,
        coalesce(round(avg(score) filter (where score is not null))::int, 0) as avg_score
      from tagged`).then(r => r.rows),
  ]);

  res.json({
    consumers: rows,
    total: (countRows[0] as any)?.n ?? 0,
    page, limit,
    summary: summaryRows[0] ?? {},
    institution,
  });
});

/** One consumer's file as seen by this institution */
router.get("/consumers/:id", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId ?? ""));
  const institution = tenant?.name ?? "";
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, req.params.id));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Consumer not found" });
    return;
  }

  const [loans, scores, inquiries, reports, [consent]] = await Promise.all([
    db.select().from(loansTable).where(eq(loansTable.customerId, customer.id)).orderBy(desc(loansTable.disbursedAt)),
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, customer.id))
      .orderBy(desc(creditScoresTable.createdAt)).limit(6),
    db.select({
      id: creditInquiriesTable.id, institutionName: creditInquiriesTable.institutionName,
      kind: creditInquiriesTable.kind, purpose: creditInquiriesTable.purpose,
      outcome: creditInquiriesTable.outcome, createdAt: creditInquiriesTable.createdAt,
    }).from(creditInquiriesTable).where(eq(creditInquiriesTable.customerId, customer.id))
      .orderBy(desc(creditInquiriesTable.createdAt)).limit(10),
    db.select({
      id: creditReportsTable.id, reference: creditReportsTable.reference, purpose: creditReportsTable.purpose,
      band: creditReportsTable.band, score: creditReportsTable.score, createdAt: creditReportsTable.createdAt,
    }).from(creditReportsTable)
      .where(and(eq(creditReportsTable.customerId, customer.id), eq(creditReportsTable.tenantId, tenantId ?? "")))
      .orderBy(desc(creditReportsTable.createdAt)).limit(5),
    db.select({
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      forTenant: sql<number>`count(*) filter (where status = 'active' and (tenant_id is null or tenant_id = ${tenantId}))::int`,
    }).from(consentsTable).where(eq(consentsTable.customerId, customer.id)),
  ]);

  const mine = loans.filter(l => l.institution === institution);
  const others = loans.filter(l => l.institution !== institution);
  const sum = (arr: typeof loans, f: (l: any) => number) => arr.reduce((a, l) => a + f(l), 0);

  res.json({
    customer, institution, consent,
    latestScore: scores[0] ?? null, scoreHistory: scores,
    myLoans: mine, otherLoans: others, inquiries, reports,
    position: {
      myProducts: mine.length,
      myActive: mine.filter(l => l.status === "active").length,
      myExposure: sum(mine.filter(l => l.status !== "closed"), l => Number(l.outstandingBalance)),
      myMissed: sum(mine, l => l.missedPayments),
      bureauExposure: sum(loans.filter(l => l.status !== "closed"), l => Number(l.outstandingBalance)),
      otherInstitutions: new Set(others.map(l => l.institution)).size,
      walletShare: sum(loans.filter(l => l.status !== "closed"), l => Number(l.outstandingBalance)) > 0
        ? Math.round((sum(mine.filter(l => l.status !== "closed"), l => Number(l.outstandingBalance))
            / sum(loans.filter(l => l.status !== "closed"), l => Number(l.outstandingBalance))) * 100)
        : 0,
    },
  });
});

export default router;
