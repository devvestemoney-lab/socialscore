import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { HeartPulse, Server, Timer, CloudCog, CheckCircle2, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const fmtDur = (start: string, end: string | null) => {
  if (!end) return 'ongoing';
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

export default function SystemHealth() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  async function load() {
    const res = await request(`${API}/admin/system-health`);
    setData(await res.json());
  }
  useEffect(() => {
    load();
    timer.current = setInterval(load, 10_000); // live probes
    return () => clearInterval(timer.current);
  }, []);

  async function resolveIncident(id: string) {
    await request(`${API}/admin/incidents/${id}/resolve`, { method: 'PUT' });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const openIncidents = data.incidents.filter((i: any) => i.status !== 'resolved').length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={HeartPulse} tint="#EF4444" title="System Health"
          subtitle="Live service probes, scoring latency and incident history — refreshes every 10s" />

        <KpiGrid items={[
          { label: 'Platform Status', value: data.status === 'operational' ? 'Operational' : 'Degraded', icon: HeartPulse, tint: data.status === 'operational' ? '#10B981' : '#F59E0B', sub: data.degradedCount ? `${data.degradedCount} service(s) degraded` : 'all services healthy' },
          { label: 'Scoring p95 (14d)', value: `${(data.scoring.p95Ms / 1000).toFixed(1)}s`, icon: Timer, tint: '#4F6EF7', sub: `avg ${(data.scoring.avgMs / 1000).toFixed(1)}s` },
          { label: 'API Process', value: `${data.process.heapUsedMb}MB heap`, icon: Cpu, tint: '#8B5CF6', sub: `${data.process.rssMb}MB RSS · Node ${data.process.node}` },
          { label: 'Open Incidents', value: openIncidents, icon: CloudCog, tint: openIncidents ? '#EF4444' : '#10B981' },
        ]} />

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Service Status" subtitle="Probed live on each refresh" padded>
            <div className="divide-y divide-slate-100">
              {data.services.map((s: any) => (
                <div key={s.name} className="flex items-center gap-3 py-3">
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.state === 'operational' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse')} />
                  <p className="font-medium text-gray-900 flex-1">{s.name}</p>
                  <span className="text-xs text-muted-foreground w-28 text-right">{s.metric}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{s.uptime}</span>
                  <Badge tone={s.state === 'operational' ? 'green' : 'amber'}>{s.state}</Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Report Generation p95 — last 14 days" subtitle="From actual report generation times" padded>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.latencySeries}>
                  <defs>
                    <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip formatter={(v: any) => [`${v}ms`, 'p95']} />
                  <Area type="monotone" dataKey="ms" stroke="#4F6EF7" strokeWidth={2} fill="url(#lat)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Incident History">
          <Table head={['ID', 'Incident', 'Started', 'Duration', 'Impact', 'Status', 'Actions']}>
            {data.incidents.map((i: any) => (
              <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{i.code}</Td>
                <Td className="font-medium text-gray-900">{i.title}</Td>
                <Td className="text-muted-foreground">{new Date(i.startedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {new Date(i.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Td>
                <Td className="text-muted-foreground">{fmtDur(i.startedAt, i.resolvedAt)}</Td>
                <Td><Badge tone={i.impact === 'major' ? 'red' : i.impact === 'minor' ? 'amber' : 'slate'}>{i.impact}</Badge></Td>
                <Td>
                  {i.status === 'resolved'
                    ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>
                    : <Badge tone="amber">{i.status}</Badge>}
                </Td>
                <Td>
                  {i.status !== 'resolved' && (
                    <button onClick={() => resolveIncident(i.id)} className="text-xs font-medium text-emerald-600 hover:underline">Mark Resolved</button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
