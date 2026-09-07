import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { PieChart as PieIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const SEGMENT_META: Record<string, { range: string; color: string }> = {
  Prime: { range: '720+', color: '#10B981' },
  'Near-Prime': { range: '660 – 719', color: '#4F6EF7' },
  Subprime: { range: '580 – 659', color: '#F59E0B' },
  'Deep Subprime': { range: '< 580', color: '#EF4444' },
};

const DRIVERS: Record<string, string> = {
  improving: 'Sustained repayment and cleared arrears',
  deteriorating: 'New arrears or defaulted tradelines',
};

export default function RiskSegmentation() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/admin/risk-segmentation`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const maxShare = Math.max(1, ...data.segments.map((s: any) => s.share));

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={PieIcon} tint="#F59E0B" title="Risk Segmentation"
          subtitle={`Scored population of ${data.total.toLocaleString()} consumers segmented by risk tier, with live migration flows`} />

        <div className="grid lg:grid-cols-5 gap-6">
          <Panel title="Population by Segment" className="lg:col-span-2" padded>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.segments} dataKey="consumers" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {data.segments.map((s: any) => <Cell key={s.name} fill={SEGMENT_META[s.name].color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [`${v} consumers`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {data.segments.map((s: any) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEGMENT_META[s.name].color }} />
                  <span className="text-gray-700">{s.name}</span>
                  <span className="text-muted-foreground ml-auto">{s.share}%</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Segment Detail" subtitle="Average probability of default from live model output" className="lg:col-span-3">
            <Table head={['Segment', 'Score Range', 'Consumers', 'Share', 'Avg Score', 'Avg PD (12m)']}>
              {data.segments.map((s: any) => (
                <tr key={s.name} className="hover:bg-slate-50/70 transition-colors">
                  <Td>
                    <span className="inline-flex items-center gap-2 font-semibold text-gray-900">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEGMENT_META[s.name].color }} />{s.name}
                    </span>
                  </Td>
                  <Td className="text-muted-foreground">{SEGMENT_META[s.name].range}</Td>
                  <Td>{s.consumers.toLocaleString()}</Td>
                  <Td className="w-40">
                    <div className="flex items-center gap-2">
                      <Bar value={(s.share / maxShare) * 100} color={SEGMENT_META[s.name].color} />
                      <span className="text-xs text-muted-foreground w-8">{s.share}%</span>
                    </div>
                  </Td>
                  <Td>{s.avgScore}</Td>
                  <Td className={s.avgPd > 30 ? 'text-rose-600 font-semibold' : ''}>{s.avgPd}%</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>

        <Panel title="Segment Migration" subtitle="Consumers whose latest score moved them between tiers since the prior scoring run">
          <Table head={['Migration', 'Consumers', 'Direction', 'Primary Driver']}>
            {data.migrations.map((m: any) => (
              <tr key={`${m.from}-${m.to}`} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{m.from} → {m.to}</Td>
                <Td>{m.consumers.toLocaleString()}</Td>
                <Td>
                  {m.direction === 'improving'
                    ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3.5 h-3.5" /> Improving</span>
                    : <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold"><TrendingDown className="w-3.5 h-3.5" /> Deteriorating</span>}
                </Td>
                <Td className="text-muted-foreground">{DRIVERS[m.direction]}</Td>
              </tr>
            ))}
            {data.migrations.length === 0 && <tr><Td colSpan={4} className="text-center text-muted-foreground">No tier movements between the last two scoring runs.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
