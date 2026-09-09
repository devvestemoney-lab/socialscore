import type { ConsumerSignal, Loan } from "@workspace/db";

/**
 * The scoring dimensions. Six are behavioural — the everyday obligations a
 * traditional bureau never sees — and the seventh is the traditional credit
 * record itself. Weights are defaults; a scorecard can override them, and the
 * admin weight editor is driven by this list.
 */
export const DIMENSIONS = [
  { key: "credit", label: "Credit", weight: 30,
    description: "Loans, repayment record and defaults reported by lenders",
    consumerHint: "Loans and credit cards you hold, and whether you pay them on time." },
  { key: "payments", label: "Payments", weight: 20,
    description: "Utility bills and mobile money paid on schedule",
    consumerHint: "Bills and mobile money payments made on time build this." },
  { key: "housing", label: "Housing", weight: 15,
    description: "Rent payment record and length of tenancy",
    consumerHint: "Paying rent on time counts, even if you have never had a loan." },
  { key: "commerce", label: "Commerce", weight: 12,
    description: "Lay-by, buy-now-pay-later and instalment completion",
    consumerHint: "Finishing lay-bys and instalment plans shows you follow through." },
  { key: "stability", label: "Stability", weight: 10,
    description: "Continuity of employment and place of residence",
    consumerHint: "Staying in the same job or home shows lenders you are settled." },
  { key: "education", label: "Education", weight: 7,
    description: "School fee commitments met on time",
    consumerHint: "Keeping up with school fees is a strong sign of commitment." },
  { key: "reputation", label: "Reputation", weight: 6,
    description: "Disputes upheld, fraud flags and endorsements",
    consumerHint: "Your standing on the bureau — clean records and endorsements help." },
] as const;

export type DimensionKey = typeof DIMENSIONS[number]["key"];

export const DEFAULT_WEIGHTS: Record<string, number> =
  Object.fromEntries(DIMENSIONS.map(d => [d.key, d.weight]));

/** Bureau score range. Kept in step with the bands used across the portals. */
export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

/** A dimension with no evidence scores null rather than zero — an absent
 *  signal is not a bad one, so its weight is shared out among the rest. */
export type DimensionScores = Record<string, number | null>;

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Punctuality over a set of dated obligations, weighted so a miss hurts more than a late payment. */
function punctuality(signals: ConsumerSignal[]) {
  const settled = signals.filter(s => s.status === "on_time" || s.status === "late" || s.status === "missed");
  if (settled.length === 0) return null;
  const points = settled.reduce((sum, s) =>
    sum + (s.status === "on_time" ? 1 : s.status === "late" ? 0.4 : 0), 0);
  return pct(points, settled.length);
}

/** Longest unbroken tenure in months, scaled so five years is full marks. */
function tenure(signals: ConsumerSignal[]) {
  const months = signals.map(s => s.months ?? 0);
  if (months.length === 0) return null;
  return clamp((Math.max(...months) / 60) * 100);
}

function housing(signals: ConsumerSignal[]) {
  const rent = signals.filter(s => s.dimension === "housing" && s.kind === "rent_payment");
  const tenancy = signals.filter(s => s.dimension === "housing" && s.kind === "residence");
  const paid = punctuality(rent);
  const held = tenure(tenancy);
  if (paid == null && held == null) return null;
  if (paid == null) return clamp(held! * 0.6);
  if (held == null) return clamp(paid);
  return clamp(paid * 0.72 + held * 0.28);
}

function payments(signals: ConsumerSignal[]) {
  const bills = signals.filter(s => s.dimension === "payments");
  const paid = punctuality(bills);
  if (paid == null) return null;
  // Breadth matters: someone reported by three utilities is better evidenced than one.
  const sources = new Set(bills.map(s => s.source)).size;
  return clamp(paid * 0.92 + Math.min(8, sources * 3));
}

function commerce(signals: ConsumerSignal[]) {
  const plans = signals.filter(s => s.dimension === "commerce");
  const paid = punctuality(plans);
  if (paid == null) return null;
  const completed = plans.filter(s => s.status === "on_time").length;
  return clamp(paid * 0.9 + Math.min(10, completed * 2));
}

