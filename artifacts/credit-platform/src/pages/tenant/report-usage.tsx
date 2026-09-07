import { Layout } from '@/components/layout';
import { PageHeader, Panel, Table, Td, Badge } from '@/components/admin/page-kit';
import { FileBarChart2 } from 'lucide-react';

const byUser = [
  { user: 'Chanda Mulenga', role: 'Tenant Admin', reports: 412, soft: 122, lastPull: '09:41 today' },
  { user: 'Mwansa Banda', role: 'Credit Analyst', reports: 388, soft: 208, lastPull: '08:12 today' },
  { user: 'Peter Lungu', role: 'Data Officer', reports: 214, soft: 88, lastPull: 'Yesterday' },
  { user: 'API (system)', role: 'Service account', reports: 190, soft: 3411, lastPull: '09:41 today' },
];
const byBranch = [
  { branch: 'Head Office — Cairo Road', reports: 502 }, { branch: 'Manda Hill', reports: 310 },
  { branch: 'Kitwe — Obote Ave', reports: 226 }, { branch: 'Ndola — Broadway', reports: 166 },
];

export default function ReportUsage() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileBarChart2} tint="#10B981" title="Credit Report Usage"
          subtitle="Who is pulling reports across your teams and branches (MTD)" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="By User">
            <Table head={['User', 'Role', 'Full Reports', 'Soft Pulls', 'Last Activity']}>
              {byUser.map(u => (
                <tr key={u.user} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{u.user}</Td>
                  <Td><Badge tone={u.role === 'Service account' ? 'violet' : 'blue'}>{u.role}</Badge></Td>
                  <Td>{u.reports}</Td>
                  <Td className="text-muted-foreground">{u.soft}</Td>
                  <Td className="text-muted-foreground">{u.lastPull}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
          <Panel title="By Branch">
            <Table head={['Branch', 'Reports (MTD)']}>
              {byBranch.map(b => (
                <tr key={b.branch} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{b.branch}</Td>
                  <Td>{b.reports}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
