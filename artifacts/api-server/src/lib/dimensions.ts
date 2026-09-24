import type { ConsumerSignal, Loan, ReasonCode } from "@workspace/db";
import { cashflowScore, type CashflowFeatures } from "./mno.js";

/**
 * The scoring dimensions. Six are behavioural — the everyday obligations and
 * money habits a traditional bureau never sees — and the seventh is the
 * traditional credit record itself. Weights are defaults; a scorecard can
 * override them, and the admin weight editor is driven by this list.
 */
export const DIMENSIONS = [
  { key: "credit", label: "Credit", weight: 28,
    description: "Loans, repayment record and defaults reported by lenders",
    consumerHint: "Loans and credit cards you hold, and whether you pay them on time." },
  { key: "payments", label: "Payments", weight: 17,
    description: "Utility, refuse collection and airtime bills paid on schedule",
    consumerHint: "Paying ZESCO, water, garbage collection and airtime advances on time builds this." },
  { key: "housing", label: "Housing", weight: 15,
    description: "Rent payment record and length of tenancy",
    consumerHint: "Paying rent on time counts, even if you have never had a loan." },
  { key: "cashflow", label: "Cash Flow", weight: 15,
    description: "Mobile money income, spending and betting patterns",
    consumerHint: "Steady income and spending within your means help. Heavy betting hurts." },
  { key: "peer", label: "Peer Lending", weight: 12,
    description: "Peer-to-peer, chilimba and village banking loans repaid",
    consumerHint: "Repaying loans from friends, chilimba or village banking groups on time counts." },
  { key: "commerce", label: "Commerce", weight: 7,
    description: "Lay-by, buy-now-pay-later and instalment completion",
    consumerHint: "Finishing lay-bys and instalment plans shows you follow through." },
  { key: "stability", label: "Stability", weight: 6,
    description: "Continuity of employment and place of residence",
    consumerHint: "Staying in the same job or home shows lenders you are settled." },
] as const;

export type DimensionKey = typeof DIMENSIONS[number]["key"];

export const DEFAULT_WEIGHTS: Record<string, number> =
  Object.fromEntries(DIMENSIONS.map(d => [d.key, d.weight]));

/** Bureau score range. Kept in step with the bands used across the portals. */
export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

/** A score is only issued with evidence in at least this many dimensions,
 *  covering at least this share of the scorecard's weight. Below that the
 *  file is too thin to judge and the consumer is reported as unscorable. */
export const MIN_DIMENSIONS = 2;
export const MIN_COVERAGE = 40;

/** A dimension with no evidence scores null rather than zero — an absent
 *  signal is not a bad one, so its weight is shared out among the rest. */
export type DimensionScores = Record<string, number | null>;
/** A dimension's value with the plain-language reason behind it. */
export type Assessment = { value: number; detail: string } | null;

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const isDated = (s: ConsumerSignal) => s.status === "on_time" || s.status === "late" || s.status === "missed";

/** Punctuality over a set of dated obligations, weighted so a miss hurts more than a late payment. */
function punctuality(signals: ConsumerSignal[]) {
  const settled = signals.filter(isDated);
  if (settled.length === 0) return null;
  const points = settled.reduce((sum, s) =>
    sum + (s.status === "on_time" ? 1 : s.status === "late" ? 0.4 : 0), 0);
  return pct(points, settled.length);
}

/** "10 of 12 on time, 1 missed" */
function record(signals: ConsumerSignal[], noun: string) {
  const settled = signals.filter(isDated);
  const onTime = settled.filter(s => s.status === "on_time").length;
  const late = settled.filter(s => s.status === "late").length;
  const missed = settled.filter(s => s.status === "missed").length;
  const tail = [late && `${late} late`, missed && `${missed} missed`].filter(Boolean).join(", ");
  return `${onTime} of ${plural(settled.length, noun)} on time${tail ? `, ${tail}` : ""}`;
}

/** Current tenure in months, scaled so five years is full marks. A tenure
 *  that has ended counts for half — it shows history, not present stability. */
function tenure(signals: ConsumerSignal[]) {
  if (signals.length === 0) return null;
  const months = signals.map(s => (s.months ?? 0) * (s.status === "ended" ? 0.5 : 1));
  return clamp((Math.max(...months) / 60) * 100);
}

