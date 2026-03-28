import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetAuditLogs } from '@workspace/api-client-react';
import { Shield, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  'identity.verify': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'credit.score.query': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'loan.exposure.query': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'risk.profile.query': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'tenant.create': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'tenant.update': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'tenant.delete': 'text-red-400 bg-red-400/10 border-red-400/20',
  'user.login': 'text-teal-400 bg-teal-400/10 border-teal-400/20',
};

export default function AuditLogs() {
  const { apiOptions } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useGetAuditLogs(
    { page, limit },
    { request: apiOptions.request }
  );

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filtered = search
    ? logs.filter(l =>
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.targetNrc?.includes(search) ||
        l.userId?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Audit Logs</h1>
          <p className="text-muted-foreground">Full compliance trail of all platform actions.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 glass-panel rounded-xl border border-slate-200 text-sm text-gray-500">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>{total.toLocaleString()} total events</span>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel rounded-2xl mb-6 p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search action, NRC, or user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-gray-500 uppercase tracking-wider bg-slate-50">
                <th className="p-4 font-semibold">Timestamp</th>
                <th className="p-4 font-semibold">Action</th>
                <th className="p-4 font-semibold">NRC Queried</th>
                <th className="p-4 font-semibold">User / Tenant</th>
                <th className="p-4 font-semibold">IP Address</th>
                <th className="p-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-slate-50 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400">
                      No audit log entries found.
                    </td>
                  </tr>
                )
                : filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
                          ACTION_COLORS[log.action] ?? 'text-gray-500 bg-slate-50 border-slate-200'
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-sm text-gray-700">
                        {log.targetNrc ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="p-4 text-sm">
                        <div className="text-gray-600 truncate max-w-[120px]">{log.userId}</div>
                        {log.tenantId && (
                          <div className="text-xs text-gray-400 truncate max-w-[120px] font-mono mt-0.5">
                            {log.tenantId}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs font-mono text-gray-500">
                        {log.ipAddress ?? '—'}
                      </td>
                      <td className="p-4 text-xs text-gray-400 max-w-[200px]">
                        <span className="truncate block">
                          {log.details ? JSON.stringify(log.details).slice(0, 50) + '…' : '—'}
                        </span>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages} · {total} total events
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                    p === page ? 'bg-cyan-500 text-white' : 'bg-slate-50 text-gray-500 hover:bg-slate-100'
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
