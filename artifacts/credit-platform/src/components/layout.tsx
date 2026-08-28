import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard, Users, LogOut, Activity, ShieldCheck, Building, Menu, X,
  Brain, DollarSign, ShieldAlert, Database, BookOpen, BarChart3, Bell,
  Calendar, Sun, ScrollText, LifeBuoy, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { icon: React.ElementType; label: string; href: string };
type NavGroup = { section: string; items: NavItem[] };

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutUser } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const getNavGroups = (): NavGroup[] => {
    if (user?.role === 'super_admin') {
      return [
        { section: 'Overview', items: [
          { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
        ]},
        { section: 'Core Modules', items: [
          { icon: Building, label: 'Lenders / Institutions', href: '/admin/tenants' },
          { icon: Database, label: 'Data Sources', href: '/admin/data-sources' },
        ]},
        { section: 'Risk & Scoring', items: [
          { icon: Brain, label: 'Scoring Models', href: '/admin/scoring-models' },
          { icon: ShieldAlert, label: 'Fraud Detection', href: '/admin/fraud' },
        ]},
        { section: 'Administration', items: [
          { icon: DollarSign, label: 'Billing', href: '/admin/billing' },
          { icon: ScrollText, label: 'Audit Logs', href: '/admin/audit-logs' },
        ]},
      ];
    }
    if (user?.role === 'customer') {
      return [
        { section: 'My Portal', items: [
          { icon: ShieldCheck, label: 'Consent & Reports', href: '/consent' },
        ]},
      ];
    }
    return [
      { section: 'Overview', items: [
        { icon: LayoutDashboard, label: 'Credit Lookup', href: '/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
      ]},
      { section: 'Portfolio', items: [
        { icon: BookOpen, label: 'Loan Book', href: '/dashboard/portfolio' },
        { icon: Users, label: 'Team', href: '/dashboard/users' },
      ]},
    ];
  };

  const navGroups = getNavGroups();
  const flatItems = navGroups.flatMap(g => g.items);

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/dashboard') return location === href;
    return location.startsWith(href);
  };

  const current = flatItems.find(i => isActive(i.href));
  const pageTitle = current?.label ?? 'Dashboard';

  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin' :
    user?.role === 'customer' ? 'Customer' :
    user?.tenantName ?? 'Tenant';

  const initials = (user?.name ?? 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const dateRange = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #4F6EF7, #3B5BDB)' }}>
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-display font-bold text-white tracking-wide">ZCRB</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Credit Reference Bureau
          </p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 overflow-y-auto pb-4">
        {navGroups.map(group => (
          <div key={group.section} className="mb-2">
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active ? 'text-white' : 'hover:text-white'
                    )}
                    style={active
                      ? { background: '#4F6EF7' }
                      : { color: 'rgba(255,255,255,0.6)' }}>
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C5CFC)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{roleLabel}</p>
          </div>
          <button onClick={logoutUser} title="Sign out"
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 relative z-10"
        style={{ background: '#111827', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <SidebarInner />
      </aside>

      {/* Sidebar — mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col"
            style={{ background: '#111827' }}>
            <button className="absolute top-4 right-4 text-white/60" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top header */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center gap-4 px-4 md:px-6">
          <button className="md:hidden p-2 -ml-2 text-gray-600" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-baseline gap-3 min-w-0">
            <h2 className="text-lg font-display font-bold text-gray-900 truncate">{pageTitle}</h2>
            {user?.role === 'super_admin' && (
              <span className="hidden sm:inline text-xs text-gray-400">Enterprise Overview</span>
            )}
          </div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {dateRange}
          </div>
          <button className="relative p-2 rounded-lg hover:bg-slate-100 text-gray-500">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 text-gray-500 hidden sm:block">
            <Sun className="w-[18px] h-[18px]" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
          <p className="text-center text-xs text-gray-400 mt-10 pb-4">
            © {new Date().getFullYear()} ZCRB. All rights reserved.
            <span className="mx-2">·</span> Enterprise CRB Platform
          </p>
        </main>
      </div>
    </div>
  );
}
