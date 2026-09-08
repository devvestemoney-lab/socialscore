import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { UserCircle, Save, Loader2, CheckCircle2, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { API, fmtDate } from './kit';

const PROVINCES = ['Lusaka', 'Copperbelt', 'Central', 'Eastern', 'Luapula', 'Muchinga', 'Northern', 'North-Western', 'Southern', 'Western'];

function KV({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

export default function MyAccount() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ phone: '', email: '', province: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/consumer/overview`);
    if (!res.ok) return setData({ customer: null });
    const body = await res.json();
    setData(body);
    setForm({ phone: body.customer.phone ?? '', email: body.customer.email ?? '', province: body.customer.province ?? '' });
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSaved(false);
    const res = await request(`${API}/consumer/profile`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).message ?? 'Could not save your details'); return; }
    setSaved(true); load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const c = data.customer;
  const verified = c?.identityVerified;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UserCircle} tint="#4F6EF7" title="My Profile"
          subtitle="The details the bureau holds about you"
          actions={
            <Badge tone={verified ? 'green' : 'amber'}>
              {verified ? 'Identity verified' : 'Verification pending'}
            </Badge>
          } />

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Details we can't change here" subtitle="These come from your NRC record" padded className="lg:col-span-1">
            <div className="space-y-4">
              <KV label="Full name" value={<span className="font-semibold">{c?.firstName} {c?.lastName}</span>} />
              <KV label="NRC number" value={<span className="font-mono">{c?.nrc}</span>} />
              <KV label="Date of birth" value={fmtDate(c?.dateOfBirth)} />
              <KV label="Gender" value={c?.gender} />
              <KV label="On file since" value={fmtDate(c?.createdAt)} />
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              To correct your name, NRC or date of birth, raise a dispute — we verify these against your ID document before changing them.
            </div>
          </Panel>

          <Panel title="Contact details" subtitle="Keep these current so we can reach you about your file" padded className="lg:col-span-2">
            <form onSubmit={save} className="space-y-4 max-w-lg">
              {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
              {saved && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Your details have been updated.
                </div>
              )}
              <Field label="Mobile number" hint="this is where your sign-in passcode is sent">
                <input required className={inputCls} value={form.phone} placeholder="+260 97 123 4567"
                  onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setSaved(false); }} />
              </Field>
              <Field label="Email address" hint="optional — used for report copies and alerts">
                <input type="email" className={inputCls} value={form.email} placeholder="you@example.com"
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setSaved(false); }} />
              </Field>
              <Field label="Province">
                <select className={inputCls} value={form.province} onChange={e => { setForm(f => ({ ...f, province: e.target.value })); setSaved(false); }}>
                  <option value="">Choose a province…</option>
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <button type="submit" disabled={busy}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
              </button>
            </form>
          </Panel>
        </div>

        <Panel title="Identity verification" padded>
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: verified ? '#10B9811A' : '#F59E0B1A' }}>
              {verified ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> : <ShieldAlert className="w-6 h-6 text-amber-500" />}
            </span>
            <div className="text-sm">
              <p className="font-semibold text-gray-900">{verified ? 'Your identity has been verified' : 'Your identity has not yet been verified'}</p>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {verified
                  ? 'Your NRC has been matched against the national register, so lenders can rely on the record they see. Nothing further is needed from you.'
                  : 'Until your NRC is matched against the national register, some lenders may ask for extra documents. Visit any bureau office with your original NRC, or ask your bank to submit a verification on your behalf.'}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
