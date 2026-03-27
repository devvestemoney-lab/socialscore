import { Router, type IRouter } from "express";
import { db, customersTable, auditLogsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  const { nrc, passport, phone } = req.body;
  if (!nrc && !passport && !phone) {
    res.status(400).json({ error: "Bad Request", message: "At least one identifier required (nrc, passport, or phone)" });
    return;
  }

  const conditions = [];
  if (nrc) conditions.push(eq(customersTable.nrc, nrc));
  if (passport) conditions.push(eq(customersTable.passport, passport));
  if (phone) conditions.push(eq(customersTable.phone, phone));

  const [customer] = await db.select().from(customersTable).where(or(...conditions));

  await db.insert(auditLogsTable).values({
    action: "identity.verify",
    userId: req.user!.userId,
    tenantId: req.user!.tenantId || null,
    targetNrc: nrc || customer?.nrc || null,
    ipAddress: req.ip || null,
    details: { nrc, passport, phone, found: !!customer },
  });

  if (!customer) {
    res.json({ verified: false, message: "No matching identity found in system" });
    return;
  }

  res.json({
    verified: true,
    customer: {
      id: customer.id,
      nrc: customer.nrc,
      passport: customer.passport,
      firstName: customer.firstName,
      lastName: customer.lastName,
      dateOfBirth: customer.dateOfBirth,
      phone: customer.phone,
      email: customer.email,
      province: customer.province,
      consentGiven: customer.consentGiven,
      createdAt: customer.createdAt.toISOString(),
    },
  });
});

export default router;
