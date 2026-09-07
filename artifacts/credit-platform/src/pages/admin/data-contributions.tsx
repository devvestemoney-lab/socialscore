import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { UploadCloud, FileStack, FileX2, Clock3, RotateCcw } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const statusTone: Record<string, string> = { accepted: 'green', partial: 'amber', processing: 'blue', overdue: 'red', rejected: 'red' };
const n = (v: number) => v.toLocaleString();
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const compact = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export default function DataContributions() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(period?: string) {
    const res = await request(`${API}/admin/data-contributions${period ? `?period=${period}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function revalidate(id: string) {
    setBusy(id);
    await request(`${API}/admin/data-contributions/${id}/revalidate`, { method: 'POST' });
    setBusy(null);
    load(data.period);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { submissions, summary, period, periods } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UploadCloud} tint="#4F6EF7" title="Data Contributions"
          subtitle="Monthly data submissions from participating institutions"
          actions={
            <select value={period} onChange={e => load(e.target.value)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 outline-none">
              {periods.map((p: string) => <option key={p} value={p}>{fmtPeriod(p)}</option>)}
            </select>
          } />

        <KpiGrid items={[
          { label: 'Submissions This Cycle', value: `${summary.received} / ${summary.expected}`, icon: UploadCloud, tint: '#4F6EF7', sub: `${fmtPeriod(period)} reporting period` },
          { label: 'Records Ingested', value: compact(summary.ingested), icon: FileStack, tint: '#10B981' },
          { label: 'Rejected Records', value: n(summary.rejected), icon: FileX2, tint: '#EF4444', sub: `${summary.rejectionRate}% rejection rate` },
          { label: 'On-time Submission Rate', value: `${summary.onTimeRate}%`, icon: Clock3, tint: '#F59E0B', sub: summary.received < summary.expected ? `${summary.expected - summary.received} institution(s) overdue` : 'all received' },
        ]} />

        <Panel title={`${fmtPeriod(period)} Reporting Cycle`} subtitle="Due on the 5th of the following month · format CRB-XML v3">
          <Table head={['Institution', 'Records Submitted', 'Accepted', 'Rejected', 'Status', 'Submitted At', 'Actions']}>
            {submissions.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{s.institutionName}</Td>
                <Td>{s.recordsSubmitted ? n(s.recordsSubmitted) : '—'}</Td>
                <Td className="text-emerald-600">{s.recordsAccepted ? n(s.recordsAccepted) : '—'}</Td>
                <Td className={s.recordsRejected > 10000 ? 'text-rose-600 font-semibold' : ''}>{s.recordsRejected ? n(s.recordsRejected) : '—'}</Td>
                <Td><Badge tone={statusTone[s.status]}>{s.status}</Badge></Td>
                <Td className="text-muted-foreground">
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(s.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </Td>
                <Td>
                  {['partial', 'rejected'].includes(s.status) && (
                    <button onClick={() => revalidate(s.id)} disabled={busy === s.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50">
                      <RotateCcw className={busy === s.id ? 'w-3 h-3 animate-spin' : 'w-3 h-3'} /> Revalidate
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
