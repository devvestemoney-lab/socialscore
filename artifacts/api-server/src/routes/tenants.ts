import { Router, type IRouter } from "express";
import {
  db, tenantsTable, usersTable, apiKeysTable, creditReportsTable,
  creditInquiriesTable, consentsTable, disputesTable, institutionsTable,
} from "@workspace/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { hashPassword } from "../lib/auth.js";
import crypto from "crypto";

const router: IRouter = Router();

router.get("/", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const tenants = await db.select().from(tenantsTable);
  res.json({ tenants: tenants.map(formatTenant), total: tenants.length });
});

router.post("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { name, code, type, contactEmail, adminName, adminPassword, settings, kyb } = req.body;
  if (!name || !code || !type || !contactEmail || !adminName || !adminPassword) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
    return;
  }

  const apiKey = `zc_${crypto.randomBytes(32).toString("hex")}`;

  const [tenant] = await db.insert(tenantsTable).values({
    name, code, type, contactEmail, apiKey,
    kyb: kyb ?? null,
    kybStatus: "pending",
    settings: settings || {
      scoringModel: "standard",
      maxLoanAmount: 100000,
      requireConsent: true,
      allowedDataTypes: ["bank_data", "mobile_money", "mfi_loans", "credit_history"],
    },
  }).returning();

  // Create admin user for the tenant
  await db.insert(usersTable).values({
    email: contactEmail,
    passwordHash: hashPassword(adminPassword),
    name: adminName,
    role: "tenant_admin",
    tenantId: tenant.id,
  });

  res.status(201).json(formatTenant(tenant));
});

router.get("/:tenantId", requireAuth, requireRole("super_admin"), async (req, res) => {
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, String(req.params.tenantId)));
  if (!tenant) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  res.json(formatTenant(tenant));
});

router.put("/:tenantId", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { name, status, contactEmail, settings } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (status) updates.status = status;
  if (contactEmail) updates.contactEmail = contactEmail;
  if (settings) updates.settings = settings;

  const [updated] = await db.update(tenantsTable)
    .set(updates)
    .where(eq(tenantsTable.id, String(req.params.tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  res.json(formatTenant(updated));
});

router.delete("/:tenantId", requireAuth, requireRole("super_admin"), async (req, res) => {
  await db.delete(tenantsTable).where(eq(tenantsTable.id, String(req.params.tenantId)));
  res.json({ success: true, message: "Tenant deleted" });
});

router.post("/:tenantId/api-key", requireAuth, requireRole("super_admin"), async (req, res) => {
  const newKey = `zc_${crypto.randomBytes(32).toString("hex")}`;
  const [tenant] = await db.update(tenantsTable)
    .set({ apiKey: newKey, updatedAt: new Date() })
    .where(eq(tenantsTable.id, String(req.params.tenantId)))
    .returning();

  if (!tenant) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  res.json({ apiKey: newKey, tenantId: tenant.id, createdAt: new Date().toISOString() });
});


router.get("/:tenantId/overview", requireAuth, requireRole("super_admin"), async (req, res) => {
  const tenantId = String(req.params.tenantId);
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  if (!tenant) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [users, keys, [reportStats], [{ inquiries30d }], [{ activeConsents }], [{ openDisputes }], [institution], monthly, recentReports] = await Promise.all([
    db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role,
      status: usersTable.status, mfaEnabled: usersTable.mfaEnabled, lastLoginAt: usersTable.lastLoginAt,
    }).from(usersTable).where(eq(usersTable.tenantId, tenantId)).orderBy(desc(usersTable.createdAt)),
    db.select().from(apiKeysTable).where(eq(apiKeysTable.tenantId, tenantId)).orderBy(desc(apiKeysTable.createdAt)),
    db.select({
      total: sql<number>`count(*)::int`,
      last30d: sql<number>`count(*) filter (where created_at >= ${since30})::int`,
      avgMs: sql<number>`coalesce(round(avg(generation_ms))::int, 0)`,
    }).from(creditReportsTable).where(eq(creditReportsTable.tenantId, tenantId)),
    db.select({ inquiries30d: sql<number>`count(*) filter (where created_at >= ${since30})::int` })
      .from(creditInquiriesTable).where(eq(creditInquiriesTable.tenantId, tenantId)),
    db.select({ activeConsents: sql<number>`count(*) filter (where status = 'active')::int` })
      .from(consentsTable).where(eq(consentsTable.tenantId, tenantId)),
    db.select({ openDisputes: sql<number>`count(*) filter (where status in ('open','under_investigation','awaiting_institution','escalated'))::int` })
      .from(disputesTable).where(eq(disputesTable.institutionName, tenant.name)),
    db.select().from(institutionsTable).where(eq(institutionsTable.tenantId, tenantId)),
    db.execute(sql`
      select to_char(date_trunc('month', created_at), 'Mon') as month, count(*)::int as reports
      from credit_reports where tenant_id = ${tenantId} and created_at >= now() - interval '6 months'
      group by date_trunc('month', created_at) order by date_trunc('month', created_at)
    `).then(r => r.rows),
    db.select({
      id: creditReportsTable.id,
      reference: creditReportsTable.reference,
      purpose: creditReportsTable.purpose,
      band: creditReportsTable.band,
      score: creditReportsTable.score,
      status: creditReportsTable.status,
      createdAt: creditReportsTable.createdAt,
    }).from(creditReportsTable).where(eq(creditReportsTable.tenantId, tenantId))
      .orderBy(desc(creditReportsTable.createdAt)).limit(8),
  ]);

  res.json({
    tenant: { ...formatTenant(tenant), apiCallsThisMonth: tenant.apiCallsThisMonth },
    stats: {
      users: users.length,
      activeKeys: keys.filter(k => k.status === "active").length,
      reportsTotal: reportStats.total,
      reports30d: reportStats.last30d,
      avgGenerationMs: reportStats.avgMs,
      inquiries30d,
      activeConsents,
      openDisputes,
    },
    institution: institution ?? null,
    users,
    keys: keys.map(k => ({ ...k, token: undefined })),
    monthly,
    recentReports,
  });
});

router.put("/:tenantId/kyb", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { kybStatus, kyb } = req.body ?? {};
  if (kybStatus && !["pending", "verified", "rejected"].includes(kybStatus)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid KYB status" });
    return;
  }
  const [tenant] = await db.update(tenantsTable)
    .set({
      ...(kybStatus !== undefined ? { kybStatus } : {}),
      ...(kyb !== undefined ? { kyb } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenantsTable.id, String(req.params.tenantId)))
    .returning();
  if (!tenant) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  res.json(formatTenant(tenant));
});

function formatTenant(tenant: typeof tenantsTable.$inferSelect) {
  return {
    id: tenant.id,
    name: tenant.name,
    code: tenant.code,
    type: tenant.type,
    status: tenant.status,
    contactEmail: tenant.contactEmail,
    apiCallsThisMonth: tenant.apiCallsThisMonth,
    totalQueries: tenant.totalQueries,
    createdAt: tenant.createdAt.toISOString(),
    settings: tenant.settings,
    kybStatus: tenant.kybStatus,
    kyb: tenant.kyb,
  };
}

export default router;
