import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { UserCog, Check, Minus, Info } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const MODULES = ['Dashboards', 'Credit Reports', 'Data Submission', 'Consumer Registry', 'Disputes', 'User Management', 'Billing', 'System Settings'];
const roleTone = (name: string) =>
  name === 'Tenant Admin' ? 'blue' : name === 'Credit Analyst' ? 'green'
  : name === 'Data Officer' ? 'amber' : name === 'Compliance Officer' ? 'red' : 'slate';

export default function TenantRoles() {
  const { request } = useAuth();
  const [roles, setRoles] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/team/roles`);
      setRoles((await res.json()).roles ?? []);
    })();
  }, []);

  if (!roles) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UserCog} tint="#8B5CF6" title="Roles & Permissions"
          subtitle="What each role in your workspace can access" />

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles.map(r => (
            <div key={r.id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={roleTone(r.name)}>{r.name}</Badge>
                <span className="text-xs text-muted-foreground">{r.users} user{r.users !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-sm text-gray-700 flex-1">{r.description || 'No description.'}</p>
            </div>
          ))}
          {roles.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 p-10 rounded-xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-sm text-muted-foreground">No tenant roles defined by the bureau yet.</p>
            </div>
          )}
        </div>

        <Panel title="Permission Matrix" subtitle="Full access, read-only, or none per module">
          <Table head={['Role', ...MODULES]}>
            {roles.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{r.name}</Td>
                {MODULES.map(m => {
                  const v = r.permissions?.[m] ?? 0;
                  return (
                    <Td key={m}>
                      {v === 2 ? <span className="inline-flex w-6 h-6 rounded-md bg-emerald-500/10 items-center justify-center"><Check className="w-3.5 h-3.5 text-emerald-600" /></span>
                        : v === 1 ? <span className="inline-flex w-6 h-6 rounded-md bg-amber-500/10 items-center justify-center text-[10px] font-bold text-amber-600">R</span>
                        : <span className="inline-flex w-6 h-6 rounded-md bg-slate-100 items-center justify-center"><Minus className="w-3.5 h-3.5 text-slate-300" /></span>}
                    </Td>
                  );
                })}
              </tr>
            ))}
          </Table>
          <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-slate-100 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600" /> Full access</span>
            <span className="inline-flex items-center gap-1.5"><span className="font-bold text-amber-600">R</span> Read-only</span>
            <span className="inline-flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-slate-300" /> No access</span>
            <span className="inline-flex items-center gap-1.5 ml-auto"><Info className="w-3.5 h-3.5" /> Role definitions are set by the bureau; assign them to users under Administration → Users.</span>
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
