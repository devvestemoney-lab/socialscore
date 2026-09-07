import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Search, FileText, Gauge, Fingerprint, Loader2, AlertCircle } from 'lucide-react';
import { ReportView, bandTone } from './report-view';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const PURPOSES = ['Loan origination', 'Credit review', 'Account opening', 'Credit limit increase', 'Collections'];

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString()
    ? `${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function ConsumerSearch() {
  const { request } = useAuth();
  const [nrc, setNrc] = useState('');
  // Zambian NRC: 6 digits / 2-digit district / 1 check digit — e.g. 123456/78/1
  const NRC_PATTERN = /^\d{6}\/\d{2}\/\d$/;
  const looksLikeNrc = (v: string) => NRC_PATTERN.test(v.trim());
  const looksLikePhone = (v: string) => /^\+?\d[\d\s-]{7,}$/.test(v.trim());
  const malformed = nrc.trim().length > 0 && !looksLikeNrc(nrc) && !looksLikePhone(nrc);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [pulling, setPulling] = useState<'full' | 'score' | null>(null);
  const [error, setError] = useState('');
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  async function loadRecent() {
    const res = await request(`${API}/tenant/credit-reports?limit=6`);
    if (res.ok) setRecent((await res.json()).reports ?? []);
  }
  useEffect(() => { loadRecent(); }, []);

  async function pull(kind: 'full' | 'score') {
    if (!nrc.trim()) { setError('Enter an NRC, passport or phone number first.'); return; }
    setPulling(kind); setError(''); setScoreResult(null);
    const res = await request(`${API}/tenant/consumer-search/pull`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nrc: nrc.trim(), purpose, kind }),
    });
    const body = await res.json();
    setPulling(null);
    if (!res.ok) { setError(body.message ?? 'Lookup failed.'); loadRecent(); return; }
    if (body.kind === 'full') {
      setOpenReportId(body.reportId);   // straight into the full report
      loadRecent();
    } else {
      setScoreResult(body);
    }
  }

  if (openReportId) {
    return (
      <Layout>
        <ReportView id={openReportId} onBack={() => { setOpenReportId(null); loadRecent(); }} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Search} tint="#4F6EF7" title="Consumer Search"
          subtitle="Look up a consumer file by NRC, passport or phone — consent is enforced on every pull" />

        <Panel padded>
          <form onSubmit={e => { e.preventDefault(); pull('full'); }} className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">NRC / Passport / Phone</label>
              <div className="relative">
                <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className={cn(inputCls, 'pl-10 font-mono', malformed && 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/25')}
                  placeholder="e.g. 123456/78/1"
                  value={nrc} onChange={e => setNrc(e.target.value)} />
              </div>
              {malformed && <p className="text-[11px] text-amber-600 mt-1">NRC format is 6 digits / 2-digit district / check digit — e.g. 123456/78/1</p>}
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Purpose</label>
              <select className={inputCls} value={purpose} onChange={e => setPurpose(e.target.value)}>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button type="submit" disabled={!!pulling}
              className="md:col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-60 transition-colors">
              {pulling === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Pull Full Report
            </button>
            <button type="button" disabled={!!pulling} onClick={() => pull('score')}
              className="md:col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-bold disabled:opacity-60 transition-colors">
              {pulling === 'score' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />} Score Only
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            A full report records a <b>hard inquiry</b> and requires active consent. Score-only is a soft pull.
            Every lookup is metered and audit-logged.
          </p>
        </Panel>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {scoreResult && (
          <Panel padded>
            <div className="flex flex-wrap items-center gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Soft Pull Result</p>
                <p className="text-lg font-display font-bold text-gray-900">{scoreResult.consumer.name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{scoreResult.consumer.nrc}</span></p>
              </div>
              {scoreResult.score != null ? (
                <>
                  <div className="text-center px-5 border-l border-slate-100">
                    <p className="text-3xl font-display font-extrabold text-gray-900">{scoreResult.score}</p>
                    <Badge tone={bandTone[scoreResult.band] ?? 'slate'}>Band {scoreResult.band} · {scoreResult.rating}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Probability of default <b className={scoreResult.probabilityOfDefault > 0.2 ? 'text-rose-600' : 'text-emerald-600'}>
                      {(scoreResult.probabilityOfDefault * 100).toFixed(1)}%</b>
                  </div>
                </>
              ) : (
                <Badge tone="slate">unscored — insufficient history</Badge>
              )}
              <button onClick={() => pull('full')}
                className="ml-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
                Pull Full Report →
              </button>
            </div>
          </Panel>
        )}

        <Panel title="Recent Lookups" subtitle="Your institution's latest report pulls — click to reopen">
          <Table head={['Reference', 'Consumer', 'Score', 'Purpose', 'When', '']}>
            {recent.map((r: any) => (
              <tr key={r.id} onClick={() => setOpenReportId(r.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-mono text-xs text-blue-600">{r.reference}</Td>
                <Td className="font-semibold text-gray-900">{r.consumerName}</Td>
                <Td>{r.band ? <Badge tone={bandTone[r.band]}>{r.band} ({r.score})</Badge> : <Badge tone="slate">—</Badge>}</Td>
                <Td className="text-muted-foreground max-w-[240px] truncate">{r.purpose}</Td>
                <Td className="text-muted-foreground">{fmtWhen(r.createdAt)}</Td>
                <Td><span className="text-xs font-semibold text-blue-600">Open report</span></Td>
              </tr>
            ))}
            {recent.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-6">No reports pulled yet — run your first lookup above.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
