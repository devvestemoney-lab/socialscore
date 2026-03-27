import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useGetRiskProfile } from '@workspace/api-client-react';
import { Search, ShieldAlert, Sparkles, Building, Calendar, AlertCircle } from 'lucide-react';
import { CreditGauge } from '@/components/credit-gauge';
import { formatCurrency, cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, YAxis } from 'recharts';
import { format } from 'date-fns';

export default function TenantDashboard() {
  const { apiOptions } = useAuth();
  const [nrc, setNrc] = useState('12/345678/67'); // Default mock value
  const [searchNrc, setSearchNrc] = useState('');
  
  // Use enabled: false to only fetch on click
  const { data, isLoading, error, refetch } = useGetRiskProfile(searchNrc, {
    request: apiOptions.request,
    query: { enabled: !!searchNrc, retry: false }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nrc.trim()) setSearchNrc(nrc.trim());
  };

  const riskColors = {
    'Low': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    'Medium': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'High': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'Very High': 'text-red-400 bg-red-400/10 border-red-400/20',
    'Critical': 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-white mb-6">Credit Profile Lookup</h1>
        
        <form onSubmit={handleSearch} className="mb-10 relative group">
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
              className="bg-cyan-500 text-white font-bold h-full px-8 hover:bg-cyan-400 transition-colors"
            >
              Analyze
            </button>
          </div>
        </form>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-cyan-400 gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse text-lg">Running AI risk models...</p>
          </div>
        )}

        {error && (
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Profile Not Found</h3>
            <p className="text-muted-foreground">Could not locate credit history for NRC {searchNrc}. Ensure the customer has granted consent.</p>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
            {/* Customer Header */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{data.customer.firstName} {data.customer.lastName}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                  <span className="font-mono bg-black/20 px-2 py-1 rounded">NRC: {data.nrc}</span>
                  <span>{data.customer.phone}</span>
                  <span>{data.customer.province}</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-sm text-white/50 mb-1">Recommended Credit Limit</span>
                <span className="text-2xl font-bold text-cyan-400">{formatCurrency(data.recommendedCreditLimit)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Card */}
              <div className="lg:col-span-1 glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border", riskColors[data.riskLevel as keyof typeof riskColors])}>
                    {data.riskLevel} Risk
                  </span>
                </div>
                <CreditGauge score={data.creditScore.score} rating={data.creditScore.rating} />
                <div className="w-full mt-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Probability of Default</span>
                    <span className="font-mono text-white">{(data.creditScore.probabilityOfDefault * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Score Breakdown & AI Insights */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-panel p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    AI Credit Assessment
                  </h3>
                  <p className="text-white/80 leading-relaxed mb-6 bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl">
                    {data.aiInsights}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.riskFactors.map((factor, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <ShieldAlert className={cn("w-5 h-5 shrink-0 mt-0.5", 
                          factor.impact === 'positive' ? 'text-emerald-400' : 
                          factor.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
                        )} />
                        <div>
                          <p className="text-sm font-medium text-white">{factor.factor}</p>
                          <p className="text-xs text-white/50 mt-1">{factor.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Loans & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Score Chart */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-6">Score History</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.creditScore.historicalScores}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#ffffff40" 
                        fontSize={12} 
                        tickFormatter={(v) => format(new Date(v), 'MMM')} 
                      />
                      <YAxis domain={['auto', 1000]} stroke="#ffffff40" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                        labelFormatter={(v) => format(new Date(v), 'MMM yyyy')}
                      />
                      <Area type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Loan Exposure */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col">
                <h3 className="text-lg font-bold text-white mb-2">Current Exposures</h3>
                <p className="text-sm text-white/50 mb-6">Total active debt across {data.loanExposure.institutions.length} institutions.</p>
                
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <span className="block text-sm font-medium text-red-200 mb-1">Total Outstanding Balance</span>
                  <span className="text-3xl font-bold text-red-400 font-mono">{formatCurrency(data.loanExposure.totalExposure)}</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                  {data.loanExposure.institutions.map((inst, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Building className="w-5 h-5 text-white/70" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{inst.name}</p>
                          <p className="text-xs text-white/50 capitalize">{inst.type} • {inst.activeLoans} Active Loans</p>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-medium text-white">
                        {formatCurrency(inst.totalExposure)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
