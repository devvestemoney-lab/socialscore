import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Timer, AlertTriangle, CheckCircle2, Gauge, Clock3 } from 'lucide-react';
import { DisputeCase, DISPUTE_STATUS, fmtDate } from './dispute-case';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const BUCKETS = ['0-5 days', '6-10 days', '11-15 days', '16-21 days', 'Past 21 days'];
const BUCKET_COLOR: Record<string, string> = {
  '0-5 days': '#10B981', '6-10 days': '#4F6EF7', '11-15 days': '#F59E0B',
  '16-21 days': '#F97316', 'Past 21 days': '#EF4444',
};

export default function SlaTracking() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    const res = await request(`${API}/tenant/disputes?scope=active`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { disputes, summary, ageing } = data;
  const buckets = BUCKETS.map(b => ({ label: b, n: ageing.find((a: any) => a.bucket === b)?.n ?? 0 }));
  const max = Math.max(1, ...buckets.map(b => b.n));
  const compliance = summary.open ? Math.round(((summary.open - summary.pastSla) / summary.open) * 100) : 100;
  const breaching = disputes.filter((d: any) => new Date(d.dueAt) < new Date() || Math.ceil((new Date(d.dueAt).getTime() - Date.now()) / 86_400_000) <= 5);

  const slas = [
    { metric: 'Dispute first response', target: '5 working days', actual: `${summary.avgResponseDays ?? 0} days`, ok: (summary.avgResponseDays ?? 0) <= 5 },
    { metric: 'Bureau resolution window', target: '21 days', actual: `${summary.avgResolutionDays} days avg`, ok: summary.avgResolutionDays <= 21 },
    { metric: 'Cases within SLA', target: '100%', actual: `${compliance}%`, ok: compliance >= 95 },
    { metric: 'Evidence provided on request', target: 'Every investigation', actual: `${disputes.filter((d: any) => d.responses > 0).length} of ${disputes.length} active`, ok: disputes.every((d: any) => d.responses > 0) },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Timer} tint="#8B5CF6" title="SLA Tracking"
          subtitle="Your statutory and contractual service-level performance on disputes" />

        <KpiGrid items={[
          { label: 'SLA Compliance', value: `${compliance}%`, icon: Gauge, tint: compliance >= 95 ? '#10B981' : '#F59E0B', sub: 'active cases within window' },
          { label: 'Breached', value: summary.pastSla, icon: AlertTriangle, tint: summary.pastSla ? '#EF4444' : '#94A3B8', sub: 'past 21 days' },
          { label: 'At Risk (≤5 days)', value: summary.dueThisWeek, icon: Clock3, tint: '#F59E0B' },
          { label: 'On Track', value: Math.max(0, summary.open - summary.pastSla - summary.dueThisWeek), icon: CheckCircle2, tint: '#10B981' },
          { label: 'Avg Resolution', value: `${summary.avgResolutionDays}d`, icon: Timer, tint: '#4F6EF7' },
        ]} />

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Open Case Ageing" subtitle="Against the 21-day statutory window" padded>
            <div className="space-y-4">
              {buckets.map(b => (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className={cn('font-medium', b.n ? 'text-gray-900' : 'text-gray-400')}>{b.label}</span>
                    <span className="text-muted-foreground">{b.n} case{b.n !== 1 ? 's' : ''}</span>
                  </div>
                  <Bar value={(b.n / max) * 100} color={b.n ? BUCKET_COLOR[b.label] : '#E2E8F0'} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="SLA Scorecard">
            <Table head={['Metric', 'Target', 'Your Performance', 'Status']}>
              {slas.map(s => (
                <tr key={s.metric} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-medium text-gray-900">{s.metric}</Td>
                  <Td className="text-muted-foreground">{s.target}</Td>
                  <Td>{s.actual}</Td>
                  <Td><Badge tone={s.ok ? 'green' : 'amber'}>{s.ok ? 'meeting' : 'watch'}</Badge></Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </div>

        <Panel title="Cases Needing Attention" subtitle="Breached or due within 5 days — click to open the case file">
          <Table head={['Case', 'Consumer', 'Type', 'Deadline', 'Days', 'Correspondence', 'Status']}>
            {breaching.map((d: any) => {
              const days = Math.ceil((new Date(d.dueAt).getTime() - Date.now()) / 86_400_000);
              return (
                <tr key={d.id} onClick={() => setOpenId(d.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <Td className="font-mono text-xs text-blue-600">{d.caseNo}</Td>
                  <Td className="font-semibold text-gray-900">{d.consumerName}</Td>
                  <Td className="text-muted-foreground">{d.type}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.dueAt)}</Td>
                  <Td className={days < 0 ? 'text-rose-600 font-bold' : 'text-amber-600 font-semibold'}>{days < 0 ? `${Math.abs(days)}d over` : `${days}d left`}</Td>
                  <Td className={d.responses ? 'text-muted-foreground' : 'text-rose-600 font-medium'}>{d.responses || 'none'}</Td>
                  <Td><Badge tone={DISPUTE_STATUS[d.status].tone}>{DISPUTE_STATUS[d.status].label}</Badge></Td>
                </tr>
              );
            })}
            {breaching.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No cases at risk — everything is comfortably within SLA.</Td></tr>}
          </Table>
        </Panel>
      </div>
      {openId && <DisputeCase id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </Layout>
  );
}
