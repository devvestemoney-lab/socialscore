import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { ClipboardCheck, ShieldCheck, Hourglass, Ban, Info } from 'lucide-react';
import { API, fmtDate } from './kit';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  bank_data: 'Bank accounts', mobile_money: 'Mobile money', mfi_loans: 'Microfinance loans',
  credit_history: 'Credit history', personal_info: 'Personal details',
};

export default function ConsentAccess() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await request(`${API}/consumer/consents`);
    setData(res.ok ? await res.json() : { consents: [], summary: {} });
  }
  useEffect(() => { load(); }, []);

  async function revoke(id: string, institution: string) {
    if (!confirm(`Withdraw permission for ${institution} to access your credit file?\n\nLenders you already borrow from must still report on those accounts.`)) return;
    setBusy(id);
    await request(`${API}/consumer/consents/${id}/revoke`, { method: 'PUT' });
    setBusy(null); load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { consents, summary } = data;
  const statusOf = (k: any) =>
    k.status === 'revoked' ? 'revoked'
    : k.expires_at && new Date(k.expires_at) < new Date() ? 'expired'
    : k.expires_at && new Date(k.expires_at).getTime() < Date.now() + 30 * 86400000 ? 'expiring' : 'active';
  const tone: Record<string, string> = { active: 'green', expiring: 'amber', expired: 'slate', revoked: 'red' };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ClipboardCheck} tint="#10B981" title="Consent & Data Access"
          subtitle="You decide who can see your credit file — and you can change your mind at any time" />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Lenders with access', value: summary.active ?? 0, tint: '#10B981', icon: ShieldCheck },
            { label: 'Expiring within 30 days', value: summary.expiringSoon ?? 0, tint: '#F59E0B', icon: Hourglass },
            { label: 'Withdrawn by you', value: summary.revoked ?? 0, tint: '#94A3B8', icon: Ban },
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
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Your rights over your data</p>
              <p className="mt-1 text-muted-foreground">
                Lenders need your permission before they can pull a full credit report. You can withdraw that permission
                at any time. Withdrawing does not close your accounts or erase your history — lenders you already borrow
                from must keep reporting on those accounts, as the law requires.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Who can see your file" subtitle="Permissions you have granted, newest first">
          <Table head={['Lender', 'What they can see', 'Granted', 'Expires', 'Status', '']}>
            {consents.map((k: any) => {
              const st = statusOf(k);
              return (
                <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{k.institution}</Td>
                  <Td><Badge tone="blue">{TYPE_LABEL[k.data_type] ?? k.data_type}</Badge></Td>
                  <Td className="text-muted-foreground">{fmtDate(k.granted_at)}</Td>
                  <Td className={cn('text-muted-foreground', st === 'expiring' && 'text-amber-600 font-medium')}>
                    {k.status === 'revoked' ? `withdrawn ${fmtDate(k.revoked_at)}` : fmtDate(k.expires_at)}
                  </Td>
                  <Td><Badge tone={tone[st]}>{st === 'active' ? 'active' : st}</Badge></Td>
                  <Td>
                    {k.status === 'active' && (
                      <button onClick={() => revoke(k.id, k.institution)} disabled={busy === k.id}
                        className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50">
                        Withdraw
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
            {consents.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">No lender currently has permission to view your file.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