function housing(signals: ConsumerSignal[]): Assessment {
  const rent = signals.filter(s => s.dimension === "housing" && s.kind === "rent_payment");
  const tenancy = signals.filter(s => s.dimension === "housing" && s.kind === "residence");
  const paid = punctuality(rent);
  const held = tenure(tenancy);
  if (paid == null && held == null) return null;
  const months = Math.max(0, ...tenancy.map(s => s.months ?? 0));
  if (paid == null) return { value: clamp(held! * 0.6), detail: `${months} months at current address, no rent payments reported.` };
  const detail = `Rent: ${record(rent, "payment")}.`;
  if (held == null) return { value: clamp(paid), detail };
  return { value: clamp(paid * 0.72 + held * 0.28), detail };
}

function payments(signals: ConsumerSignal[]): Assessment {
  const bills = signals.filter(s => s.dimension === "payments");
  const paid = punctuality(bills);
  if (paid == null) return null;
  // Breadth matters: someone reported by three providers is better evidenced than one.
  const sources = new Set(bills.map(s => s.source)).size;
  return {
    value: clamp(paid * 0.92 + Math.min(8, sources * 3)),
    detail: `Bills and advances: ${record(bills, "payment")} across ${plural(sources, "provider")}.`,
  };
}

/** Peer-to-peer and savings-group borrowing. Repayment is what counts; a
 *  run of new peer loans in a short window also signals strain. */
function peer(signals: ConsumerSignal[]): Assessment {
  const repayments = signals.filter(s => s.dimension === "peer");
  const paid = punctuality(repayments);
  if (paid == null) return null;
  const since = Date.now() - 90 * 86_400_000;
  const recent = repayments.filter(s => s.dueDate && new Date(s.dueDate).getTime() >= since).length;
  const frequent = recent > 6;
  return {
    value: clamp(paid - (frequent ? 8 : 0)),
    detail: `Peer loans: ${record(repayments, "repayment")}${frequent ? `, ${recent} due in the last 90 days` : ""}.`,
  };
}

function commerce(signals: ConsumerSignal[]): Assessment {
  const plans = signals.filter(s => s.dimension === "commerce");
  const paid = punctuality(plans);
  if (paid == null) return null;
  const completed = plans.filter(s => s.status === "on_time").length;
  return {
    value: clamp(paid * 0.9 + Math.min(10, completed * 2)),
    detail: `Instalments and lay-bys: ${record(plans, "plan")}.`,
  };
}

function stability(signals: ConsumerSignal[]): Assessment {
  const job = signals.filter(s => s.dimension === "stability" && s.kind === "employment");
  const home = signals.filter(s => s.dimension === "stability" && s.kind === "residence");
  const jobMonths = tenure(job);
  const homeMonths = tenure(home);
  if (jobMonths == null && homeMonths == null) return null;
  const currentJob = job.find(s => s.status === "ongoing");
  const detail = currentJob
    ? `${currentJob.months ?? 0} months in current employment.`
    : `${Math.max(0, ...home.map(s => s.months ?? 0))} months at current residence, no current employment reported.`;
  if (jobMonths == null) return { value: clamp(homeMonths! * 0.7), detail };
  if (homeMonths == null) return { value: clamp(jobMonths * 0.85), detail };
  return { value: clamp(jobMonths * 0.6 + homeMonths * 0.4), detail };
}

/** The traditional bureau record, expressed on the same 0-100 scale as the rest. */
function credit(loans: Loan[], accountAgeMonths: number): Assessment {
  if (loans.length === 0 && accountAgeMonths === 0) return null;
  const defaulted = loans.filter(l => l.status === "defaulted" || l.status === "written_off").length;
  const closed = loans.filter(l => l.status === "closed").length;
  const missed = loans.reduce((sum, l) => sum + l.missedPayments, 0);

  let score = 78;
  score -= missed * 7;
  score -= defaulted * 26;
  score += loans.length > 0 ? (closed / loans.length) * 10 : 0;
  score += clamp((accountAgeMonths / 60) * 12, 0, 12);

  const problems = [missed && plural(missed, "missed payment"), defaulted && plural(defaulted, "default")].filter(Boolean);
  return {
    value: clamp(score),
    detail: `${plural(loans.length, "loan")} on file${problems.length ? ` with ${problems.join(" and ")}` : ", all paid as agreed"}.`,
  };
}

