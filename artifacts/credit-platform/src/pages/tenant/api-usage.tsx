import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel } from '@/components/admin/page-kit';
import { Zap, Activity, Timer, Gauge } from 'lucide-react';
import { BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const daily = [
  { d: '26', calls: 240 }, { d: '27', calls: 198 }, { d: '28', calls: 305 }, { d: '29', calls: 288 },
  { d: '30', calls: 122 }, { d: '31', calls: 96 }, { d: '01', calls: 384 }, { d: '02', calls: 401 },
  { d: '03', calls: 356 }, { d: '04', calls: 318 },
];

export default function ApiUsage() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Zap} tint="#F59E0B" title="API Usage"
          subtitle="Request volumes against your rate limits" />
        <KpiGrid items={[
          { label: 'Calls (MTD)', value: '5,908', icon: Activity, tint: '#4F6EF7' },
          { label: 'Daily Average', value: 312, icon: Zap, tint: '#F59E0B' },
          { label: 'Peak Rate', value: '214 rpm', icon: Gauge, tint: '#EF4444', sub: 'limit 600 rpm — 36% headroom used' },
          { label: 'Rate-limited Requests', value: 7, icon: Timer, tint: '#8B5CF6', sub: 'this month' },
        ]} />
        <Panel title="Daily API Calls — last 10 days" padded>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [v, 'calls']} />
                <RBar dataKey="calls" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
