import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { BellRing, FileSearch, Wallet, Gauge, AlertTriangle, ClipboardCheck, Scale, CheckCheck } from 'lucide-react';
import { API, ago } from './kit';
import { cn } from '@/lib/utils';

const KIND: Record<string, { icon: any; tint: string }> = {
  inquiry: { icon: FileSearch, tint: '#8B5CF6' }, new_account: { icon: Wallet, tint: '#4F6EF7' },
  score_change: { icon: Gauge, tint: '#14B8A6' }, missed_payment: { icon: AlertTriangle, tint: '#EF4444' },
  dispute_update: { icon: Scale, tint: '#F59E0B' }, consent_change: { icon: ClipboardCheck, tint: '#10B981' },
};
const SEV: Record<string, string> = { critical: 'red', warning: 'amber', info: 'blue' };

export default function CreditAlerts() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('all');

  async function load() {
    const res = await request(`${API}/consumer/alerts`);
    setData(res.ok ? await res.json() : { alerts: [], summary: {} });
  }
  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await request(`${API}/consumer/alerts/${id}/read`, { method: 'PUT' });
    load();
  }
  async function markAll() {
    await request(`${API}/consumer/alerts/read-all`, { method: 'PUT' });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { alerts, summary } = data;
  const shown = filter === 'all' ? alerts : filter === 'unread' ? alerts.filter((a: any) => !a.readAt) : alerts.filter((a: any) => a.severity === filter);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BellRing} tint="#EF4444" title="Credit Alerts"
          subtitle="We tell you whenever something changes on your credit file"
          actions={summary.unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )} />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Unread', value: summary.unread ?? 0, tint: summary.unread ? '#EF4444' : '#94A3B8' },
            { label: 'Needs attention', value: summary.critical ?? 0, tint: summary.critical ? '#F59E0B' : '#94A3B8' },
            { label: 'In the last 30 days', value: summary.last30d ?? 0, tint: '#4F6EF7' },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <p className="text-2xl font-display font-bold" style={{ color: k.tint }}>{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[['all', 'All'], ['unread', 'Unread'], ['critical', 'Needs attention'], ['warning', 'Worth checking'], ['info', 'For your record']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                filter === v ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        <Panel padded>
          <div className="space-y-3">
            {shown.map((a: any) => {
              const meta = KIND[a.kind] ?? { icon: BellRing, tint: '#94A3B8' };
              return (
                <div key={a.id} className={cn('flex items-start gap-4 p-4 rounded-xl border transition-colors',
                  a.readAt ? 'border-slate-200 opacity-60' : a.severity === 'critical' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white hover:bg-slate-50/60')}>
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.tint}1A` }}>
                    <meta.icon className="w-5 h-5" style={{ color: meta.tint }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                      {!a.readAt && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.detail}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">{ago(a.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge tone={SEV[a.severity] ?? 'slate'}>{a.severity === 'critical' ? 'attention' : a.severity}</Badge>
                    {!a.readAt && (
                      <button onClick={() => markRead(a.id)} className="text-xs font-medium text-emerald-700 hover:underline">Mark read</button>
                    )}
                  </div>
                </div>
              );
            })}
            {shown.length === 0 && <p className="text-center text-muted-foreground py-10">Nothing here — we'll let you know if anything changes.</p>}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
