import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { TrendingUp, Banknote, Repeat, PlusCircle } from 'lucide-react';
import { BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const monthly = [
  { m: 'Oct 25', subs: 302, overage: 21 }, { m: 'Nov 25', subs: 315, overage: 26 },
  { m: 'Dec 25', subs: 315, overage: 19 }, { m: 'Jan 26', subs: 338, overage: 24 },
  { m: 'Feb 26', subs: 338, overage: 31 }, { m: 'Mar 26', subs: 352, overage: 28 },
  { m: 'Apr 26', subs: 352, overage: 35 }, { m: 'May 26', subs: 366, overage: 33 },
  { m: 'Jun 26', subs: 380, overage: 41 }, { m: 'Jul 26', subs: 380, overage: 38 },
  { m: 'Aug 26', subs: 394, overage: 47 },
];

const topTenants = [
  { tenant: 'Zanaco Bank', plan: 'Enterprise', mrr: 'K68,000', overage: 'K0', total: 'K68,000', share: '16.5%' },
  { tenant: 'Stanbic Bank Zambia', plan: 'Enterprise', mrr: 'K68,000', overage: 'K0', total: 'K68,000', share: '16.5%' },
  { tenant: 'Absa Bank Zambia', plan: 'Enterprise', mrr: 'K68,000', overage: 'K0', total: 'K68,000', share: '16.5%' },
  { tenant: 'FNB Zambia', plan: 'Growth', mrr: 'K24,000', overage: 'K42,280', total: 'K66,280', share: '16.1%' },
  { tenant: 'MTN Mobile Money', plan: 'Enterprise', mrr: 'K68,000', overage: 'K0', total: 'K68,000', share: '16.5%' },
  { tenant: 'Bayport Financial', plan: 'Growth', mrr: 'K33,500', overage: 'K0', total: 'K33,500', share: '8.1%' },
];

export default function RevenueAnalytics() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={TrendingUp} tint="#10B981" title="Revenue Analytics"
          subtitle="Recurring and usage-based revenue across the tenant base" />

        <KpiGrid items={[
          { label: 'MRR', value: 'K394,000', icon: Repeat, tint: '#4F6EF7', sub: '+3.7% MoM' },
          { label: 'ARR (Run-rate)', value: 'K4.73M', icon: TrendingUp, tint: '#10B981' },
          { label: 'Revenue MTD', value: 'K183,420', icon: Banknote, tint: '#F59E0B', sub: 'Sep 2026' },
          { label: 'Overage Revenue (Aug)', value: 'K47,110', icon: PlusCircle, tint: '#8B5CF6', sub: '10.7% of total' },
        ]} />

        <Panel title="Revenue Trend (K thousands)" subtitle="Subscription vs overage revenue, trailing 11 months" padded>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any, n: any) => [`K${v}k`, n === 'subs' ? 'Subscriptions' : 'Overage']} />
                <RBar dataKey="subs" stackId="a" fill="#4F6EF7" radius={[0, 0, 0, 0]} />
                <RBar dataKey="overage" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Revenue Tenants — August 2026">
          <Table head={['Tenant', 'Plan', 'Subscription', 'Overage & Add-ons', 'Total', 'Share of MRR']}>
            {topTenants.map(t => (
              <tr key={t.tenant} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{t.tenant}</Td>
                <Td><Badge tone={t.plan === 'Enterprise' ? 'violet' : 'blue'}>{t.plan}</Badge></Td>
                <Td>{t.mrr}</Td>
                <Td className={t.overage !== 'K0' ? 'text-violet-600 font-medium' : 'text-muted-foreground'}>{t.overage}</Td>
                <Td className="font-bold text-gray-900">{t.total}</Td>
                <Td className="text-muted-foreground">{t.share}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
