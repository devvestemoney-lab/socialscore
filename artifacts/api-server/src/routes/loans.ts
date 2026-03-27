import { Router, type IRouter } from "express";
import { db, customersTable, loansTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/:p1/:p2/:p3", requireAuth, async (req: AuthRequest, res) => {
  const nrc = `${req.params.p1}/${req.params.p2}/${req.params.p3}`;

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer not found" });
    return;
  }

  const loans = await db.select().from(loansTable).where(eq(loansTable.customerId, customer.id));

  const totalExposure = loans
    .filter(l => l.status === "active")
    .reduce((sum, l) => sum + Number(l.outstandingBalance), 0);

  const activeLoans = loans.filter(l => l.status === "active").length;
  const defaultedLoans = loans.filter(l => l.status === "defaulted" || l.status === "written_off").length;
  const closedLoans = loans.filter(l => l.status === "closed").length;

  // Institution breakdown
  const institutionMap = new Map<string, { name: string; type: string; totalExposure: number; activeLoans: number }>();
  for (const loan of loans) {
    if (!institutionMap.has(loan.institution)) {
      institutionMap.set(loan.institution, { name: loan.institution, type: loan.institutionType, totalExposure: 0, activeLoans: 0 });
    }
    const inst = institutionMap.get(loan.institution)!;
    if (loan.status === "active") {
      inst.totalExposure += Number(loan.outstandingBalance);
      inst.activeLoans += 1;
    }
  }

  await db.insert(auditLogsTable).values({
    action: "loan.exposure.query",
    userId: req.user!.userId,
    tenantId: req.user!.tenantId || null,
    targetNrc: nrc,
    ipAddress: req.ip || null,
    details: { totalExposure, activeLoans },
  });

  res.json({
    nrc,
    totalExposure: Math.round(totalExposure * 100) / 100,
    currency: "ZMW",
    activeLoans,
    defaultedLoans,
    closedLoans,
    loans: loans.map(l => ({
      id: l.id,
      institution: l.institution,
      institutionType: l.institutionType,
      amount: Number(l.amount),
      currency: l.currency,
      outstandingBalance: Number(l.outstandingBalance),
      status: l.status,
      disbursedAt: l.disbursedAt.toISOString(),
      dueDate: l.dueDate?.toISOString() || null,
      interestRate: Number(l.interestRate),
      missedPayments: l.missedPayments,
    })),
    institutions: Array.from(institutionMap.values()),
  });
});

export default router;
