import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Activity, FileText, PlusCircle, Wallet, Users2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const planTone: Record<string, string> = { Enterprise: 'violet', Growth: 'blue', Starter: 'slate' };

export default function UsageMetering() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  async function load(period?: string) {
    const res = await request(`${API}/admin/usage${period ? `?period=${period}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  function exportCsv() {
    const rows = [['Tenant', 'Plan', 'Reports', 'Quota', 'Quota used %', 'API calls', 'Seats', 'Overage units', 'Subscription', 'Overage', 'Add-ons', 'Discount', 'Total'],
      ...data.usage.map((u: any) => [u.tenantName, u.planName, u.reports, u.includedReports, u.quotaUsedPct, u.apiCalls, u.seats,
        u.overageUnits, u.subscriptionAmount, u.overageAmount, u.addonsAmount, u.discountAmount, u.total])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `usage-${data.period}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { usage, summary, period, periods } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#4F6EF7" title="Usage & Metering"
          subtitle="Billable consumption per tenant, metered live against plan quotas"
          actions={
            <div className="flex items-center gap-2">
              <select value={period} onChange={e => load(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 outline-none">
                {periods.map((p: string) => <option key={p} value={p}>{fmtPeriod(p)}</option>)}
              </select>
              <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          } />

        <KpiGrid items={[
          { label: 'Reports Metered', value: summary.reports.toLocaleString(), icon: FileText, tint: '#4F6EF7', sub: fmtPeriod(period) },
          { label: 'API Calls', value: summary.apiCalls.toLocaleString(), icon: Activity, tint: '#10B981' },
          { label: 'Tenants in Overage', value: summary.inOverage, icon: PlusCircle, tint: summary.inOverage ? '#F59E0B' : '#94A3B8' },
          { label: 'Overage Revenue', value: money(summary.overageRevenue), icon: Wallet, tint: '#8B5CF6' },
          { label: 'Metered Total', value: money(summary.metered), icon: Users2, tint: '#14B8A6', sub: `${summary.billableTenants} billable tenants` },
        ]} />

        <Panel title="Consumption by Tenant" subtitle="Quotas reset on the 1st of each month · overage billed per report">
          <Table head={['Tenant', 'Plan', 'Reports', 'Quota Used', '', 'API Calls', 'Seats', 'Overage', 'Billable Total']}>
            {usage.map((u: any) => (
              <tr key={u.tenantId} className="hover:bg-slate-50/70 transition-colors">
                <Td>
                  <p className="font-semibold text-gray-900">{u.tenantName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{u.tenantType} · {u.subscriptionStatus}</p>
                </Td>
                <Td><Badge tone={planTone[u.planName] ?? 'slate'}>{u.planName}</Badge></Td>
                <Td>{u.reports.toLocaleString()}<span className="text-muted-foreground text-xs"> / {u.includedReports.toLocaleString()}</span></Td>
                <Td className="font-medium">{u.quotaUsedPct}%</Td>
                <Td className="w-32"><Bar value={Math.min(100, u.quotaUsedPct)} color={u.quotaUsedPct > 100 ? '#EF4444' : u.quotaUsedPct > 80 ? '#F59E0B' : '#10B981'} /></Td>
                <Td className="text-muted-foreground">{u.apiCalls.toLocaleString()}</Td>
                <Td className="text-muted-foreground">{u.seats}</Td>
                <Td>{u.overageUnits > 0 ? <Badge tone="red">+{u.overageUnits.toLocaleString()} · {money(u.overageAmount)}</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                <Td className="font-bold text-gray-900">{money(u.total)}</Td>
              </tr>
            ))}
          </Table>
          {summary.unassigned > 0 && (
            <p className="px-5 py-3 text-xs text-amber-600 border-t border-slate-100">
              ⚠ {summary.unassigned} tenant(s) are not on a pricing plan and cannot be invoiced — assign a plan under Pricing Plans.
            </p>
          )}
        </Panel>
      </div>
    </Layout>
  );
}
