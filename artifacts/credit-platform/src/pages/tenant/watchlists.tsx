import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls, Bar, Toggle } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  ListChecks, Plus, Users2, Wallet, AlertTriangle, CalendarClock, ArrowLeft,
  Trash2, UserPlus, Loader2, CheckCircle2, Bell, ShieldAlert, Sparkles, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const CATEGORIES = [
  { v: 'risk', l: 'Risk containment', tone: 'red' }, { v: 'recovery', l: 'Recovery', tone: 'amber' },
  { v: 'retention', l: 'Retention', tone: 'green' }, { v: 'compliance', l: 'Compliance', tone: 'violet' },
  { v: 'growth', l: 'Growth', tone: 'blue' }, { v: 'operational', l: 'Operational', tone: 'slate' },
];
const PRIORITIES = [
  { v: 'critical', l: 'Critical', tone: 'red' }, { v: 'high', l: 'High', tone: 'amber' },
  { v: 'medium', l: 'Medium', tone: 'blue' }, { v: 'low', l: 'Low', tone: 'slate' },
];
const CADENCES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly'];
const TRIGGERS = [
  { v: 'score_drop', l: 'Score drop' }, { v: 'score_improvement', l: 'Score improvement' },
  { v: 'new_arrears', l: 'New arrears elsewhere' }, { v: 'new_default', l: 'New default / write-off' },
  { v: 'hard_inquiry', l: 'Competitor hard inquiry' }, { v: 'new_tradeline', l: 'New tradeline opened' },
  { v: 'consent_expiry', l: 'Consent expiring' }, { v: 'address_change', l: 'Contact details changed' },
];
const CHANNELS = [{ v: 'in_app', l: 'In-app' }, { v: 'email', l: 'Email' }, { v: 'sms', l: 'SMS' }, { v: 'webhook', l: 'Webhook' }];

const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const bandOf = (s: number | null) => (s == null ? null : s >= 720 ? 'A' : s >= 660 ? 'B' : s >= 580 ? 'C' : s >= 480 ? 'D' : 'E');
const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red' };
const maskNrc = (n: string) => `****${n.slice(n.indexOf('/'))}`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d < 1 ? 'today' : d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : d < 30 ? `${Math.floor(d / 7)} wk ago` : `${Math.floor(d / 30)} mo ago`;
};
const catMeta = (v: string) => CATEGORIES.find(c => c.v === v) ?? CATEGORIES[0];
const priMeta = (v: string) => PRIORITIES.find(p => p.v === v) ?? PRIORITIES[2];

const EMPTY = {
  name: '', description: '', category: 'risk', priority: 'medium', owner: '', reviewCadence: 'weekly',
  triggers: ['score_drop', 'new_arrears'] as string[], channels: ['in_app'] as string[],
  autoEnrol: false, maxScore: '', minScore: '', minMissedPayments: '', minExposure: '',
};
const STEPS = ['Definition', 'Alert Triggers', 'Auto-enrolment'];

