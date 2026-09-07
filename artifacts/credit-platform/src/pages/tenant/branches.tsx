import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { GitBranch, Plus } from 'lucide-react';

const branches = [
  { code: 'BR-001', name: 'Head Office — Cairo Road', city: 'Lusaka', users: 9, reports: 502, status: 'active' },
  { code: 'BR-014', name: 'Manda Hill', city: 'Lusaka', users: 4, reports: 310, status: 'active' },
  { code: 'BR-032', name: 'Kitwe — Obote Avenue', city: 'Kitwe', users: 3, reports: 226, status: 'active' },
  { code: 'BR-045', name: 'Ndola — Broadway', city: 'Ndola', users: 2, reports: 166, status: 'active' },
  { code: 'BR-091', name: 'Chipata Agency', city: 'Chipata', users: 0, reports: 0, status: 'pending setup' },
];

export default function Branches() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={GitBranch} tint="#14B8A6" title="Branches / Departments"
          subtitle="Organisational units used for usage attribution and access scoping"
          actions={<button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"><Plus className="w-4 h-4" /> Add Branch</button>} />
        <Panel title="Branches">
          <Table head={['Code', 'Branch', 'City', 'Users', 'Reports (MTD)', 'Status', '']}>
            {branches.map(b => (
              <tr key={b.code} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{b.code}</Td>
                <Td className="font-semibold text-gray-900">{b.name}</Td>
                <Td className="text-muted-foreground">{b.city}</Td>
                <Td>{b.users}</Td>
                <Td>{b.reports}</Td>
                <Td><Badge tone={b.status === 'active' ? 'green' : 'amber'}>{b.status}</Badge></Td>
                <Td><button className="text-xs font-medium text-blue-600 hover:underline">Manage</button></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
