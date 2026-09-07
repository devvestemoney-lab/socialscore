import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileCheck2, ShieldCheck, AlertTriangle, ClipboardList } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const sevTone: Record<string, string> = { high: 'red', medium: 'amber', low: 'slate' };
const statusTone: Record<string, string> = { open: 'red', in_remediation: 'amber', closed: 'green', compliant: 'green', in_progress: 'amber', at_risk: 'red' };
const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Compliance() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await request(`${API}/admin/compliance`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await request(`${API}/admin/compliance/findings/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  const { frameworks, findings, summary } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileCheck2} tint="#10B981" title="Compliance"
          subtitle="Regulatory frameworks, certification progress and the findings register" />

        <KpiGrid items={[
          { label: 'Compliance Score', value: `${summary.score}%`, icon: ShieldCheck, tint: '#10B981', sub: 'weighted across frameworks' },
          { label: 'Open Findings', value: summary.openFindings, icon: AlertTriangle, tint: '#EF4444', sub: summary.highFindings ? `${summary.highFindings} high severity` : 'none high severity' },
          { label: 'Frameworks Tracked', value: summary.frameworksTracked, icon: FileCheck2, tint: '#4F6EF7' },
          { label: 'Findings Register', value: findings.length, icon: ClipboardList, tint: '#8B5CF6', sub: 'all time' },
        ]} />

        <Panel title="Regulatory & Certification Frameworks">
          <Table head={['Framework', 'Scope', 'Readiness', '', 'Status', 'Review']}>
            {frameworks.map((f: any) => (
              <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{f.name}</Td>
                <Td className="text-muted-foreground max-w-[280px] whitespace-normal">{f.scope}</Td>
                <Td className="font-medium">{f.progress}%</Td>
                <Td className="w-36"><Bar value={f.progress} color={f.progress >= 95 ? '#10B981' : f.progress >= 80 ? '#F59E0B' : '#4F6EF7'} /></Td>
                <Td><Badge tone={statusTone[f.status]}>{f.status.replace('_', ' ')}</Badge></Td>
                <Td className="text-muted-foreground">{f.reviewNote}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Findings Register" subtitle="Open findings ordered by severity and due date">
          <Table head={['ID', 'Finding', 'Framework', 'Severity', 'Due', 'Owner', 'Status', 'Actions']}>
            {findings.map((f: any) => {
              const overdue = f.status !== 'closed' && f.dueAt && new Date(f.dueAt).getTime() < Date.now();
              return (
                <tr key={f.id} className={f.status === 'closed' ? 'opacity-50' : 'hover:bg-slate-50/70 transition-colors'}>
                  <Td className="font-mono text-xs text-blue-600">{f.code}</Td>
                  <Td className="max-w-[320px] whitespace-normal font-medium text-gray-900">{f.finding}</Td>
                  <Td className="text-muted-foreground">{f.framework}</Td>
                  <Td><Badge tone={sevTone[f.severity]}>{f.severity}</Badge></Td>
                  <Td className={overdue ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>{f.status === 'closed' ? `closed ${fmt(f.closedAt)}` : fmt(f.dueAt)}</Td>
                  <Td className="text-muted-foreground">{f.owner}</Td>
                  <Td><Badge tone={statusTone[f.status]}>{f.status.replace('_', ' ')}</Badge></Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      {f.status === 'open' && <button onClick={() => setStatus(f.id, 'in_remediation')} className="text-xs font-medium text-amber-600 hover:underline">Start Remediation</button>}
                      {f.status !== 'closed' && <button onClick={() => setStatus(f.id, 'closed')} className="text-xs font-medium text-emerald-600 hover:underline">Close</button>}
                      {f.status === 'closed' && <button onClick={() => setStatus(f.id, 'open')} className="text-xs font-medium text-rose-600 hover:underline">Reopen</button>}
                    </div>
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
