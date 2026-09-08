import { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { PageHeader, Panel } from '@/components/admin/page-kit';
import { HelpCircle, Search, ChevronDown, Phone, Mail, MapPin } from 'lucide-react';
import { inputCls } from '@/components/admin/page-kit';
import { cn } from '@/lib/utils';

const FAQS = [
  { cat: 'My score', q: 'How is my credit score calculated?', a: 'Your score is built from the information lenders, mobile money operators and utilities submit about you: whether you pay on time, how long your accounts have been open, any defaults, and your transaction patterns. It is recalculated whenever new information arrives, usually monthly.' },
  { cat: 'My score', q: 'Why did my score change when nothing happened?', a: 'Scores move as data ages. A late payment carries less weight over time, and your accounts get older, which helps. A lender may also have submitted an updated balance since you last looked.' },
  { cat: 'My score', q: 'Does checking my own score lower it?', a: 'No. Viewing your own file is a soft check. It is not visible to lenders and has no effect on your score, no matter how often you look.' },
  { cat: 'My score', q: 'How quickly can I improve my score?', a: 'Bringing an account out of arrears can show within one reporting cycle — about a month. Rebuilding after a default typically takes six to twelve months of consistent on-time payments.' },
  { cat: 'My report', q: 'How often can I get a free report?', a: 'You are entitled to two free copies of your credit report every year. Additional copies are charged at a small fee, payable by mobile money.' },
  { cat: 'My report', q: 'How long does information stay on my file?', a: 'Closed accounts in good standing stay for 5 years. Defaults stay for 5 years from the date they were reported, whether or not you settle them — though settling changes the status. Credit searches stay visible for 12 months.' },
  { cat: 'My report', q: 'An account on my report is not mine. What do I do?', a: 'Raise a dispute from the Disputes & Corrections page. The bureau contacts the lender, who must provide evidence. If they cannot, the record is removed and your score is recalculated. There is no charge.' },
  { cat: 'My report', q: 'How long does a dispute take?', a: 'The bureau must resolve your dispute within 21 days. Most are closed sooner. You are alerted at every step and can track progress on the Disputes page.' },
  { cat: 'Who sees my data', q: 'Who can look at my credit file?', a: 'Only a licensed lender, and only with your permission. Every search is logged and shown to you on the Credit Inquiries page. If you see a search you did not authorise, dispute it.' },
  { cat: 'Who sees my data', q: 'Can I stop a lender seeing my file?', a: 'Yes. On the Consent & Data Access page you can withdraw permission at any time. Lenders you already borrow from must still report on those existing accounts, as the law requires.' },
  { cat: 'Who sees my data', q: 'Does my employer or landlord see my score?', a: 'Not without your explicit consent, and only where the law permits. They cannot pull your report simply because they know your NRC.' },
  { cat: 'My account', q: 'I changed my phone number. How do I sign in?', a: 'You sign in with your NRC, and the passcode is sent to the number on your bureau record. Update your number on the My Profile page first, or contact us with your NRC and a copy of your ID.' },
  { cat: 'My account', q: 'What if I never receive the passcode?', a: 'Check that the number ending shown on the sign-in screen is yours. If it is not, your lender may have submitted an old number — update it on My Profile or contact us to correct it.' },
  { cat: 'Cost', q: 'What do I have to pay for?', a: 'Seeing your score, viewing who searched your file, raising disputes and correcting errors are always free. You only pay for report copies beyond your two free ones each year.' },
];

const CATS = ['All', ...Array.from(new Set(FAQS.map(f => f.cat)))];

export default function Faqs() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<string | null>(FAQS[0].q);

  const shown = FAQS.filter(f =>
    (cat === 'All' || f.cat === cat) &&
    (!q || (f.q + f.a).toLowerCase().includes(q.toLowerCase())));

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={HelpCircle} tint="#64748B" title="FAQs"
          subtitle="Straight answers to the questions we're asked most" />

        <Panel padded>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={cn(inputCls, 'pl-10')} placeholder="Search the answers…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap mt-4">
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
                  cat === c ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{c}</button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="divide-y divide-slate-100">
            {shown.map(f => (
              <div key={f.q}>
                <button onClick={() => setOpen(open === f.q ? null : f.q)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/70 transition-colors">
                  <span className="flex-1 font-medium text-gray-900">{f.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform shrink-0', open === f.q && 'rotate-180')} />
                </button>
                {open === f.q && <p className="px-6 pb-5 text-sm text-gray-700 leading-relaxed max-w-3xl">{f.a}</p>}
              </div>
            ))}
            {shown.length === 0 && <p className="text-center text-muted-foreground py-10">No answer matches "{q}". Try different words, or contact us below.</p>}
          </div>
        </Panel>

        <Panel title="Still need help?" subtitle="Our consumer support team answers within one working day" padded>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Phone, tint: '#10B981', label: 'Call us', value: '+260 211 123 456', sub: 'Mon–Fri, 08:00–17:00' },
              { icon: Mail, tint: '#4F6EF7', label: 'Email us', value: 'help@socialscore.zm', sub: 'Quote your NRC' },
              { icon: MapPin, tint: '#8B5CF6', label: 'Visit us', value: 'Cairo Road, Lusaka', sub: 'Bring your NRC' },
            ].map(c => (
              <div key={c.label} className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${c.tint}1A` }}>
                  <c.icon className="w-5 h-5" style={{ color: c.tint }} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{c.label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Think something on your file is wrong? You don't need to call — raise it on the{' '}
            <Link href="/my/disputes" className="text-emerald-700 font-medium hover:underline">Disputes & Corrections</Link> page and we'll investigate.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
