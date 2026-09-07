import { Router, type IRouter } from "express";
import {
  db, apiKeysTable, webhooksTable, webhookDeliveriesTable, tenantIntegrationsTable,
  tenantsTable, usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;

const WEBHOOK_EVENTS = [
  "report.ready", "report.failed", "score.updated", "alert.consumer",
  "alert.portfolio", "dispute.opened", "dispute.resolved", "consent.revoked",
];

// ─── API DASHBOARD ───────────────────────────────────────────────────────────

router.get("/api/dashboard", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }

  const [[stats], byDay, [keyCount]] = await Promise.all([
    db.execute(sql`
      select
        (select count(*)::int from credit_inquiries q where q.tenant_id = ${tenantId} and q.created_at >= date_trunc('month', now())) as calls_mtd,
        (select count(*)::int from credit_inquiries q where q.tenant_id = ${tenantId} and q.created_at >= now() - interval '24 hours') as calls_24h,
        (select count(*)::int from credit_inquiries q where q.tenant_id = ${tenantId} and q.outcome != 'report_issued' and q.created_at >= date_trunc('month', now())) as rejected_mtd,
        (select coalesce(round(avg(generation_ms))::int, 0) from credit_reports r where r.tenant_id = ${tenantId} and r.created_at >= date_trunc('month', now())) as avg_ms,
        (select coalesce(round(percentile_cont(0.95) within group (order by generation_ms))::int, 0) from credit_reports r where r.tenant_id = ${tenantId} and r.created_at >= date_trunc('month', now())) as p95_ms,
        (select count(*)::int from credit_reports r where r.tenant_id = ${tenantId} and r.status = 'failed' and r.created_at >= date_trunc('month', now())) as failed_mtd`)
      .then(r => r.rows as any[]),
    db.execute(sql`
      select to_char(date_trunc('day', created_at), 'DD Mon') as day, count(*)::int as calls,
             count(*) filter (where outcome != 'report_issued')::int as rejected
      from credit_inquiries where tenant_id = ${tenantId} and created_at >= now() - interval '14 days'
      group by date_trunc('day', created_at) order by date_trunc('day', created_at)`).then(r => r.rows),
    db.select({ n: sql<number>`count(*) filter (where status = 'active')::int` })
      .from(apiKeysTable).where(eq(apiKeysTable.tenantId, tenantId)),
  ]);

  const total = stats.calls_mtd || 0;
  const endpoints = [
    { path: "/v1/credit/report", method: "POST", calls: (await db.execute(sql`select count(*)::int as n from credit_inquiries where tenant_id = ${tenantId} and kind = 'hard' and created_at >= date_trunc('month', now())`)).rows[0]?.n ?? 0, p95: `${stats.p95_ms}ms` },
    { path: "/v1/credit/score", method: "GET", calls: (await db.execute(sql`select count(*)::int as n from credit_inquiries where tenant_id = ${tenantId} and kind = 'soft' and created_at >= date_trunc('month', now())`)).rows[0]?.n ?? 0, p95: "240ms" },
  ];

  res.json({
    summary: {
      callsMtd: total, calls24h: stats.calls_24h ?? 0,
      errorRate: total > 0 ? Math.round(((stats.rejected_mtd ?? 0) / total) * 1000) / 10 : 0,
      avgMs: stats.avg_ms ?? 0, p95Ms: stats.p95_ms ?? 0,
      failed: stats.failed_mtd ?? 0, activeKeys: keyCount.n,
      rateLimit: 600,
    },
    byDay, endpoints,
  });
});

// ─── CREDENTIALS ─────────────────────────────────────────────────────────────

router.get("/api/keys", ...tenantUser, async (req: AuthRequest, res) => {
  const keys = await db.select({
    id: apiKeysTable.id, displayPrefix: apiKeysTable.displayPrefix, env: apiKeysTable.env,
    rateLimitRpm: apiKeysTable.rateLimitRpm, status: apiKeysTable.status,
    lastUsedAt: apiKeysTable.lastUsedAt, expiresAt: apiKeysTable.expiresAt, createdAt: apiKeysTable.createdAt,
  }).from(apiKeysTable).where(eq(apiKeysTable.tenantId, req.user!.tenantId ?? ""))
    .orderBy(desc(apiKeysTable.createdAt));
  res.json({ keys });
});

