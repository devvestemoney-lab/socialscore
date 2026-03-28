import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Eye, Activity, RefreshCw, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const riskColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  normal: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-400' },
};

export default function FraudMonitor() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  async function load() {
    const res = await request(`${API}/admin/fraud`);
    setData(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  function refresh() { setRefreshing(true); load(); }

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { summary, tenantRiskProfiles } = data;
  const filtered = filter === 'all' ? tenantRiskProfiles : tenantRiskProfiles.filter((t: any) => t.riskLevel === filter);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">Fraud & Abuse Monitoring</h1>
              <p className="text-sm text-muted-foreground">Detect excessive lookups, suspicious patterns, and anomalous access</p>
            </div>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-gray-900 text-sm font-medium transition-colors">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Alert Banner */}
        {summary.criticalAlerts > 0 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-medium">
              {summary.criticalAlerts} critical alert{summary.criticalAlerts > 1 ? 's' : ''} detected — immediate review recommended
            </p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Flagged Tenants', value: summary.flaggedTenants, color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle },
            { label: 'Critical Alerts', value: summary.criticalAlerts, color: 'text-red-400', bg: 'bg-red-500/10', icon: ShieldAlert },
            { label: 'High Risk', value: summary.highAlerts, color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Eye },
            { label: 'Total Query Volume', value: summary.totalQueryVolume, color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: Activity },
          ].map(({ label, value, color, bg, icon: Icon }) => (
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

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'normal'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border', filter === f
                ? f === 'all' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : `${riskColors[f]?.bg} ${riskColors[f]?.text} ${riskColors[f]?.border}`
                : 'bg-slate-50 text-muted-foreground border-slate-200 hover:bg-slate-100'
              )}>
              {f}
            </button>
          ))}
        </div>

        {/* Tenant Risk Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((tenant: any) => {
            const colors = riskColors[tenant.riskLevel];
            return (
              <motion.div key={tenant.tenantId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={cn('p-5 rounded-xl border transition-all', tenant.riskLevel !== 'normal' ? `${colors.bg} ${colors.border}` : 'bg-slate-50 border-slate-200')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full mt-1', colors.dot, tenant.riskLevel !== 'normal' && 'animate-pulse')} />
                    <div>
                      <p className="font-semibold text-gray-900">{tenant.tenantName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tenant.tenantType}</p>
                    </div>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold uppercase', colors.bg, colors.text)}>
                    {tenant.riskLevel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-gray-900">{tenant.queriesLastHour}</p>
                    <p className="text-xs text-muted-foreground">Last hour</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-gray-900">{tenant.queriesLast24h}</p>
                    <p className="text-xs text-muted-foreground">Last 24h</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-gray-900">{tenant.repeatQueryRatio}%</p>
                    <p className="text-xs text-muted-foreground">Repeat ratio</p>
                  </div>
                </div>

                {tenant.flags.length > 0 && (
                  <div className="space-y-1">
                    {tenant.flags.map((flag: string) => (
                      <div key={flag} className="flex items-center gap-2 text-xs">
                        <AlertTriangle className={cn('w-3 h-3 shrink-0', colors.text)} />
                        <span className={colors.text}>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
                {tenant.flags.length === 0 && (
                  <p className="text-xs text-green-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    No suspicious activity detected
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
