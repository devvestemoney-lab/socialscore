import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Building2, ShieldCheck, ShieldAlert, Users2, GitBranch, Globe2, CalendarDays } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const kybTone: Record<string, string> = { verified: 'green', pending: 'amber', rejected: 'red' };
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function KV({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

export default function OrganizationProfile() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/organization`);
      setData(res.ok ? await res.json() : null);
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { tenant, institution, counts } = data;
  const kyb = tenant.kyb ?? {};

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Building2} tint="#4F6EF7" title="Organization Profile"
          subtitle="Your institution's registered details as held by the bureau" />

        <KpiGrid items={[
          { label: 'KYB Status', value: tenant.kybStatus, icon: tenant.kybStatus === 'verified' ? ShieldCheck : ShieldAlert,
            tint: tenant.kybStatus === 'verified' ? '#10B981' : '#F59E0B' },
          { label: 'Workspace Users', value: counts.users, icon: Users2, tint: '#4F6EF7' },
          { label: 'Branches', value: counts.branches, icon: GitBranch, tint: '#14B8A6' },
          { label: 'Member Since', value: fmtDate(tenant.createdAt), icon: CalendarDays, tint: '#8B5CF6' },
        ]} />

        <Panel title="Corporate Identity"
          action={<Badge tone={kybTone[tenant.kybStatus] ?? 'slate'}>KYB {tenant.kybStatus}</Badge>} padded>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
            <KV label="Registered Name" value={tenant.name} />
            <KV label="Tenant Code" value={<span className="font-mono text-xs">{tenant.code}</span>} />
            <KV label="Institution Type" value={<span className="capitalize">{tenant.type}</span>} />
            <KV label="Operating License" value={kyb.licenseNo} />
            <KV label="PACRA Registration" value={kyb.registrationNo} />
            <KV label="TPIN (ZRA)" value={kyb.tpin} />
            <KV label="Regulator" value={kyb.regulator} />
            <KV label="Incorporated" value={kyb.incorporationDate} />
            <KV label="Website" value={kyb.website && (
              <a href={kyb.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                <Globe2 className="w-3 h-3" />{String(kyb.website).replace(/^https?:\/\//, '')}
              </a>
            )} />
            <KV label="Head Office" value={kyb.address ? [kyb.address.street, kyb.address.city, kyb.address.province].filter(Boolean).join(', ') : undefined} />
            <KV label="Main Contact" value={tenant.contactEmail} />
            <KV label="Phone" value={kyb.phone} />
          </div>
          <p className="flex items-start gap-2 mt-5 pt-4 border-t border-slate-100 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Registered details are held by the bureau. Contact your account manager to submit a change — updates require KYB re-verification.
          </p>
        </Panel>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Compliance Contacts" padded>
            <div className="grid gap-5">
              <KV label="Compliance Officer" value={kyb.complianceOfficer?.name && (
                <>{kyb.complianceOfficer.name}<span className="text-muted-foreground"> · {kyb.complianceOfficer.email}</span></>
              )} />
              <KV label="Technical Contact" value={kyb.technicalContact?.name && (
                <>{kyb.technicalContact.name}<span className="text-muted-foreground"> · {kyb.technicalContact.email}</span></>
              )} />
              <KV label="Permitted Purposes" value={kyb.purposes?.join(', ')} />
              <KV label="Data Contributed" value={kyb.dataTypesContributed?.map((t: string) => t.replace('_', ' ')).join(', ')} />
            </div>
            <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 text-sm">
              <span className={kyb.pepDeclared ? 'inline-flex items-center gap-1.5 text-emerald-600 font-medium' : 'inline-flex items-center gap-1.5 text-rose-500 font-medium'}>
                <ShieldCheck className="w-4 h-4" /> PEP screening declared
              </span>
              <span className={kyb.amlPolicyConfirmed ? 'inline-flex items-center gap-1.5 text-emerald-600 font-medium' : 'inline-flex items-center gap-1.5 text-rose-500 font-medium'}>
                <ShieldCheck className="w-4 h-4" /> AML/CFT policy confirmed
              </span>
            </div>
          </Panel>

          <Panel title={`Directors & Beneficial Owners (${kyb.directors?.length ?? 0})`}>
            <Table head={['Name', 'ID', 'Role', 'Shareholding', 'PEP']}>
              {(kyb.directors ?? []).map((d: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-semibold text-gray-900">{d.name}</Td>
                  <Td className="font-mono text-xs">{d.idNumber}</Td>
                  <Td className="text-muted-foreground">{d.role}</Td>
                  <Td>{d.shareholding ? `${d.shareholding}%` : '—'}</Td>
                  <Td>{d.pep ? <Badge tone="red">PEP</Badge> : <Badge tone="green">clear</Badge>}</Td>
                </tr>
              ))}
              {!(kyb.directors?.length) && <tr><Td colSpan={5} className="text-center text-muted-foreground py-6">No directors on file.</Td></tr>}
            </Table>
          </Panel>
        </div>

        {institution && (
          <Panel title="Bureau Registry Record" subtitle="How your institution appears in the participating-institution registry" padded>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
              <KV label="Registry Name" value={institution.name} />
              <KV label="License" value={institution.licenseNo} />
              <KV label="Branches Declared" value={institution.branches} />
              <KV label="Data Feeds" value={institution.dataFeeds} />
              <KV label="Registry Status" value={<Badge tone={institution.status === 'active' ? 'green' : 'amber'}>{institution.status}</Badge>} />
              <KV label="Member Since" value={fmtDate(institution.memberSince)} />
              <KV label="Contact" value={institution.contactEmail} />
            </div>
          </Panel>
        )}
      </div>
    </Layout>
  );
}
