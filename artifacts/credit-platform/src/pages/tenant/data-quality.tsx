import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Bar, Table, Td, Badge } from '@/components/admin/page-kit';
import { BadgeCheck, CheckCircle2, Crosshair, Clock3 } from 'lucide-react';

const dims = [
  { name: 'Completeness', score: 98.4, note: 'NRC present on 99.7% of records' },
  { name: 'Accuracy', score: 97.9, note: 'Balance reconciliation within tolerance' },
  { name: 'Timeliness', score: 100, note: 'All cycles on time this quarter' },
  { name: 'Consistency', score: 96.8, note: 'Minor status-code mismatches on closed accounts' },
];
const trend = [
  { month: 'Apr', score: 96.1 }, { month: 'May', score: 96.8 }, { month: 'Jun', score: 95.2 },
  { month: 'Jul', score: 97.9 }, { month: 'Aug', score: 98.2 },
];

export default function TenantDataQuality() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BadgeCheck} tint="#10B981" title="Data Quality"
          subtitle="How the bureau scores your institution's submissions" />
        <KpiGrid items={[
          { label: 'Overall Quality Score', value: '98.2%', icon: BadgeCheck, tint: '#10B981', sub: 'rank 2 of 10 contributors' },
          { label: 'Completeness', value: '98.4%', icon: CheckCircle2, tint: '#4F6EF7' },
          { label: 'Accuracy', value: '97.9%', icon: Crosshair, tint: '#6366F1' },
          { label: 'Timeliness', value: '100%', icon: Clock3, tint: '#F59E0B' },
        ]} />
        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Quality Dimensions" padded>
            <div className="space-y-4">
              {dims.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{d.name}</span>
                    <span className="text-muted-foreground">{d.score}%</span>
                  </div>
                  <Bar value={d.score} color={d.score >= 97 ? '#10B981' : '#F59E0B'} />
                  <p className="text-xs text-muted-foreground mt-1">{d.note}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Score Trend">
            <Table head={['Month', 'Overall Score', 'Movement']}>
              {trend.map((t, i) => (
                <tr key={t.month} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{t.month} 2026</Td>
                  <Td>{t.score}%</Td>
                  <Td>{i === 0 ? <Badge tone="slate">—</Badge>
                    : t.score >= trend[i - 1].score ? <Badge tone="green">+{(t.score - trend[i - 1].score).toFixed(1)}</Badge>
                    : <Badge tone="red">{(t.score - trend[i - 1].score).toFixed(1)}</Badge>}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
