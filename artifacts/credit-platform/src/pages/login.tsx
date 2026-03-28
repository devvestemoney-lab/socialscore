import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import {
  Activity, Mail, Lock, Building2, ChevronRight, AlertCircle,
  Shield, Zap, Users, TrendingUp, CheckCircle2, Database
} from 'lucide-react';
import type { LoginRequest } from '@workspace/api-client-react';

const STATS = [
  { label: 'Credit Profiles', value: '2.4M+' },
  { label: 'Lending Partners', value: '180+' },
  { label: 'Avg Score Accuracy', value: '94.7%' },
];

const FEATURES = [
  { icon: Zap, text: 'Real-time AI scoring in under 200ms' },
  { icon: Shield, text: 'Bank-grade encryption & compliance' },
  { icon: Database, text: 'Mobile money, MFI & bank data fusion' },
  { icon: Users, text: 'Multi-tenant enterprise architecture' },
];

const DEMO_ROLES = [
  {
    key: 'admin' as const,
    label: 'Super Admin',
    email: 'admin@zamcredit.zm',
    password: 'admin123',
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-400/60',
    badge: 'bg-violet-500/20 text-violet-300',
    dot: 'bg-violet-400',
  },
  {
    key: 'tenant' as const,
    label: 'Tenant (Zanaco)',
    email: 'zanaco@zamcredit.zm',
    password: 'zanaco123',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 hover:border-cyan-400/60',
    badge: 'bg-cyan-500/20 text-cyan-300',
    dot: 'bg-cyan-400',
  },
  {
    key: 'customer' as const,
    label: 'Customer',
    email: 'customer@zamcredit.zm',
    password: 'customer123',
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 hover:border-emerald-400/60',
    badge: 'bg-emerald-500/20 text-emerald-300',
    dot: 'bg-emerald-400',
  },
];

export default function Login() {
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
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsPending(false);
    }
  };

  const setDemo = (role: typeof DEMO_ROLES[number]) => {
    setFormData({ email: role.email, password: role.password, tenantCode: '' });
    setActiveDemo(role.key);
    setError('');
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#080d14' }}>

      {/* ── Animated grid background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,220,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,220,255,1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-[-20%] right-[30%] w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
      </div>

      {/* ═══════════════════ LEFT — Form ═══════════════════ */}
      <div className="relative z-10 w-full lg:w-[52%] flex items-center justify-center p-6 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-[460px]"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Zam<span className="text-cyan-400">Credit</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 leading-tight">Sign in to<br />your workspace</h1>
            <p className="text-white/50 text-base">Enterprise credit intelligence platform</p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-2xl flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30 w-[18px] h-[18px]" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => { setFormData(p => ({ ...p, email: e.target.value })); setActiveDemo(null); }}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder:text-white/25 text-sm transition-all outline-none focus:ring-2 focus:ring-cyan-500/40"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => { setFormData(p => ({ ...p, password: e.target.value })); setActiveDemo(null); }}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder:text-white/25 text-sm transition-all outline-none focus:ring-2 focus:ring-cyan-500/40"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  placeholder="••••••••••"
                />
              </div>
            </div>

            {/* Tenant Code */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Tenant Code <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
                <input
                  type="text"
                  value={formData.tenantCode}
                  onChange={(e) => setFormData(p => ({ ...p, tenantCode: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder:text-white/25 text-sm transition-all outline-none focus:ring-2 focus:ring-cyan-500/40 uppercase tracking-widest"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  placeholder="e.g. ZAMBANK"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-2.5 group transition-all duration-200 hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-2"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  Sign In
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-7" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-4 text-center">
              Demo quick-fill
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {DEMO_ROLES.map((role) => (
                <button
                  key={role.key}
                  onClick={() => setDemo(role)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 bg-gradient-to-br border text-xs ${role.color} ${activeDemo === role.key ? 'ring-2 ring-white/20 scale-[1.02]' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mb-2 ${role.dot}`} />
                  <div className="font-semibold text-white/90 leading-tight">{role.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-white/25">
            Protected by 256-bit TLS encryption · SOC 2 Type II compliant
          </p>
        </motion.div>
      </div>

      {/* ═══════════════════ RIGHT — Hero Panel ═══════════════════ */}
      <div className="hidden lg:flex w-[48%] relative z-10 flex-col justify-between p-14"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)' }} />

        {/* Credit Score Ring Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 flex items-center justify-center"
        >
          <div className="relative w-72 h-72">
            {/* Outer ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 288 288">
              <circle cx="144" cy="144" r="132" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
              <circle cx="144" cy="144" r="132" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 132 * 0.82} ${2 * Math.PI * 132}`}
              />
              <circle cx="144" cy="144" r="105" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
              <circle cx="144" cy="144" r="78" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            {/* Centre content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl font-bold text-white tabular-nums">905</div>
              <div className="text-cyan-400 font-semibold text-sm mt-1">Excellent</div>
              <div className="text-white/40 text-xs mt-0.5">AI Credit Score</div>
            </div>
            {/* Floating chips */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-8 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-1.5"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              +18 pts
            </motion.div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -bottom-2 -left-10 px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-300 flex items-center gap-1.5"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Loan Approved
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Financial inclusion<br />powered by{' '}
            <span style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI intelligence
            </span>
          </h2>
          <p className="text-white/50 text-base mb-10 leading-relaxed">
            Enterprise-grade credit scoring that fuses mobile money, bank data, and MFI history to unlock financial access for millions across Zambia.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
                <div className="text-xs text-white/40">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <Icon className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-sm text-white/60">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
