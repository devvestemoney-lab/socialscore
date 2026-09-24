import type { MnoCategory, MnoTransaction, RiskFlag } from "@workspace/db";

/**
 * Betting operators, matched against the counterparty name or short code an
 * MNO reports. This list is the whole of how betting is recognised, so keep
 * it current as operators launch and rebrand — a missed operator is counted
 * as ordinary merchant spend.
 */
export const BETTING_OPERATORS = [
  "betway", "bolabet", "gal sport", "galsport", "gsb", "premier bet", "premierbet",
  "betpawa", "1xbet", "castlebet", "betlion", "bet lion", "sportybet", "fortebet",
  "mozzartbet", "betika", "supabets", "hollywoodbets", "bet9ja",
];

const isBetting = (counterparty: string | null | undefined) => {
  const name = (counterparty ?? "").toLowerCase();
  return name.length > 0 && BETTING_OPERATORS.some(op => name.includes(op));
};

/**
 * Sort one transaction into a category from the MNO's own type and the
 * counterparty. Betting is checked first because operators are paid through
 * the ordinary merchant and P2P rails.
 */
export function categorise(t: { mnoType: string; direction: "in" | "out"; counterparty?: string | null }): MnoCategory {
  if (isBetting(t.counterparty)) return t.direction === "out" ? "betting" : "betting_win";
  const type = t.mnoType.toUpperCase().replace(/[\s-]/g, "_");
  switch (type) {
    case "SALARY": case "BULK_PAYMENT": case "PAYROLL": return t.direction === "in" ? "income" : "other";
    case "CASH_IN": case "DEPOSIT": return "cash_in";
    case "CASH_OUT": case "WITHDRAWAL": return "cash_out";
    case "P2P": case "TRANSFER": case "SEND_MONEY": return t.direction === "in" ? "transfer_in" : "transfer_out";
    case "MERCHANT_PAY": case "PAYMENT": return t.direction === "out" ? "merchant" : "other";
    case "BILL_PAY": return "bills";
    case "AIRTIME": case "BUNDLE": return "airtime";
    case "LOAN_DISBURSEMENT": return "loan_disbursement";
    case "LOAN_REPAYMENT": return "loan_repayment";
    case "FEE": case "CHARGE": return "fees";
    default: return "other";
  }
}

export interface CashflowFeatures {
  /** Distinct calendar months with activity in the last twelve */
  monthsOfData: number;
  transactions12m: number;
  /** Money earned or received — excludes loan disbursements and betting wins */
  avgMonthlyInflow: number;
  inflow90d: number;
  outflow90d: number;
  /** (inflow - outflow) / inflow over 90 days; negative means spending more than comes in */
  netFlowRatio90d: number | null;
  bettingOut90d: number;
  bettingNetLoss90d: number;
  /** Betting as a share of all money going out, 0-1 */
  bettingShare90d: number | null;
  bettingSharePrior90d: number | null;
  bettingDays90d: number;
  /** Month-to-month variation in inflow; 0 is perfectly steady */
  incomeVariation: number | null;
  /** Share of days where the wallet closed under K20 */
  lowBalanceShare90d: number | null;
  /** Distinct digital lenders that disbursed a loan in the last 90 days */
  digitalLenders90d: number;
}

const DAY = 86_400_000;
const LOW_BALANCE = 20;
const EARNED: MnoCategory[] = ["income", "transfer_in", "cash_in", "other"];
const round2 = (v: number) => Math.round(v * 100) / 100;

