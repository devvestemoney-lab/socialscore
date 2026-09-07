import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileBarChart2, Users2, Timer, FileText, Download } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red', unscored: 'slate' };

export default function ReportUsage() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/usage/reports`);
      setData(await res.json());
    })();
  }, []);

  function exportCsv() {
    const rows = [['Purpose', 'Reports'], ...data.byPurpose.map((p: any) => [`"${p.purpose}"`, p.n])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `report-usage-${data.period}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { byPurpose, byBand, byDay, totals } = data;
  const maxPurpose = Math.max(1, ...byPurpose.map((p: any) => p.n));
  const maxBand = Math.max(1, ...byBand.map((b: any) => b.n));
  const peakDay = byDay.reduce((a: any, d: any) => (d.n > (a?.n ?? 0) ? d : a), null);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileBarChart2} tint="#10B981" title="Credit Report Usage"
          subtitle="How your team is consuming credit reports this billing period"
          actions={<button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium"><Download className="w-4 h-4" /> Export</button>} />

        <KpiGrid items={[
          { label: 'Reports Pulled', value: totals.total.toLocaleString(), icon: FileText, tint: '#10B981' },
          { label: 'Distinct Consumers', value: totals.consumers.toLocaleString(), icon: Users2, tint: '#4F6EF7', sub: totals.total > totals.consumers ? `${totals.total - totals.consumers} repeat pull(s)` : 'no repeats' },
          { label: 'Avg Generation Time', value: `${(totals.avg_ms / 1000).toFixed(1)}s`, icon: Timer, tint: '#F59E0B' },
          { label: 'Busiest Day', value: peakDay ? peakDay.day : '—', icon: FileBarChart2, tint: '#8B5CF6', sub: peakDay ? `${peakDay.n} report(s)` : undefined },
        ]} />

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="By Stated Purpose" subtitle="Every hard pull records a permissible purpose" padded>
            <div className="space-y-3.5">
              {byPurpose.map((p: any) => (
                <div key={p.purpose}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900 truncate pr-3">{p.purpose}</span>
                    <span className="text-muted-foreground shrink-0">{p.n}</span>
                  </div>
                  <Bar value={(p.n / maxPurpose) * 100} color="#4F6EF7" />
                </div>
              ))}
              {byPurpose.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No reports pulled this period.</p>}
            </div>
          </Panel>

          <Panel title="By Score Band" subtitle="Risk profile of the consumers you assessed" padded>
            <div className="space-y-3.5">
              {byBand.map((b: any) => (
                <div key={b.band}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-900"><Badge tone={bandTone[b.band] ?? 'slate'}>{b.band}</Badge></span>
                    <span className="text-muted-foreground">{b.n} report{b.n !== 1 ? 's' : ''}</span>
                  </div>
                  <Bar value={(b.n / maxBand) * 100} color={b.band === 'A' ? '#10B981' : b.band === 'B' ? '#4F6EF7' : b.band === 'C' ? '#F59E0B' : b.band === 'unscored' ? '#94A3B8' : '#EF4444'} />
                </div>
              ))}
              {byBand.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No reports pulled this period.</p>}
            </div>
          </Panel>
        </div>

        <Panel title="Daily Breakdown">
          <Table head={['Day', 'Reports', 'Share of period']}>
            {byDay.map((d: any) => (
              <tr key={d.day} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-medium text-gray-900">{d.day}</Td>
                <Td>{d.n}</Td>
                <Td className="w-64"><Bar value={(d.n / Math.max(1, totals.total)) * 100} color="#10B981" /></Td>
              </tr>
            ))}
            {byDay.length === 0 && <tr><Td colSpan={3} className="text-center text-muted-foreground py-6">No activity in this period.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
