import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetRiskProfile } from '@workspace/api-client-react';
import {
  Search, ShieldAlert, Sparkles, Building, AlertCircle,
  CheckCircle, XCircle, ClockIcon, TrendingUp, BarChart3,
  Briefcase, Brain, ChevronRight
} from 'lucide-react';
import { CreditGauge } from '@/components/credit-gauge';
import { formatCurrency, cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis } from 'recharts';
import { format } from 'date-fns';

type Tab = 'overview' | 'breakdown' | 'loans' | 'decision';

const SCORE_COMPONENTS = [
  { key: 'repaymentHistory', label: 'Repayment History', max: 300, color: '#06b6d4', description: 'Track record of on-time payments across all facilities' },
  { key: 'transactionPatterns', label: 'Transaction Patterns', max: 250, color: '#8b5cf6', description: 'Consistency and regularity of financial activity' },
  { key: 'loanDefaults', label: 'Loan Defaults', max: 200, color: '#f59e0b', description: 'Historical default events and write-offs' },
  { key: 'mobileMoney', label: 'Mobile Money', max: 150, color: '#10b981', description: 'Mobile money usage and activity patterns' },
  { key: 'accountAge', label: 'Account Age', max: 100, color: '#3b82f6', description: 'Length of credit history and account tenure' },
] as const;

const LOAN_STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  defaulted: 'text-red-400 bg-red-400/10 border-red-400/20',
  closed: 'text-white/40 bg-white/5 border-white/10',
  overdue: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
};

