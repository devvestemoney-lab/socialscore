import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  Activity, FileText, PlusCircle, Wallet, TrendingUp, Download, ArrowLeft,
  AlertTriangle, TrendingDown, CalendarClock, Receipt, Users2, Gauge,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const planTone: Record<string, string> = { Enterprise: 'violet', Growth: 'blue', Starter: 'slate' };
const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red', unscored: 'slate' };
const RISK: Record<string, { label: string; tone: string }> = {
  over: { label: 'over quota', tone: 'red' },
  at_risk: { label: 'nearing quota', tone: 'amber' },
  under_utilised: { label: 'under-utilised', tone: 'blue' },
  healthy: { label: 'on track', tone: 'green' },
  unassigned: { label: 'no plan', tone: 'slate' },
};

/* ═══════════════ Tenant consumption detail ═══════════════ */

function TenantUsage({ tenantId, period, onBack }: { tenantId: string; period: string; onBack: () => void }) {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/admin/usage/${tenantId}?period=${period}`);
      setData(await res.json());
    })();
  }, [tenantId, period]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  const { usage: u, daily, byPurpose, byBand, invoice, lifetime } = data;
  const maxPurpose = Math.max(1, ...byPurpose.map((p: any) => p.n));
  const maxBand = Math.max(1, ...byBand.map((b: any) => b.n));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-gray-600"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-gray-900">{u.tenantName}</h1>
              <Badge tone={planTone[u.planName] ?? 'slate'}>{u.planName}</Badge>
              <Badge tone={u.subscriptionStatus === 'active' ? 'green' : 'amber'}>{u.subscriptionStatus.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Consumption for {fmtPeriod(period)} · {u.includedReports.toLocaleString()} reports included ·
              overage {money(u.overageRate)} per report
            </p>
          </div>
        </div>
      </div>

      <KpiGrid items={[
        { label: 'Reports Metered', value: u.reports.toLocaleString(), icon: FileText, tint: '#10B981', sub: `${u.quotaUsedPct}% of quota` },
        { label: 'API Calls', value: u.apiCalls.toLocaleString(), icon: Activity, tint: '#4F6EF7' },
        { label: 'Overage', value: u.overageUnits > 0 ? `${u.overageUnits.toLocaleString()} · ${money(u.overageAmount)}` : '—',
          icon: PlusCircle, tint: u.overageUnits > 0 ? '#EF4444' : '#94A3B8' },
        { label: 'Billable This Period', value: money(u.total), icon: Wallet, tint: '#8B5CF6' },
        { label: 'Lifetime Billed', value: money(lifetime.total), icon: Receipt, tint: '#14B8A6', sub: `${lifetime.invoices} invoice(s)` },
      ]} />

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Daily Report Volume" className="lg:col-span-2" padded>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="tuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [v, 'reports']} />
                <Area type="monotone" dataKey="reports" stroke="#4F6EF7" strokeWidth={2.5} fill="url(#tuGrad)"
                  dot={{ r: 3, fill: '#fff', stroke: '#4F6EF7', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {daily.length === 0 && <p className="text-sm text-muted-foreground text-center -mt-32">No reports pulled in this period.</p>}
        </Panel>

        <Panel title="Charge Breakdown" padded>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{u.planName} subscription</span><b className="text-gray-900">{money(u.subscriptionAmount)}</b></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overage</span>
              <b className={u.overageAmount > 0 ? 'text-violet-600' : 'text-gray-400'}>{u.overageAmount > 0 ? money(u.overageAmount) : '—'}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Add-ons {u.addons.length > 0 && <span className="text-xs">({u.addons.join(', ')})</span>}</span>
              <b className={u.addonsAmount > 0 ? 'text-gray-900' : 'text-gray-400'}>{u.addonsAmount > 0 ? money(u.addonsAmount) : '—'}</b>
            </div>
            {u.discountAmount > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Contract discount</span><b className="text-emerald-600">−{money(u.discountAmount)}</b></div>
            )}
            <div className="flex justify-between pt-3 mt-1 border-t border-slate-200">
              <span className="font-semibold text-gray-900">Billable total</span>
              <span className="text-lg font-display font-bold text-gray-900">{money(u.total)}</span>
            </div>
          </div>
          {invoice && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invoice {invoice.reference}</span>
              <Badge tone={invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'blue'}>{invoice.status}</Badge>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Reports by Stated Purpose" subtitle="What they are using the bureau for" padded>
          <div className="space-y-3.5">
            {byPurpose.map((p: any) => (
              <div key={p.purpose}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-medium text-gray-900 truncate pr-3">{p.purpose}</span>
                  <span className="text-muted-foreground shrink-0">{p.n}</span>
                </div>
                <Bar value={(p.n / maxPurpose) * 100} color="#4F6EF7" />
              </div>
            ))}
            {byPurpose.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No reports this period.</p>}
          </div>
        </Panel>
        <Panel title="Score Bands Assessed" subtitle="Risk profile of the consumers they pulled" padded>
          <div className="space-y-3.5">
            {byBand.map((b: any) => (
              <div key={b.band}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <Badge tone={bandTone[b.band] ?? 'slate'}>{b.band}</Badge>
                  <span className="text-muted-foreground">{b.n}</span>
                </div>
                <Bar value={(b.n / maxBand) * 100} color={b.band === 'A' ? '#10B981' : b.band === 'B' ? '#4F6EF7' : b.band === 'C' ? '#F59E0B' : b.band === 'unscored' ? '#94A3B8' : '#EF4444'} />
              </div>
            ))}
            {byBand.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No reports this period.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════ Metering console ═══════════════ */

export default function UsageMetering() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [risk, setRisk] = useState('all');

  async function load(period?: string) {
    const res = await request(`${API}/admin/usage${period ? `?period=${period}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  function exportCsv() {
    const rows = [['Tenant', 'Plan', 'Reports', 'Quota', 'Quota used %', 'Projected reports', 'API calls', 'Seats', 'Overage units', 'Overage', 'Billable total', 'Projected total', 'Risk'],
      ...data.usage.map((u: any) => [u.tenantName, u.planName, u.reports, u.includedReports, u.quotaUsedPct, u.projectedReports,
        u.apiCalls, u.seats, u.overageUnits, u.overageAmount, u.total, u.projectedTotal, u.risk])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `usage-${data.period}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (openId && data) return <Layout><TenantUsage tenantId={openId} period={data.period} onBack={() => setOpenId(null)} /></Layout>;
  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { usage, summary, period, periods, trend } = data;
  const shown = risk === 'all' ? usage : usage.filter((u: any) => u.risk === risk);
  const progress = Math.round((summary.daysElapsed / summary.daysInMonth) * 100);

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
          { label: 'Reports Metered', value: summary.reports.toLocaleString(), icon: FileText, tint: '#4F6EF7',
            sub: summary.isCurrent ? `day ${summary.daysElapsed} of ${summary.daysInMonth} · ${progress}%` : fmtPeriod(period) },
          { label: 'Metered Revenue', value: money(summary.metered), icon: Wallet, tint: '#10B981', sub: `${summary.billableTenants} billable tenants` },
          { label: 'Projected Month-end', value: money(summary.projected), icon: TrendingUp, tint: '#8B5CF6',
            sub: summary.isCurrent ? 'at current run-rate' : 'actual' },
          { label: 'Quota Risk', value: summary.inOverage + summary.atRisk, icon: AlertTriangle,
            tint: summary.inOverage + summary.atRisk ? '#F59E0B' : '#94A3B8', sub: `${summary.inOverage} over · ${summary.atRisk} nearing` },
          { label: 'Under-utilised', value: summary.underUtilised, icon: TrendingDown, tint: summary.underUtilised ? '#4F6EF7' : '#94A3B8',
            sub: 'below 20% of quota' },
        ]} />

        {summary.isCurrent && (
          <Panel padded>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                <CalendarClock className="w-4 h-4 text-gray-400" /> Billing period {progress}% elapsed
              </span>
              <div className="flex-1 min-w-[200px]"><Bar value={progress} color="#4F6EF7" /></div>
              <span className="text-sm text-muted-foreground">
                Avg quota consumption <b className="text-gray-900">{summary.avgQuotaUsed}%</b>
                {summary.underUtilised > 0 && <span className="text-blue-600"> · {summary.underUtilised} tenant(s) tracking well below plan</span>}
              </span>
            </div>
          </Panel>
        )}

        <Panel title="Platform Report Volume" subtitle={`Daily metered reports across all tenants — ${fmtPeriod(period)}`} padded>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="umGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [v, 'reports']} />
                <Area type="monotone" dataKey="reports" stroke="#10B981" strokeWidth={2.5} fill="url(#umGrad)"
                  dot={{ r: 3, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {trend.length === 0 && <p className="text-sm text-muted-foreground text-center -mt-28">No metered reports in this period yet.</p>}
        </Panel>

        <div className="flex gap-2 flex-wrap">
          {[['all', 'All tenants'], ['over', 'Over quota'], ['at_risk', 'Nearing quota'], ['under_utilised', 'Under-utilised'], ['healthy', 'On track']].map(([v, l]) => (
            <button key={v} onClick={() => setRisk(v)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                risk === v ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        <Panel title="Consumption by Tenant" subtitle="Click a tenant for their consumption detail · quotas reset on the 1st">
          <Table head={['Tenant', 'Plan', 'Reports', 'Quota Used', '', 'Projected', 'API Calls', 'Overage', 'Billable', 'Status', '']}>
            {shown.map((u: any) => (
              <tr key={u.tenantId} onClick={() => setOpenId(u.tenantId)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td>
                  <p className="font-semibold text-gray-900">{u.tenantName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{u.tenantType} · {u.seats} seat(s)</p>
                </Td>
                <Td><Badge tone={planTone[u.planName] ?? 'slate'}>{u.planName}</Badge></Td>
                <Td>{u.reports.toLocaleString()}<span className="text-muted-foreground text-xs"> / {u.includedReports.toLocaleString()}</span></Td>
                <Td className="font-medium">{u.quotaUsedPct}%</Td>
                <Td className="w-28"><Bar value={Math.min(100, u.quotaUsedPct)} color={u.quotaUsedPct > 100 ? '#EF4444' : u.quotaUsedPct > 80 ? '#F59E0B' : '#10B981'} /></Td>
                <Td className={cn('text-sm', u.projectedQuotaPct > 100 ? 'text-rose-600 font-semibold' : u.projectedQuotaPct >= 90 ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                  {u.projectedReports.toLocaleString()} <span className="text-xs">({u.projectedQuotaPct}%)</span>
                </Td>
                <Td className="text-muted-foreground">{u.apiCalls.toLocaleString()}</Td>
                <Td>{u.overageUnits > 0 ? <Badge tone="red">+{u.overageUnits.toLocaleString()}</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                <Td className="font-bold text-gray-900">{money(u.total)}</Td>
                <Td><Badge tone={RISK[u.risk]?.tone ?? 'slate'}>{RISK[u.risk]?.label ?? u.risk}</Badge></Td>
                <Td><span className="text-xs font-semibold text-blue-600">Detail →</span></Td>
              </tr>
            ))}
            {shown.length === 0 && <tr><Td colSpan={11} className="text-center text-muted-foreground py-8">No tenants in this category.</Td></tr>}
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
