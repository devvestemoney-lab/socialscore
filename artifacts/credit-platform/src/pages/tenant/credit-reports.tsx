import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Pager } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileText, CalendarDays, Timer, XCircle } from 'lucide-react';
import { ReportView, statusTone, bandTone } from './report-view';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString()
    ? `${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

/* ═══════════════ Report log (list) ═══════════════ */

export default function TenantCreditReports() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  async function load(p = page, st = status) {
    const res = await request(`${API}/tenant/credit-reports?page=${p}&limit=${LIMIT}${st !== 'all' ? `&status=${st}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(1, 'all'); }, []);

  const setFilter = (st: string) => { setStatus(st); setPage(1); load(1, st); };
  const onPage = (p: number) => { setPage(p); load(p); };

  if (openId) return <Layout><ReportView id={openId} onBack={() => setOpenId(null)} /></Layout>;

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { reports, total, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileText} tint="#10B981" title="Credit Reports"
          subtitle="Reports pulled by your institution — click any row to open the full report" />

        <KpiGrid items={[
          { label: 'Reports This Month', value: summary.thisMonth.toLocaleString(), icon: FileText, tint: '#10B981', sub: 'of 25,000 quota' },
          { label: 'Today', value: summary.today, icon: CalendarDays, tint: '#4F6EF7' },
          { label: 'Avg Generation Time', value: `${(summary.avgGenerationMs / 1000).toFixed(1)}s`, icon: Timer, tint: '#F59E0B' },
          { label: 'Failed Pulls (30d)', value: summary.failed30d, icon: XCircle, tint: '#EF4444', sub: 'not billed' },
        ]} />

        <div className="flex gap-2">
          {['all', 'delivered', 'partial', 'failed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                status === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
              {f}
            </button>
          ))}
        </div>

        <Panel title="Report Log" subtitle={`${total.toLocaleString()} reports on record for your institution`}>
          <Table head={['Reference', 'Consumer', 'Purpose', 'Score Band', 'Generated', 'Status', '']}>
            {reports.map((r: any) => (
              <tr key={r.id} onClick={() => setOpenId(r.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-mono text-xs text-blue-600">{r.reference}</Td>
                <Td className="font-semibold text-gray-900">{r.consumerName}</Td>
                <Td className="text-muted-foreground max-w-[240px] truncate">{r.purpose}</Td>
                <Td>{r.band ? <Badge tone={bandTone[r.band]}>{r.band} ({r.score})</Badge> : <Badge tone="slate">—</Badge>}</Td>
                <Td className="text-muted-foreground">{fmtWhen(r.createdAt)}</Td>
                <Td><Badge tone={statusTone[r.status]}>{r.status}</Badge></Td>
                <Td><span className="text-xs font-semibold text-blue-600">Open →</span></Td>
              </tr>
            ))}
            {reports.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No reports for this filter.</Td></tr>}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={onPage} />
        </Panel>
      </div>
    </Layout>
  );
}
