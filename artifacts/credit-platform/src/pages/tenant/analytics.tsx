import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetTenantAnalytics } from '@workspace/api-client-react';
import { TrendingUp, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
          <div className="h-10 bg-white/5 rounded-lg w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="h-80 bg-white/5 rounded-2xl" />)}
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
        <h1 className="text-3xl font-display font-bold text-white mb-2">Analytics</h1>
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
              <p className="text-sm font-medium text-white/60">{kpi.label}</p>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Query Volume (Last 7 Days)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.queryTrend} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff40"
                  fontSize={12}
                  tickFormatter={v => {
                    try { return format(new Date(v + 'T12:00:00'), 'EEE'); } catch { return v; }
                  }}
                />
                <YAxis stroke="#ffffff40" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  labelFormatter={v => { try { return format(new Date(v + 'T12:00:00'), 'MMM d, yyyy'); } catch { return v; } }}
                />
                <Bar dataKey="value" name="Queries" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Risk Distribution</h3>
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
                    <div className="flex items-center gap-2 text-white/60">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="text-white/80 font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-white/30 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Queries Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recent Credit Queries</h3>
          <span className="text-sm text-white/40">{data.recentQueries.length} most recent</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-xs text-white/50 uppercase tracking-wider bg-white/[0.02]">
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold">NRC</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Score</th>
                <th className="p-4 font-semibold">Rating</th>
                <th className="p-4 font-semibold">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recentQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/30">
                    No queries yet. Run credit lookups to see them here.
                  </td>
                </tr>
              ) : data.recentQueries.map((q) => {
                const Icon = DECISION_ICONS[q.decision] ?? AlertTriangle;
                return (
                  <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-xs font-mono text-white/50 whitespace-nowrap">
                      {format(new Date(q.queriedAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="p-4 font-mono text-sm text-white/80">{q.nrc}</td>
                    <td className="p-4 text-sm text-white">{q.customerName}</td>
                    <td className="p-4 text-sm font-bold font-mono text-white">{q.score}</td>
                    <td className="p-4 text-sm text-white/70">{q.rating}</td>
                    <td className="p-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
                        DECISION_COLORS[q.decision] ?? 'text-white/50 bg-white/5 border-white/10'
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
