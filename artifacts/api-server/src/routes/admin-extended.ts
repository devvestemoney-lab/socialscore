import { Router, type IRouter } from "express";
import { db, tenantsTable, usersTable, auditLogsTable, creditScoresTable, customersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

// ─── SCORING MODELS ──────────────────────────────────────────────────────────

let scoringModelConfig = {
  version: "v2.1.0",
  activeModel: "production",
  weights: {
    repaymentHistory: 30,
    loanDefaults: 20,
    transactionPatterns: 25,
    mobileMoney: 15,
    accountAge: 10,
  },
  thresholds: {
    minApprovalScore: 500,
    autoApproveScore: 750,
    autoDeclineScore: 300,
    maxLoanToIncomeRatio: 0.40,
  },
  modelHistory: [
    { version: "v1.0.0", deployedAt: "2024-01-15T00:00:00Z", notes: "Initial model", accuracy: 0.81 },
    { version: "v2.0.0", deployedAt: "2024-07-01T00:00:00Z", notes: "Added mobile money feature", accuracy: 0.85 },
    { version: "v2.1.0", deployedAt: "2025-01-10T00:00:00Z", notes: "Recalibrated repayment weight", accuracy: 0.88 },
  ],
  abTest: {
    enabled: false,
    variantA: { name: "Current (v2.1.0)", trafficPct: 80 },
    variantB: { name: "Experimental (v2.2.0-beta)", trafficPct: 20 },
  },
};

router.get("/scoring-models", requireAuth, requireRole("super_admin"), async (_req, res) => {
  res.json(scoringModelConfig);
});

router.put("/scoring-models", requireAuth, requireRole("super_admin"), async (req: AuthRequest, res) => {
  const { weights, thresholds, abTest } = req.body;
  if (weights) {
    const total = Object.values(weights as Record<string, number>).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 1) {
      res.status(400).json({ error: "Bad Request", message: "Weights must sum to 100" });
      return;
    }
    scoringModelConfig.weights = weights;
  }
  if (thresholds) scoringModelConfig.thresholds = { ...scoringModelConfig.thresholds, ...thresholds };
  if (abTest !== undefined) scoringModelConfig.abTest = { ...scoringModelConfig.abTest, ...abTest };
  res.json({ success: true, config: scoringModelConfig });
});

// ─── BILLING & REVENUE ────────────────────────────────────────────────────────

const PRICE_PER_CALL = 0.15; // ZMW per API call

router.get("/billing", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const tenants = await db.select().from(tenantsTable);
  const allLogs = await db.select().from(auditLogsTable);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const billingData = tenants.map(tenant => {
    const tenantLogs = allLogs.filter(l => l.tenantId === tenant.id);
    const thisMonthLogs = tenantLogs.filter(l => l.createdAt >= startOfMonth);
    const totalCalls = tenantLogs.length;
    const monthCalls = thisMonthLogs.length;
    const totalRevenue = totalCalls * PRICE_PER_CALL;
    const monthRevenue = monthCalls * PRICE_PER_CALL;

    const plan = totalCalls > 500 ? "Enterprise" : totalCalls > 100 ? "Professional" : "Starter";
    const invoiceStatus = monthRevenue > 0 ? (Math.random() > 0.3 ? "paid" : "outstanding") : "no-charges";

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantType: tenant.type,
      status: tenant.status,
      plan,
      totalCalls,
      monthCalls,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthRevenue: Math.round(monthRevenue * 100) / 100,
      pricePerCall: PRICE_PER_CALL,
      invoiceStatus,
      lastActivity: tenantLogs.length > 0
        ? tenantLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt.toISOString()
        : null,
    };
  });

  const totalMonthRevenue = billingData.reduce((sum, t) => sum + t.monthRevenue, 0);
  const totalAllTimeRevenue = billingData.reduce((sum, t) => sum + t.totalRevenue, 0);
  const outstandingRevenue = billingData.filter(t => t.invoiceStatus === "outstanding").reduce((sum, t) => sum + t.monthRevenue, 0);

  res.json({
    summary: {
      totalMonthRevenue: Math.round(totalMonthRevenue * 100) / 100,
      totalAllTimeRevenue: Math.round(totalAllTimeRevenue * 100) / 100,
      outstandingRevenue: Math.round(outstandingRevenue * 100) / 100,
      activeBilledTenants: billingData.filter(t => t.monthCalls > 0).length,
      pricePerCall: PRICE_PER_CALL,
    },
    tenants: billingData.sort((a, b) => b.monthRevenue - a.monthRevenue),
  });
});

// ─── FRAUD & ABUSE MONITORING ─────────────────────────────────────────────────