export function cashflowFeatures(txns: MnoTransaction[], now = new Date()): CashflowFeatures | null {
  const yearAgo = now.getTime() - 365 * DAY;
  const rows = txns
    .map(t => ({ ...t, at: new Date(t.occurredAt).getTime(), amt: Number(t.amount) }))
    .filter(t => t.at >= yearAgo && t.at <= now.getTime());
  if (rows.length === 0) return null;

  const within = (from: number, to: number) => rows.filter(t => t.at > now.getTime() - to * DAY && t.at <= now.getTime() - from * DAY);
  const recent = within(0, 90);
  const prior = within(90, 180);
  const sum = (list: typeof rows, pred: (t: typeof rows[number]) => boolean) =>
    list.filter(pred).reduce((a, t) => a + t.amt, 0);

  const monthKey = (at: number) => new Date(at).toISOString().slice(0, 7);
  const months = [...new Set(rows.map(t => monthKey(t.at)))].sort();

  // Earned inflow per month over the last six months with activity
  const lastSix = months.slice(-6);
  const monthlyIn = lastSix.map(m => sum(rows, t => monthKey(t.at) === m && t.direction === "in" && EARNED.includes(t.category)));
  const mean = monthlyIn.reduce((a, b) => a + b, 0) / (monthlyIn.length || 1);
  const sd = Math.sqrt(monthlyIn.reduce((a, v) => a + (v - mean) ** 2, 0) / (monthlyIn.length || 1));

  const inflow90d = sum(recent, t => t.direction === "in" && EARNED.includes(t.category));
  const outflow90d = sum(recent, t => t.direction === "out");
  const bettingOut90d = sum(recent, t => t.category === "betting");
  const bettingWin90d = sum(recent, t => t.category === "betting_win");
  const priorOut = sum(prior, t => t.direction === "out");

  // Closing balance per day, where the MNO reports balances
  const closing = new Map<string, number>();
  for (const t of [...recent].sort((a, b) => a.at - b.at)) {
    if (t.balanceAfter != null) closing.set(new Date(t.at).toISOString().slice(0, 10), Number(t.balanceAfter));
  }

  return {
    monthsOfData: months.length,
    transactions12m: rows.length,
    avgMonthlyInflow: round2(mean),
    inflow90d: round2(inflow90d),
    outflow90d: round2(outflow90d),
    netFlowRatio90d: inflow90d > 0 ? round2((inflow90d - outflow90d) / inflow90d) : null,
    bettingOut90d: round2(bettingOut90d),
    bettingNetLoss90d: round2(Math.max(0, bettingOut90d - bettingWin90d)),
    bettingShare90d: outflow90d > 0 ? round2(bettingOut90d / outflow90d) : null,
    bettingSharePrior90d: priorOut > 0 ? round2(sum(prior, t => t.category === "betting") / priorOut) : null,
    bettingDays90d: new Set(recent.filter(t => t.category === "betting").map(t => new Date(t.at).toISOString().slice(0, 10))).size,
    incomeVariation: mean > 0 && monthlyIn.length >= 3 ? round2(sd / mean) : null,
    lowBalanceShare90d: closing.size > 0
      ? round2([...closing.values()].filter(b => b < LOW_BALANCE).length / closing.size) : null,
    digitalLenders90d: new Set(recent.filter(t => t.category === "loan_disbursement").map(t => (t.counterparty ?? "").toLowerCase())).size,
  };
}

/** Enough history to judge a wallet: three months and thirty transactions. */
export const hasCashflowEvidence = (f: CashflowFeatures | null): f is CashflowFeatures =>
  f != null && f.monthsOfData >= 3 && f.transactions12m >= 30;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pctText = (v: number) => `${Math.round(v * 100)}%`;
const kwacha = (v: number) => `K${Math.round(v).toLocaleString("en-GB")}`;

/**
 * Cash-flow health on the 0-100 dimension scale. Steady income and living
 * within it hold the score up; betting is the heaviest drag, and a rising
 * betting habit costs more than a stable one.
 */
