import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { ClipboardCheck, FileCheck2, FileX2, Hourglass } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const TYPE_LABEL: Record<string, string> = {
  bank_data: 'Bank data', mobile_money: 'Mobile money', mfi_loans: 'MFI loans',
  credit_history: 'Credit history', personal_info: 'Personal info',
};
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ConsentManagement() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await request(`${API}/admin/consents`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    if (!confirm('Revoke this consent? The institution will no longer be able to access this data type for the consumer.')) return;
    await request(`${API}/admin/consents/${id}/revoke`, { method: 'PUT' });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { consents, summary, byType } = data;
  const statusOf = (c: any) =>
    c.status === 'revoked' ? 'revoked'
    : c.expiresAt && new Date(c.expiresAt).getTime() < Date.now() ? 'expired'
    : c.expiresAt && new Date(c.expiresAt).getTime() < Date.now() + 30 * 86_400_000 ? 'expiring' : 'active';
  const tone: Record<string, string> = { active: 'green', expiring: 'amber', expired: 'slate', revoked: 'red' };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ClipboardCheck} tint="#10B981" title="Consent Management"
          subtitle="Consumer data-sharing consents across all institutions and data types" />

        <KpiGrid items={[
          { label: 'Active Consents', value: summary.active.toLocaleString(), icon: FileCheck2, tint: '#10B981' },
          { label: 'Granted (30d)', value: summary.granted30d.toLocaleString(), icon: ClipboardCheck, tint: '#4F6EF7' },
          { label: 'Revoked (30d)', value: summary.revoked30d.toLocaleString(), icon: FileX2, tint: '#EF4444' },
          { label: 'Expiring in 30 days', value: summary.expiring30d.toLocaleString(), icon: Hourglass, tint: '#F59E0B' },
        ]} />

        <div className="flex gap-2 flex-wrap">
          {byType.map((t: any) => (
            <span key={t.dataType} className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-gray-700">
              {TYPE_LABEL[t.dataType] ?? t.dataType} <b className="text-gray-900">{t.count}</b>
            </span>
          ))}
        </div>

        <Panel title="Recent Consent Activity" subtitle="Consent is required before any hard inquiry is honoured">
          <Table head={['Consumer', 'Institution', 'Data Type', 'Granted', 'Expires', 'Status', 'Actions']}>
            {consents.map((c: any) => {
              const st = statusOf(c);
              return (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{c.consumerName}</Td>
                  <Td>{c.institutionName}</Td>
                  <Td><Badge tone="blue">{TYPE_LABEL[c.dataType] ?? c.dataType}</Badge></Td>
                  <Td className="text-muted-foreground">{fmt(c.grantedAt)}</Td>
                  <Td className="text-muted-foreground">{c.status === 'revoked' ? `revoked ${fmt(c.revokedAt)}` : fmt(c.expiresAt)}</Td>
                  <Td><Badge tone={tone[st]}>{st}</Badge></Td>
                  <Td>
                    {c.status === 'active' && (
                      <button onClick={() => revoke(c.id)} className="text-xs font-medium text-rose-600 hover:underline">Revoke</button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
