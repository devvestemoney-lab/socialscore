import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { BookOpen, Download } from 'lucide-react';

const docs = [
  { name: 'Platform User Guide', ver: 'v4.2', updated: 'Aug 2026', pages: 86, kind: 'Guide' },
  { name: 'Data Submission Specification (CRB-XML v3)', ver: 'v3.1', updated: 'Jul 2026', pages: 44, kind: 'Specification' },
  { name: 'Score Interpretation Handbook', ver: 'v2.0', updated: 'Jun 2026', pages: 28, kind: 'Guide' },
  { name: 'Dispute Handling Procedures', ver: 'v1.4', updated: 'May 2026', pages: 18, kind: 'Procedure' },
  { name: 'Bureau Code of Conduct', ver: 'v1.2', updated: 'Feb 2026', pages: 12, kind: 'Policy' },
];

export default function Documentation() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BookOpen} tint="#8B5CF6" title="Documentation"
          subtitle="Operational manuals and specifications for participating institutions" />
        <Panel title="Document Library">
          <Table head={['Document', 'Type', 'Version', 'Updated', 'Pages', '']}>
            {docs.map(d => (
              <tr key={d.name} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{d.name}</Td>
                <Td><Badge tone="violet">{d.kind}</Badge></Td>
                <Td className="font-mono text-xs">{d.ver}</Td>
                <Td className="text-muted-foreground">{d.updated}</Td>
                <Td className="text-muted-foreground">{d.pages}</Td>
                <Td><button className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"><Download className="w-3 h-3" /> PDF</button></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
