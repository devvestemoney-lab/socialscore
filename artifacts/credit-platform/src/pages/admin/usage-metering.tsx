import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { Activity, FileText, Zap, PlusCircle } from 'lucide-react';

const usage = [
  { tenant: 'Zanaco Bank', plan: 'Enterprise', reports: 21404, apiCalls: 388120, quota: 25000, overage: 0 },
  { tenant: 'Stanbic Bank Zambia', plan: 'Enterprise', reports: 18220, apiCalls: 301877, quota: 25000, overage: 0 },
  { tenant: 'Absa Bank Zambia', plan: 'Enterprise', reports: 16875, apiCalls: 288340, quota: 25000, overage: 0 },
  { tenant: 'FNB Zambia', plan: 'Growth', reports: 11208, apiCalls: 194221, quota: 10000, overage: 1208 },
  { tenant: 'MTN Mobile Money', plan: 'Enterprise', reports: 9866, apiCalls: 1204880, quota: 25000, overage: 0 },
  { tenant: 'Bayport Financial', plan: 'Growth', reports: 8341, apiCalls: 122470, quota: 10000, overage: 0 },
  { tenant: 'Airtel Money Zambia', plan: 'Growth', reports: 6112, apiCalls: 884215, quota: 10000, overage: 0 },
  { tenant: 'FINCA Zambia', plan: 'Starter', reports: 2214, apiCalls: 38112, quota: 2500, overage: 0 },
  { tenant: 'Madison Finance', plan: 'Starter', reports: 1876, apiCalls: 29854, quota: 2500, overage: 0 },
];

export default function UsageMetering() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#4F6EF7" title="Usage & Metering"
          subtitle="Billable consumption per tenant for the current billing period (Sep 2026)" />

        <KpiGrid items={[
          { label: 'Reports Metered (MTD)', value: '96,116', icon: FileText, tint: '#4F6EF7' },
          { label: 'API Calls (MTD)', value: '3.45M', icon: Zap, tint: '#10B981' },
          { label: 'Tenants in Overage', value: 1, icon: PlusCircle, tint: '#F59E0B', sub: 'FNB Zambia +1,208 reports' },
          { label: 'Est. Overage Revenue', value: 'K42,280', icon: Activity, tint: '#8B5CF6', sub: '@ K35 per extra report' },
        ]} />

        <Panel title="Consumption by Tenant" subtitle="Quota resets on the 1st of each month">
          <Table head={['Tenant', 'Plan', 'Reports Pulled', 'Included Quota', 'Quota Used', '', 'API Calls', 'Overage']}>
            {usage.map(u => {
              const pct = Math.round((u.reports / u.quota) * 100);
              return (
                <tr key={u.tenant} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{u.tenant}</Td>
                  <Td><Badge tone={u.plan === 'Enterprise' ? 'violet' : u.plan === 'Growth' ? 'blue' : 'slate'}>{u.plan}</Badge></Td>
                  <Td>{u.reports.toLocaleString()}</Td>
                  <Td className="text-muted-foreground">{u.quota.toLocaleString()}</Td>
                  <Td className="font-semibold">{pct}%</Td>
                  <Td className="w-36"><Bar value={Math.min(100, pct)} color={pct > 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981'} /></Td>
                  <Td className="text-muted-foreground">{u.apiCalls.toLocaleString()}</Td>
                  <Td>{u.overage > 0 ? <Badge tone="red">+{u.overage.toLocaleString()}</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
