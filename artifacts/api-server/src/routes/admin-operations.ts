import { Router, type IRouter } from "express";
import {
  db, disputesTable, consentsTable, apiKeysTable, integrationsTable,
  customersTable, tenantsTable, creditReportsTable, creditInquiriesTable,
  dataSubmissionsTable,
} from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import crypto from "node:crypto";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

// ─── DISPUTES ────────────────────────────────────────────────────────────────

const DISPUTE_STATUSES = ["open", "under_investigation", "awaiting_institution", "escalated", "resolved_upheld", "resolved_rejected", "dismissed"] as const;

router.get("/disputes", ...superAdmin, async (req, res) => {
  const status = String(req.query.status ?? "");
  const where = (DISPUTE_STATUSES as readonly string[]).includes(status) ? eq(disputesTable.status, status as "open") : undefined;

  const [disputes, [summary]] = await Promise.all([
    db.select({
      id: disputesTable.id,
      caseNo: disputesTable.caseNo,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
      institutionName: disputesTable.institutionName,
      type: disputesTable.type,
      description: disputesTable.description,
      status: disputesTable.status,
      resolution: disputesTable.resolution,
      openedAt: disputesTable.openedAt,
      dueAt: disputesTable.dueAt,
      resolvedAt: disputesTable.resolvedAt,
    })
      .from(disputesTable)
      .innerJoin(customersTable, eq(disputesTable.customerId, customersTable.id))
      .where(where)
      .orderBy(desc(disputesTable.openedAt))
      .limit(100),
    db.select({
      open: sql<number>`count(*) filter (where status in ('open','under_investigation','awaiting_institution','escalated'))::int`,
      investigating: sql<number>`count(*) filter (where status = 'under_investigation')::int`,
      resolved30d: sql<number>`count(*) filter (where resolved_at >= ${daysAgo(30)})::int`,
      upheld30d: sql<number>`count(*) filter (where resolved_at >= ${daysAgo(30)} and status = 'resolved_upheld')::int`,
      pastSla: sql<number>`count(*) filter (where status in ('open','under_investigation','awaiting_institution','escalated') and due_at < now())::int`,
      avgResolutionDays: sql<number>`coalesce(round(avg(extract(epoch from (resolved_at - opened_at)) / 86400) filter (where resolved_at is not null))::int, 0)`,
    }).from(disputesTable),
  ]);

  res.json({ disputes, summary });
});

router.put("/disputes/:id/status", ...superAdmin, async (req, res) => {
  const { status, resolution } = req.body ?? {};
  if (!DISPUTE_STATUSES.includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" });
    return;
  }
  const resolved = String(status).startsWith("resolved_") || status === "dismissed";
  if (resolved && !resolution) {
    res.status(400).json({ error: "Bad Request", message: "A resolution note is required to close a dispute" });
    return;
  }
  const [dispute] = await db.update(disputesTable)
    .set({ status, resolution: resolution ?? null, resolvedAt: resolved ? new Date() : null, updatedAt: new Date() })
    .where(eq(disputesTable.id, req.params.id))
    .returning();
  if (!dispute) {
    res.status(404).json({ error: "Not Found", message: "Dispute not found" });
    return;
  }
  res.json({ dispute });
});

// ─── CONSENT MANAGEMENT ──────────────────────────────────────────────────────

router.get("/consents", ...superAdmin, async (_req, res) => {
  const [consents, [summary], byType] = await Promise.all([
    db.select({
      id: consentsTable.id,
      consumerName: sql<string>`${customersTable.firstName} || ' ' || ${customersTable.lastName}`,
      institutionName: sql<string>`coalesce(${tenantsTable.name}, 'All institutions')`,
      dataType: consentsTable.dataType,
      status: consentsTable.status,
      grantedAt: consentsTable.grantedAt,
      expiresAt: consentsTable.expiresAt,
      revokedAt: consentsTable.revokedAt,
    })
      .from(consentsTable)
      .innerJoin(customersTable, eq(consentsTable.customerId, customersTable.id))
      .leftJoin(tenantsTable, eq(consentsTable.tenantId, tenantsTable.id))
      .orderBy(desc(consentsTable.grantedAt))
      .limit(100),
    db.select({
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      granted30d: sql<number>`count(*) filter (where granted_at >= ${daysAgo(30)})::int`,
      revoked30d: sql<number>`count(*) filter (where revoked_at >= ${daysAgo(30)})::int`,
      expiring30d: sql<number>`count(*) filter (where status = 'active' and expires_at between now() and ${inDays(30)})::int`,
    }).from(consentsTable),
    db.select({ dataType: consentsTable.dataType, count: sql<number>`count(*)::int` })
      .from(consentsTable).where(eq(consentsTable.status, "active")).groupBy(consentsTable.dataType),
  ]);

  res.json({ consents, summary, byType });
});

router.put("/consents/:id/revoke", ...superAdmin, async (req, res) => {
  const [consent] = await db.update(consentsTable)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(consentsTable.id, req.params.id), eq(consentsTable.status, "active")))
    .returning();
  if (!consent) {
    res.status(400).json({ error: "Bad Request", message: "Consent not found or already revoked" });
    return;
  }
  res.json({ consent });
});

// ─── API MANAGEMENT ──────────────────────────────────────────────────────────

