import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Toggle } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Lock, Smartphone, ShieldCheck, LogOut, Monitor, AlertTriangle, KeyRound } from 'lucide-react';
import { API, fmtDate, ago } from './kit';

const OUTCOME: Record<string, { label: string; tone: string }> = {
  success: { label: 'Signed in', tone: 'green' },
  bad_credentials: { label: 'Wrong passcode', tone: 'red' },
  inactive_account: { label: 'Blocked', tone: 'amber' },
};

const PREF_KEY = 'consumer_notify_prefs';
const PREFS = [
  { key: 'inquiry', title: 'When a lender searches my file', desc: 'Alert me every time someone requests my credit report' },
  { key: 'new_account', title: 'When a new account appears', desc: 'A new loan or credit facility is reported in my name' },
  { key: 'score_change', title: 'When my score moves', desc: 'Any change of 10 points or more' },
  { key: 'missed_payment', title: 'When a payment is reported late', desc: 'So I can act before it becomes a default' },
  { key: 'dispute_update', title: 'Dispute progress', desc: 'Updates on cases I have raised' },
];

export default function SecuritySettings() {
  const { request, logoutUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) ?? '') ?? {}; } catch { return {}; }
  });

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/security`);
      setData(res.ok ? await res.json() : { events: [], account: {} });
    })();
  }, []);

  function setPref(k: string, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
  const on = (k: string) => prefs[k] !== false;

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { events, account } = data;
  const failed = events.filter((e: any) => e.outcome !== 'success').length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Lock} tint="#EF4444" title="Security & Settings"
          subtitle="How you sign in, who has been in your account, and what we alert you about"
          actions={
            <button onClick={logoutUser} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          } />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Last signed in', value: account.lastLoginAt ? ago(account.lastLoginAt) : '—', tint: '#4F6EF7', icon: Monitor },
            { label: 'Failed attempts recorded', value: failed, tint: failed ? '#EF4444' : '#94A3B8', icon: AlertTriangle },
            { label: 'Member since', value: fmtDate(account.memberSince), tint: '#10B981', icon: ShieldCheck },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
              </div>
              <p className="text-lg font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Panel title="How you sign in" padded>
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10">
              <KeyRound className="w-6 h-6 text-emerald-600" />
            </span>
            <div className="text-sm flex-1">
              <p className="font-semibold text-gray-900">NRC and one-time passcode</p>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                You sign in with your NRC number, and we send a six-digit passcode to your registered mobile number.
                There is no password to remember or leak, and a passcode expires after 10 minutes. Five wrong attempts
                lock the request and you must start again.
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-700">
                <Smartphone className="w-4 h-4 text-gray-400" />
                Passcodes are sent to the number on your bureau record.
                <Badge tone="green">Active</Badge>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Alert preferences" subtitle="Choose what we tell you about — we always alert you to fraud risks">
          <div className="divide-y divide-slate-100">
            {PREFS.map(p => (
              <div key={p.key} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.title}</p>
                  <p className="text-[13px] text-muted-foreground">{p.desc}</p>
                </div>
                <Toggle on={on(p.key)} onChange={v => setPref(p.key, v)} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent sign-in activity" subtitle="If you see something you don't recognise, contact us immediately">
          <Table head={['When', 'Outcome', 'Device', 'IP address']}>
            {events.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="text-muted-foreground">{fmtDate(e.createdAt)} · {ago(e.createdAt)}</Td>
                <Td><Badge tone={OUTCOME[e.outcome]?.tone ?? 'slate'}>{OUTCOME[e.outcome]?.label ?? e.outcome}</Badge></Td>
                <Td className="text-muted-foreground max-w-[320px] truncate">{e.userAgent ?? '—'}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{e.ipAddress ?? '—'}</Td>
              </tr>
            ))}
            {events.length === 0 && <tr><Td colSpan={4} className="text-center text-muted-foreground py-8">No sign-in activity recorded yet.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
