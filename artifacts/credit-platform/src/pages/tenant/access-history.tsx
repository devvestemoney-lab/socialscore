import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { KeySquare, LogIn, ShieldAlert, MapPin } from 'lucide-react';

const rows = [
  { user: 'Chanda Mulenga', event: 'login', method: 'Password + MFA', device: 'Chrome · macOS', ip: '196.216.61.44', at: '09:02 today', ok: true },
  { user: 'Mwansa Banda', event: 'login', method: 'Password + MFA', device: 'Edge · Windows', ip: '196.216.61.19', at: '08:15 today', ok: true },
  { user: 'Ruth Daka', event: 'login blocked', method: 'Account suspended', device: 'Chrome · Android', ip: '102.23.44.19', at: 'Yesterday 20:11', ok: false },
  { user: 'API service', event: 'key auth', method: 'sscore_live_8f3a…', device: 'server', ip: '196.216.60.8', at: 'continuous', ok: true },
  { user: 'Peter Lungu', event: 'failed login', method: 'Wrong password (2 attempts)', device: 'Chrome · Windows', ip: '196.216.62.101', at: 'Yesterday 16:38', ok: false },
];

export default function AccessHistory() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={KeySquare} tint="#6366F1" title="Access History"
          subtitle="Authentication events across your workspace" />
        <KpiGrid items={[
          { label: 'Logins (7d)', value: 61, icon: LogIn, tint: '#4F6EF7' },
          { label: 'Failed Attempts (7d)', value: 4, icon: ShieldAlert, tint: '#EF4444' },
          { label: 'Blocked (policy)', value: 1, icon: ShieldAlert, tint: '#F59E0B', sub: 'suspended account' },
          { label: 'Distinct Locations', value: 3, icon: MapPin, tint: '#10B981', sub: 'all within Zambia' },
        ]} />
        <Panel title="Authentication Events">
          <Table head={['User', 'Event', 'Method', 'Device', 'IP', 'When', 'Result']}>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{r.user}</Td>
                <Td className="text-muted-foreground">{r.event}</Td>
                <Td className="text-muted-foreground">{r.method}</Td>
                <Td className="text-muted-foreground">{r.device}</Td>
                <Td className="font-mono text-xs">{r.ip}</Td>
                <Td className="text-muted-foreground">{r.at}</Td>
                <Td><Badge tone={r.ok ? 'green' : 'red'}>{r.ok ? 'success' : 'denied'}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
