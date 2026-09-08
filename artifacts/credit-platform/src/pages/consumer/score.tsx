import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Gauge, TrendingUp, TrendingDown, Sparkles, Info, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API, ScoreDial, FactorRow, FACTOR_HINTS, BAND_COLOR, fmtDate } from './kit';
import { cn } from '@/lib/utils';

const BANDS = [
  { band: 'E', range: '300–479', label: 'Very poor', meaning: 'Most lenders will decline. Focus on clearing arrears.' },
  { band: 'D', range: '480–579', label: 'Poor', meaning: 'Approval is difficult and rates will be high.' },
  { band: 'C', range: '580–659', label: 'Fair', meaning: 'You can borrow, but not at the best rates.' },
  { band: 'B', range: '660–719', label: 'Good', meaning: 'Most lenders will approve you on standard terms.' },
  { band: 'A', range: '720–850', label: 'Excellent', meaning: 'You qualify for the best rates and highest limits.' },
];

export default function MyCreditScore() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/overview`);
      setData(res.ok ? await res.json() : null);
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { score, history } = data;

  if (!score) return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Gauge} tint="#14B8A6" title="My Credit Score" subtitle="Your score and what drives it" />
        <Panel padded><p className="text-center text-muted-foreground py-12">
          You do not have a credit score yet. Once you have a few months of credit activity we can calculate one.
        </p></Panel>
      </div>
    </Layout>
  );

  const chart = history.map((h: any) => ({ date: new Date(h.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), score: h.score }));
  const factors = Object.entries(FACTOR_HINTS).map(([k, m]) => ({ key: k, ...m, value: Number(score.breakdown?.[k] ?? 0) }));
  const weakest = [...factors].sort((a, b) => a.value - b.value).slice(0, 2);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Gauge} tint="#14B8A6" title="My Credit Score"
          subtitle={`Last updated ${fmtDate(score.updatedAt)}`} />

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel padded>
            <div className="flex flex-col items-center">
              <ScoreDial score={score.value} band={score.band} rating={score.rating} size={220} />
              {score.change != null && (
                <p className={cn('mt-3 inline-flex items-center gap-1.5 text-sm font-semibold',
                  score.change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {score.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {score.change >= 0 ? '+' : ''}{score.change} since last time
                </p>
              )}
              <p className="text-sm text-gray-700 mt-4 text-center px-2">{score.recommendation}</p>
            </div>
          </Panel>

          <Panel title="How your score has moved" className="lg:col-span-2" padded>
            {chart.length > 1 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="csGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[300, 850]} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke="#14B8A6" strokeWidth={2.5} fill="url(#csGrad2)"
                      dot={{ r: 3.5, fill: '#fff', stroke: '#14B8A6', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-16 text-center">We'll chart your progress once you've been scored more than once.</p>
            )}
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="What's affecting your score" subtitle="Ranked by how much lenders weight them" padded>
            <div className="space-y-4">
              {factors.map(f => <FactorRow key={f.key} label={f.label} value={f.value} hint={f.hint} />)}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="Where to focus" subtitle="The two areas holding you back most" padded>
              <div className="space-y-3">
                {weakest.map(f => (
                  <div key={f.key} className="p-4 rounded-xl border border-amber-200 bg-amber-50/60">
                    <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                    <p className="text-xs text-gray-600 mt-1">{f.hint}</p>
                  </div>
                ))}
              </div>
              <Link href="/my/simulator" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
                <Sparkles className="w-4 h-4" /> See what would change my score
              </Link>
            </Panel>

            <Panel title="What the bands mean" padded>
              <div className="space-y-2.5">
                {[...BANDS].reverse().map(b => (
                  <div key={b.band} className={cn('flex items-start gap-3 p-2.5 rounded-lg', b.band === score.band && 'bg-slate-50 ring-1 ring-slate-200')}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: BAND_COLOR[b.band] }}>{b.band}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {b.label} <span className="text-xs text-muted-foreground ml-1">{b.range}</span>
                        {b.band === score.band && <span className="ml-2 text-[10px] font-bold text-emerald-600">YOU ARE HERE</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <Panel padded>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            Checking your own score never affects it. Only full checks by lenders when you apply for credit are visible to others.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
