import type { ConsumerSignal } from "@workspace/db";
import { DIMENSIONS } from "./dimensions.js";

/** Human-readable name for each kind of signal that can be reported. */
export const KIND_LABELS: Record<string, string> = {
  rent_payment: "Rent payment",
  residence: "Residence",
  utility_bill: "Utility bill",
  refuse_collection: "Refuse collection",
  airtime_advance: "Airtime advance",
  mobile_money_loan: "Mobile money loan",
  p2p_loan: "Peer-to-peer loan",
  savings_group_loan: "Chilimba / village banking loan",
  bnpl_instalment: "Buy-now-pay-later instalment",
  lay_by: "Lay-by",
  employment: "Employment",
};

const isDated = (s: ConsumerSignal) => s.status === "on_time" || s.status === "late" || s.status === "missed";

/**
 * Each dimension with the evidence standing behind it, so an analyst can see
 * whether a score rests on real reporting or on a thin file. Cash flow is
 * evidenced by mobile money transactions rather than reported obligations.
 */
export function dimensionEvidence(
  signals: ConsumerSignal[],
  mnoTransactions: number,
  scored: Record<string, number | null>,
  weights: Record<string, number>,
) {
  return DIMENSIONS.map(d => {
    const mine = signals.filter(x => x.dimension === d.key);
    const dated = mine.filter(isDated);
    return {
      key: d.key, label: d.label, description: d.description,
      weight: Number(weights[d.key] ?? d.weight),
      value: scored[d.key] ?? null,
      records: d.key === "cashflow" ? mnoTransactions : mine.length,
      sources: d.key === "cashflow" ? [] : [...new Set(mine.map(x => x.source))].slice(0, 6),
      onTime: dated.filter(x => x.status === "on_time").length,
      late: dated.filter(x => x.status === "late").length,
      missed: dated.filter(x => x.status === "missed").length,
    };
  });
}

/**
 * Everything reported about a person, itemised — every rent payment, every
 * airtime advance, every peer loan repayment — grouped by dimension and summarised by
 * kind, so a lender sees the whole record and not just a number.
 */
export function behaviouralRecord(signals: ConsumerSignal[]) {
  return DIMENSIONS
    .filter(d => d.key !== "credit")
    .map(d => {
      const mine = signals
        .filter(s => s.dimension === d.key)
        .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));

      const kinds = [...new Set(mine.map(s => s.kind))].map(kind => {
        const rows = mine.filter(s => s.kind === kind);
        const dated = rows.filter(isDated);
        const amount = rows.reduce((sum, s) => sum + Number(s.amount ?? 0), 0);
        return {
          kind, label: KIND_LABELS[kind] ?? kind,
          count: rows.length,
          onTime: dated.filter(s => s.status === "on_time").length,
          late: dated.filter(s => s.status === "late").length,
          missed: dated.filter(s => s.status === "missed").length,
          totalAmount: amount > 0 ? amount : null,
          sources: [...new Set(rows.map(s => s.source))],
          longestMonths: rows.some(s => s.months != null) ? Math.max(...rows.map(s => s.months ?? 0)) : null,
        };
      });

      return {
        key: d.key, label: d.label, description: d.description,
        total: mine.length,
        kinds,
        records: mine.map(s => ({
          id: s.id,
          kind: s.kind, kindLabel: KIND_LABELS[s.kind] ?? s.kind,
          source: s.source,
          product: (s.metadata as any)?.product ?? null,
          amount: s.amount == null ? null : Number(s.amount),
          dueDate: s.dueDate, paidDate: s.paidDate,
          status: s.status,
          months: s.months,
        })),
      };
    })
    .filter(d => d.total > 0);
}
