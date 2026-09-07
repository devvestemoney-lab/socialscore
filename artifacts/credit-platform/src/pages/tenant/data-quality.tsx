import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { BadgeCheck, CheckCircle2, Crosshair, Clock3, Trophy, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const scoreOf = (r: any) => Math.round((Number(r.completeness) * 0.4 + Number(r.accuracy) * 0.4 + Number(r.timeliness) * 0.2) * 10) / 10;
const barColor = (v: number) => (v >= 97 ? '#10B981' : v >= 92 ? '#F59E0B' : '#EF4444');

export default function TenantDataQuality() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/data-quality`);
      setData(res.ok ? await res.json() : null);
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { latest, score, rank, peerCount, peerAverage, reviews, issues, uploadTrend } = data;

  const dims = latest ? [
    { name: 'Completeness', value: Number(latest.completeness), weight: '40%', note: 'Required fields present on every record' },
    { name: 'Accuracy', value: Number(latest.accuracy), weight: '40%', note: 'Values reconcile against source systems' },
    { name: 'Timeliness', value: Number(latest.timeliness), weight: '20%', note: 'Cycles received by the statutory deadline' },
  ] : [];

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BadgeCheck} tint="#10B981" title="Data Quality"
          subtitle="How the bureau scores your institution's contributed data" />

        <KpiGrid items={[
          { label: 'Overall Quality Score', value: score != null ? `${score}%` : '—', icon: BadgeCheck, tint: '#10B981',
            sub: peerAverage != null ? `peer average ${peerAverage}%` : undefined },
          { label: 'Bureau Ranking', value: rank ? `#${rank}` : '—', icon: Trophy, tint: '#F59E0B', sub: peerCount ? `of ${peerCount} contributors` : undefined },
          { label: 'Completeness', value: latest ? `${Number(latest.completeness).toFixed(1)}%` : '—', icon: CheckCircle2, tint: '#4F6EF7' },
          { label: 'Accuracy', value: latest ? `${Number(latest.accuracy).toFixed(1)}%` : '—', icon: Crosshair, tint: '#6366F1' },
          { label: 'Timeliness', value: latest ? `${Number(latest.timeliness).toFixed(0)}%` : '—', icon: Clock3, tint: '#14B8A6' },
        ]} />

        {score != null && peerAverage != null && (
          <div className={cn('flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm',
            score >= peerAverage ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800')}>
            <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
            Your score of {score}% is {score >= peerAverage ? 'above' : 'below'} the bureau-wide average of {peerAverage}%
            {rank && ` — ranked #${rank} of ${peerCount} contributing institutions.`}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Quality Dimensions" subtitle="Weighted: completeness 40% · accuracy 40% · timeliness 20%" padded>
            <div className="space-y-4">
              {dims.map(d => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900">{d.name} <span className="text-xs text-muted-foreground ml-1">{d.weight}</span></span>
                    <span className="text-muted-foreground">{d.value.toFixed(1)}%</span>
                  </div>
                  <Bar value={d.value} color={barColor(d.value)} />
                  <p className="text-[11px] text-gray-400 mt-1">{d.note}</p>
                </div>
              ))}
              {dims.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No quality review recorded yet.</p>}
            </div>
          </Panel>

          <Panel title="Rejection Trend" subtitle="Rejected records per submitted batch">
            <Table head={['Period', 'Submitted', 'Rejected', 'Rejection rate']}>
              {uploadTrend.map((t: any) => {
                const rate = t.submitted > 0 ? (t.rejected / t.submitted) * 100 : 0;
                return (
                  <tr key={t.period} className="hover:bg-slate-50/70 transition-colors">
                    <Td className="font-semibold text-gray-900">{t.period}</Td>
                    <Td>{t.submitted.toLocaleString()}</Td>
                    <Td className={t.rejected > 1000 ? 'text-rose-600 font-semibold' : ''}>{t.rejected.toLocaleString()}</Td>
                    <Td className={rate > 1 ? 'text-amber-600 font-medium' : 'text-emerald-600'}>{rate.toFixed(2)}%</Td>
                  </tr>
                );
              })}
              {uploadTrend.length === 0 && <tr><Td colSpan={4} className="text-center text-muted-foreground py-6">No uploads recorded yet.</Td></tr>}
            </Table>
          </Panel>
        </div>

        <Panel title="Quality Reviews by Period">
          <Table head={['Period', 'Completeness', 'Accuracy', 'Timeliness', 'Overall', '']}>
            {reviews.map((r: any) => {
              const s = scoreOf(r);
              return (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{r.period}</Td>
                  <Td>{Number(r.completeness).toFixed(1)}%</Td>
                  <Td>{Number(r.accuracy).toFixed(1)}%</Td>
                  <Td>{Number(r.timeliness).toFixed(0)}%</Td>
                  <Td className="font-bold text-gray-900">{s}%</Td>
                  <Td className="w-40"><Bar value={s} color={barColor(s)} /></Td>
                </tr>
              );
            })}
            {reviews.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-6">No reviews yet.</Td></tr>}
          </Table>
        </Panel>

        {issues.length > 0 && (
          <Panel title="Issues Raised Against Your Data">
            <Table head={['Issue', 'Affected Records', 'Severity', 'Status']}>
              {issues.map((i: any) => (
                <tr key={i.id} className={i.status === 'resolved' ? 'opacity-55' : 'hover:bg-slate-50/70 transition-colors'}>
                  <Td>
                    <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                      <AlertTriangle className={i.severity === 'high' ? 'w-4 h-4 text-rose-500' : i.severity === 'medium' ? 'w-4 h-4 text-amber-500' : 'w-4 h-4 text-slate-400'} />
                      {i.issue}
                    </span>
                  </Td>
                  <Td>{i.affectedRecords.toLocaleString()}</Td>
                  <Td><Badge tone={i.severity === 'high' ? 'red' : i.severity === 'medium' ? 'amber' : 'slate'}>{i.severity}</Badge></Td>
                  <Td><Badge tone={i.status === 'open' ? 'red' : 'green'}>{i.status}</Badge></Td>
                </tr>
              ))}
            </Table>
          </Panel>
        )}
      </div>
    </Layout>
  );
}
