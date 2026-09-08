import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard, Users, LogOut, Activity, ShieldCheck, Building, Menu, X,
  Brain, DollarSign, ShieldAlert, Database, BookOpen, BarChart3, Bell,
  Calendar, Sun, ScrollText, FileText, Landmark, UserCog, BookUser,
  FileSearch, Gauge, UploadCloud, BadgeCheck, Workflow, PieChart,
  Scale, ClipboardCheck, KeyRound, Puzzle, Tags, TrendingUp, Settings,
  Flag, FileCheck2, HeartPulse, Search, Radar, Star, ListChecks, Siren,
  UploadCloud as UploadIcon, HardDriveUpload, History, ListX, SearchCheck,
  CheckCircle2, Timer, BellRing, TrendingDown, SlidersHorizontal, Webhook,
  Zap, Receipt, Building2, GitBranch, KeySquare, Code2, LifeBuoy, Headset,
  FileBarChart2, IdCard, Sparkles, Wallet, History as HistoryIcon,
  BellRing as BellIcon, Download, CreditCard, GraduationCap, HelpCircle,
  UserCircle, Lock,
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
        { section: 'Tenant Management', items: [
          { icon: Building, label: 'Tenants', href: '/admin/tenants' },
          { icon: Landmark, label: 'Institutions', href: '/admin/institutions' },
          { icon: Users, label: 'Users & Access', href: '/admin/users' },
          { icon: UserCog, label: 'Roles & Permissions', href: '/admin/roles' },
        ]},
        { section: 'Consumer & Credit', items: [
          { icon: BookUser, label: 'Consumer Registry', href: '/admin/consumers' },
          { icon: FileText, label: 'Credit Reports', href: '/admin/credit-reports' },
          { icon: FileSearch, label: 'Credit Inquiries', href: '/admin/credit-inquiries' },
          { icon: Gauge, label: 'Credit Scores', href: '/admin/credit-scores' },
        ]},
        { section: 'Data Ecosystem', items: [
          { icon: UploadCloud, label: 'Data Contributions', href: '/admin/data-contributions' },
          { icon: BadgeCheck, label: 'Data Quality', href: '/admin/data-quality' },
          { icon: Database, label: 'Data Sources', href: '/admin/data-sources' },
          { icon: Workflow, label: 'Data Processing', href: '/admin/data-processing' },
        ]},
        { section: 'Risk & Intelligence', items: [
          { icon: Brain, label: 'Scorecards', href: '/admin/scoring-models' },
          { icon: PieChart, label: 'Risk Segmentation', href: '/admin/risk-segmentation' },
          { icon: BookOpen, label: 'Portfolio Monitoring', href: '/admin/portfolio' },
          { icon: ShieldAlert, label: 'Fraud Detection', href: '/admin/fraud' },
          { icon: Bell, label: 'Alerts', href: '/admin/alerts' },
        ]},
        { section: 'Operations', items: [
          { icon: Scale, label: 'Disputes', href: '/admin/disputes' },
          { icon: ClipboardCheck, label: 'Consent Management', href: '/admin/consent-management' },
          { icon: KeyRound, label: 'API Management', href: '/admin/api-management' },
          { icon: Puzzle, label: 'Integrations', href: '/admin/integrations' },
        ]},
        { section: 'Commercial', items: [
          { icon: Activity, label: 'Usage & Metering', href: '/admin/usage' },
          { icon: Tags, label: 'Pricing Plans', href: '/admin/pricing' },
          { icon: DollarSign, label: 'Billing & Invoices', href: '/admin/billing' },
          { icon: TrendingUp, label: 'Revenue Analytics', href: '/admin/revenue' },
        ]},
        { section: 'Administration', items: [
          { icon: Settings, label: 'System Settings', href: '/admin/settings' },
          { icon: Flag, label: 'Feature Management', href: '/admin/features' },
          { icon: ScrollText, label: 'Audit Logs', href: '/admin/audit-logs' },
          { icon: FileCheck2, label: 'Compliance', href: '/admin/compliance' },
          { icon: HeartPulse, label: 'System Health', href: '/admin/health' },
        ]},
      ];
    }
    if (user?.role === 'customer') {
      return [
        { section: 'Overview', items: [
          { icon: LayoutDashboard, label: 'My Dashboard', href: '/my' },
        ]},
        { section: 'My Credit', items: [
          { icon: IdCard, label: 'My Credit Profile', href: '/my/profile' },
          { icon: FileText, label: 'My Credit Report', href: '/my/report' },
          { icon: Gauge, label: 'My Credit Score', href: '/my/score' },
          { icon: Sparkles, label: 'Score Simulator', href: '/my/simulator' },
        ]},
        { section: 'Credit Activity', items: [
          { icon: Wallet, label: 'My Credit Accounts', href: '/my/accounts' },
          { icon: FileSearch, label: 'Credit Inquiries', href: '/my/inquiries' },
          { icon: HistoryIcon, label: 'Credit History', href: '/my/history' },
        ]},
        { section: 'Protection & Control', items: [
          { icon: BellIcon, label: 'Credit Alerts', href: '/my/alerts' },
          { icon: Scale, label: 'Disputes & Corrections', href: '/my/disputes' },
          { icon: ClipboardCheck, label: 'Consent & Data Access', href: '/my/consent' },
        ]},
        { section: 'Services', items: [
          { icon: Download, label: 'Download My Report', href: '/my/download' },
          { icon: ScrollText, label: 'Report History', href: '/my/report-history' },
          { icon: CreditCard, label: 'Payments', href: '/my/payments' },
        ]},
        { section: 'Learn', items: [
          { icon: GraduationCap, label: 'Credit Education', href: '/my/education' },
          { icon: HelpCircle, label: 'FAQs', href: '/my/faqs' },
        ]},
        { section: 'Account', items: [
          { icon: UserCircle, label: 'My Profile', href: '/my/account' },
          { icon: Lock, label: 'Security & Settings', href: '/my/security' },
        ]},
      ];
    }
    return [
      { section: 'Dashboard', items: [
        { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
      ]},
      { section: 'Credit Intelligence', items: [
        { icon: Search, label: 'Consumer Search', href: '/dashboard/consumer-search' },
        { icon: FileText, label: 'Credit Reports', href: '/dashboard/credit-reports' },
        { icon: FileSearch, label: 'Credit Inquiries', href: '/dashboard/credit-inquiries' },
        { icon: Radar, label: 'Monitoring & Alerts', href: '/dashboard/monitoring' },
      ]},
      { section: 'Consumers', items: [
        { icon: BookUser, label: 'Consumer Directory', href: '/dashboard/consumers' },
        { icon: Star, label: 'Saved Consumers', href: '/dashboard/saved-consumers' },
        { icon: ListChecks, label: 'Watchlists', href: '/dashboard/watchlists' },
        { icon: Activity, label: 'Consumer Activity', href: '/dashboard/consumer-activity' },
      ]},
      { section: 'Risk & Analytics', items: [
        { icon: BarChart3, label: 'Risk Overview', href: '/dashboard/analytics' },
        { icon: BookOpen, label: 'Portfolio Analytics', href: '/dashboard/portfolio' },
        { icon: Gauge, label: 'Score Distribution', href: '/dashboard/score-distribution' },
        { icon: PieChart, label: 'Risk Segmentation', href: '/dashboard/risk-segmentation' },
        { icon: Siren, label: 'Early Warning Signals', href: '/dashboard/early-warnings' },
      ]},
      { section: 'Data Contributions', items: [
        { icon: UploadIcon, label: 'Submit Data', href: '/dashboard/submit-data' },
        { icon: HardDriveUpload, label: 'Data Uploads', href: '/dashboard/data-uploads' },
        { icon: History, label: 'Submission History', href: '/dashboard/submission-history' },
        { icon: BadgeCheck, label: 'Data Quality', href: '/dashboard/data-quality' },
        { icon: ListX, label: 'Validation Errors', href: '/dashboard/validation-errors' },
      ]},
      { section: 'Disputes & Cases', items: [
        { icon: Scale, label: 'Active Disputes', href: '/dashboard/disputes' },
        { icon: SearchCheck, label: 'Investigations', href: '/dashboard/investigations' },
        { icon: CheckCircle2, label: 'Resolved Cases', href: '/dashboard/resolved-cases' },
        { icon: Timer, label: 'SLA Tracking', href: '/dashboard/sla-tracking' },
      ]},
      { section: 'Alerts & Notifications', items: [
        { icon: BellRing, label: 'Consumer Alerts', href: '/dashboard/consumer-alerts' },
        { icon: TrendingDown, label: 'Portfolio Alerts', href: '/dashboard/portfolio-alerts' },
        { icon: Bell, label: 'System Notifications', href: '/dashboard/notifications' },
        { icon: SlidersHorizontal, label: 'Alert Rules', href: '/dashboard/alert-rules' },
      ]},
      { section: 'API & Integrations', items: [
        { icon: Activity, label: 'API Dashboard', href: '/dashboard/api' },
        { icon: KeyRound, label: 'API Credentials', href: '/dashboard/api-credentials' },
        { icon: ScrollText, label: 'API Logs', href: '/dashboard/api-logs' },
        { icon: Webhook, label: 'Webhooks', href: '/dashboard/webhooks' },
        { icon: Puzzle, label: 'Integrations', href: '/dashboard/integrations' },
      ]},
      { section: 'Usage & Billing', items: [
        { icon: Zap, label: 'Usage Overview', href: '/dashboard/usage' },
        { icon: FileBarChart2, label: 'Credit Report Usage', href: '/dashboard/report-usage' },
        { icon: TrendingUp, label: 'API Usage', href: '/dashboard/api-usage' },
        { icon: Receipt, label: 'Billing & Invoices', href: '/dashboard/billing' },
        { icon: Tags, label: 'Subscription Plan', href: '/dashboard/subscription' },
      ]},
      { section: 'Administration', items: [
        { icon: Building2, label: 'Organization Profile', href: '/dashboard/organization' },
        { icon: Users, label: 'Users', href: '/dashboard/users' },
        { icon: UserCog, label: 'Roles & Permissions', href: '/dashboard/roles' },
        { icon: GitBranch, label: 'Branches / Departments', href: '/dashboard/branches' },
        { icon: ShieldCheck, label: 'Security Settings', href: '/dashboard/security' },
      ]},
      { section: 'Compliance & Audit', items: [
        { icon: ScrollText, label: 'Audit Logs', href: '/dashboard/audit-logs' },
        { icon: KeySquare, label: 'Access History', href: '/dashboard/access-history' },
        { icon: ClipboardCheck, label: 'Consent Records', href: '/dashboard/consent-records' },
        { icon: FileCheck2, label: 'Compliance Reports', href: '/dashboard/compliance-reports' },
      ]},
      { section: 'Support', items: [
        { icon: LifeBuoy, label: 'Help Center', href: '/dashboard/help' },
        { icon: BookOpen, label: 'Documentation', href: '/dashboard/docs' },
        { icon: Code2, label: 'API Documentation', href: '/dashboard/api-docs' },
        { icon: Headset, label: 'Contact Support', href: '/dashboard/support' },
      ]},
    ];
  };

  const navGroups = getNavGroups();
  const flatItems = navGroups.flatMap(g => g.items);

  const isActive = (href: string) => location === href;

  const current = flatItems.find(i => isActive(i.href));
  const pageTitle = current?.label ?? 'Dashboard';

  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin' :
    user?.role === 'customer' ? 'Customer' :
    user?.tenantName ?? 'Tenant';

  const initials = (user?.name ?? 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const dateRange = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Each page renders its own <Layout>, so navigating recreates the sidebar and
  // resets its scroll. Persist the offset and restore it before paint.
  const navRef = React.useRef<HTMLElement | null>(null);
  const NAV_SCROLL_KEY = 'sidebar-scroll';

  React.useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const saved = Number(sessionStorage.getItem(NAV_SCROLL_KEY) ?? 0);
    if (saved > 0) el.scrollTop = saved;
    const onScroll = () => sessionStorage.setItem(NAV_SCROLL_KEY, String(el.scrollTop));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [location]);

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #4F6EF7, #3B5BDB)' }}>
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-display font-bold text-white tracking-wide">Social Score</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Credit Intelligence Platform
          </p>
        </div>
      </div>

      {/* Nav groups */}
      <nav ref={navRef} className="flex-1 px-3 overflow-y-auto pb-4">
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
                    ref={active ? (el: HTMLAnchorElement | null) => {
                      if (el && navRef.current) {
                        const nav = navRef.current;
                        const top = el.offsetTop;
                        if (top < nav.scrollTop || top > nav.scrollTop + nav.clientHeight - 48) {
                          nav.scrollTop = Math.max(0, top - nav.clientHeight / 2);
                        }
                      }
                    } : undefined}
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
    <div className="h-screen bg-background flex overflow-hidden">
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
            © {new Date().getFullYear()} Social Score. All rights reserved.
            <span className="mx-2">·</span> Enterprise Credit Intelligence Platform
          </p>
        </main>
      </div>
    </div>
  );
}
