import { Router, type IRouter } from "express";
import { db, customersTable, usersTable, otpCodesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { signToken } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/** Demo bypass code — any consumer can sign in with this during evaluation */
const BYPASS_CODE = "0000";
const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

const normaliseNrc = (v: string) => v.trim().replace(/\s+/g, "");
const maskPhone = (p: string) => (p.length > 4 ? `${p.slice(0, 5)}••••${p.slice(-3)}` : "••••");

/** Step 1 — issue an OTP against a registered NRC */
router.post("/request-otp", async (req, res) => {
  const nrc = normaliseNrc(String(req.body?.nrc ?? ""));
  if (!/^\d{6}\/\d{2}\/\d$/.test(nrc)) {
    res.status(400).json({ error: "Bad Request", message: "Enter your NRC in the format 123456/78/1" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "No bureau record found for that NRC. Contact your lender if you believe this is an error." });
    return;
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodesTable).values({
    nrc, code, expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
  });
  // In production this is sent by SMS; here it is logged for the demo environment.
  logger.info({ nrc, code }, "consumer OTP issued");

  res.json({
    sent: true,
    phoneHint: maskPhone(customer.phone),
    expiresInMinutes: OTP_TTL_MIN,
    demoHint: `Use ${BYPASS_CODE} in this demo environment`,
  });
});

/** Step 2 — verify the code and issue a session */
router.post("/verify-otp", async (req, res) => {
  const nrc = normaliseNrc(String(req.body?.nrc ?? ""));
  const code = String(req.body?.code ?? "").trim();
  if (!nrc || !code) {
    res.status(400).json({ error: "Bad Request", message: "NRC and passcode are required" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "No bureau record found for that NRC" });
    return;
  }

  if (code !== BYPASS_CODE) {
    const [otp] = await db.select().from(otpCodesTable)
      .where(and(eq(otpCodesTable.nrc, nrc), sql`consumed_at is null`))
      .orderBy(desc(otpCodesTable.createdAt)).limit(1);
    if (!otp) {
      res.status(400).json({ error: "Bad Request", message: "Request a passcode first" }); return;
    }
    if (otp.expiresAt < new Date()) {
      res.status(400).json({ error: "Bad Request", message: "That passcode has expired — request a new one" }); return;
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too Many Requests", message: "Too many attempts — request a new passcode" }); return;
    }
    if (otp.code !== code) {
      await db.update(otpCodesTable).set({ attempts: otp.attempts + 1 }).where(eq(otpCodesTable.id, otp.id));
      res.status(401).json({ error: "Unauthorized", message: "That passcode is incorrect" }); return;
    }
    await db.update(otpCodesTable).set({ consumedAt: new Date() }).where(eq(otpCodesTable.id, otp.id));
  }

  // Find or provision the consumer's account
  let [user] = await db.select().from(usersTable).where(eq(usersTable.customerId, customer.id));
  if (!user) {
    [user] = await db.insert(usersTable).values({
      email: customer.email ?? `${nrc.replace(/\//g, "-")}@consumer.socialscore.zm`,
      name: `${customer.firstName} ${customer.lastName}`,
      role: "customer", customerId: customer.id, status: "active",
      passwordHash: bcrypt.hashSync(crypto.randomUUID(), 10),
    }).returning();
  }
  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  const token = signToken({ userId: user.id, email: user.email, role: "customer", tenantId: null });
  res.json({
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: user.id, name: user.name, email: user.email, role: "customer",
      tenantId: null, tenantName: null,
      customer: { id: customer.id, nrc: customer.nrc, firstName: customer.firstName, lastName: customer.lastName },
    },
  });
});

export default router;
