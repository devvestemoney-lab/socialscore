import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Activity, FileText, Zap, Wallet, TrendingUp, CalendarClock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number) => `K${Math.round(v).toLocaleString()}`;
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export default function UsageOverview() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  async function load(period?: string) {
    const res = await request(`${API}/tenant/usage${period ? `?period=${period}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!data.subscription) return <Layout><Panel padded><p className="text-center text-muted-foreground py-10">No subscription on file — contact your account manager.</p></Panel></Layout>;

  const { subscription: s, meters, summary, daily, period, periods } = data;
  const progress = Math.round((summary.daysElapsed / summary.daysInMonth) * 100);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#4F6EF7" title="Usage Overview"
          subtitle={`Consumption against your ${s.planName} plan`}
          actions={
            <select value={period} onChange={e => load(e.target.value)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 outline-none">
              {periods.map((p: string) => <option key={p} value={p}>{fmtPeriod(p)}</option>)}
            </select>
          } />

        <KpiGrid items={[
          { label: 'Reports Used', value: summary.reports.toLocaleString(), icon: FileText, tint: '#10B981', sub: `of ${s.includedReports.toLocaleString()} included` },
          { label: 'API Calls', value: summary.apiCalls.toLocaleString(), icon: Zap, tint: '#4F6EF7' },
          { label: 'Projected Month-end', value: summary.projectedReports.toLocaleString(), icon: TrendingUp, tint: '#F59E0B',
            sub: summary.projectedReports > s.includedReports ? 'above quota — overage likely' : 'within quota' },
          { label: 'Charges This Period', value: money(summary.total), icon: Wallet, tint: '#8B5CF6',
            sub: summary.overageUnits > 0 ? `incl. ${money(summary.overageAmount)} overage` : 'no overage' },
          { label: 'Billing Period', value: `${progress}%`, icon: CalendarClock, tint: '#14B8A6', sub: `day ${summary.daysElapsed} of ${summary.daysInMonth}` },
        ]} />

        <Panel title="Quota Meters" subtitle="Quotas reset on the 1st of each month" padded>
          <div className="space-y-5">
            {meters.map((m: any) => {
              const unlimited = m.quota === 0;
              const pct = unlimited ? 0 : Math.round((m.used / m.quota) * 100);
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{m.label}</span>
                    <span className="text-muted-foreground">
                      {m.used.toLocaleString()} {unlimited ? `${m.unit} · unlimited` : `/ ${m.quota.toLocaleString()} · ${pct}%`}
                    </span>
                  </div>
                  <Bar value={unlimited ? 4 : Math.min(100, pct)} color={unlimited ? '#94A3B8' : pct > 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981'} />
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Daily Report Volume" className="lg:col-span-2" padded>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v: any) => [v, 'reports']} />
                  <Area type="monotone" dataKey="reports" stroke="#4F6EF7" strokeWidth={2.5} fill="url(#usageGrad)"
                    dot={{ r: 3, fill: '#fff', stroke: '#4F6EF7', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {daily.length === 0 && <p className="text-sm text-muted-foreground text-center -mt-32">No reports pulled in this period yet.</p>}
          </Panel>

          <Panel title="Estimated Charges" padded>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{s.planName} subscription</span><b className="text-gray-900">{money(summary.subscriptionAmount)}</b></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overage {summary.overageUnits > 0 && <span className="text-xs">({summary.overageUnits} × K{Number(s.overageRate)})</span>}</span>
                <b className={summary.overageAmount > 0 ? 'text-violet-600' : 'text-gray-400'}>{summary.overageAmount > 0 ? money(summary.overageAmount) : '—'}</b>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Add-ons</span><b className={summary.addonsAmount > 0 ? 'text-gray-900' : 'text-gray-400'}>{summary.addonsAmount > 0 ? money(summary.addonsAmount) : '—'}</b></div>
              {summary.discountAmount > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Contract discount</span><b className="text-emerald-600">−{money(summary.discountAmount)}</b></div>
              )}
              <div className="flex justify-between pt-3 mt-1 border-t border-slate-200">
                <span className="font-semibold text-gray-900">Total this period</span>
                <span className="text-lg font-display font-bold text-gray-900">{money(summary.total)}</span>
              </div>
              <div className="flex justify-between text-xs pt-2">
                <span className="text-gray-400">Projected at month end</span>
                <span className="text-gray-600 font-medium">{money(summary.projectedTotal)}</span>
              </div>
            </div>
            {summary.failed > 0 && (
              <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-muted-foreground">
                {summary.failed} failed pull{summary.failed !== 1 ? 's' : ''} in this period were not billed.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
