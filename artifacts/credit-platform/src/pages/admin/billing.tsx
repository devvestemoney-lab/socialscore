import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, AlertCircle, Download, CreditCard, Building, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const planColors: Record<string, string> = { Enterprise: '#8b5cf6', Professional: '#06b6d4', Starter: '#10b981' };
const statusColors: Record<string, string> = { paid: '#10b981', outstanding: '#f59e0b', 'no-charges': '#6b7280' };

export default function Billing() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request(`${API}/admin/billing`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { summary, tenants } = data;

  const chartData = (tenants || []).slice(0, 8).map((t: any) => ({
    name: t.tenantName.split(' ')[0],
    revenue: t.monthRevenue,
    calls: t.monthCalls,
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">Billing & Revenue</h1>
              <p className="text-sm text-muted-foreground">API usage billing, invoices, and revenue tracking</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-gray-900 text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Month Revenue', value: `ZMW ${summary.totalMonthRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'All-Time Revenue', value: `ZMW ${summary.totalAllTimeRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Outstanding', value: `ZMW ${summary.outstandingRevenue.toFixed(2)}`, icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Billed Tenants', value: summary.activeBilledTenants, icon: Building, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue by Tenant</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  formatter={(v: any) => [`ZMW ${v}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? '#06b6d4' : '#3b82f6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pricing info */}
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="font-semibold text-gray-900">Pricing Plans</h3>
            {[
              { plan: 'Starter', calls: 'Up to 100 calls/month', price: `ZMW ${summary.pricePerCall}/call`, included: 0, features: ['Basic credit score', 'Email support'] },
              { plan: 'Professional', calls: '100–500 calls/month', price: `ZMW ${summary.pricePerCall}/call`, included: 100, features: ['Full risk profile', 'Loan exposure', 'Priority support'] },
              { plan: 'Enterprise', calls: '500+ calls/month', price: 'Custom pricing', included: 500, features: ['Bulk queries', 'Custom models', 'Dedicated SLA', 'API analytics'] },
            ].map(({ plan, calls, price, features }) => (
              <div key={plan} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: planColors[plan] }} />
                    <span className="font-medium text-gray-900">{plan}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: planColors[plan] }}>{price}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{calls}</p>
                <div className="flex flex-wrap gap-1">
                  {features.map(f => <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-muted-foreground">{f}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant Billing Table */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-gray-900">Tenant Invoices — This Month</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Tenant', 'Type', 'Plan', 'API Calls', 'Revenue (ZMW)', 'Invoice Status', 'Last Activity'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tenants || []).map((t: any) => (
                  <tr key={t.tenantId} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{t.tenantName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground capitalize">{t.tenantType}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${planColors[t.plan]}20`, color: planColors[t.plan] }}>{t.plan}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">{t.monthCalls}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 font-semibold">{t.monthRevenue.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {t.invoiceStatus === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : t.invoiceStatus === 'outstanding' ? <Clock className="w-3.5 h-3.5 text-yellow-400" /> : <span className="w-3.5 h-3.5" />}
                        <span className="text-xs font-medium capitalize" style={{ color: statusColors[t.invoiceStatus] }}>{t.invoiceStatus.replace('-', ' ')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {t.lastActivity ? new Date(t.lastActivity).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