export function cashflowScore(f: CashflowFeatures | null): { value: number; detail: string } | null {
  if (!hasCashflowEvidence(f)) return null;

  let score = 70;
  if (f.incomeVariation != null) score += (0.5 - Math.min(1, f.incomeVariation)) * 30;
  if (f.netFlowRatio90d != null) score += clamp(f.netFlowRatio90d * 40, -20, 10);

  const share = f.bettingShare90d ?? 0;
  if (share > 0.05) score -= Math.min(45, (share - 0.05) * 150);
  const prior = f.bettingSharePrior90d ?? 0;
  if (share >= 0.1 && share >= prior * 1.5 + 0.05) score -= 5;

  if ((f.lowBalanceShare90d ?? 0) > 0.5) score -= 8;
  if (f.digitalLenders90d >= 3) score -= 10;

  const detail = share >= 0.1
    ? `Betting was ${pctText(share)} of mobile money spending over the last 90 days.`
    : f.netFlowRatio90d != null && f.netFlowRatio90d < 0
    ? `Spent more than came in over the last 90 days (${kwacha(f.outflow90d)} out, ${kwacha(f.inflow90d)} in).`
    : `Average monthly inflow of ${kwacha(f.avgMonthlyInflow)} across ${f.monthsOfData} months of mobile money activity.`;

  return { value: Math.round(clamp(score)), detail };
}

/** Behaviour a lender should see regardless of the score, each with the figures behind it. */
export function cashflowFlags(f: CashflowFeatures | null): RiskFlag[] {
  if (!hasCashflowEvidence(f)) return [];
  const flags: RiskFlag[] = [];
  const share = f.bettingShare90d ?? 0;
  const prior = f.bettingSharePrior90d;

  if (share >= 0.1) {
    flags.push({
      code: "BETTING_HEAVY",
      severity: share >= 0.25 ? "high" : "medium",
      title: "Heavy betting",
      detail: `Betting was ${pctText(share)} of mobile money spending over the last 90 days — ${kwacha(f.bettingOut90d)} across ${f.bettingDays90d} days.`,
    });
  }
  if (share >= 0.1 && prior != null && share >= prior * 1.5 + 0.05) {
    flags.push({
      code: "BETTING_RISING",
      severity: "medium",
      title: "Betting is increasing",
      detail: `Betting rose to ${pctText(share)} of spending, from ${pctText(prior)} in the 90 days before.`,
    });
  }
  if (f.avgMonthlyInflow > 0 && f.bettingNetLoss90d >= f.avgMonthlyInflow * 0.5) {
    flags.push({
      code: "BETTING_LOSSES",
      severity: f.bettingNetLoss90d >= f.avgMonthlyInflow ? "high" : "medium",
      title: "Net betting losses",
      detail: `Lost ${kwacha(f.bettingNetLoss90d)} net to betting in 90 days, against average monthly inflow of ${kwacha(f.avgMonthlyInflow)}.`,
    });
  }
  if (f.digitalLenders90d >= 3) {
    flags.push({
      code: "LOAN_STACKING",
      severity: "medium",
      title: "Borrowing from several digital lenders",
      detail: `Took mobile loans from ${f.digitalLenders90d} different lenders in the last 90 days.`,
    });
  }
  if (f.netFlowRatio90d != null && f.netFlowRatio90d < -0.15) {
    flags.push({
      code: "NEGATIVE_CASHFLOW",
      severity: "medium",
      title: "Spending more than comes in",
      detail: `${kwacha(f.outflow90d)} went out against ${kwacha(f.inflow90d)} in over the last 90 days.`,
    });
  }
  if (f.incomeVariation != null && f.incomeVariation > 0.6) {
    flags.push({
      code: "IRREGULAR_INCOME",
      severity: "low",
      title: "Irregular income",
      detail: `Monthly inflow varies widely, around an average of ${kwacha(f.avgMonthlyInflow)}.`,
    });
  }
  if ((f.lowBalanceShare90d ?? 0) > 0.6) {
    flags.push({
      code: "LOW_BALANCE",
      severity: "low",
      title: "Wallet often near empty",
      detail: `The wallet closed under K${LOW_BALANCE} on ${pctText(f.lowBalanceShare90d!)} of days in the last 90.`,
    });
  }
  return flags;
}
