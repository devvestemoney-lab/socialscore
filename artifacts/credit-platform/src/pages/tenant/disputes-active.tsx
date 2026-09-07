import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Scale, FolderOpen, MessageSquare, Clock3, AlertTriangle } from 'lucide-react';
import { DisputeCase, DISPUTE_STATUS, fmtDate } from './dispute-case';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const FILTERS = ['all', 'awaiting_institution', 'under_investigation', 'escalated', 'open'];

export default function ActiveDisputes() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  async function load(f = filter) {
    const res = await request(`${API}/tenant/disputes?scope=active${f !== 'all' ? `&status=${f}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load('all'); }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { disputes, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Scale} tint="#F59E0B" title="Active Disputes"
          subtitle="Consumer disputes lodged against records your institution reported" />

        <KpiGrid items={[
          { label: 'Open Against You', value: summary.open, icon: FolderOpen, tint: '#EF4444', sub: `${summary.awaitingUs} need your response` },
          { label: 'Awaiting Your Response', value: summary.awaitingUs, icon: MessageSquare, tint: '#F59E0B' },
          { label: 'Past 21-day SLA', value: summary.pastSla, icon: AlertTriangle, tint: summary.pastSla ? '#EF4444' : '#94A3B8' },
          { label: 'Due This Week', value: summary.dueThisWeek, icon: Clock3, tint: '#4F6EF7' },
          { label: 'Avg Response Time', value: `${summary.avgResponseDays ?? 0} days`, icon: Scale, tint: '#8B5CF6', sub: 'target: 5 days' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); load(f); }}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                filter === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
              {f === 'all' ? 'All active' : DISPUTE_STATUS[f].label}
            </button>
          ))}
        </div>

        <Panel title="Dispute Queue" subtitle="Ordered by bureau deadline — click a case to open the file and respond">
          <Table head={['Case', 'Consumer', 'Type', 'Opened', 'Bureau Due', 'Correspondence', 'Status', '']}>
            {disputes.map((d: any) => {
              const overdue = new Date(d.dueAt) < new Date();
              const days = Math.ceil((new Date(d.dueAt).getTime() - Date.now()) / 86_400_000);
              return (
                <tr key={d.id} onClick={() => setOpenId(d.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <Td className="font-mono text-xs text-blue-600">{d.caseNo}</Td>
                  <Td>
                    <p className="font-semibold text-gray-900">{d.consumerName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{d.nrc}</p>
                  </Td>
                  <Td className="text-muted-foreground">{d.type}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.openedAt)}</Td>
                  <Td className={overdue ? 'text-rose-600 font-semibold' : days <= 5 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                    {fmtDate(d.dueAt)}{overdue ? ` · ${Math.abs(days)}d over` : ` · ${days}d left`}
                  </Td>
                  <Td className="text-muted-foreground">{d.responses ? `${d.responses} item(s)` : <span className="text-rose-500 font-medium">none</span>}</Td>
                  <Td><Badge tone={DISPUTE_STATUS[d.status].tone}>{DISPUTE_STATUS[d.status].label}</Badge></Td>
                  <Td><span className="text-xs font-semibold text-blue-600">{d.status === 'awaiting_institution' ? 'Respond' : 'Open'}</span></Td>
                </tr>
              );
            })}
            {disputes.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No active disputes — your record is clean.</Td></tr>}
          </Table>
        </Panel>
      </div>
      {openId && <DisputeCase id={openId} onClose={() => setOpenId(null)} onChanged={() => load()} />}
    </Layout>
  );
}
