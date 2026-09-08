import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { CreditCard, Smartphone, Gift, Receipt, Info } from 'lucide-react';
import { API, money, fmtDate } from './kit';

const METHOD: Record<string, { label: string; icon: any; tone: string }> = {
  mobile_money: { label: 'Mobile money', icon: Smartphone, tone: 'blue' },
  card: { label: 'Card', icon: CreditCard, tone: 'violet' },
  free_allowance: { label: 'Free allowance', icon: Gift, tone: 'green' },
};
const STATUS: Record<string, string> = { paid: 'green', pending: 'amber', failed: 'red', waived: 'slate' };

export default function Payments() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/payments`);
      setData(res.ok ? await res.json() : { payments: [], totals: {} });
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { payments, totals } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={CreditCard} tint="#8B5CF6" title="Payments"
          subtitle="What you've paid the bureau for, and what was free" />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Total paid', value: money(totals.paid ?? 0), tint: '#8B5CF6', icon: Receipt },
            { label: 'Free of charge', value: totals.waived ?? 0, tint: '#10B981', icon: Gift },
            { label: 'Transactions', value: totals.count ?? 0, tint: '#4F6EF7', icon: CreditCard },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Panel padded>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            <span>
              <b className="text-gray-900">Most things here are free.</b> Seeing your score, checking who searched your file,
              raising disputes and correcting errors never cost anything. You only pay for additional report copies beyond
              your two free ones each year.
            </span>
          </p>
        </Panel>

        <Panel title="Payment history">
          <Table head={['Reference', 'What for', 'Method', 'Amount', 'Date', 'Status']}>
            {payments.map((p: any) => {
              const m = METHOD[p.method] ?? METHOD.mobile_money;
              return (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs text-emerald-700">{p.reference}</Td>
                  <Td className="font-medium text-gray-900">{p.description}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <m.icon className="w-3.5 h-3.5 text-gray-400" />{m.label}
                    </span>
                  </Td>
                  <Td className={Number(p.amount) > 0 ? 'font-bold text-gray-900' : 'text-emerald-600 font-medium'}>
                    {Number(p.amount) > 0 ? money(p.amount) : 'Free'}
                  </Td>
                  <Td className="text-muted-foreground">{fmtDate(p.createdAt)}</Td>
                  <Td><Badge tone={STATUS[p.status] ?? 'slate'}>{p.status}</Badge></Td>
                </tr>
              );
            })}
            {payments.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">No payments yet.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
