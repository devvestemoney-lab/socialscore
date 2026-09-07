import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Pager } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileSearch, Zap, Feather, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const OUTCOME: Record<string, { label: string; tone: string }> = {
  report_issued: { label: 'report issued', tone: 'green' },
  declined_no_consent: { label: 'declined — no consent', tone: 'red' },
  declined_policy: { label: 'declined — policy', tone: 'red' },
};

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? `${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function CreditInquiries() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('all');

  async function load(p = page, k = kind) {
    const res = await request(`${API}/admin/credit-inquiries?page=${p}&limit=${LIMIT}${k !== 'all' ? `&kind=${k}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load(1, 'all'); }, []);

  const setFilter = (k: string) => { setKind(k); setPage(1); load(1, k); };
  const onPage = (p: number) => { setPage(p); load(p); };

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { inquiries, total, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileSearch} tint="#6366F1" title="Credit Inquiries"
          subtitle="Footprint of every hard and soft inquiry made against consumer files" />

        <KpiGrid items={[
          { label: 'Inquiries (30d)', value: summary.last30d.toLocaleString(), icon: FileSearch, tint: '#4F6EF7' },
          { label: 'Hard Inquiries', value: summary.hard.toLocaleString(), icon: Zap, tint: '#F59E0B', sub: `${Math.round((summary.hard / Math.max(1, summary.last30d)) * 100)}% of total` },
          { label: 'Soft Inquiries', value: summary.soft.toLocaleString(), icon: Feather, tint: '#14B8A6' },
          { label: 'Declined / Blocked', value: summary.declined.toLocaleString(), icon: Ban, tint: '#EF4444', sub: 'consent & policy blocks' },
        ]} />

        <div className="flex gap-2">
          {['all', 'hard', 'soft'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                kind === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
              {f}
            </button>
          ))}
        </div>

        <Panel title="Inquiry Log">
          <Table head={['Consumer', 'Institution', 'Type', 'Stated Purpose', 'Timestamp', 'Outcome']}>
            {inquiries.map((i: any) => (
              <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{i.consumerName}</Td>
                <Td>{i.institutionName}</Td>
                <Td><Badge tone={i.kind === 'hard' ? 'amber' : 'cyan'}>{i.kind}</Badge></Td>
                <Td className="text-muted-foreground max-w-[260px] truncate">{i.purpose}</Td>
                <Td className="text-muted-foreground">{fmtWhen(i.createdAt)}</Td>
                <Td><Badge tone={OUTCOME[i.outcome]?.tone ?? 'slate'}>{OUTCOME[i.outcome]?.label ?? i.outcome}</Badge></Td>
              </tr>
            ))}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={onPage} />
        </Panel>
      </div>
    </Layout>
  );
}
