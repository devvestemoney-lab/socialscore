import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { KeyRound, RotateCcw, Info } from 'lucide-react';

const keys = [
  { prefix: 'sscore_live_8f3a…', env: 'production', rate: '600 rpm', created: 'Jan 2025', expires: 'Jan 2027', lastUsed: '2 min ago', status: 'active' },
  { prefix: 'sscore_test_40cd…', env: 'sandbox', rate: '60 rpm', created: 'Aug 2026', expires: 'Feb 2027', lastUsed: '3 days ago', status: 'active' },
];

export default function ApiCredentials() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={KeyRound} tint="#6366F1" title="API Credentials"
          subtitle="Your institution's keys — rotate regularly and store only in your secrets manager" />
        <Panel title="Keys">
          <Table head={['Key', 'Environment', 'Rate Limit', 'Created', 'Expires', 'Last Used', 'Status', '']}>
            {keys.map(k => (
              <tr key={k.prefix} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs">{k.prefix}</Td>
                <Td><Badge tone={k.env === 'production' ? 'blue' : 'slate'}>{k.env}</Badge></Td>
                <Td className="text-muted-foreground">{k.rate}</Td>
                <Td className="text-muted-foreground">{k.created}</Td>
                <Td className="text-muted-foreground">{k.expires}</Td>
                <Td className="text-muted-foreground">{k.lastUsed}</Td>
                <Td><Badge tone="green">{k.status}</Badge></Td>
                <Td><button className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"><RotateCcw className="w-3 h-3" /> Rotate</button></Td>
              </tr>
            ))}
          </Table>
          <p className="flex items-start gap-2 px-5 py-3 text-xs text-muted-foreground border-t border-slate-100">
            <Info className="w-4 h-4 shrink-0" /> Rotating a key issues a new secret immediately; the old key keeps working for a 24-hour grace period. Additional keys are issued by the bureau on request.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
