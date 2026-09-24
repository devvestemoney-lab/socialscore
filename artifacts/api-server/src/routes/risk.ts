import { Router, type IRouter } from "express";
import { db, customersTable, loansTable, auditLogsTable, creditScoresTable, type CreditScore } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { scoreConsumer } from "../lib/score-consumer.js";
import { DIMENSIONS } from "../lib/dimensions.js";

const router: IRouter = Router();

type RiskLevel = "Low" | "Medium" | "High" | "Very High" | "Critical";
const LEVELS: RiskLevel[] = ["Low", "Medium", "High", "Very High", "Critical"];
const BAND_LEVEL: Record<string, number> = { A: 0, B: 0, C: 1, D: 2, E: 3 };
const BAND_LIMIT: Record<string, number> = { A: 1, B: 0.8, C: 0.5, D: 0.25, E: 0 };

/** Band sets the level; each high-severity flag moves it up one step. */
function riskLevelFor(band: string, score: CreditScore): RiskLevel {
  const high = (score.riskFlags ?? []).filter(f => f.severity === "high").length;
  return LEVELS[Math.min(LEVELS.length - 1, BAND_LEVEL[band] + high)];
}

/** Three months of mobile money inflow where we have it, otherwise a
 *  score-based figure — scaled by band and by how many loans are already open. */
function creditLimitFor(band: string, score: CreditScore, activeLoans: number) {
  const inflow = Number(score.cashflow?.avgMonthlyInflow ?? 0);
  const base = inflow > 0 ? inflow * 3 : (Number(score.score) - 300) * 30;
  return Math.round(base * BAND_LIMIT[band] * Math.max(0, 1 - activeLoans * 0.15));
}

router.get("/:p1/:p2/:p3", requireAuth, async (req: AuthRequest, res) => {
  const nrc = `${req.params.p1}/${req.params.p2}/${req.params.p3}`;

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.nrc, nrc));
  if (!customer) {
    res.status(404).json({ error: "Not Found", message: "Customer not found" });
    return;
  }

  const [outcome, loans, history] = await Promise.all([
    scoreConsumer(customer.id),
    db.select().from(loansTable).where(eq(loansTable.customerId, customer.id)),
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, customer.id))
      .orderBy(asc(creditScoresTable.createdAt)),
  ]);

  const activeLoans = loans.filter(l => l.status === "active");
  const totalExposure = activeLoans.reduce((sum, l) => sum + Number(l.outstandingBalance), 0);

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

  const scored = outcome.scorable ? outcome.score : null;
  const band = outcome.scorable ? outcome.band : null;

  await db.insert(auditLogsTable).values({
    action: "risk.profile.query",
    userId: req.user!.userId,
    tenantId: req.user!.tenantId || null,
    targetNrc: nrc,
    ipAddress: req.ip || null,
    details: scored
      ? { score: Number(scored.score), band, flags: (scored.riskFlags ?? []).map(f => f.code) }
      : { scorable: false },
  });

  const label = (key: string) => key === "flags" ? "Risk flags" : DIMENSIONS.find(d => d.key === key)?.label ?? key;

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
    scorable: outcome.scorable,
    unscorableReason: outcome.scorable ? null : outcome.reason,
    creditScore: scored && {
      nrc,
      customerId: customer.id,
      score: Math.round(Number(scored.score)),
      band,
      rating: scored.rating,
      probabilityOfDefault: Number(scored.probabilityOfDefault),
      scoreBreakdown: scored.scoreBreakdown,
      dimensions: DIMENSIONS.map(d => ({ key: d.key, label: d.label, value: scored.dimensions?.[d.key] ?? null })),
      coverage: scored.coverage,
      scorecardVersion: scored.scorecardVersion,
      recommendation: scored.recommendation,
      lastUpdated: scored.createdAt.toISOString(),
      historicalScores: history.slice(-8).map(s => ({ score: Math.round(Number(s.score)), date: s.createdAt.toISOString(), rating: s.rating })),
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
    riskLevel: scored && band ? riskLevelFor(band, scored) : "Critical",
    riskFlags: scored?.riskFlags ?? [],
    /** Mobile money figures only — lenders never receive the transactions themselves */
    cashflow: scored?.cashflow ?? null,
    riskFactors: (scored?.reasonCodes ?? []).map(r => ({
      factor: label(r.dimension), impact: r.effect, description: r.text,
      weight: Number(DIMENSIONS.find(d => d.key === r.dimension)?.weight ?? 0) / 100,
    })),
    recommendedCreditLimit: scored && band ? creditLimitFor(band, scored, activeLoans.length) : 0,
    aiInsights: scored?.aiInsights ?? (outcome.scorable ? "" : outcome.reason),
    generatedAt: new Date().toISOString(),
  });
});

export default router;
