import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  ShieldAlert, AlertTriangle, Activity, Ban, Eye, CheckCircle2, Loader2,
  Zap, Users2, Clock3, Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const RISK: Record<string, { tone: string; dot: string }> = {
  critical: { tone: 'red', dot: 'bg-rose-500' },
  high: { tone: 'amber', dot: 'bg-orange-400' },
  medium: { tone: 'blue', dot: 'bg-blue-400' },
  normal: { tone: 'green', dot: 'bg-emerald-400' },
};
const CASE: Record<string, { label: string; tone: string }> = {
  open: { label: 'open', tone: 'red' }, investigating: { label: 'investigating', tone: 'amber' },
  cleared: { label: 'cleared', tone: 'green' }, escalated: { label: 'escalated', tone: 'red' },
};
const SIGNAL_ICON: Record<string, any> = {
  velocity_hour: Zap, velocity_spike: Activity, repeat_lookups: Repeat,
  consent_failures: Ban, off_hours: Clock3,
};

export default function FraudMonitor() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('flagged');
  const [detail, setDetail] = useState<any>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/admin/fraud`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function setStatus(profile: any, signal: any, status: string) {
    if (['cleared', 'escalated'].includes(status) && !note.trim()) {
      setError('A note is required to clear or escalate a signal.'); return;
    }
    setSaving(true); setError('');
    const res = await request(`${API}/admin/fraud/${profile.tenantId}/${signal.key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note: note.trim() || signal.note || 'Acknowledged' }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Update failed'); return; }
    setDetail(null); setNote(''); load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { profiles, summary } = data;
  const shown = filter === 'all' ? profiles : filter === 'flagged'
    ? profiles.filter((p: any) => p.riskLevel !== 'normal')
    : profiles.filter((p: any) => p.riskLevel === filter);
  const p = detail?.profile;
  const s = detail?.signal;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ShieldAlert} tint="#EF4444" title="Fraud Detection"
          subtitle="Abuse signals detected from real inquiry behaviour across all participating institutions" />

        <KpiGrid items={[
          { label: 'Flagged Institutions', value: summary.flagged, icon: ShieldAlert, tint: summary.flagged ? '#EF4444' : '#10B981',
            sub: summary.critical ? `${summary.critical} critical` : 'none critical' },
          { label: 'High Severity', value: summary.high, icon: AlertTriangle, tint: summary.high ? '#F59E0B' : '#94A3B8' },
          { label: 'Open Signals', value: summary.openSignals, icon: Eye, tint: '#8B5CF6' },
          { label: 'Inquiries Analysed', value: summary.totalInquiries.toLocaleString(), icon: Activity, tint: '#4F6EF7' },
          { label: 'Consent Refusals', value: summary.consentRefusals, icon: Ban, tint: summary.consentRefusals ? '#F59E0B' : '#94A3B8',
            sub: 'blocked at the bureau' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {[['flagged', 'Flagged only'], ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium'], ['all', 'All institutions']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                filter === v ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {shown.map((prof: any) => (
            <div key={prof.tenantId} className={cn('p-5 rounded-xl bg-white border transition-all',
              prof.riskLevel === 'critical' ? 'border-rose-300' : prof.riskLevel === 'high' ? 'border-amber-300' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', RISK[prof.riskLevel].dot,
                    prof.riskLevel === 'critical' && 'animate-pulse')} />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-gray-900 truncate">{prof.tenantName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{prof.tenantType} · {prof.tenantStatus}</p>
                  </div>
                </div>
                <Badge tone={RISK[prof.riskLevel].tone}>{prof.riskLevel}</Badge>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  ['Last hour', prof.metrics.lastHour], ['24 hours', prof.metrics.last24h],
                  ['7 days', prof.metrics.last7d], ['Consumers', prof.metrics.uniqueConsumers],
                ].map(([label, value]: any) => (
                  <div key={label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <p className="text-base font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 mb-3">
                {[
                  ['Repeat lookups', prof.metrics.repeatRatio, 50],
                  ['Consent refusals', prof.metrics.consentFailRate, 15],
                  ['Off-hours activity', prof.metrics.offHoursRate, 40],
                ].map(([label, value, limit]: any) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className={cn('font-semibold', value > limit ? 'text-rose-600' : 'text-gray-500')}>{value}%</span>
                    </div>
                    <Bar value={value} color={value > limit ? '#EF4444' : '#10B981'} />
                  </div>
                ))}
              </div>

              {prof.signals.length > 0 ? (
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  {prof.signals.map((sig: any) => {
                    const Icon = SIGNAL_ICON[sig.key] ?? AlertTriangle;
                    return (
                      <button key={sig.key} onClick={() => { setDetail({ profile: prof, signal: sig }); setNote(sig.note ?? ''); setError(''); }}
                        className={cn('w-full flex items-start gap-2 text-left p-2 -mx-1 rounded-lg transition-colors hover:bg-slate-50',
                          sig.status === 'cleared' && 'opacity-50')}>
                        <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5',
                          sig.severity === 'critical' ? 'text-rose-500' : sig.severity === 'high' ? 'text-amber-500' : 'text-blue-400')} />
                        <span className="text-xs text-gray-700 flex-1">{sig.label}</span>
                        <Badge tone={CASE[sig.status]?.tone ?? 'red'}>{CASE[sig.status]?.label ?? sig.status}</Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="pt-3 border-t border-slate-100 text-xs text-emerald-600 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No abuse signals detected
                </p>
              )}
            </div>
          ))}
          {shown.length === 0 && (
            <div className="lg:col-span-2 p-10 rounded-xl border-2 border-dashed border-slate-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No institutions match this filter — no abuse patterns detected.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={p ? p.tenantName : ''} subtitle={s ? s.label : undefined}>
        {p && s && (
          <div className="space-y-5">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <div className={cn('flex items-start gap-3 p-4 rounded-xl border',
              s.severity === 'critical' ? 'bg-rose-500/5 border-rose-500/25' : s.severity === 'high' ? 'bg-amber-500/5 border-amber-500/25' : 'bg-blue-500/5 border-blue-500/20')}>
              <ShieldAlert className={cn('w-5 h-5 shrink-0 mt-0.5', s.severity === 'critical' ? 'text-rose-500' : s.severity === 'high' ? 'text-amber-500' : 'text-blue-500')} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.severity} severity · currently <b>{CASE[s.status]?.label ?? s.status}</b>
                  {s.updatedBy && ` · last updated by ${s.updatedBy}`}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Inquiry behaviour</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Last hour', p.metrics.lastHour], ['Last 24 hours', p.metrics.last24h], ['Last 7 days', p.metrics.last7d],
                  ['Total inquiries', p.metrics.total], ['Unique consumers', p.metrics.uniqueConsumers], ['Hard inquiries', p.metrics.hard],
                  ['Repeat ratio', `${p.metrics.repeatRatio}%`], ['Consent refusals', `${p.metrics.consentFailRate}%`],
                  ['Velocity vs 30d avg', `${p.metrics.velocitySpike}×`],
                ].map(([label, value]: any) => (
                  <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-base font-bold text-gray-900">{value}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Investigation note" hint="required to clear or escalate">
              <textarea rows={2} className={inputCls} value={note} placeholder="What did the review find?"
                onChange={e => setNote(e.target.value)} />
            </Field>

            <div className="flex flex-wrap gap-2">
              {s.status === 'open' && (
                <button disabled={saving} onClick={() => setStatus(p, s, 'investigating')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-semibold disabled:opacity-50">
                  <Eye className="w-4 h-4" /> Investigate
                </button>
              )}
              <button disabled={saving || !note.trim()} onClick={() => setStatus(p, s, 'cleared')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Clear signal
              </button>
              <button disabled={saving || !note.trim()} onClick={() => setStatus(p, s, 'escalated')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-semibold disabled:opacity-40">
                <AlertTriangle className="w-4 h-4" /> Escalate
              </button>
              <button onClick={() => setDetail(null)} className="ml-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
