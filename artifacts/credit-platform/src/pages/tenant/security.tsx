import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Toggle, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { ShieldCheck, ShieldAlert, LogIn, Globe2, UserX, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const OUTCOME: Record<string, { label: string; tone: string }> = {
  success: { label: 'success', tone: 'green' },
  bad_credentials: { label: 'bad credentials', tone: 'red' },
  inactive_account: { label: 'blocked — suspended', tone: 'amber' },
};
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString()
    ? `${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today`
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const device = (ua: string | null) => {
  if (!ua) return 'unknown';
  const browser = /Edg/.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'Browser';
  const os = /Mac/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /curl/.test(ua) ? 'CLI' : 'other';
  return `${browser} · ${os}`;
};

export default function SecuritySettings() {
  const { request, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const isAdmin = user?.role === 'tenant_admin';

  async function load() {
    const res = await request(`${API}/tenant/security`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function toggle(s: any) {
    setData((prev: any) => ({ ...prev, settings: prev.settings.map((x: any) => (x.key === s.key ? { ...x, enabled: !x.enabled } : x)) }));
    const res = await request(`${API}/tenant/security/${s.key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !s.enabled }),
    });
    if (!res.ok) load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { settings, events, posture, signins } = data;
  const enforced = settings.filter((s: any) => s.enabled).length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ShieldCheck} tint="#10B981" title="Security Settings"
          subtitle="Access controls and authentication activity for your workspace" />

        <KpiGrid items={[
          { label: 'MFA Coverage', value: `${posture.mfaCoverage}%`, icon: ShieldCheck, tint: posture.mfaCoverage === 100 ? '#10B981' : '#F59E0B',
            sub: `${posture.mfa} of ${posture.users} users` },
          { label: 'Policies Enforced', value: `${enforced}/${settings.length}`, icon: ShieldAlert, tint: '#4F6EF7' },
          { label: 'Sign-ins (7d)', value: signins.last7d, icon: LogIn, tint: '#8B5CF6' },
          { label: 'Failed Attempts (7d)', value: signins.failed7d, icon: UserX, tint: signins.failed7d ? '#EF4444' : '#94A3B8' },
          { label: 'Dormant Accounts', value: posture.dormant, icon: Clock3, tint: posture.dormant ? '#F59E0B' : '#94A3B8', sub: 'no login in 60 days' },
        ]} />

        {posture.mfaCoverage < 100 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            {posture.users - posture.mfa} account{posture.users - posture.mfa !== 1 ? 's are' : ' is'} without MFA. Enable it per user under Administration → Users.
          </div>
        )}

        <Panel title="Access Policies" subtitle="Applied to everyone in your workspace" padded>
          <div className="divide-y divide-slate-100">
            {settings.map((s: any) => (
              <div key={s.key} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.description}
                    {s.updatedBy && <span className="text-gray-400"> · last changed by {s.updatedBy}</span>}
                  </p>
                </div>
                <Toggle on={s.enabled} onChange={() => isAdmin && toggle(s)} />
              </div>
            ))}
          </div>
          {!isAdmin && <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-slate-100">Only tenant admins can change security policies.</p>}
        </Panel>

        <Panel title="Authentication Activity" subtitle={`Recent sign-in attempts across ${signins.ips} distinct IP address${signins.ips !== 1 ? 'es' : ''}`}>
          <Table head={['User', 'Outcome', 'Device', 'IP Address', 'When']}>
            {events.map((e: any) => (
              <tr key={e.id} className={cn('transition-colors', e.outcome !== 'success' ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/70')}>
                <Td className="font-semibold text-gray-900">{e.email}</Td>
                <Td><Badge tone={OUTCOME[e.outcome]?.tone ?? 'slate'}>{OUTCOME[e.outcome]?.label ?? e.outcome}</Badge></Td>
                <Td className="text-muted-foreground">{device(e.userAgent)}</Td>
                <Td className="font-mono text-xs"><span className="inline-flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-gray-400" />{e.ipAddress ?? '—'}</span></Td>
                <Td className="text-muted-foreground">{fmtTime(e.createdAt)}</Td>
              </tr>
            ))}
            {events.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">No sign-in activity recorded yet.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
