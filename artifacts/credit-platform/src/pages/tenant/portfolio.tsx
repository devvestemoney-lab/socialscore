import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, PieChart, BookOpen, Activity, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const riskSignalConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

export default function PortfolioMonitoring() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request(`${API}/tenant/portfolio`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { summary, riskSegmentation, monthlyTrend, earlyWarnings } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Portfolio Monitoring</h1>
            <p className="text-sm text-muted-foreground">Loan book health, default rates, and early warning signals</p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Loans', value: summary.totalActiveLoans, sub: 'Across all borrowers', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Total Loan Book', value: `ZMW ${(summary.totalLoanBook / 1000).toFixed(1)}K`, sub: 'Outstanding balance', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Default Rate', value: `${summary.defaultRate}%`, sub: `${summary.defaultedLoans} defaulted loans`, icon: ShieldAlert, color: summary.defaultRate > 5 ? 'text-red-400' : 'text-yellow-400', bg: summary.defaultRate > 5 ? 'bg-red-500/10' : 'bg-yellow-500/10' },
            { label: 'Avg Portfolio Score', value: summary.avgPortfolioScore, sub: 'Credit score of borrowers', icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Exposure trend */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-gray-900 mb-4">Portfolio Exposure Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  formatter={(v: any) => [`ZMW ${v.toLocaleString()}`, 'Exposure']} />
                <Area type="monotone" dataKey="totalExposure" stroke="#06b6d4" fill="url(#expGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Segmentation Pie */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-gray-900 mb-4">Risk Segmentation</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <RPieChart>
                  <Pie data={riskSegmentation} dataKey="count" innerRadius={50} outerRadius={75} strokeWidth={0}>
                    {riskSegmentation.map((entry: any) => <Cell key={entry.tier} fill={entry.color} />)}
                  </Pie>
                </RPieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {riskSegmentation.map((seg: any) => (
                  <div key={seg.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-muted-foreground">{seg.tier.split('(')[0].trim()}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">{seg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Default Rate Trend */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Default Rate (%)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                formatter={(v: any) => [`${v}%`, 'Default Rate']} />
              <Bar dataKey="defaultRate" radius={[4, 4, 0, 0]}>
                {monthlyTrend.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.defaultRate > 7 ? '#ef4444' : entry.defaultRate > 4 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Early Warning Signals */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-gray-900">Early Warning Signals</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">{earlyWarnings.length} flagged</span>
          </div>
          {earlyWarnings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">No early warning signals detected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Customer', 'NRC', 'Institution', 'Outstanding', 'Missed Payments', 'Risk Signal'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {earlyWarnings.map((w: any) => {
                    const risk = riskSignalConfig[w.riskSignal as keyof typeof riskSignalConfig];
                    return (
                      <tr key={w.loanId} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{w.customerName}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{w.customerNrc}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{w.institution}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">ZMW {w.outstandingBalance.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-bold">{w.missedPayments}</td>
                        <td className="py-3 px-4">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', risk?.bg, risk?.color)}>
                            {w.riskSignal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
