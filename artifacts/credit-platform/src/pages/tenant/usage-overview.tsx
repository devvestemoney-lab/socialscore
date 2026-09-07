import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Bar } from '@/components/admin/page-kit';
import { Activity, FileText, Zap, Wallet } from 'lucide-react';

const meters = [
  { name: 'Credit reports', used: 1204, quota: 25000, color: '#10B981' },
  { name: 'Score-only calls', used: 3411, quota: 50000, color: '#4F6EF7' },
  { name: 'Identity verifications', used: 902, quota: 10000, color: '#8B5CF6' },
  { name: 'Batch submissions', used: 1, quota: 4, color: '#F59E0B' },
];

export default function UsageOverview() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#4F6EF7" title="Usage Overview"
          subtitle="Consumption against your Enterprise plan — September 2026 billing period" />
        <KpiGrid items={[
          { label: 'Reports Used', value: '1,204', icon: FileText, tint: '#10B981', sub: '4.8% of 25,000 quota' },
          { label: 'API Calls (MTD)', value: '5,908', icon: Zap, tint: '#4F6EF7' },
          { label: 'Projected Month-end', value: '~9,400', icon: Activity, tint: '#F59E0B', sub: 'reports, well within quota' },
          { label: 'Est. Charges (MTD)', value: 'K68,000', icon: Wallet, tint: '#8B5CF6', sub: 'base subscription, no overage' },
        ]} />
        <Panel title="Quota Meters" subtitle="Quotas reset on the 1st of each month" padded>
          <div className="space-y-5">
            {meters.map(m => {
              const pct = Math.round((m.used / m.quota) * 100);
              return (
                <div key={m.name}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{m.name}</span>
                    <span className="text-muted-foreground">{m.used.toLocaleString()} / {m.quota.toLocaleString()} · {pct}%</span>
                  </div>
                  <Bar value={pct} color={pct > 90 ? '#EF4444' : m.color} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
