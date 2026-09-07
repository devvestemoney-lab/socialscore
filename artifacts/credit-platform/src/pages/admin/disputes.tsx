import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Scale, FolderOpen, SearchCheck, CheckCircle2, Timer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const STATUS_META: Record<string, { label: string; tone: string }> = {
  open: { label: 'open', tone: 'red' },
  under_investigation: { label: 'under investigation', tone: 'blue' },
  awaiting_institution: { label: 'awaiting institution', tone: 'amber' },
  escalated: { label: 'escalated', tone: 'red' },
  resolved_upheld: { label: 'resolved — upheld', tone: 'green' },
  resolved_rejected: { label: 'resolved — rejected', tone: 'slate' },
  dismissed: { label: 'dismissed', tone: 'slate' },
};
const FILTERS = ['all', 'open', 'under_investigation', 'awaiting_institution', 'escalated'];
const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function Disputes() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [closing, setClosing] = useState<any>(null); // dispute being resolved
  const [resolution, setResolution] = useState('');
  const [outcome, setOutcome] = useState('resolved_upheld');
  const [saving, setSaving] = useState(false);

  async function load(f = filter) {
    const res = await request(`${API}/admin/disputes${f !== 'all' ? `?status=${f}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load('all'); }, []);
  const setF = (f: string) => { setFilter(f); load(f); };

  async function advance(d: any, status: string) {
    await request(`${API}/admin/disputes/${d.id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    load();
  }

  async function close(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await request(`${API}/admin/disputes/${closing.id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: outcome, resolution }),
    });
    setSaving(false); setClosing(null); setResolution('');
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { disputes, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Scale} tint="#F59E0B" title="Disputes"
          subtitle="Consumer disputes lodged against bureau records, tracked to statutory deadlines" />

        <KpiGrid items={[
          { label: 'Open Disputes', value: summary.open, icon: FolderOpen, tint: '#EF4444', sub: summary.pastSla ? `${summary.pastSla} past SLA` : 'all within SLA' },
          { label: 'Under Investigation', value: summary.investigating, icon: SearchCheck, tint: '#4F6EF7' },
          { label: 'Resolved (30d)', value: summary.resolved30d, icon: CheckCircle2, tint: '#10B981', sub: summary.resolved30d ? `${Math.round((summary.upheld30d / summary.resolved30d) * 100)}% upheld` : undefined },
          { label: 'Avg Resolution Time', value: `${summary.avgResolutionDays} days`, icon: Timer, tint: '#F59E0B', sub: 'statutory limit: 21 days' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setF(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                filter === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
              {f === 'all' ? 'all' : STATUS_META[f].label}
            </button>
          ))}
        </div>

        <Panel title="Dispute Register" subtitle="21-day statutory resolution window per BoZ CRB directives">
          <Table head={['Case ID', 'Consumer', 'Institution', 'Dispute Type', 'Opened', 'Age', 'Status', 'Actions']}>
            {disputes.map((d: any) => {
              const active = !d.resolvedAt;
              const age = ageDays(d.openedAt);
              const overdue = active && new Date(d.dueAt).getTime() < Date.now();
              return (
                <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs text-blue-600">{d.caseNo}</Td>
                  <Td className="font-semibold text-gray-900">{d.consumerName}</Td>
                  <Td>{d.institutionName}</Td>
                  <Td className="text-muted-foreground">{d.type}</Td>
                  <Td className="text-muted-foreground">{new Date(d.openedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Td>
                  <Td className={overdue ? 'text-rose-600 font-semibold' : ''}>{age} day{age !== 1 ? 's' : ''}{overdue ? ' ⚠' : ''}</Td>
                  <Td><Badge tone={STATUS_META[d.status].tone}>{STATUS_META[d.status].label}</Badge></Td>
                  <Td>
                    {active && (
                      <div className="flex items-center gap-3">
                        {d.status === 'open' && <button onClick={() => advance(d, 'under_investigation')} className="text-xs font-medium text-blue-600 hover:underline">Investigate</button>}
                        {d.status === 'under_investigation' && <button onClick={() => advance(d, 'awaiting_institution')} className="text-xs font-medium text-amber-600 hover:underline">Refer</button>}
                        {['under_investigation', 'awaiting_institution'].includes(d.status) && <button onClick={() => advance(d, 'escalated')} className="text-xs font-medium text-rose-600 hover:underline">Escalate</button>}
                        <button onClick={() => setClosing(d)} className="text-xs font-medium text-emerald-600 hover:underline">Resolve</button>
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
            {disputes.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground">No disputes for this filter.</Td></tr>}
          </Table>
        </Panel>
      </div>

      <Modal open={!!closing} onClose={() => setClosing(null)} title={`Resolve ${closing?.caseNo ?? ''}`}
        subtitle={closing ? `${closing.consumerName} vs ${closing.institutionName} — ${closing.type}` : undefined}>
        <form onSubmit={close} className="space-y-4">
          <Field label="Outcome">
            <select className={inputCls} value={outcome} onChange={e => setOutcome(e.target.value)}>
              <option value="resolved_upheld">Upheld — record will be corrected</option>
              <option value="resolved_rejected">Rejected — record verified accurate</option>
              <option value="dismissed">Dismissed — invalid or duplicate case</option>
            </select>
          </Field>
          <Field label="Resolution Note">
            <textarea required rows={3} className={inputCls} value={resolution} placeholder="Summarise the investigation outcome…"
              onChange={e => setResolution(e.target.value)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setClosing(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Close Dispute
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