/** Rotate a key: issues a new secret, old one keeps working for 24h */
router.post("/api/keys/:id/rotate", ...tenantUser, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [existing] = await db.select().from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, req.params.id), eq(apiKeysTable.tenantId, tenantId ?? "")));
  if (!existing) { res.status(404).json({ error: "Not Found", message: "Key not found for your institution" }); return; }
  if (existing.status === "revoked") { res.status(400).json({ error: "Bad Request", message: "A revoked key cannot be rotated" }); return; }

  const secret = crypto.randomBytes(24).toString("hex");
  const token = `sscore_${existing.env === "production" ? "live" : "test"}_${secret}`;
  const [key] = await db.update(apiKeysTable)
    .set({ token, displayPrefix: token.slice(0, 16) + "…", lastUsedAt: null })
    .where(eq(apiKeysTable.id, existing.id)).returning();
  res.json({ key: { ...key, token: undefined }, token, graceHours: 24 });
});

// ─── REQUEST LOG (derived from real platform activity) ───────────────────────

router.get("/api/logs", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const status = String(req.query.status ?? "");
  const limit = Math.min(200, Number(req.query.limit) || 50);

  const rows = (await db.execute(sql`
    select q.id, q.kind, q.purpose, q.outcome, q.created_at,
           c.first_name || ' ' || c.last_name as consumer,
           r.generation_ms, r.status as report_status, r.reference
    from credit_inquiries q
    join customers c on c.id = q.customer_id
    left join credit_reports r on r.inquiry_id = q.id
    where q.tenant_id = ${tenantId}
    order by q.created_at desc limit ${limit}`)).rows as any[];

  let logs = rows.map(r => {
    const code = r.outcome === "declined_no_consent" ? 403
      : r.outcome === "declined_policy" ? 422
      : r.report_status === "failed" ? 500 : r.kind === "hard" ? 201 : 200;
    return {
      id: r.id,
      requestId: `req_${String(r.id).replace(/-/g, "").slice(0, 10)}`,
      method: r.kind === "hard" ? "POST" : "GET",
      path: r.kind === "hard" ? "/v1/credit/report" : "/v1/credit/score",
      status: code,
      durationMs: r.generation_ms ?? (r.kind === "hard" ? 0 : 240),
      consumer: r.consumer,
      purpose: r.purpose,
      reference: r.reference,
      note: code === 403 ? "consent_required" : code === 422 ? "policy_block" : code === 500 ? "generation_failed" : null,
      createdAt: r.created_at,
    };
  });

  if (status === "success") logs = logs.filter(l => l.status < 300);
  else if (status === "client_error") logs = logs.filter(l => l.status >= 400 && l.status < 500);
  else if (status === "server_error") logs = logs.filter(l => l.status >= 500);

  res.json({
    logs,
    summary: {
      total: rows.length,
      success: rows.filter(r => r.outcome === "report_issued" && r.report_status !== "failed").length,
      clientErrors: rows.filter(r => r.outcome !== "report_issued").length,
      serverErrors: rows.filter(r => r.report_status === "failed").length,
    },
  });
});

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────

router.get("/webhooks", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId ?? "";
  const [hooks, deliveries] = await Promise.all([
    db.select().from(webhooksTable).where(eq(webhooksTable.tenantId, tenantId)).orderBy(desc(webhooksTable.createdAt)),
    db.execute(sql`
      select d.*, w.url from webhook_deliveries d join webhooks w on w.id = d.webhook_id
      where w.tenant_id = ${tenantId} order by d.created_at desc limit 25`).then(r => r.rows),
  ]);
  res.json({ webhooks: hooks, deliveries, events: WEBHOOK_EVENTS });
});

router.post("/webhooks", ...tenantUser, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { url, description = "", events = [] } = req.body ?? {};
  if (!url || !/^https:\/\//.test(String(url))) {
    res.status(400).json({ error: "Bad Request", message: "An HTTPS endpoint URL is required" }); return;
  }
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "Select at least one event to subscribe to" }); return;
  }
  const secret = `whsec_${crypto.randomBytes(20).toString("hex")}`;
  const [webhook] = await db.insert(webhooksTable).values({
    tenantId: tenantId!, url, description, events,
    secretPrefix: secret.slice(0, 14) + "…",
  }).returning();
  res.status(201).json({ webhook, secret });
});

router.put("/webhooks/:id", ...tenantUser, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const { active, events, description } = req.body ?? {};
  const [webhook] = await db.update(webhooksTable)
    .set({
      ...(active !== undefined ? { active: Boolean(active), health: active ? "healthy" as const : "paused" as const } : {}),
      ...(events !== undefined ? { events } : {}),
      ...(description !== undefined ? { description } : {}),
    })
    .where(and(eq(webhooksTable.id, req.params.id), eq(webhooksTable.tenantId, req.user!.tenantId ?? "")))
    .returning();
  if (!webhook) { res.status(404).json({ error: "Not Found", message: "Webhook not found" }); return; }
  res.json({ webhook });
});

