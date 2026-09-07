import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Workflow, Inbox, ShieldCheck, GitMerge, DatabaseZap, ArrowRight, Play } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const STAGE_ICONS: Record<string, any> = { Ingestion: Inbox, Validation: ShieldCheck, 'Identity Matching': GitMerge, 'Bureau Load': DatabaseZap };
const STAGE_TINTS: Record<string, string> = { Ingestion: '#4F6EF7', Validation: '#10B981', 'Identity Matching': '#F59E0B', 'Bureau Load': '#8B5CF6' };
const statusTone: Record<string, string> = {
  running: 'blue', queued: 'slate', completed: 'green', completed_with_errors: 'amber', failed: 'red', cancelled: 'slate',
};
const JOB_TYPES = ['Score Refresh', 'Dedupe Sweep', 'Identity Rematch', 'Data Quality Scan'];

export default function DataProcessing() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [jobType, setJobType] = useState(JOB_TYPES[0]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  async function load() {
    const res = await request(`${API}/admin/data-processing`);
    setData(await res.json());
  }
  useEffect(() => {
    load();
    timer.current = setInterval(load, 4000); // live progress
    return () => clearInterval(timer.current);
  }, []);

  const act = (path: string, body?: any) => request(`${API}/admin/data-processing${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(load);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Workflow} tint="#8B5CF6" title="Data Processing"
          subtitle="Ingestion pipeline health and batch job queue — updates live"
          actions={
            <div className="flex items-center gap-2">
              <select value={jobType} onChange={e => setJobType(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 outline-none">
                {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={() => act('/jobs', { type: jobType })}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                <Play className="w-4 h-4" /> Start Job
              </button>
            </div>
          } />

        {/* Pipeline stages */}
        <div className="grid md:grid-cols-4 gap-4">
          {data.stages.map((s: any, idx: number) => {
            const Icon = STAGE_ICONS[s.name] ?? Inbox;
            const tint = STAGE_TINTS[s.name] ?? '#4F6EF7';
            return (
              <div key={s.name} className="relative p-5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${tint}1A` }}>
                    <Icon className="w-5 h-5" style={{ color: tint }} />
                  </div>
                  <Badge tone={s.state === 'healthy' ? 'green' : 'amber'}>{s.state}</Badge>
                </div>
                <p className="font-semibold text-gray-900">{s.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.throughput} · {s.queued} queued</p>
                {idx < data.stages.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 z-10" />
                )}
              </div>
            );
          })}
        </div>

        <Panel title="Processing Jobs" subtitle="Batch loads, rematches and maintenance sweeps · refreshes every 4s">
          <Table head={['Job ID', 'Type', 'Source', 'Records', 'Progress', 'Status', 'Started', 'Actions']}>
            {data.jobs.map((j: any) => (
              <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-blue-600">{j.jobNo}</Td>
                <Td className="font-semibold text-gray-900">{j.type}</Td>
                <Td className="text-muted-foreground">{j.source}</Td>
                <Td>{j.records.toLocaleString()}</Td>
                <Td className="w-44">
                  <div className="flex items-center gap-2">
                    <Bar value={j.progress} color={j.status === 'failed' ? '#EF4444' : j.progress === 100 ? '#10B981' : '#4F6EF7'} />
                    <span className="text-xs text-muted-foreground w-9">{j.progress}%</span>
                  </div>
                </Td>
                <Td><Badge tone={statusTone[j.status]}>{j.status.replace(/_/g, ' ')}</Badge></Td>
                <Td className="text-muted-foreground">
                  {j.startedAt ? new Date(j.startedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + new Date(j.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'queued'}
                </Td>
                <Td>
                  {['queued', 'running'].includes(j.status) && (
                    <button onClick={() => act(`/jobs/${j.id}/cancel`)} className="text-xs font-medium text-rose-600 hover:underline">Cancel</button>
                  )}
                  {['failed', 'cancelled', 'completed_with_errors'].includes(j.status) && (
                    <button onClick={() => act(`/jobs/${j.id}/retry`)} className="text-xs font-medium text-blue-600 hover:underline">Retry</button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
