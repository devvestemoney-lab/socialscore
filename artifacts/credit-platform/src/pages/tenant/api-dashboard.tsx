import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Activity, Zap, AlertOctagon, Timer, KeyRound, Gauge } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export default function ApiDashboard() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/api/dashboard`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { summary, byDay, endpoints } = data;
  const maxCalls = Math.max(1, ...endpoints.map((e: any) => e.calls));
  const peak = byDay.reduce((a: any, d: any) => (d.calls > (a?.calls ?? 0) ? d : a), null);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#4F6EF7" title="API Dashboard"
          subtitle="Your institution's API consumption and health this billing period" />

        <KpiGrid items={[
          { label: 'Requests (MTD)', value: summary.callsMtd.toLocaleString(), icon: Activity, tint: '#4F6EF7', sub: `${summary.calls24h} in last 24h` },
          { label: 'Error Rate', value: `${summary.errorRate}%`, icon: AlertOctagon, tint: summary.errorRate > 5 ? '#EF4444' : '#10B981', sub: 'mostly consent refusals' },
          { label: 'Avg Latency', value: `${(summary.avgMs / 1000).toFixed(1)}s`, icon: Timer, tint: '#F59E0B', sub: `p95 ${(summary.p95Ms / 1000).toFixed(1)}s` },
          { label: 'Active Keys', value: summary.activeKeys, icon: KeyRound, tint: '#6366F1' },
          { label: 'Rate Limit', value: `${summary.rateLimit} rpm`, icon: Gauge, tint: '#8B5CF6', sub: peak ? `peak day ${peak.calls} calls` : 'no throttling' },
        ]} />

        <Panel title="Request Volume — last 14 days" subtitle="Successful calls and rejections" padded>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Area type="monotone" dataKey="calls" name="Calls" stroke="#4F6EF7" strokeWidth={2.5} fill="url(#apiGrad)"
                  dot={{ r: 3, fill: '#fff', stroke: '#4F6EF7', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#EF4444" strokeWidth={2} fill="none"
                  dot={{ r: 2.5, fill: '#EF4444' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {byDay.length === 0 && <p className="text-sm text-muted-foreground text-center -mt-32">No API activity in the last 14 days.</p>}
        </Panel>

        <Panel title="Usage by Endpoint (MTD)">
          <Table head={['Endpoint', 'Method', 'Calls', 'Share', 'p95 Latency']}>
            {endpoints.map((e: any) => (
              <tr key={e.path} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-gray-900">{e.path}</Td>
                <Td><Badge tone={e.method === 'GET' ? 'blue' : 'violet'}>{e.method}</Badge></Td>
                <Td>{e.calls.toLocaleString()}</Td>
                <Td className="w-40"><Bar value={(e.calls / maxCalls) * 100} color="#4F6EF7" /></Td>
                <Td className="text-muted-foreground">{e.p95}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
