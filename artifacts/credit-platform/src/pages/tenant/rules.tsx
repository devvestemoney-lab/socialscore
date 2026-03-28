import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Settings2, Save, Plus, Trash2, ToggleLeft, ToggleRight, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const TIER_COLORS: Record<string, string> = { A: '#10b981', B: '#06b6d4', C: '#f59e0b', D: '#f97316', E: '#ef4444' };

export default function RuleConfiguration() {
  const { request } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'thresholds' | 'tiers' | 'custom'>('thresholds');

  useEffect(() => {
    request(`${API}/tenant/rules`).then(r => r.json()).then(setRules);
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await request(`${API}/tenant/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });
      if (res.ok) toast({ title: 'Rules saved', description: 'Decision rules updated successfully' });
    } finally { setSaving(false); }
  }

  function updateThreshold(key: string, value: number) {
    setRules((prev: any) => ({ ...prev, scoreThresholds: { ...prev.scoreThresholds, [key]: value } }));
  }

  function updateLoanLimit(key: string, value: number) {
    setRules((prev: any) => ({ ...prev, loanLimits: { ...prev.loanLimits, [key]: value } }));
  }

  function toggleRule(id: string) {
    setRules((prev: any) => ({
      ...prev,
      customRules: prev.customRules.map((r: any) => r.id === id ? { ...r, enabled: !r.enabled } : r),
    }));
  }

  function deleteRule(id: string) {
    setRules((prev: any) => ({ ...prev, customRules: prev.customRules.filter((r: any) => r.id !== id) }));
  }

  function addRule() {
    const newRule = { id: `rule-${Date.now()}`, name: 'New Rule', condition: '', action: 'manual_review', enabled: false };
    setRules((prev: any) => ({ ...prev, customRules: [...prev.customRules, newRule] }));
  }

  if (!rules) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">Rule Configuration</h1>
              <p className="text-sm text-muted-foreground">Customise decision rules, score cutoffs, and loan limits for your institution</p>
            </div>
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Rules'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-50 rounded-xl w-fit">
          {[['thresholds', 'Score Thresholds'], ['tiers', 'Risk Tiers'], ['custom', 'Custom Rules']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === id ? 'bg-slate-100 text-gray-900' : 'text-muted-foreground hover:text-gray-900')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'thresholds' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">Set the score thresholds that trigger automatic decisions in your loan workflow.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { key: 'autoApprove', label: 'Auto-Approve Above', color: '#10b981', help: 'Loans for customers with scores above this are approved automatically' },
                { key: 'manualReview', label: 'Manual Review Below', color: '#f59e0b', help: 'Scores between manual review and auto-approve trigger human review' },
                { key: 'autoDecline', label: 'Auto-Decline Below', color: '#ef4444', help: 'Scores below this threshold are automatically declined' },
              ].map(({ key, label, color, help }) => (
                <div key={key} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{help}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" min={0} max={1000} value={rules.scoreThresholds[key] || 0}
                      onChange={e => updateThreshold(key, Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-gray-900 text-center font-bold text-xl focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${((rules.scoreThresholds[key] || 0) / 1000) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {[
                { key: 'maxLoanAmount', label: 'Max Loan Amount (ZMW)', help: 'Maximum single loan amount your institution will approve' },
                { key: 'maxLoanToIncomeRatio', label: 'Max Loan-to-Income Ratio (%)', help: 'Expressed as a percentage of estimated annual income', scale: 100 },
                { key: 'maxActiveLoanCount', label: 'Max Active Loans per Borrower', help: 'Maximum concurrent active loans a single customer can have' },
              ].map(({ key, label, help, scale }) => (
                <div key={key} className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{help}</p>
                  </div>
                  <input type="number" min={0} value={scale ? Math.round((rules.loanLimits[key] || 0) * scale) : rules.loanLimits[key] || 0}
                    onChange={e => updateLoanLimit(key, scale ? Number(e.target.value) / scale : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-gray-900 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'tiers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {(rules.riskTiers || []).map((tier: any) => (
              <div key={tier.tier} className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                      style={{ backgroundColor: `${TIER_COLORS[tier.tier]}20`, color: TIER_COLORS[tier.tier] }}>
                      {tier.tier}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Tier {tier.tier}</p>
                      <p className="text-sm text-muted-foreground">Score range: {tier.minScore} – {tier.maxScore}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{tier.interestBand}</p>
                    <p className="text-xs text-muted-foreground">Interest band</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 text-center">
                    <p className="text-lg font-bold text-gray-900">{tier.maxLoan === 0 ? 'Declined' : `ZMW ${(tier.maxLoan / 1000).toFixed(0)}K`}</p>
                    <p className="text-xs text-muted-foreground">Max Loan</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 text-center">
                    <p className="text-lg font-bold text-gray-900">{tier.maxTenureMonths === 0 ? '—' : `${tier.maxTenureMonths}mo`}</p>
                    <p className="text-xs text-muted-foreground">Max Tenure</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 text-center">
                    <p className="text-lg font-bold" style={{ color: TIER_COLORS[tier.tier] }}>{tier.interestBand}</p>
                    <p className="text-xs text-muted-foreground">Interest</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'custom' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-300">Custom rules override standard scoring. Rules are evaluated in order after the base score is computed.</p>
            </div>

            {(rules.customRules || []).map((rule: any) => (
              <div key={rule.id} className={cn('p-4 rounded-xl border transition-all', rule.enabled ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 opacity-60')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <input value={rule.name} onChange={e => setRules((prev: any) => ({
                        ...prev, customRules: prev.customRules.map((r: any) => r.id === rule.id ? { ...r, name: e.target.value } : r)
                      }))}
                      className="w-full bg-transparent text-gray-900 font-medium focus:outline-none border-b border-slate-200 pb-1"
                      placeholder="Rule name"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Condition:</span>
                      <input value={rule.condition} onChange={e => setRules((prev: any) => ({
                          ...prev, customRules: prev.customRules.map((r: any) => r.id === rule.id ? { ...r, condition: e.target.value } : r)
                        }))}
                        className="flex-1 bg-transparent text-sm text-cyan-400 font-mono focus:outline-none"
                        placeholder="e.g. loanDefaults > 3"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Action:</span>
                      <select value={rule.action} onChange={e => setRules((prev: any) => ({
                          ...prev, customRules: prev.customRules.map((r: any) => r.id === rule.id ? { ...r, action: e.target.value } : r)
                        }))}
                        className="bg-slate-100 text-gray-900 text-sm rounded-lg px-2 py-1 focus:outline-none border border-slate-200">
                        <option value="approve">Auto-Approve</option>
                        <option value="manual_review">Manual Review</option>
                        <option value="decline">Auto-Decline</option>
                        <option value="cap">Cap Loan Amount</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleRule(rule.id)} className="text-muted-foreground hover:text-gray-900 transition-colors">
                      {rule.enabled ? <ToggleRight className="w-6 h-6 text-cyan-400" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addRule} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-200 text-muted-foreground hover:text-gray-900 hover:border-slate-300 transition-colors text-sm w-full justify-center">
              <Plus className="w-4 h-4" />
              Add Custom Rule
            </button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
