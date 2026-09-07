import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { ClipboardCheck, FileCheck2, Hourglass, FileX2 } from 'lucide-react';

const consents = [
  { consumer: 'Mwansa Chileshe', scope: 'Full report + score', channel: 'USSD', granted: '02 Sep 2026', expires: '02 Mar 2027', status: 'active' },
  { consumer: 'Namakau Sitali', scope: 'Full report + score', channel: 'Branch e-sign', granted: '22 Aug 2026', expires: '22 Feb 2027', status: 'active' },
  { consumer: 'Bwalya Kapembwa', scope: 'Score only', channel: 'Mobile app', granted: '01 Sep 2026', expires: '01 Dec 2026', status: 'active' },
  { consumer: 'Kunda Musonda', scope: 'Score only', channel: 'In-app', granted: '10 Aug 2026', expires: '18 Sep 2026', status: 'expiring' },
  { consumer: 'Joseph Sichone', scope: 'Full report + score', channel: 'USSD', granted: '15 Jul 2026', expires: '—', status: 'revoked' },
];

export default function ConsentRecords() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ClipboardCheck} tint="#10B981" title="Consent Records"
          subtitle="Data-sharing consents your institution holds — evidence retained per the Data Protection Act" />
        <KpiGrid items={[
          { label: 'Active Consents', value: 1682, icon: FileCheck2, tint: '#10B981' },
          { label: 'Captured (30d)', value: 204, icon: ClipboardCheck, tint: '#4F6EF7' },
          { label: 'Expiring (30d)', value: 47, icon: Hourglass, tint: '#F59E0B', sub: 'renewal campaign suggested' },
          { label: 'Revoked (30d)', value: 9, icon: FileX2, tint: '#EF4444' },
        ]} />
        <Panel title="Recent Records" subtitle="A valid consent is required before any hard inquiry is honoured">
          <Table head={['Consumer', 'Scope', 'Channel', 'Granted', 'Expires', 'Status', '']}>
            {consents.map(c => (
              <tr key={c.consumer} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{c.consumer}</Td>
                <Td className="text-muted-foreground">{c.scope}</Td>
                <Td><Badge tone="slate">{c.channel}</Badge></Td>
                <Td className="text-muted-foreground">{c.granted}</Td>
                <Td className="text-muted-foreground">{c.expires}</Td>
                <Td><Badge tone={c.status === 'active' ? 'green' : c.status === 'expiring' ? 'amber' : 'red'}>{c.status}</Badge></Td>
                <Td>{c.status === 'expiring' && <button className="text-xs font-medium text-blue-600 hover:underline">Request renewal</button>}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
