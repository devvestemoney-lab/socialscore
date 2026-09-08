import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { Logo, NAVY, GREEN } from '@/components/brand';
import {
  Fingerprint, ArrowLeft, ArrowRight, Loader2, ShieldCheck, Smartphone,
  Eye, FileText, Bell, Info,
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

export default function ConsumerLogin() {
  const [step, setStep] = useState<'nrc' | 'otp'>('nrc');
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
    if (!res.ok) { setError(body.message ?? 'Could not send a passcode'); return; }
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
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(22,163,74,0.09)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <Smartphone className="w-5 h-5" style={{ color: GREEN }} />
                  </div>
                  <h2 className="font-display font-extrabold text-2xl" style={{ color: NAVY }}>Enter your passcode</h2>
                  <p className="text-sm text-gray-500 mt-1.5 mb-6">
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
