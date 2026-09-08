import { Router, type IRouter } from "express";
import {
  db, usersTable, customersTable, creditScoresTable, loansTable,
  creditInquiriesTable, creditReportsTable, consentsTable, disputesTable,
  consumerAlertsTable, reportDownloadsTable, consumerPaymentsTable,
  loginEventsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const consumer = [requireAuth, requireRole("customer")] as const;

/** Resolve the signed-in consumer's bureau record */
async function me(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const [customer] = user.customerId
    ? await db.select().from(customersTable).where(eq(customersTable.id, user.customerId))
    : await db.select().from(customersTable).where(eq(customersTable.email, user.email));
  return customer ? { user, customer } : null;
}

const bandFor = (s: number) => (s >= 720 ? "A" : s >= 660 ? "B" : s >= 580 ? "C" : s >= 480 ? "D" : "E");
const ratingFor = (s: number) => (s >= 720 ? "Excellent" : s >= 660 ? "Good" : s >= 580 ? "Fair" : s >= 480 ? "Poor" : "Very Poor");
const FREE_REPORTS_PER_YEAR = 2;

router.get("/overview", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record linked to your account" }); return; }
  const c = ctx.customer;

  const [scores, loans, inquiries, [alerts], [disputes], [consents], [downloads]] = await Promise.all([
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, c.id))
      .orderBy(desc(creditScoresTable.createdAt)).limit(12),
    db.select().from(loansTable).where(eq(loansTable.customerId, c.id)).orderBy(desc(loansTable.disbursedAt)),
    db.select({
      id: creditInquiriesTable.id, institutionName: creditInquiriesTable.institutionName,
      kind: creditInquiriesTable.kind, purpose: creditInquiriesTable.purpose,
      outcome: creditInquiriesTable.outcome, createdAt: creditInquiriesTable.createdAt,
    }).from(creditInquiriesTable).where(eq(creditInquiriesTable.customerId, c.id))
      .orderBy(desc(creditInquiriesTable.createdAt)).limit(30),
    db.select({ unread: sql<number>`count(*) filter (where read_at is null)::int`, total: sql<number>`count(*)::int` })
      .from(consumerAlertsTable).where(eq(consumerAlertsTable.customerId, c.id)),
    db.select({ open: sql<number>`count(*) filter (where resolved_at is null)::int`, total: sql<number>`count(*)::int` })
      .from(disputesTable).where(eq(disputesTable.customerId, c.id)),
    db.select({ active: sql<number>`count(*) filter (where status = 'active')::int`, total: sql<number>`count(*)::int` })
      .from(consentsTable).where(eq(consentsTable.customerId, c.id)),
    db.select({ thisYear: sql<number>`count(*) filter (where created_at >= date_trunc('year', now()))::int` })
      .from(reportDownloadsTable).where(eq(reportDownloadsTable.customerId, c.id)),
  ]);

  const latest = scores[0] ? Math.round(Number(scores[0].score)) : null;
  const previous = scores[1] ? Math.round(Number(scores[1].score)) : null;
  const open = loans.filter(l => l.status !== "closed");

  res.json({
    customer: {
      id: c.id, firstName: c.firstName, lastName: c.lastName, nrc: c.nrc,
      phone: c.phone, email: c.email, province: c.province, dateOfBirth: c.dateOfBirth,
      identityVerified: c.identityVerified, memberSince: c.createdAt,
    },
    score: latest == null ? null : {
      value: latest, band: bandFor(latest), rating: ratingFor(latest),
      change: previous == null ? null : latest - previous,
      probabilityOfDefault: Number(scores[0].probabilityOfDefault),
      breakdown: scores[0].scoreBreakdown,
      recommendation: scores[0].recommendation,
      updatedAt: scores[0].createdAt,
    },
    history: [...scores].reverse().map(s => ({ date: s.createdAt, score: Math.round(Number(s.score)) })),
    summary: {
      accounts: loans.length,
      activeAccounts: loans.filter(l => l.status === "active").length,
      closedAccounts: loans.filter(l => l.status === "closed").length,
      adverseAccounts: loans.filter(l => ["defaulted", "written_off"].includes(l.status)).length,
      totalBorrowed: loans.reduce((a, l) => a + Number(l.amount), 0),
      totalOwed: open.reduce((a, l) => a + Number(l.outstandingBalance), 0),
      missedPayments: loans.reduce((a, l) => a + l.missedPayments, 0),
      lenders: new Set(loans.map(l => l.institution)).size,
      inquiries90d: inquiries.filter(i => Date.now() - new Date(i.createdAt).getTime() < 90 * 86400000).length,
      hardInquiries90d: inquiries.filter(i => i.kind === "hard" && Date.now() - new Date(i.createdAt).getTime() < 90 * 86400000).length,
      unreadAlerts: alerts.unread, totalAlerts: alerts.total,
      openDisputes: disputes.open, totalDisputes: disputes.total,
      activeConsents: consents.active, totalConsents: consents.total,
      freeReportsRemaining: Math.max(0, FREE_REPORTS_PER_YEAR - downloads.thisYear),
      freeReportsPerYear: FREE_REPORTS_PER_YEAR,
    },
    accounts: loans,
    inquiries,
  });
});

