import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Modal } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Receipt, Wallet, AlertTriangle, CheckCircle2, FileText, Play, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number | string) => `K${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const statusTone: Record<string, string> = { paid: 'green', issued: 'blue', overdue: 'red', draft: 'slate', void: 'slate' };
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

export default function Billing() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('all');
  const [detail, setDetail] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  async function load(st = status) {
    const res = await request(`${API}/admin/invoices${st !== 'all' ? `?status=${st}` : ''}`);
    setData(await res.json());
  }
  useEffect(() => { load('all'); }, []);

  async function generate() {
    setGenerating(true); setMessage('');
    const period = new Date().toISOString().slice(0, 7);
    const res = await request(`${API}/admin/invoices/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period }),
    });
    const body = await res.json();
    setGenerating(false);
    setMessage(res.ok
      ? `${body.created} invoice(s) generated for ${fmtPeriod(period)}${body.skipped ? `, ${body.skipped} already existed` : ''}.`
      : body.message ?? 'Generation failed');
    load();
  }

  async function setInvoiceStatus(id: string, newStatus: string) {
    await request(`${API}/admin/invoices/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
    });
    setDetail(null); load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { invoices, summary } = data;
  const inv = detail;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Receipt} tint="#10B981" title="Billing & Invoices"
          subtitle="Invoices generated from metered usage across all tenants"
          actions={
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Generate This Month
            </button>
          } />

        {message && <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">{message}</div>}

        <KpiGrid items={[
          { label: 'Collected', value: money(summary.paid), icon: CheckCircle2, tint: '#10B981', sub: 'all time' },
          { label: 'Outstanding', value: money(summary.issued), icon: Wallet, tint: '#F59E0B', sub: `${summary.unpaidCount} unpaid invoice(s)` },
          { label: 'Overdue', value: money(summary.overdue), icon: AlertTriangle, tint: summary.overdue > 0 ? '#EF4444' : '#94A3B8' },
          { label: 'Invoices Issued', value: summary.count, icon: FileText, tint: '#4F6EF7' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {['all', 'issued', 'paid', 'overdue', 'draft'].map(f => (
            <button key={f} onClick={() => { setStatus(f); load(f); }}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border',
                status === f ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{f}</button>
          ))}
        </div>

        <Panel title="Invoice Register" subtitle="Click an invoice to view its line items">
          <Table head={['Reference', 'Tenant', 'Period', 'Subscription', 'Overage', 'Add-ons', 'Total', 'Due', 'Status']}>
            {invoices.map((i: any) => (
              <tr key={i.id} onClick={() => setDetail(i)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-mono text-xs text-blue-600">{i.reference}</Td>
                <Td className="font-semibold text-gray-900">{i.tenantName}</Td>
                <Td className="text-muted-foreground">{fmtPeriod(i.period)}</Td>
                <Td className="text-muted-foreground">{money(i.subscriptionAmount)}</Td>
                <Td className={Number(i.overageAmount) > 0 ? 'text-violet-600 font-medium' : 'text-muted-foreground'}>{Number(i.overageAmount) > 0 ? money(i.overageAmount) : '—'}</Td>
                <Td className="text-muted-foreground">{Number(i.addonsAmount) > 0 ? money(i.addonsAmount) : '—'}</Td>
                <Td className="font-bold text-gray-900">{money(i.total)}</Td>
                <Td className={i.status === 'overdue' ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{fmtDate(i.dueAt)}</Td>
                <Td><Badge tone={statusTone[i.status]}>{i.status}</Badge></Td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><Td colSpan={9} className="text-center text-muted-foreground py-8">No invoices for this filter.</Td></tr>}
          </Table>
        </Panel>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} wide
        title={inv ? inv.reference : ''} subtitle={inv ? `${inv.tenantName} · ${fmtPeriod(inv.period)}` : undefined}>
        {inv && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
              <p className="text-sm text-muted-foreground">Issued {fmtDate(inv.issuedAt)} · due {fmtDate(inv.dueAt)}{inv.paidAt ? ` · paid ${fmtDate(inv.paidAt)}` : ''}</p>
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
            <div className="flex flex-wrap gap-2">
              {inv.status !== 'paid' && (
                <button onClick={() => setInvoiceStatus(inv.id, 'paid')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Mark Paid
                </button>
              )}
              {inv.status === 'issued' && (
                <button onClick={() => setInvoiceStatus(inv.id, 'overdue')}
                  className="px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-semibold">Flag Overdue</button>
              )}
              {inv.status !== 'void' && (
                <button onClick={() => confirm('Void this invoice?') && setInvoiceStatus(inv.id, 'void')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold">Void</button>
              )}
              <button onClick={() => window.print()} className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-gray-700 hover:bg-slate-50 text-sm font-semibold">
                <Download className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
