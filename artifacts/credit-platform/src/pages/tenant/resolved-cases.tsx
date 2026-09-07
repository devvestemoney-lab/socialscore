import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { CheckCircle2, ThumbsUp, ThumbsDown, Timer, Download } from 'lucide-react';
import { DisputeCase, DISPUTE_STATUS, fmtDate } from './dispute-case';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export default function ResolvedCases() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const res = await request(`${API}/tenant/disputes?scope=closed`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  function exportCsv() {
    const rows = [['Case', 'Consumer', 'Type', 'Outcome', 'Opened', 'Resolved', 'Resolution'],
      ...data.disputes.map((d: any) => [d.caseNo, d.consumerName, d.type,
        DISPUTE_STATUS[d.status].label, fmtDate(d.openedAt), fmtDate(d.resolvedAt), `"${(d.resolution ?? '').replace(/"/g, '""')}"`])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `resolved-disputes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { disputes, summary } = data;
  const upheldRate = summary.resolved90d ? Math.round((summary.upheld90d / summary.resolved90d) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={CheckCircle2} tint="#10B981" title="Resolved Cases"
          subtitle="Closed disputes involving records your institution reported"
          actions={<button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium"><Download className="w-4 h-4" /> Export CSV</button>} />

        <KpiGrid items={[
          { label: 'Resolved (90d)', value: summary.resolved90d, icon: CheckCircle2, tint: '#4F6EF7' },
          { label: 'Upheld — record corrected', value: summary.upheld90d, icon: ThumbsUp, tint: '#F59E0B', sub: `${upheldRate}% of resolved` },
          { label: 'Rejected — record accurate', value: summary.resolved90d - summary.upheld90d, icon: ThumbsDown, tint: '#10B981' },
          { label: 'Avg Resolution', value: `${summary.avgResolutionDays} days`, icon: Timer, tint: '#8B5CF6', sub: 'within 21-day SLA' },
        ]} />

        <Panel title="Case Outcomes" subtitle="Click a case to review the full file and correspondence">
          <Table head={['Case', 'Consumer', 'Type', 'Outcome', 'Bureau Ruling', 'Opened', 'Closed', 'Days']}>
            {disputes.map((d: any) => {
              const days = d.resolvedAt ? Math.round((new Date(d.resolvedAt).getTime() - new Date(d.openedAt).getTime()) / 86_400_000) : null;
              return (
                <tr key={d.id} onClick={() => setOpenId(d.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <Td className="font-mono text-xs text-blue-600">{d.caseNo}</Td>
                  <Td className="font-semibold text-gray-900">{d.consumerName}</Td>
                  <Td className="text-muted-foreground">{d.type}</Td>
                  <Td><Badge tone={DISPUTE_STATUS[d.status].tone}>{DISPUTE_STATUS[d.status].label}</Badge></Td>
                  <Td className="text-muted-foreground max-w-[300px] whitespace-normal text-xs">{d.resolution ?? '—'}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.openedAt)}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.resolvedAt)}</Td>
                  <Td className={days && days > 21 ? 'text-rose-600 font-semibold' : ''}>{days ?? '—'}</Td>
                </tr>
              );
            })}
            {disputes.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No resolved cases yet.</Td></tr>}
          </Table>
        </Panel>
      </div>
      {openId && <DisputeCase id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </Layout>
  );
}
