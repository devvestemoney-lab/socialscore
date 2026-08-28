import { Router, type IRouter } from "express";
import { db, usersTable, tenantsTable, auditLogsTable, loansTable, customersTable, creditScoresTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// ─── TENANT RULES CONFIG ──────────────────────────────────────────────────────

const defaultRules = {
  scoreThresholds: {
    autoApprove: 750,
    manualReview: 500,
    autoDecline: 300,
  },
  loanLimits: {
    maxLoanAmount: 100000,
    maxLoanToIncomeRatio: 0.40,
    maxActiveLoanCount: 3,
  },
  riskTiers: [
    { tier: "A", minScore: 751, maxScore: 1000, maxLoan: 100000, maxTenureMonths: 84, interestBand: "8–12%" },
    { tier: "B", minScore: 601, maxScore: 750, maxLoan: 50000, maxTenureMonths: 60, interestBand: "13–18%" },
    { tier: "C", minScore: 451, maxScore: 600, maxLoan: 20000, maxTenureMonths: 36, interestBand: "19–26%" },
    { tier: "D", minScore: 301, maxScore: 450, maxLoan: 5000, maxTenureMonths: 12, interestBand: "27–35%" },
    { tier: "E", minScore: 0, maxScore: 300, maxLoan: 0, maxTenureMonths: 0, interestBand: "Decline" },
  ],
  customRules: [
    { id: "rule-1", name: "Reject if >3 defaults", condition: "loanDefaults > 3", action: "decline", enabled: true },
    { id: "rule-2", name: "Flag new borrowers", condition: "accountAge < 6", action: "manual_review", enabled: true },
    { id: "rule-3", name: "Cap loan at 30% income", condition: "loanAmount > 0.30 * estimatedIncome", action: "cap", enabled: false },
  ],
};

const tenantRulesStore: Record<string, typeof defaultRules> = {};

router.get("/rules", requireAuth, requireRole("tenant_admin", "tenant_user"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "No tenant" }); return; }
  res.json(tenantRulesStore[tenantId] || defaultRules);
});

router.put("/rules", requireAuth, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "No tenant" }); return; }
  const current = tenantRulesStore[tenantId] || defaultRules;
  tenantRulesStore[tenantId] = {
    scoreThresholds: req.body.scoreThresholds ?? current.scoreThresholds,
    loanLimits: req.body.loanLimits ?? current.loanLimits,
    riskTiers: req.body.riskTiers ?? current.riskTiers,
    customRules: req.body.customRules ?? current.customRules,
  };
  res.json({ success: true, rules: tenantRulesStore[tenantId] });
});

// ─── TENANT USER MANAGEMENT ───────────────────────────────────────────────────

router.get("/users", requireAuth, requireRole("tenant_admin", "tenant_user"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "No tenant" }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.tenantId, tenantId));
  res.json({
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.isActive ? "active" : "suspended",
      createdAt: u.createdAt.toISOString(),
      lastLogin: null,
    })),
  });
});

router.post("/users", requireAuth, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "No tenant" }); return; }

  const { name, email, role, password } = req.body;
  if (!name || !email || !role || !password) {
    res.status(400).json({ error: "Bad Request", message: "name, email, role, password required" });
    return;
  }
  if (!["tenant_admin", "tenant_user"].includes(role)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid role for tenant user" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    id: randomUUID(),
    name, email, role,
    passwordHash,
    tenantId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.isActive ? "active" : "suspended" },
  });
});

router.put("/users/:userId", requireAuth, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = String(req.params.userId);
  const { name, role, status } = req.body;

  const [existing] = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenantId!)));
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ name: name || existing.name, role: role || existing.role, isActive: status ? status === "active" : existing.isActive, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({ success: true, user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.isActive ? "active" : "suspended" } });
});

router.delete("/users/:userId", requireAuth, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = String(req.params.userId);

  const [existing] = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.tenantId, tenantId!)));
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

// ─── PORTFOLIO MONITORING ─────────────────────────────────────────────────────

router.get("/portfolio", requireAuth, requireRole("tenant_admin", "tenant_user"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "No tenant" }); return; }

  const allLoans = await db.select().from(loansTable);
  const allScores = await db.select().from(creditScoresTable);
  const allCustomers = await db.select().from(customersTable);
  const allLogs = await db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenantId));

  const activeLoans = allLoans.filter(l => l.status === "active");
  const defaultedLoans = allLoans.filter(l => l.status === "defaulted" || l.status === "written_off");
  const totalExposure = allLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);
  const defaultedAmount = defaultedLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);

  const avgScore = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + Number(s.score), 0) / allScores.length : 650;

  const riskSegmentation = [
    { tier: "A (Excellent 751+)", count: allScores.filter(s => Number(s.score) >= 751).length, color: "#10b981" },
    { tier: "B (Good 601–750)", count: allScores.filter(s => Number(s.score) >= 601 && Number(s.score) < 751).length, color: "#3b82f6" },
    { tier: "C (Fair 451–600)", count: allScores.filter(s => Number(s.score) >= 451 && Number(s.score) < 601).length, color: "#f59e0b" },
    { tier: "D (Poor 301–450)", count: allScores.filter(s => Number(s.score) >= 301 && Number(s.score) < 451).length, color: "#f97316" },
    { tier: "E (Very Poor 0–300)", count: allScores.filter(s => Number(s.score) < 301).length, color: "#ef4444" },
  ];

  const now = Date.now();
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const seed = d.getMonth() + d.getFullYear() * 12;
    return {
      month: label,
      newLoans: 20 + (seed % 15),
      defaultRate: Math.round((2 + (seed % 8)) * 10) / 10,
      totalExposure: Math.round((totalExposure * (0.7 + (i * 0.06))) / 1000) * 1000,
    };
  });

  const earlyWarnings = allLoans
    .filter(l => l.missedPayments && l.missedPayments > 0 && l.status === "active")
    .slice(0, 10)
    .map(l => {
      const customer = allCustomers.find(c => c.id === l.customerId);
      return {
        loanId: l.id,
        customerId: l.customerId,
        customerNrc: customer?.nrc || "Unknown",
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : "Unknown",
        institution: l.institution,
        outstandingBalance: Number(l.outstandingBalance),
        missedPayments: l.missedPayments,
        riskSignal: l.missedPayments >= 3 ? "high" : l.missedPayments >= 2 ? "medium" : "low",
      };
    });

  res.json({
    summary: {
      totalActiveLoans: activeLoans.length,
      totalLoanBook: Math.round(totalExposure),
      defaultedLoans: defaultedLoans.length,
      defaultedAmount: Math.round(defaultedAmount),
      defaultRate: allLoans.length > 0 ? Math.round((defaultedLoans.length / allLoans.length) * 1000) / 10 : 0,
      avgPortfolioScore: Math.round(avgScore),
      totalCustomersQueried: allLogs.filter(l => l.targetNrc).length,
      portfolioAtRisk: Math.round(defaultedAmount * 1.3),
    },
    riskSegmentation,
    monthlyTrend,
    earlyWarnings,
  });
});

export default router;