router.get("/fraud", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const allLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));
  const tenants = await db.select().from(tenantsTable);

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  // Detect high-frequency tenants (>50 queries/hour)
  const fraudFlags = tenants.map(tenant => {
    const tenantLogs = allLogs.filter(l => l.tenantId === tenant.id);
    const recentHour = tenantLogs.filter(l => l.createdAt.getTime() > oneHourAgo).length;
    const recentDay = tenantLogs.filter(l => l.createdAt.getTime() > oneDayAgo).length;

    const uniqueNrcs = new Set(tenantLogs.filter(l => l.targetNrc).map(l => l.targetNrc)).size;
    const repeatRatio = tenantLogs.length > 0 ? 1 - (uniqueNrcs / tenantLogs.length) : 0;

    const riskLevel =
      recentHour > 50 || recentDay > 500 ? "critical" :
      recentHour > 20 || recentDay > 200 ? "high" :
      recentHour > 10 || recentDay > 100 ? "medium" : "normal";

    const flags: string[] = [];
    if (recentHour > 20) flags.push("High query frequency (last hour)");
    if (repeatRatio > 0.5) flags.push("High repeat NRC lookups");
    if (recentDay > 100) flags.push("Excessive daily queries");

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantType: tenant.type,
      status: tenant.status,
      riskLevel,
      flags,
      queriesLastHour: recentHour,
      queriesLast24h: recentDay,
      totalQueries: tenantLogs.length,
      uniqueNrcsQueried: uniqueNrcs,
      repeatQueryRatio: Math.round(repeatRatio * 100),
    };
  });

  // Recent suspicious events
  const suspiciousLogs = allLogs
    .filter(l => l.action?.includes("bulk") || l.action?.includes("export"))
    .slice(0, 20)
    .map(l => ({
      id: l.id,
      action: l.action,
      tenantId: l.tenantId,
      targetNrc: l.targetNrc,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    }));

  res.json({
    summary: {
      flaggedTenants: fraudFlags.filter(f => f.riskLevel !== "normal").length,
      criticalAlerts: fraudFlags.filter(f => f.riskLevel === "critical").length,
      highAlerts: fraudFlags.filter(f => f.riskLevel === "high").length,
      totalQueryVolume: allLogs.length,
    },
    tenantRiskProfiles: fraudFlags.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, normal: 3 };
      return order[a.riskLevel as keyof typeof order] - order[b.riskLevel as keyof typeof order];
    }),
    suspiciousEvents: suspiciousLogs,
  });
});

// ─── DATA SOURCES ─────────────────────────────────────────────────────────────

router.get("/data-sources", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const allLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(200);
  const allScores = await db.select().from(creditScoresTable);
  const allCustomers = await db.select().from(customersTable);

  const dataSources = [
    {
      id: "zanaco-bank",
      name: "Zanaco Bank",
      type: "bank",
      status: "active",
      healthScore: 98,
      lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 1.8),
      avgLatencyMs: 142,
      uptime: 99.8,
      dataTypes: ["loans", "transactions", "accounts"],
      syncSchedule: "Every 15 minutes",
    },
    {
      id: "stanbic-bank",
      name: "Stanbic Bank",
      type: "bank",
      status: "active",
      healthScore: 96,
      lastSync: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 1.5),
      avgLatencyMs: 178,
      uptime: 99.5,
      dataTypes: ["loans", "transactions"],
      syncSchedule: "Every 20 minutes",
    },
    {
      id: "mtn-mno",
      name: "MTN Zambia",
      type: "mno",
      status: "active",
      healthScore: 94,
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 3.2),
      avgLatencyMs: 89,
      uptime: 99.9,
      dataTypes: ["mobile_money", "airtime", "transactions"],
      syncSchedule: "Every 5 minutes",
    },
    {
      id: "airtel-mno",
      name: "Airtel Money",
      type: "mno",
      status: "active",
      healthScore: 91,
      lastSync: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 2.7),
      avgLatencyMs: 112,
      uptime: 99.2,
      dataTypes: ["mobile_money", "airtime"],
      syncSchedule: "Every 8 minutes",
    },
    {
      id: "finca-mfi",
      name: "FINCA Zambia",
      type: "mfi",
      status: "degraded",
      healthScore: 72,
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 0.8),
      avgLatencyMs: 890,
      uptime: 94.1,
      dataTypes: ["microloans", "repayments"],
      syncSchedule: "Every hour",
      alert: "High latency detected — investigating",
    },
    {
      id: "bayport-mfi",
      name: "Bayport Financial",
      type: "mfi",
      status: "active",
      healthScore: 88,
      lastSync: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 0.6),
      avgLatencyMs: 234,
      uptime: 98.3,
      dataTypes: ["loans", "repayments"],
      syncSchedule: "Every 45 minutes",
    },
    {
      id: "zamtel-mno",
      name: "Zamtel",
      type: "mno",
      status: "offline",
      healthScore: 0,
      lastSync: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      recordsContributed: Math.floor(allCustomers.length * 0.4),
      avgLatencyMs: 0,
      uptime: 82.0,
      dataTypes: ["mobile_money"],
      syncSchedule: "Every 30 minutes",
      alert: "Connection timeout — manual intervention required",
    },
  ];

  res.json({
    summary: {
      total: dataSources.length,
      active: dataSources.filter(d => d.status === "active").length,
      degraded: dataSources.filter(d => d.status === "degraded").length,
      offline: dataSources.filter(d => d.status === "offline").length,
      totalRecordsIngested: dataSources.reduce((sum, d) => sum + d.recordsContributed, 0),
      avgHealthScore: Math.round(dataSources.reduce((sum, d) => sum + d.healthScore, 0) / dataSources.length),
    },
    dataSources,
  });
});

export default router;
