import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { IdCard, ShieldCheck, ShieldAlert, Fingerprint, Phone, MapPin, CalendarDays, Mail, Landmark } from 'lucide-react';
import { API, money, fmtDate } from './kit';

function KV({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

export default function CreditProfile() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/overview`);
      setData(res.ok ? await res.json() : null);
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { customer: c, summary, accounts } = data;
  const lenders = [...new Set(accounts.map((a: any) => a.institution))];

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={IdCard} tint="#4F6EF7" title="My Credit Profile"
          subtitle="The identity information lenders see when they look you up" />

        <Panel padded>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #16A34A, #0F766E)' }}>
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-display font-bold text-gray-900">{c.firstName} {c.lastName}</h2>
                  {c.identityVerified
                    ? <Badge tone="green"><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> identity verified</span></Badge>
                    : <Badge tone="amber"><span className="inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> verification pending</span></Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">On the bureau since {fmtDate(c.memberSince)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mt-6 pt-5 border-t border-slate-100">
            <KV label="NRC" value={<span className="font-mono text-xs">{c.nrc}</span>} />
            <KV label="Date of birth" value={c.dateOfBirth} />
            <KV label="Province" value={c.province} />
            <KV label="Mobile number" value={c.phone} />
            <KV label="Email" value={c.email} />
            <KV label="Accounts on file" value={`${summary.accounts} from ${summary.lenders} lender(s)`} />
          </div>

          <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-slate-100">
            Your name, NRC and date of birth come from the National Registration records and cannot be changed here.
            You can update your phone, email and province under <b>Account → My Profile</b>.
          </p>
        </Panel>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="What the bureau holds about you" padded>
            <div className="space-y-3.5 text-sm">
              {[
                ['Credit accounts', `${summary.accounts} (${summary.activeAccounts} open, ${summary.closedAccounts} closed)`],
                ['Total borrowed over time', money(summary.totalBorrowed)],
                ['Currently owed', money(summary.totalOwed)],
                ['Missed payments recorded', summary.missedPayments],
                ['Adverse records', summary.adverseAccounts],
                ['Searches in the last 90 days', summary.inquiries90d],
              ].map(([l, v]: any) => (
                <div key={l} className="flex justify-between items-baseline pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{l}</span>
                  <b className="text-gray-900">{v}</b>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Lenders reporting about you" subtitle="Institutions that share data on your accounts">
            <Table head={['Lender', 'Accounts', 'Owed']}>
              {lenders.map((name: any) => {
                const mine = accounts.filter((a: any) => a.institution === name);
                const owed = mine.filter((a: any) => a.status !== 'closed').reduce((s: number, a: any) => s + Number(a.outstandingBalance), 0);
                return (
                  <tr key={name} className="hover:bg-slate-50/70 transition-colors">
                    <Td className="font-semibold text-gray-900"><span className="inline-flex items-center gap-2"><Landmark className="w-3.5 h-3.5 text-gray-300" />{name}</span></Td>
                    <Td>{mine.length}</Td>
                    <Td className={owed > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{money(owed)}</Td>
                  </tr>
                );
              })}
              {lenders.length === 0 && <tr><Td colSpan={3} className="text-center text-muted-foreground py-6">No lenders report on you yet.</Td></tr>}
            </Table>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