router.get("/accounts", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const loans = await db.select().from(loansTable)
    .where(eq(loansTable.customerId, ctx.customer.id)).orderBy(desc(loansTable.disbursedAt));
  res.json({
    accounts: loans.map(l => ({
      ...l,
      standing: ["defaulted", "written_off"].includes(l.status) ? "adverse"
        : l.missedPayments >= 3 ? "seriously_behind"
        : l.missedPayments > 0 ? "behind" : "good",
      repaidPct: Number(l.amount) > 0
        ? Math.min(100, Math.round(((Number(l.amount) - Number(l.outstandingBalance)) / Number(l.amount)) * 100)) : 0,
    })),
  });
});

router.get("/inquiries", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const [inquiries, reports] = await Promise.all([
    db.select().from(creditInquiriesTable).where(eq(creditInquiriesTable.customerId, ctx.customer.id))
      .orderBy(desc(creditInquiriesTable.createdAt)).limit(60),
    db.select({
      reference: creditReportsTable.reference, institutionName: creditReportsTable.institutionName,
      createdAt: creditReportsTable.createdAt,
    }).from(creditReportsTable).where(eq(creditReportsTable.customerId, ctx.customer.id))
      .orderBy(desc(creditReportsTable.createdAt)).limit(30),
  ]);
  res.json({ inquiries, reports });
});

router.get("/history", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const id = ctx.customer.id;
  const rows = (await db.execute(sql`
    select 'account_opened' as kind, l.disbursed_at as at,
           'Account opened with ' || l.institution as title,
           'Facility of K' || round(l.amount)::text as detail
    from loans l where l.customer_id = ${id}
    union all
    select 'account_closed', l.updated_at,
           'Account closed with ' || l.institution, 'Facility settled in full'
    from loans l where l.customer_id = ${id} and l.status = 'closed'
    union all
    select 'adverse', l.updated_at,
           'Adverse record reported by ' || l.institution,
           'Status: ' || replace(l.status, '_', ' ')
    from loans l where l.customer_id = ${id} and l.status in ('defaulted','written_off')
    union all
    select 'inquiry', q.created_at,
           q.institution_name || ' checked your file', q.purpose
    from credit_inquiries q where q.customer_id = ${id}
    union all
    select 'scored', s.created_at, 'Credit score updated',
           'Score ' || round(s.score)::text || ' · ' || s.rating
    from credit_scores s where s.customer_id = ${id}
    union all
    select 'dispute', d.opened_at, 'Dispute raised against ' || d.institution_name, d.type
    from disputes d where d.customer_id = ${id}
    order by at desc limit 80`)).rows;
  res.json({ events: rows });
});

router.post("/simulate", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const [current] = await db.select().from(creditScoresTable)
    .where(eq(creditScoresTable.customerId, ctx.customer.id)).orderBy(desc(creditScoresTable.createdAt)).limit(1);
  if (!current) { res.status(400).json({ error: "Bad Request", message: "You need a credit score before you can run a simulation" }); return; }

  const base = current.scoreBreakdown as Record<string, number>;
  const {
    settleArrears = false, payDownPct = 0, newLoan = false,
    closeOldest = false, extraInquiries = 0, monthsOnTime = 0,
  } = req.body ?? {};

  const adj: Record<string, number> = { ...base };
  const notes: string[] = [];
  if (settleArrears) { adj.repaymentHistory = Math.min(100, adj.repaymentHistory + 12); adj.loanDefaults = Math.min(100, adj.loanDefaults + 8); notes.push("Clearing arrears lifts your repayment history and eases the default penalty."); }
  if (payDownPct > 0) { adj.transactionPatterns = Math.min(100, adj.transactionPatterns + Math.round((payDownPct / 100) * 15)); notes.push(`Reducing balances by ${payDownPct}% improves how much of your available credit you use.`); }
  if (monthsOnTime > 0) { adj.repaymentHistory = Math.min(100, adj.repaymentHistory + Math.min(18, Math.round(monthsOnTime * 1.5))); notes.push(`${monthsOnTime} more months of on-time payments builds your track record.`); }
  if (newLoan) { adj.accountAge = Math.max(0, adj.accountAge - 10); adj.transactionPatterns = Math.max(0, adj.transactionPatterns - 5); notes.push("A new facility shortens your average account age."); }
  if (closeOldest) { adj.accountAge = Math.max(0, adj.accountAge - 15); notes.push("Closing your oldest account shortens your credit history."); }
  if (extraInquiries > 0) { adj.transactionPatterns = Math.max(0, adj.transactionPatterns - extraInquiries * 3); notes.push(`${extraInquiries} more hard search(es) signals credit-seeking behaviour.`); }

  const WEIGHTS: Record<string, number> = { repaymentHistory: 300, transactionPatterns: 250, loanDefaults: 200, mobileMoney: 150, accountAge: 100 };
  const toScore = (b: Record<string, number>) =>
    Math.round(300 + (Object.entries(WEIGHTS).reduce((a, [k, max]) => a + ((b[k] ?? 0) / 100) * max, 0) / 1000) * 550);

  const currentScore = Math.round(Number(current.score));
  const projected = Math.max(300, Math.min(850, toScore(adj)));
  res.json({
    current: { score: currentScore, band: bandFor(currentScore), rating: ratingFor(currentScore) },
    projected: { score: projected, band: bandFor(projected), rating: ratingFor(projected) },
    change: projected - currentScore,
    breakdown: Object.keys(WEIGHTS).map(k => ({ key: k, before: base[k] ?? 0, after: adj[k] ?? 0 })),
    notes,
  });
});

