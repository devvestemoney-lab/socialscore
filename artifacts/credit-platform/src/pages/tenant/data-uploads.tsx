import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { HardDriveUpload, CheckCircle2, AlertTriangle, XCircle, FileStack } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const n = (v: number) => v.toLocaleString();
const mb = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const statusTone: Record<string, string> = { accepted: 'green', accepted_with_errors: 'amber', rejected: 'red', failed: 'red', validating: 'blue' };
const fmtDateTime = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const FORMAT: Record<string, string> = { crb_xml_v3: 'CRB-XML v3', csv_batch: 'CSV batch', corrections: 'Corrections' };

export default function DataUploads() {
  const { request } = useAuth();
  const [uploads, setUploads] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/uploads`);
      setUploads(res.ok ? (await res.json()).uploads : []);
    })();
  }, []);

  if (!uploads) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const accepted = uploads.filter(u => u.status === 'accepted').length;
  const withErrors = uploads.filter(u => u.status === 'accepted_with_errors').length;
  const failed = uploads.filter(u => ['rejected', 'failed'].includes(u.status)).length;
  const records = uploads.reduce((a, u) => a + u.recordsAccepted, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={HardDriveUpload} tint="#6366F1" title="Data Uploads"
          subtitle="Every batch file your institution has transmitted to the bureau" />

        <KpiGrid items={[
          { label: 'Uploads', value: uploads.length, icon: HardDriveUpload, tint: '#6366F1' },
          { label: 'Clean', value: accepted, icon: CheckCircle2, tint: '#10B981' },
          { label: 'Accepted with Errors', value: withErrors, icon: AlertTriangle, tint: '#F59E0B' },
          { label: 'Rejected', value: failed, icon: XCircle, tint: failed ? '#EF4444' : '#94A3B8' },
          { label: 'Records Ingested', value: records >= 1_000_000 ? `${(records / 1_000_000).toFixed(2)}M` : n(records), icon: FileStack, tint: '#4F6EF7' },
        ]} />

        <Panel title="Upload History">
          <Table head={['ID', 'File', 'Period', 'Format', 'Size', 'Records', 'Accepted', 'Rejected', 'Status', 'Uploaded']}>
            {uploads.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{u.uploadNo}</Td>
                <Td className="font-mono text-xs text-gray-900 max-w-[220px] truncate">{u.fileName}</Td>
                <Td className="text-muted-foreground">{u.period}</Td>
                <Td><Badge tone={u.format === 'corrections' ? 'violet' : 'slate'}>{FORMAT[u.format] ?? u.format}</Badge></Td>
                <Td className="text-muted-foreground">{mb(u.sizeBytes)}</Td>
                <Td>{u.recordsSubmitted ? n(u.recordsSubmitted) : '—'}</Td>
                <Td className="text-emerald-600">{u.recordsAccepted ? n(u.recordsAccepted) : '—'}</Td>
                <Td className={u.recordsRejected > 1000 ? 'text-rose-600 font-semibold' : ''}>{u.recordsRejected ? n(u.recordsRejected) : '—'}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[u.status] ?? 'slate'}>{u.status.replace(/_/g, ' ')}</Badge>
                    {u.progress < 100 && <div className="w-16"><Bar value={u.progress} color="#EF4444" /></div>}
                  </div>
                </Td>
                <Td className="text-muted-foreground">
                  {fmtDateTime(u.createdAt)}
                  <br /><span className="text-xs text-gray-400">{u.uploadedBy}</span>
                </Td>
              </tr>
            ))}
            {uploads.length === 0 && <tr><Td colSpan={10} className="text-center text-muted-foreground py-8">No uploads yet — submit your first batch.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
