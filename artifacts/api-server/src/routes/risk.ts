import { Router, type IRouter } from "express";
import { db, customersTable, loansTable, auditLogsTable, creditScoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { calculateCreditScore } from "../lib/scoring.js";
import { generateMnoData } from "../lib/mock-integrations.js";

const router: IRouter = Router();

router.get("/:p1/:p2/:p3", requireAuth, async (req: AuthRequest, res) => {
  const nrc = `${req.params.p1}/${req.params.p2}/${req.params.p3}`;

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer not found" });
    return;
  }

  const loans = await db.select().from(loansTable).where(eq(loansTable.customerId, customer.id));
  const mnoData = generateMnoData(nrc);

  const scoring = calculateCreditScore({
    loans,
    mobileMoneyBalance: mnoData.mobileMoneyBalance,
    avgMonthlyTransactions: mnoData.averageMonthlyTransactions,
    totalTransactionVolume: mnoData.totalTransactionVolume,
    accountAgeMonths: mnoData.accountAge,
  });

  const activeLoans = loans.filter(l => l.status === "active");
  const totalExposure = activeLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);

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
    action: "risk.profile.query",
    userId: req.user!.userId,
    tenantId: req.user!.tenantId || null,
    targetNrc: nrc,
    ipAddress: req.ip || null,
    details: { riskLevel: scoring.riskLevel, score: scoring.score },
  });

  res.json({
    nrc,
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
    creditScore: {
      nrc,
      customerId: customer.id,
      score: scoring.score,
      rating: scoring.rating,
      probabilityOfDefault: scoring.probabilityOfDefault,
      scoreBreakdown: scoring.breakdown,
      recommendation: scoring.recommendation,
      lastUpdated: new Date().toISOString(),
      historicalScores: (await db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, customer.id))).slice(-8).map(s => ({ score: Number(s.score), date: s.createdAt.toISOString(), rating: s.rating })),
    },
    loanExposure: {
      nrc,
      totalExposure: Math.round(totalExposure * 100) / 100,
      currency: "ZMW",
      activeLoans: activeLoans.length,
      defaultedLoans: loans.filter(l => l.status === "defaulted").length,
      closedLoans: loans.filter(l => l.status === "closed").length,
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
    },
    riskLevel: scoring.riskLevel,
    riskFactors: scoring.riskFactors,
    recommendedCreditLimit: scoring.recommendedCreditLimit,
    aiInsights: scoring.aiInsights,
    generatedAt: new Date().toISOString(),
  });
});

export default router;
