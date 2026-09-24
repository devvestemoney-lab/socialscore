import { Router, type IRouter } from "express";
import {
  db, usersTable, customersTable, creditScoresTable, consumerSignalsTable, loansTable,
  creditInquiriesTable, creditReportsTable, consentsTable, disputesTable,
  consumerAlertsTable, reportDownloadsTable, consumerPaymentsTable,
  loginEventsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";
import { DIMENSIONS, blendScore } from "../lib/dimensions.js";
import { activeWeights } from "../lib/active-scorecard.js";

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
  const weights = await activeWeights();
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
      dimensions: DIMENSIONS.map(d => ({
        key: d.key, label: d.label, hint: d.consumerHint,
        weight: Number(weights[d.key] ?? d.weight),
        value: (scores[0].dimensions as Record<string, number | null> | null)?.[d.key] ?? null,
      })),
      coverage: scores[0].coverage,
      /** What is pulling the score down or holding it up, in plain words */
      reasons: scores[0].reasonCodes ?? [],
      /** The same flags a lender sees, so nothing on the file is hidden from its subject */
      riskFlags: scores[0].riskFlags ?? [],
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

  const base = (current.dimensions ?? {}) as Record<string, number | null>;
  const {
    settleArrears = false, payDownPct = 0, newLoan = false,
    closeOldest = false, extraInquiries = 0, monthsOnTime = 0,
    payRentOnTime = 0, payBillsOnTime = 0, finishInstalments = false, stayInJob = 0,
    cutBetting = false, repayPeerLoans = 0,
  } = req.body ?? {};

  const adj: Record<string, number | null> = { ...base };
  const notes: string[] = [];
  const lift = (key: string, by: number) => {
    if (adj[key] == null) return false;
    adj[key] = Math.max(0, Math.min(100, (adj[key] as number) + by));
    return true;
  };

  if (settleArrears) {
    lift("credit", 12);
    notes.push("Clearing arrears lifts your credit dimension and eases the default penalty.");
  }
  if (payDownPct > 0) {
    lift("credit", Math.round((payDownPct / 100) * 10));
    notes.push(`Reducing balances by ${payDownPct}% leaves you less exposed.`);
  }
  if (monthsOnTime > 0) {
    lift("credit", Math.min(15, Math.round(monthsOnTime * 1.3)));
    notes.push(`${monthsOnTime} more months of on-time loan payments builds your track record.`);
  }
  if (payRentOnTime > 0) {
    if (lift("housing", Math.min(20, payRentOnTime * 2))) {
      notes.push(`${payRentOnTime} months of rent paid on time strengthens your housing record.`);
    } else {
      notes.push("Ask your landlord to report your rent — housing is unscored on your file today.");
    }
  }
  if (payBillsOnTime > 0) {
    if (lift("payments", Math.min(18, payBillsOnTime * 2))) {
      notes.push(`${payBillsOnTime} months of bills paid on time improves your payments record.`);
    }
  }
  if (finishInstalments) {
    if (lift("commerce", 14)) notes.push("Finishing your instalment plans shows you follow through.");
    else notes.push("A completed lay-by or instalment plan would open your commerce dimension.");
  }
  if (stayInJob > 0) {
    if (lift("stability", Math.min(16, stayInJob * 1.4))) {
      notes.push(`Another ${stayInJob} months in the same job improves how settled you look.`);
    }
  }
  if (cutBetting) {
    const share = Number(current.cashflow?.bettingShare90d ?? 0);
    if (share >= 0.05 && lift("cashflow", Math.min(45, Math.round((share - 0.05) * 150)))) {
      notes.push("Stopping betting removes the biggest drag on your cash flow — lenders see this within 90 days.");
    } else if (adj.cashflow != null) {
      notes.push("Betting is not affecting your cash flow today.");
    }
  }
  if (repayPeerLoans > 0) {
    if (lift("peer", Math.min(20, repayPeerLoans * 3))) {
      notes.push(`${repayPeerLoans} more peer or chilimba repayments on time strengthens your peer lending record.`);
    } else {
      notes.push("Ask your chilimba or village banking group to report your repayments — peer lending is unscored on your file today.");
    }
  }
  if (newLoan) { lift("credit", -8); notes.push("A new facility shortens your average account age."); }
  if (closeOldest) { lift("credit", -10); notes.push("Closing your oldest account shortens your credit history."); }
  if (extraInquiries > 0) {
    lift("credit", -extraInquiries * 3);
    notes.push(`${extraInquiries} more hard search(es) signals credit-seeking behaviour.`);
  }

  const currentScore = Math.round(Number(current.score));
  const projected = blendScore(adj, await activeWeights()).score;
  res.json({
    current: { score: currentScore, band: bandFor(currentScore), rating: ratingFor(currentScore) },
    projected: { score: projected, band: bandFor(projected), rating: ratingFor(projected) },
    change: projected - currentScore,
    breakdown: DIMENSIONS.map(d => ({
      key: d.key, label: d.label, before: base[d.key] ?? null, after: adj[d.key] ?? null,
    })),
    notes,
  });
});

/** The evidence behind each dimension — what has actually been reported. */
router.get("/signals", ...consumer, async (req: AuthRequest, res) => {
  const ctx = await me(req.user!.userId);
  if (!ctx) { res.status(404).json({ error: "Not Found", message: "No bureau record" }); return; }
  const [signals, [latest]] = await Promise.all([
    db.select().from(consumerSignalsTable)
      .where(eq(consumerSignalsTable.customerId, ctx.customer.id))
      .orderBy(desc(consumerSignalsTable.dueDate)),
    db.select().from(creditScoresTable)
      .where(eq(creditScoresTable.customerId, ctx.customer.id))
      .orderBy(desc(creditScoresTable.createdAt)).limit(1),
  ]);
  const scored = (latest?.dimensions ?? {}) as Record<string, number | null>;

  res.json({
    /** Mobile money figures behind the cash-flow dimension */
    cashflow: latest?.cashflow ?? null,
    riskFlags: latest?.riskFlags ?? [],
    dimensions: DIMENSIONS.map(d => {
      const mine = signals.filter(s => s.dimension === d.key);
      const dated = mine.filter(s => s.status === "on_time" || s.status === "late" || s.status === "missed");
      return {
        key: d.key, label: d.label, hint: d.consumerHint, weight: d.weight,
        value: scored[d.key] ?? null,
        sources: [...new Set(mine.map(s => s.source))],
        counts: {
          total: mine.length,
          onTime: dated.filter(s => s.status === "on_time").length,
          late: dated.filter(s => s.status === "late").length,
          missed: dated.filter(s => s.status === "missed").length,
        },
        records: mine.slice(0, 24).map(s => ({
          id: s.id, kind: s.kind, source: s.source, amount: s.amount,
          dueDate: s.dueDate, status: s.status, months: s.months,
        })),
      };
    }),
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
