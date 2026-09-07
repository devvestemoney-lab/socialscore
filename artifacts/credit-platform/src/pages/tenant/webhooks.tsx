import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Toggle } from '@/components/admin/page-kit';
import { Webhook, Plus } from 'lucide-react';

const initial = [
  { url: 'https://api.zanaco.co.zm/hooks/sscore/reports', events: ['report.ready', 'report.failed'], on: true, health: 'healthy', lastDelivery: '09:41 today' },
  { url: 'https://api.zanaco.co.zm/hooks/sscore/alerts', events: ['alert.consumer', 'alert.portfolio'], on: true, health: 'healthy', lastDelivery: '08:12 today' },
  { url: 'https://api.zanaco.co.zm/hooks/sscore/disputes', events: ['dispute.opened', 'dispute.resolved'], on: false, health: 'paused', lastDelivery: '28 Aug' },
];
const deliveries = [
  { event: 'report.ready', target: '…/reports', status: 200, attempts: 1, at: '09:41:23' },
  { event: 'alert.consumer', target: '…/alerts', status: 200, attempts: 1, at: '08:12:09' },
  { event: 'report.ready', target: '…/reports', status: 500, attempts: 3, at: 'Yesterday 16:20' },
];

export default function Webhooks() {
  const [hooks, setHooks] = useState(initial);
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Webhook} tint="#6366F1" title="Webhooks"
          subtitle="Receive platform events in your systems in real time"
          actions={<button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"><Plus className="w-4 h-4" /> Add Endpoint</button>} />
        <Panel title="Endpoints">
          <Table head={['URL', 'Events', 'Health', 'Last Delivery', 'Enabled']}>
            {hooks.map((h, i) => (
              <tr key={h.url} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-gray-900 max-w-[280px] truncate">{h.url}</Td>
                <Td><span className="flex gap-1 flex-wrap">{h.events.map(e => <Badge key={e} tone="blue">{e}</Badge>)}</span></Td>
                <Td><Badge tone={h.health === 'healthy' ? 'green' : 'slate'}>{h.health}</Badge></Td>
                <Td className="text-muted-foreground">{h.lastDelivery}</Td>
                <Td><Toggle on={h.on} onChange={() => setHooks(prev => prev.map((x, j) => j === i ? { ...x, on: !x.on } : x))} /></Td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Recent Deliveries">
          <Table head={['Event', 'Endpoint', 'Response', 'Attempts', 'When']}>
            {deliveries.map((d, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs">{d.event}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{d.target}</Td>
                <Td><Badge tone={d.status < 300 ? 'green' : 'red'}>{d.status}</Badge></Td>
                <Td>{d.attempts}</Td>
                <Td className="text-muted-foreground">{d.at}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
