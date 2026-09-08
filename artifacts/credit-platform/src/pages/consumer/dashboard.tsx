import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Panel, Badge, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  TrendingUp, TrendingDown, Wallet, FileSearch, Bell, Scale, ClipboardCheck,
  Download, ArrowRight, ShieldCheck, ShieldAlert, Sparkles, AlertTriangle,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API, ScoreDial, FactorRow, FACTOR_HINTS, money, fmtDate, ago, bandTone } from './kit';
import { cn } from '@/lib/utils';

export default function ConsumerDashboard() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/overview`);
      setData(res.ok ? await res.json() : null);
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { customer: c, score, history, summary, inquiries } = data;
  const chart = history.map((h: any) => ({ date: new Date(h.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), score: h.score }));

  return (
    <Layout>
      <div className="space-y-6">
        {/* greeting */}
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Hello, {c.firstName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's where your credit stands today
            {score?.updatedAt && ` · last updated ${ago(score.updatedAt)}`}
          </p>
        </div>

        {summary.unreadAlerts > 0 && (
          <Link href="/my/alerts" className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm hover:bg-amber-100/70 transition-colors">
            <Bell className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">You have <b>{summary.unreadAlerts} unread alert{summary.unreadAlerts !== 1 ? 's' : ''}</b> about your credit file.</span>
            <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
          </Link>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* score */}
          <Panel padded>
            <div className="flex flex-col items-center">
              {score ? (
                <>
                  <ScoreDial score={score.value} band={score.band} rating={score.rating} />
                  {score.change != null && (
                    <p className={cn('mt-3 inline-flex items-center gap-1.5 text-sm font-semibold',
                      score.change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {score.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {score.change >= 0 ? '+' : ''}{score.change} points since your last update
                    </p>
                  )}
                  <Link href="/my/score" className="mt-4 w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
                    See what's driving my score
                  </Link>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="font-display font-bold text-gray-900">Not yet scored</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    You need a little more credit history before we can calculate a score.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          {/* trend */}
          <Panel title="Your score over time" className="lg:col-span-2" padded>
            {chart.length > 1 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[300, 850]} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2.5} fill="url(#cdGrad)"
                      dot={{ r: 3.5, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">
                We'll show your trend here once you have been scored more than once.
              </p>
            )}
          </Panel>
        </div>

        {/* at a glance */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Wallet, tint: '#4F6EF7', label: 'What you owe', value: money(summary.totalOwed), sub: `across ${summary.activeAccounts} open account(s)`, href: '/my/accounts' },
            { icon: FileSearch, tint: '#8B5CF6', label: 'Searches in 90 days', value: summary.inquiries90d, sub: `${summary.hardInquiries90d} were full checks`, href: '/my/inquiries' },
            { icon: Scale, tint: summary.openDisputes ? '#F59E0B' : '#10B981', label: 'Open disputes', value: summary.openDisputes, sub: summary.openDisputes ? 'in progress' : 'nothing under dispute', href: '/my/disputes' },
            { icon: ClipboardCheck, tint: '#14B8A6', label: 'Lenders with consent', value: summary.activeConsents, sub: 'can see your file', href: '/my/consent' },
          ].map(k => (
            <Link key={k.label} href={k.href} className="p-5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all block">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* factors */}
          {score?.breakdown && (
            <Panel title="What's affecting your score" subtitle="The five things lenders look at most" padded>
              <div className="space-y-4">
                {Object.entries(FACTOR_HINTS).map(([key, meta]) => (
                  <FactorRow key={key} label={meta.label} value={Number(score.breakdown[key] ?? 0)} hint={meta.hint} />
                ))}
              </div>
              <Link href="/my/simulator" className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold transition-colors">
                <Sparkles className="w-4 h-4" /> Try the score simulator
              </Link>
            </Panel>
          )}

          {/* recent activity */}
          <Panel title="Who's been looking" subtitle="Recent searches against your file" padded>
            <div className="space-y-3">
              {inquiries.slice(0, 6).map((i: any) => (
                <div key={i.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', i.kind === 'hard' ? 'bg-amber-400' : 'bg-slate-300')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{i.institutionName}</p>
                    <p className="text-xs text-muted-foreground truncate">{i.purpose}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={i.kind === 'hard' ? 'amber' : 'slate'}>{i.kind === 'hard' ? 'full check' : 'soft check'}</Badge>
                    <p className="text-[11px] text-gray-400 mt-1">{ago(i.createdAt)}</p>
                  </div>
                </div>
              ))}
              {inquiries.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No one has searched your file yet.</p>}
            </div>
            <Link href="/my/inquiries" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
              See all searches <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Panel>
        </div>

        {/* free report nudge */}
        <Panel padded>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <p className="font-semibold text-gray-900">
                {summary.freeReportsRemaining > 0
                  ? `You have ${summary.freeReportsRemaining} free report${summary.freeReportsRemaining !== 1 ? 's' : ''} left this year`
                  : 'You have used your free reports for this year'}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                The law entitles you to {summary.freeReportsPerYear} free copies of your credit report every year.
              </p>
            </div>
            <Link href="/my/download" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
              Get my report
            </Link>
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
