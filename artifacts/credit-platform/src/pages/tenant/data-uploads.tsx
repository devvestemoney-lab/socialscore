import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { HardDriveUpload } from 'lucide-react';

const uploads = [
  { id: 'UPL-3311', file: 'zanaco_aug2026_full.xml', size: '184 MB', records: 412330, progress: 100, status: 'accepted', at: '01 Sep 06:12' },
  { id: 'UPL-3298', file: 'zanaco_jul2026_full.xml', size: '181 MB', records: 408112, progress: 100, status: 'accepted', at: '02 Aug 07:30' },
  { id: 'UPL-3287', file: 'zanaco_jul2026_corrections.csv', size: '2.1 MB', records: 4110, progress: 100, status: 'accepted', at: '11 Aug 10:04' },
  { id: 'UPL-3266', file: 'zanaco_jun2026_full.xml', size: '178 MB', records: 401877, progress: 100, status: 'accepted with errors', at: '03 Jul 09:12' },
  { id: 'UPL-3251', file: 'zanaco_jun2026_full_v1.xml', size: '178 MB', records: 0, progress: 32, status: 'failed — malformed XML', at: '02 Jul 22:41' },
];

export default function DataUploads() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={HardDriveUpload} tint="#6366F1" title="Data Uploads"
          subtitle="Files your institution has transmitted to the bureau" />
        <Panel title="Upload History">
          <Table head={['ID', 'File', 'Size', 'Records', 'Processing', 'Status', 'Uploaded']}>
            {uploads.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{u.id}</Td>
                <Td className="font-mono text-xs text-gray-900">{u.file}</Td>
                <Td className="text-muted-foreground">{u.size}</Td>
                <Td>{u.records ? u.records.toLocaleString() : '—'}</Td>
                <Td className="w-36"><Bar value={u.progress} color={u.status.startsWith('failed') ? '#EF4444' : '#10B981'} /></Td>
                <Td><Badge tone={u.status === 'accepted' ? 'green' : u.status.startsWith('failed') ? 'red' : 'amber'}>{u.status}</Badge></Td>
                <Td className="text-muted-foreground">{u.at}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
