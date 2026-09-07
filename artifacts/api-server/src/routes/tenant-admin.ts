import { Router, type IRouter } from "express";
import {
  db, tenantsTable, usersTable, rolesTable, branchesTable,
  tenantSecuritySettingsTable, loginEventsTable, institutionsTable,
  insertBranchSchema,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();
const tenantUser = [requireAuth, requireRole("tenant_admin", "tenant_user")] as const;
const tenantAdmin = [requireAuth, requireRole("tenant_admin")] as const;

const DEFAULT_SECURITY = [
  { key: "mfa_required", label: "Require MFA for all workspace users", description: "TOTP or hardware key on every login", enabled: true },
  { key: "ip_allowlist", label: "Restrict logins to registered IP ranges", description: "Only your office ranges may authenticate", enabled: true },
  { key: "session_timeout", label: "Session timeout after 15 minutes idle", description: "Stricter than the platform default", enabled: false },
  { key: "purpose_note", label: "Require a purpose note on every report pull", description: "Free-text justification stored in the audit log", enabled: true },
  { key: "export_restriction", label: "Restrict CSV exports to admins", description: "Prevents bulk extraction by analyst accounts", enabled: false },
];

// ─── ORGANIZATION PROFILE ────────────────────────────────────────────────────

router.get("/organization", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  if (!tenant) { res.status(404).json({ error: "Not Found", message: "Tenant not found" }); return; }
  const [institution] = await db.select().from(institutionsTable).where(eq(institutionsTable.tenantId, tenantId));
  const [counts] = await db.select({
    users: sql<number>`(select count(*)::int from users where tenant_id = ${tenantId})`,
    branches: sql<number>`(select count(*)::int from branches where tenant_id = ${tenantId})`,
  }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));

  res.json({
    tenant: {
      id: tenant.id, name: tenant.name, code: tenant.code, type: tenant.type,
      status: tenant.status, contactEmail: tenant.contactEmail,
      kybStatus: tenant.kybStatus, kyb: tenant.kyb, settings: tenant.settings,
      createdAt: tenant.createdAt,
    },
    institution: institution ?? null,
    counts,
  });
});

// ─── USERS ───────────────────────────────────────────────────────────────────

