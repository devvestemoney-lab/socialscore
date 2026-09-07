import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { History, CheckCircle2, Clock3, FileStack, FileX2, Download } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const n = (v: number) => v.toLocaleString();
const compact = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : n(v));
const statusTone: Record<string, string> = { accepted: 'green', partial: 'amber', processing: 'blue', overdue: 'red', rejected: 'red' };
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function SubmissionHistory() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/submissions`);
      setData(res.ok ? await res.json() : { cycles: [], summary: {} });
    })();
  }, []);

  function exportCsv() {
    const rows = [['Period', 'Submitted', 'Accepted', 'Rejected', 'Status', 'Submitted at'],
      ...data.cycles.map((c: any) => [c.period, c.recordsSubmitted, c.recordsAccepted, c.recordsRejected, c.status, fmtDate(c.submittedAt)])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'submission-history.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { cycles, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={History} tint="#14B8A6" title="Submission History"
          subtitle="Your monthly reporting cycles and how the bureau received them"
          actions={<button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium"><Download className="w-4 h-4" /> Export</button>} />

        <KpiGrid items={[
          { label: 'Cycles Submitted', value: summary.cycles ?? 0, icon: CheckCircle2, tint: '#10B981', sub: summary.overdue ? `${summary.overdue} overdue` : 'none overdue' },
          { label: 'On-time Rate', value: `${summary.onTimeRate ?? 0}%`, icon: Clock3, tint: (summary.onTimeRate ?? 0) >= 90 ? '#10B981' : '#F59E0B' },
          { label: 'Records Submitted', value: compact(summary.submitted ?? 0), icon: FileStack, tint: '#4F6EF7' },
          { label: 'Acceptance Rate', value: `${summary.acceptanceRate ?? 0}%`, icon: CheckCircle2, tint: '#14B8A6' },
          { label: 'Rejected Records', value: n(summary.rejected ?? 0), icon: FileX2, tint: (summary.rejected ?? 0) > 0 ? '#EF4444' : '#94A3B8' },
        ]} />

        <Panel title="Reporting Cycles" subtitle="Due by the 5th of the following month">
          <Table head={['Period', 'Submitted', 'Accepted', 'Rejected', 'Acceptance', '', 'Status', 'Received']}>
            {cycles.map((c: any) => {
              const rate = c.recordsSubmitted > 0 ? (c.recordsAccepted / c.recordsSubmitted) * 100 : 0;
              return (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{fmtPeriod(c.period)}</Td>
                  <Td>{c.recordsSubmitted ? n(c.recordsSubmitted) : '—'}</Td>
                  <Td className="text-emerald-600">{c.recordsAccepted ? n(c.recordsAccepted) : '—'}</Td>
                  <Td className={c.recordsRejected > 1000 ? 'text-rose-600 font-semibold' : ''}>{c.recordsRejected ? n(c.recordsRejected) : '—'}</Td>
                  <Td className="font-medium">{c.recordsSubmitted ? `${rate.toFixed(1)}%` : '—'}</Td>
                  <Td className="w-32">{c.recordsSubmitted > 0 && <Bar value={rate} color={rate >= 99 ? '#10B981' : rate >= 95 ? '#F59E0B' : '#EF4444'} />}</Td>
                  <Td><Badge tone={statusTone[c.status] ?? 'slate'}>{c.status}</Badge></Td>
                  <Td className="text-muted-foreground">{fmtDate(c.submittedAt)}</Td>
                </tr>
              );
            })}
            {cycles.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No reporting cycles on record.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
