import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Brain, Save, RotateCcw, FlaskConical, CheckCircle2, History, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const COMPONENT_META: Record<string, { label: string; description: string; color: string; maxPts: number }> = {
  repaymentHistory: { label: 'Repayment History', description: 'On-time payment track record across all lenders', color: '#06b6d4', maxPts: 300 },
  loanDefaults: { label: 'Loan Defaults', description: 'Penalises defaulted or written-off loans', color: '#ef4444', maxPts: 200 },
  transactionPatterns: { label: 'Transaction Patterns', description: 'Volume and frequency of financial transactions', color: '#8b5cf6', maxPts: 250 },
  mobileMoney: { label: 'Mobile Money', description: 'Mobile money balance and usage as financial inclusion proxy', color: '#10b981', maxPts: 150 },
  accountAge: { label: 'Account Age', description: 'Length of credit history across all institutions', color: '#f59e0b', maxPts: 100 },
};

export default function ScoringModels() {
  const { request } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<any>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [thresholds, setThresholds] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'weights' | 'thresholds' | 'abtest' | 'history'>('weights');

  useEffect(() => {
    request(`${API}/admin/scoring-models`).then(r => r.json()).then(data => {
      setConfig(data);
      setWeights(data.weights);
      setThresholds(data.thresholds);
    });
  }, []);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(total - 100) <= 1;

  async function saveWeights() {
    if (!isValid) { toast({ title: 'Weights must sum to 100', description: `Currently: ${total}`, variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const res = await request(`${API}/admin/scoring-models`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weights, thresholds }) });
      if (res.ok) { toast({ title: 'Model configuration saved', description: 'Changes applied to the scoring engine' }); }
    } finally { setSaving(false); }
  }

  function resetToDefault() {
    setWeights({ repaymentHistory: 30, loanDefaults: 20, transactionPatterns: 25, mobileMoney: 15, accountAge: 10 });
    setThresholds({ minApprovalScore: 500, autoApproveScore: 750, autoDeclineScore: 300, maxLoanToIncomeRatio: 0.40 });
  }

  const tabs = [
    { id: 'weights', label: 'Weight Config' },
    { id: 'thresholds', label: 'Thresholds' },
    { id: 'abtest', label: 'A/B Testing' },
    { id: 'history', label: 'Version History' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Scoring Model Management</h1>
                <p className="text-sm text-muted-foreground">Configure AI scoring weights, thresholds, and A/B tests</p>
              </div>
            </div>
          </div>
          {config && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Active: {config.version}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.id ? 'bg-white/15 text-white' : 'text-muted-foreground hover:text-white')}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'weights' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">Weights must sum to exactly 100%. The scoring engine recalculates immediately on save.</p>
            </div>

            {/* Total indicator */}
            <div className={cn('flex items-center justify-between p-4 rounded-xl border', isValid ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')}>
              <span className="text-sm font-medium text-white">Total Weight</span>
              <span className={cn('text-xl font-bold', isValid ? 'text-green-400' : 'text-red-400')}>{total}%</span>
            </div>

            {/* Weight sliders */}
            <div className="grid gap-4">
              {Object.entries(weights).map(([key, value]) => {
                const meta = COMPONENT_META[key];
                if (!meta) return null;
                return (
                  <div key={key} className="p-5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">{meta.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Max {meta.maxPts} pts</span>
                        <div className="w-16 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <span className="text-lg font-bold" style={{ color: meta.color }}>{value}%</span>
                        </div>
                      </div>
                    </div>
                    <input type="range" min={0} max={60} step={1} value={value}
                      onChange={e => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: meta.color }}
                    />
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(value / 60) * 100}%`, backgroundColor: meta.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={saveWeights} disabled={saving || !isValid}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
              <button onClick={resetToDefault}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors">
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
            </div>
          </motion.div>
        )}

        {tab === 'thresholds' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { key: 'autoApproveScore', label: 'Auto-Approve Score', description: 'Scores above this threshold are automatically approved', color: '#10b981' },
                { key: 'minApprovalScore', label: 'Manual Review Score', description: 'Scores between this and auto-approve go to manual review', color: '#f59e0b' },
                { key: 'autoDeclineScore', label: 'Auto-Decline Score', description: 'Scores below this threshold are automatically declined', color: '#ef4444' },
              ].map(({ key, label, description, color }) => (
                <div key={key} className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div>
                    <p className="font-medium text-white">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min={0} max={1000} value={thresholds[key] || 0}
                      onChange={e => setThresholds((prev: any) => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-24 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-center font-bold text-lg focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex-1 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${((thresholds[key] || 0) / 1000) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div>
                  <p className="font-medium text-white">Max Loan-to-Income Ratio</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Maximum ratio of loan amount to estimated annual income</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-cyan-400">{Math.round((thresholds.maxLoanToIncomeRatio || 0.4) * 100)}%</span>
                  <input type="range" min={10} max={80} step={5} value={Math.round((thresholds.maxLoanToIncomeRatio || 0.4) * 100)}
                    onChange={e => setThresholds((prev: any) => ({ ...prev, maxLoanToIncomeRatio: Number(e.target.value) / 100 }))}
                    className="flex-1" style={{ accentColor: '#06b6d4' }}
                  />
                </div>
              </div>
            </div>
            <button onClick={saveWeights} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Thresholds'}
            </button>
          </motion.div>
        )}

        {tab === 'abtest' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-white">A/B Test Configuration</h3>
                  <p className="text-sm text-muted-foreground">Split traffic between model versions to measure performance</p>
                </div>
                <div className={cn('px-3 py-1 rounded-full text-xs font-medium', config?.abTest?.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-muted-foreground')}>
                  {config?.abTest?.enabled ? 'Active' : 'Disabled'}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { key: 'variantA', label: 'Variant A (Control)', color: '#06b6d4' },
                  { key: 'variantB', label: 'Variant B (Challenger)', color: '#8b5cf6' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-medium mb-1" style={{ color }}>{label}</p>
                    <p className="text-white font-semibold mb-3">{config?.abTest?.[key]?.name || key}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-white">{config?.abTest?.[key]?.trafficPct || 50}%</span>
                      <span className="text-sm text-muted-foreground">of traffic</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${config?.abTest?.[key]?.trafficPct || 50}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4 p-3 rounded-lg bg-white/5">
                A/B testing distributes credit score queries across model versions to compare accuracy, default prediction rate, and approval rates.
              </p>
            </div>
          </motion.div>
        )}

        {tab === 'history' && config && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {config.modelHistory.map((v: any, i: number) => (
              <div key={v.version} className={cn('p-5 rounded-xl border transition-all', i === config.modelHistory.length - 1 ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', i === config.modelHistory.length - 1 ? 'bg-cyan-500/20' : 'bg-white/10')}>
                      {i === config.modelHistory.length - 1 ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : <History className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{v.version}</span>
                        {i === config.modelHistory.length - 1 && <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">Current</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{v.notes}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{Math.round(v.accuracy * 100)}% accuracy</p>
                    <p className="text-xs text-muted-foreground">{new Date(v.deployedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
