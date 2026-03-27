import { Router, type IRouter } from "express";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { hashPassword } from "../lib/auth.js";
import crypto from "crypto";

const router: IRouter = Router();

router.get("/", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const tenants = await db.select().from(tenantsTable);
  res.json({ tenants: tenants.map(formatTenant), total: tenants.length });
});

router.post("/", requireAuth, requireRole("super_admin"), async (req, res) => {
  const { name, code, type, contactEmail, adminName, adminPassword, settings } = req.body;
  if (!name || !code || !type || !contactEmail || !adminName || !adminPassword) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
    return;
  }

  const apiKey = `zc_${crypto.randomBytes(32).toString("hex")}`;

  const [tenant] = await db.insert(tenantsTable).values({
    name, code, type, contactEmail, apiKey,
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
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, req.params.tenantId));
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
    .where(eq(tenantsTable.id, req.params.tenantId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  res.json(formatTenant(updated));
});

router.delete("/:tenantId", requireAuth, requireRole("super_admin"), async (req, res) => {
  await db.delete(tenantsTable).where(eq(tenantsTable.id, req.params.tenantId));
  res.json({ success: true, message: "Tenant deleted" });
});

router.post("/:tenantId/api-key", requireAuth, requireRole("super_admin"), async (req, res) => {
  const newKey = `zc_${crypto.randomBytes(32).toString("hex")}`;
  const [tenant] = await db.update(tenantsTable)
    .set({ apiKey: newKey, updatedAt: new Date() })
    .where(eq(tenantsTable.id, req.params.tenantId))
    .returning();

  if (!tenant) {
    res.status(404).json({ error: "Not Found", message: "Tenant not found" });
    return;
  }
  res.json({ apiKey: newKey, tenantId: tenant.id, createdAt: new Date().toISOString() });
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
  };
}

export default router;
