import { Router, type IRouter } from "express";
import { db, consentsTable, customersTable, usersTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/grant", requireAuth, async (req: AuthRequest, res) => {
  const { dataTypes, tenantId, expiresAt } = req.body;
  if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "dataTypes array required" });
    return;
  }

  // Find customer linked to this user
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, user.email));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer profile not found" });
    return;
  }

  const records = [];
  for (const dataType of dataTypes) {
    // Upsert consent
    const existing = await db.select().from(consentsTable).where(
      and(
        eq(consentsTable.customerId, customer.id),
        eq(consentsTable.dataType, dataType),
        tenantId ? eq(consentsTable.tenantId, tenantId) : undefined
      )
    );
    if (existing.length > 0) {
      await db.update(consentsTable)
        .set({ status: "active", grantedAt: new Date(), expiresAt: expiresAt ? new Date(expiresAt) : null, revokedAt: null })
        .where(eq(consentsTable.id, existing[0].id));
      records.push({ ...existing[0], status: "active" });
    } else {
      const [inserted] = await db.insert(consentsTable).values({
        customerId: customer.id,
        tenantId: tenantId || null,
        dataType,
        status: "active",
        grantedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }).returning();
      records.push(inserted);
    }
  }

  await db.update(customersTable).set({ consentGiven: true }).where(eq(customersTable.id, customer.id));

  res.json({
    success: true,
    consents: records.map(r => ({
      id: r.id,
      dataType: r.dataType,
      tenantId: r.tenantId,
      tenantName: null,
      status: r.status,
      grantedAt: r.grantedAt?.toISOString() || new Date().toISOString(),
      expiresAt: r.expiresAt?.toISOString() || null,
    })),
  });
});

router.post("/revoke", requireAuth, async (req: AuthRequest, res) => {
  const { dataTypes, tenantId } = req.body;
  if (!dataTypes || !Array.isArray(dataTypes)) {
    res.status(400).json({ error: "Bad Request", message: "dataTypes array required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, user.email));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer profile not found" });
    return;
  }

  const records = [];
  for (const dataType of dataTypes) {
    const [updated] = await db.update(consentsTable)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(and(eq(consentsTable.customerId, customer.id), eq(consentsTable.dataType, dataType)))
      .returning();
    if (updated) records.push(updated);
  }

  res.json({
    success: true,
    consents: records.map(r => ({
      id: r.id,
      dataType: r.dataType,
      tenantId: r.tenantId,
      tenantName: null,
      status: r.status,
      grantedAt: r.grantedAt?.toISOString() || new Date().toISOString(),
      expiresAt: r.expiresAt?.toISOString() || null,
    })),
  });
});

router.get("/status", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, user.email));
  if (!customer) {
    res.json({ customerId: req.user!.userId, consents: [] });
    return;
  }

  const consentRecords = await db.select().from(consentsTable).where(eq(consentsTable.customerId, customer.id));
  
  const consentsWithTenants = await Promise.all(consentRecords.map(async c => {
    let tenantName = null;
    if (c.tenantId) {
      const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, c.tenantId));
      tenantName = tenant?.name || null;
    }
    return {
      id: c.id,
      dataType: c.dataType,
      tenantId: c.tenantId,
      tenantName,
      status: c.status,
      grantedAt: c.grantedAt?.toISOString() || new Date().toISOString(),
      expiresAt: c.expiresAt?.toISOString() || null,
    };
  }));

  res.json({ customerId: customer.id, consents: consentsWithTenants });
});

export default router;
