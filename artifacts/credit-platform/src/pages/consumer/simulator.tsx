import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Bar, Toggle } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Sparkles, TrendingUp, TrendingDown, Loader2, Info, RotateCcw } from 'lucide-react';
import { API, BAND_COLOR, DIMENSION_META } from './kit';
import { cn } from '@/lib/utils';

const EMPTY = {
  settleArrears: false, payDownPct: 0, monthsOnTime: 0,
  payRentOnTime: 0, payBillsOnTime: 0, finishInstalments: false, stayInJob: 0,
  newLoan: false, closeOldest: false, extraInquiries: 0,
};

export default function ScoreSimulator() {
  const { request } = useAuth();
  const [form, setForm] = useState<any>(EMPTY);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  async function run() {
    setBusy(true); setError('');
    const res = await request(`${API}/consumer/simulate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Could not run the simulation'); return; }
    setResult(body);
  }

  const changed = JSON.stringify(form) !== JSON.stringify(EMPTY);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Sparkles} tint="#8B5CF6" title="Score Simulator"
          subtitle="See how everyday decisions could move your credit score — nothing here changes your real file" />

        {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

        <div className="grid lg:grid-cols-5 gap-6">
          <Panel title="What if I…" className="lg:col-span-3" padded>
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Clear all my arrears</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Bring every account that is behind up to date</p>
                </div>
                <Toggle on={form.settleArrears} onChange={v => set({ settleArrears: v })} />
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Pay down my balances</p>
                  <span className="text-sm font-bold text-emerald-600">{form.payDownPct}%</span>
                </div>
                <input type="range" min={0} max={100} step={10} value={form.payDownPct}
                  onChange={e => set({ payDownPct: Number(e.target.value) })} className="w-full accent-emerald-600" />
                <p className="text-xs text-muted-foreground mt-1">Reduce what you currently owe by this much</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Keep paying on time for</p>
                  <span className="text-sm font-bold text-emerald-600">{form.monthsOnTime} month{form.monthsOnTime !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={0} max={12} value={form.monthsOnTime}
                  onChange={e => set({ monthsOnTime: Number(e.target.value) })} className="w-full accent-emerald-600" />
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 pt-2">
                Beyond loans — everyday behaviour that counts
              </p>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Pay my rent on time for</p>
                  <span className="text-sm font-bold text-emerald-600">{form.payRentOnTime} month{form.payRentOnTime !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={0} max={12} value={form.payRentOnTime}
                  onChange={e => set({ payRentOnTime: Number(e.target.value) })} className="w-full accent-emerald-600" />
                <p className="text-xs text-muted-foreground mt-1">Rent counts towards your Housing dimension</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Pay my bills on time for</p>
                  <span className="text-sm font-bold text-emerald-600">{form.payBillsOnTime} month{form.payBillsOnTime !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={0} max={12} value={form.payBillsOnTime}
                  onChange={e => set({ payBillsOnTime: Number(e.target.value) })} className="w-full accent-emerald-600" />
                <p className="text-xs text-muted-foreground mt-1">ZESCO, water and airtime build your Payments dimension</p>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Finish my lay-by or instalment plan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Completing what you started builds Commerce</p>
                </div>
                <Toggle on={form.finishInstalments} onChange={v => set({ finishInstalments: v })} />
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Stay in the same job for</p>
                  <span className="text-sm font-bold text-emerald-600">{form.stayInJob} more month{form.stayInJob !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={0} max={12} value={form.stayInJob}
                  onChange={e => set({ stayInJob: Number(e.target.value) })} className="w-full accent-emerald-600" />
                <p className="text-xs text-muted-foreground mt-1">Staying settled builds your Stability dimension</p>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 pt-2">Things that could hurt</p>

              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Take out a new loan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Opening a facility shortens your average account age</p>
                </div>
                <Toggle on={form.newLoan} onChange={v => set({ newLoan: v })} />
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Close my oldest account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Long-standing accounts are valuable history</p>
                </div>
                <Toggle on={form.closeOldest} onChange={v => set({ closeOldest: v })} />
              </div>

              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Apply to more lenders</p>
                  <span className="text-sm font-bold text-rose-600">{form.extraInquiries} application{form.extraInquiries !== 1 ? 's' : ''}</span>
                </div>
                <input type="range" min={0} max={6} value={form.extraInquiries}
                  onChange={e => set({ extraInquiries: Number(e.target.value) })} className="w-full accent-rose-500" />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => { setForm(EMPTY); setResult(null); }} disabled={!changed}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50 disabled:opacity-40">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button onClick={run} disabled={busy || !changed}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Run simulation
              </button>
            </div>
          </Panel>

          <div className="lg:col-span-2 space-y-6">
            <Panel title="Projected outcome" padded>
              {result ? (
                <>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400">Today</p>
                      <p className="text-3xl font-display font-extrabold text-gray-900 mt-1">{result.current.score}</p>
                      <Badge tone="slate">{result.current.rating}</Badge>
                    </div>
                    <div className={cn('flex flex-col items-center', result.change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {result.change >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                      <p className="text-lg font-bold mt-1">{result.change >= 0 ? '+' : ''}{result.change}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400">Could be</p>
                      <p className="text-3xl font-display font-extrabold mt-1" style={{ color: BAND_COLOR[result.projected.band] }}>{result.projected.score}</p>
                      <Badge tone={result.projected.band === 'A' ? 'green' : result.projected.band === 'B' ? 'blue' : 'amber'}>{result.projected.rating}</Badge>
                    </div>
                  </div>
                  {result.notes.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                      {result.notes.map((n: string, i: number) => (
                        <p key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" /> {n}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  Choose some changes on the left and run the simulation to see the effect.
                </p>
              )}
            </Panel>

            {result && (
              <Panel title="Dimension by dimension" padded>
                <div className="space-y-3.5">
                  {result.breakdown.map((b: any) => {
                    const unscored = b.before == null;
                    const delta = unscored ? 0 : b.after - b.before;
                    return (
                      <div key={b.key}>
                        <div className="flex items-baseline justify-between mb-1.5 text-sm">
                          <span className={cn('font-medium', unscored ? 'text-gray-400' : 'text-gray-900')}>
                            {b.label ?? DIMENSION_META[b.key]?.label ?? b.key}
                          </span>
                          <span className={cn('text-xs font-bold',
                            unscored ? 'text-gray-300' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-gray-400')}>
                            {unscored ? 'not reported' : `${delta > 0 ? '+' : ''}${delta || '—'}`}
                          </span>
                        </div>
                        {!unscored && (
                          <Bar value={b.after} color={delta > 0 ? '#10B981' : delta < 0 ? '#EF4444' : '#94A3B8'} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </div>
        </div>

        <Panel padded>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            This is an estimate based on the bureau's scoring model and your current file. Your real score also depends on
            what lenders report in future, so treat the result as guidance rather than a promise.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
