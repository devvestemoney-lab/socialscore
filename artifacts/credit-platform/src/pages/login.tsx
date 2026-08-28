import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { LoginRequest } from '@workspace/api-client-react';
import { ShieldCheck, Mail, Lock, Building2, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const DEMO_ROLES = [
  { key: 'admin' as const, label: 'Super Admin', email: 'admin@zamcredit.zm', password: 'admin123', dot: '#7C5CFC' },
  { key: 'tenant' as const, label: 'Tenant (Zanaco)', email: 'zanaco@zamcredit.zm', password: 'zanaco123', dot: '#4F6EF7' },
  { key: 'customer' as const, label: 'Customer', email: 'customer@zamcredit.zm', password: 'customer123', dot: '#10B981' },
];

const BLUE = '#4F6EF7';

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
    'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-gray-900 text-sm ' +
    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]/30 focus:border-[#4F6EF7] transition';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F6EF7, #3B5BDB)' }}>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-xl font-display font-bold text-gray-900">ZCRB</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Credit Reference Bureau</p>
            </div>
          </div>

          <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Sign in to your workspace</h1>
          <p className="text-sm text-gray-500 mb-8">Enterprise credit intelligence platform</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" required placeholder="name@company.com" className={inputCls}
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="password" required placeholder="••••••••" className={inputCls}
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Tenant Code <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="E.G. ZAMBANK" className={inputCls}
                  value={formData.tenantCode ?? ''}
                  onChange={e => setFormData(p => ({ ...p, tenantCode: e.target.value }))} />
              </div>
            </div>

            <button type="submit" disabled={isPending}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, #4F6EF7, #3B5BDB)' }}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Demo quick-fill */}
          <div className="mt-8">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 text-center mb-3">Demo quick-fill</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ROLES.map(role => (
                <button key={role.key} type="button" onClick={() => setDemo(role)}
                  className={`px-2 py-2.5 rounded-xl border text-xs font-medium transition text-gray-700 ${
                    activeDemo === role.key ? 'border-[#4F6EF7] bg-[#4F6EF7]/5' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: role.dot }} />
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-8">
            Protected by 256-bit TLS encryption · SOC 2 Type II compliant
          </p>
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:flex w-[46%] xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #111827 0%, #1E2A4A 60%, #23306B 100%)' }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: BLUE }} />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: '#7C5CFC' }} />

        <div className="relative z-10 flex justify-end">
          <div className="rounded-2xl px-6 py-5 text-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-4xl font-display font-bold text-white">905</p>
            <p className="text-emerald-400 text-sm font-semibold">Excellent</p>
            <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Credit Score</p>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl xl:text-4xl font-display font-bold text-white leading-tight mb-4">
            Financial inclusion<br />powered by <span style={{ color: '#8FA6FF' }}>credit intelligence</span>
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Enterprise-grade credit scoring that fuses mobile money, bank data, and MFI history
            to unlock financial access across Zambia.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[['2.4M+', 'Credit Profiles'], ['180+', 'Lending Partners'], ['94.7%', 'Score Accuracy']].map(([v, l]) => (
              <div key={l} className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xl font-display font-bold text-white">{v}</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{l}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {['Real-time scoring in under 200ms', 'Bank-grade encryption & compliance', 'Mobile money, MFI & bank data fusion', 'Multi-tenant enterprise architecture'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#8FA6FF' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
