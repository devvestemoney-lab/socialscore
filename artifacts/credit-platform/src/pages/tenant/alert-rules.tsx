import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Toggle } from '@/components/admin/page-kit';
import { SlidersHorizontal, Plus } from 'lucide-react';

const initial = [
  { name: 'Score drop > 30 pts', scope: 'Monitored consumers', channel: 'Email + in-app', sev: 'high', on: true },
  { name: 'Competitor hard inquiry on borrower', scope: 'All active borrowers', channel: 'In-app', sev: 'high', on: true },
  { name: 'External arrears event (30+ DPD)', scope: 'All active borrowers', channel: 'Email + in-app', sev: 'medium', on: true },
  { name: 'New tradeline opened elsewhere', scope: 'Watchlists only', channel: 'In-app', sev: 'medium', on: true },
  { name: 'Consent expiring within 14 days', scope: 'All consents', channel: 'Email digest', sev: 'low', on: true },
  { name: 'Portfolio NPL above appetite (10%)', scope: 'Portfolio', channel: 'Email + SMS', sev: 'high', on: true },
  { name: 'Score improvement > 50 pts', scope: 'Recovery accounts', channel: 'In-app', sev: 'low', on: false },
];

export default function AlertRules() {
  const [rules, setRules] = useState(initial);
  const toggle = (i: number) => setRules(prev => prev.map((r, j) => (j === i ? { ...r, on: !r.on } : r)));
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={SlidersHorizontal} tint="#8B5CF6" title="Alert Rules"
          subtitle="Configure what triggers consumer and portfolio alerts for your team"
          actions={<button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"><Plus className="w-4 h-4" /> New Rule</button>} />
        <Panel title="Rules">
          <Table head={['Rule', 'Scope', 'Severity', 'Delivery', 'Enabled']}>
            {rules.map((r, i) => (
              <tr key={r.name} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{r.name}</Td>
                <Td className="text-muted-foreground">{r.scope}</Td>
                <Td><Badge tone={r.sev === 'high' ? 'red' : r.sev === 'medium' ? 'amber' : 'slate'}>{r.sev}</Badge></Td>
                <Td className="text-muted-foreground">{r.channel}</Td>
                <Td><Toggle on={r.on} onChange={() => toggle(i)} /></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
