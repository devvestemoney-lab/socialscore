import { Link } from 'wouter';
import {
  Home, Smartphone, ShoppingCart, Briefcase, ShieldCheck, Wallet, Users,
  Bell, LayoutDashboard, Gauge, FileText, History, Scale, Sparkles,
  User, Settings, LogOut, Lock, BadgeCheck, TrendingUp, CheckCircle2, Info,
  ArrowUp, ChevronDown, Heart, Landmark, HandCoins, Zap, Store, KeyRound,
  BookOpen, Code2, LifeBuoy, Globe2, ArrowRight, Server, FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo, NAVY, GREEN } from '@/components/brand';
import { ScorePreview } from '@/components/score-preview';

const features = [
  { icon: Home, tint: '#16A34A', title: 'Housing', desc: 'Your rent payments build your Rent Score.' },
  { icon: Smartphone, tint: '#2563EB', title: 'Payments', desc: 'ZESCO, water, garbage collection and airtime paid on time build your Payment Score.' },
  { icon: ShoppingCart, tint: '#8B5CF6', title: 'Commerce', desc: 'Lay-bys, BNPL and instalments build your Commerce Score.' },
  { icon: Briefcase, tint: '#F59E0B', title: 'Stability', desc: 'Employment and residence stability increase your score.' },
  { icon: Wallet, tint: '#F59E0B', title: 'Cash Flow', desc: 'Steady mobile money income and spending within your means count.' },
  { icon: Users, tint: '#EC4899', title: 'Peer Lending', desc: 'Repaying chilimba, village banking and peer loans builds your score.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[72px] flex items-center gap-8">
          <Link href="/"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-gray-700 mx-auto">
            <a href="#" className="relative text-gray-900 after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:rounded-full" style={{ color: NAVY }}>
              Home
              <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full" style={{ background: GREEN }} />
            </a>
            <a href="#individuals" className="hover:text-gray-900 transition-colors">Individuals</a>
            <a href="#businesses" className="hover:text-gray-900 transition-colors">Businesses</a>
            <a href="#partners" className="hover:text-gray-900 transition-colors">Partners</a>
            <a href="#about" className="hover:text-gray-900 transition-colors">About Us</a>
            <a href="#resources" className="hover:text-gray-900 transition-colors inline-flex items-center gap-1">Resources <ChevronDown className="w-3.5 h-3.5" /></a>
          </nav>
          <div className="flex items-center gap-3 ml-auto lg:ml-0">
            <Link href="/login" className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-800 hover:bg-slate-50 transition-colors">
              Log In
            </Link>
            <Link href="/my/login" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:brightness-110" style={{ background: GREEN }}>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(900px 420px at 85% 10%, rgba(22,163,74,0.08), transparent 60%)' }} />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center relative">
          {/* Left copy */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(22,163,74,0.1)', color: '#15803D' }}>
              Trust Intelligence Platform
            </span>
            <h1 className="mt-5 font-display font-extrabold leading-[1.08] text-4xl md:text-5xl xl:text-[56px]" style={{ color: NAVY }}>
              Your behaviour.<br />
              Your reputation.<br />
              <span style={{ color: GREEN }}>Your opportunities.</span>
            </h1>
            <p className="mt-6 text-gray-600 text-lg max-w-md leading-relaxed">
              SocialScore turns everyday financial behaviour into a trusted reputation that helps
              you access credit, housing, and more opportunities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/my/login" className="px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:brightness-110" style={{ background: GREEN }}>
                Check Your Score
              </Link>
              <a href="#features" className="px-6 py-3.5 rounded-xl text-sm font-bold border-2 transition-colors hover:bg-green-50" style={{ borderColor: GREEN, color: '#15803D' }}>
                Learn More
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold text-gray-700">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} /> Secure &amp; Private</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} /> Fair &amp; Transparent</span>
              <span className="inline-flex items-center gap-2"><TrendingUp className="w-5 h-5" style={{ color: GREEN }} /> Build. Improve. Grow.</span>
            </div>
          </div>

          <ScorePreview />
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="bg-slate-50/60 border-t border-slate-100 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Why SocialScore?</p>
            <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl" style={{ color: NAVY }}>More than a Credit Score</h2>
            <p className="mt-3 text-gray-500">We look at the bigger picture. Your everyday actions count.</p>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-10">
            {features.map(f => (
              <div key={f.title}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${f.tint}14`, border: `1px solid ${f.tint}30` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.tint }} />
                </div>
                <p className="font-display font-bold" style={{ color: NAVY }}>{f.title}</p>
                <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ---------- Individuals ---------- */}
      <section id="individuals" className="bg-white border-t border-slate-100 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>For Individuals</p>
            <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl" style={{ color: NAVY }}>Own your financial story</h2>
            <p className="mt-4 text-gray-600 leading-relaxed max-w-lg">
              Every rent payment, airtime top-up and instalment you honour builds your trust score —
              even if you have never taken a bank loan. Check it free, understand it, and grow it.
            </p>
            <ul className="mt-6 space-y-3">
              {['Free score checks — as often as you like', 'See exactly what moves your score up or down',
                'Dispute errors online and track resolution', 'SMS alerts whenever someone views your file'].map(t => (
                <li key={t} className="flex items-start gap-3 text-sm font-medium text-gray-700">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: GREEN }} /> {t}
                </li>
              ))}
            </ul>
            <Link href="/my/login" className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:brightness-110" style={{ background: GREEN }}>
              Check Your Score <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Home, tint: '#16A34A', t: 'Rent counts', d: 'On-time rent builds your Rent Score month after month.' },
              { icon: Smartphone, tint: '#2563EB', t: 'Mobile money counts', d: 'MoMo bills and airtime advances feed your Payment Score.' },
              { icon: ShoppingCart, tint: '#8B5CF6', t: 'Lay-bys count', d: 'BNPL and instalment purchases grow your Commerce Score.' },
              { icon: Users, tint: '#EC4899', t: 'Chilimba counts', d: 'Repaying village banking and peer loans on time builds your record.' },
            ].map(c => (
              <div key={c.t} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${c.tint}14` }}>
                  <c.icon className="w-5 h-5" style={{ color: c.tint }} />
                </div>
                <p className="font-display font-bold" style={{ color: NAVY }}>{c.t}</p>
                <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Businesses (enterprise) ---------- */}
      <section id="businesses" className="scroll-mt-[72px]" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#4ADE80' }}>For Businesses</p>
            <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl text-white">Enterprise-grade trust intelligence</h2>
            <p className="mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Banks, MFIs, telcos and retailers use SocialScore to make faster, fairer decisions —
              through a multi-tenant platform built for regulated institutions.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              { icon: FileSearch, t: 'Reports & Scores API', d: 'Real-time trust reports and scores in under 200ms, with consent enforced on every inquiry.' },
              { icon: BookOpen, t: 'Portfolio Monitoring', d: 'Watch your whole loan book: NPL trends, segment migration and early-warning alerts.' },
              { icon: ShieldCheck, t: 'Fraud & Risk Intelligence', d: 'Velocity checks, identity matching and anomaly detection across the ecosystem.' },
            ].map(c => (
              <div key={c.t} className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(74,222,128,0.12)' }}>
                  <c.icon className="w-5 h-5" style={{ color: '#4ADE80' }} />
                </div>
                <p className="font-display font-bold text-white">{c.t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{c.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span className="inline-flex items-center gap-2"><Server className="w-4 h-4" style={{ color: '#4ADE80' }} /> 99.9% uptime SLA</span>
            <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4" style={{ color: '#4ADE80' }} /> SSO & role-based access</span>
            <span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" style={{ color: '#4ADE80' }} /> Audit-ready activity logs</span>
            <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4" style={{ color: '#4ADE80' }} /> Licensed & regulated</span>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/login" className="px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110" style={{ background: GREEN }}>
              Request Enterprise Demo
            </Link>
            <a href="#resources" className="px-6 py-3.5 rounded-xl text-sm font-bold border transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}>
              Explore API Docs
            </a>
          </div>
        </div>
      </section>

      {/* ---------- Partners ---------- */}
      <section id="partners" className="bg-slate-50/60 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Partners</p>
            <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl" style={{ color: NAVY }}>An ecosystem of trusted data</h2>
            <p className="mt-3 text-gray-500">Every partner that contributes data makes scores fairer — and gets richer insight back.</p>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { icon: Landmark, t: 'Banks', d: 'Tradelines & repayment history' },
              { icon: HandCoins, t: 'Microfinance', d: 'Micro-loan performance' },
              { icon: Smartphone, t: 'Mobile Money', d: 'Wallet & airtime behaviour' },
              { icon: Zap, t: 'Utilities & Councils', d: 'Power, water & refuse collection' },
              { icon: Store, t: 'Retail & BNPL', d: 'Lay-by and instalment data' },
              { icon: KeyRound, t: 'Landlords', d: 'Verified rent payments' },
            ].map(c => (
              <div key={c.t} className="p-5 rounded-2xl bg-white border border-slate-200 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(22,163,74,0.08)' }}>
                  <c.icon className="w-5 h-5" style={{ color: GREEN }} />
                </div>
                <p className="font-display font-bold text-sm" style={{ color: NAVY }}>{c.t}</p>
                <p className="mt-1 text-[12px] text-gray-500 leading-snug">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold border-2 transition-colors hover:bg-green-50" style={{ borderColor: GREEN, color: '#15803D' }}>
              Become a Data Partner <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section id="about" className="bg-white border-t border-slate-100 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>About Us</p>
            <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl" style={{ color: NAVY }}>Financial inclusion, built on trust</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Millions of people pay rent, bills and school fees on time — yet remain invisible to
              traditional credit systems. SocialScore was founded in Lusaka to change that: a licensed
              trust intelligence platform that turns everyday reliability into real opportunity.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              We operate under Bank of Zambia oversight and the Data Protection Act, with fairness
              and transparency reviews built into every scoring model we ship.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: '#15803D' }}>
              <Globe2 className="w-5 h-5" /> Headquartered in Lusaka · Serving the region
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['2.4M+', 'Trust profiles maintained'], ['180+', 'Institutions & partners'], ['94.7%', 'Score accuracy'], ['21 days', 'Max dispute resolution']].map(([v, l]) => (
              <div key={l} className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <p className="font-display font-extrabold text-3xl" style={{ color: NAVY }}>{v}</p>
                <p className="mt-1 text-[13px] text-gray-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Resources ---------- */}
      <section id="resources" className="bg-slate-50/60 scroll-mt-[72px]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 lg:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: GREEN }}>Resources</p>
            <h2 className="mt-2 font-display font-extrabold text-3xl md:text-4xl" style={{ color: NAVY }}>Everything you need to get started</h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { icon: BookOpen, t: 'Documentation', d: 'Platform guides for tenants, admins and data officers.' },
              { icon: Code2, t: 'API Reference', d: 'REST APIs for reports, scores, consent and data submission.' },
              { icon: Gauge, t: 'Scoring Methodology', d: 'How the six score dimensions are calculated and calibrated.' },
              { icon: LifeBuoy, t: 'Help Center', d: 'FAQs, dispute guides and support for consumers and partners.' },
            ].map(c => (
              <Link key={c.t} href="/login" className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-green-500/50 hover:shadow-md transition-all block">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(22,163,74,0.08)' }}>
                  <c.icon className="w-5 h-5" style={{ color: GREEN }} />
                </div>
                <p className="font-display font-bold" style={{ color: NAVY }}>{c.t}</p>
                <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">{c.d}</p>
                <p className="mt-3 text-[13px] font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: GREEN }}>
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Trust bar ---------- */}
      <section id="trust" className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="rounded-2xl border border-slate-200 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-6 md:p-8 flex items-start gap-4">
              <Lock className="w-7 h-7 shrink-0 mt-0.5" style={{ color: GREEN }} />
              <div>
                <p className="font-display font-bold text-gray-900">Your data is safe with us.</p>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  We use bank-level security and comply with data protection laws to ensure your
                  information is always secure and private.
                </p>
              </div>
            </div>
            <div className="p-6 md:p-8 flex items-start gap-4">
              <BadgeCheck className="w-7 h-7 shrink-0 mt-0.5" style={{ color: GREEN }} />
              <div>
                <p className="font-display font-bold" style={{ color: '#15803D' }}>Licensed. Compliant. Trusted.</p>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  Building a more inclusive financial future for everyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <Logo />
          <p>© {new Date().getFullYear()} SocialScore. All rights reserved.</p>
          <Link href="/login" className="font-semibold hover:underline" style={{ color: GREEN }}>Log in to your account →</Link>
        </div>
      </footer>
    </div>
  );
}
