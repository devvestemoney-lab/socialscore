import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Pager, Bar, Modal } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  BookUser, Users2, AlertTriangle, Wallet, Gauge, Search, Download, FileText,
  Fingerprint, Phone, MapPin, ShieldCheck, ShieldAlert, ClipboardCheck, Landmark, PieChart,
} from 'lucide-react';
import { ReportView, bandTone } from './report-view';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const REL: Record<string, { label: string; tone: string }> = {
  active_borrower: { label: 'Active borrower', tone: 'green' },
  in_arrears: { label: 'In arrears', tone: 'red' },
  closed: { label: 'Closed', tone: 'slate' },
  applicant: { label: 'Applicant', tone: 'blue' },
};
const loanTone: Record<string, string> = { active: 'green', closed: 'slate', defaulted: 'red', written_off: 'red' };
const bandOf = (s: number | null) => (s == null ? null : s >= 720 ? 'A' : s >= 660 ? 'B' : s >= 580 ? 'C' : s >= 480 ? 'D' : 'E');
const money = (v: number) => (v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M` : `K${Math.round(v).toLocaleString()}`);
const maskNrc = (nrc: string) => `****${nrc.slice(nrc.indexOf('/'))}`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function ConsumersDirectory() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [rel, setRel] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const query = (p: number, r = rel, q = search) =>
    `page=${p}&limit=${LIMIT}${r !== 'all' ? `&relationship=${r}` : ''}${q ? `&search=${encodeURIComponent(q)}` : ''}`;

  async function load(p = page, r = rel, q = search) {
    const res = await request(`${API}/tenant/consumers?${query(p, r, q)}`);
    setData(await res.json());
  }
  useEffect(() => { load(1); }, []);

  const setRelF = (r: string) => { setRel(r); setPage(1); load(1, r, search); };
  const onSearch = (q: string) => {
    setSearch(q); setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, rel, q), 300);
  };

  async function openDetail(id: string) {
    setDetailLoading(true); setDetail({ id });
    const res = await request(`${API}/tenant/consumers/${id}`);
    setDetail(await res.json());
    setDetailLoading(false);
  }

  async function exportCsv() {
    const res = await request(`${API}/tenant/consumers?${query(1, rel, search)}&limit=100`);
    const body = await res.json();
    const rows = [
      ['Consumer', 'NRC', 'Relationship', 'Products', 'Your Exposure', 'Bureau Exposure', 'Score', 'Missed Payments'],
      ...body.consumers.map((c: any) => [
        `${c.first_name} ${c.last_name}`, c.nrc, REL[c.relationship]?.label ?? c.relationship,
        c.products, Math.round(c.exposure), Math.round(c.bureau_exposure), c.score ?? '', c.missed,
      ]),
    ];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `consumer-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (openReportId) return <Layout><ReportView id={openReportId} onBack={() => setOpenReportId(null)} /></Layout>;
  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { consumers, total, summary, institution } = data;
  const c = detail?.customer;
  const pos = detail?.position;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BookUser} tint="#4F6EF7" title="Consumer Directory"
          subtitle={`Consumers with a relationship to ${institution} — live from the bureau`}
          actions={
            <button onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          } />

        <KpiGrid items={[
          { label: 'Total Relationships', value: summary.total?.toLocaleString() ?? 0, icon: Users2, tint: '#4F6EF7', sub: `${summary.applicants} applicants` },
          { label: 'Active Borrowers', value: summary.active?.toLocaleString() ?? 0, icon: BookUser, tint: '#10B981' },
          { label: 'In Arrears', value: summary.arrears ?? 0, icon: AlertTriangle, tint: '#EF4444', sub: summary.active ? `${Math.round((summary.arrears / Math.max(1, summary.active + summary.arrears)) * 100)}% of book` : undefined },
          { label: 'Your Exposure', value: money(summary.total_exposure ?? 0), icon: Wallet, tint: '#8B5CF6' },
          { label: 'Avg Bureau Score', value: summary.avg_score ?? 0, icon: Gauge, tint: '#14B8A6', sub: 'across your consumers' },
        ]} />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {['all', 'active_borrower', 'in_arrears', 'applicant', 'closed'].map(f => (
              <button key={f} onClick={() => setRelF(f)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                  rel === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
                {f === 'all' ? 'All' : REL[f].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white ml-auto">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search name or NRC…"
              className="bg-transparent outline-none text-sm w-48 placeholder:text-gray-400" />
          </div>
        </div>

        <Panel title="Directory" subtitle={`${total.toLocaleString()} consumers — click a row to open their file`}>
          <Table head={['Consumer', 'NRC', 'Relationship', 'Products', 'Your Exposure', 'Wallet Share', 'Score', '']}>
            {consumers.map((r: any) => {
              const share = r.bureau_exposure > 0 ? Math.round((r.exposure / r.bureau_exposure) * 100) : 0;
              const band = bandOf(r.score);
              return (
                <tr key={r.id} onClick={() => openDetail(r.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <Td>
                    <p className="font-semibold text-gray-900">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.province} · {r.inquiries} inquir{r.inquiries === 1 ? 'y' : 'ies'} by you</p>
                  </Td>
                  <Td className="font-mono text-xs">{maskNrc(r.nrc)}</Td>
                  <Td>
                    <Badge tone={REL[r.relationship]?.tone ?? 'slate'}>{REL[r.relationship]?.label ?? r.relationship}</Badge>
                    {r.missed > 0 && <span className="ml-2 text-[11px] font-bold text-rose-600">{r.missed} missed</span>}
                  </Td>
                  <Td>{r.products || '—'}</Td>
                  <Td className={r.exposure > 0 ? 'font-medium text-gray-900' : 'text-muted-foreground'}>{r.exposure > 0 ? money(r.exposure) : '—'}</Td>
                  <Td className="w-32">
                    {r.bureau_exposure > 0 ? (
                      <div className="flex items-center gap-2">
                        <Bar value={share} color={share >= 60 ? '#10B981' : share >= 30 ? '#4F6EF7' : '#F59E0B'} />
                        <span className="text-xs text-muted-foreground w-8">{share}%</span>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </Td>
                  <Td>{band ? <Badge tone={bandTone[band]}>{band} ({r.score})</Badge> : <Badge tone="slate">unscored</Badge>}</Td>
                  <Td><span className="text-xs font-semibold text-blue-600">View file</span></Td>
                </tr>
              );
            })}
            {consumers.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No consumers match your filters.</Td></tr>}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={p => { setPage(p); load(p); }} />
        </Panel>
      </div>

      {/* consumer file */}
      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title={c ? `${c.firstName} ${c.lastName}` : 'Consumer File'}
        subtitle={c ? `${maskNrc(c.nrc)} · ${c.phone} · ${c.province}` : undefined}>
        {detailLoading || !c ? (
          <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {c.identityVerified
                ? <Badge tone="green"><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> verified</span></Badge>
                : <Badge tone="amber"><span className="inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> unverified</span></Badge>}
              <Badge tone={detail.consent.forTenant > 0 || c.consentGiven ? 'green' : 'red'}>
                <span className="inline-flex items-center gap-1"><ClipboardCheck className="w-3 h-3" />
                  {detail.consent.forTenant > 0 || c.consentGiven ? 'consent on file' : 'no consent'}</span>
              </Badge>
              {detail.latestScore && (
                <Badge tone={bandTone[bandOf(Math.round(Number(detail.latestScore.score)))!] ?? 'slate'}>
                  Score {Math.round(Number(detail.latestScore.score))} · {detail.latestScore.rating}
                </Badge>
              )}
            </div>

            {/* your position */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Your Position vs the Bureau</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Your products', pos.myProducts], ['Your exposure', money(pos.myExposure)],
                  ['Bureau exposure', money(pos.bureauExposure)], ['Other institutions', pos.otherInstitutions],
                ].map(([l, v]: any) => (
                  <div key={l} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="text-base font-bold text-gray-900">{v}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-900"><PieChart className="w-3.5 h-3.5 text-gray-400" /> Wallet share</span>
                  <span className="text-muted-foreground">{pos.walletShare}% of their total outstanding debt is with you</span>
                </div>
                <Bar value={pos.walletShare} color={pos.walletShare >= 60 ? '#10B981' : pos.walletShare >= 30 ? '#4F6EF7' : '#F59E0B'} />
              </div>
              {pos.myMissed > 0 && (
                <p className="mt-3 text-sm text-rose-600 font-medium inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {pos.myMissed} missed payment{pos.myMissed !== 1 ? 's' : ''} on your facilities
                </p>
              )}
            </div>

            {/* facilities */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Your Facilities ({detail.myLoans.length})</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table head={['Principal', 'Outstanding', 'Rate', 'Disbursed', 'Missed', 'Status']}>
                  {detail.myLoans.map((l: any) => (
                    <tr key={l.id}>
                      <Td>{money(Number(l.amount))}</Td>
                      <Td className={Number(l.outstandingBalance) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{money(Number(l.outstandingBalance))}</Td>
                      <Td className="text-muted-foreground">{Number(l.interestRate).toFixed(0)}%</Td>
                      <Td className="text-muted-foreground">{fmtDate(l.disbursedAt)}</Td>
                      <Td className={l.missedPayments > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{l.missedPayments}</Td>
                      <Td><Badge tone={loanTone[l.status] ?? 'slate'}>{l.status.replace('_', ' ')}</Badge></Td>
                    </tr>
                  ))}
                  {detail.myLoans.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground">No facilities booked with you — applicant only.</Td></tr>}
                </Table>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Exposure Elsewhere ({detail.otherLoans.length})</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
                <Table head={['Institution', 'Outstanding', 'Missed', 'Status']}>
                  {detail.otherLoans.map((l: any) => (
                    <tr key={l.id}>
                      <Td className="font-medium text-gray-900"><span className="inline-flex items-center gap-2"><Landmark className="w-3.5 h-3.5 text-gray-300" />{l.institution}</span></Td>
                      <Td>{money(Number(l.outstandingBalance))}</Td>
                      <Td className={l.missedPayments > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{l.missedPayments}</Td>
                      <Td><Badge tone={loanTone[l.status] ?? 'slate'}>{l.status.replace('_', ' ')}</Badge></Td>
                    </tr>
                  ))}
                  {detail.otherLoans.length === 0 && <tr><Td colSpan={4} className="text-center text-muted-foreground">No facilities at other institutions.</Td></tr>}
                </Table>
              </div>
            </div>

            {detail.reports.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Your Reports on This Consumer</p>
                <div className="space-y-1.5">
                  {detail.reports.map((r: any) => (
                    <button key={r.id} onClick={() => { setDetail(null); setOpenReportId(r.id); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 transition-colors text-left">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="font-mono text-xs text-blue-600">{r.reference}</span>
                      <span className="text-sm text-muted-foreground flex-1 truncate">{r.purpose}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
