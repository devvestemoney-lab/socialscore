import {
  Home, ShoppingCart, Briefcase, Bell, LayoutDashboard, Gauge, FileText,
  History, Scale, Sparkles, User, Settings, LogOut, BadgeCheck, TrendingUp,
  CheckCircle2, Info, ArrowUp, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo, NAVY, GREEN } from '@/components/brand';

/* Hero dashboard preview — trust score gauge */
function TrustGauge() {
  return (
    <svg viewBox="0 0 200 112" className="w-40 mx-auto">
      <path d="M 22 100 A 78 78 0 0 1 43 45" fill="none" stroke="#EF4444" strokeWidth="15" strokeLinecap="round" />
      <path d="M 49 38 A 78 78 0 0 1 84 23" fill="none" stroke="#F97316" strokeWidth="15" strokeLinecap="round" />
      <path d="M 93 22 A 78 78 0 0 1 130 27" fill="none" stroke="#FACC15" strokeWidth="15" strokeLinecap="round" />
      <path d="M 138 31 A 78 78 0 0 1 178 100" fill="none" stroke="#16A34A" strokeWidth="15" strokeLinecap="round" />
      <line x1="100" y1="100" x2="143" y2="53" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="7" fill={NAVY} />
    </svg>
  );
}

const previewNav = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Gauge, label: 'Scores' },
  { icon: FileText, label: 'Reports' },
  { icon: Bell, label: 'Alerts' },
  { icon: History, label: 'History' },
  { icon: Scale, label: 'Disputes' },
  { icon: Sparkles, label: 'Recommendations' },
  { icon: User, label: 'Profile' },
  { icon: Settings, label: 'Settings' },
];

const breakdown = [
  { label: 'Payment Score', value: 760, color: '#16A34A', icon: BadgeCheck },
  { label: 'Rent Score', value: 720, color: '#10B981', icon: Home },
  { label: 'Commerce Score', value: 689, color: '#8B5CF6', icon: ShoppingCart },
  { label: 'Credit Score', value: 710, color: '#F59E0B', icon: TrendingUp },
  { label: 'Stability Score', value: 735, color: '#14B8A6', icon: Briefcase },
  { label: 'Reputation Score', value: 751, color: '#EC4899', icon: Heart },
];


/* The hero dashboard preview card — shared between the landing and auth pages */
export function ScorePreview() {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/70 overflow-hidden flex">
      {/* mini sidebar */}
      <div className="hidden sm:flex w-44 shrink-0 flex-col text-white" style={{ background: NAVY }}>
        <div className="px-4 py-5"><Logo light /></div>
        <nav className="flex-1 px-2.5 space-y-0.5">
          {previewNav.map(n => (
            <div key={n.label} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium',
              n.active ? 'text-white' : 'text-white/55')}
              style={n.active ? { background: 'rgba(22,163,74,0.9)' } : undefined}>
              <n.icon className="w-3.5 h-3.5 shrink-0" />{n.label}
            </div>
          ))}
        </nav>
        <div className="px-5 py-5 flex items-center gap-2.5 text-[12px] text-white/55">
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </div>
      </div>

      {/* mini main */}
      <div className="flex-1 bg-slate-50/70 min-w-0">
        <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-slate-100">
          <div className="min-w-0">
            <p className="font-display font-bold text-[15px] truncate" style={{ color: NAVY }}>Welcome back, Chanda 👋</p>
            <p className="text-[10px] text-gray-400">Here's your overall summary</p>
          </div>
          <div className="ml-auto relative">
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ background: GREEN }}>3</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">CM</div>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-3">
          {/* gauge card */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
            <p className="text-[11px] font-semibold text-gray-500 text-left mb-1">Overall Trust Score</p>
            <TrustGauge />
            <p className="font-display font-extrabold text-4xl -mt-3" style={{ color: NAVY }}>742</p>
            <p className="text-sm font-bold inline-flex items-center gap-1" style={{ color: GREEN }}>Good <Info className="w-3 h-3 text-gray-300" /></p>
            <p className="text-[10px] text-gray-400 mt-1">Score range: 300 – 900</p>
            <p className="text-[11px] font-semibold mt-2 inline-flex items-center gap-1" style={{ color: GREEN }}>
              <ArrowUp className="w-3 h-3" /> 28 pts from last update
            </p>
          </div>

          {/* breakdown card */}
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-500">Score Breakdown</p>
              <span className="text-[10px] font-semibold" style={{ color: GREEN }}>View all scores →</span>
            </div>
            <div className="space-y-2.5">
              {breakdown.map(b => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${b.color}1A` }}>
                    <b.icon className="w-3.5 h-3.5" style={{ color: b.color }} />
                  </span>
                  <span className="text-[11px] font-medium text-gray-700 w-24 shrink-0">{b.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${((b.value - 300) / 600) * 100}%`, background: b.color }} />
                  </div>
                  <span className="text-[11px] font-bold text-gray-900 w-8 text-right">{b.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* banner */}
          <div className="md:col-span-2 rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: GREEN }}>
              <CheckCircle2 className="w-5 h-5 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-900">Great job! You're building a strong financial reputation.</p>
              <p className="text-[10px] text-gray-400">Keep it up and unlock even more opportunities.</p>
            </div>
            <button className="hidden sm:block px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-gray-700 whitespace-nowrap">
              View Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
