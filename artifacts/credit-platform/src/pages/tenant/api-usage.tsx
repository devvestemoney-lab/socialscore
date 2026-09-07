import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Zap, Activity, Timer, Ban, Gauge } from 'lucide-react';
import { BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export default function ApiUsage() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/usage/api`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { counts, endpoints, byDay } = data;
  const total = endpoints.reduce((a: number, e: any) => a + e.calls, 0);
  const maxCalls = Math.max(1, ...endpoints.map((e: any) => e.calls));
  const rejectRate = total > 0 ? ((counts.rejected / total) * 100).toFixed(1) : '0.0';

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Zap} tint="#F59E0B" title="API Usage"
          subtitle="Request volumes and latency for your institution this billing period" />

        <KpiGrid items={[
          { label: 'Total Calls', value: total.toLocaleString(), icon: Activity, tint: '#4F6EF7' },
          { label: 'Report Pulls', value: counts.reports.toLocaleString(), icon: Zap, tint: '#10B981' },
          { label: 'Avg Latency', value: `${(counts.avg_ms / 1000).toFixed(1)}s`, icon: Timer, tint: '#F59E0B', sub: `p95 ${(counts.p95_ms / 1000).toFixed(1)}s` },
          { label: 'Rejected Calls', value: counts.rejected, icon: Ban, tint: counts.rejected ? '#EF4444' : '#94A3B8', sub: `${rejectRate}% — mostly consent` },
          { label: 'Rate Limit Headroom', value: '600 rpm', icon: Gauge, tint: '#8B5CF6', sub: 'no throttling recorded' },
        ]} />

        <Panel title="Daily API Calls" padded>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDay} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [v, 'calls']} />
                <RBar dataKey="calls" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {byDay.length === 0 && <p className="text-sm text-muted-foreground text-center -mt-32">No API activity in this period.</p>}
        </Panel>

        <Panel title="Usage by Endpoint">
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
