import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Toggle, Bar, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Flag, FlaskConical, Rocket, Archive, Plus, Loader2 } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const stageTone: Record<string, string> = { experimental: 'violet', beta: 'amber', ga: 'green', deprecated: 'red' };
const EMPTY = { key: '', name: '', stage: 'experimental', owner: '' };

export default function FeatureManagement() {
  const { request } = useAuth();
  const [flags, setFlags] = useState<any[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/admin/feature-flags`);
    setFlags((await res.json()).flags ?? []);
  }
  useEffect(() => { load(); }, []);

  async function patch(key: string, body: any) {
    const res = await request(`${API}/admin/feature-flags/${key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) {
      const { flag } = await res.json();
      setFlags(prev => prev!.map(f => (f.key === key ? flag : f)));
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await request(`${API}/admin/feature-flags`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, key: form.key || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), rollout: 0, envs: [], enabled: false }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed to create flag'); return; }
    setShowCreate(false); setForm(EMPTY);
    load();
  }

  if (!flags) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const count = (stage: string) => flags.filter(f => f.stage === stage).length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Flag} tint="#8B5CF6" title="Feature Management"
          subtitle="Feature flags, staged rollouts and environment targeting"
          actions={
            <button onClick={() => { setShowCreate(true); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> New Flag
            </button>
          } />

        <KpiGrid items={[
          { label: 'Total Flags', value: flags.length, icon: Flag, tint: '#4F6EF7' },
          { label: 'In Beta', value: count('beta'), icon: FlaskConical, tint: '#F59E0B' },
          { label: 'Generally Available', value: count('ga'), icon: Rocket, tint: '#10B981' },
          { label: 'Deprecated', value: count('deprecated'), icon: Archive, tint: '#EF4444' },
        ]} />

        <Panel title="Feature Flags" subtitle="Rollout % is editable inline · toggles persist instantly">
          <Table head={['Feature', 'Flag Key', 'Stage', 'Rollout', '', 'Environments', 'Owner', 'Enabled']}>
            {flags.map(f => (
              <tr key={f.key} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{f.name}</Td>
                <Td className="font-mono text-xs">{f.key}</Td>
                <Td>
                  <select value={f.stage} onChange={e => patch(f.key, { stage: e.target.value })}
                    className={`text-xs font-semibold rounded-full px-2 py-1 border-0 outline-none cursor-pointer ${
                      { experimental: 'bg-violet-500/10 text-violet-600', beta: 'bg-amber-500/10 text-amber-600', ga: 'bg-emerald-500/10 text-emerald-600', deprecated: 'bg-rose-500/10 text-rose-600' }[f.stage as string]}`}>
                    {['experimental', 'beta', 'ga', 'deprecated'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Td>
                <Td>
                  <input type="number" min={0} max={100} defaultValue={f.rollout} key={`${f.key}-${f.rollout}`}
                    onBlur={e => { const v = Number(e.target.value); if (v !== f.rollout) patch(f.key, { rollout: v }); }}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-sm text-gray-900 outline-none focus:border-blue-500" />
                </Td>
                <Td className="w-32"><Bar value={f.rollout} color={f.enabled ? '#8B5CF6' : '#CBD5E1'} /></Td>
                <Td>
                  {f.envs.length
                    ? <span className="flex gap-1">{f.envs.map((e: string) => <Badge key={e} tone={e === 'production' ? 'blue' : 'slate'}>{e}</Badge>)}</span>
                    : <span className="text-muted-foreground">—</span>}
                </Td>
                <Td className="text-muted-foreground">{f.owner}</Td>
                <Td><Toggle on={f.enabled} onChange={() => patch(f.key, { enabled: !f.enabled })} /></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Feature Flag"
        subtitle="New flags start disabled at 0% rollout">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <Field label="Feature Name">
            <input required className={inputCls} value={form.name} placeholder="e.g. Batch scoring API"
              onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Flag Key" hint="optional">
              <input className={inputCls} value={form.key} placeholder="auto from name"
                onChange={e => setForm((f: any) => ({ ...f, key: e.target.value }))} />
            </Field>
            <Field label="Stage">
              <select className={inputCls} value={form.stage} onChange={e => setForm((f: any) => ({ ...f, stage: e.target.value }))}>
                {['experimental', 'beta', 'ga'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Owner Team">
            <input className={inputCls} value={form.owner} placeholder="e.g. Risk Analytics"
              onChange={e => setForm((f: any) => ({ ...f, owner: e.target.value }))} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Flag
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
