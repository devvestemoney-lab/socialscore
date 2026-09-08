import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Scale, Plus, Loader2, CheckCircle2, Clock3, Info } from 'lucide-react';
import { API, fmtDate } from './kit';
import { cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'Received', tone: 'blue' },
  under_investigation: { label: 'Being investigated', tone: 'blue' },
  awaiting_institution: { label: 'With your lender', tone: 'amber' },
  escalated: { label: 'Escalated', tone: 'red' },
  resolved_upheld: { label: 'Upheld — record corrected', tone: 'green' },
  resolved_rejected: { label: 'Rejected — record stands', tone: 'slate' },
  dismissed: { label: 'Dismissed', tone: 'slate' },
};
const TYPES = [
  'This is not my account', 'The balance is wrong', 'I paid but it shows arrears',
  'This account is closed', 'This appears twice', 'The payment history is wrong',
  'I did not authorise this search', 'My personal details are wrong',
];

export default function MyDisputes() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ institution: '', type: TYPES[0], description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  async function load() {
    const res = await request(`${API}/consumer/disputes`);
    setData(res.ok ? await res.json() : { disputes: [], institutions: [], summary: {} });
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    const res = await request(`${API}/consumer/disputes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Could not raise the dispute'); return; }
    setDone(body.dispute); setForm({ institution: '', type: TYPES[0], description: '' });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { disputes, institutions, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Scale} tint="#F59E0B" title="Disputes & Corrections"
          subtitle="Challenge anything on your file you believe is wrong — it's free"
          actions={
            <button onClick={() => { setShow(true); setDone(null); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Raise a dispute
            </button>
          } />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Open cases', value: summary.open ?? 0, tint: summary.open ? '#F59E0B' : '#94A3B8', icon: Clock3 },
            { label: 'Resolved', value: summary.resolved ?? 0, tint: '#4F6EF7', icon: CheckCircle2 },
            { label: 'Corrected in your favour', value: summary.upheld ?? 0, tint: '#10B981', icon: CheckCircle2 },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Panel padded>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900">How disputes work</p>
              <p className="mt-1 text-muted-foreground">
                When you raise a dispute the bureau contacts the lender who reported the record. They must respond with
                evidence, and the bureau must resolve your case <b>within 21 days</b>. If the record is wrong it is corrected
                and your score is recalculated. You'll be alerted at every step.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Your disputes" subtitle="Cases you have raised with the bureau">
          <Table head={['Case', 'About', 'Lender', 'Raised', 'Bureau deadline', 'Status']}>
            {disputes.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-emerald-700">{d.caseNo}</Td>
                <Td className="font-medium text-gray-900 max-w-[240px] whitespace-normal">{d.type}</Td>
                <Td className="text-muted-foreground">{d.institutionName}</Td>
                <Td className="text-muted-foreground">{fmtDate(d.openedAt)}</Td>
                <Td className={cn('text-muted-foreground', !d.resolvedAt && new Date(d.dueAt) < new Date() && 'text-rose-600 font-semibold')}>
                  {fmtDate(d.dueAt)}
                </Td>
                <Td><Badge tone={STATUS[d.status]?.tone ?? 'slate'}>{STATUS[d.status]?.label ?? d.status}</Badge></Td>
              </tr>
            ))}
            {disputes.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">You haven't raised any disputes.</Td></tr>}
          </Table>
        </Panel>
      </div>

      <Modal open={show} onClose={() => setShow(false)} wide title="Raise a dispute"
        subtitle="Tell us what's wrong and we'll investigate with the lender">
        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-display font-bold text-lg text-gray-900">Dispute {done.caseNo} raised</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              We've contacted {done.institutionName}. They must respond with evidence, and the bureau will resolve your
              case by {fmtDate(done.dueAt)}. We'll alert you at each step.
            </p>
            <button onClick={() => setShow(false)} className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <Field label="Which lender reported it?">
              <select required className={inputCls} value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}>
                <option value="">Choose a lender…</option>
                {institutions.map((i: string) => <option key={i} value={i}>{i}</option>)}
                <option value="Unknown / not listed">I don't recognise the lender</option>
              </select>
            </Field>
            <Field label="What's wrong?">
              <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Tell us more" hint="at least 20 characters — the more detail, the faster we can resolve it">
              <textarea required rows={4} className={inputCls} value={form.description}
                placeholder="For example: I settled this loan in March 2026 and have the receipt, but it still shows K12,000 outstanding."
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShow(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={busy || !form.institution || form.description.trim().length < 20}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit dispute
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
