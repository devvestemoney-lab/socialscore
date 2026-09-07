import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { TrendingUp, Repeat, Banknote, PlusCircle, Users2, Wallet } from 'lucide-react';
import { BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'short' });
const planTone: Record<string, string> = { Enterprise: 'violet', Growth: 'blue', Starter: 'slate' };

export default function RevenueAnalytics() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/admin/revenue`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { summary, trend, planMix, topTenants } = data;
  const chart = trend.map((t: any) => ({ month: fmtPeriod(t.period), Subscription: Math.round(t.subscription), Usage: Math.round(t.usage) }));
  const maxRevenue = Math.max(1, ...topTenants.map((t: any) => t.revenue));

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={TrendingUp} tint="#10B981" title="Revenue Analytics"
          subtitle="Recurring and usage-based revenue computed from live subscriptions and invoices" />

        <KpiGrid items={[
          { label: 'MRR', value: money(summary.mrr), icon: Repeat, tint: '#4F6EF7', sub: `${summary.subscribers} subscribers` },
          { label: 'ARR (run-rate)', value: money(summary.arr), icon: TrendingUp, tint: '#10B981' },
          { label: 'ARPA', value: money(summary.arpa), icon: Users2, tint: '#8B5CF6', sub: 'average per account' },
          { label: 'Collected', value: money(summary.collected), icon: Banknote, tint: '#14B8A6', sub: `${summary.collectionRate}% collection rate` },
          { label: 'Outstanding', value: money(summary.outstanding), icon: Wallet, tint: summary.outstanding > 0 ? '#F59E0B' : '#94A3B8' },
        ]} />

        <Panel title="Revenue Trend" subtitle={`Subscription vs usage revenue · usage is ${summary.usageShare}% of billings`} padded>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip formatter={(v: any) => money(Number(v))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <RBar dataKey="Subscription" stackId="a" fill="#4F6EF7" />
                <RBar dataKey="Usage" stackId="a" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {summary.growth !== 0 && (
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-100">
              Latest period billings moved <b className={summary.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {summary.growth >= 0 ? '+' : ''}{summary.growth}%</b> against the prior period.
            </p>
          )}
        </Panel>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Revenue by Plan" subtitle="Share of MRR contributed by each tier" padded>
            <div className="space-y-4">
              {planMix.map((p: any) => (
                <div key={p.plan_name}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{p.plan_name}
                      <span className="text-xs text-muted-foreground ml-2">{p.tenants} tenant{p.tenants !== 1 ? 's' : ''}</span></span>
                    <span className="text-muted-foreground">{money(p.mrr)} · {p.share}%</span>
                  </div>
                  <Bar value={p.share} color={p.plan_name === 'Enterprise' ? '#8B5CF6' : p.plan_name === 'Growth' ? '#4F6EF7' : '#94A3B8'} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Top Revenue Tenants" subtitle="Billed to date, including overage">
            <Table head={['Tenant', 'Plan', 'Revenue', '', 'Of which overage']}>
              {topTenants.map((t: any) => (
                <tr key={t.tenant_name} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{t.tenant_name}</Td>
                  <Td><Badge tone={planTone[t.plan_name] ?? 'slate'}>{t.plan_name ?? 'Unassigned'}</Badge></Td>
                  <Td className="font-bold text-gray-900">{money(t.revenue)}</Td>
                  <Td className="w-28"><Bar value={(t.revenue / maxRevenue) * 100} color="#10B981" /></Td>
                  <Td className={t.overage > 0 ? 'text-violet-600 font-medium' : 'text-muted-foreground'}>{t.overage > 0 ? money(t.overage) : '—'}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
