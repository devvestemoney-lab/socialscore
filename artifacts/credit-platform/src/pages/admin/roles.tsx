import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { UserCog, Check, Minus, Plus, Loader2, Trash2, LockKeyhole } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const MODULES = ['Dashboards', 'Credit Reports', 'Data Submission', 'Consumer Registry', 'Disputes', 'User Management', 'Billing', 'System Settings'];
const roleTone = (r: any) => (r.scope === 'platform' ? 'violet' : r.isSystem ? 'blue' : 'green');
const EMPTY_FORM = { name: '', description: '', scope: 'tenant' };

export default function RolesPermissions() {
  const { request } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/admin/roles`);
    setRoles((await res.json()).roles ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  /** Click a matrix cell: cycle none → read-only → full → none, persisted immediately */
  async function cycle(role: any, module: string) {
    const current = role.permissions?.[module] ?? 0;
    const next = ((current + 1) % 3) as 0 | 1 | 2;
    const permissions = { ...role.permissions, [module]: next };
    setRoles(prev => prev.map(r => (r.id === role.id ? { ...r, permissions } : r)));
    const res = await request(`${API}/admin/roles/${role.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions }),
    });
    if (!res.ok) load(); // revert on failure
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await request(`${API}/admin/roles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, permissions: Object.fromEntries(MODULES.map(m => [m, 0])) }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed to create role'); return; }
    setShowCreate(false); setForm(EMPTY_FORM);
    load();
  }

  async function remove(role: any) {
    if (!confirm(`Delete the "${role.name}" role? Users assigned to it will keep access via their system role.`)) return;
    const res = await request(`${API}/admin/roles/${role.id}`, { method: 'DELETE' });
    if (res.ok) setRoles(prev => prev.filter(r => r.id !== role.id));
    else alert((await res.json()).message ?? 'Failed to delete role');
  }

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UserCog} tint="#8B5CF6" title="Roles & Permissions"
          subtitle="Role definitions and module-level access control across the platform"
          actions={
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Create Role
            </button>
          } />

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map(r => (
            <div key={r.id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={roleTone(r)}>{r.name}</Badge>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  {r.isSystem && <LockKeyhole className="w-3 h-3" />} {r.scope} scope
                </span>
              </div>
              <p className="text-sm text-gray-700 min-h-[40px] flex-1">{r.description || 'No description.'}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">{r.userCount} user{r.userCount !== 1 ? 's' : ''} assigned</p>
                {!r.isSystem && (
                  <button onClick={() => remove(r)} className="text-gray-300 hover:text-rose-500 transition-colors" title="Delete role">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Panel title="Permission Matrix" subtitle="Click any cell to cycle: none → read-only → full access. Changes save instantly.">
          <Table head={['Role', ...MODULES]}>
            {roles.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{r.name}</Td>
                {MODULES.map(m => {
                  const v = r.permissions?.[m] ?? 0;
                  return (
                    <Td key={m}>
                      <button onClick={() => cycle(r, m)} title={`${r.name} · ${m}: ${v === 2 ? 'full' : v === 1 ? 'read-only' : 'none'} (click to change)`}
                        className="transition-transform hover:scale-110">
                        {v === 2 ? <span className="inline-flex w-6 h-6 rounded-md bg-emerald-500/10 items-center justify-center"><Check className="w-3.5 h-3.5 text-emerald-600" /></span>
                          : v === 1 ? <span className="inline-flex w-6 h-6 rounded-md bg-amber-500/10 items-center justify-center text-[10px] font-bold text-amber-600">R</span>
                          : <span className="inline-flex w-6 h-6 rounded-md bg-slate-100 items-center justify-center"><Minus className="w-3.5 h-3.5 text-slate-300" /></span>}
                      </button>
                    </Td>
                  );
                })}
              </tr>
            ))}
          </Table>
          <div className="flex gap-4 px-5 py-3 border-t border-slate-100 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Full access</span>
            <span className="inline-flex items-center gap-1.5"><span className="font-bold text-amber-600">R</span> Read-only</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-slate-300" /> No access</span>
          </div>
        </Panel>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Role"
        subtitle="New roles start with no access — set permissions in the matrix">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <Field label="Role Name">
            <input required className={inputCls} value={form.name} placeholder="e.g. Fraud Investigator"
              onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Description">
            <input className={inputCls} value={form.description} placeholder="What can this role do?"
              onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Scope">
            <select className={inputCls} value={form.scope} onChange={e => setForm((f: any) => ({ ...f, scope: e.target.value }))}>
              <option value="tenant">Tenant — scoped to one institution</option>
              <option value="platform">Platform — bureau-wide</option>
            </select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Role
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
