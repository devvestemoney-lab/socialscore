import { Router, type IRouter } from "express";
import { db, tenantsTable, customersTable, auditLogsTable, creditScoresTable, loansTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/system", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const tenants = await db.select().from(tenantsTable);
  const customers = await db.select().from(customersTable);
  const allScores = await db.select().from(creditScoresTable);
  const allLogs = await db.select().from(auditLogsTable);

  const activeTenants = tenants.filter(t => t.status === "active").length;
  const avgScore = allScores.length > 0 
    ? allScores.reduce((sum, s) => sum + Number(s.score), 0) / allScores.length 
    : 650;

  // Score distribution
  const buckets = [
    { range: "0-300", min: 0, max: 300 },
    { range: "301-450", min: 301, max: 450 },
    { range: "451-600", min: 451, max: 600 },
    { range: "601-750", min: 601, max: 750 },
    { range: "751-1000", min: 751, max: 1000 },
  ];
  const scoreDistribution = buckets.map(b => {
    const count = allScores.filter(s => Number(s.score) >= b.min && Number(s.score) <= b.max).length;
    return { range: b.range, count, percentage: allScores.length > 0 ? Math.round((count / allScores.length) * 100) : 0 };
  });

  // Risk distribution (mock)
  const riskDistribution = {
    low: Math.round(customers.length * 0.3),
    medium: Math.round(customers.length * 0.35),
    high: Math.round(customers.length * 0.2),
    veryHigh: Math.round(customers.length * 0.1),
    critical: Math.round(customers.length * 0.05),
  };

  // Query trend (last 7 days)
  const now = Date.now();
  const queryTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const count = allLogs.filter(l => l.createdAt.getTime() >= dayStart && l.createdAt.getTime() < dayEnd).length;
    return { date: new Date(dayStart).toISOString().split("T")[0], value: count };
  });

  const topTenants = tenants
    .sort((a, b) => b.totalQueries - a.totalQueries)
    .slice(0, 5)
    .map(t => ({ tenantId: t.id, tenantName: t.name, queries: t.totalQueries, type: t.type }));

  const thisMonthQueries = allLogs.filter(l => {
    const now = new Date();
    return l.createdAt.getMonth() === now.getMonth() && l.createdAt.getFullYear() === now.getFullYear();
  }).length;

  res.json({
    totalTenants: tenants.length,
    activeTenants,
    totalCustomers: customers.length,
    totalQueries: allLogs.length,
    queriesThisMonth: thisMonthQueries,
    avgCreditScore: Math.round(avgScore),
    riskDistribution,
    queryTrend,
    topTenants,
    scoreDistribution,
  });
});

router.get("/tenant", requireAuth, requireRole("tenant_admin", "tenant_user"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "Bad Request", message: "No tenant associated" });
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const allLogs = await db.select().from(auditLogsTable).where(eq(auditLogsTable.tenantId, tenantId));
  const allScores = await db.select().from(creditScoresTable);

  const avgScore = allScores.length > 0 
    ? allScores.reduce((sum, s) => sum + Number(s.score), 0) / allScores.length 
    : 650;

  const riskDistribution = { low: 0, medium: 0, high: 0, veryHigh: 0, critical: 0 };
  allScores.forEach(s => {
    const score = Number(s.score);
    if (score >= 751) riskDistribution.low++;
    else if (score >= 601) riskDistribution.medium++;
    else if (score >= 451) riskDistribution.high++;
    else if (score >= 301) riskDistribution.veryHigh++;
    else riskDistribution.critical++;
  });

  const now = Date.now();
  const queryTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const count = allLogs.filter(l => l.createdAt.getTime() >= dayStart && l.createdAt.getTime() < dayEnd).length;
    return { date: new Date(dayStart).toISOString().split("T")[0], value: count };
  });

  const thisMonthQueries = allLogs.filter(l => {
    const now = new Date();
    return l.createdAt.getMonth() === now.getMonth() && l.createdAt.getFullYear() === now.getFullYear();
  }).length;

  const recentQueries = allLogs
    .filter(l => l.targetNrc)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map(l => ({
      id: l.id,
      nrc: l.targetNrc!,
      customerName: "Customer",
      score: 650 + Math.round(Math.random() * 300),
      rating: "Good",
      queriedAt: l.createdAt.toISOString(),
      decision: ["approved", "declined", "referred"][Math.floor(Math.random() * 3)] as "approved" | "declined" | "referred",
    }));

  res.json({
    tenantId,
    tenantName: tenant?.name || "Unknown",
    queriesThisMonth: thisMonthQueries,
    totalQueries: allLogs.length,
    avgCreditScore: Math.round(avgScore),
    approvalRate: 0.72,
    riskDistribution,
    recentQueries,
    queryTrend,
  });
});

export default router;
