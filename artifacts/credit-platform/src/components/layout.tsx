import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  LogOut,
  Activity,
  ShieldCheck,
  Building,
  Menu,
  X,
  Brain,
  DollarSign,
  ShieldAlert,
  Database,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutUser } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const getNavItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { icon: LayoutDashboard, label: 'Overview',       href: '/admin' },
        { icon: Building,        label: 'Tenants',        href: '/admin/tenants' },
        { icon: Brain,           label: 'Scoring Models', href: '/admin/scoring-models' },
        { icon: Database,        label: 'Data Sources',   href: '/admin/data-sources' },
        { icon: ShieldAlert,     label: 'Fraud Monitor',  href: '/admin/fraud' },
        { icon: DollarSign,      label: 'Billing',        href: '/admin/billing' },
        { icon: Activity,        label: 'Audit Logs',     href: '/admin/audit-logs' },
      ];
    }
    if (user?.role === 'customer') {
      return [
        { icon: ShieldCheck, label: 'Consent & Portal', href: '/consent' },
      ];
    }
    return [
      { icon: LayoutDashboard, label: 'Credit Lookup',   href: '/dashboard' },
      { icon: BarChart3,       label: 'Analytics',       href: '/dashboard/analytics' },
      { icon: BookOpen,        label: 'Portfolio',       href: '/dashboard/portfolio' },
      { icon: Users,           label: 'Team',            href: '/dashboard/users' },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') return location === href;
    return location.startsWith(href);
  };

  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin' :
    user?.role === 'customer'    ? 'Customer Portal' :
    user?.tenantName ?? 'Tenant';

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* ══ Sidebar (always dark) ══ */}
      <aside
        className="hidden md:flex w-64 flex-col shrink-0 relative z-10"
        style={{
          background: 'linear-gradient(180deg, #0d1525 0%, #0a1020 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="p-6 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 4px 14px rgba(6,182,212,0.35)' }}
            >
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-wide">
              Zam<span className="text-cyan-400">Credit</span>
            </span>
          </Link>
        </div>

        {/* User pill */}
        <div className="px-4 pb-4">
          <div
            className="px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Signed in as
            </p>
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-cyan-400 truncate mt-0.5">{roleLabel}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative',
                  active
                    ? 'text-white'
                    : 'hover:text-white'
                )}
                style={active
                  ? { background: 'rgba(6,182,212,0.15)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.55)' }
                }
              >
                {active && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                    style={{ background: '#06b6d4' }}
                  />
                )}
                <item.icon
                  className="w-4 h-4 shrink-0 transition-colors"
                  style={{ color: active ? '#06b6d4' : undefined }}
                />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={logoutUser}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
              (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ══ Main content (light) ══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between p-4 z-20"
          style={{
            background: '#0d1525',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-display font-bold text-white">ZamCredit</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white/70 p-2 hover:text-white transition-colors">
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu drawer */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden absolute top-[57px] left-0 w-full z-30 p-4 flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto"
            style={{ background: '#0d1525', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <item.icon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
            <button
              onClick={logoutUser}
              className="flex items-center gap-3 p-3 rounded-xl mt-2 text-red-400"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
