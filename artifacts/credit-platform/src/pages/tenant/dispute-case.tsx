import { useEffect, useState } from 'react';
import { Modal, Badge, Table, Td, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  Scale, Loader2, Fingerprint, Phone, MapPin, Clock3, AlertTriangle,
  MessageSquare, Paperclip, Send, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export const DISPUTE_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'open', tone: 'red' },
  under_investigation: { label: 'under investigation', tone: 'blue' },
  awaiting_institution: { label: 'awaiting your response', tone: 'red' },
  escalated: { label: 'escalated', tone: 'red' },
  resolved_upheld: { label: 'resolved — upheld', tone: 'amber' },
  resolved_rejected: { label: 'resolved — rejected', tone: 'green' },
  dismissed: { label: 'dismissed', tone: 'slate' },
};
const POSITIONS = [
  { v: 'record_accurate', l: 'Record is accurate — dispute should be rejected' },
  { v: 'record_corrected', l: 'Error confirmed — record corrected' },
  { v: 'partially_upheld', l: 'Partially upheld — some details amended' },
  { v: 'investigating', l: 'Still investigating — interim update' },
];
export const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const money = (v: number) => `K${Math.round(v).toLocaleString()}`;
const loanTone: Record<string, string> = { active: 'green', closed: 'slate', defaulted: 'red', written_off: 'red' };

/** Shared dispute case file with the response workflow */
export function DisputeCase({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [body, setBody] = useState('');
  const [position, setPosition] = useState(POSITIONS[0].v);
  const [kind, setKind] = useState<'response' | 'evidence' | 'note'>('response');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/tenant/disputes/${id}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await request(`${API}/tenant/disputes/${id}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, position, kind }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed to submit'); return; }
    setBody(''); load(); onChanged();
  }

  const d = data?.dispute;
  const sla = data?.sla;

  return (
    <Modal open onClose={onClose} wide
      title={d ? `${d.caseNo} — ${d.type}` : 'Dispute Case File'}
      subtitle={data?.customer ? `${data.customer.firstName} ${data.customer.lastName} · opened ${fmtDate(d.openedAt)}` : undefined}>
      {!data ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

          {/* SLA banner */}
          <div className={cn('flex items-center gap-3 p-4 rounded-xl border',
            sla.breached ? 'bg-rose-500/5 border-rose-500/25' : sla.daysRemaining <= 5 ? 'bg-amber-500/5 border-amber-500/25' : 'bg-slate-50 border-slate-200')}>
            {sla.breached ? <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" /> : <Clock3 className="w-5 h-5 text-amber-500 shrink-0" />}
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {sla.breached ? `Past the 21-day statutory window by ${Math.abs(sla.daysRemaining)} day(s)`
                  : `${sla.daysRemaining} day(s) remaining in the statutory window`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Open {sla.daysOpen} days · bureau deadline {fmtDate(d.dueAt)}</p>
            </div>
            <Badge tone={DISPUTE_STATUS[d.status].tone}>{DISPUTE_STATUS[d.status].label}</Badge>
          </div>

          {/* consumer + claim */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Consumer</p>
              <p className="font-display font-bold text-gray-900">{data.customer.firstName} {data.customer.lastName}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p className="inline-flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-gray-400" /><span className="font-mono text-xs">{data.customer.nrc}</span></p>
                <p className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{data.customer.phone}</p>
                <p className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{data.customer.province}</p>
              </div>
              {data.latestScore && <p className="mt-2 text-xs text-muted-foreground">Bureau score {data.latestScore.score} · {data.latestScore.rating}</p>}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Consumer's Claim</p>
              <p className="text-sm font-semibold text-gray-900">{d.type}</p>
              <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
              {d.resolution && (
                <p className="mt-3 pt-3 border-t border-slate-100 text-sm text-gray-700"><b>Bureau ruling:</b> {d.resolution}</p>
              )}
            </div>
          </div>

          {/* your facilities */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Your Facilities with This Consumer ({data.loans.length})</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table head={['Principal', 'Outstanding', 'Disbursed', 'Missed', 'Status']}>
                {data.loans.map((l: any) => (
                  <tr key={l.id}>
                    <Td>{money(Number(l.amount))}</Td>
                    <Td>{money(Number(l.outstandingBalance))}</Td>
                    <Td className="text-muted-foreground">{fmtDate(l.disbursedAt)}</Td>
                    <Td className={l.missedPayments > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{l.missedPayments}</Td>
                    <Td><Badge tone={loanTone[l.status] ?? 'slate'}>{l.status.replace('_', ' ')}</Badge></Td>
                  </tr>
                ))}
                {data.loans.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground">No facilities on file — the disputed record may belong to another institution.</Td></tr>}
              </Table>
            </div>
          </div>

          {/* correspondence */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Correspondence ({data.responses.length})</p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {data.responses.map((r: any) => (
                <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={r.kind === 'response' ? 'blue' : r.kind === 'evidence' ? 'violet' : 'slate'}>{r.kind}</Badge>
                    {r.position && <span className="text-xs font-medium text-gray-600">{POSITIONS.find(p => p.v === r.position)?.l}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">{r.authorName} · {fmtDate(r.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800">{r.body}</p>
                </div>
              ))}
              {data.responses.length === 0 && <p className="text-sm text-muted-foreground py-3">No correspondence yet — submit your response below.</p>}
            </div>
          </div>

          {/* respond */}
          {!d.resolvedAt ? (
            <form onSubmit={submit} className="space-y-3 pt-1 border-t border-slate-100">
              <div className="flex gap-2 pt-3">
                {(['response', 'evidence', 'note'] as const).map(k => (
                  <button key={k} type="button" onClick={() => setKind(k)}
                    className={cn('px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize border transition',
                      kind === k ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200')}>
                    {k === 'response' ? 'Formal response' : k === 'evidence' ? 'Supporting evidence' : 'Internal note'}
                  </button>
                ))}
              </div>
              {kind === 'response' && (
                <Field label="Your position">
                  <select className={inputCls} value={position} onChange={e => setPosition(e.target.value)}>
                    {POSITIONS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </Field>
              )}
              <Field label={kind === 'evidence' ? 'Describe the evidence supplied' : kind === 'note' ? 'Internal note' : 'Response to the bureau'}>
                <textarea required rows={3} className={inputCls} value={body} onChange={e => setBody(e.target.value)}
                  placeholder={kind === 'evidence' ? 'e.g. Statement of account Jan–Aug 2026 and signed loan agreement attached'
                    : 'Set out your findings and the basis for your position…'} />
              </Field>
              <div className="flex items-center gap-3">
                <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800">
                  <Paperclip className="w-3.5 h-3.5" /> Attach document
                </button>
                <button type="submit" disabled={saving || body.trim().length < 10}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit to Bureau
                </button>
              </div>
              {kind === 'response' && <p className="text-[11px] text-muted-foreground">Submitting a formal response returns the case to the bureau for adjudication.</p>}
            </form>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-gray-700">This case was closed on {fmtDate(d.resolvedAt)} — no further response is required.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