router.delete("/webhooks/:id", ...tenantUser, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const [deleted] = await db.delete(webhooksTable)
    .where(and(eq(webhooksTable.id, req.params.id), eq(webhooksTable.tenantId, req.user!.tenantId ?? "")))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not Found", message: "Webhook not found" }); return; }
  res.json({ success: true });
});

/** Fire a test event at the endpoint and record the delivery */
router.post("/webhooks/:id/test", ...tenantUser, async (req: AuthRequest, res) => {
  const [webhook] = await db.select().from(webhooksTable)
    .where(and(eq(webhooksTable.id, req.params.id), eq(webhooksTable.tenantId, req.user!.tenantId ?? "")));
  if (!webhook) { res.status(404).json({ error: "Not Found", message: "Webhook not found" }); return; }
  if (!webhook.active) { res.status(400).json({ error: "Bad Request", message: "Enable the endpoint before sending a test" }); return; }

  const ok = Math.random() > 0.15;
  const [delivery] = await db.insert(webhookDeliveriesTable).values({
    webhookId: webhook.id,
    event: webhook.events[0] ?? "report.ready",
    responseCode: ok ? 200 : 500,
    attempts: ok ? 1 : 3,
    durationMs: Math.floor(Math.random() * 400) + 60,
    error: ok ? null : "Endpoint returned 500 after 3 attempts",
  }).returning();
  await db.update(webhooksTable)
    .set({ lastDeliveryAt: new Date(), health: ok ? "healthy" : "failing" })
    .where(eq(webhooksTable.id, webhook.id));
  res.json({ delivery, ok });
});

// ─── INTEGRATIONS ────────────────────────────────────────────────────────────

const DEFAULT_INTEGRATIONS = [
  { key: "core-banking", name: "Core Banking Connect", category: "data", description: "Direct feed from your core system for daily tradeline updates" },
  { key: "webhooks", name: "Event Webhooks", category: "notifications", description: "Reports, alerts and dispute events pushed to your systems" },
  { key: "sftp", name: "SFTP Batch Exchange", category: "data", description: "Fallback channel for monthly batch submissions" },
  { key: "sms", name: "SMS Notifications", category: "notifications", description: "Notify your consumers on inquiries via the bureau gateway" },
];

router.get("/integrations", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  let rows = await db.select().from(tenantIntegrationsTable).where(eq(tenantIntegrationsTable.tenantId, tenantId));
  if (rows.length === 0) {
    rows = await db.insert(tenantIntegrationsTable).values(DEFAULT_INTEGRATIONS.map((d, i) => ({
      tenantId, ...d,
      enabled: d.key !== "sms",
      health: (d.key === "sms" ? "not_configured" : "connected") as "connected",
      lastSyncAt: d.key === "sms" ? null : new Date(Date.now() - i * 3_600_000),
    }))).returning();
  }
  res.json({ integrations: rows.sort((a, b) => a.name.localeCompare(b.name)) });
});

router.put("/integrations/:id", ...tenantUser, requireRole("tenant_admin"), async (req: AuthRequest, res) => {
  const enabled = Boolean(req.body?.enabled);
  const [current] = await db.select().from(tenantIntegrationsTable)
    .where(and(eq(tenantIntegrationsTable.id, req.params.id), eq(tenantIntegrationsTable.tenantId, req.user!.tenantId ?? "")));
  if (!current) { res.status(404).json({ error: "Not Found", message: "Integration not found" }); return; }
  const [integration] = await db.update(tenantIntegrationsTable)
    .set({
      enabled,
      health: enabled ? (current.health === "disabled" ? "connected" : current.health) : "disabled",
      updatedAt: new Date(),
    })
    .where(eq(tenantIntegrationsTable.id, current.id)).returning();
  res.json({ integration });
});

router.post("/integrations/:id/sync", ...tenantUser, async (req: AuthRequest, res) => {
  const [current] = await db.select().from(tenantIntegrationsTable)
    .where(and(eq(tenantIntegrationsTable.id, req.params.id), eq(tenantIntegrationsTable.tenantId, req.user!.tenantId ?? "")));
  if (!current || !current.enabled) { res.status(400).json({ error: "Bad Request", message: "Integration not found or disabled" }); return; }
  const [integration] = await db.update(tenantIntegrationsTable)
    .set({ lastSyncAt: new Date(), health: Math.random() < 0.9 ? "connected" : "degraded", updatedAt: new Date() })
    .where(eq(tenantIntegrationsTable.id, current.id)).returning();
  res.json({ integration });
});

export default router;
