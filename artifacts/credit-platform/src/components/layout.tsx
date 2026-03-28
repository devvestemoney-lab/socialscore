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
  Settings2,
  BookOpen,
  FileText,
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
        { icon: LayoutDashboard, label: 'Overview', href: '/admin' },
        { icon: Building, label: 'Tenants', href: '/admin/tenants' },
        { icon: Brain, label: 'Scoring Models', href: '/admin/scoring-models' },
        { icon: Database, label: 'Data Sources', href: '/admin/data-sources' },
        { icon: ShieldAlert, label: 'Fraud Monitor', href: '/admin/fraud' },
        { icon: DollarSign, label: 'Billing', href: '/admin/billing' },
        { icon: Activity, label: 'Audit Logs', href: '/admin/audit-logs' },
      ];
    }
    if (user?.role === 'customer') {
      return [
        { icon: ShieldCheck, label: 'Consent & Portal', href: '/consent' },
      ];
    }
    return [
      { icon: LayoutDashboard, label: 'Credit Lookup', href: '/dashboard' },
      { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
      { icon: BookOpen, label: 'Portfolio', href: '/dashboard/portfolio' },
      { icon: Settings2, label: 'Decision Rules', href: '/dashboard/rules' },
      { icon: Users, label: 'Team', href: '/dashboard/users' },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') return location === href;
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-card/30 backdrop-blur-xl relative z-10">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-wide">Zam<span className="text-cyan-400">Credit</span></span>
          </Link>
        </div>

        <div className="px-4 py-2">
          <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5 mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Logged in as</p>
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-cyan-400 truncate">{user?.tenantName || 'Super Admin'}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
                  active
                    ? "text-white bg-white/10 shadow-inner"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute left-0 w-1 h-7 bg-cyan-400 rounded-r-full"
                  />
                )}
                <item.icon className={cn("w-4 h-4 transition-colors shrink-0", active ? "text-cyan-400" : "group-hover:text-cyan-400")} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={logoutUser}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-card/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-display font-bold text-white">ZamCredit</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[73px] left-0 w-full bg-card/95 backdrop-blur-xl border-b border-white/10 z-30 p-4 flex flex-col gap-1 max-h-[80vh] overflow-y-auto">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg text-white hover:bg-white/10">
                <item.icon className="w-4 h-4 text-cyan-400" />
                {item.label}
              </Link>
            ))}
            <button onClick={logoutUser} className="flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 mt-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-7xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
