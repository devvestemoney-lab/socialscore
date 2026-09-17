import { useEffect, useState } from 'react';
import { Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { BehaviouralRecord } from '@/components/behavioural-record';
import { useAuth } from '@/hooks/use-auth';
import {
  CalendarDays, ArrowLeft, Printer, Fingerprint, Phone, MapPin,
  ShieldCheck, ShieldAlert, ClipboardCheck, Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export const statusTone: Record<string, string> = { delivered: 'green', partial: 'amber', failed: 'red' };
export const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red' };
const loanTone: Record<string, string> = { active: 'green', closed: 'slate', defaulted: 'red', written_off: 'red' };
const OUTCOME: Record<string, { label: string; tone: string }> = {
  report_issued: { label: 'report issued', tone: 'green' },
  declined_no_consent: { label: 'declined — no consent', tone: 'red' },
  declined_policy: { label: 'declined — policy', tone: 'red' },
};
const FACTOR_LABELS: Record<string, string> = {
  repaymentHistory: 'Repayment History', loanDefaults: 'Default History',
  transactionPatterns: 'Transaction Patterns', mobileMoney: 'Mobile Money Behaviour', accountAge: 'Account Age',
};

const money = (v: number) => `K${Math.round(v).toLocaleString()}`;

const DIMENSION_COLORS: Record<string, string> = {
  credit: '#4F6EF7', payments: '#2563EB', housing: '#16A34A', commerce: '#8B5CF6',
  stability: '#14B8A6', education: '#F59E0B', reputation: '#EC4899',
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (iso: string) => fmtDate(iso) + ', ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/* ═══════════════ Full-scale report view ═══════════════ */

export function ReportView({ id, onBack }: { id: string; onBack: () => void }) {
  const { request, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/credit-reports/${id}`);
      if (!res.ok) { setNotFound(true); return; }
      setData(await res.json());
    })();
  }, [id]);

  if (notFound) return <Panel padded><p className="text-center text-muted-foreground py-10">Report not available for your institution.</p></Panel>;
  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { report, customer, latestScore, scoreHistory, loans, inquiries, consent, totals, dimensions = [], behaviouralRecord = [] } = data;
  const score = latestScore ? Math.round(Number(latestScore.score)) : null;
  const breakdown = latestScore?.scoreBreakdown ?? null;
  const initials = `${customer.firstName[0] ?? ''}${customer.lastName[0] ?? ''}`;

  return (
    <div className="space-y-5 print:space-y-4">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4" /> Back to Report Log
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* document header */}
      <Panel padded>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Social Score · Consumer Credit Report</p>
            <h1 className="text-2xl font-display font-bold text-gray-900 mt-1">{report.reference}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generated {fmtDateTime(report.createdAt)} · {(report.generationMs / 1000).toFixed(1)}s ·
              requested by <b className="text-gray-700">{user?.tenantName ?? report.institutionName}</b>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone[report.status]}>{report.status}</Badge>
            <Badge tone="blue">{report.purpose}</Badge>
          </div>
        </div>
      </Panel>

      {/* identity + score */}
      <div className="grid lg:grid-cols-5 gap-5 items-stretch">
        <Panel padded className="lg:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">1 · Consumer Identity</p>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C5CFC)' }}>{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-display font-bold text-gray-900">{customer.firstName} {customer.lastName}</h2>
                {customer.identityVerified
                  ? <Badge tone="green"><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> identity verified</span></Badge>
                  : <Badge tone="amber"><span className="inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> identity pending</span></Badge>}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
                <p className="inline-flex items-center gap-2 text-gray-700"><Fingerprint className="w-3.5 h-3.5 text-gray-400" /> NRC <span className="font-mono text-xs">{customer.nrc}</span></p>
                <p className="inline-flex items-center gap-2 text-gray-700"><CalendarDays className="w-3.5 h-3.5 text-gray-400" /> DOB {customer.dateOfBirth}</p>
                <p className="inline-flex items-center gap-2 text-gray-700"><Phone className="w-3.5 h-3.5 text-gray-400" /> {customer.phone}</p>
                <p className="inline-flex items-center gap-2 text-gray-700"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {customer.province} Province</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-100 text-sm">
            <span className="inline-flex items-center gap-1.5 text-gray-700"><ClipboardCheck className="w-4 h-4 text-emerald-500" /> {consent.active} active consent{consent.active !== 1 ? 's' : ''}</span>
            <span className={cn('inline-flex items-center gap-1.5', consent.forTenant > 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium')}>
              {consent.forTenant > 0 ? 'Your institution holds valid consent' : 'No direct consent for your institution'}
            </span>
            {consent.latestExpiry && <span className="text-xs text-muted-foreground">latest expiry {fmtDate(consent.latestExpiry)}</span>}
          </div>
        </Panel>

        <Panel padded className="lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">2 · Bureau Score</p>
          {latestScore ? (
            <div>
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <p className="text-5xl font-display font-extrabold text-gray-900">{score}</p>
                  <Badge tone={bandTone[report.band ?? 'C'] ?? 'slate'}>Band {report.band ?? '—'} · {latestScore.rating}</Badge>
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Probability of default</span>
                    <b className={Number(latestScore.probabilityOfDefault) > 0.2 ? 'text-rose-600' : 'text-emerald-600'}>{(Number(latestScore.probabilityOfDefault) * 100).toFixed(1)}%</b></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Scored on</span><b className="text-gray-900">{fmtDate(latestScore.createdAt)}</b></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Score history</span><b className="text-gray-900">{scoreHistory.length} run{scoreHistory.length !== 1 ? 's' : ''}</b></div>
                </div>
              </div>
              <p className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-[13px] text-gray-700">{latestScore.recommendation}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Consumer is unscored — insufficient credit history.</p>
          )}
        </Panel>
      </div>

      {/* score factors + account summary */}
      <div className="grid lg:grid-cols-5 gap-5 items-stretch">
        {breakdown && (
          <Panel padded className="lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">3 · Score Factors</p>
            <div className="space-y-3.5">
              {Object.entries(FACTOR_LABELS).map(([key, label]) => {
                const v = Number(breakdown[key] ?? 0);
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{label}</span>
                      <span className="text-muted-foreground">{v}/100</span>
                    </div>
                    <Bar value={v} color={v >= 75 ? '#10B981' : v >= 55 ? '#4F6EF7' : '#F59E0B'} />
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
        <Panel padded className={breakdown ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-4">{breakdown ? '4' : '3'} · Account Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ['Tradelines on file', totals.tradelines], ['Reporting institutions', totals.institutions],
              ['Active facilities', totals.activeLoans], ['Defaulted / written off', totals.defaulted, totals.defaulted > 0 && 'text-rose-600'],
              ['Total principal', money(totals.totalPrincipal)], ['Outstanding balance', money(totals.totalOutstanding), totals.totalOutstanding > 0 && 'text-amber-600'],
              ['Missed payments (all time)', totals.missedPayments12m, totals.missedPayments12m > 0 && 'text-rose-600'],
              ['Hard inquiries (90d)', totals.hardInquiries90d, totals.hardInquiries90d > 3 && 'text-amber-600'],
              ['Closed facilities', totals.closed],
            ].map(([label, value, cls]: any) => (
              <div key={label} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className={cn('text-xl font-bold text-gray-900', cls)}>{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* scoring dimensions */}
      {dimensions.length > 0 && (
        <Panel title="Scoring Dimensions"
          subtitle="What the score is built from, and how much reporting stands behind each dimension">
          <Table head={['Dimension', 'Weight', 'Score', 'Evidence', 'On time', 'Late', 'Missed', 'Reported by']}>
            {dimensions.map((d: any) => (
              <tr key={d.key} className={cn('hover:bg-slate-50/70 transition-colors', d.value == null && 'opacity-60')}>
                <Td>
                  <span className="font-semibold text-gray-900">{d.label}</span>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5 max-w-[220px] whitespace-normal">{d.description}</p>
                </Td>
                <Td className="text-muted-foreground">{d.weight}%</Td>
                <Td>
                  {d.value == null
                    ? <Badge tone="slate">not reported</Badge>
                    : (
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <span className="font-bold text-gray-900 w-7">{d.value}</span>
                        <div className="flex-1"><Bar value={d.value} color={DIMENSION_COLORS[d.key] ?? '#4F6EF7'} /></div>
                      </div>
                    )}
                </Td>
                <Td className="text-muted-foreground">{d.records || '—'}</Td>
                <Td className={d.onTime > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>{d.onTime || '—'}</Td>
                <Td className={d.late > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}>{d.late || '—'}</Td>
                <Td className={d.missed > 0 ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{d.missed || '—'}</Td>
                <Td className="text-muted-foreground text-xs max-w-[200px] whitespace-normal">
                  {d.sources?.length ? d.sources.join(', ') : '—'}
                </Td>
              </tr>
            ))}
          </Table>
          <p className="px-6 py-3 text-xs text-muted-foreground border-t border-slate-100">
            A dimension nobody has reported on is excluded from the score rather than counted as zero — its
            weight is shared across the dimensions that do have evidence, so a thin file is judged on what is
            actually known.
          </p>
        </Panel>
      )}

      {/* everything reported outside lending — rent, airtime, bills, school fees */}
      <BehaviouralRecord record={behaviouralRecord} />

      {/* tradelines */}
      <Panel title={`${breakdown ? '5' : '4'} · Tradelines (${loans.length})`} subtitle="All facilities reported to the bureau across institutions">
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
          {loans.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-6">No tradelines on file.</Td></tr>}
        </Table>
      </Panel>

      {/* inquiry footprint */}
      <Panel title={`${breakdown ? '6' : '5'} · Inquiry History (${inquiries.length})`} subtitle="Who has accessed this consumer's file recently">
        <Table head={['Date', 'Institution', 'Type', 'Purpose', 'Outcome']}>
          {inquiries.map((i: any) => (
            <tr key={i.id} className={cn('transition-colors', i.institutionName === (user?.tenantName ?? '') ? 'bg-blue-50/40' : 'hover:bg-slate-50/70')}>
              <Td className="text-muted-foreground">{fmtDate(i.createdAt)}</Td>
              <Td className="font-medium text-gray-900">{i.institutionName}{i.institutionName === (user?.tenantName ?? '') && <span className="ml-2 text-[10px] font-bold text-blue-500">YOU</span>}</Td>
              <Td><Badge tone={i.kind === 'hard' ? 'amber' : 'cyan'}>{i.kind}</Badge></Td>
              <Td className="text-muted-foreground max-w-[260px] truncate">{i.purpose}</Td>
              <Td><Badge tone={OUTCOME[i.outcome]?.tone ?? 'slate'}>{OUTCOME[i.outcome]?.label ?? i.outcome}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <p className="text-[11px] text-gray-400 leading-relaxed px-1 pb-2">
        This report was generated by Social Score for {user?.tenantName ?? report.institutionName} under stated purpose "{report.purpose}".
        It is confidential, intended solely for permissible credit assessment, and must not be shared with the consumer or third parties
        except as provided under the Bank of Zambia credit reporting directives and the Data Protection Act (2021).
        Disputes may be lodged by the consumer through any participating institution or the bureau's consumer portal.
      </p>
    </div>
  );
}

