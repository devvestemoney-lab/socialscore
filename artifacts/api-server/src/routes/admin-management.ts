import { Router, type IRouter } from "express";
import {
  db, institutionsTable, rolesTable, usersTable, tenantsTable,
  insertInstitutionSchema, insertRoleSchema,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")] as const;

// ─── INSTITUTIONS ────────────────────────────────────────────────────────────

router.get("/institutions", ...superAdmin, async (_req, res) => {
  const institutions = await db.select().from(institutionsTable).orderBy(desc(institutionsTable.memberSince));
  res.json({ institutions });
});

router.post("/institutions", ...superAdmin, async (req, res) => {
  const parsed = insertInstitutionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  try {
    const [institution] = await db.insert(institutionsTable).values(parsed.data).returning();
    res.status(201).json({ institution });
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "Conflict", message: "An institution with this license number already exists" });
      return;
    }
    throw e;
  }
});

router.put("/institutions/:id", ...superAdmin, async (req, res) => {
  const parsed = insertInstitutionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  const [institution] = await db.update(institutionsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(institutionsTable.id, req.params.id))
    .returning();
  if (!institution) {
    res.status(404).json({ error: "Not Found", message: "Institution not found" });
    return;
  }
  res.json({ institution });
});

router.delete("/institutions/:id", ...superAdmin, async (req, res) => {
  const [deleted] = await db.delete(institutionsTable).where(eq(institutionsTable.id, req.params.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not Found", message: "Institution not found" });
    return;
  }
  res.json({ success: true });
});

// ─── USERS & ACCESS ──────────────────────────────────────────────────────────

router.get("/users", ...superAdmin, async (_req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      roleId: usersTable.roleId,
      roleName: rolesTable.name,
      tenantId: usersTable.tenantId,
      tenantName: tenantsTable.name,
      status: usersTable.status,
      mfaEnabled: usersTable.mfaEnabled,
      lastLoginAt: usersTable.lastLoginAt,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(tenantsTable, eq(usersTable.tenantId, tenantsTable.id))
    .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .orderBy(desc(usersTable.createdAt));
  res.json({ users });
});

router.post("/users/invite", ...superAdmin, async (req: AuthRequest, res) => {
  const { name, email, role, tenantId, roleId } = req.body ?? {};
  if (!name || !email || !role) {
    res.status(400).json({ error: "Bad Request", message: "name, email and role are required" });
    return;
  }
  if (!["super_admin", "tenant_admin", "tenant_user", "customer"].includes(role)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid role" });
    return;
  }
  const tempPassword = crypto.randomUUID().slice(0, 12);
  try {
    const [user] = await db.insert(usersTable).values({
      name,
      email,
      role,
      tenantId: tenantId || null,
      roleId: roleId || null,
      status: "invited",
      passwordHash: bcrypt.hashSync(tempPassword, 10),
    }).returning();
    // In production this would be emailed; surfaced once here for the demo environment.
    res.status(201).json({ user: { ...user, passwordHash: undefined }, tempPassword });
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "Conflict", message: "A user with this email already exists" });
      return;
    }
    throw e;
  }
});

router.put("/users/:id/access", ...superAdmin, async (req: AuthRequest, res) => {
  const { status, role, roleId, mfaEnabled, name } = req.body ?? {};
  if (status && !["active", "invited", "suspended"].includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" });
    return;
  }
  if (req.params.id === req.user!.userId && status === "suspended") {
    res.status(400).json({ error: "Bad Request", message: "You cannot suspend your own account" });
    return;
  }
  const [user] = await db.update(usersTable)
    .set({
      ...(status !== undefined ? { status, isActive: status !== "suspended" } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(roleId !== undefined ? { roleId: roleId || null } : {}),
      ...(mfaEnabled !== undefined ? { mfaEnabled } : {}),
      ...(name !== undefined ? { name } : {}),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, req.params.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }
  res.json({ user: { ...user, passwordHash: undefined } });
});

// ─── ROLES & PERMISSIONS ─────────────────────────────────────────────────────

router.get("/roles", ...superAdmin, async (_req, res) => {
  const [roles, counts] = await Promise.all([
    db.select().from(rolesTable).orderBy(desc(rolesTable.isSystem), rolesTable.name),
    db.select({ roleId: usersTable.roleId, count: sql<number>`count(*)::int` }).from(usersTable).groupBy(usersTable.roleId),
  ]);
  const countByRole = new Map(counts.map(c => [c.roleId, c.count]));
  res.json({ roles: roles.map(r => ({ ...r, userCount: countByRole.get(r.id) ?? 0 })) });
});

router.post("/roles", ...superAdmin, async (req, res) => {
  const parsed = insertRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  try {
    const [role] = await db.insert(rolesTable).values({ ...parsed.data, isSystem: false }).returning();
    res.status(201).json({ role });
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "Conflict", message: "A role with this name already exists" });
      return;
    }
    throw e;
  }
});

router.put("/roles/:id", ...superAdmin, async (req, res) => {
  const parsed = insertRoleSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }
  const [role] = await db.update(rolesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(rolesTable.id, req.params.id))
    .returning();
  if (!role) {
    res.status(404).json({ error: "Not Found", message: "Role not found" });
    return;
  }
  res.json({ role });
});

router.delete("/roles/:id", ...superAdmin, async (req, res) => {
  const [existing] = await db.select().from(rolesTable).where(eq(rolesTable.id, req.params.id));
  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Role not found" });
    return;
  }
  if (existing.isSystem) {
    res.status(400).json({ error: "Bad Request", message: "System roles cannot be deleted" });
    return;
  }
  await db.delete(rolesTable).where(eq(rolesTable.id, req.params.id));
  res.json({ success: true });
});

export default router;
