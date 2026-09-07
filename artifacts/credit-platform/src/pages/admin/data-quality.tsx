import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { BadgeCheck, CheckCircle2, Crosshair, CircleAlert, AlertTriangle } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const barColor = (v: number) => (v >= 97 ? '#10B981' : v >= 92 ? '#F59E0B' : '#EF4444');
const overall = (r: any) => Number(r.completeness) * 0.4 + Number(r.accuracy) * 0.4 + Number(r.timeliness) * 0.2;

export default function DataQuality() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await request(`${API}/admin/data-quality`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    await request(`${API}/admin/data-quality/issues/${id}/resolve`, { method: 'PUT' });
    load();
  }

  const kpis = useMemo(() => {
    if (!data) return null;
    const rs = data.reviews;
    const avg = (f: (r: any) => number) => rs.length ? rs.reduce((a: number, r: any) => a + f(r), 0) / rs.length : 0;
    return {
      overall: avg(overall).toFixed(1),
      completeness: avg((r: any) => Number(r.completeness)).toFixed(1),
      accuracy: avg((r: any) => Number(r.accuracy)).toFixed(1),
      openIssues: data.issues.filter((i: any) => i.status === 'open').length,
    };
  }, [data]);

  if (!data || !kpis) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BadgeCheck} tint="#10B981" title="Data Quality"
          subtitle="Completeness, accuracy and timeliness scoring per contributing institution" />

        <KpiGrid items={[
          { label: 'Overall Quality Score', value: `${kpis.overall}%`, icon: BadgeCheck, tint: '#10B981', sub: 'weighted across institutions' },
          { label: 'Completeness', value: `${kpis.completeness}%`, icon: CheckCircle2, tint: '#4F6EF7' },
          { label: 'Accuracy', value: `${kpis.accuracy}%`, icon: Crosshair, tint: '#6366F1' },
          { label: 'Open Issues', value: kpis.openIssues, icon: CircleAlert, tint: '#EF4444' },
        ]} />

        <Panel title="Quality Scorecard by Institution" subtitle="Weighted: completeness 40% · accuracy 40% · timeliness 20% · period 2026-08">
          <Table head={['Institution', 'Completeness', 'Accuracy', 'Timeliness', 'Overall', '']}>
            {data.reviews.map((r: any) => {
              const score = overall(r);
              return (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{r.institutionName}</Td>
                  <Td>{Number(r.completeness).toFixed(1)}%</Td>
                  <Td>{Number(r.accuracy).toFixed(1)}%</Td>
                  <Td className={Number(r.timeliness) < 70 ? 'text-rose-600 font-semibold' : ''}>{Number(r.timeliness).toFixed(0)}%</Td>
                  <Td className="font-bold text-gray-900">{score.toFixed(1)}%</Td>
                  <Td className="w-40"><Bar value={score} color={barColor(score)} /></Td>
                </tr>
              );
            })}
          </Table>
        </Panel>

        <Panel title="Validation Issues" subtitle="Ordered by severity and affected volume">
          <Table head={['Issue', 'Affected Records', 'Primary Source', 'Severity', 'Status', 'Actions']}>
            {data.issues.map((i: any) => (
              <tr key={i.id} className={i.status === 'resolved' ? 'opacity-50' : 'hover:bg-slate-50/70 transition-colors'}>
                <Td>
                  <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                    <AlertTriangle className={i.severity === 'high' ? 'w-4 h-4 text-rose-500' : i.severity === 'medium' ? 'w-4 h-4 text-amber-500' : 'w-4 h-4 text-slate-400'} />
                    {i.issue}
                  </span>
                </Td>
                <Td>{i.affectedRecords.toLocaleString()}</Td>
                <Td className="text-muted-foreground">{i.sourceLabel}</Td>
                <Td><Badge tone={i.severity === 'high' ? 'red' : i.severity === 'medium' ? 'amber' : 'slate'}>{i.severity}</Badge></Td>
                <Td><Badge tone={i.status === 'open' ? 'red' : 'green'}>{i.status}</Badge></Td>
                <Td>
                  {i.status === 'open' && (
                    <button onClick={() => resolve(i.id)} className="text-xs font-medium text-emerald-600 hover:underline">Mark Resolved</button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
