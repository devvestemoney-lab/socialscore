import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, AlertTriangle, XCircle, Activity, RefreshCw, Wifi, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const typeColors: Record<string, string> = { bank: '#06b6d4', mno: '#10b981', mfi: '#8b5cf6' };
const typeLabels: Record<string, string> = { bank: 'Bank', mno: 'MNO', mfi: 'MFI' };

const statusConfig = {
  active: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Degraded' },
  offline: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Offline' },
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function DataSources() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    request(`${API}/admin/data-sources`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { summary, dataSources } = data;
  const filtered = filter === 'all' ? dataSources : dataSources.filter((d: any) => d.type === filter || d.status === filter);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Data Source Management</h1>
            <p className="text-sm text-muted-foreground">Monitor integrations with banks, MNOs, and MFIs feeding data into the platform</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Sources', value: summary.total, color: 'text-white', bg: 'bg-white/5', icon: Database },
            { label: 'Healthy', value: summary.active, color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
            { label: 'Degraded', value: summary.degraded, color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertTriangle },
            { label: 'Offline', value: summary.offline, color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
            { label: 'Health Score', value: `${summary.avgHealthScore}%`, color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: Activity },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={cn('p-4 rounded-xl border border-white/10', bg)}>
              <Icon className={cn('w-5 h-5 mb-2', color)} />
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Records ingested */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Records Ingested</p>
            <p className="text-2xl font-bold text-white">{summary.totalRecordsIngested.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Platform Average Health</p>
            <p className="text-2xl font-bold text-cyan-400">{summary.avgHealthScore}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'bank', 'mno', 'mfi', 'active', 'degraded', 'offline'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                filter === f ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10')}>
              {f}
            </button>
          ))}
        </div>

        {/* Data Sources Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((source: any) => {
            const status = statusConfig[source.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            const typeColor = typeColors[source.type] || '#6b7280';
            const relativeTime = getRelativeTime(source.lastSync);

            return (
              <motion.div key={source.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={cn('p-5 rounded-xl border transition-all', source.status !== 'active' ? `${status.bg} ${status.border}` : 'bg-white/5 border-white/10')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${typeColor}20` }}>
                      {source.type === 'bank' ? <Database className="w-5 h-5" style={{ color: typeColor }} /> :
                       source.type === 'mno' ? <Wifi className="w-5 h-5" style={{ color: typeColor }} /> :
                       <Activity className="w-5 h-5" style={{ color: typeColor }} />}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{source.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${typeColor}20`, color: typeColor }}>
                        {typeLabels[source.type]}
                      </span>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.bg, status.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Health Score</span>
                    <span>{source.healthScore}%</span>
                  </div>
                  <HealthBar score={source.healthScore} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-sm font-bold text-white">{source.avgLatencyMs > 0 ? `${source.avgLatencyMs}ms` : '—'}</p>
                    <p className="text-xs text-muted-foreground">Latency</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-sm font-bold text-white">{source.uptime}%</p>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-sm font-bold text-white">{(source.recordsContributed / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-muted-foreground">Records</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Last sync: {relativeTime}</span>
                  </div>
                  <span>{source.syncSchedule}</span>
                </div>

                {source.alert && (
                  <div className="mt-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {source.alert}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  {source.dataTypes.map((dt: string) => (
                    <span key={dt} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground capitalize">{dt.replace('_', ' ')}</span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
