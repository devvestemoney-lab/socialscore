import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Pager, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  BookUser, UserCheck, FileStack, FileQuestion, Search, ShieldCheck, ShieldAlert,
  ArrowLeft, Fingerprint, Phone, MapPin, CalendarDays, Printer, ClipboardCheck,
  Landmark, FileText, FileSearch, Scale, Gauge, Wallet,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const maskNrc = (nrc: string) => `****${nrc.slice(nrc.indexOf('/'))}`;
const bandOf = (s: number | null) => (s == null ? null : s >= 720 ? 'A' : s >= 660 ? 'B' : s >= 580 ? 'C' : s >= 480 ? 'D' : 'E');
const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red' };
const scoreTone = (s: number | null) => (s == null ? 'slate' : bandTone[bandOf(s)!]);
const loanTone: Record<string, string> = { active: 'blue', closed: 'green', defaulted: 'red', written_off: 'red' };
const OUTCOME: Record<string, { label: string; tone: string }> = {
  report_issued: { label: 'report issued', tone: 'green' },
  declined_no_consent: { label: 'declined — no consent', tone: 'red' },
  declined_policy: { label: 'declined — policy', tone: 'red' },
};
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/* ═══════════════ Full-scale consumer file ═══════════════ */

function ConsumerFile({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('overview');

  async function load() {
    const res = await request(`${API}/admin/consumers/${id}`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, [id]);

  async function toggleVerify() {
    await request(`${API}/admin/consumers/${id}/verify`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityVerified: !data.customer.identityVerified }),
    });
    load(); onChanged();
  }

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { customer: c, loans, scores, inquiries, reports, consents, disputes, totals } = data;
  const latest = scores[0] ? Math.round(Number(scores[0].score)) : null;
  const initials = `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`;
  const history = [...scores].reverse().map((s: any) => ({
    date: new Date(s.createdAt).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    score: Math.round(Number(s.score)),
  }));
  const TABS = [
    ['overview', 'Overview'], ['tradelines', `Tradelines (${loans.length})`],
    ['inquiries', `Inquiries (${inquiries.length})`], ['reports', `Reports (${reports.length})`],
    ['consents', `Consent & Disputes (${consents.length + disputes.length})`],
  ] as const;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-gray-600"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C5CFC)' }}>{initials}</div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-gray-900">{c.firstName} {c.lastName}</h1>
                {c.identityVerified
                  ? <Badge tone="green"><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> identity verified</span></Badge>
                  : <Badge tone="amber"><span className="inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> identity pending</span></Badge>}
                {latest != null && <Badge tone={scoreTone(latest)}>Score {latest} · {scores[0].rating}</Badge>}
                <Badge tone={totals.tradelines < 3 ? 'amber' : 'blue'}>{totals.tradelines < 3 ? 'thin file' : 'full file'}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5" /><span className="font-mono text-xs">{c.nrc}</span></span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />DOB {c.dateOfBirth}</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{c.phone}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{c.province}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleVerify}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              c.identityVerified ? 'border border-slate-200 text-gray-700 hover:bg-slate-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white')}>
            {c.identityVerified ? 'Unverify identity' : 'Verify identity'}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
            <Printer className="w-4 h-4" /> Print file
          </button>
        </div>
      </div>

      <KpiGrid items={[
        { label: 'Tradelines', value: totals.tradelines, icon: FileStack, tint: '#4F6EF7', sub: `${totals.institutions} institution(s)` },
        { label: 'Outstanding', value: money(totals.outstanding), icon: Wallet, tint: '#8B5CF6', sub: `${money(totals.principal)} advanced` },
        { label: 'Missed Payments', value: totals.missedPayments, icon: Scale, tint: totals.missedPayments ? '#EF4444' : '#94A3B8', sub: `${totals.defaulted} defaulted` },
        { label: 'Hard Inquiries (90d)', value: totals.hardInquiries90d, icon: FileSearch, tint: totals.hardInquiries90d > 3 ? '#F59E0B' : '#14B8A6' },
        { label: 'Active Consents', value: totals.activeConsents, icon: ClipboardCheck, tint: totals.activeConsents ? '#10B981' : '#EF4444',
          sub: totals.openDisputes ? `${totals.openDisputes} open dispute(s)` : 'no open disputes' },
      ]} />

      <div className="flex gap-2 flex-wrap print:hidden">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
              tab === key ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-5 gap-6">
          <Panel title="Score History" subtitle="Every scoring run on this consumer" className="lg:col-span-3" padded>
            {history.length > 1 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="csGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F6EF7" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#4F6EF7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[300, 850]} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#4F6EF7" strokeWidth={2.5} fill="url(#csGrad)"
                      dot={{ r: 3.5, fill: '#fff', stroke: '#4F6EF7', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                {history.length === 1 ? 'Only one scoring run on record — no trend yet.' : 'This consumer has not been scored.'}
              </p>
            )}
            {scores[0] && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-[11px] uppercase tracking-wider text-gray-400">Probability of default</p>
                  <p className={cn('font-bold mt-0.5', Number(scores[0].probabilityOfDefault) > 0.2 ? 'text-rose-600' : 'text-emerald-600')}>
                    {(Number(scores[0].probabilityOfDefault) * 100).toFixed(1)}%</p></div>
                <div><p className="text-[11px] uppercase tracking-wider text-gray-400">Last scored</p>
                  <p className="text-gray-900 mt-0.5">{fmtDate(scores[0].createdAt)}</p></div>
                <div><p className="text-[11px] uppercase tracking-wider text-gray-400">Scoring runs</p>
                  <p className="text-gray-900 mt-0.5">{scores.length}</p></div>
              </div>
            )}
          </Panel>

          <Panel title="File Composition" className="lg:col-span-2" padded>
            <div className="space-y-4">
              {[
                ['Active facilities', totals.active, '#10B981'],
                ['Closed facilities', totals.closed, '#94A3B8'],
                ['Defaulted / written off', totals.defaulted, '#EF4444'],
              ].map(([label, value, color]: any) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{label}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                  <Bar value={totals.tradelines ? (value / totals.tradelines) * 100 : 0} color={color} />
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Reports issued on this file</span><b className="text-gray-900">{reports.length}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total inquiries</span><b className="text-gray-900">{inquiries.length}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Registered</span><b className="text-gray-900">{fmtDate(c.createdAt)}</b></div>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'tradelines' && (
        <Panel title="Tradelines" subtitle="Every facility reported to the bureau across institutions">
          <Table head={['Institution', 'Type', 'Principal', 'Outstanding', 'Rate', 'Disbursed', 'Missed', 'Status']}>
            {loans.map((l: any) => (
              <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900"><span className="inline-flex items-center gap-2"><Landmark className="w-3.5 h-3.5 text-gray-300" />{l.institution}</span></Td>
                <Td><Badge tone="slate">{l.institutionType.toUpperCase()}</Badge></Td>
                <Td>{money(Number(l.amount))}</Td>
                <Td className={Number(l.outstandingBalance) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{money(Number(l.outstandingBalance))}</Td>
                <Td className="text-muted-foreground">{Number(l.interestRate).toFixed(0)}%</Td>
                <Td className="text-muted-foreground">{fmtDate(l.disbursedAt)}</Td>
                <Td className={l.missedPayments > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{l.missedPayments}</Td>
                <Td><Badge tone={loanTone[l.status] ?? 'slate'}>{l.status.replace('_', ' ')}</Badge></Td>
              </tr>
            ))}
            {loans.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No tradelines on file.</Td></tr>}
          </Table>
        </Panel>
      )}

      {tab === 'inquiries' && (
        <Panel title="Inquiry Footprint" subtitle="Who has accessed this consumer's file">
          <Table head={['Date', 'Institution', 'Type', 'Stated Purpose', 'Outcome']}>
            {inquiries.map((i: any) => (
              <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="text-muted-foreground">{fmtDate(i.createdAt)}</Td>
                <Td className="font-medium text-gray-900">{i.institutionName}</Td>
                <Td><Badge tone={i.kind === 'hard' ? 'amber' : 'cyan'}>{i.kind}</Badge></Td>
                <Td className="text-muted-foreground max-w-[280px] truncate">{i.purpose}</Td>
                <Td><Badge tone={OUTCOME[i.outcome]?.tone ?? 'slate'}>{OUTCOME[i.outcome]?.label ?? i.outcome}</Badge></Td>
              </tr>
            ))}
            {inquiries.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">No inquiries recorded.</Td></tr>}
          </Table>
        </Panel>
      )}

      {tab === 'reports' && (
        <Panel title="Reports Issued" subtitle="Bureau reports generated on this consumer">
          <Table head={['Reference', 'Institution', 'Purpose', 'Score', 'Status', 'Generated']}>
            {reports.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{r.reference}</Td>
                <Td className="font-medium text-gray-900">{r.institutionName}</Td>
                <Td className="text-muted-foreground max-w-[240px] truncate">{r.purpose}</Td>
                <Td>{r.band ? <Badge tone={bandTone[r.band]}>{r.band} ({r.score})</Badge> : <Badge tone="slate">—</Badge>}</Td>
                <Td><Badge tone={r.status === 'delivered' ? 'green' : r.status === 'partial' ? 'amber' : 'red'}>{r.status}</Badge></Td>
                <Td className="text-muted-foreground">{fmtDate(r.createdAt)}</Td>
              </tr>
            ))}
            {reports.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">No reports issued on this file.</Td></tr>}
          </Table>
        </Panel>
      )}

      {tab === 'consents' && (
        <div className="space-y-6">
          <Panel title={`Consents (${consents.length})`} subtitle="Data-sharing permissions granted by this consumer">
            <Table head={['Institution', 'Data Type', 'Granted', 'Expires', 'Status']}>
              {consents.map((k: any) => (
                <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-medium text-gray-900">{k.institution}</Td>
                  <Td><Badge tone="blue">{String(k.data_type).replace('_', ' ')}</Badge></Td>
                  <Td className="text-muted-foreground">{fmtDate(k.granted_at)}</Td>
                  <Td className="text-muted-foreground">{k.status === 'revoked' ? `revoked ${fmtDate(k.revoked_at)}` : fmtDate(k.expires_at)}</Td>
                  <Td><Badge tone={k.status === 'active' ? 'green' : 'red'}>{k.status}</Badge></Td>
                </tr>
              ))}
              {consents.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-6">No consents on file.</Td></tr>}
            </Table>
          </Panel>

          <Panel title={`Disputes (${disputes.length})`} subtitle="Cases this consumer has raised against their record">
            <Table head={['Case', 'Institution', 'Type', 'Opened', 'Status']}>
              {disputes.map((d: any) => (
                <tr key={d.case_no} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs text-blue-600">{d.case_no}</Td>
                  <Td className="font-medium text-gray-900">{d.institution_name}</Td>
                  <Td className="text-muted-foreground">{d.type}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.opened_at)}</Td>
                  <Td><Badge tone={d.resolved_at ? 'green' : 'red'}>{String(d.status).replace(/_/g, ' ')}</Badge></Td>
                </tr>
              ))}
              {disputes.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-6">No disputes raised.</Td></tr>}
            </Table>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Registry list ═══════════════ */

export default function ConsumerRegistry() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function load(p = page, search = q) {
    const res = await request(`${API}/admin/consumers?page=${p}&limit=${LIMIT}&search=${encodeURIComponent(search)}`);
    setData(await res.json());
  }
  useEffect(() => { load(1, ''); }, []);

  function onSearch(v: string) {
    setQ(v); setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, v), 300);
  }

  async function toggleVerify(c: any, e: React.MouseEvent) {
    e.stopPropagation();
    await request(`${API}/admin/consumers/${c.id}/verify`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityVerified: !c.identityVerified }),
    });
    load();
  }

  if (openId) return <Layout><ConsumerFile id={openId} onBack={() => setOpenId(null)} onChanged={() => load()} /></Layout>;
  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { consumers, total, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BookUser} tint="#4F6EF7" title="Consumer Registry"
          subtitle="Master index of consumers with bureau records, identity status and file depth" />

        <KpiGrid items={[
          { label: 'Registered Consumers', value: summary.all.toLocaleString(), icon: BookUser, tint: '#4F6EF7' },
          { label: 'Identity Verified', value: summary.verified.toLocaleString(), icon: UserCheck, tint: '#10B981', sub: `${Math.round((summary.verified / Math.max(1, summary.all)) * 100)}% of registry` },
          { label: 'With Credit History', value: summary.withHistory.toLocaleString(), icon: FileStack, tint: '#6366F1' },
          { label: 'Thin-File Consumers', value: summary.thinFile.toLocaleString(), icon: FileQuestion, tint: '#F59E0B', sub: '< 3 tradelines' },
        ]} />

        <Panel title="Consumer Index" subtitle="Click a consumer to open their full bureau file"
          action={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={q} onChange={e => onSearch(e.target.value)} placeholder="Search name, NRC or phone…"
                className="bg-transparent outline-none text-sm w-52 placeholder:text-gray-400" />
            </div>
          }>
          <Table head={['Consumer', 'NRC', 'Province', 'Tradelines', 'Institutions', 'Latest Score', 'Identity', 'File Depth', 'Actions']}>
            {consumers.map((c: any) => (
              <tr key={c.id} onClick={() => setOpenId(c.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td>
                  <p className="font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-muted-foreground">DOB {c.dateOfBirth}</p>
                </Td>
                <Td className="font-mono text-xs">{maskNrc(c.nrc)}</Td>
                <Td className="text-muted-foreground">{c.province}</Td>
                <Td>{c.tradelines}</Td>
                <Td>{c.institutions}</Td>
                <Td>{c.latestScore != null ? <Badge tone={scoreTone(c.latestScore)}>{c.latestScore}</Badge> : <span className="text-muted-foreground text-xs">unscored</span>}</Td>
                <Td><Badge tone={c.identityVerified ? 'green' : 'amber'}>{c.identityVerified ? 'verified' : 'pending'}</Badge></Td>
                <Td><Badge tone={c.tradelines < 3 ? 'amber' : 'blue'}>{c.tradelines < 3 ? 'thin file' : 'full file'}</Badge></Td>
                <Td>
                  <button onClick={e => toggleVerify(c, e)} className="text-xs font-medium text-blue-600 hover:underline">
                    {c.identityVerified ? 'Unverify' : 'Verify ID'}
                  </button>
                </Td>
              </tr>
            ))}
            {consumers.length === 0 && <tr><Td colSpan={9} className="text-center text-muted-foreground py-8">No consumers match your search.</Td></tr>}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={p => { setPage(p); load(p); }} />
        </Panel>
      </div>
    </Layout>
  );
}
