import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { Receipt, Wallet, CalendarDays, Download, CheckCircle2 } from 'lucide-react';

const invoices = [
  { no: 'INV-2026-084', period: 'August 2026', amount: 'K68,000', overage: 'K0', status: 'paid', due: '15 Sep 2026' },
  { no: 'INV-2026-073', period: 'July 2026', amount: 'K68,000', overage: 'K0', status: 'paid', due: '15 Aug 2026' },
  { no: 'INV-2026-061', period: 'June 2026', amount: 'K74,120', overage: 'K6,120', status: 'paid', due: '15 Jul 2026' },
  { no: 'INV-2026-052', period: 'May 2026', amount: 'K68,000', overage: 'K0', status: 'paid', due: '15 Jun 2026' },
];

export default function TenantBilling() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Receipt} tint="#10B981" title="Billing & Invoices"
          subtitle="Statements for your Social Score subscription" />
        <KpiGrid items={[
          { label: 'Current Period (Sep)', value: 'K68,000', icon: Wallet, tint: '#4F6EF7', sub: 'no overage projected' },
          { label: 'Next Invoice', value: '01 Oct', icon: CalendarDays, tint: '#F59E0B' },
          { label: 'YTD Spend', value: 'K589,240', icon: Receipt, tint: '#8B5CF6' },
          { label: 'Account Standing', value: 'Good', icon: CheckCircle2, tint: '#10B981', sub: 'no outstanding balance' },
        ]} />
        <Panel title="Invoice History">
          <Table head={['Invoice', 'Period', 'Amount', 'Of which overage', 'Status', 'Due', '']}>
            {invoices.map(i => (
              <tr key={i.no} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{i.no}</Td>
                <Td className="font-semibold text-gray-900">{i.period}</Td>
                <Td>{i.amount}</Td>
                <Td className={i.overage !== 'K0' ? 'text-violet-600 font-medium' : 'text-muted-foreground'}>{i.overage}</Td>
                <Td><Badge tone="green">{i.status}</Badge></Td>
                <Td className="text-muted-foreground">{i.due}</Td>
                <Td><button className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"><Download className="w-3 h-3" /> PDF</button></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
