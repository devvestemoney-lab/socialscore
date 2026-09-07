import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { KeyRound, Activity, AlertOctagon, Timer, Plus, Loader2, Copy } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const statusTone: Record<string, string> = { active: 'green', suspended: 'red', revoked: 'slate', healthy: 'green', degraded: 'amber' };
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ApiManagement() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [showIssue, setShowIssue] = useState(false);
  const [form, setForm] = useState({ tenantId: '', env: 'production', rateLimitRpm: 300 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  async function load() {
    const [kRes, tRes] = await Promise.all([
      request(`${API}/admin/api-keys`),
      request(`${API}/tenants`),
    ]);
    setData(await kRes.json());
    setTenants((await tRes.json()).tenants ?? []);
  }
  useEffect(() => { load(); }, []);

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await request(`${API}/admin/api-keys`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Failed to issue key'); return; }
    setIssuedToken(body.token);
    load();
  }

  async function setKeyStatus(id: string, status: string) {
    await request(`${API}/admin/api-keys/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { keys, endpoints, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={KeyRound} tint="#6366F1" title="API Management"
          subtitle="Gateway traffic, endpoint health and tenant API credentials"
          actions={
            <button onClick={() => { setShowIssue(true); setIssuedToken(null); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Issue API Key
            </button>
          } />

        <KpiGrid items={[
          { label: 'Active API Keys', value: summary.activeKeys, icon: KeyRound, tint: '#6366F1', sub: `across ${tenants.length} tenants` },
          { label: 'Requests (30d)', value: summary.requests30d.toLocaleString(), icon: Activity, tint: '#4F6EF7' },
          { label: 'Report Error Rate (30d)', value: `${summary.errorRate}%`, icon: AlertOctagon, tint: '#EF4444' },
          { label: 'Avg Report Latency', value: `${(summary.avgLatencyMs / 1000).toFixed(1)}s`, icon: Timer, tint: '#F59E0B' },
        ]} />

        <Panel title="Endpoint Health (30d)" subtitle="Call volumes computed from live platform activity">
          <Table head={['Endpoint', 'Method', 'Calls', 'Error Rate', '', 'p95 Latency', 'Status']}>
            {endpoints.map((e: any) => (
              <tr key={e.path} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-gray-900">{e.path}</Td>
                <Td><Badge tone={e.method === 'GET' ? 'blue' : 'violet'}>{e.method}</Badge></Td>
                <Td>{e.calls30d.toLocaleString()}</Td>
                <Td className={e.errRate > 1 ? 'text-rose-600 font-semibold' : ''}>{e.errRate}%</Td>
                <Td className="w-32"><Bar value={Math.min(100, e.errRate * 20)} color={e.errRate > 1 ? '#EF4444' : '#10B981'} /></Td>
                <Td className="text-muted-foreground">{e.p95}</Td>
                <Td><Badge tone={statusTone[e.status]}>{e.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Tenant API Keys">
          <Table head={['Tenant', 'Key', 'Environment', 'Rate Limit', 'Last Used', 'Expires', 'Status', 'Actions']}>
            {keys.map((k: any) => {
              const expiringSoon = k.expiresAt && new Date(k.expiresAt).getTime() < Date.now() + 30 * 86_400_000;
              return (
                <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{k.tenantName}</Td>
                  <Td className="font-mono text-xs">{k.displayPrefix}</Td>
                  <Td><Badge tone={k.env === 'production' ? 'blue' : 'slate'}>{k.env}</Badge></Td>
                  <Td className="text-muted-foreground">{k.rateLimitRpm.toLocaleString()} rpm</Td>
                  <Td className="text-muted-foreground">{fmt(k.lastUsedAt)}</Td>
                  <Td className={expiringSoon && k.status === 'active' ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}>{fmt(k.expiresAt)}</Td>
                  <Td><Badge tone={statusTone[k.status]}>{k.status}</Badge></Td>
                  <Td>
                    {k.status === 'active' && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setKeyStatus(k.id, 'suspended')} className="text-xs font-medium text-amber-600 hover:underline">Suspend</button>
                        <button onClick={() => confirm('Revoke this key permanently?') && setKeyStatus(k.id, 'revoked')} className="text-xs font-medium text-rose-600 hover:underline">Revoke</button>
                      </div>
                    )}
                    {k.status === 'suspended' && (
                      <button onClick={() => setKeyStatus(k.id, 'active')} className="text-xs font-medium text-emerald-600 hover:underline">Reactivate</button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>

      <Modal open={showIssue} onClose={() => setShowIssue(false)} title="Issue API Key"
        subtitle="Credentials are scoped to one tenant and environment">
        {issuedToken ? (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              Key issued. Copy it now — the full token is shown only once:
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-gray-900 break-all">
              <span className="flex-1">{issuedToken}</span>
              <button onClick={() => navigator.clipboard?.writeText(issuedToken)} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setShowIssue(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={issue} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <Field label="Tenant">
              <select required className={inputCls} value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}>
                <option value="">Select tenant…</option>
                {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Environment">
                <select className={inputCls} value={form.env} onChange={e => setForm(f => ({ ...f, env: e.target.value }))}>
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </Field>
              <Field label="Rate Limit (rpm)">
                <input type="number" min={10} className={inputCls} value={form.rateLimitRpm}
                  onChange={e => setForm(f => ({ ...f, rateLimitRpm: Number(e.target.value) }))} />
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowIssue(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Issue Key
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
