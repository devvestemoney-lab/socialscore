import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Pager } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { BookUser, UserCheck, FileStack, FileQuestion, Search, ShieldCheck, ShieldAlert } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const LIMIT = 15;

const maskNrc = (nrc: string) => `****${nrc.slice(nrc.indexOf('/'))}`;
const bandTone = (s: number | null) => (s == null ? 'slate' : s >= 720 ? 'green' : s >= 660 ? 'blue' : s >= 580 ? 'amber' : 'red');
const loanTone: Record<string, string> = { active: 'blue', closed: 'green', defaulted: 'red', written_off: 'red' };

export default function ConsumerRegistry() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
  function onPage(p: number) { setPage(p); load(p); }

  async function openDetail(id: string) {
    setDetailLoading(true); setDetail({ id });
    const res = await request(`${API}/admin/consumers/${id}`);
    setDetail(await res.json());
    setDetailLoading(false);
  }

  async function toggleVerify(c: any) {
    const res = await request(`${API}/admin/consumers/${c.id}/verify`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityVerified: !c.identityVerified }),
    });
    if (res.ok) load();
  }

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

        <Panel title="Consumer Index"
          action={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={q} onChange={e => onSearch(e.target.value)} placeholder="Search name, NRC or phone…"
                className="bg-transparent outline-none text-sm w-52 placeholder:text-gray-400" />
            </div>
          }>
          <Table head={['Consumer', 'NRC', 'Province', 'Tradelines', 'Institutions', 'Latest Score', 'Identity', 'File Depth', 'Actions']}>
            {consumers.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => openDetail(c.id)}>
                <Td>
                  <p className="font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-muted-foreground">DOB {c.dateOfBirth}</p>
                </Td>
                <Td className="font-mono text-xs">{maskNrc(c.nrc)}</Td>
                <Td className="text-muted-foreground">{c.province}</Td>
                <Td>{c.tradelines}</Td>
                <Td>{c.institutions}</Td>
                <Td>{c.latestScore != null ? <Badge tone={bandTone(c.latestScore)}>{c.latestScore}</Badge> : <span className="text-muted-foreground text-xs">unscored</span>}</Td>
                <Td><Badge tone={c.identityVerified ? 'green' : 'amber'}>{c.identityVerified ? 'verified' : 'pending'}</Badge></Td>
                <Td><Badge tone={c.tradelines < 3 ? 'amber' : 'blue'}>{c.tradelines < 3 ? 'thin file' : 'full file'}</Badge></Td>
                <Td>
                  <button onClick={e => { e.stopPropagation(); toggleVerify(c); }}
                    className="text-xs font-medium text-blue-600 hover:underline">
                    {c.identityVerified ? 'Unverify' : 'Verify ID'}
                  </button>
                </Td>
              </tr>
            ))}
            {consumers.length === 0 && <tr><Td colSpan={9} className="text-center text-muted-foreground">No consumers match your search.</Td></tr>}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={onPage} />
        </Panel>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title={detail?.customer ? `${detail.customer.firstName} ${detail.customer.lastName}` : 'Consumer File'}
        subtitle={detail?.customer ? `${maskNrc(detail.customer.nrc)} · ${detail.customer.province} · ${detail.customer.phone}` : undefined}>
        {detailLoading || !detail?.customer ? (
          <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={detail.customer.identityVerified ? 'green' : 'amber'}>
                {detail.customer.identityVerified ? <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Identity verified</span> : <span className="inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Identity pending</span>}
              </Badge>
              <Badge tone={detail.customer.consentGiven ? 'blue' : 'red'}>{detail.customer.consentGiven ? 'consent on file' : 'no consent'}</Badge>
              {detail.scores[0] && <Badge tone={bandTone(Math.round(Number(detail.scores[0].score)))}>Score {Math.round(Number(detail.scores[0].score))} · {detail.scores[0].rating}</Badge>}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Tradelines ({detail.loans.length})</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table head={['Institution', 'Amount', 'Outstanding', 'Status', 'Missed', 'Disbursed']}>
                  {detail.loans.map((l: any) => (
                    <tr key={l.id}>
                      <Td className="font-medium text-gray-900">{l.institution}</Td>
                      <Td>K{Number(l.amount).toLocaleString()}</Td>
                      <Td>K{Number(l.outstandingBalance).toLocaleString()}</Td>
                      <Td><Badge tone={loanTone[l.status]}>{l.status.replace('_', ' ')}</Badge></Td>
                      <Td className={l.missedPayments > 0 ? 'text-rose-600 font-semibold' : ''}>{l.missedPayments}</Td>
                      <Td className="text-muted-foreground">{new Date(l.disbursedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Td>
                    </tr>
                  ))}
                  {detail.loans.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground">No tradelines on file.</Td></tr>}
                </Table>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Recent Inquiries ({detail.inquiries.length})</p>
              <div className="space-y-1.5">
                {detail.inquiries.slice(0, 5).map((i: any) => (
                  <div key={i.id} className="flex items-center gap-2 text-sm">
                    <Badge tone={i.kind === 'hard' ? 'amber' : 'cyan'}>{i.kind}</Badge>
                    <span className="text-gray-700 flex-1 truncate">{i.institutionName} — {i.purpose}</span>
                    <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))}
                {detail.inquiries.length === 0 && <p className="text-sm text-muted-foreground">No inquiries recorded.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
