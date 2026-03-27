import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, Building2, ChevronRight, AlertCircle } from 'lucide-react';
import type { LoginRequest } from '@workspace/api-client-react';

export default function Login() {
  const { loginUser } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({ email: '', password: '', tenantCode: '' });
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

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

  const setDemo = (type: 'admin' | 'tenant' | 'customer') => {
    if (type === 'admin') setFormData({ email: 'admin@zamcredit.zm', password: 'admin123', tenantCode: '' });
    if (type === 'tenant') setFormData({ email: 'zanaco@zamcredit.zm', password: 'zanaco123', tenantCode: '' });
    if (type === 'customer') setFormData({ email: 'customer@zamcredit.zm', password: 'customer123', tenantCode: '' });
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background Image / Effects */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Abstract fintech background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/40" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md glass-panel p-10 rounded-3xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-wide">Zam<span className="text-cyan-400">Credit</span></span>
          </div>

          <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Enter your credentials to access the enterprise portal.</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-white/40" />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({...p, email: e.target.value}))}
                  className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-white/40" />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({...p, password: e.target.value}))}
                  className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Tenant Code <span className="text-white/40">(Optional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className="w-5 h-5 text-white/40" />
                </div>
                <input
                  type="text"
                  value={formData.tenantCode}
                  onChange={(e) => setFormData(p => ({...p, tenantCode: e.target.value}))}
                  className="w-full pl-12 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all uppercase"
                  placeholder="e.g. ZAMBANK"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 mt-4 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isPending ? 'Authenticating...' : 'Sign In'}
              {!isPending && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Demo Hints */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-xs text-center text-white/40 font-medium tracking-wider uppercase mb-4">Demo Credentials</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => setDemo('admin')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors">Super Admin</button>
              <button onClick={() => setDemo('tenant')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors">Tenant User</button>
              <button onClick={() => setDemo('customer')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors">Customer</button>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="hidden lg:flex w-1/2 p-12 flex-col justify-end z-10 relative">
        <div className="max-w-xl">
          <h2 className="text-5xl font-display font-bold text-white mb-6 leading-tight">
            Financial inclusion powered by <span className="text-gradient">AI intelligence</span>
          </h2>
          <p className="text-xl text-white/70">
            Enterprise-grade credit scoring aggregating mobile money, bank data, and MFI history to bring financial access to millions across Zambia.
          </p>
        </div>
      </div>
    </div>
  );
}