router.get("/team", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId ?? "";
  const [users, [summary]] = await Promise.all([
    db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, roleName: rolesTable.name, roleId: usersTable.roleId,
      status: usersTable.status, mfaEnabled: usersTable.mfaEnabled,
      lastLoginAt: usersTable.lastLoginAt, createdAt: usersTable.createdAt,
    }).from(usersTable).leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.tenantId, tenantId)).orderBy(desc(usersTable.createdAt)),
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where status = 'active')::int`,
      invited: sql<number>`count(*) filter (where status = 'invited')::int`,
      suspended: sql<number>`count(*) filter (where status = 'suspended')::int`,
      mfa: sql<number>`count(*) filter (where mfa_enabled)::int`,
      dormant: sql<number>`count(*) filter (where last_login_at is null or last_login_at < now() - interval '60 days')::int`,
    }).from(usersTable).where(eq(usersTable.tenantId, tenantId)),
  ]);
  res.json({ users, summary });
});

router.post("/team/invite", ...tenantAdmin, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { name, email, role = "tenant_user", roleId } = req.body ?? {};
  if (!name || !email) { res.status(400).json({ error: "Bad Request", message: "Name and email are required" }); return; }
  if (!["tenant_admin", "tenant_user"].includes(role)) {
    res.status(400).json({ error: "Bad Request", message: "Users can only be invited as tenant admin or tenant user" }); return;
  }
  const tempPassword = crypto.randomUUID().slice(0, 12);
  try {
    const [user] = await db.insert(usersTable).values({
      name, email, role, tenantId, roleId: roleId || null, status: "invited",
      passwordHash: bcrypt.hashSync(tempPassword, 10),
    }).returning();
    res.status(201).json({ user: { ...user, passwordHash: undefined }, tempPassword });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "Conflict", message: "A user with this email already exists" }); return; }
    throw e;
  }
});

router.put("/team/:id", ...tenantAdmin, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (req.params.id === req.user!.userId && req.body?.status === "suspended") {
    res.status(400).json({ error: "Bad Request", message: "You cannot suspend your own account" }); return;
  }
  const { status, role, roleId, mfaEnabled } = req.body ?? {};
  const [user] = await db.update(usersTable)
    .set({
      ...(status !== undefined ? { status, isActive: status !== "suspended" } : {}),
      ...(role !== undefined && ["tenant_admin", "tenant_user"].includes(role) ? { role } : {}),
      ...(roleId !== undefined ? { roleId: roleId || null } : {}),
      ...(mfaEnabled !== undefined ? { mfaEnabled: Boolean(mfaEnabled) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(usersTable.id, req.params.id), eq(usersTable.tenantId, tenantId ?? "")))
    .returning();
  if (!user) { res.status(404).json({ error: "Not Found", message: "User not found in your workspace" }); return; }
  res.json({ user: { ...user, passwordHash: undefined } });
});

// ─── ROLES ───────────────────────────────────────────────────────────────────

router.get("/team/roles", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId ?? "";
  const [roles, counts] = await Promise.all([
    db.select().from(rolesTable).where(eq(rolesTable.scope, "tenant")).orderBy(rolesTable.name),
    db.select({ roleId: usersTable.roleId, n: sql<number>`count(*)::int` })
      .from(usersTable).where(eq(usersTable.tenantId, tenantId)).groupBy(usersTable.roleId),
  ]);
  const countMap = new Map(counts.map(c => [c.roleId, c.n]));
  res.json({ roles: roles.map(r => ({ ...r, users: countMap.get(r.id) ?? 0 })) });
});

// ─── BRANCHES ────────────────────────────────────────────────────────────────

router.get("/branches", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId ?? "";
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
  const rows = (await db.execute(sql`
    select b.*,
      (select count(*)::int from users u where u.tenant_id = ${tenantId}) as tenant_users,
      (select count(*)::int from loans l where l.institution = ${tenant?.name ?? ""}) as tenant_loans
    from branches b where b.tenant_id = ${tenantId} order by b.code`)).rows;
  res.json({ branches: rows });
});

router.post("/branches", ...tenantAdmin, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const parsed = insertBranchSchema.omit({ tenantId: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" }); return;
  }
  try {
    const [branch] = await db.insert(branchesTable).values({ ...parsed.data, tenantId: tenantId! }).returning();
    res.status(201).json({ branch });
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "Conflict", message: "A branch with this code already exists" }); return; }
    throw e;
  }
});

router.put("/branches/:id", ...tenantAdmin, async (req: AuthRequest, res) => {
  const parsed = insertBranchSchema.omit({ tenantId: true }).partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.issues[0]?.message ?? "Invalid payload" }); return;
  }
  const [branch] = await db.update(branchesTable).set(parsed.data)
    .where(and(eq(branchesTable.id, req.params.id), eq(branchesTable.tenantId, req.user!.tenantId ?? "")))
    .returning();
  if (!branch) { res.status(404).json({ error: "Not Found", message: "Branch not found" }); return; }
  res.json({ branch });
});

router.delete("/branches/:id", ...tenantAdmin, async (req: AuthRequest, res) => {
  const [deleted] = await db.delete(branchesTable)
    .where(and(eq(branchesTable.id, req.params.id), eq(branchesTable.tenantId, req.user!.tenantId ?? "")))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not Found", message: "Branch not found" }); return; }
  res.json({ success: true });
});

// ─── SECURITY ────────────────────────────────────────────────────────────────

router.get("/security", ...tenantUser, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "Bad Request", message: "No tenant on this account" }); return; }
  let settings = await db.select().from(tenantSecuritySettingsTable)
    .where(eq(tenantSecuritySettingsTable.tenantId, tenantId));
  if (settings.length === 0) {
    settings = await db.insert(tenantSecuritySettingsTable)
      .values(DEFAULT_SECURITY.map(s => ({ ...s, tenantId }))).returning();
  }

  const [events, [posture], [signins]] = await Promise.all([
    db.select().from(loginEventsTable).where(eq(loginEventsTable.tenantId, tenantId))
      .orderBy(desc(loginEventsTable.createdAt)).limit(25),
    db.select({
      users: sql<number>`count(*)::int`,
      mfa: sql<number>`count(*) filter (where mfa_enabled)::int`,
      suspended: sql<number>`count(*) filter (where status = 'suspended')::int`,
      dormant: sql<number>`count(*) filter (where last_login_at is null or last_login_at < now() - interval '60 days')::int`,
    }).from(usersTable).where(eq(usersTable.tenantId, tenantId)),
    db.select({
      last7d: sql<number>`count(*) filter (where outcome = 'success' and created_at >= now() - interval '7 days')::int`,
      failed7d: sql<number>`count(*) filter (where outcome != 'success' and created_at >= now() - interval '7 days')::int`,
      ips: sql<number>`count(distinct ip_address)::int`,
    }).from(loginEventsTable).where(eq(loginEventsTable.tenantId, tenantId)),
  ]);

  res.json({
    settings: settings.sort((a, b) => a.label.localeCompare(b.label)),
    events, posture: { ...posture, mfaCoverage: posture.users ? Math.round((posture.mfa / posture.users) * 100) : 0 },
    signins,
  });
});

router.put("/security/:key", ...tenantAdmin, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const [setting] = await db.update(tenantSecuritySettingsTable)
    .set({ enabled: Boolean(req.body?.enabled), updatedBy: user?.name ?? "", updatedAt: new Date() })
    .where(and(eq(tenantSecuritySettingsTable.tenantId, tenantId ?? ""), eq(tenantSecuritySettingsTable.key, req.params.key)))
    .returning();
  if (!setting) { res.status(404).json({ error: "Not Found", message: "Setting not found" }); return; }
  res.json({ setting });
});

export default router;
