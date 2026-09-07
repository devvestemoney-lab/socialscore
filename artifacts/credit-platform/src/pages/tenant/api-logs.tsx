import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { ScrollText } from 'lucide-react';

const logs = [
  { id: 'req_9f31ac', method: 'POST', path: '/v1/credit/report', status: 200, ms: 1642, key: 'live_8f3a', at: '09:41:22' },
  { id: 'req_9f31a8', method: 'GET', path: '/v1/credit/score', status: 200, ms: 212, key: 'live_8f3a', at: '09:41:04' },
  { id: 'req_9f319e', method: 'POST', path: '/v1/identity/verify', status: 200, ms: 1904, key: 'live_8f3a', at: '09:38:51' },
  { id: 'req_9f3187', method: 'POST', path: '/v1/credit/report', status: 403, ms: 45, key: 'live_8f3a', at: '09:12:10', note: 'consent_required' },
  { id: 'req_9f3121', method: 'GET', path: '/v1/credit/score', status: 429, ms: 3, key: 'live_8f3a', at: '08:58:44', note: 'rate_limited' },
  { id: 'req_9f30fe', method: 'POST', path: '/v1/consent/grant', status: 201, ms: 288, key: 'live_8f3a', at: '08:44:02' },
];

export default function ApiLogs() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ScrollText} tint="#64748B" title="API Logs"
          subtitle="Recent requests made with your credentials (today)" />
        <Panel title="Request Log">
          <Table head={['Request ID', 'Method', 'Endpoint', 'Status', 'Latency', 'Key', 'Time', 'Note']}>
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{l.id}</Td>
                <Td><Badge tone={l.method === 'GET' ? 'blue' : 'violet'}>{l.method}</Badge></Td>
                <Td className="font-mono text-xs">{l.path}</Td>
                <Td><Badge tone={l.status < 300 ? 'green' : l.status < 500 ? 'amber' : 'red'}>{l.status}</Badge></Td>
                <Td className={l.ms > 3000 ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{l.ms}ms</Td>
                <Td className="font-mono text-xs text-muted-foreground">{l.key}</Td>
                <Td className="text-muted-foreground">{l.at}</Td>
                <Td className="text-xs text-amber-600">{l.note ?? ''}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
