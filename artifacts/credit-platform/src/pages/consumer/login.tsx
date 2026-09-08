import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Logo, NAVY, GREEN } from '@/components/brand';
import {
  Fingerprint, ArrowLeft, ArrowRight, Loader2, ShieldCheck, Smartphone,
  Eye, FileText, Bell, Info, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const BENEFITS = [
  { icon: FileText, t: 'See your full credit report', d: 'Every account, balance and payment lenders report about you' },
  { icon: Eye, t: 'Know who checked your file', d: 'A complete record of every search made against your name' },
  { icon: Bell, t: 'Get alerted to changes', d: 'New accounts, missed payments and score movements' },
  { icon: ShieldCheck, t: 'Control who sees your data', d: 'Grant and withdraw consent, and dispute anything wrong' },
];

const PROVINCES = ['Lusaka', 'Copperbelt', 'Central', 'Eastern', 'Luapula',
  'Muchinga', 'Northern', 'North-Western', 'Southern', 'Western'];

const fieldCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-gray-900 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-green-600/25 focus:border-green-600';

const EMPTY_REG = {
  firstName: '', lastName: '', phone: '', dateOfBirth: '',
  province: '', email: '', consent: false,
};

export default function ConsumerLogin() {
  const [step, setStep] = useState<'nrc' | 'register' | 'otp'>('nrc');
  const [reg, setReg] = useState(EMPTY_REG);
  const [canRegister, setCanRegister] = useState(false);
  const [nrc, setNrc] = useState('');
  const [code, setCode] = useState('');
  const [hint, setHint] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const nrcValid = /^\d{6}\/\d{2}\/\d$/.test(nrc.trim());

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError('');
    const res = await fetch(`${API}/auth/consumer/request-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nrc: nrc.trim() }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.message ?? 'Could not send a passcode');
      setCanRegister(Boolean(body.canRegister));
      return;
    }
    setCanRegister(false);
    setHint(body); setStep('otp'); setSeconds(60); setCode('');
    setTimeout(() => otpRef.current?.focus(), 60);
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError('');
    const res = await fetch(`${API}/auth/consumer/verify-otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nrc: nrc.trim(), code: code.trim() }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setError(body.message ?? 'Could not verify that passcode'); return; }
    localStorage.setItem('credit_platform_token', body.token);
    localStorage.setItem('credit_platform_user', JSON.stringify(body.user));
    window.location.href = `${BASE}/my`;
  }

  const regValid =
    reg.firstName.trim().length >= 2 && reg.lastName.trim().length >= 2 &&
    /^\+?\d[\d\s-]{7,}$/.test(reg.phone.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(reg.dateOfBirth) &&
    reg.province !== '' && reg.consent && nrcValid;

  async function register(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setError('');
    const res = await fetch(`${API}/auth/consumer/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...reg, nrc: nrc.trim() }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.message ?? 'Could not open your credit file');
      if (body.field === 'nrc' && res.status === 409) { setStep('nrc'); setCanRegister(false); }
      return;
    }
    setHint(body); setStep('otp'); setSeconds(60); setCode('');
    setTimeout(() => otpRef.current?.focus(), 60);
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F6FA' }}>
      <div className="hidden lg:flex w-[45%] flex-col relative overflow-hidden text-white"
        style={{ background: `linear-gradient(165deg, ${NAVY} 0%, #123472 55%, #0F4C3A 100%)` }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-15 blur-3xl" style={{ background: GREEN }} />
        <div className="relative z-10 flex flex-col h-full p-12">
          <Link href="/"><Logo light /></Link>
          <div className="mt-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#4ADE80' }}>Consumer Portal</p>
            <h1 className="mt-3 font-display font-extrabold text-3xl xl:text-4xl leading-tight">Your credit file belongs to you</h1>
            <p className="mt-4 text-sm leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Under Zambian credit reporting law you have the right to see what is held about you,
              know who has looked at it, and challenge anything that is wrong — free of charge twice a year.
            </p>
            <div className="mt-9 space-y-5">
              {BENEFITS.map(b => (
                <div key={b.t} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
                    <b.icon className="w-5 h-5" style={{ color: '#4ADE80' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{b.t}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-12 pt-6 text-[12px]" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
            Licensed by the Bank of Zambia · Data Protection Act (2021) compliant
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 md:px-10 h-[72px]">
          <span className="lg:hidden"><Link href="/"><Logo /></Link></span>
          <span className="hidden lg:block" />
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-10">
          <div className="w-full max-w-[440px]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/[0.06] p-8 md:p-9">
              {step === 'nrc' ? (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(22,163,74,0.09)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <Fingerprint className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <h2 className="font-display font-extrabold text-2xl" style={{ color: NAVY }}>Check your credit</h2>
                  <p className="text-sm text-gray-500 mt-1.5 mb-7">Enter your NRC and we'll text you a passcode.</p>
                  {error && <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
                  <form onSubmit={requestOtp} className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">National Registration Card</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input autoFocus value={nrc} onChange={e => setNrc(e.target.value)} placeholder="123456/78/1"
                          className={cn('w-full pl-11 pr-4 py-3 rounded-xl border bg-slate-50/60 text-gray-900 text-sm font-mono placeholder:text-gray-400 outline-none transition',
                            nrc && !nrcValid ? 'border-amber-400 focus:border-amber-500' : 'border-slate-200 focus:bg-white focus:ring-2 focus:ring-green-600/25 focus:border-green-600')} />
                      </div>
                      {nrc && !nrcValid && <p className="text-[11px] text-amber-600 mt-1">Format is 6 digits / 2-digit district / check digit</p>}
                    </div>
                    <button type="submit" disabled={!nrcValid || busy}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-40 shadow-lg shadow-green-600/25"
                      style={{ background: GREEN }}>
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send passcode <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-slate-100">
                    {canRegister ? (
                      <button onClick={() => { setStep('register'); setError(''); }}
                        className="w-full py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition hover:bg-green-50"
                        style={{ borderColor: GREEN, color: GREEN }}>
                        <UserPlus className="w-4 h-4" /> Open my credit file
                      </button>
                    ) : (
                      <p className="text-center text-[13px] text-gray-500">
                        No credit file yet?{' '}
                        <button onClick={() => { setStep('register'); setError(''); }}
                          className="font-bold hover:underline" style={{ color: GREEN }}>Register free</button>
                      </p>
                    )}
                  </div>
                </>
              ) : step === 'register' ? (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(22,163,74,0.09)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <UserPlus className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <h2 className="font-display font-extrabold text-2xl" style={{ color: NAVY }}>Open your credit file</h2>
                  <p className="text-sm text-gray-500 mt-1.5 mb-6">
                    Give us the details on your NRC. We'll text a passcode to confirm the number is yours.
                  </p>
                  {error && <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
                  <form onSubmit={register} className="space-y-3.5">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">NRC number</label>
                      <input value={nrc} onChange={e => setNrc(e.target.value)} placeholder="123456/78/1"
                        className={cn(fieldCls, 'font-mono', nrc && !nrcValid && 'border-amber-400')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">First name</label>
                        <input value={reg.firstName} onChange={e => setReg(r => ({ ...r, firstName: e.target.value }))} className={fieldCls} />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Surname</label>
                        <input value={reg.lastName} onChange={e => setReg(r => ({ ...r, lastName: e.target.value }))} className={fieldCls} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Mobile number</label>
                      <input value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))}
                        placeholder="+260 97 123 4567" className={fieldCls} />
                      <p className="text-[11px] text-gray-400 mt-1">Your passcode is sent here every time you sign in</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Date of birth</label>
                        <input type="date" value={reg.dateOfBirth} onChange={e => setReg(r => ({ ...r, dateOfBirth: e.target.value }))} className={fieldCls} />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Province</label>
                        <select value={reg.province} onChange={e => setReg(r => ({ ...r, province: e.target.value }))} className={fieldCls}>
                          <option value="">Choose…</option>
                          {PROVINCES.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                        Email <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <input type="email" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} className={fieldCls} />
                    </div>
                    <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                      <input type="checkbox" checked={reg.consent} onChange={e => setReg(r => ({ ...r, consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded accent-green-600" />
                      <span className="text-[12px] text-gray-600 leading-relaxed">
                        I agree to Social Score holding my credit information and sharing it with licensed
                        lenders when I give permission, under the Data Protection Act (2021).
                      </span>
                    </label>
                    <button type="submit" disabled={!regValid || busy}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-40 shadow-lg shadow-green-600/25"
                      style={{ background: GREEN }}>
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create my file <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                  <button onClick={() => { setStep('nrc'); setError(''); }}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium">
                    <ArrowLeft className="w-3.5 h-3.5" /> I already have a file
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(22,163,74,0.09)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <Smartphone className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <h2 className="font-display font-extrabold text-2xl" style={{ color: NAVY }}>
                    {hint?.registered ? 'Confirm your number' : 'Enter your passcode'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1.5 mb-6">
                    {hint?.registered && <>Your credit file is open. </>}
                    We sent a 6-digit code to <b className="text-gray-700">{hint?.phoneHint}</b>. It expires in {hint?.expiresInMinutes} minutes.
                  </p>
                  {error && <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
                  <form onSubmit={verify} className="space-y-4">
                    <input ref={otpRef} value={code} inputMode="numeric" maxLength={6}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••"
                      className="w-full text-center tracking-[0.6em] font-mono text-2xl py-4 rounded-xl border border-slate-200 bg-slate-50/60 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-green-600/25 focus:border-green-600 transition" />
                    <button type="submit" disabled={code.length < 4 || busy}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-40 shadow-lg shadow-green-600/25"
                      style={{ background: GREEN }}>
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify and sign in <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                  <div className="flex items-center justify-between mt-5 text-sm">
                    <button onClick={() => { setStep('nrc'); setError(''); }} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 font-medium">
                      <ArrowLeft className="w-3.5 h-3.5" /> Change NRC
                    </button>
                    <button onClick={() => requestOtp()} disabled={seconds > 0 || busy}
                      className="font-semibold disabled:text-gray-400" style={{ color: seconds > 0 ? undefined : GREEN }}>
                      {seconds > 0 ? `Resend in ${seconds}s` : 'Resend passcode'}
                    </button>
                  </div>
                  {hint?.demoHint && (
                    <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-gray-500 inline-flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {hint.demoHint}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 text-center mb-2.5">Demo consumers</p>
              <div className="grid grid-cols-2 gap-2">
                {[['123456/78/1', 'Chanda Mwila'], ['654321/87/1', 'Mutale Bwalya'], ['789012/34/1', 'Thandiwe Phiri'], ['111222/56/1', 'Joseph Lungu']].map(([n, name]) => (
                  <button key={n} onClick={() => { setNrc(n); setStep('nrc'); setError(''); }}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-green-400 text-left transition">
                    <p className="font-mono text-[11px] text-gray-900">{n}</p>
                    <p className="text-[10px] text-gray-400">{name}</p>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-6">
              Protected by 256-bit TLS · Your data is never shared without your consent
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