router.get("/alerts", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const alerts = await db.select().from(consumerAlertsTable)
    .where(eq(consumerAlertsTable.customerId, ctx.customer.id))
    .orderBy(desc(consumerAlertsTable.createdAt)).limit(60);
  res.json({
    alerts,
    summary: {
      unread: alerts.filter(a => !a.readAt).length,
      critical: alerts.filter(a => a.severity === "critical" && !a.readAt).length,
      last30d: alerts.filter(a => Date.now() - new Date(a.createdAt).getTime() < 30 * 86400000).length,
    },
  });
});

router.put("/alerts/read-all", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  await db.update(consumerAlertsTable).set({ readAt: new Date() })
    .where(and(eq(consumerAlertsTable.customerId, ctx?.customer.id ?? ""), sql`read_at is null`));
  res.json({ success: true });
});

router.put("/alerts/:id/read", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  const [alert] = await db.update(consumerAlertsTable).set({ readAt: new Date() })
    .where(and(eq(consumerAlertsTable.id, req.params.id), eq(consumerAlertsTable.customerId, ctx?.customer.id ?? "")))
    .returning();
  if (!alert) { res.status(404).json({ error: "Not Found", message: "Alert not found" }); return; }
  res.json({ alert });
});

router.get("/disputes", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const [disputes, loans] = await Promise.all([
    db.select().from(disputesTable).where(eq(disputesTable.customerId, ctx.customer.id)).orderBy(desc(disputesTable.openedAt)),
    db.select({ institution: loansTable.institution }).from(loansTable).where(eq(loansTable.customerId, ctx.customer.id)),
  ]);
  res.json({
    disputes,
    institutions: [...new Set(loans.map(l => l.institution))],
    summary: {
      open: disputes.filter(d => !d.resolvedAt).length,
      upheld: disputes.filter(d => d.status === "resolved_upheld").length,
      resolved: disputes.filter(d => d.resolvedAt).length,
    },
  });
});

router.post("/disputes", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const { type, description, institution } = req.body ?? {};
  if (!type || !institution || !description || String(description).trim().length < 20) {
    res.status(400).json({ error: "Bad Request", message: "Select the record, the problem, and describe it in at least 20 characters" });
    return;
  }
  const [{ maxNo }] = await db.select({
    maxNo: sql<number>`coalesce(max(nullif(split_part(case_no, '-', 3), '')::int), 900)`,
  }).from(disputesTable);
  const [dispute] = await db.insert(disputesTable).values({
    caseNo: `DSP-2026-${String(Number(maxNo) + 1).padStart(4, "0")}`,
    customerId: ctx.customer.id, institutionName: institution, type,
    description: String(description).trim(),
    dueAt: new Date(Date.now() + 21 * 86400000),
  }).returning();
  await db.insert(consumerAlertsTable).values({
    customerId: ctx.customer.id, kind: "dispute_update", severity: "info",
    title: `Dispute ${dispute.caseNo} raised`,
    detail: `Your dispute against ${institution} has been lodged. The bureau must resolve it within 21 days.`,
  });
  res.status(201).json({ dispute });
});

router.get("/consents", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const rows = (await db.execute(sql`
    select k.id, k.data_type, k.status, k.granted_at, k.expires_at, k.revoked_at,
           coalesce(t.name, 'All institutions') as institution
    from consents k left join tenants t on t.id = k.tenant_id
    where k.customer_id = ${ctx.customer.id} order by k.granted_at desc`)).rows as any[];
  res.json({
    consents: rows,
    summary: {
      active: rows.filter(r => r.status === "active").length,
      revoked: rows.filter(r => r.status === "revoked").length,
      expiringSoon: rows.filter(r => r.status === "active" && r.expires_at &&
        new Date(r.expires_at).getTime() < Date.now() + 30 * 86400000).length,
    },
  });
});

