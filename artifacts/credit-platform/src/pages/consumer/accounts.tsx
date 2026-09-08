import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Wallet, Landmark, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { API, money, fmtDate } from './kit';
import { cn } from '@/lib/utils';

const STANDING: Record<string, { label: string; tone: string; note: string }> = {
  good: { label: 'In good standing', tone: 'green', note: 'Payments are up to date' },
  behind: { label: 'Behind', tone: 'amber', note: 'One or two payments have been missed' },
  seriously_behind: { label: 'Seriously behind', tone: 'red', note: 'Three or more payments missed' },
  adverse: { label: 'Adverse', tone: 'red', note: 'Defaulted or written off — stays on file up to 7 years' },
};
const loanTone: Record<string, string> = { active: 'blue', closed: 'green', defaulted: 'red', written_off: 'red' };

export default function MyAccounts() {
  const { request } = useAuth();
  const [accounts, setAccounts] = useState<any[] | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/accounts`);
      setAccounts(res.ok ? (await res.json()).accounts : []);
    })();
  }, []);

  if (!accounts) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const open = accounts.filter(a => a.status !== 'closed');
  const shown = filter === 'all' ? accounts : filter === 'open' ? open
    : filter === 'closed' ? accounts.filter(a => a.status === 'closed')
    : accounts.filter(a => a.standing !== 'good');
  const owed = open.reduce((s, a) => s + Number(a.outstandingBalance), 0);
  const problems = accounts.filter(a => a.standing !== 'good').length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Wallet} tint="#4F6EF7" title="My Credit Accounts"
          subtitle="Every loan and facility lenders have reported about you" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Accounts on file', value: accounts.length, tint: '#4F6EF7', icon: Wallet },
            { label: 'Currently owed', value: money(owed), tint: '#8B5CF6', icon: Wallet },
            { label: 'Open accounts', value: open.length, tint: '#10B981', icon: CheckCircle2 },
            { label: 'Need attention', value: problems, tint: problems ? '#EF4444' : '#94A3B8', icon: AlertTriangle },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {problems > 0 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {problems} account{problems !== 1 ? 's need' : ' needs'} attention. Bringing them up to date is the fastest way to improve your score.
              If you believe a record is wrong, <Link href="/my/disputes" className="font-semibold underline">raise a dispute</Link>.
            </span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {[['all', 'All accounts'], ['open', 'Open'], ['closed', 'Closed'], ['attention', 'Need attention']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                filter === v ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        <div className="space-y-4">
          {shown.map(a => {
            const st = STANDING[a.standing];
            return (
              <div key={a.id} className={cn('p-5 rounded-xl bg-white border transition-all',
                a.standing === 'adverse' || a.standing === 'seriously_behind' ? 'border-rose-200' : 'border-slate-200')}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-gray-900">{a.institution}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {a.institutionType} · opened {fmtDate(a.disbursedAt)}
                        {a.dueDate && ` · due ${fmtDate(a.dueDate)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <Badge tone={loanTone[a.status] ?? 'slate'}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    ['Borrowed', money(a.amount)], ['Still owed', money(a.outstandingBalance)],
                    ['Interest rate', `${Number(a.interestRate).toFixed(0)}%`],
                    ['Missed payments', a.missedPayments, a.missedPayments > 0 && 'text-rose-600'],
                  ].map(([l, v, cls]: any) => (
                    <div key={l} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <p className={cn('text-base font-bold text-gray-900', cls)}>{v}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600">Repaid so far</span>
                    <span className="font-semibold text-gray-900">{a.repaidPct}%</span>
                  </div>
                  <Bar value={a.repaidPct} color={a.repaidPct >= 80 ? '#10B981' : a.repaidPct >= 40 ? '#4F6EF7' : '#F59E0B'} />
                  <p className="text-[11px] text-gray-400 mt-1.5">{st.note}</p>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && (
            <Panel padded><p className="text-center text-muted-foreground py-10">No accounts in this category.</p></Panel>
          )}
        </div>
      </div>
    </Layout>
  );
}
