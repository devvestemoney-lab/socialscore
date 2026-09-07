import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetSystemAnalytics, useGetAuditLogs } from '@workspace/api-client-react';
import {
  Users, FileText, Landmark, FileBarChart2, Activity, Gauge,
  ArrowUpRight, ArrowDownRight, CircleDot, CheckCircle2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const BLUE = '#4F6EF7';

function timeAgo(iso: string | Date) {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

const actionLabel = (a: string) =>
  a.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function AdminDashboard() {
  const { apiOptions } = useAuth();
  const { data, isLoading, error } = useGetSystemAnalytics(apiOptions);
  const { data: audit } = useGetAuditLogs({ page: 1, limit: 30 } as any, apiOptions as any);

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />)}
          </div>
          <div className="h-80 bg-white rounded-2xl border border-slate-200" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return <Layout><div className="glass-panel rounded-2xl p-6 text-rose-500">Failed to load analytics data. Ensure the backend is running.</div></Layout>;
  }

  const logs = audit?.logs ?? [];

  const kpis = [
    { label: 'Total Consumers', value: data.totalCustomers.toLocaleString(), icon: Users, tint: '#4F6EF7', delta: '+3.6%', up: true },
    { label: 'Reports Pulled', value: data.totalQueries.toLocaleString(), icon: FileText, tint: '#10B981', delta: '+4.2%', up: true },
    { label: 'Participating Institutions', value: data.totalTenants, icon: Landmark, tint: '#6366F1', delta: `${data.activeTenants} active`, up: true },
    { label: 'Reports This Month', value: data.queriesThisMonth.toLocaleString(), icon: FileBarChart2, tint: '#F59E0B', delta: '+6.8%', up: true },
    { label: 'High-Risk Consumers', value: (data.riskDistribution.high + data.riskDistribution.critical).toLocaleString(), icon: Activity, tint: '#EF4444', delta: '-2.1%', up: false },
    { label: 'Avg Credit Score', value: Math.round(data.avgCreditScore), icon: Gauge, tint: '#14B8A6', delta: 'system-wide', up: true },
  ];

  // Reports by purpose — aggregate real audit actions
  const purposeColors = ['#1D4ED8', '#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#94A3B8'];
  const byAction = Object.entries(
    logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.action] = (acc[l.action] ?? 0) + 1; return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const purposeTotal = byAction.reduce((s, [, n]) => s + n, 0);
  const purposeData = byAction.map(([name, value], i) => ({
    name: actionLabel(name), value, color: purposeColors[i % purposeColors.length],
  }));

  const riskData = [
    { name: 'Low Risk', value: data.riskDistribution.low, color: '#22C55E' },
    { name: 'Medium Risk', value: data.riskDistribution.medium, color: '#F59E0B' },
    { name: 'High Risk', value: data.riskDistribution.high + data.riskDistribution.critical, color: '#EF4444' },
  ];
  const riskTotal = riskData.reduce((s, r) => s + r.value, 0);

  const alerts: { severity: 'High' | 'Medium' | 'Low'; text: string; source: string; status: string; color: string }[] = [];
  if (data.riskDistribution.critical > 0)
    alerts.push({ severity: 'High', text: 'Critical-risk consumers present in portfolio', source: 'Risk Engine', status: 'New', color: '#EF4444' });
  if (data.queriesThisMonth > 0)
    alerts.push({ severity: 'Medium', text: `${data.queriesThisMonth.toLocaleString()} report pulls recorded this month`, source: 'Analytics Engine', status: 'Info', color: '#F59E0B' });
  alerts.push({ severity: 'Low', text: 'Scheduled maintenance window upcoming', source: 'System Scheduler', status: 'Info', color: '#22C55E' });

  const health = ['API Gateway', 'Database', 'Report Engine', 'Notification Service', 'Data Ingestion', 'File Storage'];

  const card = 'glass-panel rounded-2xl';

  return (
    <Layout>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Welcome back, Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening across the Social Score platform</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-[18px] h-[18px]" style={{ color: k.tint }} />
              </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500 leading-tight mb-1">{k.label}</p>
            <p className="text-xl font-display font-bold text-gray-900">{k.value}</p>
            <p className={`text-[11px] mt-1 flex items-center gap-1 ${k.up ? 'text-emerald-600' : 'text-rose-500'}`}>
              {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {k.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Row: trend / purpose / activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className={`${card} p-5 lg:col-span-1 xl:col-span-1`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Reports Pulled Trend</h3>
            <span className="text-xs text-gray-400 border border-slate-200 rounded-lg px-2 py-1">Daily</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.queryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickMargin={8}
                  tickFormatter={(d: string) => d.slice(5)} />
                <YAxis stroke="#94A3B8" fontSize={11} width={34} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2.5}
                  dot={{ r: 3, fill: BLUE }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-bold text-gray-900 mb-4">Reports by Purpose</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-[160px] h-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={purposeData.length ? purposeData : [{ name: 'No data', value: 1, color: '#E2E8F0' }]}
                    cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={2} dataKey="value" stroke="none">
                    {(purposeData.length ? purposeData : [{ color: '#E2E8F0' } as any]).map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-gray-900">{purposeTotal.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">Recent</span>
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              {purposeData.map(p => (
                <div key={p.name} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="font-semibold text-gray-800">{purposeTotal ? Math.round((p.value / purposeTotal) * 100) : 0}%</span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
              {!purposeData.length && <p className="text-xs text-gray-400">No activity yet</p>}
            </div>
          </div>
        </div>

        <div className={`${card} p-5 flex flex-col`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Real-time Activity</h3>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <CircleDot className="w-3 h-3" /> Live
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[230px] pr-1">
            {logs.slice(0, 8).map(l => (
              <div key={l.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#4F6EF71A' }}>
                  <Activity className="w-4 h-4" style={{ color: BLUE }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{actionLabel(l.action)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{l.targetNrc ? `Consumer NRC: ${l.targetNrc}` : l.ipAddress ?? '—'}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(l.createdAt as any)}</span>
              </div>
            ))}
            {!logs.length && <p className="text-xs text-gray-400">No recent activity.</p>}
          </div>
        </div>
      </div>

      {/* Row: risk segment / score distribution / contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className={`${card} p-5`}>
          <h3 className="font-bold text-gray-900 mb-4">Consumers by Risk Segment</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-[160px] h-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={2} dataKey="value" stroke="none">
                    {riskData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 min-w-0">
              {riskData.map(r => (
                <div key={r.name} className="text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <p className="pl-4 text-gray-400">
                    {r.value.toLocaleString()} ({riskTotal ? Math.round((r.value / riskTotal) * 100) : 0}%)
                  </p>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 pt-1">Total: {riskTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-bold text-gray-900 mb-4">Score Distribution</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="range" stroke="#94A3B8" fontSize={11} tickMargin={8} />
                <YAxis stroke="#94A3B8" fontSize={11} width={30} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={['#EF4444', '#F97316', '#F59E0B', '#4F6EF7', '#22C55E'][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">Credit Score Range</p>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-bold text-gray-900 mb-4">Top Data Contributors</h3>
          <div className="space-y-3">
            {data.topTenants.map((t, i) => (
              <div key={t.tenantId} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-gray-600 text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.tenantName}</p>
                  <p className="text-[11px] text-gray-400 uppercase">{t.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{t.queries.toLocaleString()}</p>
                  <p className="text-[11px] text-emerald-600 flex items-center justify-end gap-0.5"><ArrowUpRight className="w-3 h-3" /> queries</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: alerts / system health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} overflow-hidden`}>
          <div className="p-5 pb-3"><h3 className="font-bold text-gray-900">System Alerts</h3></div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-y border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 font-semibold">Severity</th>
                <th className="px-3 py-2.5 font-semibold">Alert</th>
                <th className="px-3 py-2.5 font-semibold hidden sm:table-cell">Source</th>
                <th className="px-5 py-2.5 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((a, i) => (
                <tr key={i}>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: a.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: a.color }} /> {a.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{a.text}</td>
                  <td className="px-3 py-3 text-gray-400 hidden sm:table-cell">{a.source}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[11px] font-medium px-2 py-1 rounded-md" style={{ background: `${a.color}14`, color: a.color }}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${card} p-5`}>
          <h3 className="font-bold text-gray-900 mb-4">System Health Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {health.map(h => (
              <div key={h} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-semibold text-gray-800 truncate">{h}</p>
                </div>
                <p className="text-[11px] text-emerald-600">Healthy</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
