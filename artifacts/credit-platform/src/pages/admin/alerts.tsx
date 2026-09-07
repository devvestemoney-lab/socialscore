import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Bell, Siren, Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const sevMeta: Record<string, { badge: string; dot: string }> = {
  critical: { badge: 'red', dot: 'bg-rose-500' },
  high: { badge: 'amber', dot: 'bg-orange-400' },
  medium: { badge: 'blue', dot: 'bg-blue-400' },
  low: { badge: 'slate', dot: 'bg-slate-400' },
};
const statusTone: Record<string, string> = { open: 'red', acknowledged: 'amber', resolved: 'green' };

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};

export default function AlertCenter() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [sev, setSev] = useState('all');

  async function load(f = sev) {
    const res = await request(`${API}/admin/alerts${f !== 'all' ? `?severity=${f}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load('all'); }, []);
  const setF = (f: string) => { setSev(f); load(f); };

  async function setStatus(id: string, status: string) {
    await request(`${API}/admin/alerts/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { alerts, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Bell} tint="#EF4444" title="Alerts"
          subtitle="Central alert stream — automated detections across risk, data, fraud and operations" />

        <KpiGrid items={[
          { label: 'Open Alerts', value: summary.open, icon: Siren, tint: '#EF4444', sub: summary.critical ? `${summary.critical} critical` : 'no critical alerts' },
          { label: 'Acknowledged', value: summary.acknowledged, icon: Eye, tint: '#F59E0B' },
          { label: 'Resolved (7d)', value: summary.resolved7d, icon: CheckCircle2, tint: '#10B981' },
          { label: 'Mean Time to Resolve', value: `${summary.mttrHours}h`, icon: Bell, tint: '#4F6EF7' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button key={f} onClick={() => setF(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                sev === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
              {f}
            </button>
          ))}
        </div>

        <Panel title="Alert Stream" subtitle="Detections re-scan live platform state on every refresh" padded>
          <div className="space-y-3">
            {alerts.map((a: any) => (
              <div key={a.id} className={cn('flex items-start gap-3 p-4 rounded-xl border border-slate-200 transition-colors',
                a.status === 'resolved' ? 'opacity-55' : 'hover:bg-slate-50/70')}>
                <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', sevMeta[a.severity].dot,
                  a.status === 'open' && a.severity === 'critical' && 'animate-pulse')} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.source} · {a.scope} · {timeAgo(a.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={sevMeta[a.severity].badge}>{a.severity}</Badge>
                  <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                  {a.status === 'open' && (
                    <button onClick={() => setStatus(a.id, 'acknowledged')} className="text-xs font-medium text-amber-600 hover:underline">Acknowledge</button>
                  )}
                  {a.status !== 'resolved' && (
                    <button onClick={() => setStatus(a.id, 'resolved')} className="text-xs font-medium text-emerald-600 hover:underline">Resolve</button>
                  )}
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No alerts for this filter.</p>}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
