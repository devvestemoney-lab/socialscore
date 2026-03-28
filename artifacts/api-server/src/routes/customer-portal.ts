import { Router, type IRouter } from "express";
import { db, usersTable, customersTable, loansTable, creditScoresTable, auditLogsTable, consentsTable, tenantsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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
  const completedLoans = loans.filter(l => l.status === "completed");
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + Number(l.principalAmount), 0);
  const missedPaymentsTotal = loans.reduce((sum, l) => sum + (l.missedPayments || 0), 0);
  const onTimeRate = loans.length > 0
    ? Math.round(((loans.length - missedPaymentsTotal) / loans.length) * 100) : 100;

  const institutionBreakdown = Array.from(new Set(loans.map(l => l.institution))).map(inst => {
    const instLoans = loans.filter(l => l.institution === inst);
    return {
      institution: inst,
      type: instLoans[0]?.loanType || "loan",
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
      type: l.loanType,
      principalAmount: Number(l.principalAmount),
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

const disputesStore: Array<{
  id: string;
  customerId: string;
  type: string;
  description: string;
  affectedInstitution: string;
  loanId: string | null;
  status: "open" | "under_review" | "resolved" | "dismissed";
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}> = [];

router.get("/disputes", requireAuth, async (req: AuthRequest, res) => {
  const customer = await getCustomer(req.user!.userId);
  if (!customer) { res.status(404).json({ error: "Not Found" }); return; }

  const myDisputes = disputesStore.filter(d => d.customerId === customer.id);
  res.json({ disputes: myDisputes, total: myDisputes.length });
});

router.post("/disputes", requireAuth, async (req: AuthRequest, res) => {
  const customer = await getCustomer(req.user!.userId);
  if (!customer) { res.status(404).json({ error: "Not Found" }); return; }

  const { type, description, affectedInstitution, loanId } = req.body;
  if (!type || !description || !affectedInstitution) {
    res.status(400).json({ error: "Bad Request", message: "type, description, affectedInstitution required" });
    return;
  }

  const dispute = {
    id: randomUUID(),
    customerId: customer.id,
    type,
    description,
    affectedInstitution,
    loanId: loanId || null,
    status: "open" as const,
    resolution: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  disputesStore.push(dispute);
  res.status(201).json({ success: true, dispute });
});

export default router;
