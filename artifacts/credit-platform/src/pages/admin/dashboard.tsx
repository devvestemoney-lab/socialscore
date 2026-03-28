import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetSystemAnalytics } from '@workspace/api-client-react';
import { Building2, Users, Search, Activity, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'wouter';

export default function AdminDashboard() {
  const { apiOptions } = useAuth();
  const { data, isLoading, error } = useGetSystemAnalytics(apiOptions);

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-slate-50 rounded-lg w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl"></div>)}
          </div>
          <div className="h-96 bg-slate-50 rounded-2xl"></div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return <Layout><div className="text-red-400 p-6 glass-panel rounded-2xl">Failed to load analytics data. Ensure backend is running.</div></Layout>;
  }

  const kpis = [
    { label: 'Total Tenants', value: data.totalTenants, icon: Building2, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Active Customers', value: data.totalCustomers.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Queries (30d)', value: data.queriesThisMonth.toLocaleString(), icon: Search, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Avg System Score', value: Math.round(data.avgCreditScore), icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ];

  const pieData = [
    { name: 'Low Risk', value: data.riskDistribution.low, color: '#34d399' },
    { name: 'Medium Risk', value: data.riskDistribution.medium, color: '#fbbf24' },
    { name: 'High Risk', value: data.riskDistribution.high, color: '#f97316' },
    { name: 'Critical Risk', value: data.riskDistribution.critical, color: '#ef4444' },
  ];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">System Overview</h1>
          <p className="text-muted-foreground">Monitor platform usage and aggregate risk metrics.</p>
        </div>
        <Link href="/admin/tenants" className="px-6 py-2.5 rounded-xl font-medium bg-slate-50 text-gray-900 hover:bg-slate-100 border border-slate-200 transition-colors inline-flex items-center gap-2 w-fit">
          Manage Tenants <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 mb-6">API Queries Trend (30 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.queryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickMargin={10} />
                <YAxis stroke="#ffffff40" fontSize={12} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Risk Distribution</h3>
          <div className="flex-1 min-h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-gray-900">{data.totalCustomers}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-gray-900">Top Tenants by Usage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Tenant Name</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold text-right">Queries (MTD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topTenants.map((tenant) => (
                <tr key={tenant.tenantId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-gray-900 font-medium">{tenant.tenantName}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                      {tenant.type}
                    </span>
                  </td>
                  <td className="p-4 text-right text-gray-700 font-mono">{tenant.queries.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
