import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetRiskProfile } from '@workspace/api-client-react';
import {
  Search, ShieldAlert, Sparkles, AlertCircle, CheckCircle, XCircle,
  ClockIcon, TrendingUp, BarChart3, Briefcase, Brain, Fingerprint,
  Phone, MapPin, Star, Eye, Download, Loader2, Wallet,
} from 'lucide-react';
import { CreditGauge } from '@/components/credit-gauge';
import { Panel, Badge, Table, Td, Field, inputCls } from '@/components/admin/page-kit';
import { RiskFlags, CashflowSummary, DIMENSION_COLORS } from '@/components/risk-signals';
import { formatCurrency, cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis } from 'recharts';
import { format } from 'date-fns';

type Tab = 'overview' | 'breakdown' | 'loans' | 'decision';

const LOAN_TONE: Record<string, string> = { active: 'green', defaulted: 'red', closed: 'slate', overdue: 'amber', written_off: 'red' };
const RISK_TONE: Record<string, string> = { Low: 'green', Medium: 'amber', High: 'amber', 'Very High': 'red', Critical: 'red' };
const PURPOSES = ['Loan origination', 'Credit review', 'Account opening', 'Credit limit increase', 'Collections'];

export default function TenantDashboard() {
  const { apiOptions } = useAuth();
  const [nrc, setNrc] = useState('123456/78/1');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [searchNrc, setSearchNrc] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loanAmount, setLoanAmount] = useState('50000');
  const [loanTerm, setLoanTerm] = useState('12');

  const { data, isLoading, error } = useGetRiskProfile(searchNrc, {
    request: apiOptions.request,
    query: { enabled: !!searchNrc, retry: false } as any,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nrc.trim()) { setSearchNrc(nrc.trim()); setActiveTab('overview'); }
  };

  const loans = data?.loanExposure?.loans ?? [];
  const creditScore = data?.creditScore ?? null;
  const score = creditScore?.score ?? 0;
  const highFlags = (data?.riskFlags ?? []).filter(f => f.severity === 'high');

  const getDecision = () => {
    const amount = parseFloat(loanAmount) || 0;
    const limit = data?.recommendedCreditLimit ?? 0;
    if (highFlags.length > 0 && score >= 580) return { decision: 'Refer', tone: 'amber', icon: ClockIcon, message: `High-severity risk flag${highFlags.length > 1 ? 's' : ''} on file (${highFlags.map(f => f.title.toLowerCase()).join(', ')}) — review before approving.` };
    if (score >= 660 && amount <= limit) return { decision: 'Approved', tone: 'emerald', icon: CheckCircle, message: 'Loan application meets all credit criteria. Recommend approval with standard terms.' };
    if (score >= 580 && amount <= limit * 1.2) return { decision: 'Refer', tone: 'amber', icon: ClockIcon, message: 'Application requires manual review. Consider requesting additional collateral or a guarantor.' };
    return { decision: 'Declined', tone: 'rose', icon: XCircle, message: 'Credit profile does not meet minimum lending criteria — high risk of default.' };
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'breakdown', label: 'Dimensions & Cash Flow', icon: TrendingUp },
    { id: 'loans', label: `Loan Portfolio (${loans.length})`, icon: Briefcase },
    { id: 'decision', label: 'Decision Engine', icon: Brain },
  ];

  const initials = data ? `${data.customer.firstName[0] ?? ''}${data.customer.lastName[0] ?? ''}` : '';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#4F6EF71A' }}>
              <Search className="w-5 h-5" style={{ color: '#4F6EF7' }} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">Credit Profile Lookup</h1>
              <p className="text-sm text-muted-foreground">Pull a consumer's full bureau file — consent enforced, every pull metered</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-gray-600">
            <b className="text-gray-900">1,204</b> / 25,000 reports used this month
          </span>
        </div>

        {/* Search */}
        <Panel padded>
          <form onSubmit={handleSearch} className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Consumer NRC</label>
              <div className="relative">
                <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={nrc} onChange={e => setNrc(e.target.value)} placeholder="e.g. 123456/78/1"
                  className={inputCls + ' pl-10 font-mono'} />
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Purpose of Inquiry</label>
              <select className={inputCls} value={purpose} onChange={e => setPurpose(e.target.value)}>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button type="submit"
              className="md:col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analyze
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-gray-400">Quick fill:</span>
            {[
              { nrc: '123456/78/1', label: 'Excellent', tone: 'green' },
              { nrc: '111222/56/1', label: 'Excellent', tone: 'green' },
              { nrc: '654321/87/1', label: 'Fair', tone: 'amber' },
              { nrc: '333444/90/1', label: 'Fair', tone: 'amber' },
              { nrc: '789012/34/1', label: 'Very Poor', tone: 'red' },
            ].map(item => (
              <button key={item.nrc} onClick={() => { setNrc(item.nrc); setSearchNrc(item.nrc); setActiveTab('overview'); }}
                className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors">
                <span className="font-mono text-gray-700 group-hover:text-blue-700">{item.nrc}</span>
                <span className={cn('w-1.5 h-1.5 rounded-full', item.tone === 'green' ? 'bg-emerald-400' : item.tone === 'amber' ? 'bg-amber-400' : 'bg-rose-400')} />
              </button>
            ))}
          </div>
        </Panel>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Running risk models…</p>
          </div>
        )}

        {error && !isLoading && (
          <Panel padded>
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-display font-bold text-gray-900 mb-1">Profile Not Found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No credit history for NRC <span className="font-mono text-gray-900">{searchNrc}</span>.
                Confirm the number, or check that the consumer has granted consent.
              </p>
            </div>
          </Panel>
        )}

        {data && !isLoading && !creditScore && (
          <Panel padded>
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-display font-bold text-gray-900 mb-1">
                {data.customer.firstName} {data.customer.lastName} cannot be scored yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">{data.unscorableReason}</p>
            </div>
          </Panel>
        )}

        {data && creditScore && !isLoading && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            {/* ── Identity banner ── */}
            <Panel padded>
              <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C5CFC)' }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-display font-bold text-gray-900 truncate">
                        {data.customer.firstName} {data.customer.lastName}
                      </h2>
                      <Badge tone={RISK_TONE[data.riskLevel as string] ?? 'slate'}>{data.riskLevel} risk</Badge>
                      <Badge tone="blue">Band {creditScore.band} · {creditScore.rating}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5" /><span className="font-mono text-xs">{data.nrc}</span></span>
                      <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{data.customer.phone}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{data.customer.province}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 lg:border-l lg:border-slate-100 lg:pl-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recommended Limit</p>
                    <p className="text-2xl font-display font-bold text-gray-900">{formatCurrency(data.recommendedCreditLimit)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button title="Save consumer" className="p-2.5 rounded-xl border border-slate-200 text-gray-500 hover:text-amber-500 hover:border-amber-300 transition-colors"><Star className="w-4 h-4" /></button>
                    <button title="Add to watchlist" className="p-2.5 rounded-xl border border-slate-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"><Eye className="w-4 h-4" /></button>
                    <button title="Export report PDF" className="p-2.5 rounded-xl border border-slate-200 text-gray-500 hover:text-gray-900 transition-colors"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </Panel>

            {/* ── Risk flags, shown before anything else when present ── */}
            {data.riskFlags.length > 0 && (
              <Panel title="Risk Flags" subtitle="Behaviour to review regardless of the score" padded>
                <RiskFlags flags={data.riskFlags} />
              </Panel>
            )}

            {/* ── Balanced two-column body ── */}
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* Left rail: score + exposure */}
              <div className="space-y-6">
                <Panel padded>
                  <div className="flex flex-col items-center">
                    <CreditGauge score={creditScore.score} rating={creditScore.rating} />
                    <div className="grid grid-cols-2 gap-3 w-full mt-5">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <p className="text-[11px] uppercase tracking-wider text-gray-400">Prob. of Default</p>
                        <p className={cn('text-lg font-bold mt-0.5', creditScore.probabilityOfDefault < 0.1 ? 'text-emerald-600' : creditScore.probabilityOfDefault < 0.3 ? 'text-amber-600' : 'text-rose-600')}>
                          {(creditScore.probabilityOfDefault * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <p className="text-[11px] uppercase tracking-wider text-gray-400">Active Loans</p>
                        <p className="text-lg font-bold text-gray-900 mt-0.5">{data.loanExposure.activeLoans}</p>
                      </div>
                    </div>
                    <div className="w-full mt-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">12-Month Score Trend</p>
                      <div className="h-20">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={creditScore.historicalScores ?? []}>
                            <defs>
                              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F6EF7" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#4F6EF7" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide />
                            <YAxis domain={[300, 850]} hide />
                            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                              labelFormatter={v => format(new Date(v), 'MMM yyyy')} />
                            <Area type="monotone" dataKey="score" stroke="#4F6EF7" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Exposure Snapshot" padded>
                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    {[
                      { label: 'Active', value: data.loanExposure.activeLoans, cls: 'text-emerald-600' },
                      { label: 'Defaulted', value: data.loanExposure.defaultedLoans, cls: 'text-rose-600' },
                      { label: 'Closed', value: data.loanExposure.closedLoans, cls: 'text-gray-500' },
                    ].map(i => (
                      <div key={i.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <p className={cn('text-xl font-bold', i.cls)}>{i.value}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{i.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                    <span className="inline-flex items-center gap-2 text-sm text-gray-600"><Wallet className="w-4 h-4 text-gray-400" /> Total Outstanding</span>
                    <span className={cn('text-base font-bold', data.loanExposure.totalExposure > 0 ? 'text-gray-900' : 'text-emerald-600')}>
                      {formatCurrency(data.loanExposure.totalExposure)}
                    </span>
                  </div>
                </Panel>
              </div>

              {/* Right: tabs */}
              <div className="lg:col-span-2 space-y-5">
                <div className="flex gap-1.5 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center',
                        activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50')}>
                      <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Overview */}
                {activeTab === 'overview' && (
                  <Panel padded>
                    <h3 className="font-display font-bold text-gray-900 flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-violet-500" /> Credit Assessment
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed p-4 rounded-xl bg-violet-500/5 border border-violet-500/15 mb-5">
                      {data.aiInsights}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Why this score</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {data.riskFactors.map((factor: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors">
                          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            factor.impact === 'positive' ? 'bg-emerald-500/10' : factor.impact === 'negative' ? 'bg-rose-500/10' : 'bg-amber-500/10')}>
                            <ShieldAlert className={cn('w-4 h-4',
                              factor.impact === 'positive' ? 'text-emerald-600' : factor.impact === 'negative' ? 'text-rose-600' : 'text-amber-600')} />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{factor.factor}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{factor.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                {/* Dimensions & cash flow */}
                {activeTab === 'breakdown' && (
                  <div className="space-y-5">
                    <Panel padded>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-display font-bold text-gray-900">Scoring Dimensions</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Each 0–100 · {creditScore.coverage ?? '—'}% of the scorecard has evidence behind it
                            {creditScore.scorecardVersion ? ` · ${creditScore.scorecardVersion}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-display font-bold text-gray-900">{creditScore.score}</p>
                          <p className="text-[11px] text-gray-400">300–850 scale</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {(creditScore.dimensions ?? []).map(d => (
                          <div key={d.key} className={cn(d.value == null && 'opacity-60')}>
                            <div className="flex items-baseline justify-between mb-1.5">
                              <span className="text-sm font-medium text-gray-900">{d.label}</span>
                              <span className="text-sm font-bold" style={{ color: DIMENSION_COLORS[d.key] }}>
                                {d.value ?? <span className="text-xs font-normal text-gray-400">not reported</span>}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${d.value ?? 0}%`, backgroundColor: DIMENSION_COLORS[d.key] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                    <CashflowSummary cashflow={data.cashflow as Record<string, number | null> | null} />
                    <Panel padded>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Model Recommendation</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{creditScore.recommendation}</p>
                    </Panel>
                  </div>
                )}

                {/* Loan Portfolio */}
                {activeTab === 'loans' && (
                  <Panel title="Tradeline Records" subtitle={`${loans.length} facilities across all institutions`}>
                    <Table head={['Institution', 'Principal', 'Outstanding', 'Rate', 'Disbursed', 'Missed', 'Status']}>
                      {loans.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No loan records found.</Td></tr>}
                      {loans.map((loan: any) => (
                        <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                          <Td>
                            <p className="font-semibold text-gray-900">{loan.institution}</p>
                            <p className="text-[11px] uppercase text-gray-400">{loan.institutionType}</p>
                          </Td>
                          <Td>{formatCurrency(loan.amount)}</Td>
                          <Td className={loan.outstandingBalance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{formatCurrency(loan.outstandingBalance)}</Td>
                          <Td className="text-muted-foreground">{loan.interestRate.toFixed(1)}%</Td>
                          <Td className="text-muted-foreground">{format(new Date(loan.disbursedAt), 'MMM d, yyyy')}</Td>
                          <Td className={loan.missedPayments > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{loan.missedPayments}</Td>
                          <Td><Badge tone={LOAN_TONE[loan.status] ?? 'slate'}>{loan.status.replace('_', ' ')}</Badge></Td>
                        </tr>
                      ))}
                    </Table>
                    {loans.length > 0 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
                        <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Totals</span>
                        <span className="text-muted-foreground">
                          Principal <b className="text-gray-900">{formatCurrency(loans.reduce((s: number, l: any) => s + l.amount, 0))}</b>
                          <span className="mx-2 text-slate-300">·</span>
                          Outstanding <b className="text-amber-600">{formatCurrency(data.loanExposure.totalExposure)}</b>
                        </span>
                      </div>
                    )}
                  </Panel>
                )}

                {/* Decision Engine */}
                {activeTab === 'decision' && (() => {
                  const decision = getDecision();
                  const DecIcon = decision.icon;
                  const tones: Record<string, { bg: string; text: string; ring: string }> = {
                    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'border-emerald-500/30' },
                    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', ring: 'border-amber-500/30' },
                    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', ring: 'border-rose-500/30' },
                  };
                  const t = tones[decision.tone];
                  const monthly = (() => {
                    const P = parseFloat(loanAmount); const r = 0.18 / 12; const n = parseFloat(loanTerm);
                    if (!P || !n) return 0;
                    return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                  })();
                  return (
                    <Panel padded>
                      <h3 className="font-display font-bold text-gray-900 flex items-center gap-2 mb-5">
                        <Brain className="w-4 h-4 text-violet-500" /> Loan Decision Simulator
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-5">
                        <Field label="Requested Amount (ZMW)" hint={`limit ${formatCurrency(data.recommendedCreditLimit)}`}>
                          <input type="number" min={0} step={1000} className={inputCls + ' font-mono'} value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
                        </Field>
                        <Field label="Term (months)">
                          <input type="number" min={1} max={360} className={inputCls + ' font-mono'} value={loanTerm} onChange={e => setLoanTerm(e.target.value)} />
                        </Field>
                      </div>

                      <div className={cn('flex items-center gap-4 p-5 rounded-2xl border mb-5', t.bg, t.ring)}>
                        <span className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-white/70 shrink-0')}>
                          <DecIcon className={cn('w-6 h-6', t.text)} />
                        </span>
                        <div className="min-w-0">
                          <p className={cn('text-xl font-display font-extrabold uppercase tracking-wide', t.text)}>{decision.decision}</p>
                          <p className="text-sm text-gray-700 mt-0.5">{decision.message}</p>
                        </div>
                        {monthly > 0 && (
                          <div className="ml-auto text-right shrink-0 hidden sm:block">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400">Est. Monthly</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(monthly)}</p>
                            <p className="text-[11px] text-gray-400">@ 18% p.a. · {loanTerm} mo</p>
                          </div>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        {[
                          { label: 'Credit Score', value: `${creditScore.score} / 850`, status: score >= 660 ? 'pass' : score >= 580 ? 'warn' : 'fail', threshold: '≥ 660 for auto-approval' },
                          { label: 'Risk Flags', value: highFlags.length ? `${highFlags.length} high` : `${data.riskFlags.length} flagged`, status: highFlags.length ? 'fail' : data.riskFlags.length ? 'warn' : 'pass', threshold: 'none high for auto-approval' },
                          { label: 'Loan vs Limit', value: `${Math.round((parseFloat(loanAmount) / Math.max(1, data.recommendedCreditLimit)) * 100)}%`, status: parseFloat(loanAmount) <= data.recommendedCreditLimit ? 'pass' : parseFloat(loanAmount) <= data.recommendedCreditLimit * 1.2 ? 'warn' : 'fail', threshold: `limit ${formatCurrency(data.recommendedCreditLimit)}` },
                          { label: 'Default Probability', value: `${(creditScore.probabilityOfDefault * 100).toFixed(1)}%`, status: creditScore.probabilityOfDefault < 0.1 ? 'pass' : creditScore.probabilityOfDefault < 0.3 ? 'warn' : 'fail', threshold: '< 10% for auto-approval' },
                        ].map(f => (
                          <div key={f.label} className="p-4 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] uppercase tracking-wider text-gray-400">{f.label}</p>
                              {f.status === 'pass' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                              {f.status === 'warn' && <ClockIcon className="w-4 h-4 text-amber-500" />}
                              {f.status === 'fail' && <XCircle className="w-4 h-4 text-rose-500" />}
                            </div>
                            <p className="text-lg font-bold text-gray-900 mt-1.5">{f.value}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{f.threshold}</p>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
