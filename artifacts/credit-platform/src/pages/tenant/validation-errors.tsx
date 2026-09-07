import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { FileX2, Download, AlertTriangle, RotateCcw, ListX } from 'lucide-react';

const errors = [
  { code: 'E-104', error: 'NRC missing or malformed', records: 1204, sample: 'rows 1,022–2,226', fix: 'Populate customer NRC from KYC records' },
  { code: 'E-211', error: 'Balance negative on active facility', records: 486, sample: 'rows 88,410+', fix: 'Check reversal postings before extract' },
  { code: 'E-307', error: 'Disbursement date after reporting period', records: 342, sample: 'various', fix: 'Exclude facilities opened after month-end' },
  { code: 'E-118', error: 'Unknown branch code', records: 217, sample: 'BR-091, BR-112', fix: 'Register new branches under Administration' },
  { code: 'E-402', error: 'Duplicate account reference in batch', records: 100, sample: 'ACC-3312xx', fix: 'De-duplicate on account + product code' },
];

export default function ValidationErrors() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ListX} tint="#EF4444" title="Validation Errors"
          subtitle="Rejected records from your August 2026 submission — fix and resubmit"
          actions={<button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium"><Download className="w-4 h-4" /> Download Error File</button>} />
        <KpiGrid items={[
          { label: 'Rejected Records', value: '2,349', icon: FileX2, tint: '#EF4444', sub: '0.6% of submission' },
          { label: 'Distinct Error Types', value: 5, icon: AlertTriangle, tint: '#F59E0B' },
          { label: 'Correctable', value: '2,349', icon: RotateCcw, tint: '#10B981', sub: 'resubmit as corrections batch' },
          { label: 'Resubmission Deadline', value: '12 Sep', icon: FileX2, tint: '#4F6EF7' },
        ]} />
        <Panel title="Error Breakdown" subtitle="Grouped by validation rule">
          <Table head={['Code', 'Error', 'Records', 'Sample Location', 'Suggested Fix']}>
            {errors.map(e => (
              <tr key={e.code} className="hover:bg-slate-50/70 transition-colors">
                <Td><Badge tone="red">{e.code}</Badge></Td>
                <Td className="font-medium text-gray-900">{e.error}</Td>
                <Td>{e.records.toLocaleString()}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{e.sample}</Td>
                <Td className="text-muted-foreground max-w-[280px] whitespace-normal">{e.fix}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