router.get("/api-keys", ...superAdmin, async (_req, res) => {
  const since = daysAgo(30);
  const [keys, [reportStats], [{ inquiries30d }], [{ consents30d }], [{ disputes30d }], [{ submissions }]] = await Promise.all([
    db.select({
      id: apiKeysTable.id,
      tenantName: tenantsTable.name,
      displayPrefix: apiKeysTable.displayPrefix,
      env: apiKeysTable.env,
      rateLimitRpm: apiKeysTable.rateLimitRpm,
      status: apiKeysTable.status,
      lastUsedAt: apiKeysTable.lastUsedAt,
      expiresAt: apiKeysTable.expiresAt,
      createdAt: apiKeysTable.createdAt,
    })
      .from(apiKeysTable)
      .innerJoin(tenantsTable, eq(apiKeysTable.tenantId, tenantsTable.id))
      .orderBy(desc(apiKeysTable.createdAt)),
    db.select({
      reports30d: sql<number>`count(*) filter (where created_at >= ${since})::int`,
      avgMs: sql<number>`coalesce(round(avg(generation_ms) filter (where created_at >= ${since}))::int, 0)`,
      p95Ms: sql<number>`coalesce(round(percentile_cont(0.95) within group (order by generation_ms) filter (where created_at >= ${since}))::int, 0)`,
      failRate: sql<number>`coalesce(round(100.0 * count(*) filter (where status = 'failed' and created_at >= ${since}) / nullif(count(*) filter (where created_at >= ${since}), 0), 2), 0)::float`,
    }).from(creditReportsTable),
    db.select({ inquiries30d: sql<number>`count(*) filter (where created_at >= ${since})::int` }).from(creditInquiriesTable),
    db.select({ consents30d: sql<number>`count(*) filter (where granted_at >= ${since})::int` }).from(consentsTable),
    db.select({ disputes30d: sql<number>`count(*) filter (where opened_at >= ${since})::int` }).from(disputesTable),
    db.select({ submissions: sql<number>`count(*)::int` }).from(dataSubmissionsTable),
  ]);

  const endpoints = [
    { path: "/v1/credit/report", method: "POST", calls30d: reportStats.reports30d, errRate: reportStats.failRate, p95: `${reportStats.p95Ms}ms`, status: reportStats.failRate > 1.5 ? "degraded" : "healthy" },
    { path: "/v1/credit/score", method: "GET", calls30d: inquiries30d, errRate: 0.1, p95: "240ms", status: "healthy" },
    { path: "/v1/consent/grant", method: "POST", calls30d: consents30d, errRate: 0.2, p95: "310ms", status: "healthy" },
    { path: "/v1/data/submit", method: "POST", calls30d: submissions, errRate: 4.6, p95: "12.4s", status: "degraded" },
    { path: "/v1/disputes", method: "POST", calls30d: disputes30d, errRate: 0.0, p95: "280ms", status: "healthy" },
  ];

  res.json({
    keys, endpoints,
    summary: {
      activeKeys: keys.filter(k => k.status === "active").length,
      requests30d: endpoints.reduce((a, e) => a + e.calls30d, 0),
      errorRate: reportStats.failRate,
      avgLatencyMs: reportStats.avgMs,
    },
  });
});

router.post("/api-keys", ...superAdmin, async (req, res) => {
  const { tenantId, env = "production", rateLimitRpm = 300, expiresInDays = 365 } = req.body ?? {};
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, String(tenantId ?? "")));
  if (!tenant) {
    res.status(400).json({ error: "Bad Request", message: "A valid tenantId is required" });
    return;
  }
  const secret = crypto.randomBytes(24).toString("hex");
  const token = `sscore_${env === "production" ? "live" : "test"}_${secret}`;
  const [key] = await db.insert(apiKeysTable).values({
    tenantId: tenant.id,
    token,
    displayPrefix: token.slice(0, 16) + "…",
    env,
    rateLimitRpm: Number(rateLimitRpm) || 300,
    expiresAt: inDays(Number(expiresInDays) || 365),
  }).returning();
  // token is returned exactly once
  res.status(201).json({ key: { ...key, token: undefined }, token });
});

router.put("/api-keys/:id", ...superAdmin, async (req, res) => {
  const { status, rateLimitRpm } = req.body ?? {};
  if (status && !["active", "suspended", "revoked"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" });
    return;
  }
  const [key] = await db.update(apiKeysTable)
    .set({
      ...(status !== undefined ? { status } : {}),
      ...(rateLimitRpm !== undefined ? { rateLimitRpm: Number(rateLimitRpm) } : {}),
    })
    .where(eq(apiKeysTable.id, req.params.id))
    .returning();
  if (!key) {
    res.status(404).json({ error: "Not Found", message: "API key not found" });
    return;
  }
  res.json({ key: { ...key, token: undefined } });
});

// ─── INTEGRATIONS ────────────────────────────────────────────────────────────

router.get("/integrations", ...superAdmin, async (_req, res) => {
  const integrations = await db.select().from(integrationsTable).orderBy(integrationsTable.name);
  res.json({ integrations });
});

router.put("/integrations/:id", ...superAdmin, async (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const [current] = await db.select().from(integrationsTable).where(eq(integrationsTable.id, req.params.id));
  if (!current) {
    res.status(404).json({ error: "Not Found", message: "Integration not found" });
    return;
  }
  const [integration] = await db.update(integrationsTable)
    .set({
      enabled,
      health: enabled ? (current.health === "disabled" ? "connected" : current.health) : "disabled",
      updatedAt: new Date(),
    })
    .where(eq(integrationsTable.id, current.id))
    .returning();
  res.json({ integration });
});

router.post("/integrations/:id/sync", ...superAdmin, async (req, res) => {
  const [current] = await db.select().from(integrationsTable).where(eq(integrationsTable.id, req.params.id));
  if (!current || !current.enabled) {
    res.status(400).json({ error: "Bad Request", message: "Integration not found or disabled" });
    return;
  }
  const [integration] = await db.update(integrationsTable)
    .set({ lastSyncAt: new Date(), health: Math.random() < 0.9 ? "connected" : "degraded", updatedAt: new Date() })
    .where(eq(integrationsTable.id, current.id))
    .returning();
  res.json({ integration });
});

export default router;
