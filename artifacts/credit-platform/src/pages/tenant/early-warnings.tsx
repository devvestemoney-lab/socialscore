import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  Siren, TrendingDown, Layers, CreditCard, Users2, Search, Download, Loader2,
  ShieldAlert, Landmark, Fingerprint, Phone, MapPin, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const SEV: Record<string, { tone: string; dot: string }> = {
  high: { tone: 'red', dot: 'bg-rose-500' },
  medium: { tone: 'amber', dot: 'bg-amber-400' },
  low: { tone: 'slate', dot: 'bg-slate-400' },
};
const STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: 'open', tone: 'red' },
  reviewing: { label: 'reviewing', tone: 'amber' },
  actioned: { label: 'actioned', tone: 'green' },
  dismissed: { label: 'dismissed', tone: 'slate' },
};
const ACTIONS = [
  'Limit reduced', 'Facility frozen', 'Restructure offered', 'Collections contacted',
  'Consumer contacted — explained', 'Added to watchlist', 'No action — within appetite',
];
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const maskNrc = (n: string) => `****${n.slice(n.indexOf('/'))}`;

export default function EarlyWarnings() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [note, setNote] = useState('');
  const [actionTaken, setActionTaken] = useState(ACTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const qs = (s = severity, t = type, st = status, q = search) =>
    `status=${st}${s !== 'all' ? `&severity=${s}` : ''}${t !== 'all' ? `&type=${t}` : ''}${q ? `&search=${encodeURIComponent(q)}` : ''}`;

  async function load(s = severity, t = type, st = status, q = search) {
    const res = await request(`${API}/tenant/early-warnings?${qs(s, t, st, q)}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  const onSearch = (q: string) => {
    setSearch(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(severity, type, status, q), 300);
  };

  async function updateStatus(sig: any, newStatus: string, withNote = false) {
    setSaving(true); setError('');
    const res = await request(`${API}/tenant/early-warnings/${sig.customerId}/${sig.signalType}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        note: withNote ? note : sig.note ?? 'Acknowledged for review',
        actionTaken: newStatus === 'actioned' ? actionTaken : null,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Update failed'); return; }
    setDetail(null); setNote('');
    load();
  }

  function exportCsv() {
    const rows = [
      ['Consumer', 'NRC', 'Signal', 'Severity', 'Detail', 'Your Exposure', 'Bureau Exposure', 'Score', 'Status'],
      ...data.signals.map((s: any) => [
        s.consumerName, s.nrc, s.signalLabel, s.severity, `"${s.detail.replace(/"/g, '""')}"`,
        Math.round(s.myExposure), Math.round(s.otherExposure), s.score ?? '', s.status,
      ]),
    ];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `early-warning-signals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { signals, summary } = data;
  const maxType = Math.max(1, ...summary.byType.map((t: any) => t.count));
  const s = detail;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Siren} tint="#EF4444" title="Early Warning Signals"
          subtitle="Bureau-wide behaviour signals on your borrowers, detected before they hit your book"
          actions={
            <button onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          } />

        <KpiGrid items={[
          { label: 'Active Signals', value: summary.active, icon: Siren, tint: '#EF4444', sub: `${summary.high} high severity` },
          { label: 'Consumers Flagged', value: summary.consumers, icon: Users2, tint: '#F59E0B' },
          { label: 'Exposure at Risk', value: money(summary.exposureAtRisk), icon: CreditCard, tint: '#8B5CF6', sub: 'your outstanding balance' },
          { label: 'Actioned', value: summary.actioned, icon: CheckCircle2, tint: '#10B981' },
          { label: 'Dismissed', value: summary.dismissed, icon: XCircle, tint: '#94A3B8' },
        ]} />

        <Panel title="Signals by Type" subtitle="Active signals across your portfolio — click to filter" padded>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            {summary.byType.map((t: any) => (
              <button key={t.type} onClick={() => { setType(t.type); load(severity, t.type); }}
                className={cn('text-left p-2 -m-2 rounded-lg transition-colors hover:bg-slate-50', type === t.type && 'bg-blue-50/60')}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className={cn('font-medium', t.count ? 'text-gray-900' : 'text-gray-400')}>{t.label}</span>
                  <span className={cn('font-bold', t.count ? 'text-gray-900' : 'text-gray-300')}>{t.count}</span>
                </div>
                <Bar value={(t.count / maxType) * 100} color={t.count ? '#EF4444' : '#E2E8F0'} />
              </button>
            ))}
          </div>
        </Panel>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => { setSeverity(f); load(f); }}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                  severity === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{f}</button>
            ))}
          </div>
          <select value={type} onChange={e => { setType(e.target.value); load(severity, e.target.value); }}
            className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-gray-700 outline-none">
            <option value="all">All signal types</option>
            {summary.byType.map((t: any) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); load(severity, type, e.target.value); }}
            className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-gray-700 outline-none">
            <option value="active">Active (open + reviewing)</option>
            <option value="open">Open</option><option value="reviewing">Reviewing</option>
            <option value="actioned">Actioned</option><option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white ml-auto">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search consumer or NRC…"
              className="bg-transparent outline-none text-sm w-48 placeholder:text-gray-400" />
          </div>
        </div>

        <Panel title="Signal Register" subtitle={`${signals.length} signal${signals.length !== 1 ? 's' : ''} — ranked by severity and exposure`}>
          <Table head={['Consumer', 'Signal', 'Type', 'Severity', 'Your Exposure', 'Score', 'Status', '']}>
            {signals.map((sig: any) => (
              <tr key={sig.key} onClick={() => { setDetail(sig); setNote(sig.note ?? ''); setError(''); }}
                className={cn('transition-colors cursor-pointer', ['actioned', 'dismissed'].includes(sig.status) ? 'opacity-55 hover:bg-slate-50/70' : 'hover:bg-blue-50/40')}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', SEV[sig.severity].dot, sig.severity === 'high' && sig.status === 'open' && 'animate-pulse')} />
                    <div>
                      <p className="font-semibold text-gray-900">{sig.consumerName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{maskNrc(sig.nrc)}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted-foreground max-w-[320px] whitespace-normal">{sig.detail}</Td>
                <Td><Badge tone="violet">{sig.signalLabel}</Badge></Td>
                <Td><Badge tone={SEV[sig.severity].tone}>{sig.severity}</Badge></Td>
                <Td className={sig.myExposure > 0 ? 'font-medium text-gray-900' : 'text-muted-foreground'}>{sig.myExposure > 0 ? money(sig.myExposure) : '—'}</Td>
                <Td>{sig.score ?? <span className="text-muted-foreground">—</span>}</Td>
                <Td><Badge tone={STATUS[sig.status].tone}>{STATUS[sig.status].label}</Badge></Td>
                <Td><span className="text-xs font-semibold text-blue-600">Review</span></Td>
              </tr>
            ))}
            {signals.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No signals match your filters — your book is clear on this view.</Td></tr>}
          </Table>
        </Panel>
      </div>

      {/* case modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title={s ? s.consumerName : 'Signal'} subtitle={s ? `${s.signalLabel} · ${s.severity} severity` : undefined}>
        {s && (
          <div className="space-y-5">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

            <div className={cn('flex items-start gap-3 p-4 rounded-xl border',
              s.severity === 'high' ? 'bg-rose-500/5 border-rose-500/25' : s.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/25' : 'bg-slate-50 border-slate-200')}>
              <ShieldAlert className={cn('w-5 h-5 shrink-0 mt-0.5', s.severity === 'high' ? 'text-rose-500' : s.severity === 'medium' ? 'text-amber-500' : 'text-slate-400')} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.detail}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Detected from bureau-wide data · currently <b>{STATUS[s.status].label}</b>{s.assignee ? ` · ${s.assignee}` : ''}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-gray-700"><Fingerprint className="w-3.5 h-3.5 text-gray-400" /><span className="font-mono text-xs">{s.nrc}</span></span>
              <span className="inline-flex items-center gap-1.5 text-gray-700"><Phone className="w-3.5 h-3.5 text-gray-400" />{s.phone}</span>
              <span className="inline-flex items-center gap-1.5 text-gray-700"><MapPin className="w-3.5 h-3.5 text-gray-400" />{s.province}</span>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Evidence</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Your exposure', money(s.myExposure)], ['Exposure elsewhere', money(s.otherExposure)],
                  ['Other institutions', s.otherInstitutions], ['Bureau defaults', s.otherDefaults, s.otherDefaults > 0 && 'text-rose-600'],
                  ['Missed with you', s.myMissed, s.myMissed > 0 && 'text-rose-600'], ['Hard inquiries (90d)', s.hard90d, s.hard90d >= 3 && 'text-amber-600'],
                  ['Current score', s.score ?? '—'], ['Previous score', s.prevScore ?? '—'],
                ].map(([l, v, cls]: any) => (
                  <div key={l} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className={cn('text-base font-bold text-gray-900', cls)}>{v}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <Field label="Case note" hint="required to action or dismiss">
                <textarea rows={2} className={inputCls} value={note} placeholder="What did you find, and what are you doing about it?"
                  onChange={e => setNote(e.target.value)} />
              </Field>
              <Field label="Action taken">
                <select className={inputCls} value={actionTaken} onChange={e => setActionTaken(e.target.value)}>
                  {ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {s.status === 'open' && (
                <button disabled={saving} onClick={() => updateStatus(s, 'reviewing')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-semibold disabled:opacity-50">
                  <Eye className="w-4 h-4" /> Start Review
                </button>
              )}
              <button disabled={saving || !note.trim()} onClick={() => updateStatus(s, 'actioned', true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Mark Actioned
              </button>
              <button disabled={saving || !note.trim()} onClick={() => updateStatus(s, 'dismissed', true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold disabled:opacity-40">
                <XCircle className="w-4 h-4" /> Dismiss
              </button>
              {['actioned', 'dismissed'].includes(s.status) && (
                <button disabled={saving} onClick={() => updateStatus(s, 'open')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold">Reopen</button>
              )}
              <button onClick={() => setDetail(null)} className="ml-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
