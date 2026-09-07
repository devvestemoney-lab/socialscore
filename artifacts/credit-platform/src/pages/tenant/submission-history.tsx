import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { History, CheckCircle2, Clock3, FileStack } from 'lucide-react';

const cycles = [
  { period: 'Aug 2026', records: 412330, accepted: 409981, rejected: 2349, status: 'accepted', onTime: true },
  { period: 'Jul 2026', records: 408112, accepted: 407890, rejected: 222, status: 'accepted', onTime: true },
  { period: 'Jun 2026', records: 401877, accepted: 398201, rejected: 3676, status: 'accepted', onTime: false },
  { period: 'May 2026', records: 396440, accepted: 396104, rejected: 336, status: 'accepted', onTime: true },
  { period: 'Apr 2026', records: 391220, accepted: 390871, rejected: 349, status: 'accepted', onTime: true },
  { period: 'Mar 2026', records: 387016, accepted: 386690, rejected: 326, status: 'accepted', onTime: true },
];

export default function SubmissionHistory() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={History} tint="#14B8A6" title="Submission History"
          subtitle="Your monthly reporting cycles over the last 12 months" />
        <KpiGrid items={[
          { label: 'Cycles Submitted', value: '12 / 12', icon: CheckCircle2, tint: '#10B981', sub: 'trailing 12 months' },
          { label: 'On-time Rate', value: '92%', icon: Clock3, tint: '#F59E0B', sub: '1 late cycle (Jun)' },
          { label: 'Records (12m)', value: '4.79M', icon: FileStack, tint: '#4F6EF7' },
          { label: 'Avg Rejection Rate', value: '0.4%', icon: History, tint: '#8B5CF6', sub: 'bureau avg: 1.6%' },
        ]} />
        <Panel title="Reporting Cycles">
          <Table head={['Period', 'Submitted', 'Accepted', 'Rejected', 'Status', 'Timeliness']}>
            {cycles.map(c => (
              <tr key={c.period} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{c.period}</Td>
                <Td>{c.records.toLocaleString()}</Td>
                <Td className="text-emerald-600">{c.accepted.toLocaleString()}</Td>
                <Td className={c.rejected > 1000 ? 'text-rose-600 font-semibold' : ''}>{c.rejected.toLocaleString()}</Td>
                <Td><Badge tone="green">{c.status}</Badge></Td>
                <Td><Badge tone={c.onTime ? 'green' : 'amber'}>{c.onTime ? 'on time' : 'late'}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
