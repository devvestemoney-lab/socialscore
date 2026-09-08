import React, { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import type { LoginRequest } from '@workspace/api-client-react';
import {
  Mail, Lock, Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle2,
  ShieldCheck, Server, ScrollText, Fingerprint, Globe2, KeyRound,
} from 'lucide-react';
import { Logo, NAVY, GREEN } from '@/components/brand';

const DEMO_ROLES = [
  { key: 'admin' as const, label: 'Super Admin', email: 'admin@zamcredit.zm', password: 'admin123', dot: '#8B5CF6' },
  { key: 'tenant' as const, label: 'Tenant (Zanaco)', email: 'zanaco@zamcredit.zm', password: 'zanaco123', dot: '#2563EB' },
  { key: 'customer' as const, label: 'Customer', email: 'customer@zamcredit.zm', password: 'customer123', dot: GREEN },
];

const ENTERPRISE_POINTS = [
  { icon: Fingerprint, t: 'Multi-tenant access control', d: 'Role-based permissions across every institution' },
  { icon: ShieldCheck, t: 'Bank-level security', d: 'MFA enforcement, encryption at rest and in transit' },
  { icon: ScrollText, t: 'Audit-ready by design', d: 'Every inquiry and decision is logged and traceable' },
  { icon: Server, t: '99.9% uptime SLA', d: 'Real-time scoring in under 200ms, around the clock' },
];

export default function LoginPage() {
  const { loginUser } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '', tenantCode: '' });
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPending(true);
    try {
      await loginUser(formData);
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  const setDemo = (role: typeof DEMO_ROLES[number]) => {
    setFormData({ email: role.email, password: role.password, tenantCode: '' });
    setActiveDemo(role.key);
    setError('');
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-gray-900 text-sm ' +
    'placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-600/25 focus:border-green-600 transition';

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F6FA' }}>

      {/* ---------- Left: enterprise brand panel ---------- */}
      <div className="hidden lg:flex w-[42%] xl:w-[44%] flex-col relative overflow-hidden text-white"
        style={{ background: `linear-gradient(165deg, #0A1F44 0%, ${NAVY} 55%, #123c74 100%)` }}>
        {/* decorative grid + glows */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full opacity-15 blur-3xl" style={{ background: GREEN }} />
        <div className="absolute -bottom-40 -left-24 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: '#38BDF8' }} />

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-14">
          <Link href="/"><Logo light /></Link>

          <div className="mt-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#4ADE80' }}>Enterprise Console</p>
            <h1 className="mt-3 font-display font-extrabold text-3xl xl:text-4xl leading-tight">
              One secure gateway to the trust ecosystem
            </h1>
            <p className="mt-4 text-sm leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Bureau operators and member institutions sign in here — with the right
              workspace served for every role. Consumers use their NRC instead.
            </p>

            <div className="mt-9 space-y-5">
              {ENTERPRISE_POINTS.map(pt => (
                <div key={pt.t} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
                    <pt.icon className="w-5 h-5" style={{ color: '#4ADE80' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{pt.t}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{pt.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-6 flex items-center gap-2 text-[12px]" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
            <Globe2 className="w-4 h-4 shrink-0" />
            Licensed by the Bank of Zambia · Data Protection Act compliant · ISO 27001 aligned
          </div>
        </div>
      </div>

      {/* ---------- Right: auth ---------- */}
      <div className="flex-1 flex flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between px-6 md:px-10 h-[72px]">
          <span className="lg:hidden"><Link href="/"><Logo /></Link></span>
          <span className="hidden lg:block" />
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-10">
          <div className="w-full max-w-[440px]">

            {/* Auth card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/[0.06] p-8 md:p-9">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(22,163,74,0.09)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <KeyRound className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <h2 className="font-display font-extrabold text-2xl" style={{ color: NAVY }}>Sign in to your workspace</h2>
              <p className="text-sm text-gray-500 mt-1.5 mb-7">Enter your credentials to access the platform.</p>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" required placeholder="name@institution.com" className={inputCls}
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[13px] font-semibold text-gray-700">Password</label>
                    <a href="#" onClick={e => e.preventDefault()} className="text-[12px] font-semibold hover:underline" style={{ color: GREEN }}>Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="password" required placeholder="••••••••" className={inputCls}
                      value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Tenant code <span className="font-normal text-gray-400">(institutions only)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="e.g. ZAMBANK" className={inputCls}
                      value={formData.tenantCode ?? ''}
                      onChange={e => setFormData(p => ({ ...p, tenantCode: e.target.value }))} />
                  </div>
                </div>

                <button type="submit" disabled={isPending}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-60 shadow-lg shadow-green-600/25"
                  style={{ background: GREEN }}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="flex items-center gap-3 my-6">
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">or</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>

              <button type="button" onClick={() => {}}
                className="w-full py-3 rounded-xl border border-slate-200 text-sm font-bold text-gray-700 flex items-center justify-center gap-2.5 hover:bg-slate-50 transition-colors">
                <Fingerprint className="w-4 h-4" style={{ color: NAVY }} />
                Continue with Enterprise SSO
              </button>

              <p className="mt-6 pt-5 border-t border-slate-100 text-center text-[13px] text-gray-500">
                Checking your own credit?{' '}
                <Link href="/my/login" className="font-bold hover:underline" style={{ color: GREEN }}>
                  Sign in with your NRC
                </Link>
              </p>
            </div>

            {/* Demo quick-fill */}
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 text-center mb-3">Demo environment — quick fill</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ROLES.map(role => (
                  <button key={role.key} type="button" onClick={() => setDemo(role)}
                    className={`px-2 py-2.5 rounded-xl border text-xs font-medium transition text-gray-700 ${
                      activeDemo === role.key ? 'border-green-600 bg-green-600/5' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: role.dot }} />
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              New to SocialScore?{' '}
              <Link href="/" className="font-bold hover:underline" style={{ color: GREEN }}>Explore the platform</Link>
            </p>
          </div>
        </div>

        {/* bottom strip */}
        <div className="px-6 md:px-10 py-5 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 text-[12px] text-gray-400 border-t border-slate-200/70">
          <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> 256-bit TLS encryption</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: GREEN }} /> Licensed. Compliant. Trusted.</span>
          <span>© {new Date().getFullYear()} SocialScore</span>
        </div>
      </div>
    </div>
  );
}
