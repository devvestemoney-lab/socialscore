import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { Building2, ShieldCheck } from 'lucide-react';

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
    </div>
  );
}

export default function OrganizationProfile() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Building2} tint="#4F6EF7" title="Organization Profile"
          subtitle="Your institution's registered details held by the bureau" />
        <Panel title="Corporate Identity" action={<Badge tone="green">KYB verified</Badge>} padded>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
            <KV label="Registered Name" value="Zanaco Bank Plc" />
            <KV label="Tenant Code" value="ZANACO" />
            <KV label="Type" value="Commercial Bank" />
            <KV label="Operating License" value="BoZ/CB/001" />
            <KV label="PACRA Registration" value="PACRA/ZANACO" />
            <KV label="TPIN" value="100482913" />
            <KV label="Regulator" value="Bank of Zambia" />
            <KV label="Incorporated" value="15 Jun 2009" />
            <KV label="Website" value="www.zanaco.co.zm" />
            <KV label="Head Office" value="Cairo Road, Lusaka, Lusaka Province" />
            <KV label="Main Contact" value="zanaco@zamcredit.zm" />
            <KV label="Phone" value="+260 211 221 234" />
          </div>
          <p className="flex items-start gap-2 mt-5 pt-4 border-t border-slate-100 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Profile changes are reviewed by the bureau. Contact your account manager to update registered details.
          </p>
        </Panel>
        <Panel title="Compliance Contacts" padded>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <KV label="Compliance Officer" value="Compliance Office · compliance@zanaco.co.zm" />
            <KV label="Technical Contact" value="API Team · api@zanaco.co.zm" />
            <KV label="Billing Contact" value="finance@zanaco.co.zm" />
            <KV label="Dispute Contact" value="disputes@zanaco.co.zm" />
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
