import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Pager } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileText, CalendarDays, Timer, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const statusTone: Record<string, string> = { delivered: 'green', partial: 'amber', failed: 'red' };
const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red' };

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? `${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function CreditReports() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  async function load(p = page, st = status) {
    const res = await request(`${API}/admin/credit-reports?page=${p}&limit=${LIMIT}${st !== 'all' ? `&status=${st}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(1, 'all'); }, []);

  const setFilter = (st: string) => { setStatus(st); setPage(1); load(1, st); };
  const onPage = (p: number) => { setPage(p); load(p); };

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { reports, total, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileText} tint="#10B981" title="Credit Reports"
          subtitle="Reports generated across all institutions with delivery status" />

        <KpiGrid items={[
          { label: 'Reports Generated (All Time)', value: summary.allTime.toLocaleString(), icon: FileText, tint: '#10B981' },
          { label: 'This Month', value: summary.thisMonth.toLocaleString(), icon: CalendarDays, tint: '#4F6EF7' },
          { label: 'Avg Generation Time', value: `${(summary.avgGenerationMs / 1000).toFixed(1)}s`, icon: Timer, tint: '#F59E0B' },
          { label: 'Failure Rate (30d)', value: `${summary.failureRate}%`, icon: XCircle, tint: '#EF4444' },
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

        <Panel title="Report Log" subtitle="Live feed across all tenants">
          <Table head={['Reference', 'Consumer', 'Requesting Institution', 'Purpose', 'Score', 'Generated', 'Time', 'Status']}>
            {reports.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{r.reference}</Td>
                <Td className="font-semibold text-gray-900">{r.consumerName}</Td>
                <Td>{r.institutionName}</Td>
                <Td className="text-muted-foreground max-w-[220px] truncate">{r.purpose}</Td>
                <Td>{r.band ? <Badge tone={bandTone[r.band]}>{r.band} ({r.score})</Badge> : <Badge tone="slate">{r.status === 'failed' ? '—' : 'unscored'}</Badge>}</Td>
                <Td className="text-muted-foreground">{fmtWhen(r.createdAt)}</Td>
                <Td className={cn('text-muted-foreground', r.generationMs > 4000 && 'text-rose-600 font-semibold')}>{(r.generationMs / 1000).toFixed(1)}s</Td>
                <Td><Badge tone={statusTone[r.status]}>{r.status}</Badge></Td>
              </tr>
            ))}
            {reports.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground">No reports for this filter.</Td></tr>}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={onPage} />
        </Panel>
      </div>
    </Layout>
  );
}
