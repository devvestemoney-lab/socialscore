import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  TrendingDown, AlertTriangle, Eye, CheckCircle2, Wallet, Users2, SlidersHorizontal,
  Loader2, ShieldCheck, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const SEV: Record<string, { tone: string; bar: string; ring: string; bg: string }> = {
  high: { tone: 'red', bar: '#EF4444', ring: 'border-rose-500/30', bg: 'bg-rose-500/5' },
  medium: { tone: 'amber', bar: '#F59E0B', ring: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  low: { tone: 'blue', bar: '#4F6EF7', ring: 'border-blue-500/25', bg: 'bg-blue-500/5' },
  none: { tone: 'green', bar: '#10B981', ring: 'border-slate-200', bg: 'bg-white' },
};
const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'open', tone: 'red' }, acknowledged: { label: 'acknowledged', tone: 'amber' }, resolved: { label: 'resolved', tone: 'green' },
};
const fmt = (m: any) => (m.unit === 'pct' ? `${m.value}%` : m.unit === 'score' ? m.value : m.value.toLocaleString());
const fmtT = (m: any) => (m.unit === 'pct' ? `${m.threshold}%` : m.threshold);
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);

/** Gauge showing the metric against its appetite limit */
function AppetiteGauge({ m }: { m: any }) {
  const pos = Math.min(100, (m.utilisation / 150) * 100);
  const limitPos = (100 / 150) * 100;
  const color = m.breached ? (m.severity === 'high' ? '#EF4444' : '#F59E0B') : m.near ? '#4F6EF7' : '#10B981';
  return (
    <div className="relative h-2 rounded-full bg-slate-100 mt-3">
      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pos}%`, background: color }} />
      <div className="absolute -top-1 bottom-[-4px] w-0.5 bg-gray-400 rounded-full" style={{ left: `${limitPos}%` }} title="Appetite limit" />
    </div>
  );
}

export default function PortfolioAlerts() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/tenant/portfolio-alerts`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function setStatus(m: any, status: string) {
    setSaving(true); setError('');
    const res = await request(`${API}/tenant/portfolio-alerts/${m.key}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note: status === 'resolved' ? note : m.note ?? 'Acknowledged' }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Update failed'); return; }
    setDetail(null); setNote(''); load();
  }

  async function saveThreshold(m: any) {
    setSaving(true); setError('');
    const res = await request(`${API}/tenant/portfolio-alerts/appetite/${m.key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threshold: Number(threshold) }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Update failed'); return; }
    setDetail(null); load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { metrics, alerts, summary } = data;
  const categories = [...new Set(metrics.map((m: any) => m.category))] as string[];
  const m = detail;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={TrendingDown} tint="#F59E0B" title="Portfolio Alerts"
          subtitle="Book-level risk signals measured live against your configured appetite thresholds" />

        <KpiGrid items={[
          { label: 'Appetite Breaches', value: summary.breaches, icon: AlertTriangle, tint: summary.breaches ? '#EF4444' : '#94A3B8', sub: 'limits exceeded' },
          { label: 'On Watch', value: summary.watch, icon: Eye, tint: '#F59E0B', sub: 'within 15% of limit' },
          { label: 'Within Appetite', value: summary.healthy, icon: CheckCircle2, tint: '#10B981' },
          { label: 'Book Outstanding', value: money(summary.totalOutstanding), icon: Wallet, tint: '#4F6EF7', sub: `${summary.borrowers} borrowers` },
          { label: 'Exposure at Risk', value: money(summary.exposureAtRisk), icon: TrendingDown, tint: '#8B5CF6', sub: 'defaulted & written off' },
        ]} />

        {/* Active alerts */}
        <Panel title="Active Alerts" subtitle="Metrics currently outside — or close to — your stated risk appetite" padded>
          <div className="space-y-3">
            {alerts.filter((a: any) => a.status !== 'resolved').map((a: any) => (
              <button key={a.key} onClick={() => { setDetail(a); setNote(a.note ?? ''); setThreshold(String(a.threshold)); setError(''); }}
                className={cn('w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm', SEV[a.severity].ring, SEV[a.severity].bg)}>
                <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  a.breached ? 'bg-white/70' : 'bg-white/70')}>
                  {a.direction === 'max' ? <ArrowUpRight className="w-4 h-4" style={{ color: SEV[a.severity].bar }} />
                    : <ArrowDownRight className="w-4 h-4" style={{ color: SEV[a.severity].bar }} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {a.label} {a.direction === 'max' ? 'rose to' : 'fell to'} <b>{fmt(a)}</b>
                    {a.breached ? ` — ${a.direction === 'max' ? 'above' : 'below'} your ${fmtT(a)} appetite` : ` — approaching your ${fmtT(a)} limit`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  <div className="max-w-md"><AppetiteGauge m={a} /></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={SEV[a.severity].tone}>{a.breached ? a.severity : 'watch'}</Badge>
                  <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                </div>
              </button>
            ))}
            {alerts.filter((a: any) => a.status !== 'resolved').length === 0 && (
              <div className="flex items-center gap-3 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-gray-700">Every monitored metric is comfortably within your risk appetite.</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Full appetite dashboard */}
        {categories.map(cat => (
          <Panel key={cat} title={cat} subtitle="Current position against appetite — click a metric to adjust its limit" padded>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.filter((x: any) => x.category === cat).map((x: any) => (
                <button key={x.key} onClick={() => { setDetail(x); setNote(x.note ?? ''); setThreshold(String(x.threshold)); setError(''); }}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-700">{x.label}</p>
                    <Badge tone={x.breached ? (x.severity === 'high' ? 'red' : 'amber') : x.near ? 'blue' : 'green'}>
                      {x.breached ? 'breach' : x.near ? 'watch' : 'ok'}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-2xl font-display font-bold text-gray-900">{fmt(x)}</p>
                    <p className="text-xs text-muted-foreground">{x.direction === 'max' ? 'limit' : 'floor'} {fmtT(x)}</p>
                  </div>
                  <AppetiteGauge m={x} />
                  <p className="text-[11px] text-gray-400 mt-2 leading-snug">{x.description}</p>
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      {/* metric modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={m ? m.label : ''} subtitle={m ? m.category : undefined}>
        {m && (
          <div className="space-y-5">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

            <div className={cn('p-4 rounded-xl border', SEV[m.severity].ring, SEV[m.severity].bg)}>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-3xl font-display font-extrabold text-gray-900">{fmt(m)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">current · appetite {m.direction === 'max' ? 'limit' : 'floor'} {fmtT(m)}</p>
                </div>
                <Badge tone={m.breached ? (m.severity === 'high' ? 'red' : 'amber') : m.near ? 'blue' : 'green'}>
                  {m.breached ? `${m.severity} breach` : m.near ? 'approaching limit' : 'within appetite'}
                </Badge>
              </div>
              <AppetiteGauge m={m} />
              <p className="text-sm text-gray-700 mt-3">{m.description}</p>
            </div>

            <Field label={`Appetite ${m.direction === 'max' ? 'limit (maximum)' : 'floor (minimum)'}`} hint={m.unit === 'pct' ? '%' : 'score'}>
              <div className="flex gap-2">
                <input type="number" step="0.1" min="0" className={inputCls} value={threshold} onChange={e => setThreshold(e.target.value)} />
                <button onClick={() => saveThreshold(m)} disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-semibold whitespace-nowrap disabled:opacity-50">
                  <SlidersHorizontal className="w-4 h-4 inline mr-1.5" /> Save limit
                </button>
              </div>
            </Field>

            {(m.breached || m.near) && (
              <>
                <Field label="Case note" hint="required to resolve">
                  <textarea rows={2} className={inputCls} value={note} placeholder="What is driving this, and what mitigation is in place?"
                    onChange={e => setNote(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {m.status === 'open' && (
                    <button disabled={saving} onClick={() => setStatus(m, 'acknowledged')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-semibold disabled:opacity-50">
                      <Eye className="w-4 h-4" /> Acknowledge
                    </button>
                  )}
                  <button disabled={saving || !note.trim()} onClick={() => setStatus(m, 'resolved')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Mark Resolved
                  </button>
                  {m.status === 'resolved' && (
                    <button disabled={saving} onClick={() => setStatus(m, 'open')}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold">Reopen</button>
                  )}
                </div>
              </>
            )}
            {m.updatedBy && <p className="text-[11px] text-muted-foreground">Last updated by {m.updatedBy}</p>}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
