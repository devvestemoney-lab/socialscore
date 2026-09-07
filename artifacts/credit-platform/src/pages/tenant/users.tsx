import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Users, UserCheck, MailPlus, UserX, ShieldCheck, ShieldOff, Plus, Loader2, Copy, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const statusTone: Record<string, string> = { active: 'green', invited: 'amber', suspended: 'red' };
const ago = (iso: string | null) => {
  if (!iso) return 'Never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};

export default function TenantUsers() {
  const { request, user: me } = useAuth();
  const [data, setData] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'tenant_user', roleId: '' });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = me?.role === 'tenant_admin';

  async function load() {
    const [uRes, rRes] = await Promise.all([request(`${API}/tenant/team`), request(`${API}/tenant/team/roles`)]);
    setData(await uRes.json());
    setRoles((await rRes.json()).roles ?? []);
  }
  useEffect(() => { load(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await request(`${API}/tenant/team/invite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, roleId: form.roleId || null }),
    });
    setSaving(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Invite failed'); return; }
    setTempPassword(body.tempPassword); setForm({ name: '', email: '', role: 'tenant_user', roleId: '' });
    load();
  }

  async function update(id: string, patch: any) {
    const res = await request(`${API}/tenant/team/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (res.ok) load(); else alert((await res.json()).message ?? 'Update failed');
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { users, summary } = data;
  const filtered = users.filter((u: any) => filter === 'all' || u.status === filter);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Users} tint="#6366F1" title="Users"
          subtitle="People with access to your Social Score workspace"
          actions={isAdmin && (
            <button onClick={() => { setShowInvite(true); setTempPassword(null); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Invite User
            </button>
          )} />

        <KpiGrid items={[
          { label: 'Total Users', value: summary.total, icon: Users, tint: '#4F6EF7' },
          { label: 'Active', value: summary.active, icon: UserCheck, tint: '#10B981' },
          { label: 'Pending Invites', value: summary.invited, icon: MailPlus, tint: '#F59E0B' },
          { label: 'Suspended', value: summary.suspended, icon: UserX, tint: summary.suspended ? '#EF4444' : '#94A3B8' },
          { label: 'MFA Coverage', value: summary.total ? `${Math.round((summary.mfa / summary.total) * 100)}%` : '—', icon: ShieldCheck,
            tint: summary.mfa === summary.total ? '#10B981' : '#F59E0B', sub: summary.dormant ? `${summary.dormant} dormant 60d+` : 'no dormant accounts' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'invited', 'suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                filter === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{f}</button>
          ))}
        </div>

        <Panel title="Workspace Users">
          <Table head={['User', 'System Role', 'Bureau Role', 'MFA', 'Last Login', 'Status', '']}>
            {filtered.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <Td>
                  <p className="font-semibold text-gray-900">{u.name}{u.id === me?.id && <span className="ml-2 text-[10px] text-blue-500 font-bold">YOU</span>}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </Td>
                <Td><Badge tone={u.role === 'tenant_admin' ? 'blue' : 'slate'}>{u.role.replace('_', ' ')}</Badge></Td>
                <Td className="text-muted-foreground">{u.roleName ?? '—'}</Td>
                <Td>
                  <button onClick={() => isAdmin && update(u.id, { mfaEnabled: !u.mfaEnabled })} disabled={!isAdmin}
                    className={cn('inline-flex items-center gap-1 text-xs font-medium', u.mfaEnabled ? 'text-emerald-600' : 'text-amber-600', !isAdmin && 'cursor-default')}>
                    {u.mfaEnabled ? <><ShieldCheck className="w-3.5 h-3.5" /> Enabled</> : <><ShieldOff className="w-3.5 h-3.5" /> Off</>}
                  </button>
                </Td>
                <Td className={cn('text-muted-foreground', !u.lastLoginAt && 'text-amber-600')}>
                  <span className="inline-flex items-center gap-1.5">{!u.lastLoginAt && <Clock3 className="w-3.5 h-3.5" />}{ago(u.lastLoginAt)}</span>
                </Td>
                <Td><Badge tone={statusTone[u.status]}>{u.status}</Badge></Td>
                <Td>
                  {isAdmin && u.id !== me?.id && (u.status === 'suspended'
                    ? <button onClick={() => update(u.id, { status: 'active' })} className="text-xs font-medium text-emerald-600 hover:underline">Reactivate</button>
                    : <button onClick={() => update(u.id, { status: 'suspended' })} className="text-xs font-medium text-rose-600 hover:underline">Suspend</button>)}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No users match this filter.</Td></tr>}
          </Table>
          {!isAdmin && <p className="px-5 py-3 text-xs text-muted-foreground border-t border-slate-100">Only tenant admins can invite users or change access.</p>}
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
            <button onClick={() => setShowInvite(false)} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={invite} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <Field label="Full Name"><input required className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Email Address"><input required type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="System Role">
                <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="tenant_user">Tenant User</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
              </Field>
              <Field label="Bureau Role" hint="optional">
                <select className={inputCls} value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                  <option value="">—</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Send Invite
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
