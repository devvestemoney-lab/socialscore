import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Bar } from '@/components/admin/page-kit';
import { Gauge, Sigma, Users2, TrendingUp } from 'lucide-react';

const bands = [
  { band: 'A · Excellent', range: '720 – 850', count: 312, color: '#10B981' },
  { band: 'B · Good', range: '660 – 719', count: 401, color: '#4F6EF7' },
  { band: 'C · Fair', range: '580 – 659', count: 356, color: '#F59E0B' },
  { band: 'D · Poor', range: '480 – 579', count: 118, color: '#F97316' },
  { band: 'E · Very Poor', range: '300 – 479', count: 39, color: '#EF4444' },
];

export default function ScoreDistribution() {
  const total = bands.reduce((a, b) => a + b.count, 0);
  const max = Math.max(...bands.map(b => b.count));
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Gauge} tint="#14B8A6" title="Score Distribution"
          subtitle="Score profile of your borrower base vs the bureau average" />
        <KpiGrid items={[
          { label: 'Avg Score (Your Book)', value: 664, icon: Gauge, tint: '#14B8A6', sub: 'bureau avg: 637' },
          { label: 'Median', value: 671, icon: Sigma, tint: '#4F6EF7' },
          { label: 'Scored Borrowers', value: total.toLocaleString(), icon: Users2, tint: '#10B981' },
          { label: 'QoQ Movement', value: '+6 pts', icon: TrendingUp, tint: '#8B5CF6', sub: 'book improving' },
        ]} />
        <Panel title="Distribution by Band" subtitle="Your active borrowers, latest bureau score" padded>
          <div className="space-y-4">
            {bands.map(b => (
              <div key={b.band}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-medium text-gray-900">{b.band} <span className="text-xs text-muted-foreground ml-1">{b.range}</span></span>
                  <span className="text-muted-foreground">{b.count.toLocaleString()} · {Math.round((b.count / total) * 100)}%</span>
                </div>
                <Bar value={(b.count / max) * 100} color={b.color} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-slate-100">
            58% of your book sits in bands A–B, ahead of the bureau-wide 49% — headroom for prime-rate products.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
