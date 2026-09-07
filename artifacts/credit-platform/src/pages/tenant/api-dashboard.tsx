import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { Activity, Zap, AlertOctagon, Timer } from 'lucide-react';

const endpoints = [
  { path: '/v1/credit/report', calls: 1204, errRate: 0.3, p95: '1.8s' },
  { path: '/v1/credit/score', calls: 3411, errRate: 0.1, p95: '240ms' },
  { path: '/v1/consent/grant', calls: 388, errRate: 0.2, p95: '310ms' },
  { path: '/v1/identity/verify', calls: 902, errRate: 1.1, p95: '1.9s' },
  { path: '/v1/data/submit', calls: 3, errRate: 0.0, p95: '11.2s' },
];

export default function ApiDashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#4F6EF7" title="API Dashboard"
          subtitle="Your institution's API consumption this billing period" />
        <KpiGrid items={[
          { label: 'Requests (MTD)', value: '5,908', icon: Activity, tint: '#4F6EF7' },
          { label: 'Peak Rate', value: '214 rpm', icon: Zap, tint: '#F59E0B', sub: 'limit: 600 rpm' },
          { label: 'Error Rate', value: '0.4%', icon: AlertOctagon, tint: '#EF4444' },
          { label: 'Avg Latency', value: '480ms', icon: Timer, tint: '#10B981' },
        ]} />
        <Panel title="Usage by Endpoint (MTD)">
          <Table head={['Endpoint', 'Calls', 'Error Rate', '', 'p95 Latency']}>
            {endpoints.map(e => (
              <tr key={e.path} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-gray-900">{e.path}</Td>
                <Td>{e.calls.toLocaleString()}</Td>
                <Td className={e.errRate > 1 ? 'text-rose-600 font-semibold' : ''}>{e.errRate}%</Td>
                <Td className="w-32"><Bar value={Math.min(100, e.errRate * 20)} color={e.errRate > 1 ? '#EF4444' : '#10B981'} /></Td>
                <Td className="text-muted-foreground">{e.p95}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
