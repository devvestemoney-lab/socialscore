import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Landmark, Building2, Smartphone, HandCoins, Plus, Search, Loader2 } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const TYPE_LABEL: Record<string, string> = {
  commercial_bank: 'Commercial Bank', microfinance: 'Microfinance', mobile_money: 'Mobile Money',
  utility: 'Utility', fintech: 'Fintech', retailer: 'Retailer',
};
const typeTone: Record<string, string> = {
  commercial_bank: 'blue', microfinance: 'violet', mobile_money: 'cyan', utility: 'amber', fintech: 'green', retailer: 'slate',
};
const statusTone: Record<string, string> = { active: 'green', suspended: 'red', onboarding: 'amber' };

const EMPTY_FORM = { name: '', type: 'commercial_bank', licenseNo: '', branches: 0, contactEmail: '' };

export default function Institutions() {
  const { request } = useAuth();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/admin/institutions`);
    const data = await res.json();
    setInstitutions(data.institutions ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await request(`${API}/admin/institutions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, branches: Number(form.branches) || 0 }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed to register institution'); return; }
    setShowCreate(false); setForm(EMPTY_FORM);
    load();
  }

  async function setStatus(id: string, status: string) {
    await request(`${API}/admin/institutions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setInstitutions(prev => prev.map(i => (i.id === id ? { ...i, status } : i)));
  }

  const filtered = useMemo(
    () => institutions.filter(i => (i.name + i.licenseNo).toLowerCase().includes(q.toLowerCase())),
    [institutions, q]
  );

  const counts = useMemo(() => ({
    banks: institutions.filter(i => i.type === 'commercial_bank').length,
    mfi: institutions.filter(i => ['microfinance', 'fintech'].includes(i.type)).length,
    mno: institutions.filter(i => ['mobile_money', 'utility', 'retailer'].includes(i.type)).length,
    onboarding: institutions.filter(i => i.status === 'onboarding').length,
  }), [institutions]);

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Landmark} tint="#4F6EF7" title="Institutions"
          subtitle="Registry of licensed financial institutions participating in the bureau"
          actions={
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Register Institution
            </button>
          } />

        <KpiGrid items={[
          { label: 'Total Institutions', value: institutions.length, icon: Landmark, tint: '#4F6EF7', sub: counts.onboarding ? `${counts.onboarding} onboarding` : undefined },
          { label: 'Commercial Banks', value: counts.banks, icon: Building2, tint: '#6366F1' },
          { label: 'Microfinance & Fintech', value: counts.mfi, icon: HandCoins, tint: '#8B5CF6' },
          { label: 'MNOs, Utilities & Retail', value: counts.mno, icon: Smartphone, tint: '#14B8A6' },
        ]} />

        <Panel title="Registered Institutions" subtitle="Licensed under Bank of Zambia & sector regulators"
          action={
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or license…"
                className="bg-transparent outline-none text-sm w-48 placeholder:text-gray-400" />
            </div>
          }>
          <Table head={['Institution', 'Type', 'License No.', 'Branches', 'Data Feeds', 'Status', 'Member Since', 'Contact', 'Actions']}>
            {filtered.map(i => (
              <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{i.name}</Td>
                <Td><Badge tone={typeTone[i.type]}>{TYPE_LABEL[i.type] ?? i.type}</Badge></Td>
                <Td className="font-mono text-xs">{i.licenseNo}</Td>
                <Td>{i.branches || '—'}</Td>
                <Td>{i.dataFeeds}</Td>
                <Td><Badge tone={statusTone[i.status]}>{i.status}</Badge></Td>
                <Td className="text-muted-foreground">{new Date(i.memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</Td>
                <Td className="text-muted-foreground">{i.contactEmail}</Td>
                <Td>
                  {i.status === 'active' && (
                    <button onClick={() => setStatus(i.id, 'suspended')} className="text-xs font-medium text-rose-600 hover:underline">Suspend</button>
                  )}
                  {i.status === 'suspended' && (
                    <button onClick={() => setStatus(i.id, 'active')} className="text-xs font-medium text-emerald-600 hover:underline">Reactivate</button>
                  )}
                  {i.status === 'onboarding' && (
                    <button onClick={() => setStatus(i.id, 'active')} className="text-xs font-medium text-blue-600 hover:underline">Approve</button>
                  )}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td className="text-muted-foreground text-center" colSpan={9}>No institutions match your search.</Td></tr>
            )}
          </Table>
        </Panel>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Institution"
        subtitle="Add a licensed institution to the bureau registry">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <Field label="Institution Name">
            <input required className={inputCls} value={form.name} placeholder="e.g. Zambia National Building Society"
              onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className={inputCls} value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Branches">
              <input type="number" min={0} className={inputCls} value={form.branches}
                onChange={e => setForm((f: any) => ({ ...f, branches: e.target.value }))} />
            </Field>
          </div>
          <Field label="License Number">
            <input required className={inputCls} value={form.licenseNo} placeholder="e.g. BoZ/CB/014"
              onChange={e => setForm((f: any) => ({ ...f, licenseNo: e.target.value }))} />
          </Field>
          <Field label="Contact Email">
            <input required type="email" className={inputCls} value={form.contactEmail} placeholder="ops@institution.co.zm"
              onChange={e => setForm((f: any) => ({ ...f, contactEmail: e.target.value }))} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Register
            </button>
          </div>
          <p className="text-[11px] text-gray-400">New institutions start in <b>onboarding</b> status until approved.</p>
        </form>
      </Modal>
    </Layout>
  );
}
