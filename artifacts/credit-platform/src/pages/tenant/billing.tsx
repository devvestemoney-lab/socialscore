import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Receipt, Wallet, AlertTriangle, CheckCircle2, CalendarDays, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number | string) => `K${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const statusTone: Record<string, string> = { paid: 'green', issued: 'blue', overdue: 'red', draft: 'slate', void: 'slate' };
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export default function TenantBilling() {
  const { request, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/invoices`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { invoices, summary } = data;
  const inv = detail;
  const nextDue = invoices.find((i: any) => i.status === 'issued' || i.status === 'overdue');

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Receipt} tint="#10B981" title="Billing & Invoices"
          subtitle="Statements for your Social Score subscription" />

        <KpiGrid items={[
          { label: 'Outstanding', value: money(summary.outstanding), icon: Wallet, tint: summary.outstanding > 0 ? '#F59E0B' : '#94A3B8', sub: nextDue ? `next due ${fmtDate(nextDue.dueAt)}` : 'nothing due' },
          { label: 'Overdue', value: money(summary.overdue), icon: AlertTriangle, tint: summary.overdue > 0 ? '#EF4444' : '#94A3B8' },
          { label: 'Paid This Year', value: money(summary.paidYtd), icon: CheckCircle2, tint: '#10B981' },
          { label: 'Invoices', value: summary.count, icon: CalendarDays, tint: '#4F6EF7', sub: 'on record' },
        ]} />

        {summary.overdue > 0 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            You have {money(summary.overdue)} overdue. Settle outstanding invoices to avoid service interruption — contact billing@socialscore.co.zm if payment has already been made.
          </div>
        )}

        <Panel title="Invoice History" subtitle="Click an invoice to view its line items">
          <Table head={['Reference', 'Period', 'Subscription', 'Overage', 'Add-ons', 'Total', 'Due', 'Status']}>
            {invoices.map((i: any) => (
              <tr key={i.id} onClick={() => setDetail(i)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-mono text-xs text-blue-600">{i.reference}</Td>
                <Td className="font-semibold text-gray-900">{fmtPeriod(i.period)}</Td>
                <Td className="text-muted-foreground">{money(i.subscriptionAmount)}</Td>
                <Td className={Number(i.overageAmount) > 0 ? 'text-violet-600 font-medium' : 'text-muted-foreground'}>{Number(i.overageAmount) > 0 ? money(i.overageAmount) : '—'}</Td>
                <Td className="text-muted-foreground">{Number(i.addonsAmount) > 0 ? money(i.addonsAmount) : '—'}</Td>
                <Td className="font-bold text-gray-900">{money(i.total)}</Td>
                <Td className={i.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{fmtDate(i.dueAt)}</Td>
                <Td><Badge tone={statusTone[i.status]}>{i.status}</Badge></Td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-8">No invoices yet.</Td></tr>}
          </Table>
        </Panel>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title={inv ? inv.reference : ''} subtitle={inv ? `${fmtPeriod(inv.period)} · ${user?.tenantName ?? ''}` : undefined}>
        {inv && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
              <p className="text-sm text-muted-foreground">
                Issued {fmtDate(inv.issuedAt)} · due {fmtDate(inv.dueAt)}{inv.paidAt ? ` · paid ${fmtDate(inv.paidAt)}` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table head={['Line item', 'Qty', 'Rate', 'Amount']}>
                {(inv.lineItems ?? []).map((li: any, i: number) => (
                  <tr key={i}>
                    <Td className="font-medium text-gray-900">{li.label}</Td>
                    <Td className="text-muted-foreground">{li.qty}</Td>
                    <Td className="text-muted-foreground">{li.rate ? money(li.rate) : '—'}</Td>
                    <Td className={cn('font-semibold', li.amount < 0 ? 'text-emerald-600' : 'text-gray-900')}>{money(li.amount)}</Td>
                  </tr>
                ))}
              </Table>
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-gray-900">Total due</span>
                <span className="text-lg font-display font-bold text-gray-900">{money(inv.total)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground flex-1">
                Payable to Social Score Ltd · quote {inv.reference} as your payment reference.
              </p>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
