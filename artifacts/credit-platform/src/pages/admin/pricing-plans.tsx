import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls, Toggle } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Tags, Check, Plus, Users2, Wallet, Layers, Loader2, Pencil, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number | string) => `K${Number(v).toLocaleString()}`;
const planTone: Record<string, string> = { Enterprise: 'violet', Growth: 'blue', Starter: 'slate' };
const EMPTY = { code: '', name: '', tier: 1, monthlyPrice: '', includedReports: '', includedApiCalls: '', includedSeats: '', overageRatePerReport: '35', features: '' };

export default function PricingPlans() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [assign, setAssign] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [pRes, tRes] = await Promise.all([request(`${API}/admin/pricing-plans`), request(`${API}/admin/usage`)]);
    setData(await pRes.json());
    setTenants((await tRes.json()).usage ?? []);
  }
  useEffect(() => { load(); }, []);

  function openEdit(plan: any | null) {
    setError('');
    setEditing(plan ?? { isNew: true });
    setForm(plan ? {
      code: plan.code, name: plan.name, tier: plan.tier, monthlyPrice: plan.monthlyPrice,
      includedReports: plan.includedReports, includedApiCalls: plan.includedApiCalls,
      includedSeats: plan.includedSeats, overageRatePerReport: plan.overageRatePerReport,
      features: (plan.features ?? []).join('\n'),
    } : EMPTY);
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const payload = {
      code: form.code.toUpperCase(), name: form.name, tier: Number(form.tier),
      monthlyPrice: String(form.monthlyPrice), includedReports: Number(form.includedReports) || 0,
      includedApiCalls: Number(form.includedApiCalls) || 0, includedSeats: Number(form.includedSeats) || 0,
      overageRatePerReport: String(form.overageRatePerReport),
      features: form.features.split('\n').map((f: string) => f.trim()).filter(Boolean),
    };
    const res = editing.isNew
      ? await request(`${API}/admin/pricing-plans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await request(`${API}/admin/pricing-plans/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Save failed'); return; }
    setEditing(null); load();
  }

  async function saveAssignment(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await request(`${API}/admin/subscriptions/${assign.tenantId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: assign.planId, addons: assign.addons, discountPct: Number(assign.discountPct) || 0 }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Failed'); return; }
    setAssign(null); load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { plans, addons } = data;
  const mrr = tenants.reduce((a: number, t: any) => a + t.subscriptionAmount, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Tags} tint="#8B5CF6" title="Pricing Plans"
          subtitle="Subscription tiers, add-ons and tenant plan assignments"
          actions={
            <button onClick={() => openEdit(null)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          } />

        <KpiGrid items={[
          { label: 'Active Plans', value: plans.filter((p: any) => p.active).length, icon: Tags, tint: '#8B5CF6' },
          { label: 'Subscribed Tenants', value: plans.reduce((a: number, p: any) => a + p.subscribers, 0), icon: Users2, tint: '#4F6EF7' },
          { label: 'Subscription MRR', value: money(mrr), icon: Wallet, tint: '#10B981', sub: 'before overage & add-ons' },
          { label: 'Add-ons Offered', value: addons.length, icon: Layers, tint: '#F59E0B' },
        ]} />

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p: any) => (
            <div key={p.id} className={cn('relative p-6 rounded-2xl bg-white border flex flex-col', p.tier === 2 ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-slate-200')}>
              {p.tier === 2 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold">Most Popular</span>}
              <div className="flex items-start justify-between">
                <Badge tone={planTone[p.name] ?? 'slate'}>{p.name}</Badge>
                <button onClick={() => openEdit(p)} className="text-gray-300 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
              </div>
              <p className="mt-3">
                <span className="text-3xl font-display font-bold text-gray-900">{money(p.monthlyPrice)}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {p.includedReports.toLocaleString()} reports · overage {money(p.overageRatePerReport)}/report
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {(p.features ?? []).map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-muted-foreground">
                {p.subscribers} tenant{p.subscribers !== 1 ? 's' : ''} subscribed
              </p>
            </div>
          ))}
        </div>

        <Panel title="Tenant Assignments" subtitle="Which plan each tenant is on, with contract discounts and add-ons">
          <Table head={['Tenant', 'Plan', 'Status', 'Add-ons', 'Discount', 'Monthly', '']}>
            {tenants.map((t: any) => (
              <tr key={t.tenantId} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{t.tenantName}</Td>
                <Td><Badge tone={planTone[t.planName] ?? 'slate'}>{t.planName}</Badge></Td>
                <Td><Badge tone={t.subscriptionStatus === 'active' ? 'green' : t.subscriptionStatus === 'past_due' ? 'red' : 'amber'}>{t.subscriptionStatus.replace('_', ' ')}</Badge></Td>
                <Td className="text-muted-foreground">{t.addons.length ? t.addons.join(', ') : '—'}</Td>
                <Td className="text-muted-foreground">{t.discountAmount > 0 ? money(t.discountAmount) : '—'}</Td>
                <Td className="font-bold text-gray-900">{money(t.total)}</Td>
                <Td>
                  <button onClick={() => { setAssign({ tenantId: t.tenantId, tenantName: t.tenantName, planId: t.planId, addons: t.addons, discountPct: 0 }); setError(''); }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                    <ArrowRightLeft className="w-3 h-3" /> Change plan
                  </button>
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Add-ons & Overage Pricing">
          <Table head={['Add-on', 'Description', 'Price', 'Billing', 'Status']}>
            {addons.map((a: any) => (
              <tr key={a.code} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{a.name}</Td>
                <Td className="text-muted-foreground">{a.description}</Td>
                <Td>{money(a.price)}</Td>
                <Td><Badge tone="blue">{a.unit === 'per_report' ? 'per report' : 'per month'}</Badge></Td>
                <Td><Badge tone={a.active ? 'green' : 'slate'}>{a.active ? 'active' : 'retired'}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>

      {/* plan editor */}
      <Modal open={!!editing} onClose={() => setEditing(null)} wide
        title={editing?.isNew ? 'New Pricing Plan' : `Edit ${editing?.name ?? ''}`}
        subtitle="Quotas and overage rates drive live metering and invoicing">
        <form onSubmit={savePlan} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plan Name"><input required className={inputCls} value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Code" hint="unique"><input required className={inputCls + ' font-mono'} value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} /></Field>
            <Field label="Monthly Price (ZMW)"><input required type="number" min={0} className={inputCls} value={form.monthlyPrice} onChange={e => setForm((f: any) => ({ ...f, monthlyPrice: e.target.value }))} /></Field>
            <Field label="Tier" hint="ordering"><input type="number" min={1} className={inputCls} value={form.tier} onChange={e => setForm((f: any) => ({ ...f, tier: e.target.value }))} /></Field>
            <Field label="Included Reports / month"><input type="number" min={0} className={inputCls} value={form.includedReports} onChange={e => setForm((f: any) => ({ ...f, includedReports: e.target.value }))} /></Field>
            <Field label="Included API Calls"><input type="number" min={0} className={inputCls} value={form.includedApiCalls} onChange={e => setForm((f: any) => ({ ...f, includedApiCalls: e.target.value }))} /></Field>
            <Field label="Included Seats" hint="0 = unlimited"><input type="number" min={0} className={inputCls} value={form.includedSeats} onChange={e => setForm((f: any) => ({ ...f, includedSeats: e.target.value }))} /></Field>
            <Field label="Overage per Report (ZMW)"><input type="number" min={0} step="0.01" className={inputCls} value={form.overageRatePerReport} onChange={e => setForm((f: any) => ({ ...f, overageRatePerReport: e.target.value }))} /></Field>
          </div>
          <Field label="Features" hint="one per line">
            <textarea rows={5} className={inputCls} value={form.features} onChange={e => setForm((f: any) => ({ ...f, features: e.target.value }))} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing?.isNew ? 'Create Plan' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* assignment */}
      <Modal open={!!assign} onClose={() => setAssign(null)} title="Change Plan" subtitle={assign?.tenantName}>
        {assign && (
          <form onSubmit={saveAssignment} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <Field label="Plan">
              <select className={inputCls} value={assign.planId ?? ''} onChange={e => setAssign((a: any) => ({ ...a, planId: e.target.value }))}>
                <option value="">Select plan…</option>
                {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {money(p.monthlyPrice)}/mo</option>)}
              </select>
            </Field>
            <Field label="Add-ons">
              <div className="flex flex-wrap gap-2">
                {addons.map((a: any) => (
                  <button key={a.code} type="button"
                    onClick={() => setAssign((s: any) => ({ ...s, addons: s.addons.includes(a.code) ? s.addons.filter((c: string) => c !== a.code) : [...s.addons, a.code] }))}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition',
                      assign.addons.includes(a.code) ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200')}>
                    {a.name}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Contract Discount (%)">
              <input type="number" min={0} max={100} className={inputCls} value={assign.discountPct} onChange={e => setAssign((a: any) => ({ ...a, discountPct: e.target.value }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAssign(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving || !assign.planId} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Apply
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
