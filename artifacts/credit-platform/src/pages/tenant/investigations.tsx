import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { SearchCheck, Paperclip, Clock3, AlertTriangle, MessageSquare } from 'lucide-react';
import { DisputeCase, DISPUTE_STATUS, fmtDate } from './dispute-case';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export default function Investigations() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const res = await request(`${API}/tenant/disputes?scope=investigations`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { disputes, summary } = data;
  const noEvidence = disputes.filter((d: any) => d.responses === 0).length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={SearchCheck} tint="#4F6EF7" title="Investigations"
          subtitle="Cases under investigation where the bureau expects evidence from your institution" />

        <KpiGrid items={[
          { label: 'Under Investigation', value: summary.investigating, icon: SearchCheck, tint: '#4F6EF7' },
          { label: 'Awaiting Your Evidence', value: noEvidence, icon: Paperclip, tint: noEvidence ? '#EF4444' : '#94A3B8' },
          { label: 'Past SLA', value: summary.pastSla, icon: AlertTriangle, tint: summary.pastSla ? '#EF4444' : '#94A3B8' },
          { label: 'Avg Response Time', value: `${summary.avgResponseDays ?? 0} days`, icon: Clock3, tint: '#8B5CF6', sub: 'target: 5 days' },
        ]} />

        <Panel title="Open Investigations" subtitle="Submit evidence or an interim update from the case file">
          <Table head={['Case', 'Consumer', 'Claim', 'Opened', 'Deadline', 'Evidence', 'Status', '']}>
            {disputes.map((d: any) => {
              const overdue = new Date(d.dueAt) < new Date();
              return (
                <tr key={d.id} onClick={() => setOpenId(d.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <Td className="font-mono text-xs text-blue-600">{d.caseNo}</Td>
                  <Td className="font-semibold text-gray-900">{d.consumerName}</Td>
                  <Td className="text-muted-foreground max-w-[240px] truncate">{d.type}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.openedAt)}</Td>
                  <Td className={overdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{fmtDate(d.dueAt)}</Td>
                  <Td>
                    <span className={cn('inline-flex items-center gap-1.5 text-sm', d.responses ? 'text-gray-700' : 'text-rose-600 font-medium')}>
                      <Paperclip className="w-3.5 h-3.5" /> {d.responses || 'none submitted'}
                    </span>
                  </Td>
                  <Td><Badge tone={DISPUTE_STATUS[d.status].tone}>{DISPUTE_STATUS[d.status].label}</Badge></Td>
                  <Td><span className="text-xs font-semibold text-blue-600">Upload evidence</span></Td>
                </tr>
              );
            })}
            {disputes.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No open investigations.</Td></tr>}
          </Table>
        </Panel>
      </div>
      {openId && <DisputeCase id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </Layout>
  );
}
