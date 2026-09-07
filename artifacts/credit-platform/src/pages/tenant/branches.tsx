import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { GitBranch, Plus, MapPin, Loader2, Trash2, CheckCircle2, Clock3 } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const PROVINCES = ['Lusaka', 'Copperbelt', 'Eastern', 'Southern', 'Northern', 'Central', 'Western', 'Luapula', 'Muchinga', 'North-Western'];
const statusTone: Record<string, string> = { active: 'green', pending_setup: 'amber', closed: 'slate' };
const EMPTY = { code: '', name: '', city: '', province: 'Lusaka', managerName: '', status: 'active' };

export default function Branches() {
  const { request, user } = useAuth();
  const [branches, setBranches] = useState<any[] | null>(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'tenant_admin';

  async function load() {
    const res = await request(`${API}/tenant/branches`);
    setBranches((await res.json()).branches ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await request(`${API}/tenant/branches`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed to add branch'); return; }
    setShow(false); setForm(EMPTY); load();
  }

  async function setStatus(b: any, status: string) {
    await request(`${API}/tenant/branches/${b.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(b: any) {
    if (!confirm(`Remove ${b.code} — ${b.name}?`)) return;
    await request(`${API}/tenant/branches/${b.id}`, { method: 'DELETE' });
    load();
  }

  if (!branches) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const active = branches.filter(b => b.status === 'active').length;
  const pending = branches.filter(b => b.status === 'pending_setup').length;
  const provinces = new Set(branches.map(b => b.province).filter(Boolean)).size;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={GitBranch} tint="#14B8A6" title="Branches / Departments"
          subtitle="Organisational units used for usage attribution and access scoping"
          actions={isAdmin && (
            <button onClick={() => { setShow(true); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          )} />

        <KpiGrid items={[
          { label: 'Total Branches', value: branches.length, icon: GitBranch, tint: '#14B8A6' },
          { label: 'Active', value: active, icon: CheckCircle2, tint: '#10B981' },
          { label: 'Pending Setup', value: pending, icon: Clock3, tint: pending ? '#F59E0B' : '#94A3B8' },
          { label: 'Provinces Covered', value: provinces, icon: MapPin, tint: '#4F6EF7' },
        ]} />

        <Panel title="Branch Register" subtitle="Branch codes must match those used in your data submissions">
          <Table head={['Code', 'Branch', 'City', 'Province', 'Manager', 'Status', '']}>
            {branches.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{b.code}</Td>
                <Td className="font-semibold text-gray-900">{b.name}</Td>
                <Td className="text-muted-foreground">{b.city || '—'}</Td>
                <Td className="text-muted-foreground">{b.province || '—'}</Td>
                <Td className="text-muted-foreground">{b.managerName || <span className="text-amber-600">unassigned</span>}</Td>
                <Td><Badge tone={statusTone[b.status] ?? 'slate'}>{b.status.replace('_', ' ')}</Badge></Td>
                <Td>
                  {isAdmin && (
                    <div className="flex items-center gap-3">
                      {b.status === 'pending_setup' && (
                        <button onClick={() => setStatus(b, 'active')} className="text-xs font-medium text-emerald-600 hover:underline">Activate</button>
                      )}
                      {b.status === 'active' && (
                        <button onClick={() => setStatus(b, 'closed')} className="text-xs font-medium text-amber-600 hover:underline">Close</button>
                      )}
                      <button onClick={() => remove(b)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
            {branches.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No branches registered yet.</Td></tr>}
          </Table>
          <p className="px-5 py-3 text-xs text-muted-foreground border-t border-slate-100">
            Unregistered branch codes in a submission are rejected with error <span className="font-mono">E-118</span> — register new branches before your next cycle.
          </p>
        </Panel>
      </div>

      <Modal open={show} onClose={() => setShow(false)} title="Add Branch" subtitle="Use the same code your core system reports">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Branch Code"><input required className={inputCls + ' font-mono'} value={form.code} placeholder="BR-102" onChange={e => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option><option value="pending_setup">Pending setup</option>
              </select>
            </Field>
          </div>
          <Field label="Branch Name"><input required className={inputCls} value={form.name} placeholder="e.g. Solwezi Agency" onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City"><input className={inputCls} value={form.city} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} /></Field>
            <Field label="Province">
              <select className={inputCls} value={form.province} onChange={e => setForm((f: any) => ({ ...f, province: e.target.value }))}>
                {PROVINCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Branch Manager" hint="optional"><input className={inputCls} value={form.managerName} onChange={e => setForm((f: any) => ({ ...f, managerName: e.target.value }))} /></Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShow(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Branch
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
