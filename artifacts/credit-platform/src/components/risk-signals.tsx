import { Panel } from '@/components/admin/page-kit';
import { AlertTriangle, AlertOctagon, Info, TrendingDown, TrendingUp, Dices } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * What stands behind a score besides the number: risk flags a lender should
 * see regardless of the score, the reasons the score moved, and the mobile
 * money figures behind the cash-flow dimension. Shared by the tenant and
 * super-admin report views and the lookup dashboard.
 */

/** Colour for each scoring dimension, used by every chart and bar that shows them. */
export const DIMENSION_COLORS: Record<string, string> = {
  credit: '#4F6EF7', payments: '#2563EB', housing: '#16A34A', cashflow: '#F59E0B',
  peer: '#EC4899', commerce: '#8B5CF6', stability: '#14B8A6',
};

type Flag = { code: string; severity: 'high' | 'medium' | 'low'; title: string; detail: string };
type Reason = { dimension: string; effect: 'negative' | 'positive'; text: string };

const SEVERITY = {
  high: { icon: AlertOctagon, box: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'High' },
  medium: { icon: AlertTriangle, box: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Medium' },
  low: { icon: Info, box: 'bg-slate-50 border-slate-200', text: 'text-slate-600', label: 'Low' },
} as const;

export function RiskFlags({ flags, compact = false }: { flags: Flag[] | null | undefined; compact?: boolean }) {
  if (!flags?.length) {
    return compact ? null : (
      <p className="text-sm text-muted-foreground">No risk flags on this file.</p>
    );
  }
  return (
    <div className={cn('grid gap-2.5', !compact && 'sm:grid-cols-2')}>
      {flags.map(f => {
        const s = SEVERITY[f.severity] ?? SEVERITY.low;
        return (
          <div key={f.code} className={cn('flex items-start gap-3 p-3.5 rounded-xl border', s.box)}>
            <s.icon className={cn('w-4 h-4 mt-0.5 shrink-0', s.text)} />
            <div className="min-w-0">
              <p className={cn('text-sm font-semibold', s.text)}>
                {f.title} <span className="text-[11px] font-medium uppercase tracking-wider opacity-70 ml-1">{s.label}</span>
              </p>
              <p className="text-xs text-gray-700 mt-0.5">{f.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ReasonList({ reasons }: { reasons: Reason[] | null | undefined }) {
  if (!reasons?.length) return <p className="text-sm text-muted-foreground">No reason codes recorded for this score.</p>;
  return (
    <ul className="space-y-2">
      {reasons.map((r, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          {r.effect === 'negative'
            ? <TrendingDown className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
            : <TrendingUp className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />}
          <span className="text-gray-700">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

const kwacha = (v: number | null | undefined) => (v == null ? '—' : `K${Math.round(v).toLocaleString()}`);
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`);

/** The mobile money figures behind the cash-flow dimension — never the transactions themselves. */
export function CashflowSummary({ cashflow }: { cashflow: Record<string, number | null> | null | undefined }) {
  if (!cashflow) {
    return (
      <Panel title="Cash Flow" subtitle="Mobile money income, spending and betting" padded>
        <p className="text-sm text-muted-foreground text-center py-6">No mobile money data has been reported for this consumer.</p>
      </Panel>
    );
  }
  const betting = cashflow.bettingShare90d ?? 0;
  const prior = cashflow.bettingSharePrior90d;
  const tiles: { label: string; value: string; sub?: string; warn?: boolean }[] = [
    { label: 'Avg monthly inflow', value: kwacha(cashflow.avgMonthlyInflow), sub: `${cashflow.monthsOfData} months of data` },
    { label: 'In / out (90 days)', value: `${kwacha(cashflow.inflow90d)} / ${kwacha(cashflow.outflow90d)}`,
      sub: cashflow.netFlowRatio90d == null ? undefined : cashflow.netFlowRatio90d < 0 ? 'spending more than comes in' : `${pct(cashflow.netFlowRatio90d)} kept`,
      warn: (cashflow.netFlowRatio90d ?? 0) < -0.15 },
    { label: 'Betting share of spend', value: pct(betting),
      sub: prior == null ? undefined : `${pct(prior)} in the 90 days before`, warn: betting >= 0.1 },
    { label: 'Net betting loss (90 days)', value: kwacha(cashflow.bettingNetLoss90d),
      sub: `${cashflow.bettingDays90d ?? 0} days with bets`, warn: (cashflow.bettingNetLoss90d ?? 0) > 0 && betting >= 0.1 },
    { label: 'Income steadiness', value: cashflow.incomeVariation == null ? '—' : cashflow.incomeVariation <= 0.25 ? 'Steady' : cashflow.incomeVariation <= 0.6 ? 'Variable' : 'Irregular',
      warn: (cashflow.incomeVariation ?? 0) > 0.6 },
    { label: 'Digital lenders (90 days)', value: String(cashflow.digitalLenders90d ?? 0), warn: (cashflow.digitalLenders90d ?? 0) >= 3 },
  ];
  return (
    <Panel title={<span className="inline-flex items-center gap-2"><Dices className="w-4 h-4 text-amber-500" /> Cash Flow</span>}
      subtitle="Derived from mobile money over the last 90 days — individual transactions are not shared with lenders">
      <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(t => (
          <div key={t.label} className={cn('p-3.5 rounded-xl border', t.warn ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
            <p className="text-[11px] uppercase tracking-wider text-gray-400">{t.label}</p>
            <p className={cn('text-base font-bold mt-1', t.warn ? 'text-amber-700' : 'text-gray-900')}>{t.value}</p>
            {t.sub && <p className="text-[11px] text-gray-500 mt-0.5">{t.sub}</p>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Flags and reasons together, as the first thing an analyst reads under the score. */
export function ScoreSignals({ flags, reasons }: { flags: Flag[] | null | undefined; reasons: Reason[] | null | undefined }) {
  return (
    <Panel title="Risk Flags & Score Reasons" subtitle="Behaviour to review regardless of the score, and what moved the score" padded>
      <div className="space-y-5">
        <RiskFlags flags={flags} />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5">Why this score</p>
          <ReasonList reasons={reasons} />
        </div>
      </div>
    </Panel>
  );
}
