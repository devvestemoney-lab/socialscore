import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Users, UserCheck, MailPlus, UserX, Plus, ShieldCheck, ShieldOff, Loader2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const statusTone: Record<string, string> = { active: 'green', invited: 'amber', suspended: 'red' };
const SYSTEM_ROLES = [
  { value: 'tenant_user', label: 'Tenant User' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'super_admin', label: 'Super Admin (platform)' },
];
const EMPTY_INVITE = { name: '', email: '', role: 'tenant_user', tenantId: '', roleId: '' };

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export default function UsersAccess() {
  const { request, user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_INVITE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function load() {
    const [uRes, rRes, tRes] = await Promise.all([
      request(`${API}/admin/users`),
      request(`${API}/admin/roles`),
      request(`${API}/tenants`),
    ]);
    setUsers((await uRes.json()).users ?? []);
    setRoles((await rRes.json()).roles ?? []);
    setTenants((await tRes.json()).tenants ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await request(`${API}/admin/users/invite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tenantId: form.tenantId || null, roleId: form.roleId || null }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) { setError(data.message ?? 'Failed to invite user'); return; }
    setTempPassword(data.tempPassword);
    setForm(EMPTY_INVITE);
    load();
  }

  async function setAccess(id: string, patch: Record<string, unknown>) {
    const res = await request(`${API}/admin/users/${id}/access`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { user } = await res.json();
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...user } : u)));
    }
  }

  const filtered = users.filter(u => filter === 'all' || u.status === filter);
  const kpis = useMemo(() => ({
    active: users.filter(u => u.status === 'active').length,
    invited: users.filter(u => u.status === 'invited').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }), [users]);

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Users} tint="#6366F1" title="Users & Access"
          subtitle="All platform users across tenants, roles and access states"
          actions={
            <button onClick={() => { setShowInvite(true); setTempPassword(null); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Invite User
            </button>
          } />

        <KpiGrid items={[
          { label: 'Total Users', value: users.length, icon: Users, tint: '#4F6EF7', sub: `across ${tenants.length} tenants` },
          { label: 'Active', value: kpis.active, icon: UserCheck, tint: '#10B981' },
          { label: 'Pending Invites', value: kpis.invited, icon: MailPlus, tint: '#F59E0B' },
          { label: 'Suspended', value: kpis.suspended, icon: UserX, tint: '#EF4444' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'invited', 'suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                filter === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
              {f}
            </button>
          ))}
        </div>

        <Panel title="User Directory">
          <Table head={['User', 'Tenant', 'Bureau Role', 'MFA', 'Last Login', 'Status', 'Actions']}>
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <Td>
                  <p className="font-semibold text-gray-900">{u.name}{u.id === me?.id && <span className="ml-2 text-[10px] text-blue-500 font-bold">YOU</span>}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </Td>
                <Td>{u.tenantName ?? <span className="text-muted-foreground">Platform</span>}</Td>
                <Td>
                  <Badge tone={u.role === 'super_admin' ? 'violet' : u.role === 'tenant_admin' ? 'blue' : 'slate'}>
                    {u.roleName ?? u.role.replace('_', ' ')}
                  </Badge>
                </Td>
                <Td>
                  <button onClick={() => setAccess(u.id, { mfaEnabled: !u.mfaEnabled })} title="Toggle MFA requirement">
                    {u.mfaEnabled
                      ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><ShieldCheck className="w-3.5 h-3.5" /> Enabled</span>
                      : <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><ShieldOff className="w-3.5 h-3.5" /> Off</span>}
                  </button>
                </Td>
                <Td className="text-muted-foreground">{timeAgo(u.lastLoginAt)}</Td>
                <Td><Badge tone={statusTone[u.status]}>{u.status}</Badge></Td>
                <Td>
                  {u.id !== me?.id && (u.status === 'suspended'
                    ? <button onClick={() => setAccess(u.id, { status: 'active' })} className="text-xs font-medium text-emerald-600 hover:underline">Reactivate</button>
                    : <button onClick={() => setAccess(u.id, { status: 'suspended' })} className="text-xs font-medium text-rose-600 hover:underline">Suspend</button>)}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite User"
        subtitle="The user signs in with a temporary password and is activated on first login">
        {tempPassword ? (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              Invitation created. Share this temporary password securely — it is shown only once:
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm text-gray-900">
              <span className="flex-1">{tempPassword}</span>
              <button onClick={() => navigator.clipboard?.writeText(tempPassword)} className="text-gray-400 hover:text-gray-700"><Copy className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setShowInvite(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={invite} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <Field label="Full Name">
              <input required className={inputCls} value={form.name}
                onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email Address">
              <input required type="email" className={inputCls} value={form.email}
                onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="System Role">
                <select className={inputCls} value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                  {SYSTEM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Bureau Role" hint="optional">
                <select className={inputCls} value={form.roleId} onChange={e => setForm((f: any) => ({ ...f, roleId: e.target.value }))}>
                  <option value="">—</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
            </div>
            {form.role !== 'super_admin' && (
              <Field label="Tenant">
                <select required className={inputCls} value={form.tenantId} onChange={e => setForm((f: any) => ({ ...f, tenantId: e.target.value }))}>
                  <option value="">Select tenant…</option>
                  {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Send Invite
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
