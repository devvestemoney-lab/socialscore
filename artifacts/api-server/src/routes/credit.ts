import { Router, type IRouter } from "express";
import { db, customersTable, creditScoresTable, auditLogsTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { scoreConsumer } from "../lib/score-consumer.js";
import { DIMENSIONS } from "../lib/dimensions.js";

const router: IRouter = Router();

router.get("/:p1/:p2/:p3", requireAuth, async (req: AuthRequest, res) => {
  const nrc = `${req.params.p1}/${req.params.p2}/${req.params.p3}`;

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer not found" });
    return;
  }

  const outcome = await scoreConsumer(customer.id);

  await db.insert(auditLogsTable).values({
    action: "credit.score.query",
    userId: req.user!.userId,
    tenantId: req.user!.tenantId || null,
    targetNrc: nrc,
    ipAddress: req.ip || null,
    details: outcome.scorable ? { score: Number(outcome.score.score), band: outcome.band } : { scorable: false },
  });

  if (!outcome.scorable) {
    res.status(422).json({ error: "Unscorable", message: outcome.reason, coverage: outcome.coverage });
    return;
  }

  const s = outcome.score;
  const history = await db.select().from(creditScoresTable)
    .where(eq(creditScoresTable.customerId, customer.id)).orderBy(asc(creditScoresTable.createdAt));

  res.json({
    nrc,
    customerId: customer.id,
    score: Math.round(Number(s.score)),
    band: outcome.band,
    rating: s.rating,
    probabilityOfDefault: Number(s.probabilityOfDefault),
    scoreBreakdown: s.scoreBreakdown,
    dimensions: DIMENSIONS.map(d => ({ key: d.key, label: d.label, value: s.dimensions?.[d.key] ?? null })),
    coverage: s.coverage,
    scorecardVersion: s.scorecardVersion,
    reasonCodes: s.reasonCodes ?? [],
    riskFlags: s.riskFlags ?? [],
    recommendation: s.recommendation,
    lastUpdated: s.createdAt.toISOString(),
    historicalScores: history.slice(-6).map(h => ({
      score: Math.round(Number(h.score)), date: h.createdAt.toISOString(), rating: h.rating,
    })),
  });
});

export default router;
