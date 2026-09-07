import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { ScrollText } from 'lucide-react';

const logs = [
  { action: 'report_pulled', user: 'Chanda Mulenga', detail: 'Full report — Mwansa Chileshe (Personal Loan K85,000)', ip: '196.216.61.44', at: '09:41 today' },
  { action: 'consent_recorded', user: 'Mwansa Banda', detail: 'USSD consent captured for Chisomo Phiri', ip: '196.216.61.19', at: '09:02 today' },
  { action: 'user_login', user: 'Chanda Mulenga', detail: 'MFA verified · Chrome on macOS', ip: '196.216.61.44', at: '09:02 today' },
  { action: 'data_submitted', user: 'Peter Lungu', detail: 'August 2026 batch — 412,330 records', ip: '196.216.62.101', at: '01 Sep 06:12' },
  { action: 'dispute_response', user: 'Chanda Mulenga', detail: 'Evidence uploaded on DSP-2026-0899', ip: '196.216.61.44', at: '31 Aug 15:30' },
  { action: 'settings_changed', user: 'Chanda Mulenga', detail: 'Enabled IP allowlisting for workspace', ip: '196.216.61.44', at: '29 Aug 11:12' },
];
const tone: Record<string, string> = { report_pulled: 'green', consent_recorded: 'blue', user_login: 'slate', data_submitted: 'violet', dispute_response: 'amber', settings_changed: 'cyan' };

export default function TenantAuditLogs() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ScrollText} tint="#64748B" title="Audit Logs"
          subtitle="Every action taken in your workspace, retained for 7 years" />
        <Panel title="Activity Trail">
          <Table head={['Action', 'User', 'Detail', 'IP', 'When']}>
            {logs.map((l, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <Td><Badge tone={tone[l.action] ?? 'slate'}>{l.action.replace(/_/g, ' ')}</Badge></Td>
                <Td className="font-semibold text-gray-900">{l.user}</Td>
                <Td className="text-muted-foreground max-w-[320px] whitespace-normal">{l.detail}</Td>
                <Td className="font-mono text-xs">{l.ip}</Td>
                <Td className="text-muted-foreground">{l.at}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
