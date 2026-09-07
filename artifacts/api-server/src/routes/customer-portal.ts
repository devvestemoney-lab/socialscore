import { Router, type IRouter } from "express";
import { db, usersTable, customersTable, loansTable, creditScoresTable, auditLogsTable, consentsTable, tenantsTable, disputesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Helper to get customer from logged-in user
async function getCustomer(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, user.email));
  return customer || null;
}

// ─── PERSONAL CREDIT REPORT ───────────────────────────────────────────────────

router.get("/report", requireAuth, async (req: AuthRequest, res) => {
  const customer = await getCustomer(req.user!.userId);
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer profile not found" });
    return;
  }

  const loans = await db.select().from(loansTable).where(eq(loansTable.customerId, customer.id));
  const scores = await db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, customer.id));

  const latestScore = scores.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const activeLoans = loans.filter(l => l.status === "active");
  const defaultedLoans = loans.filter(l => l.status === "defaulted" || l.status === "written_off");
  const completedLoans = loans.filter(l => l.status === "closed");
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + Number(l.amount), 0);
  const missedPaymentsTotal = loans.reduce((sum, l) => sum + (l.missedPayments || 0), 0);
  const onTimeRate = loans.length > 0
    ? Math.round(((loans.length - missedPaymentsTotal) / loans.length) * 100) : 100;

  const institutionBreakdown = Array.from(new Set(loans.map(l => l.institution))).map(inst => {
    const instLoans = loans.filter(l => l.institution === inst);
    return {
      institution: inst,
      type: instLoans[0]?.institutionType || "loan",
      activeLoans: instLoans.filter(l => l.status === "active").length,
      outstanding: Math.round(instLoans.filter(l => l.status === "active").reduce((sum, l) => sum + Number(l.outstandingBalance), 0)),
    };
  });

  const historicalScores = scores
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(-8)
    .map(s => ({ score: Number(s.score), rating: s.rating, date: s.createdAt.toISOString() }));

  res.json({
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      nrc: customer.nrc,
      phone: customer.phone,
      email: customer.email,
    },
    creditScore: {
      score: latestScore ? Number(latestScore.score) : null,
      rating: latestScore?.rating || null,
      lastUpdated: latestScore?.createdAt.toISOString() || null,
      historicalScores,
    },
    loanSummary: {
      totalLoans: loans.length,
      activeLoans: activeLoans.length,
      completedLoans: completedLoans.length,
      defaultedLoans: defaultedLoans.length,
      totalOutstanding: Math.round(totalOutstanding),
      totalPrincipalBorrowed: Math.round(totalPrincipal),
      onTimePaymentRate: onTimeRate,
      missedPayments: missedPaymentsTotal,
    },
    institutionBreakdown,
    loans: loans.map(l => ({
      id: l.id,
      institution: l.institution,
      type: l.institutionType,
      principalAmount: Number(l.amount),
      outstandingBalance: Number(l.outstandingBalance),
      interestRate: Number(l.interestRate),
      status: l.status,
      disbursedAt: l.disbursedAt?.toISOString() || null,
      dueDate: l.dueDate?.toISOString() || null,
      missedPayments: l.missedPayments || 0,
    })),
  });
});

// ─── ACCESS LOGS (Who viewed my data) ─────────────────────────────────────────

router.get("/access-logs", requireAuth, async (req: AuthRequest, res) => {
  const customer = await getCustomer(req.user!.userId);
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer profile not found" });
    return;
  }

  const nrc = customer.nrc;
  const allLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));
  const myLogs = allLogs.filter(l => l.targetNrc === nrc);

  const logsWithTenants = await Promise.all(myLogs.slice(0, 50).map(async l => {
    let tenantName = "Unknown Institution";
    if (l.tenantId) {
      const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, l.tenantId));
      tenantName = tenant?.name || tenantName;
    }
    return {
      id: l.id,
      action: l.action,
      tenantId: l.tenantId,
      tenantName,
      ipAddress: l.ipAddress,
      accessedAt: l.createdAt.toISOString(),
      dataAccessed: actionToDataType(l.action || ""),
    };
  }));

  res.json({
    nrc,
    totalAccesses: myLogs.length,
    accessLogs: logsWithTenants,
  });
});

function actionToDataType(action: string): string {
  if (action.includes("risk")) return "Full Risk Profile";
  if (action.includes("credit")) return "Credit Score";
  if (action.includes("loan")) return "Loan Exposure";
  return "Profile Query";
}

// ─── DISPUTES ──────────────────────────────────────────────────────────────────

router.get("/disputes", requireAuth, async (req: AuthRequest, res) => {
  const customer = await getCustomer(req.user!.userId);
  if (!customer) { res.status(404).json({ error: "Not Found" }); return; }

  const myDisputes = await db.select().from(disputesTable)
    .where(eq(disputesTable.customerId, customer.id))
    .orderBy(desc(disputesTable.openedAt));
  res.json({ disputes: myDisputes, total: myDisputes.length });
});

router.post("/disputes", requireAuth, async (req: AuthRequest, res) => {
  const customer = await getCustomer(req.user!.userId);
  if (!customer) { res.status(404).json({ error: "Not Found" }); return; }

  const { type, description, affectedInstitution } = req.body;
  if (!type || !description || !affectedInstitution) {
    res.status(400).json({ error: "Bad Request", message: "type, description, affectedInstitution required" });
    return;
  }

  const [{ maxNo }] = await db.select({ maxNo: sql<number>`coalesce(max(substring(case_no from 10)::int), 900)` }).from(disputesTable);
  const [dispute] = await db.insert(disputesTable).values({
    caseNo: `DSP-2026-${String(Number(maxNo) + 1).padStart(4, "0")}`,
    customerId: customer.id,
    institutionName: affectedInstitution,
    type,
    description,
    dueAt: new Date(Date.now() + 21 * 86_400_000),
  }).returning();
  res.status(201).json({ success: true, dispute });
});

export default router;
