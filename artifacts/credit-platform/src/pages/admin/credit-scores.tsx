import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Gauge, Sigma, Users2, HelpCircle } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const BAND_META: Record<string, { label: string; range: string; color: string }> = {
  A: { label: 'A · Excellent', range: '720 – 850', color: '#10B981' },
  B: { label: 'B · Good', range: '660 – 719', color: '#4F6EF7' },
  C: { label: 'C · Fair', range: '580 – 659', color: '#F59E0B' },
  D: { label: 'D · Poor', range: '480 – 579', color: '#F97316' },
  E: { label: 'E · Very Poor', range: '300 – 479', color: '#EF4444' },
};

export default function CreditScores() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/admin/credit-scores/overview`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const bandCounts: Record<string, number> = Object.fromEntries(data.bands.map((b: any) => [b.band, b.count]));
  const maxShare = Math.max(1, ...Object.values(bandCounts));
  const scoredPct = Math.round((data.scored / Math.max(1, data.totalConsumers)) * 100);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Gauge} tint="#14B8A6" title="Credit Scores"
          subtitle="System-wide score distribution, coverage and model calibration health" />

        <KpiGrid items={[
          { label: 'Average Score', value: data.avg, icon: Gauge, tint: '#14B8A6' },
          { label: 'Median Score', value: data.median, icon: Sigma, tint: '#4F6EF7' },
          { label: 'Scored Population', value: data.scored.toLocaleString(), icon: Users2, tint: '#10B981', sub: `${scoredPct}% of registry` },
          { label: 'Unscorable', value: data.unscorable.toLocaleString(), icon: HelpCircle, tint: '#F59E0B', sub: 'insufficient history' },
        ]} />

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Score Distribution" subtitle="Latest score per consumer, grouped by band" padded>
            <div className="space-y-4">
              {['A', 'B', 'C', 'D', 'E'].map(band => {
                const meta = BAND_META[band];
                const count = bandCounts[band] ?? 0;
                const share = Math.round((count / Math.max(1, data.scored)) * 100);
                return (
                  <div key={band}>
                    <div className="flex items-center justify-between mb-1.5 text-sm">
                      <span className="font-medium text-gray-900">{meta.label} <span className="text-xs text-muted-foreground ml-1">{meta.range}</span></span>
                      <span className="text-muted-foreground">{count.toLocaleString()} · {share}%</span>
                    </div>
                    <Bar value={(count / maxShare) * 100} color={meta.color} />
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Model Calibration" subtitle="Discrimination & stability of scoring models in use">
            <Table head={['Model', 'Last Calibrated', 'Gini', 'PSI', 'Status']}>
              {data.models.map((m: any) => (
                <tr key={m.model} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{m.model}</Td>
                  <Td className="text-muted-foreground">{new Date(m.calibratedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Td>
                  <Td>{m.gini.toFixed(2)}</Td>
                  <Td className={m.psi > 0.1 ? 'text-amber-600 font-semibold' : ''}>{m.psi.toFixed(2)}</Td>
                  <Td><Badge tone={m.status === 'production' ? 'green' : m.status === 'monitoring' ? 'amber' : 'slate'}>{m.status}</Badge></Td>
                </tr>
              ))}
            </Table>
            <p className="px-5 py-3 text-xs text-muted-foreground border-t border-slate-100">
              PSI &gt; 0.10 indicates population drift — models above that threshold are placed under monitoring.
            </p>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
