import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { PieChart, TrendingUp, TrendingDown } from 'lucide-react';

const segments = [
  { name: 'Prime', share: 25, count: 312, color: '#10B981', pd: '1.1%', action: 'Retention & up-sell' },
  { name: 'Near-Prime', share: 33, count: 401, color: '#4F6EF7', pd: '3.2%', action: 'Standard terms' },
  { name: 'Subprime', share: 29, count: 356, color: '#F59E0B', pd: '8.1%', action: 'Enhanced monitoring' },
  { name: 'Deep Subprime', share: 13, count: 157, color: '#EF4444', pd: '21.4%', action: 'Manual review only' },
];
const moves = [
  { from: 'Subprime → Near-Prime', n: 24, dir: 'up' },
  { from: 'Near-Prime → Prime', n: 15, dir: 'up' },
  { from: 'Near-Prime → Subprime', n: 11, dir: 'down' },
  { from: 'Subprime → Deep Subprime', n: 6, dir: 'down' },
];

export default function TenantRiskSegmentation() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={PieChart} tint="#F59E0B" title="Risk Segmentation"
          subtitle="Your borrower base segmented by bureau risk tier" />
        <Panel title="Segments" subtitle="Suggested treatment per tier">
          <Table head={['Segment', 'Borrowers', 'Share', '', 'Avg PD (12m)', 'Suggested Treatment']}>
            {segments.map(s => (
              <tr key={s.name} className="hover:bg-slate-50/70 transition-colors">
                <Td><span className="inline-flex items-center gap-2 font-semibold text-gray-900"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span></Td>
                <Td>{s.count.toLocaleString()}</Td>
                <Td className="font-medium">{s.share}%</Td>
                <Td className="w-40"><Bar value={s.share * 3} color={s.color} /></Td>
                <Td className={Number(s.pd.replace('%','')) > 15 ? 'text-rose-600 font-semibold' : ''}>{s.pd}</Td>
                <Td className="text-muted-foreground">{s.action}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Tier Migration — this quarter">
          <Table head={['Movement', 'Borrowers', 'Direction']}>
            {moves.map(m => (
              <tr key={m.from} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{m.from}</Td>
                <Td>{m.n}</Td>
                <Td>{m.dir === 'up'
                  ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><TrendingUp className="w-3.5 h-3.5" /> Improving</span>
                  : <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold"><TrendingDown className="w-3.5 h-3.5" /> Deteriorating</span>}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