function stability(signals: ConsumerSignal[]) {
  const job = signals.filter(s => s.dimension === "stability" && s.kind === "employment");
  const home = signals.filter(s => s.dimension === "stability" && s.kind === "residence");
  const jobMonths = tenure(job);
  const homeMonths = tenure(home);
  if (jobMonths == null && homeMonths == null) return null;
  if (jobMonths == null) return clamp(homeMonths! * 0.7);
  if (homeMonths == null) return clamp(jobMonths * 0.85);
  return clamp(jobMonths * 0.6 + homeMonths * 0.4);
}

function education(signals: ConsumerSignal[]) {
  const fees = signals.filter(s => s.dimension === "education");
  return punctuality(fees);
}

function reputation(signals: ConsumerSignal[], opts: { disputesUpheldAgainst: number; fraudFlags: number }) {
  const endorsements = signals.filter(s => s.dimension === "reputation" && s.kind === "endorsement").length;
  if (endorsements === 0 && opts.disputesUpheldAgainst === 0 && opts.fraudFlags === 0) return null;
  let score = 72 + endorsements * 7;
  score -= opts.disputesUpheldAgainst * 12;
  score -= opts.fraudFlags * 25;
  return clamp(score);
}

/** The traditional bureau record, expressed on the same 0-100 scale as the rest. */
function credit(loans: Loan[], accountAgeMonths: number) {
  if (loans.length === 0 && accountAgeMonths === 0) return null;
  const defaulted = loans.filter(l => l.status === "defaulted" || l.status === "written_off").length;
  const closed = loans.filter(l => l.status === "closed").length;
  const missed = loans.reduce((sum, l) => sum + l.missedPayments, 0);

  let score = 78;
  score -= missed * 7;
  score -= defaulted * 26;
  score += loans.length > 0 ? (closed / loans.length) * 10 : 0;
  score += clamp((accountAgeMonths / 60) * 12, 0, 12);
  return clamp(score);
}

export interface DimensionInput {
  signals: ConsumerSignal[];
  loans: Loan[];
  accountAgeMonths: number;
  disputesUpheldAgainst?: number;
  fraudFlags?: number;
}

export function computeDimensions(input: DimensionInput): DimensionScores {
  const { signals, loans, accountAgeMonths } = input;
  const round = (v: number | null) => (v == null ? null : Math.round(v));
  return {
    credit: round(credit(loans, accountAgeMonths)),
    payments: round(payments(signals)),
    housing: round(housing(signals)),
    commerce: round(commerce(signals)),
    stability: round(stability(signals)),
    education: round(education(signals)),
    reputation: round(reputation(signals, {
      disputesUpheldAgainst: input.disputesUpheldAgainst ?? 0,
      fraudFlags: input.fraudFlags ?? 0,
    })),
  };
}

/**
 * Blend the dimensions into one bureau score. Dimensions with no evidence are
 * dropped and their weight is shared across those that do have evidence, so a
 * thin file is scored on what is actually known about the person.
 */
export function blendScore(dimensions: DimensionScores, weights: Record<string, number> = DEFAULT_WEIGHTS) {
  const present: { key: string; value: number; weight: number }[] = [];
  for (const d of DIMENSIONS) {
    const value = dimensions[d.key];
    const weight = Number(weights[d.key] ?? 0);
    if (value != null && weight > 0) present.push({ key: d.key, value, weight });
  }

  if (present.length === 0) return { score: SCORE_MIN, coverage: 0, effectiveWeights: {} as Record<string, number> };

  const totalWeight = present.reduce((sum, d) => sum + d.weight, 0);
  const normalised = present.reduce((sum, d) => sum + (d.value * d.weight) / totalWeight, 0);
  const declaredTotal = Object.values(weights).reduce((a, b) => a + Number(b), 0) || 100;

  return {
    score: Math.round(SCORE_MIN + (normalised / 100) * (SCORE_MAX - SCORE_MIN)),
    /** Share of the scorecard's weight that had evidence behind it. */
    coverage: Math.round((totalWeight / declaredTotal) * 100),
    effectiveWeights: Object.fromEntries(
      present.map(d => [d.key, Math.round((d.weight / totalWeight) * 1000) / 10]),
    ),
  };
}

export const bandFor = (score: number) =>
  score >= 720 ? "A" : score >= 660 ? "B" : score >= 580 ? "C" : score >= 480 ? "D" : "E";

export const ratingFor = (score: number) =>
  score >= 720 ? "Excellent" : score >= 660 ? "Good" : score >= 580 ? "Fair" : score >= 480 ? "Poor" : "Very Poor";
