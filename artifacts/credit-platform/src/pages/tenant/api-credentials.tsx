import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Modal } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { KeyRound, RotateCcw, Info, Copy, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const statusTone: Record<string, string> = { active: 'green', suspended: 'red', revoked: 'slate' };
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

export default function ApiCredentials() {
  const { request, user } = useAuth();
  const [keys, setKeys] = useState<any[] | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [issued, setIssued] = useState<any>(null);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'tenant_admin';

  async function load() {
    const res = await request(`${API}/tenant/api/keys`);
    setKeys((await res.json()).keys ?? []);
  }
  useEffect(() => { load(); }, []);

  async function rotate(k: any) {
    if (!confirm(`Rotate the ${k.env} key? The current secret keeps working for 24 hours.`)) return;
    setRotating(k.id); setError('');
    const res = await request(`${API}/tenant/api/keys/${k.id}/rotate`, { method: 'POST' });
    setRotating(null);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Rotation failed'); return; }
    setIssued(body); load();
  }

  if (!keys) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={KeyRound} tint="#6366F1" title="API Credentials"
          subtitle="Your institution's keys — store them only in your secrets manager" />

        {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

        <Panel title="Keys">
          <Table head={['Key', 'Environment', 'Rate Limit', 'Created', 'Expires', 'Last Used', 'Status', '']}>
            {keys.map(k => {
              const expiringSoon = k.expiresAt && new Date(k.expiresAt).getTime() < Date.now() + 30 * 86_400_000;
              return (
                <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs">{k.displayPrefix}</Td>
                  <Td><Badge tone={k.env === 'production' ? 'blue' : 'slate'}>{k.env}</Badge></Td>
                  <Td className="text-muted-foreground">{k.rateLimitRpm.toLocaleString()} rpm</Td>
                  <Td className="text-muted-foreground">{fmtDate(k.createdAt)}</Td>
                  <Td className={expiringSoon && k.status === 'active' ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}>
                    {fmtDate(k.expiresAt)}{expiringSoon && k.status === 'active' && ' ⚠'}
                  </Td>
                  <Td className="text-muted-foreground">{ago(k.lastUsedAt)}</Td>
                  <Td><Badge tone={statusTone[k.status]}>{k.status}</Badge></Td>
                  <Td>
                    {isAdmin && k.status === 'active' && (
                      <button onClick={() => rotate(k)} disabled={rotating === k.id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50">
                        {rotating === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Rotate
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
            {keys.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No API keys issued — contact the bureau to request credentials.</Td></tr>}
          </Table>
          <p className="flex items-start gap-2 px-5 py-3 text-xs text-muted-foreground border-t border-slate-100">
            <Info className="w-4 h-4 shrink-0" />
            Rotating issues a new secret immediately; the previous key keeps working for a 24-hour grace period.
            Additional keys are issued by the bureau on request.
            {!isAdmin && ' Only tenant admins can rotate credentials.'}
          </p>
        </Panel>

        <Panel title="Using Your Key" padded>
          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto leading-relaxed">{`curl -X POST https://api.socialscore.co.zm/v1/credit/report \\
  -H "Authorization: Bearer sscore_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "nrc": "123456/78/1", "purpose": "loan_origination" }'`}</pre>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {[
              { icon: ShieldCheck, tint: '#10B981', t: 'Never commit keys', d: 'Store in a secrets manager, not source control' },
              { icon: RotateCcw, tint: '#4F6EF7', t: 'Rotate quarterly', d: 'Or immediately if exposure is suspected' },
              { icon: AlertTriangle, tint: '#F59E0B', t: 'Restrict by IP', d: 'Production keys can be locked to your ranges' },
            ].map(c => (
              <div key={c.t} className="p-3.5 rounded-xl border border-slate-200">
                <c.icon className="w-4 h-4 mb-2" style={{ color: c.tint }} />
                <p className="text-sm font-semibold text-gray-900">{c.t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.d}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Modal open={!!issued} onClose={() => setIssued(null)} title="Key Rotated"
        subtitle="Copy the new secret now — it is shown only once">
        {issued && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              New secret issued. The previous key remains valid for {issued.graceHours} hours to let you roll it out.
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-gray-900 break-all">
              <span className="flex-1">{issued.token}</span>
              <button onClick={() => navigator.clipboard?.writeText(issued.token)} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setIssued(null)} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
