import { Router, type IRouter } from "express";
import { db, customersTable, loansTable, creditScoresTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { calculateCreditScore } from "../lib/scoring.js";
import { generateMnoData } from "../lib/mock-integrations.js";

const router: IRouter = Router();

router.get("/:nrc", requireAuth, async (req: AuthRequest, res) => {
  const { nrc } = req.params;

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer not found" });
    return;
  }

  const loans = await db.select().from(loansTable).where(eq(loansTable.customerId, customer.id));
  const mnoData = generateMnoData(nrc);

  const result = calculateCreditScore({
    loans,
    mobileMoneyBalance: mnoData.mobileMoneyBalance,
    avgMonthlyTransactions: mnoData.averageMonthlyTransactions,
    totalTransactionVolume: mnoData.totalTransactionVolume,
    accountAgeMonths: mnoData.accountAge,
  });

  // Save score to DB
  await db.insert(creditScoresTable).values({
    customerId: customer.id,
    score: result.score.toString(),
    rating: result.rating,
    probabilityOfDefault: result.probabilityOfDefault.toString(),
    scoreBreakdown: result.breakdown,
    recommendation: result.recommendation,
    aiInsights: result.aiInsights,
  });

  // Historical scores
  const historicalRaw = await db
    .select()
    .from(creditScoresTable)
    .where(eq(creditScoresTable.customerId, customer.id));

  const historicalScores = historicalRaw.slice(-6).map(s => ({
    score: Number(s.score),
    date: s.createdAt.toISOString(),
    rating: s.rating,
  }));

  await db.insert(auditLogsTable).values({
    action: "credit.score.query",
    userId: req.user!.userId,
    tenantId: req.user!.tenantId || null,
    targetNrc: nrc,
    ipAddress: req.ip || null,
    details: { score: result.score, rating: result.rating },
  });

  res.json({
    nrc,
    customerId: customer.id,
    score: result.score,
    rating: result.rating,
    probabilityOfDefault: result.probabilityOfDefault,
    scoreBreakdown: result.breakdown,
    recommendation: result.recommendation,
    lastUpdated: new Date().toISOString(),
    historicalScores,
  });
});

export default router;
