import {
  db, loansTable, consumerSignalsTable, mnoTransactionsTable, creditScoresTable,
  type CreditScore, type RiskFlag,
} from "@workspace/db";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  assessDimensions, blendScore, reasonCodes, probabilityOfDefault,
  ratingFor, bandFor, DIMENSIONS,
} from "./dimensions.js";
import { cashflowFeatures, cashflowFlags } from "./mno.js";
import { activeScorecard } from "./active-scorecard.js";

const DAY = 86_400_000;

/** A high-severity risk flag — heavy betting, repeated peer defaults — holds
 *  the score to the top of band C, so a file carrying one can never read as
 *  Good or Excellent however strong the rest of it is. */
export const HIGH_FLAG_CAP = 659;

export type ScoreOutcome =
  | { scorable: true; score: CreditScore; band: string }
  | { scorable: false; reason: string; coverage: number; dimensionsWithEvidence: number };

/** A missed peer repayment is worth a lender's attention on its own. */
function peerFlags(signals: { dimension: string; status: string; dueDate: string | null; source: string }[]): RiskFlag[] {
  const yearAgo = Date.now() - 365 * DAY;
  const missed = signals.filter(s => s.dimension === "peer" && s.status === "missed"
    && s.dueDate && new Date(s.dueDate).getTime() >= yearAgo);
  if (missed.length === 0) return [];
  return [{
    code: "PEER_DEFAULT",
    severity: missed.length >= 2 ? "high" : "medium",
    title: "Missed peer loan repayment",
    detail: `${missed.length} peer or savings-group repayment${missed.length === 1 ? "" : "s"} missed in the last 12 months (${[...new Set(missed.map(s => s.source))].join(", ")}).`,
  }];
}

/**
 * Score one consumer from everything on file right now — lender tradelines,
 * reported obligations and mobile money — and record the result. A new row is
 * only written when the outcome has changed, so repeated pulls don't flood
 * the score history.
 */
export async function scoreConsumer(customerId: string): Promise<ScoreOutcome> {
  const [loans, signals, txns, card, [latest]] = await Promise.all([
    db.select().from(loansTable).where(eq(loansTable.customerId, customerId)),
    db.select().from(consumerSignalsTable).where(eq(consumerSignalsTable.customerId, customerId)),
    db.select().from(mnoTransactionsTable).where(and(
      eq(mnoTransactionsTable.customerId, customerId),
      gte(mnoTransactionsTable.occurredAt, new Date(Date.now() - 365 * DAY)),
    )),
    activeScorecard(),
    db.select().from(creditScoresTable).where(eq(creditScoresTable.customerId, customerId))
      .orderBy(desc(creditScoresTable.createdAt)).limit(1),
  ]);

  const accountAgeMonths = loans.length
    ? Math.round((Date.now() - Math.min(...loans.map(l => new Date(l.disbursedAt ?? l.createdAt).getTime()))) / (30 * DAY))
    : 0;
  const features = cashflowFeatures(txns);
  const assessments = assessDimensions({ signals, loans, accountAgeMonths, cashflow: features });
  const dimensions = Object.fromEntries(Object.entries(assessments).map(([k, a]) => [k, a?.value ?? null]));
  const blend = blendScore(dimensions, card.weights);

  if (!blend.scorable) {
    return {
      scorable: false,
      reason: `Not enough reported history to score — evidence in ${blend.dimensionsWithEvidence} of ${DIMENSIONS.length} dimensions, covering ${blend.coverage}% of the scorecard.`,
      coverage: blend.coverage,
      dimensionsWithEvidence: blend.dimensionsWithEvidence,
    };
  }

  const riskFlags = [...cashflowFlags(features), ...peerFlags(signals)];
  const reasons = reasonCodes(assessments, card.weights);
  const high = riskFlags.filter(f => f.severity === "high");
  const capped = high.length > 0 && blend.score > HIGH_FLAG_CAP;
  const score = capped ? HIGH_FLAG_CAP : blend.score;
  const { coverage } = blend;
  if (capped) {
    reasons.unshift({
      dimension: "flags", effect: "negative",
      text: `Score held at ${HIGH_FLAG_CAP} (from ${blend.score}) because of: ${high.map(f => f.title.toLowerCase()).join(", ")}.`,
    });
  }

  // Compared field by field: jsonb reorders object keys, so the stored flags
  // never stringify the same as freshly built ones
  const flagKey = (flags: RiskFlag[] | null) =>
    (flags ?? []).map(f => `${f.code}|${f.severity}|${f.detail}`).join("\n");
  const unchanged = latest
    && Math.round(Number(latest.score)) === score
    && latest.scorecardVersion === card.version
    && flagKey(latest.riskFlags) === flagKey(riskFlags);
  if (unchanged) return { scorable: true, score: latest, band: bandFor(score) };

  const [row] = await db.insert(creditScoresTable).values({
    customerId,
    score: String(score),
    rating: ratingFor(score) as CreditScore["rating"],
    probabilityOfDefault: probabilityOfDefault(score).toFixed(4),
    dimensions,
    coverage,
    scorecardVersion: card.version,
    reasonCodes: reasons,
    riskFlags,
    cashflow: features ? { ...features } : null,
    // Legacy five-factor shape, still read by older screens
    scoreBreakdown: {
      repaymentHistory: dimensions.credit ?? 0,
      loanDefaults: dimensions.credit ?? 0,
      transactionPatterns: dimensions.cashflow ?? 0,
      mobileMoney: dimensions.payments ?? 0,
      accountAge: dimensions.stability ?? 0,
    },
    recommendation: high.length > 0 && score >= 580
      ? "Refer — score is acceptable but high-severity risk flags need review."
      : score >= 660
      ? "Approve — strong across the dimensions with evidence behind them."
      : score >= 580
      ? "Consider — mixed record. Conservative limit recommended."
      : "Refer — weak record across the scoring dimensions.",
    aiInsights: `Scored on ${coverage}% weight coverage using ${card.version}.${riskFlags.length ? ` ${riskFlags.length} risk flag${riskFlags.length === 1 ? "" : "s"} raised.` : ""}`,
  }).returning();

  return { scorable: true, score: row, band: bandFor(score) };
}
