import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { BookOpen, Banknote, AlertTriangle, Scale } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const money = (v: number) =>
  v >= 1_000_000_000 ? `K${(v / 1_000_000_000).toFixed(2)}B`
  : v >= 1_000_000 ? `K${(v / 1_000_000).toFixed(2)}M`
  : `K${Math.round(v).toLocaleString()}`;
const nplColor = (v: number) => (v <= 5 ? '#10B981' : v <= 10 ? '#F59E0B' : '#EF4444');

export default function PortfolioMonitoring() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/admin/portfolio`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { books, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BookOpen} tint="#4F6EF7" title="Portfolio Monitoring"
          subtitle="System-wide view of loan books reported by participating institutions" />

        <KpiGrid items={[
          { label: 'Active Loans (System)', value: summary.activeLoans.toLocaleString(), icon: BookOpen, tint: '#4F6EF7' },
          { label: 'Total Outstanding', value: money(summary.totalOutstanding), icon: Banknote, tint: '#10B981', sub: 'excluding closed facilities' },
          { label: 'System NPL Ratio', value: `${summary.systemNpl}%`, icon: AlertTriangle, tint: summary.systemNpl > 10 ? '#EF4444' : '#F59E0B', sub: 'BoZ threshold: 10%' },
          { label: 'Avg Loan Size', value: money(summary.avgLoan), icon: Scale, tint: '#8B5CF6' },
        ]} />

        <Panel title="Institution Loan Books" subtitle="Computed live from reported tradelines">
          <Table head={['Institution', 'Active Loans', 'Outstanding', 'Avg Loan', 'NPL Ratio', '', 'Trend']}>
            {books.map((b: any) => (
              <tr key={b.institution} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{b.institution}</Td>
                <Td>{b.activeLoans.toLocaleString()}</Td>
                <Td>{money(b.outstanding)}</Td>
                <Td className="text-muted-foreground">{money(b.avgLoan)}</Td>
                <Td className={b.nplRatio > 10 ? 'font-semibold text-rose-600' : 'font-semibold'}>{b.nplRatio}%</Td>
                <Td className="w-40"><Bar value={Math.min(100, b.nplRatio * 5)} color={nplColor(b.nplRatio)} /></Td>
                <Td><Badge tone={b.trend === 'improving' ? 'green' : b.trend === 'stable' ? 'blue' : 'red'}>{b.trend}</Badge></Td>
              </tr>
            ))}
          </Table>
          {summary.breaches.length > 0 && (
            <p className="px-5 py-3 text-xs text-rose-600 border-t border-slate-100">
              ⚠ {summary.breaches.join(' and ')} exceed{summary.breaches.length === 1 ? 's' : ''} the 10% regulatory NPL threshold — flagged for supervisory review in Alerts.
            </p>
          )}
        </Panel>
      </div>
    </Layout>
  );
}
