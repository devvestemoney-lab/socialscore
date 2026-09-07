import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { Star, Trash2 } from 'lucide-react';

const saved = [
  { name: 'Mwansa Chileshe', savedBy: 'C. Mulenga', note: 'Pending top-up decision — review after payslip', score: 742, band: 'A', saved: '2 days ago' },
  { name: 'Joseph Sichone', savedBy: 'C. Mulenga', note: 'SME application — awaiting collateral valuation', score: 585, band: 'C', saved: '4 days ago' },
  { name: 'Thandiwe Ngoma', savedBy: 'M. Banda', note: 'Restructuring candidate — monitor arrears', score: 511, band: 'D', saved: '1 wk ago' },
  { name: 'Grace Tembo', savedBy: 'P. Lungu', note: 'VIP client — pre-approved limit review Q4', score: 793, band: 'A', saved: '2 wks ago' },
];
const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red' };

export default function SavedConsumers() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Star} tint="#F59E0B" title="Saved Consumers"
          subtitle="Bookmarked consumer files with team notes" />
        <Panel title={`Saved Profiles (${saved.length})`}>
          <Table head={['Consumer', 'Score', 'Note', 'Saved By', 'When', '']}>
            {saved.map(s => (
              <tr key={s.name} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{s.name}</Td>
                <Td><Badge tone={bandTone[s.band]}>{s.band} ({s.score})</Badge></Td>
                <Td className="text-muted-foreground max-w-[320px] whitespace-normal">{s.note}</Td>
                <Td className="text-muted-foreground">{s.savedBy}</Td>
                <Td className="text-muted-foreground">{s.saved}</Td>
                <Td><button className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
