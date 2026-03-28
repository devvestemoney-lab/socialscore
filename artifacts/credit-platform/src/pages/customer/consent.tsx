import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ToggleLeft, ToggleRight, Eye, FileText,
  MessageSquare, Send, CheckCircle2, Clock, X, Building,
  CreditCard, Phone, Landmark, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const DATA_TYPES = [
  { type: 'personal_data', label: 'Personal Information', description: 'Name, NRC, contact details, address', icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { type: 'bank_data', label: 'Bank Account Data', description: 'Account balances, bank transactions, savings history', icon: Landmark, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { type: 'mobile_money', label: 'Mobile Money', description: 'MTN, Airtel, and Zamtel mobile money transactions', icon: Phone, color: 'text-green-400', bg: 'bg-green-500/10' },
  { type: 'mfi_data', label: 'Microfinance Loans', description: 'FINCA, Bayport, VisionFund loan and repayment data', icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { type: 'credit_bureau', label: 'Credit Bureau', description: 'Full credit history across all registered lenders', icon: BarChart3, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
];

const DISPUTE_TYPES = [
  { value: 'incorrect_loan', label: 'Incorrect Loan Record' },
  { value: 'wrong_default', label: 'Wrongly Marked Default' },
  { value: 'identity_error', label: 'Identity / NRC Mismatch' },
  { value: 'stale_data', label: 'Outdated Information' },
  { value: 'unauthorized_query', label: 'Unauthorized Data Access' },
  { value: 'other', label: 'Other Issue' },
];

const ratingColor: Record<string, string> = {
  Excellent: 'text-green-400', Good: 'text-cyan-400', Fair: 'text-yellow-400',
  Poor: 'text-orange-400', 'Very Poor': 'text-red-400',
};

export default function ConsentPortal() {
  const { request } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'consent' | 'report' | 'access-logs' | 'disputes'>('consent');

  // Consent
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Credit Report
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Access Logs
  const [accessLogs, setAccessLogs] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Disputes
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ type: '', description: '', affectedInstitution: '', loanId: '' });
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    request(`${API}/consent/status`).then(r => r.json()).then(data => {
      const map: Record<string, boolean> = {};
      (data.consents || []).forEach((c: any) => { map[c.dataType] = c.status === 'active'; });
      setConsents(map);
      setLoadingConsent(false);
    });
  }, []);

  useEffect(() => {
    if (tab === 'report' && !report) {
      setLoadingReport(true);
      request(`${API}/customer/report`).then(r => r.json()).then(d => { setReport(d); setLoadingReport(false); });
    }
    if (tab === 'access-logs' && !accessLogs) {
      setLoadingLogs(true);
      request(`${API}/customer/access-logs`).then(r => r.json()).then(d => { setAccessLogs(d); setLoadingLogs(false); });
    }
    if (tab === 'disputes' && disputes.length === 0) {
      setLoadingDisputes(true);
      request(`${API}/customer/disputes`).then(r => r.json()).then(d => { setDisputes(d.disputes || []); setLoadingDisputes(false); });
    }
  }, [tab]);

  async function toggleConsent(type: string, current: boolean) {
    setSaving(type);
    const endpoint = current ? '/consent/revoke' : '/consent/grant';
    const res = await request(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataTypes: [type] }),
    });
    if (res.ok) {
      setConsents(prev => ({ ...prev, [type]: !current }));
      toast({ title: current ? 'Consent Revoked' : 'Consent Granted', description: `${DATA_TYPES.find(d => d.type === type)?.label} consent updated` });
    }
    setSaving(null);
  }

  async function submitDispute() {
    if (!disputeForm.type || !disputeForm.description || !disputeForm.affectedInstitution) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSubmittingDispute(true);
    const res = await request(`${API}/customer/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(disputeForm),
    });
    if (res.ok) {
      const data = await res.json();
      setDisputes(prev => [data.dispute, ...prev]);
      setDisputeForm({ type: '', description: '', affectedInstitution: '', loanId: '' });
      toast({ title: 'Dispute Submitted', description: 'Reviewed within 5 business days' });
    }
    setSubmittingDispute(false);
  }

  const tabs = [
    { id: 'consent', label: 'Consent', icon: ShieldCheck },
    { id: 'report', label: 'My Credit Report', icon: FileText },
    { id: 'access-logs', label: 'Access Logs', icon: Eye },
    { id: 'disputes', label: 'Disputes', icon: MessageSquare },
  ];

  const activeCount = Object.values(consents).filter(Boolean).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">My ZamCredit Portal</h1>
            <p className="text-sm text-muted-foreground">Manage your data consent, credit report, and dispute records</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-50 rounded-xl flex-wrap w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.id ? 'bg-slate-100 text-gray-900' : 'text-muted-foreground hover:text-gray-900')}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ──── CONSENT ──── */}
        {tab === 'consent' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Data Sharing Consent</p>
                <p className="text-sm text-muted-foreground">{activeCount} of {DATA_TYPES.length} categories shared</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400">{activeCount}/{DATA_TYPES.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>

            <div className="space-y-3">
              {DATA_TYPES.map(({ type, label, description, icon: Icon, color, bg }) => {
                const active = !!consents[type];
                const isSaving = saving === type;
                return (
                  <motion.div key={type} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className={cn('p-5 rounded-xl border transition-all', active ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', active ? bg : 'bg-slate-50')}>
                          <Icon className={cn('w-5 h-5', active ? color : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <p className={cn('font-medium', active ? 'text-gray-900' : 'text-muted-foreground')}>{label}</p>
                          <p className="text-sm text-muted-foreground/80">{description}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleConsent(type, active)} disabled={isSaving}
                        className="shrink-0 ml-4 disabled:opacity-50 transition-all">
                        {active ? <ToggleRight className="w-10 h-10 text-cyan-400" /> : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-muted-foreground">
              Governed by the Bank of Zambia Data Protection Framework. Changes take effect within 24 hours.
            </div>
          </motion.div>
        )}

        {/* ──── CREDIT REPORT ──── */}
        {tab === 'report' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {loadingReport ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : report ? (
              <>
                <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Credit Score</p>
                      {report.creditScore.score ? (
                        <>
                          <p className="text-5xl font-display font-bold text-gray-900">{report.creditScore.score}</p>
                          <p className={cn('text-lg font-semibold mt-1', ratingColor[report.creditScore.rating] || 'text-gray-900')}>{report.creditScore.rating}</p>
                        </>
                      ) : <p className="text-xl text-muted-foreground">No score yet — a lender must query your profile first</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 font-medium">{report.customer.firstName} {report.customer.lastName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{report.customer.nrc}</p>
                      {report.creditScore.lastUpdated && (
                        <p className="text-xs text-muted-foreground mt-1">Updated {new Date(report.creditScore.lastUpdated).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  {report.creditScore.historicalScores?.length > 1 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Score History</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <LineChart data={report.creditScore.historicalScores}>
                          <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={false} />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Active Loans', value: report.loanSummary?.activeLoans ?? 0, color: 'text-cyan-400' },
                    { label: 'Outstanding', value: `ZMW ${(report.loanSummary?.totalOutstanding ?? 0).toLocaleString()}`, color: 'text-gray-900' },
                    { label: 'On-Time Rate', value: `${report.loanSummary?.onTimePaymentRate ?? 0}%`, color: (report.loanSummary?.onTimePaymentRate ?? 0) >= 80 ? 'text-green-400' : 'text-yellow-400' },
                    { label: 'Defaults', value: report.loanSummary?.defaultedLoans ?? 0, color: (report.loanSummary?.defaultedLoans ?? 0) > 0 ? 'text-red-400' : 'text-green-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className={cn('text-xl font-bold', color)}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {report.loans.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-semibold text-gray-900">All Loan Records</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            {['Institution', 'Principal', 'Outstanding', 'Status', 'Missed'].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.loans.map((loan: any) => (
                            <tr key={loan.id} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="py-3 px-4 text-sm text-gray-900">{loan.institution}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">ZMW {(loan.principalAmount ?? 0).toLocaleString()}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">ZMW {(loan.outstandingBalance ?? 0).toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                                  loan.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' :
                                  loan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  'bg-red-500/20 text-red-400')}>
                                  {loan.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium" style={{ color: loan.missedPayments > 0 ? '#ef4444' : '#10b981' }}>
                                {loan.missedPayments}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-muted-foreground">Credit report not available</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ──── ACCESS LOGS ──── */}
        {tab === 'access-logs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {loadingLogs ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : accessLogs ? (
              <>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-300">
                    Your credit data has been accessed <strong className="text-gray-900">{accessLogs.totalAccesses}</strong> times.
                    Only consented institutions may access your data.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-semibold text-gray-900">Access History ({accessLogs.totalAccesses} total)</h3>
                  </div>
                  {accessLogs.accessLogs.length === 0 ? (
                    <div className="p-8 text-center">
                      <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">No one has accessed your data yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {accessLogs.accessLogs.map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Building className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{log.tenantName}</p>
                              <p className="text-xs text-muted-foreground">{log.dataAccessed}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(log.accessedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* ──── DISPUTES ──── */}
        {tab === 'disputes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-400" />
                Raise a Dispute
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Dispute Type *</label>
                  <select value={disputeForm.type} onChange={e => setDisputeForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-gray-900 focus:outline-none focus:border-cyan-500 text-sm">
                    <option value="" disabled>Select type…</option>
                    {DISPUTE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Affected Institution *</label>
                  <input type="text" value={disputeForm.affectedInstitution} placeholder="e.g. Zanaco Bank"
                    onChange={e => setDisputeForm(p => ({ ...p, affectedInstitution: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-gray-900 placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description *</label>
                <textarea value={disputeForm.description} rows={3} placeholder="Describe the issue in detail…"
                  onChange={e => setDisputeForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-gray-900 placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500 text-sm resize-none"
                />
              </div>
              <button onClick={submitDispute} disabled={submittingDispute}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50 text-sm">
                <Send className="w-4 h-4" />
                {submittingDispute ? 'Submitting…' : 'Submit Dispute'}
              </button>
            </div>

            {loadingDisputes ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : disputes.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-gray-900 font-medium">No disputes raised</p>
                <p className="text-sm text-muted-foreground mt-1">If any information is incorrect, raise a dispute above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map(d => {
                  const statusIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
                    open: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                    under_review: { icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    resolved: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
                    dismissed: { icon: X, color: 'text-red-400', bg: 'bg-red-500/10' },
                  };
                  const sc = statusIcons[d.status] || statusIcons.open;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={d.id} className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{DISPUTE_TYPES.find(t => t.value === d.type)?.label || d.type}</p>
                          <p className="text-sm text-muted-foreground">{d.affectedInstitution}</p>
                        </div>
                        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', sc.bg, sc.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {d.status.replace('_', ' ')}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{d.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">Submitted {new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
