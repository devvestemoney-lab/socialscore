import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { UserCog, Check, Minus } from 'lucide-react';

const MODULES = ['Consumer Search', 'Credit Reports', 'Data Submission', 'Disputes', 'Usage & Billing', 'User Management'];
const roles = [
  { name: 'Tenant Admin', tone: 'blue', users: 2, desc: 'Full access to your workspace incl. users and billing', m: [2, 2, 2, 2, 2, 2] },
  { name: 'Credit Analyst', tone: 'green', users: 8, desc: 'Pulls reports and scores for authorised purposes', m: [2, 2, 0, 1, 0, 0] },
  { name: 'Data Officer', tone: 'amber', users: 3, desc: 'Manages monthly submissions and validation errors', m: [1, 0, 2, 0, 0, 0] },
  { name: 'Compliance Officer', tone: 'red', users: 1, desc: 'Read-only oversight of disputes, consent and audit', m: [1, 1, 1, 2, 1, 1] },
  { name: 'Viewer', tone: 'slate', users: 4, desc: 'Dashboards only, no report generation', m: [1, 0, 0, 0, 0, 0] },
];

export default function TenantRoles() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UserCog} tint="#8B5CF6" title="Roles & Permissions"
          subtitle="What each role in your workspace can do" />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map(r => (
            <div key={r.name} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={r.tone}>{r.name}</Badge>
                <span className="text-xs text-muted-foreground">{r.users} user{r.users !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-gray-700">{r.desc}</p>
            </div>
          ))}
        </div>
        <Panel title="Permission Matrix" subtitle="Managed by your Tenant Admin — platform roles are set by the bureau">
          <Table head={['Role', ...MODULES]}>
            {roles.map(r => (
              <tr key={r.name} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{r.name}</Td>
                {r.m.map((v, i) => (
                  <Td key={i}>
                    {v === 2 ? <span className="inline-flex w-6 h-6 rounded-md bg-emerald-500/10 items-center justify-center"><Check className="w-3.5 h-3.5 text-emerald-600" /></span>
                      : v === 1 ? <span className="inline-flex w-6 h-6 rounded-md bg-amber-500/10 items-center justify-center text-[10px] font-bold text-amber-600">R</span>
                      : <span className="inline-flex w-6 h-6 rounded-md bg-slate-100 items-center justify-center"><Minus className="w-3.5 h-3.5 text-slate-300" /></span>}
                  </Td>
                ))}
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