router.put("/consents/:id/revoke", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  const [consent] = await db.update(consentsTable)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(consentsTable.id, req.params.id), eq(consentsTable.customerId, ctx?.customer.id ?? ""), eq(consentsTable.status, "active")))
    .returning();
  if (!consent) { res.status(400).json({ error: "Bad Request", message: "Consent not found or already revoked" }); return; }
  await db.insert(consumerAlertsTable).values({
    customerId: ctx!.customer.id, kind: "consent_change", severity: "info",
    title: "Consent revoked",
    detail: "You withdrew permission for an institution to access your credit file. Lenders you already hold facilities with must still report on them.",
  });
  res.json({ consent });
});

router.get("/downloads", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const [downloads, [used]] = await Promise.all([
    db.select().from(reportDownloadsTable).where(eq(reportDownloadsTable.customerId, ctx.customer.id))
      .orderBy(desc(reportDownloadsTable.createdAt)),
    db.select({ thisYear: sql<number>`count(*) filter (where created_at >= date_trunc('year', now()))::int` })
      .from(reportDownloadsTable).where(eq(reportDownloadsTable.customerId, ctx.customer.id)),
  ]);
  res.json({
    downloads,
    allowance: {
      perYear: FREE_REPORTS_PER_YEAR, used: used.thisYear,
      remaining: Math.max(0, FREE_REPORTS_PER_YEAR - used.thisYear), priceAfter: 45,
    },
  });
});

router.post("/downloads", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const kind = ["full_report", "score_only", "dispute_pack"].includes(req.body?.kind) ? req.body.kind : "full_report";
  const format = req.body?.format === "csv" ? "csv" : "pdf";

  const [used] = await db.select({ thisYear: sql<number>`count(*) filter (where created_at >= date_trunc('year', now()))::int` })
    .from(reportDownloadsTable).where(eq(reportDownloadsTable.customerId, ctx.customer.id));
  const free = used.thisYear < FREE_REPORTS_PER_YEAR;

  const [score] = await db.select().from(creditScoresTable)
    .where(eq(creditScoresTable.customerId, ctx.customer.id)).orderBy(desc(creditScoresTable.createdAt)).limit(1);
  const seq = Date.now().toString().slice(-6);
  const [download] = await db.insert(reportDownloadsTable).values({
    customerId: ctx.customer.id, reference: `MYR-${seq}`, format, kind,
    scoreAtIssue: score ? Math.round(Number(score.score)) : null, paid: true,
  }).returning();

  await db.insert(consumerPaymentsTable).values({
    customerId: ctx.customer.id, reference: `PAY-${seq}`,
    description: free ? "Statutory free credit report" : "Credit report purchase",
    amount: free ? "0" : "45", method: free ? "free_allowance" : "mobile_money",
    status: free ? "waived" : "paid",
  });

  res.status(201).json({ download, charged: free ? 0 : 45, freeUsed: free });
});

router.get("/payments", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const [payments, [totals]] = await Promise.all([
    db.select().from(consumerPaymentsTable).where(eq(consumerPaymentsTable.customerId, ctx.customer.id))
      .orderBy(desc(consumerPaymentsTable.createdAt)),
    db.select({
      paid: sql<number>`coalesce(sum(amount) filter (where status = 'paid'), 0)::float`,
      waived: sql<number>`count(*) filter (where status = 'waived')::int`,
      count: sql<number>`count(*)::int`,
    }).from(consumerPaymentsTable).where(eq(consumerPaymentsTable.customerId, ctx.customer.id)),
  ]);
  res.json({ payments, totals });
});

router.put("/profile", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const { phone, email, province } = req.body ?? {};
  if (phone && !/^\+?\d[\d\s-]{7,}$/.test(String(phone))) {
    res.status(400).json({ error: "Bad Request", message: "Enter a valid phone number" }); return;
  }
  const [customer] = await db.update(customersTable)
    .set({
      ...(phone ? { phone: String(phone) } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(province ? { province: String(province) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(customersTable.id, ctx.customer.id)).returning();
  res.json({ customer });
});

router.get("/security", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const events = await db.select().from(loginEventsTable)
    .where(eq(loginEventsTable.email, ctx.user.email))
    .orderBy(desc(loginEventsTable.createdAt)).limit(20);
  res.json({
    events,
    account: {
      email: ctx.user.email, name: ctx.user.name,
      lastLoginAt: ctx.user.lastLoginAt, memberSince: ctx.user.createdAt,
      identityVerified: ctx.customer.identityVerified,
    },
  });
});

export default router;
