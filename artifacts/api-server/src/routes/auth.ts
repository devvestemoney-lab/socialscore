import { Router, type IRouter } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !comparePassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Forbidden", message: "Account is inactive" });
    return;
  }

  let tenantName: string | null = null;
  if (user.tenantId) {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, user.tenantId));
    tenantName = tenant?.name || null;
  }

  await db.update(usersTable)
    .set({ lastLoginAt: new Date(), ...(user.status === "invited" ? { status: "active" as const } : {}) })
    .where(eq(usersTable.id, user.id));

  const token = signToken({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, tenantName },
    expiresAt,
  });
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }
  let tenantName: string | null = null;
  if (user.tenantId) {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, user.tenantId));
    tenantName = tenant?.name || null;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, tenantName });
});

export default router;
