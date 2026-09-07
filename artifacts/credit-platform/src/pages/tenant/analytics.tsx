import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetTenantAnalytics } from '@workspace/api-client-react';
import { TrendingUp, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const DECISION_COLORS: Record<string, string> = {
  approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  declined: 'text-red-400 bg-red-400/10 border-red-400/20',
  referred: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

const DECISION_ICONS: Record<string, React.ElementType> = {
  approved: CheckCircle,
  declined: XCircle,
  referred: AlertTriangle,
};

export default function TenantAnalytics() {
  const { apiOptions } = useAuth();
  const { data, isLoading } = useGetTenantAnalytics({ request: apiOptions.request });

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-slate-50 rounded-lg w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="h-80 bg-slate-50 rounded-2xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="glass-panel p-8 rounded-2xl text-center">
          <p className="text-red-400">Failed to load analytics data.</p>
        </div>
      </Layout>
    );
  }

  const kpis = [
    { label: 'Total Queries', value: data.totalQueries.toLocaleString(), color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: Search },
    { label: 'Queries This Month', value: data.queriesThisMonth.toLocaleString(), color: 'text-blue-400', bg: 'bg-blue-400/10', icon: TrendingUp },
    { label: 'Approval Rate', value: `${(data.approvalRate * 100).toFixed(1)}%`, color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle },
  ];

  // Build a complete 7-day series — the API only returns days that had activity,
  // which otherwise leaves a single stranded bar on an empty axis.
  const trendMap = new Map((data.queryTrend ?? []).map((d: any) => [d.date, d.value]));
  const queryTrend = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const key = day.toISOString().slice(0, 10);
    return { date: key, label: format(day, 'EEE'), value: Number(trendMap.get(key) ?? 0) };
  });
  const trendTotal = queryTrend.reduce((a, d) => a + d.value, 0);
  const trendPeak = Math.max(1, ...queryTrend.map(d => d.value));

  const riskPieData = [
    { name: 'Excellent (Low)', value: data.riskDistribution.low, color: '#34d399' },
    { name: 'Good (Medium)', value: data.riskDistribution.medium, color: '#fbbf24' },
    { name: 'Fair (High)', value: data.riskDistribution.high, color: '#f97316' },
    { name: 'Poor (Very High)', value: data.riskDistribution.veryHigh, color: '#ef4444' },
    { name: 'Very Poor (Critical)', value: data.riskDistribution.critical, color: '#9f1239' },
  ].filter(d => d.value > 0);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Credit query performance and risk insights for{' '}
          <span className="text-cyan-400 font-medium">{data.tenantName}</span>.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 ${kpi.bg} group-hover:opacity-40 transition-opacity`} />
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Query Volume</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Credit queries run by your team over the last 7 days</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold text-gray-900">{trendTotal}</p>
              <p className="text-[11px] text-gray-400">total this week</p>
            </div>
          </div>
          <div className="h-[240px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={queryTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="qvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  allowDecimals={false} domain={[0, Math.ceil(trendPeak * 1.3)]} />
                <Tooltip
                  cursor={{ stroke: '#4F6EF7', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.08)', fontSize: 12 }}
                  formatter={(v: any) => [`${v} quer${v === 1 ? 'y' : 'ies'}`, '']}
                  labelFormatter={(_l: any, p: any) => {
                    const iso = p?.[0]?.payload?.date;
                    try { return format(new Date(iso + 'T12:00:00'), 'EEEE, d MMM'); } catch { return iso; }
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#4F6EF7" strokeWidth={2.5} fill="url(#qvGrad)"
                  dot={{ r: 3.5, fill: '#fff', stroke: '#4F6EF7', strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: '#4F6EF7', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            {queryTrend.map(d => (
              <div key={d.date} className="text-center flex-1">
                <p className={cn('text-sm font-bold', d.value > 0 ? 'text-gray-900' : 'text-gray-300')}>{d.value}</p>
                <p className="text-[11px] text-gray-400">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Risk Distribution</h3>
          {riskPieData.length > 0 ? (
            <>
              <div className="h-[180px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {riskPieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="text-gray-700 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Queries Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Recent Credit Queries</h3>
          <span className="text-sm text-gray-400">{data.recentQueries.length} most recent</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-gray-500 uppercase tracking-wider bg-slate-50">
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold">NRC</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Score</th>
                <th className="p-4 font-semibold">Rating</th>
                <th className="p-4 font-semibold">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    No queries yet. Run credit lookups to see them here.
                  </td>
                </tr>
              ) : data.recentQueries.map((q) => {
                const Icon = DECISION_ICONS[q.decision] ?? AlertTriangle;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {format(new Date(q.queriedAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-700">{q.nrc}</td>
                    <td className="p-4 text-sm text-gray-900">{q.customerName}</td>
                    <td className="p-4 text-sm font-bold font-mono text-gray-900">{q.score}</td>
                    <td className="p-4 text-sm text-gray-600">{q.rating}</td>
                    <td className="p-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
                        DECISION_COLORS[q.decision] ?? 'text-gray-500 bg-slate-50 border-slate-200'
                      )}>
                        <Icon className="w-3 h-3" />
                        {q.decision}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
