import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Download, FileText, Gauge, Scale, CheckCircle2, Loader2, Info } from 'lucide-react';
import { API, money, fmtDate } from './kit';
import { cn } from '@/lib/utils';

const KINDS = [
  { key: 'full_report', icon: FileText, tint: '#10B981', title: 'Full credit report', desc: 'Everything on your file: accounts, balances, payment history and searches' },
  { key: 'score_only', icon: Gauge, tint: '#14B8A6', title: 'Score certificate', desc: 'A one-page summary of your score and band — handy for applications' },
  { key: 'dispute_pack', icon: Scale, tint: '#F59E0B', title: 'Dispute pack', desc: 'Your report plus the evidence trail for any open disputes' },
];

export default function DownloadReport() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [kind, setKind] = useState('full_report');
  const [format, setFormat] = useState('pdf');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);

  async function load() {
    const res = await request(`${API}/consumer/downloads`);
    setData(res.ok ? await res.json() : null);
  }
  useEffect(() => { load(); }, []);

  async function requestReport() {
    setBusy(true);
    const res = await request(`${API}/consumer/downloads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, format }),
    });
    setBusy(false);
    if (res.ok) { setDone(await res.json()); load(); }
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { allowance } = data;
  const free = allowance.remaining > 0;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Download} tint="#10B981" title="Download My Report"
          subtitle="Get a copy of your credit file to keep, print or share with a lender" />

        <Panel padded>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-semibold text-gray-900">Your free reports this year</p>
                <p className="text-sm font-bold text-emerald-600">{allowance.remaining} of {allowance.perYear} left</p>
              </div>
              <Bar value={(allowance.used / allowance.perYear) * 100} color={free ? '#10B981' : '#F59E0B'} />
              <p className="text-xs text-muted-foreground mt-2">
                {free
                  ? `The law entitles you to ${allowance.perYear} free copies every year. Additional copies cost ${money(allowance.priceAfter)}.`
                  : `You've used your free allowance. Additional copies cost ${money(allowance.priceAfter)} each, payable by mobile money.`}
              </p>
            </div>
          </div>
        </Panel>

        {done && (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Report {done.download.reference} is ready</p>
              <p className="text-sm text-gray-700 mt-0.5">
                {done.freeUsed ? 'This used one of your free allowance.' : `${money(done.charged)} was charged to your mobile money.`}
                {' '}It's available under Report History for 90 days.
              </p>
            </div>
            <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shrink-0">
              Open
            </button>
          </div>
        )}

        <Panel title="What would you like?" padded>
          <div className="grid md:grid-cols-3 gap-4">
            {KINDS.map(k => (
              <button key={k.key} onClick={() => setKind(k.key)}
                className={cn('p-5 rounded-xl border text-left transition-all',
                  kind === k.key ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-slate-300')}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                  <k.icon className="w-5 h-5" style={{ color: k.tint }} />
                </div>
                <p className="font-semibold text-gray-900">{k.title}</p>
                <p className="text-[13px] text-muted-foreground mt-1">{k.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Format</span>
              {['pdf', 'csv'].map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={cn('px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase border transition',
                    format === f ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200')}>{f}</button>
              ))}
            </div>
            <button onClick={requestReport} disabled={busy}
              className="ml-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {free ? 'Get my free report' : `Buy for ${money(allowance.priceAfter)}`}
            </button>
          </div>
        </Panel>

        <Panel padded>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Your report is generated at the moment you request it, so it always reflects the latest information lenders
            have submitted. Downloading your own report never affects your score.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
