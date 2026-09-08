import { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { GraduationCap, TrendingUp, ShieldCheck, Wallet, CalendarClock, AlertTriangle, Sparkles, ChevronDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const BANDS = [
  { band: 'A', range: '720 – 850', label: 'Excellent', color: '#10B981', what: 'Lenders compete for you. Expect the best rates and the highest limits.' },
  { band: 'B', range: '660 – 719', label: 'Good', color: '#14B8A6', what: 'Most applications are approved at standard rates.' },
  { band: 'C', range: '580 – 659', label: 'Fair', color: '#F59E0B', what: 'You will usually be approved, but at higher interest.' },
  { band: 'D', range: '480 – 579', label: 'Poor', color: '#F97316', what: 'Approvals are harder. Smaller amounts and security may be required.' },
  { band: 'E', range: '300 – 479', label: 'Very poor', color: '#EF4444', what: 'Most lenders will decline. Focus on clearing arrears first.' },
];

const FACTORS = [
  { icon: CalendarClock, tint: '#10B981', weight: '30%', title: 'Paying on time', body: 'The single biggest factor. Every payment made on the due date builds your score; a payment more than 30 days late damages it and stays on your file for years.', tips: ['Set a standing order for the day after payday', 'If you will be late, talk to your lender before the due date', 'Even the minimum payment on time beats a missed one'] },
  { icon: TrendingUp, tint: '#14B8A6', weight: '25%', title: 'How you use your money', body: 'Steady, predictable income and spending — including mobile money — shows lenders you can absorb a repayment.', tips: ['Keep income flowing through the same account', 'Avoid running your balance to zero every month', 'Regular mobile money activity counts in your favour'] },
  { icon: AlertTriangle, tint: '#EF4444', weight: '20%', title: 'Defaults and arrears', body: 'A default is the most damaging mark on a credit file. Settling it does not erase it, but a settled default is far better than an open one.', tips: ['Settle old defaults — the record then shows "settled"', 'Never ignore a demand letter; agree a plan instead', 'Defaults fall off your file after 5 years'] },
  { icon: Wallet, tint: '#4F6EF7', weight: '15%', title: 'Mobile money footprint', body: 'In Zambia much of the economy runs on mobile money. Consistent wallet activity gives the bureau evidence of income where a payslip does not exist.', tips: ['Use one main wallet rather than several', 'Keep your wallet registered in your own name and NRC', 'Salary or business receipts into the wallet help most'] },
  { icon: ShieldCheck, tint: '#8B5CF6', weight: '10%', title: 'How long your history is', body: 'A long, calm history is worth more than a short perfect one. Your oldest account anchors your score, so closing it can cost you points.', tips: ['Keep your oldest account open even if rarely used', 'Add new credit slowly, not all at once', 'Time alone improves this factor — be patient'] },
];

const MYTHS = [
  { myth: 'Checking my own score lowers it', truth: 'Never. Looking at your own file is a "soft" check and is invisible to lenders. Only a lender pulling a full report with your consent is recorded as a hard search.' },
  { myth: 'There is a national blacklist', truth: 'There is no blacklist. Lenders see your actual record — accounts, balances and payment history — and make their own decision.' },
  { myth: 'Paying off a default erases it', truth: 'It does not erase it, but it changes the record to "settled", which lenders view far more favourably than an open default.' },
  { myth: 'Having no credit means a good score', truth: 'No history means lenders have nothing to judge you on. A small, well-managed account builds a record faster than staying invisible.' },
  { myth: 'My spouse\'s debts affect my score', truth: 'Your file is tied to your NRC alone. Only accounts you hold or guarantee appear on it.' },
];

export default function CreditEducation() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={GraduationCap} tint="#0EA5E9" title="Credit Education"
          subtitle="Understand what your score means and how to move it in the right direction"
          actions={
            <Link href="/my/simulator" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Try the simulator
            </Link>
          } />

        <Panel title="What the score bands mean" subtitle="Every score sits between 300 and 850" padded>
          <div className="flex h-3 rounded-full overflow-hidden mb-5">
            {BANDS.slice().reverse().map(b => <div key={b.band} className="flex-1" style={{ background: b.color }} />)}
          </div>
          <div className="grid md:grid-cols-5 gap-3">
            {BANDS.map(b => (
              <div key={b.band} className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: b.color }}>{b.band}</span>
                  <span className="text-sm font-semibold text-gray-900">{b.label}</span>
                </div>
                <p className="text-xs font-mono text-gray-500 mt-2">{b.range}</p>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{b.what}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="The five things that build your score" subtitle="Ranked by how much they matter">
          <div className="divide-y divide-slate-100">
            {FACTORS.map((f, i) => (
              <div key={f.title}>
                <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/70 transition-colors">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${f.tint}1A` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.tint }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{f.title}</p>
                    <p className="text-[13px] text-muted-foreground truncate">{f.body}</p>
                  </div>
                  <Badge tone="slate">{f.weight} of your score</Badge>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform shrink-0', open === i && 'rotate-180')} />
                </button>
                {open === i && (
                  <div className="px-6 pb-5 pl-20">
                    <p className="text-sm text-gray-700 leading-relaxed">{f.body}</p>
                    <ul className="mt-3 space-y-1.5">
                      {f.tips.map(t => (
                        <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: f.tint }} />{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Common myths" subtitle="What people believe, and what is actually true" padded>
          <div className="grid md:grid-cols-2 gap-4">
            {MYTHS.map(m => (
              <div key={m.myth} className="p-4 rounded-xl border border-slate-200 bg-white">
                <p className="text-sm font-semibold text-rose-600 line-through decoration-rose-300">{m.myth}</p>
                <p className="text-[13px] text-gray-700 mt-2 leading-relaxed"><b className="text-emerald-600">Actually:</b> {m.truth}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel padded>
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900">A realistic plan if your score is low</p>
              <ol className="mt-2 space-y-1.5 text-muted-foreground list-decimal list-inside">
                <li>Read your report and dispute anything that is wrong — that is free and can help immediately.</li>
                <li>Bring any account in arrears back up to date; this stops further damage within one reporting cycle.</li>
                <li>Settle open defaults, oldest first. A settled default reads very differently to a lender.</li>
                <li>Make every payment on time for six months. This is where most of the recovery comes from.</li>
                <li>Only then apply for new credit — several applications in a short window looks like distress.</li>
              </ol>
            </div>
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
