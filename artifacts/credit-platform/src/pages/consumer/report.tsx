import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileText, Printer, Download, ShieldCheck, ShieldAlert, Landmark, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
import { API, ScoreDial, money, fmtDate, bandTone } from './kit';
import { cn } from '@/lib/utils';

const loanTone: Record<string, string> = { active: 'blue', closed: 'green', defaulted: 'red', written_off: 'red' };
const OUTCOME: Record<string, string> = {
  report_issued: 'Report issued', declined_no_consent: 'Refused — no consent', declined_policy: 'Refused — policy',
};

export default function MyCreditReport() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/overview`);
      setData(res.ok ? await res.json() : null);
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { customer: c, score, summary, accounts, inquiries } = data;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <PageHeader icon={FileText} tint="#10B981" title="My Credit Report"
            subtitle="The complete record lenders see about you" />
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
              <Printer className="w-4 h-4" /> Print
            </button>
            <Link href="/my/download" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              <Download className="w-4 h-4" /> Download PDF
            </Link>
          </div>
        </div>

        <Panel padded>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">Social Score · Consumer Credit Report</p>
          <div className="flex flex-wrap items-start justify-between gap-6 mt-3">
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">{c.firstName} {c.lastName}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span>NRC <span className="font-mono text-xs text-gray-700">{c.nrc}</span></span>
                <span>DOB {c.dateOfBirth}</span>
                <span>{c.phone}</span>
                <span>{c.province}</span>
              </div>
              <div className="mt-3">
                {c.identityVerified
                  ? <Badge tone="green"><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> identity verified</span></Badge>
                  : <Badge tone="amber"><span className="inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> verification pending</span></Badge>}
              </div>
            </div>
            {score && <ScoreDial score={score.value} band={score.band} rating={score.rating} size={180} />}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-slate-100">
            Issued {fmtDate(new Date().toISOString())} · This report reflects what lenders have reported to the bureau.
            If anything is wrong you can challenge it free of charge under <b>Disputes &amp; Corrections</b>.
          </p>
        </Panel>

        <Panel title="1 · Summary" padded>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Accounts', summary.accounts], ['Open', summary.activeAccounts], ['Closed', summary.closedAccounts],
              ['Adverse', summary.adverseAccounts, summary.adverseAccounts > 0 && 'text-rose-600'],
              ['Currently owed', money(summary.totalOwed)],
              ['Missed payments', summary.missedPayments, summary.missedPayments > 0 && 'text-rose-600'],
            ].map(([l, v, cls]: any) => (
              <div key={l} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className={cn('text-xl font-bold text-gray-900', cls)}>{v}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          {summary.adverseAccounts > 0 && (
            <p className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              You have {summary.adverseAccounts} adverse record(s). These stay on your file for up to seven years and
              significantly affect your score — but their impact fades as they age and as you build a clean record.
            </p>
          )}
        </Panel>

        <Panel title={`2 · Your accounts (${accounts.length})`} subtitle="Every facility lenders have reported">
          <Table head={['Lender', 'Type', 'Borrowed', 'Still owed', 'Repaid', 'Opened', 'Missed', 'Status']}>
            {accounts.map((a: any) => {
              const repaid = Number(a.amount) > 0 ? Math.min(100, Math.round(((Number(a.amount) - Number(a.outstandingBalance)) / Number(a.amount)) * 100)) : 0;
              return (
                <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900"><span className="inline-flex items-center gap-2"><Landmark className="w-3.5 h-3.5 text-gray-300" />{a.institution}</span></Td>
                  <Td><Badge tone="slate">{a.institutionType.toUpperCase()}</Badge></Td>
                  <Td>{money(a.amount)}</Td>
                  <Td className={Number(a.outstandingBalance) > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{money(a.outstandingBalance)}</Td>
                  <Td className="w-28"><div className="flex items-center gap-2"><Bar value={repaid} color="#10B981" /><span className="text-xs text-muted-foreground">{repaid}%</span></div></Td>
                  <Td className="text-muted-foreground">{fmtDate(a.disbursedAt)}</Td>
                  <Td className={a.missedPayments > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{a.missedPayments}</Td>
                  <Td><Badge tone={loanTone[a.status] ?? 'slate'}>{a.status.replace('_', ' ')}</Badge></Td>
                </tr>
              );
            })}
            {accounts.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No accounts are reported on your file.</Td></tr>}
          </Table>
        </Panel>

        <Panel title={`3 · Who has searched your file (${inquiries.length})`} subtitle="Full checks stay visible to other lenders for 12 months">
          <Table head={['Date', 'Who', 'Type', 'Why', 'Outcome']}>
            {inquiries.map((i: any) => (
              <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="text-muted-foreground">{fmtDate(i.createdAt)}</Td>
                <Td className="font-medium text-gray-900">{i.institutionName}</Td>
                <Td><Badge tone={i.kind === 'hard' ? 'amber' : 'slate'}>{i.kind === 'hard' ? 'full check' : 'soft check'}</Badge></Td>
                <Td className="text-muted-foreground max-w-[260px] truncate">{i.purpose}</Td>
                <Td className="text-muted-foreground">{OUTCOME[i.outcome] ?? i.outcome}</Td>
              </tr>
            ))}
            {inquiries.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">No one has searched your file.</Td></tr>}
          </Table>
        </Panel>

        <p className="text-[11px] text-gray-400 leading-relaxed px-1 pb-2">
          This report is issued to you under the Bank of Zambia credit reporting directives and the Data Protection Act (2021).
          You are entitled to two free copies each year and may dispute any entry you believe is inaccurate.
        </p>
      </div>
    </Layout>
  );
}