/* ─── Create wizard ─── */
function CreateWatchlist({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { request } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const set = (p: any) => setF((prev: any) => ({ ...prev, ...p }));
  const toggle = (key: 'triggers' | 'channels', v: string) =>
    set({ [key]: f[key].includes(v) ? f[key].filter((x: string) => x !== v) : [...f[key], v] });

  const valid = () => (step === 0 ? f.name.trim() && f.description.trim() : step === 1 ? f.triggers.length && f.channels.length : true);

  async function submit() {
    setSaving(true); setError('');
    const num = (v: string) => (v === '' ? null : Number(v));
    const res = await request(`${API}/tenant/watchlists`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name, description: f.description, category: f.category, priority: f.priority,
        owner: f.owner, reviewCadence: f.reviewCadence, triggers: f.triggers, channels: f.channels,
        autoEnrol: f.autoEnrol,
        criteria: { maxScore: num(f.maxScore), minScore: num(f.minScore), minMissedPayments: num(f.minMissedPayments), minExposure: num(f.minExposure) },
      }),
    });
    setSaving(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Failed to create watchlist'); return; }
    setResult(body);
  }

  return (
    <Modal open onClose={onClose} wide title="New Watchlist" subtitle="Define scope, alert triggers and auto-enrolment rules">
      {result ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="font-display font-bold text-lg text-gray-900">{result.watchlist.name} created</p>
          <p className="text-sm text-muted-foreground">
            {result.enrolled > 0
              ? `${result.enrolled} consumer${result.enrolled !== 1 ? 's' : ''} auto-enrolled from your book. Alerts are now armed.`
              : 'Add consumers manually from the watchlist, or from any consumer file.'}
          </p>
          <button onClick={onDone} className="mt-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Open watchlists</button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-gray-400')}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn('text-[11px] font-semibold truncate', i === step ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
                {i < STEPS.length - 1 && <div className={cn('h-px flex-1', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />}
              </div>
            ))}
          </div>
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Watchlist Name"><input className={inputCls} value={f.name} placeholder="e.g. Salary-backed arrears watch" onChange={e => set({ name: e.target.value })} /></Field></div>
              <div className="col-span-2"><Field label="Purpose / Description"><textarea rows={2} className={inputCls} value={f.description} placeholder="What is this list for and how should the team act on it?" onChange={e => set({ description: e.target.value })} /></Field></div>
              <Field label="Category">
                <select className={inputCls} value={f.category} onChange={e => set({ category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className={inputCls} value={f.priority} onChange={e => set({ priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </Field>
              <Field label="Owner / Responsible Team" hint="optional"><input className={inputCls} value={f.owner} placeholder="e.g. Credit Risk Unit" onChange={e => set({ owner: e.target.value })} /></Field>
              <Field label="Review Cadence">
                <select className={inputCls} value={f.reviewCadence} onChange={e => set({ reviewCadence: e.target.value })}>
                  {CADENCES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Raise an alert when…">
                <div className="grid sm:grid-cols-2 gap-2">
                  {TRIGGERS.map(t => (
                    <button key={t.v} type="button" onClick={() => toggle('triggers', t.v)}
                      className={cn('flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium text-left transition',
                        f.triggers.includes(t.v) ? 'bg-blue-500/10 text-blue-700 border-blue-400' : 'bg-white text-gray-600 border-slate-200 hover:border-slate-300')}>
                      <ShieldAlert className={cn('w-4 h-4 shrink-0', f.triggers.includes(t.v) ? 'text-blue-500' : 'text-gray-300')} /> {t.l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Deliver alerts via">
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(c => (
                    <button key={c.v} type="button" onClick={() => toggle('channels', c.v)}
                      className={cn('px-4 py-2 rounded-full border text-sm font-medium transition',
                        f.channels.includes(c.v) ? 'bg-emerald-500/10 text-emerald-700 border-emerald-400' : 'bg-white text-gray-600 border-slate-200')}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </Field>
              <p className="text-xs text-muted-foreground">Alerts appear under Alerts &amp; Notifications and can be tuned later in Alert Rules.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> Auto-enrol from my book</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">Automatically add consumers from your portfolio that match the criteria below. Leave off to curate the list manually.</p>
                </div>
                <Toggle on={f.autoEnrol} onChange={v => set({ autoEnrol: v })} />
              </div>
              <div className={cn('grid grid-cols-2 gap-4 transition-opacity', !f.autoEnrol && 'opacity-40 pointer-events-none')}>
                <Field label="Score at most" hint="e.g. 560"><input type="number" className={inputCls} value={f.maxScore} onChange={e => set({ maxScore: e.target.value })} /></Field>
                <Field label="Score at least" hint="e.g. 700"><input type="number" className={inputCls} value={f.minScore} onChange={e => set({ minScore: e.target.value })} /></Field>
                <Field label="Missed payments at least"><input type="number" className={inputCls} value={f.minMissedPayments} onChange={e => set({ minMissedPayments: e.target.value })} /></Field>
                <Field label="Exposure with you at least (ZMW)"><input type="number" className={inputCls} value={f.minExposure} onChange={e => set({ minExposure: e.target.value })} /></Field>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-1">
                <p className="font-semibold text-gray-900">{f.name || 'Untitled watchlist'}</p>
                <p className="text-muted-foreground">{catMeta(f.category).l} · {priMeta(f.priority).l} priority · reviewed {f.reviewCadence}</p>
                <p className="text-muted-foreground">{f.triggers.length} trigger(s) → {f.channels.length} channel(s){f.autoEnrol ? ' · auto-enrolment on' : ' · manual membership'}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" disabled={!valid()} onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">Continue</button>
            ) : (
              <button type="button" disabled={saving} onClick={submit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Watchlist
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Detail view ─── */
function WatchlistDetail({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [nrc, setNrc] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await request(`${API}/tenant/watchlists/${id}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, [id]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await request(`${API}/tenant/watchlists/${id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nrc, reason }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed to add'); return; }
    setShowAdd(false); setNrc(''); setReason(''); load(); onChanged();
  }
  async function removeMember(memberId: string) {
    await request(`${API}/tenant/watchlists/${id}/members/${memberId}`, { method: 'DELETE' });
    load(); onChanged();
  }
  async function markReviewed() {
    await request(`${API}/tenant/watchlists/${id}/review`, { method: 'POST' });
    load(); onChanged();
  }

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  const w = data.watchlist;
  const members = data.members;
  const exposure = members.reduce((a: number, m: any) => a + m.exposure, 0);
  const flagged = members.filter((m: any) => m.missed > 0).length;
  const overdue = w.nextReviewAt && new Date(w.nextReviewAt) <= new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-gray-600"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-gray-900">{w.name}</h1>
              <Badge tone={priMeta(w.priority).tone}>{priMeta(w.priority).l}</Badge>
              <Badge tone={catMeta(w.category).tone}>{catMeta(w.category).l}</Badge>
              {w.autoEnrol && <Badge tone="violet">auto-enrol</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{w.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Owner {w.owner || '—'} · reviewed {w.reviewCadence} · next review{' '}
              <b className={overdue ? 'text-rose-600' : 'text-gray-700'}>{fmtDate(w.nextReviewAt)}{overdue ? ' (overdue)' : ''}</b>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markReviewed} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">Mark reviewed</button>
          <button onClick={() => { setShowAdd(true); setError(''); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <UserPlus className="w-4 h-4" /> Add Consumer
          </button>
        </div>
      </div>

      <KpiGrid items={[
        { label: 'Members', value: members.length, icon: Users2, tint: '#4F6EF7' },
        { label: 'Exposure on List', value: money(exposure), icon: Wallet, tint: '#8B5CF6' },
        { label: 'Currently Flagged', value: flagged, icon: AlertTriangle, tint: flagged ? '#EF4444' : '#94A3B8', sub: 'missed payments with you' },
        { label: 'Alert Triggers', value: w.triggers.length, icon: Bell, tint: '#F59E0B', sub: w.channels.join(' · ') },
      ]} />

      <Panel title="Alert Configuration" padded>
        <div className="flex flex-wrap gap-2">
          {w.triggers.map((t: string) => <Badge key={t} tone="blue">{TRIGGERS.find(x => x.v === t)?.l ?? t}</Badge>)}
          {w.triggers.length === 0 && <span className="text-sm text-muted-foreground">No triggers configured.</span>}
        </div>
        {w.autoEnrol && Object.values(w.criteria ?? {}).some(v => v != null) && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-100">
            Auto-enrolment criteria:
            {w.criteria.maxScore != null && ` score ≤ ${w.criteria.maxScore}`}
            {w.criteria.minScore != null && ` score ≥ ${w.criteria.minScore}`}
            {w.criteria.minMissedPayments != null && ` · missed ≥ ${w.criteria.minMissedPayments}`}
            {w.criteria.minExposure != null && ` · exposure ≥ K${Number(w.criteria.minExposure).toLocaleString()}`}
          </p>
        )}
      </Panel>

      <Panel title={`Members (${members.length})`} subtitle="Live bureau position for everyone on this list">
        <Table head={['Consumer', 'NRC', 'Score', 'Your Exposure', 'Missed', 'Bureau Defaults', 'Reason', 'Added', '']}>
          {members.map((m: any) => {
            const band = bandOf(m.score);
            return (
              <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{m.first_name} {m.last_name}</Td>
                <Td className="font-mono text-xs">{maskNrc(m.nrc)}</Td>
                <Td>{band ? <Badge tone={bandTone[band]}>{band} ({m.score})</Badge> : <Badge tone="slate">unscored</Badge>}</Td>
                <Td className={m.exposure > 0 ? 'font-medium text-gray-900' : 'text-muted-foreground'}>{m.exposure > 0 ? money(m.exposure) : '—'}</Td>
                <Td className={m.missed > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{m.missed}</Td>
                <Td className={m.bureau_defaults > 0 ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{m.bureau_defaults}</Td>
                <Td className="text-muted-foreground max-w-[240px] whitespace-normal text-xs">{m.reason}</Td>
                <Td className="text-muted-foreground text-xs">{ago(m.created_at)}<br /><span className="text-gray-400">{m.source === 'auto' ? 'auto' : m.added_by}</span></Td>
                <Td><button onClick={() => removeMember(m.id)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></Td>
              </tr>
            );
          })}
          {members.length === 0 && <tr><Td colSpan={9} className="text-center text-muted-foreground py-8">No members yet — add consumers by NRC.</Td></tr>}
        </Table>
      </Panel>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Consumer to Watchlist" subtitle={w.name}>
        <form onSubmit={addMember} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <Field label="Consumer NRC">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input required className={inputCls + ' pl-10 font-mono'} value={nrc} placeholder="e.g. 123456/78/1" onChange={e => setNrc(e.target.value)} />
            </div>
          </Field>
          <Field label="Reason for monitoring">
            <input className={inputCls} value={reason} placeholder="e.g. Restructured facility — monitor adherence" onChange={e => setReason(e.target.value)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add to Watchlist
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ─── Main page ─── */
export default function Watchlists() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const res = await request(`${API}/tenant/watchlists`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" and its membership? This cannot be undone.`)) return;
    await request(`${API}/tenant/watchlists/${id}`, { method: 'DELETE' });
    load();
  }

  if (openId) return <Layout><WatchlistDetail id={openId} onBack={() => { setOpenId(null); load(); }} onChanged={load} /></Layout>;
  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { watchlists, recent, totals } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ListChecks} tint="#8B5CF6" title="Watchlists"
          subtitle="Grouped monitoring lists with tailored alert triggers and auto-enrolment"
          actions={
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> New Watchlist
            </button>
          } />

        <KpiGrid items={[
          { label: 'Watchlists', value: totals.lists, icon: ListChecks, tint: '#8B5CF6', sub: `${totals.activeLists} active` },
          { label: 'Consumers Monitored', value: totals.members, icon: Users2, tint: '#4F6EF7' },
          { label: 'Exposure Under Watch', value: money(totals.exposure), icon: Wallet, tint: '#10B981' },
          { label: 'Currently Flagged', value: totals.flagged, icon: AlertTriangle, tint: totals.flagged ? '#EF4444' : '#94A3B8', sub: 'missed payments' },
          { label: 'Reviews Due', value: totals.dueForReview, icon: CalendarClock, tint: totals.dueForReview ? '#F59E0B' : '#94A3B8' },
        ]} />

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {watchlists.map((w: any) => {
            const overdue = w.next_review_at && new Date(w.next_review_at) <= new Date();
            return (
              <div key={w.id} onClick={() => setOpenId(w.id)}
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-gray-900 truncate">{w.name}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge tone={priMeta(w.priority).tone}>{priMeta(w.priority).l}</Badge>
                      <Badge tone={catMeta(w.category).tone}>{catMeta(w.category).l}</Badge>
                    </div>
                  </div>
                  <span className="text-2xl font-display font-extrabold text-gray-900 shrink-0">{w.members}</span>
                </div>
                <p className="text-[13px] text-muted-foreground min-h-[38px] mt-1">{w.description}</p>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Exposure</span><b className="text-gray-900">{money(w.exposure)}</b></div>
                  <div className="flex justify-between"><span className="text-gray-400">Flagged</span><b className={w.flagged ? 'text-rose-600' : 'text-emerald-600'}>{w.flagged}</b></div>
                  {w.members > 0 && <Bar value={(w.flagged / w.members) * 100} color={w.flagged ? '#EF4444' : '#10B981'} />}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className={cn('text-[11px]', overdue ? 'text-rose-600 font-semibold' : 'text-gray-400')}>
                    {overdue ? 'Review overdue' : `Review ${fmtDate(w.next_review_at)}`}
                  </span>
                  <button onClick={e => { e.stopPropagation(); remove(w.id, w.name); }} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
          {watchlists.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 p-10 rounded-xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-sm text-muted-foreground">No watchlists yet — create your first monitoring list.</p>
            </div>
          )}
        </div>

        <Panel title="Recent Additions" subtitle="Latest consumers enrolled across all your lists">
          <Table head={['Watchlist', 'Consumer', 'Reason', 'Source', 'Added']}>
            {recent.map((r: any) => (
              <tr key={r.id} onClick={() => setOpenId(r.watchlist_id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td><Badge tone="violet">{r.watchlist_name}</Badge></Td>
                <Td className="font-semibold text-gray-900">{r.first_name} {r.last_name}</Td>
                <Td className="text-muted-foreground max-w-[320px] whitespace-normal">{r.reason}</Td>
                <Td><Badge tone={r.source === 'auto' ? 'blue' : 'slate'}>{r.source}</Badge></Td>
                <Td className="text-muted-foreground">{ago(r.created_at)}</Td>
              </tr>
            ))}
            {recent.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-6">No members enrolled yet.</Td></tr>}
          </Table>
        </Panel>
      </div>

      {showCreate && <CreateWatchlist onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
    </Layout>
  );
}
