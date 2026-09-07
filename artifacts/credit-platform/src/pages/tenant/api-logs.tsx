import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { ScrollText, CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const codeTone = (s: number) => (s < 300 ? 'green' : s < 500 ? 'amber' : 'red');
const NOTE: Record<string, string> = {
  consent_required: 'No active consumer consent for a hard inquiry',
  policy_block: 'Blocked by a bureau or tenant policy rule',
  generation_failed: 'Report generation failed downstream',
};
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function ApiLogs() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('all');
  const [detail, setDetail] = useState<any>(null);

  async function load(st = status) {
    const res = await request(`${API}/tenant/api/logs?limit=100${st !== 'all' ? `&status=${st}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load('all'); }, []);

  function exportCsv() {
    const rows = [['Request ID', 'Method', 'Endpoint', 'Status', 'Latency (ms)', 'Consumer', 'Purpose', 'Note', 'Timestamp'],
      ...data.logs.map((l: any) => [l.requestId, l.method, l.path, l.status, l.durationMs, l.consumer, `"${l.purpose}"`, l.note ?? '', l.createdAt])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `api-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { logs, summary } = data;
  const l = detail;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ScrollText} tint="#64748B" title="API Logs"
          subtitle="Every request made with your credentials, with the bureau's response"
          actions={<button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium"><Download className="w-4 h-4" /> Export</button>} />

        <KpiGrid items={[
          { label: 'Requests Logged', value: summary.total, icon: ScrollText, tint: '#4F6EF7', sub: 'most recent 100' },
          { label: 'Successful', value: summary.success, icon: CheckCircle2, tint: '#10B981' },
          { label: 'Client Errors (4xx)', value: summary.clientErrors, icon: AlertTriangle, tint: summary.clientErrors ? '#F59E0B' : '#94A3B8', sub: 'consent & policy' },
          { label: 'Server Errors (5xx)', value: summary.serverErrors, icon: XCircle, tint: summary.serverErrors ? '#EF4444' : '#94A3B8' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {[['all', 'All'], ['success', '2xx success'], ['client_error', '4xx client'], ['server_error', '5xx server']].map(([v, l]) => (
            <button key={v} onClick={() => { setStatus(v); load(v); }}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                status === v ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        <Panel title="Request Log" subtitle="Click a request to inspect it">
          <Table head={['Request ID', 'Method', 'Endpoint', 'Status', 'Latency', 'Consumer', 'Time', 'Note']}>
            {logs.map((log: any) => (
              <tr key={log.id} onClick={() => setDetail(log)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-mono text-xs text-blue-600">{log.requestId}</Td>
                <Td><Badge tone={log.method === 'GET' ? 'blue' : 'violet'}>{log.method}</Badge></Td>
                <Td className="font-mono text-xs">{log.path}</Td>
                <Td><Badge tone={codeTone(log.status)}>{log.status}</Badge></Td>
                <Td className={log.durationMs > 3000 ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{log.durationMs}ms</Td>
                <Td className="text-muted-foreground">{log.consumer}</Td>
                <Td className="text-muted-foreground">{fmtTime(log.createdAt)}</Td>
                <Td className="text-xs text-amber-600">{log.note ?? ''}</Td>
              </tr>
            ))}
            {logs.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No requests match this filter.</Td></tr>}
          </Table>
        </Panel>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} wide title={l ? l.requestId : ''} subtitle={l ? `${l.method} ${l.path}` : undefined}>
        {l && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={codeTone(l.status)}>HTTP {l.status}</Badge>
              <Badge tone={l.method === 'GET' ? 'blue' : 'violet'}>{l.method}</Badge>
              <span className="text-sm text-muted-foreground">{l.durationMs}ms · {fmtTime(l.createdAt)}</span>
            </div>
            {l.note && (
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <b>{l.note}</b> — {NOTE[l.note] ?? 'See the API reference for this error condition.'}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {[['Consumer', l.consumer], ['Stated purpose', l.purpose], ['Report reference', l.reference ?? '—'], ['Latency', `${l.durationMs}ms`]].map(([k, v]) => (
                <div key={k} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{k}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Response</p>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto">{JSON.stringify(
                l.status >= 400
                  ? { error: l.note === 'consent_required' ? 'Consent Required' : 'Request Failed', message: NOTE[l.note] ?? 'Request could not be completed', requestId: l.requestId }
                  : { reference: l.reference, status: 'delivered', generationMs: l.durationMs, requestId: l.requestId },
                null, 2)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