export interface DimensionInput {
  signals: ConsumerSignal[];
  loans: Loan[];
  accountAgeMonths: number;
  cashflow?: CashflowFeatures | null;
}

export function assessDimensions(input: DimensionInput): Record<string, Assessment> {
  const { signals, loans, accountAgeMonths } = input;
  const all: Record<string, Assessment> = {
    credit: credit(loans, accountAgeMonths),
    payments: payments(signals),
    housing: housing(signals),
    cashflow: cashflowScore(input.cashflow ?? null),
    peer: peer(signals),
    commerce: commerce(signals),
    stability: stability(signals),
  };
  return Object.fromEntries(Object.entries(all).map(([k, a]) =>
    [k, a == null ? null : { ...a, value: Math.round(a.value) }]));
}

export function computeDimensions(input: DimensionInput): DimensionScores {
  return Object.fromEntries(Object.entries(assessDimensions(input)).map(([k, a]) => [k, a?.value ?? null]));
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

  const declaredTotal = DIMENSIONS.reduce((a, d) => a + Number(weights[d.key] ?? 0), 0) || 100;
  if (present.length === 0) {
    return { score: SCORE_MIN, coverage: 0, dimensionsWithEvidence: 0, scorable: false, effectiveWeights: {} as Record<string, number> };
  }

  const totalWeight = present.reduce((sum, d) => sum + d.weight, 0);
  const normalised = present.reduce((sum, d) => sum + (d.value * d.weight) / totalWeight, 0);
  const coverage = Math.round((totalWeight / declaredTotal) * 100);

  return {
    score: Math.round(SCORE_MIN + (normalised / 100) * (SCORE_MAX - SCORE_MIN)),
    /** Share of the scorecard's weight that had evidence behind it. */
    coverage,
    dimensionsWithEvidence: present.length,
    /** False when the file is too thin to issue a score at all. */
    scorable: present.length >= MIN_DIMENSIONS && coverage >= MIN_COVERAGE,
    effectiveWeights: Object.fromEntries(
      present.map(d => [d.key, Math.round((d.weight / totalWeight) * 1000) / 10]),
    ),
  };
}

/**
 * The main things pulling the score down and holding it up. A dimension's
 * pull is how far it sits from neutral, scaled by its weight, so a weak
 * heavily-weighted dimension outranks a weak minor one.
 */
export function reasonCodes(assessments: Record<string, Assessment>, weights: Record<string, number>): ReasonCode[] {
  const ranked = DIMENSIONS
    .map(d => ({ key: d.key, a: assessments[d.key], weight: Number(weights[d.key] ?? 0) }))
    .filter((d): d is { key: DimensionKey; a: NonNullable<Assessment>; weight: number } => d.a != null && d.weight > 0);

  const negative = ranked.filter(d => d.a.value < 65)
    .sort((x, y) => (100 - y.a.value) * y.weight - (100 - x.a.value) * x.weight).slice(0, 4)
    .map(d => ({ dimension: d.key, effect: "negative" as const, text: d.a.detail }));
  const positive = ranked.filter(d => d.a.value >= 80)
    .sort((x, y) => y.a.value * y.weight - x.a.value * x.weight).slice(0, 2)
    .map(d => ({ dimension: d.key, effect: "positive" as const, text: d.a.detail }));
  return [...negative, ...positive];
}

/**
 * Probability of default from the score. A placeholder curve — 50% at 500,
 * about 4% at 660 — until the scorecard is calibrated on observed outcomes.
 */
export const probabilityOfDefault = (score: number) =>
  Math.max(0.001, Math.min(0.999, 1 / (1 + Math.exp((score - 500) / 50))));

export const bandFor = (score: number) =>
  score >= 720 ? "A" : score >= 660 ? "B" : score >= 580 ? "C" : score >= 480 ? "D" : "E";

export const ratingFor = (score: number) =>
  score >= 720 ? "Excellent" : score >= 660 ? "Good" : score >= 580 ? "Fair" : score >= 480 ? "Poor" : "Very Poor";