export default function TenantDashboard() {
  const { apiOptions } = useAuth();
  const [nrc, setNrc] = useState('12/345678/67');
  const [searchNrc, setSearchNrc] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loanAmount, setLoanAmount] = useState('50000');
  const [loanTerm, setLoanTerm] = useState('12');

  const { data, isLoading, error } = useGetRiskProfile(searchNrc, {
    request: apiOptions.request,
    query: { enabled: !!searchNrc, retry: false }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nrc.trim()) {
      setSearchNrc(nrc.trim());
      setActiveTab('overview');
    }
  };

  const scoreBreakdown = data?.creditScore?.scoreBreakdown;
  const loans = data?.loanExposure?.loans ?? [];

  // Decision engine logic
  const score = data?.creditScore?.score ?? 0;
  const getDecision = () => {
    const amount = parseFloat(loanAmount) || 0;
    const limit = data?.recommendedCreditLimit ?? 0;
    if (score >= 700 && amount <= limit) return { decision: 'approved', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle, message: 'Loan application meets all credit criteria. Recommend approval with standard terms.' };
    if (score >= 500 && amount <= limit * 1.2) return { decision: 'referred', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: ClockIcon, message: 'Application requires manual review. Consider requesting additional collateral or guarantor.' };
    return { decision: 'declined', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: XCircle, message: 'Credit profile does not meet minimum lending criteria. High risk of default.' };
  };

  const riskColors: Record<string, string> = {
    'Low': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    'Medium': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'High': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'Very High': 'text-red-400 bg-red-400/10 border-red-400/20',
    'Critical': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'breakdown', label: 'Score Breakdown', icon: TrendingUp },
    { id: 'loans', label: `Loan Portfolio (${loans.length})`, icon: Briefcase },
    { id: 'decision', label: 'Decision Engine', icon: Brain },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-white mb-6">Credit Profile Lookup</h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 relative group">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="relative flex items-center bg-card border border-white/10 rounded-2xl shadow-xl overflow-hidden focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 transition-all">
            <div className="pl-6 text-white/40">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              value={nrc}
              onChange={e => setNrc(e.target.value)}
              placeholder="Enter Customer NRC (e.g. 12/345678/67)"
              className="w-full bg-transparent border-none text-xl text-white placeholder:text-white/30 px-6 py-5 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-cyan-500 text-white font-bold h-full px-8 hover:bg-cyan-400 transition-colors whitespace-nowrap"
            >
              Analyze
            </button>
          </div>
        </form>

        {/* Demo NRC Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-xs text-white/30 py-1 pr-2">Quick fill:</span>
          {[
            { nrc: '12/345678/67', label: 'Excellent' },
            { nrc: '56/111222/78', label: 'Excellent' },
            { nrc: '87/654321/32', label: 'Fair' },
            { nrc: '90/333444/12', label: 'Fair' },
            { nrc: '34/789012/45', label: 'Very Poor' },
          ].map(item => (
            <button
              key={item.nrc}
              onClick={() => { setNrc(item.nrc); setSearchNrc(item.nrc); setActiveTab('overview'); }}
              className="px-3 py-1 rounded-full text-xs font-mono bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
            >
              {item.nrc} <span className="text-white/30">({item.label})</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-cyan-400 gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-medium animate-pulse text-lg">Running AI risk models...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Profile Not Found</h3>
            <p className="text-muted-foreground">Could not locate credit history for NRC <span className="font-mono text-white">{searchNrc}</span>. Ensure the customer has granted consent.</p>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {/* Customer Header */}
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {data.customer.firstName} {data.customer.lastName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/60 mt-1">
                    <span className="font-mono bg-black/30 px-2 py-1 rounded text-xs">NRC: {data.nrc}</span>
                    <span>{data.customer.phone}</span>
                    <span>{data.customer.province}</span>
                    {data.customer.employer && <span>{data.customer.employer}</span>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">Credit Limit</p>
                    <p className="text-2xl font-bold text-cyan-400">{formatCurrency(data.recommendedCreditLimit)}</p>
                  </div>
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border',
                    riskColors[data.riskLevel as string] ?? 'text-white/40 bg-white/5 border-white/10'
                  )}>
                    {data.riskLevel} Risk
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Score Bar */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/5">
                {[
                  { label: 'Credit Score', value: data.creditScore.score, suffix: '/ 1000', color: 'text-cyan-400' },
                  { label: 'Rating', value: data.creditScore.rating, color: 'text-white' },
                  { label: 'Prob. of Default', value: `${(data.creditScore.probabilityOfDefault * 100).toFixed(1)}%`, color: 'text-orange-400' },
                  { label: 'Active Loans', value: data.loanExposure.activeLoans, color: 'text-blue-400' },
                ].map((item, i) => (
                  <div key={i} className="p-5 text-center">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">{item.label}</p>
                    <p className={`text-2xl font-display font-bold ${item.color}`}>
                      {item.value}
                      {item.suffix && <span className="text-sm text-white/30 font-normal ml-1">{item.suffix}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 glass-panel rounded-xl overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 glass-panel p-6 rounded-2xl flex flex-col items-center justify-center">
                  <CreditGauge score={data.creditScore.score} rating={data.creditScore.rating} />
                  <div className="w-full mt-4 glass-panel p-4 rounded-xl bg-black/20">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Score History</p>
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.creditScore.historicalScores ?? []}>
                          <defs>
                            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" hide />
                          <YAxis domain={['auto', 1000]} hide />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                            labelFormatter={v => format(new Date(v), 'MMM yyyy')}
                          />
                          <Area type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#scoreGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      AI Credit Assessment
                    </h3>
                    <p className="text-white/80 leading-relaxed mb-5 bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl text-sm">
                      {data.aiInsights}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.riskFactors.map((factor, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                          <ShieldAlert className={cn('w-5 h-5 shrink-0 mt-0.5',
                            factor.impact === 'positive' ? 'text-emerald-400' :
                            factor.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
                          )} />
                          <div>
                            <p className="text-sm font-medium text-white">{factor.factor}</p>
                            <p className="text-xs text-white/50 mt-0.5">{factor.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Loan Summary */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-base font-bold text-white mb-4">Exposure Summary</h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Active', value: data.loanExposure.activeLoans, color: 'text-emerald-400' },
                        { label: 'Defaulted', value: data.loanExposure.defaultedLoans, color: 'text-red-400' },
                        { label: 'Closed', value: data.loanExposure.closedLoans, color: 'text-white/40' },
                      ].map(item => (
                        <div key={item.label} className="bg-black/20 p-3 rounded-xl text-center border border-white/5">
                          <p className={`text-2xl font-bold font-mono ${item.color}`}>{item.value}</p>
                          <p className="text-xs text-white/40 mt-1">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                      <span className="text-sm text-red-200">Total Outstanding</span>
                      <span className="text-lg font-bold text-red-400 font-mono">{formatCurrency(data.loanExposure.totalExposure)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Score Breakdown */}
            {activeTab === 'breakdown' && scoreBreakdown && (
              <div className="space-y-6">
                <div className="glass-panel p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Score Component Breakdown</h3>
                      <p className="text-sm text-white/50 mt-1">How each factor contributes to the total score of {data.creditScore.score}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-display font-bold text-cyan-400">{data.creditScore.score}</p>
                      <p className="text-xs text-white/40">/ 1000 total</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {SCORE_COMPONENTS.map(comp => {
                      const value = scoreBreakdown[comp.key];
                      const pct = Math.round((value / comp.max) * 100);
                      const pctOfTotal = Math.round((comp.max / 1000) * 100);
                      return (
                        <div key={comp.key}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-sm font-medium text-white">{comp.label}</span>
                              <span className="text-xs text-white/30 ml-2">({comp.description})</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold font-mono" style={{ color: comp.color }}>{value}</span>
                              <span className="text-xs text-white/30"> / {comp.max}</span>
                            </div>
                          </div>
                          <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                              style={{ width: `${pct}%`, backgroundColor: comp.color, opacity: 0.9 }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-white/30">{pct}% of max</span>
                            <span className="text-xs text-white/20">{pctOfTotal}% weight</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {SCORE_COMPONENTS.map(comp => {
                    const value = scoreBreakdown[comp.key];
                    const pct = Math.round((value / comp.max) * 100);
                    return (
                      <div key={comp.key} className="glass-panel p-4 rounded-2xl text-center relative overflow-hidden">
                        <div
                          className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl"
                          style={{ backgroundColor: comp.color }}
                        />
                        <p className="text-xs text-white/40 mb-2 leading-tight">{comp.label}</p>
                        <p className="text-2xl font-bold font-mono" style={{ color: comp.color }}>{value}</p>
                        <p className="text-xs text-white/30 mt-1">{pct}%</p>
                      </div>
                    );
                  })}
                </div>

                {/* Recommendation Box */}
                <div className="glass-panel p-6 rounded-2xl border border-cyan-500/10">
                  <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">AI Score Recommendation</h4>
                  <p className="text-white/80 text-sm leading-relaxed">{data.creditScore.recommendation}</p>
                </div>
              </div>
            )}

            {/* Tab: Loan Portfolio */}
            {activeTab === 'loans' && (
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Individual Loan Records</h3>
                    <p className="text-sm text-white/40 mt-0.5">{loans.length} loan records across all institutions</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {[
                      { label: 'Active', count: data.loanExposure.activeLoans, color: 'text-emerald-400' },
                      { label: 'Defaulted', count: data.loanExposure.defaultedLoans, color: 'text-red-400' },
                      { label: 'Closed', count: data.loanExposure.closedLoans, color: 'text-white/40' },
                    ].map(s => (
                      <span key={s.label} className={`${s.color} bg-white/5 px-2 py-1 rounded-lg`}>
                        {s.count} {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-white/50 uppercase tracking-wider bg-white/[0.02]">
                        <th className="p-4 font-semibold">Institution</th>
                        <th className="p-4 font-semibold">Type</th>
                        <th className="p-4 font-semibold text-right">Principal</th>
                        <th className="p-4 font-semibold text-right">Outstanding</th>
                        <th className="p-4 font-semibold text-right">Rate</th>
                        <th className="p-4 font-semibold">Disbursed</th>
                        <th className="p-4 font-semibold">Due Date</th>
                        <th className="p-4 font-semibold">Missed Pmts</th>
                        <th className="p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loans.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-white/30">No loan records found.</td>
                        </tr>
                      ) : loans.map(loan => (
                        <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 text-sm font-medium text-white">{loan.institution}</td>
                          <td className="p-4">
                            <span className="text-xs uppercase text-white/50 bg-white/5 px-2 py-1 rounded">{loan.institutionType}</span>
                          </td>
                          <td className="p-4 text-sm font-mono text-white text-right">{formatCurrency(loan.amount)}</td>
                          <td className="p-4 text-sm font-mono text-right">
                            <span className={loan.outstandingBalance > 0 ? 'text-orange-400' : 'text-emerald-400'}>
                              {formatCurrency(loan.outstandingBalance)}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-mono text-white/70 text-right">{loan.interestRate.toFixed(1)}%</td>
                          <td className="p-4 text-xs text-white/50">
                            {format(new Date(loan.disbursedAt), 'MMM d, yyyy')}
                          </td>
                          <td className="p-4 text-xs text-white/50">
                            {loan.dueDate ? format(new Date(loan.dueDate), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="p-4 text-center">
                            <span className={cn(
                              'text-sm font-bold font-mono',
                              loan.missedPayments > 0 ? 'text-red-400' : 'text-emerald-400'
                            )}>
                              {loan.missedPayments}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
                              LOAN_STATUS_COLORS[loan.status] ?? 'text-white/40 bg-white/5 border-white/10'
                            )}>
                              {loan.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {loans.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-white/10 bg-white/[0.02]">
                          <td colSpan={2} className="p-4 text-xs text-white/40 font-medium uppercase">Total Exposure</td>
                          <td className="p-4 text-sm font-bold font-mono text-white text-right">
                            {formatCurrency(loans.reduce((s, l) => s + l.amount, 0))}
                          </td>
                          <td className="p-4 text-sm font-bold font-mono text-orange-400 text-right">
                            {formatCurrency(data.loanExposure.totalExposure)}
                          </td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Decision Engine */}
            {activeTab === 'decision' && (() => {
              const decision = getDecision();
              const DecIcon = decision.icon;
              return (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      Loan Decision Engine
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Requested Loan Amount (ZMW)</label>
                        <input
                          type="number"
                          value={loanAmount}
                          onChange={e => setLoanAmount(e.target.value)}
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-cyan-500 transition-colors"
                          placeholder="50000"
                          min="0"
                          step="1000"
                        />
                        <p className="text-xs text-white/30 mt-1">Recommended limit: {formatCurrency(data.recommendedCreditLimit)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Loan Term (Months)</label>
                        <input
                          type="number"
                          value={loanTerm}
                          onChange={e => setLoanTerm(e.target.value)}
                          className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-cyan-500 transition-colors"
                          placeholder="12"
                          min="1"
                          max="360"
                        />
                      </div>
                    </div>

                    {/* Decision Card */}
                    <div className={cn('p-6 rounded-2xl border-2 mb-6', decision.bg)}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={cn('w-14 h-14 rounded-full flex items-center justify-center', decision.bg)}>
                          <DecIcon className={cn('w-7 h-7', decision.color)} />
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">AI Decision</p>
                          <p className={cn('text-3xl font-display font-bold uppercase tracking-wide', decision.color)}>
                            {decision.decision}
                          </p>
                        </div>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">{decision.message}</p>
                    </div>

                    {/* Decision Factors */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      {[
                        {
                          label: 'Credit Score',
                          value: `${data.creditScore.score} / 1000`,
                          status: data.creditScore.score >= 700 ? 'pass' : data.creditScore.score >= 500 ? 'warn' : 'fail',
                          threshold: '≥ 700 for approval',
                        },
                        {
                          label: 'Loan vs Limit',
                          value: `${Math.round((parseFloat(loanAmount) / data.recommendedCreditLimit) * 100)}%`,
                          status: parseFloat(loanAmount) <= data.recommendedCreditLimit ? 'pass' : parseFloat(loanAmount) <= data.recommendedCreditLimit * 1.2 ? 'warn' : 'fail',
                          threshold: `Limit: ${formatCurrency(data.recommendedCreditLimit)}`,
                        },
                        {
                          label: 'Default Probability',
                          value: `${(data.creditScore.probabilityOfDefault * 100).toFixed(1)}%`,
                          status: data.creditScore.probabilityOfDefault < 0.1 ? 'pass' : data.creditScore.probabilityOfDefault < 0.3 ? 'warn' : 'fail',
                          threshold: '< 10% for approval',
                        },
                      ].map(factor => (
                        <div key={factor.label} className={cn(
                          'p-4 rounded-xl border flex items-start gap-3',
                          factor.status === 'pass' ? 'bg-emerald-500/5 border-emerald-500/20' :
                          factor.status === 'warn' ? 'bg-yellow-500/5 border-yellow-500/20' :
                          'bg-red-500/5 border-red-500/20'
                        )}>
                          {factor.status === 'pass' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                          {factor.status === 'warn' && <ClockIcon className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />}
                          {factor.status === 'fail' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                          <div>
                            <p className="text-xs text-white/50 uppercase tracking-wider">{factor.label}</p>
                            <p className="text-lg font-bold font-mono text-white mt-1">{factor.value}</p>
                            <p className="text-xs text-white/30 mt-1">{factor.threshold}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Monthly Payment Estimate */}
                    {parseFloat(loanAmount) > 0 && parseFloat(loanTerm) > 0 && (
                      <div className="glass-panel p-5 rounded-xl bg-white/[0.02] flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white/50 mb-1">Estimated Monthly Payment</p>
                          <p className="text-xs text-white/30">Based on 18% p.a. interest rate</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold font-mono text-cyan-400">
                            {formatCurrency(
                              (() => {
                                const P = parseFloat(loanAmount);
                                const r = 0.18 / 12;
                                const n = parseFloat(loanTerm);
                                if (!P || !n) return 0;
                                return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
                              })()
                            )}
                          </p>
                          <p className="text-xs text-white/30 mt-1">/month for {loanTerm} months</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {!searchNrc && !isLoading && (
          <div className="glass-panel p-16 rounded-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-cyan-400/50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Search for a Credit Profile</h3>
            <p className="text-white/40 max-w-sm">
              Enter a customer's NRC number above or click one of the quick-fill options to load their complete credit profile.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
