import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  Building, Landmark, ShieldCheck, ShieldAlert, Clock3, Plus, Search, ArrowLeft,
  Users, KeyRound, FileText, FileSearch, ClipboardCheck, Scale, Loader2,
  ChevronRight, ChevronLeft, Trash2, CheckCircle2, XCircle, Globe2,
} from 'lucide-react';
import { BarChart, Bar as RBar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const typeTone: Record<string, string> = { bank: 'blue', mfi: 'violet', mno: 'cyan', fintech: 'green' };
const statusTone: Record<string, string> = { active: 'green', suspended: 'red', inactive: 'slate' };
const kybTone: Record<string, string> = { verified: 'green', pending: 'amber', rejected: 'red' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const DATA_TYPES = ['bank_data', 'mobile_money', 'mfi_loans', 'credit_history', 'personal_info'];
const PURPOSES = ['Loan origination', 'Credit reviews', 'Account opening', 'Collections', 'Portfolio monitoring'];
const PROVINCES = ['Lusaka', 'Copperbelt', 'Eastern', 'Southern', 'Northern', 'Central', 'Western', 'Luapula', 'Muchinga', 'North-Western'];

/* ═══════════════════ Onboarding wizard ═══════════════════ */

const STEPS = ['Institution', 'Contacts', 'Directors', 'Operations', 'Admin & Review'];
const EMPTY_DIRECTOR = { name: '', idNumber: '', role: 'Director', shareholding: 0, pep: false };

function initWizard() {
  return {
    name: '', code: '', type: 'bank', licenseNo: '', regulator: 'Bank of Zambia',
    registrationNo: '', tpin: '', incorporationDate: '', website: '',
    street: '', city: '', province: 'Lusaka', phone: '', contactEmail: '',
    coName: '', coEmail: '', coPhone: '', techName: '', techEmail: '',
    directors: [{ ...EMPTY_DIRECTOR }],
    pepDeclared: false, amlPolicyConfirmed: false,
    expectedMonthlyReports: 1000, dataTypes: ['bank_data', 'credit_history'], purposes: ['Loan origination'],
    scoringModel: 'standard', maxLoanAmount: 100000,
    adminName: '', adminPassword: '',
  };
}

function OnboardWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { request } = useAuth();
  const [step, setStep] = useState(0);
  const [w, setW] = useState<any>(initWizard());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (patch: any) => setW((prev: any) => ({ ...prev, ...patch }));

  // Which wizard step owns each field the API can reject, so a server-side
  // rejection lands the user on the input that caused it.
  const STEP_OF_FIELD: Record<string, number> = {
    name: 0, code: 0, type: 0,
    contactEmail: 1,
    adminName: 4, adminPassword: 4,
  };
  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

  const stepValid = () => {
    if (step === 0) return w.name && /^[A-Za-z0-9_-]{2,12}$/.test(w.code) && w.licenseNo && w.registrationNo && w.tpin;
    if (step === 1) return emailOk(w.contactEmail) && w.phone && w.city && w.coName && emailOk(w.coEmail);
    if (step === 2) return w.directors.every((d: any) => d.name && d.idNumber) && w.pepDeclared && w.amlPolicyConfirmed;
    if (step === 3) return w.dataTypes.length > 0 && w.purposes.length > 0;
    return w.adminName && w.adminPassword.length >= 8;
  };

  async function submit() {
    setSaving(true); setError('');
    const res = await request(`${API}/tenants`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: w.name, code: w.code.toUpperCase(), type: w.type, contactEmail: w.contactEmail,
        adminName: w.adminName, adminPassword: w.adminPassword,
        settings: {
          scoringModel: w.scoringModel, maxLoanAmount: Number(w.maxLoanAmount),
          requireConsent: true, allowedDataTypes: w.dataTypes,
        },
        kyb: {
          registrationNo: w.registrationNo, tpin: w.tpin, licenseNo: w.licenseNo, regulator: w.regulator,
          incorporationDate: w.incorporationDate, website: w.website, phone: w.phone,
          address: { street: w.street, city: w.city, province: w.province },
          complianceOfficer: { name: w.coName, email: w.coEmail, phone: w.coPhone },
          technicalContact: { name: w.techName, email: w.techEmail },
          directors: w.directors.map((d: any) => ({ ...d, shareholding: Number(d.shareholding) })),
          expectedMonthlyReports: Number(w.expectedMonthlyReports),
          dataTypesContributed: w.dataTypes, purposes: w.purposes,
          pepDeclared: w.pepDeclared, amlPolicyConfirmed: w.amlPolicyConfirmed,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.message ?? 'Failed to onboard tenant');
      const back = STEP_OF_FIELD[body.field];
      if (back !== undefined) setStep(back);
      return;
    }
    setDone(true);
  }

  const toggleIn = (key: 'dataTypes' | 'purposes', v: string) =>
    set({ [key]: w[key].includes(v) ? w[key].filter((x: string) => x !== v) : [...w[key], v] });

  return (
    <Modal open onClose={onClose} wide title="Tenant Onboarding"
      subtitle="Enterprise KYC/KYB capture — new tenants start with KYB pending until verified">
      {done ? (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="font-display font-bold text-lg text-gray-900">{w.name} onboarded</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            The tenant admin account ({w.contactEmail}) is live. KYB status is <b>pending</b> —
            open the tenant profile to verify once documents are checked.
          </p>
          <button onClick={onDone} className="mt-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* step indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-gray-400')}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={cn('text-[11px] font-semibold truncate hidden sm:block', i === step ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
                {i < STEPS.length - 1 && <div className={cn('h-px flex-1', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />}
              </div>
            ))}
          </div>

          {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

          {/* Step 0 — Institution */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Registered Institution Name"><input required className={inputCls} value={w.name} placeholder="e.g. Zambia National Building Society" onChange={e => set({ name: e.target.value })} /></Field></div>
              <Field label="Tenant Code"><input className={inputCls} value={w.code} placeholder="e.g. ZNBS" onChange={e => set({ code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Institution Type">
                <select className={inputCls} value={w.type} onChange={e => set({ type: e.target.value })}>
                  <option value="bank">Commercial Bank</option><option value="mfi">Microfinance</option>
                  <option value="mno">Mobile Network Operator</option><option value="fintech">Fintech</option>
                </select>
              </Field>
              <Field label="Operating License No."><input className={inputCls} value={w.licenseNo} placeholder="BoZ/CB/014" onChange={e => set({ licenseNo: e.target.value })} /></Field>
              <Field label="Regulator">
                <select className={inputCls} value={w.regulator} onChange={e => set({ regulator: e.target.value })}>
                  <option>Bank of Zambia</option><option>SEC Zambia</option><option>ZICTA</option><option>PIA</option>
                </select>
              </Field>
              <Field label="PACRA Registration No."><input className={inputCls} value={w.registrationNo} placeholder="120100012345" onChange={e => set({ registrationNo: e.target.value })} /></Field>
              <Field label="TPIN (ZRA)"><input className={inputCls} value={w.tpin} placeholder="1001234567" onChange={e => set({ tpin: e.target.value })} /></Field>
              <Field label="Date of Incorporation"><input type="date" className={inputCls} value={w.incorporationDate} onChange={e => set({ incorporationDate: e.target.value })} /></Field>
              <Field label="Website" hint="optional"><input className={inputCls} value={w.website} placeholder="https://…" onChange={e => set({ website: e.target.value })} /></Field>
            </div>
          )}

          {/* Step 1 — Contacts & address */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Physical Address"><input className={inputCls} value={w.street} placeholder="Plot / street" onChange={e => set({ street: e.target.value })} /></Field></div>
              <Field label="City"><input className={inputCls} value={w.city} onChange={e => set({ city: e.target.value })} /></Field>
              <Field label="Province">
                <select className={inputCls} value={w.province} onChange={e => set({ province: e.target.value })}>
                  {PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Main Contact Email"><input type="email" className={inputCls} value={w.contactEmail} placeholder="ops@institution.co.zm" onChange={e => set({ contactEmail: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputCls} value={w.phone} placeholder="+260 211 …" onChange={e => set({ phone: e.target.value })} /></Field>
              <div className="col-span-2 pt-1 border-t border-slate-100"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Compliance Officer</p></div>
              <Field label="Full Name"><input className={inputCls} value={w.coName} onChange={e => set({ coName: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className={inputCls} value={w.coEmail} onChange={e => set({ coEmail: e.target.value })} /></Field>
              <Field label="Phone" hint="optional"><input className={inputCls} value={w.coPhone} onChange={e => set({ coPhone: e.target.value })} /></Field>
              <div className="col-span-2 pt-1 border-t border-slate-100"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Technical Contact (API integration)</p></div>
              <Field label="Full Name" hint="optional"><input className={inputCls} value={w.techName} onChange={e => set({ techName: e.target.value })} /></Field>
              <Field label="Email" hint="optional"><input type="email" className={inputCls} value={w.techEmail} onChange={e => set({ techEmail: e.target.value })} /></Field>
            </div>
          )}

          {/* Step 2 — Directors & declarations */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Directors & Beneficial Owners (≥ 25%)</p>
              {w.directors.map((d: any, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4"><Field label={i === 0 ? 'Full Name' : ''}><input className={inputCls} value={d.name} placeholder="Full name"
                    onChange={e => set({ directors: w.directors.map((x: any, j: number) => j === i ? { ...x, name: e.target.value } : x) })} /></Field></div>
                  <div className="col-span-3"><Field label={i === 0 ? 'NRC / Passport' : ''}><input className={inputCls} value={d.idNumber} placeholder="123456/78/1"
                    onChange={e => set({ directors: w.directors.map((x: any, j: number) => j === i ? { ...x, idNumber: e.target.value } : x) })} /></Field></div>
                  <div className="col-span-2"><Field label={i === 0 ? 'Role' : ''}>
                    <select className={inputCls} value={d.role} onChange={e => set({ directors: w.directors.map((x: any, j: number) => j === i ? { ...x, role: e.target.value } : x) })}>
                      <option>Director</option><option>Chairperson</option><option>CEO</option><option>CFO</option><option>Shareholder</option>
                    </select></Field></div>
                  <div className="col-span-1"><Field label={i === 0 ? '%' : ''}><input type="number" min={0} max={100} className={inputCls} value={d.shareholding}
                    onChange={e => set({ directors: w.directors.map((x: any, j: number) => j === i ? { ...x, shareholding: e.target.value } : x) })} /></Field></div>
                  <label className="col-span-1 flex items-center gap-1 pb-3 text-xs text-gray-600">
                    <input type="checkbox" checked={d.pep} onChange={e => set({ directors: w.directors.map((x: any, j: number) => j === i ? { ...x, pep: e.target.checked } : x) })} /> PEP
                  </label>
                  <button type="button" onClick={() => set({ directors: w.directors.filter((_: any, j: number) => j !== i) })}
                    disabled={w.directors.length === 1}
                    className="col-span-1 pb-3 text-gray-300 hover:text-rose-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => set({ directors: [...w.directors, { ...EMPTY_DIRECTOR }] })}
                className="text-xs font-semibold text-blue-600 hover:underline">+ Add director / owner</button>
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="mt-0.5" checked={w.pepDeclared} onChange={e => set({ pepDeclared: e.target.checked })} />
                  I confirm PEP status has been screened and declared for all listed persons.
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="mt-0.5" checked={w.amlPolicyConfirmed} onChange={e => set({ amlPolicyConfirmed: e.target.checked })} />
                  The institution maintains a current AML/CFT policy and agrees to the bureau code of conduct.
                </label>
              </div>
            </div>
          )}

          {/* Step 3 — Operations */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Expected Monthly Report Volume"><input type="number" min={0} className={inputCls} value={w.expectedMonthlyReports} onChange={e => set({ expectedMonthlyReports: e.target.value })} /></Field>
                <Field label="Scoring Model">
                  <select className={inputCls} value={w.scoringModel} onChange={e => set({ scoringModel: e.target.value })}>
                    <option value="standard">Standard</option><option value="conservative">Conservative</option><option value="aggressive">Aggressive</option>
                  </select>
                </Field>
                <Field label="Max Loan Amount (ZMW)"><input type="number" min={0} className={inputCls} value={w.maxLoanAmount} onChange={e => set({ maxLoanAmount: e.target.value })} /></Field>
              </div>
              <Field label="Data Types Contributed">
                <div className="flex flex-wrap gap-2">
                  {DATA_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => toggleIn('dataTypes', t)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition',
                        w.dataTypes.includes(t) ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200')}>
                      {t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Permitted Purposes">
                <div className="flex flex-wrap gap-2">
                  {PURPOSES.map(t => (
                    <button key={t} type="button" onClick={() => toggleIn('purposes', t)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition',
                        w.purposes.includes(t) ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200')}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 4 — Admin & review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tenant Admin Name"><input className={inputCls} value={w.adminName} onChange={e => set({ adminName: e.target.value })} /></Field>
                <Field label="Temporary Password" hint="min 8 chars"><input type="text" className={inputCls} value={w.adminPassword} onChange={e => set({ adminPassword: e.target.value })} /></Field>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1.5">
                <p className="font-semibold text-gray-900">{w.name} <span className="text-muted-foreground font-normal">({w.code || '—'} · {w.type})</span></p>
                <p className="text-muted-foreground">License {w.licenseNo} · PACRA {w.registrationNo} · TPIN {w.tpin}</p>
                <p className="text-muted-foreground">{w.street ? `${w.street}, ` : ''}{w.city}, {w.province} · {w.contactEmail}</p>
                <p className="text-muted-foreground">{w.directors.length} director(s) · {w.dataTypes.length} data type(s) · ~{Number(w.expectedMonthlyReports).toLocaleString()} reports/month</p>
                <p className="text-xs text-amber-600 pt-1">Submitting creates the tenant with KYB status <b>pending</b> and provisions the admin account.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button type="button" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" disabled={!stepValid()} onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" disabled={!stepValid() || saving} onClick={submit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Submit Onboarding
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════ Tenant detail (enterprise view) ═══════════════════ */

function KV({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

function TenantDetail({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('overview');

  async function load() {
    const res = await request(`${API}/tenants/${id}/overview`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, [id]);

  async function setStatus(status: string) {
    await request(`${API}/tenants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load(); onChanged();
  }
  async function setKyb(kybStatus: string) {
    await request(`${API}/tenants/${id}/kyb`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kybStatus }) });
    load(); onChanged();
  }

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { tenant, stats, users, keys, monthly, recentReports, institution } = data;
  const kyb = tenant.kyb ?? {};
  const TABS = [['overview', 'Overview'], ['kyb', 'KYC / KYB'], ['users', `Users (${users.length})`], ['keys', `API Keys (${keys.length})`]] as const;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-gray-600"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-gray-900">{tenant.name}</h1>
              <Badge tone={typeTone[tenant.type]}>{tenant.type.toUpperCase()}</Badge>
              <Badge tone={statusTone[tenant.status]}>{tenant.status}</Badge>
              <Badge tone={kybTone[tenant.kybStatus]}>KYB {tenant.kybStatus}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {tenant.code} · {tenant.contactEmail} · onboarded {fmt(tenant.createdAt)}
              {kyb.website && <> · <a href={kyb.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1"><Globe2 className="w-3 h-3" />{kyb.website.replace(/^https?:\/\//, '')}</a></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tenant.kybStatus !== 'verified' && (
            <button onClick={() => setKyb('verified')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Verify KYB
            </button>
          )}
          {tenant.kybStatus === 'pending' && (
            <button onClick={() => setKyb('rejected')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium">
              <XCircle className="w-4 h-4" /> Reject
            </button>
          )}
          {tenant.status === 'active'
            ? <button onClick={() => setStatus('suspended')} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">Suspend</button>
            : <button onClick={() => setStatus('active')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Activate</button>}
        </div>
      </div>

      {/* stat row */}
      <KpiGrid items={[
        { label: 'Reports (30d)', value: stats.reports30d.toLocaleString(), icon: FileText, tint: '#10B981', sub: `${stats.reportsTotal.toLocaleString()} all time` },
        { label: 'Inquiries (30d)', value: stats.inquiries30d.toLocaleString(), icon: FileSearch, tint: '#4F6EF7' },
        { label: 'Active Consents', value: stats.activeConsents.toLocaleString(), icon: ClipboardCheck, tint: '#14B8A6' },
        { label: 'Open Disputes', value: stats.openDisputes, icon: Scale, tint: stats.openDisputes > 0 ? '#EF4444' : '#94A3B8' },
        { label: 'Users · Keys', value: `${stats.users} · ${stats.activeKeys}`, icon: Users, tint: '#8B5CF6', sub: 'seats · active credentials' },
      ]} />

      {/* tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
              tab === key ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Report Volume — last 6 months" padded>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip formatter={(v: any) => [v, 'reports']} />
                    <RBar dataKey="reports" fill="#4F6EF7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Linked Institution Record" padded>
              {institution ? (
                <div className="grid grid-cols-2 gap-4">
                  <KV label="Institution" value={institution.name} />
                  <KV label="License" value={institution.licenseNo} />
                  <KV label="Branches" value={institution.branches} />
                  <KV label="Data Feeds" value={institution.dataFeeds} />
                  <KV label="Registry Status" value={<Badge tone={institution.status === 'active' ? 'green' : 'amber'}>{institution.status}</Badge>} />
                  <KV label="Member Since" value={fmt(institution.memberSince)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">No institution registry record linked to this tenant yet — link one from the Institutions module.</p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <KV label="Scoring Model" value={tenant.settings?.scoringModel} />
                <KV label="Max Loan Amount" value={`K${Number(tenant.settings?.maxLoanAmount ?? 0).toLocaleString()}`} />
                <KV label="Avg Report Generation" value={`${(stats.avgGenerationMs / 1000).toFixed(1)}s`} />
                <KV label="Legacy API Calls (MTD)" value={tenant.apiCallsThisMonth?.toLocaleString?.()} />
              </div>
            </Panel>
          </div>

          <Panel title="Recent Credit Reports">
            <Table head={['Reference', 'Purpose', 'Score', 'Status', 'Generated']}>
              {recentReports.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs text-blue-600">{r.reference}</Td>
                  <Td className="text-muted-foreground max-w-[260px] truncate">{r.purpose}</Td>
                  <Td>{r.band ? <Badge tone={r.band === 'A' ? 'green' : r.band === 'B' ? 'blue' : r.band === 'C' ? 'amber' : 'red'}>{r.band} ({r.score})</Badge> : '—'}</Td>
                  <Td><Badge tone={r.status === 'delivered' ? 'green' : r.status === 'partial' ? 'amber' : 'red'}>{r.status}</Badge></Td>
                  <Td className="text-muted-foreground">{fmt(r.createdAt)}</Td>
                </tr>
              ))}
              {recentReports.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground">No reports pulled yet.</Td></tr>}
            </Table>
          </Panel>
        </div>
      )}

      {tab === 'kyb' && (
        <div className="space-y-6">
          <Panel title="Corporate Identity (KYB)" padded>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <KV label="PACRA Registration" value={kyb.registrationNo} />
              <KV label="TPIN (ZRA)" value={kyb.tpin} />
              <KV label="Operating License" value={kyb.licenseNo} />
              <KV label="Regulator" value={kyb.regulator} />
              <KV label="Incorporated" value={kyb.incorporationDate} />
              <KV label="Phone" value={kyb.phone} />
              <KV label="Address" value={kyb.address ? [kyb.address.street, kyb.address.city, kyb.address.province].filter(Boolean).join(', ') : undefined} />
              <KV label="Compliance Officer" value={kyb.complianceOfficer?.name && `${kyb.complianceOfficer.name} · ${kyb.complianceOfficer.email ?? ''}`} />
              <KV label="Technical Contact" value={kyb.technicalContact?.name && `${kyb.technicalContact.name} · ${kyb.technicalContact.email ?? ''}`} />
              <KV label="Expected Volume" value={kyb.expectedMonthlyReports && `${Number(kyb.expectedMonthlyReports).toLocaleString()} reports / month`} />
              <KV label="Data Contributed" value={kyb.dataTypesContributed?.map((t: string) => t.replace('_', ' ')).join(', ')} />
              <KV label="Permitted Purposes" value={kyb.purposes?.join(', ')} />
            </div>
            <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 text-sm">
              <span className={cn('inline-flex items-center gap-1.5 font-medium', kyb.pepDeclared ? 'text-emerald-600' : 'text-rose-500')}>
                {kyb.pepDeclared ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />} PEP screening declared
              </span>
              <span className={cn('inline-flex items-center gap-1.5 font-medium', kyb.amlPolicyConfirmed ? 'text-emerald-600' : 'text-rose-500')}>
                {kyb.amlPolicyConfirmed ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />} AML/CFT policy confirmed
              </span>
            </div>
          </Panel>

          <Panel title={`Directors & Beneficial Owners (${kyb.directors?.length ?? 0})`}>
            <Table head={['Name', 'NRC / Passport', 'Role', 'Shareholding', 'PEP']}>
              {(kyb.directors ?? []).map((d: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{d.name}</Td>
                  <Td className="font-mono text-xs">{d.idNumber}</Td>
                  <Td className="text-muted-foreground">{d.role}</Td>
                  <Td>{d.shareholding ? `${d.shareholding}%` : '—'}</Td>
                  <Td>{d.pep ? <Badge tone="red">PEP</Badge> : <Badge tone="green">clear</Badge>}</Td>
                </tr>
              ))}
              {!(kyb.directors?.length) && <tr><Td colSpan={5} className="text-center text-muted-foreground">No directors captured.</Td></tr>}
            </Table>
          </Panel>
        </div>
      )}

      {tab === 'users' && (
        <Panel title="Tenant Users">
          <Table head={['User', 'Role', 'MFA', 'Last Login', 'Status']}>
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <Td><p className="font-semibold text-gray-900">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></Td>
                <Td><Badge tone={u.role === 'tenant_admin' ? 'blue' : 'slate'}>{u.role.replace('_', ' ')}</Badge></Td>
                <Td>{u.mfaEnabled ? <Badge tone="green">enabled</Badge> : <Badge tone="amber">off</Badge>}</Td>
                <Td className="text-muted-foreground">{u.lastLoginAt ? fmt(u.lastLoginAt) : 'Never'}</Td>
                <Td><Badge tone={u.status === 'active' ? 'green' : u.status === 'invited' ? 'amber' : 'red'}>{u.status}</Badge></Td>
              </tr>
            ))}
            {users.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground">No users yet.</Td></tr>}
          </Table>
        </Panel>
      )}

      {tab === 'keys' && (
        <Panel title="API Credentials" subtitle="Issue and manage keys from the API Management module">
          <Table head={['Key', 'Environment', 'Rate Limit', 'Last Used', 'Expires', 'Status']}>
            {keys.map((k: any) => (
              <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs">{k.displayPrefix}</Td>
                <Td><Badge tone={k.env === 'production' ? 'blue' : 'slate'}>{k.env}</Badge></Td>
                <Td className="text-muted-foreground">{k.rateLimitRpm} rpm</Td>
                <Td className="text-muted-foreground">{fmt(k.lastUsedAt)}</Td>
                <Td className="text-muted-foreground">{fmt(k.expiresAt)}</Td>
                <Td><Badge tone={k.status === 'active' ? 'green' : k.status === 'suspended' ? 'red' : 'slate'}>{k.status}</Badge></Td>
              </tr>
            ))}
            {keys.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground">No API keys issued yet.</Td></tr>}
          </Table>
        </Panel>
      )}
    </div>
  );
}

/* ═══════════════════ Main page ═══════════════════ */

export default function TenantsList() {
  const { request } = useAuth();
  const [tenants, setTenants] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  async function load() {
    const res = await request(`${API}/tenants`);
    setTenants((await res.json()).tenants ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (tenants ?? []).filter(t => (t.name + t.code + t.contactEmail).toLowerCase().includes(q.toLowerCase())),
    [tenants, q]
  );

  if (!tenants) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      {selectedId ? (
        <TenantDetail id={selectedId} onBack={() => setSelectedId(null)} onChanged={load} />
      ) : (
        <div className="space-y-6">
          <PageHeader icon={Building} tint="#4F6EF7" title="Tenants"
            subtitle="Institutions licensed to access the Social Score platform"
            actions={
              <button onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Onboard Tenant
              </button>
            } />

          <KpiGrid items={[
            { label: 'Total Tenants', value: tenants.length, icon: Building, tint: '#4F6EF7' },
            { label: 'Active', value: tenants.filter(t => t.status === 'active').length, icon: ShieldCheck, tint: '#10B981' },
            { label: 'KYB Pending', value: tenants.filter(t => t.kybStatus === 'pending').length, icon: Clock3, tint: '#F59E0B', sub: 'awaiting verification' },
            { label: 'Suspended', value: tenants.filter(t => t.status === 'suspended').length, icon: ShieldAlert, tint: '#EF4444' },
          ]} />

          <Panel title="Tenant Directory" subtitle="Click a tenant to open the enterprise view"
            action={
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                <Search className="w-4 h-4 text-gray-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tenants…"
                  className="bg-transparent outline-none text-sm w-48 placeholder:text-gray-400" />
              </div>
            }>
            <Table head={['Name / Code', 'Type', 'Status', 'KYB', 'License', 'Contact', 'Onboarded', '']}>
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setSelectedId(t.id)} className="hover:bg-slate-50/70 transition-colors cursor-pointer">
                  <Td>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs font-mono text-blue-500">{t.code}</p>
                  </Td>
                  <Td><Badge tone={typeTone[t.type]}>{t.type.toUpperCase()}</Badge></Td>
                  <Td><Badge tone={statusTone[t.status]}>{t.status}</Badge></Td>
                  <Td><Badge tone={kybTone[t.kybStatus]}>{t.kybStatus}</Badge></Td>
                  <Td className="font-mono text-xs">{t.kyb?.licenseNo ?? '—'}</Td>
                  <Td className="text-muted-foreground">{t.contactEmail}</Td>
                  <Td className="text-muted-foreground">{fmt(t.createdAt)}</Td>
                  <Td><ChevronRight className="w-4 h-4 text-gray-300" /></Td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground">No tenants match your search.</Td></tr>}
            </Table>
          </Panel>
        </div>
      )}

      {showWizard && (
        <OnboardWizard onClose={() => setShowWizard(false)} onDone={() => { setShowWizard(false); load(); }} />
      )}
    </Layout>
  );
}
