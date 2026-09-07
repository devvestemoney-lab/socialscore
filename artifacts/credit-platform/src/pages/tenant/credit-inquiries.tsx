import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Pager, Modal, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  FileSearch, Zap, Feather, Ban, Users2, Search, Download, FileText,
  ShieldCheck, ShieldAlert, Fingerprint, Phone, MapPin, ClipboardCheck,
} from 'lucide-react';
import { BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ReportView, bandTone } from './report-view';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const OUTCOME: Record<string, { label: string; tone: string }> = {
  report_issued: { label: 'report issued', tone: 'green' },
  declined_no_consent: { label: 'declined — no consent', tone: 'red' },
  declined_policy: { label: 'declined — policy', tone: 'red' },
};

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString()
    ? `${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function TenantCreditInquiries() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const buildQuery = (p: number, k = kind, o = outcome, q = search) =>
    `page=${p}&limit=${LIMIT}${k !== 'all' ? `&kind=${k}` : ''}${o !== 'all' ? `&outcome=${o}` : ''}${q ? `&search=${encodeURIComponent(q)}` : ''}`;

  async function load(p = page, k = kind, o = outcome, q = search) {
    const res = await request(`${API}/tenant/credit-inquiries?${buildQuery(p, k, o, q)}`);
    setData(await res.json());
  }
  useEffect(() => { load(1); }, []);

  const setKindF = (k: string) => { setKind(k); setPage(1); load(1, k, outcome, search); };
  const setOutcomeF = (o: string) => { setOutcome(o); setPage(1); load(1, kind, o, search); };
  const onSearch = (q: string) => {
    setSearch(q); setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, kind, outcome, q), 300);
  };
  const onPage = (p: number) => { setPage(p); load(p); };

  async function openDetail(id: string) {
    setDetailLoading(true); setDetail({ id });
    const res = await request(`${API}/tenant/credit-inquiries/${id}`);
    setDetail(await res.json());
    setDetailLoading(false);
  }

  async function exportCsv() {
    const res = await request(`${API}/tenant/credit-inquiries?${buildQuery(1, kind, outcome, search)}&limit=100`);
    const body = await res.json();
    const rows = [
      ['Date', 'Consumer', 'NRC', 'Type', 'Purpose', 'Outcome'],
      ...body.inquiries.map((i: any) => [
        new Date(i.createdAt).toISOString(), i.consumerName, i.nrc, i.kind, `"${i.purpose.replace(/"/g, '""')}"`,
        OUTCOME[i.outcome]?.label ?? i.outcome,
      ]),
    ];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `credit-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (openReportId) {
    return <Layout><ReportView id={openReportId} onBack={() => setOpenReportId(null)} /></Layout>;
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { inquiries, total, summary, trend } = data;
  const inq = detail?.inquiry;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileSearch} tint="#6366F1" title="Credit Inquiries"
          subtitle="Every inquiry your institution has made against consumer files — live from the bureau"
          actions={
            <button onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          } />

        <KpiGrid items={[
          { label: 'Inquiries (30d)', value: summary.last30d.toLocaleString(), icon: FileSearch, tint: '#4F6EF7', sub: `${summary.today} today` },
          { label: 'Hard', value: summary.hard.toLocaleString(), icon: Zap, tint: '#F59E0B', sub: summary.last30d ? `${Math.round((summary.hard / summary.last30d) * 100)}% of total` : undefined },
          { label: 'Soft', value: summary.soft.toLocaleString(), icon: Feather, tint: '#14B8A6' },
          { label: 'Declined', value: summary.declined.toLocaleString(), icon: Ban, tint: '#EF4444', sub: 'consent & policy blocks' },
          { label: 'Unique Consumers', value: summary.uniqueConsumers.toLocaleString(), icon: Users2, tint: '#8B5CF6', sub: 'last 30 days' },
        ]} />

        <Panel title="Inquiry Volume — last 14 days" padded>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <RBar dataKey="hard" name="Hard" stackId="a" fill="#F59E0B" />
                <RBar dataKey="soft" name="Soft" stackId="a" fill="#14B8A6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {['all', 'hard', 'soft'].map(f => (
              <button key={f} onClick={() => setKindF(f)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                  kind === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{f}</button>
            ))}
          </div>
          <select value={outcome} onChange={e => setOutcomeF(e.target.value)}
            className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-gray-700 outline-none">
            <option value="all">All outcomes</option>
            <option value="report_issued">Report issued</option>
            <option value="declined_no_consent">Declined — no consent</option>
            <option value="declined_policy">Declined — policy</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white ml-auto">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search consumer or NRC…"
              className="bg-transparent outline-none text-sm w-48 placeholder:text-gray-400" />
          </div>
        </div>

        <Panel title="Inquiry Log" subtitle={`${total.toLocaleString()} inquiries on record — click a row for detail`}>
          <Table head={['Consumer', 'NRC', 'Type', 'Purpose', 'When', 'Outcome', '']}>
            {inquiries.map((i: any) => (
              <tr key={i.id} onClick={() => openDetail(i.id)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-semibold text-gray-900">{i.consumerName}</Td>
                <Td className="font-mono text-xs">{i.nrc}</Td>
                <Td><Badge tone={i.kind === 'hard' ? 'amber' : 'cyan'}>{i.kind}</Badge></Td>
                <Td className="text-muted-foreground max-w-[240px] truncate">{i.purpose}</Td>
                <Td className="text-muted-foreground">{fmtWhen(i.createdAt)}</Td>
                <Td><Badge tone={OUTCOME[i.outcome]?.tone ?? 'slate'}>{OUTCOME[i.outcome]?.label ?? i.outcome}</Badge></Td>
                <Td>{i.reportId && <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><FileText className="w-3 h-3" /> report</span>}</Td>
              </tr>
            ))}
            {inquiries.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No inquiries match your filters.</Td></tr>}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={onPage} />
        </Panel>
      </div>

      {/* detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title="Inquiry Detail"
        subtitle={inq ? `${inq.kind === 'hard' ? 'Hard' : 'Soft'} inquiry · ${fmtWhen(inq.createdAt)}` : undefined}>
        {detailLoading || !inq ? (
          <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={inq.kind === 'hard' ? 'amber' : 'cyan'}>{inq.kind} inquiry</Badge>
              <Badge tone={OUTCOME[inq.outcome]?.tone ?? 'slate'}>{OUTCOME[inq.outcome]?.label ?? inq.outcome}</Badge>
              {detail.latestScore && <Badge tone={bandTone[detail.latestScore.score >= 720 ? 'A' : detail.latestScore.score >= 660 ? 'B' : detail.latestScore.score >= 580 ? 'C' : 'D'] ?? 'slate'}>Score {detail.latestScore.score} · {detail.latestScore.rating}</Badge>}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Stated Purpose</p>
              <p className="text-sm text-gray-900">{inq.purpose}</p>
            </div>

            {detail.customer && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Consumer</p>
                <div className="flex items-center gap-2.5 flex-wrap mb-2">
                  <p className="font-display font-bold text-gray-900">{detail.customer.firstName} {detail.customer.lastName}</p>
                  {detail.customer.identityVerified
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" /> verified</span>
                    : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><ShieldAlert className="w-3.5 h-3.5" /> unverified</span>}
                </div>
                <div className="grid sm:grid-cols-3 gap-2 text-sm text-gray-700">
                  <span className="inline-flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5 text-gray-400" /><span className="font-mono text-xs">{detail.customer.nrc}</span></span>
                  <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{detail.customer.phone}</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{detail.customer.province}</span>
                </div>
                <p className={cn('inline-flex items-center gap-1.5 text-sm mt-3 font-medium', detail.consent.forTenant > 0 || detail.customer.consentGiven ? 'text-emerald-600' : 'text-rose-600')}>
                  <ClipboardCheck className="w-4 h-4" />
                  {detail.consent.forTenant > 0 || detail.customer.consentGiven
                    ? `Consent on file (${detail.consent.active} active record${detail.consent.active !== 1 ? 's' : ''})`
                    : 'No active consent — hard pulls will be declined'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {detail.report ? (
                <button onClick={() => { setDetail(null); setOpenReportId(detail.report.id); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                  <FileText className="w-4 h-4" /> Open Full Report ({detail.report.reference})
                </button>
              ) : inq.outcome === 'report_issued' && inq.kind === 'soft' ? (
                <p className="flex-1 text-center text-sm text-muted-foreground py-2.5">Soft pull — no report document was generated.</p>
              ) : (
                <p className="flex-1 text-center text-sm text-rose-600 py-2.5">Inquiry was declined — capture consumer consent, then pull again from Consumer Search.</p>
              )}
              <button onClick={() => setDetail(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
