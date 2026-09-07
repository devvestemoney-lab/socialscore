import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { ListX, FileX2, AlertTriangle, RotateCcw, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const n = (v: number) => v.toLocaleString();
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ValidationErrors() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<string>('');

  async function load(uploadId?: string) {
    const res = await request(`${API}/tenant/validation-errors${uploadId ? `?uploadId=${uploadId}` : ''}`);
    const body = res.ok ? await res.json() : { upload: null, uploads: [], errors: [] };
    setData(body);
    if (body.upload) setSelected(body.upload.id);
  }
  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    await request(`${API}/tenant/validation-errors/${id}/resolve`, { method: 'PUT' });
    load(selected);
  }

  function exportCsv() {
    const rows = [['Code', 'Rule', 'Affected records', 'Severity', 'Sample location', 'Suggested fix'],
      ...data.errors.map((e: any) => [e.code, `"${e.rule}"`, e.affectedRecords, e.severity, `"${e.sampleLocation}"`, `"${e.suggestedFix}"`])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `validation-errors-${data.upload?.uploadNo ?? 'export'}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { upload, uploads, errors } = data;
  const open = errors.filter((e: any) => e.status === 'open');
  const blocking = open.filter((e: any) => e.severity === 'blocking').reduce((a: number, e: any) => a + e.affectedRecords, 0);
  const maxAffected = Math.max(1, ...errors.map((e: any) => e.affectedRecords));

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ListX} tint="#EF4444" title="Validation Errors"
          subtitle="Records the bureau rejected — fix at source and resubmit as a corrections batch"
          actions={
            <div className="flex items-center gap-2">
              <select value={selected} onChange={e => { setSelected(e.target.value); load(e.target.value); }}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 outline-none max-w-[260px]">
                {uploads.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.uploadNo} · {u.period} · {n(u.recordsRejected)} rejected</option>
                ))}
              </select>
              <button onClick={exportCsv} disabled={!errors.length}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium disabled:opacity-50">
                <Download className="w-4 h-4" /> Error File
              </button>
            </div>
          } />

        {!upload ? (
          <Panel padded>
            <div className="flex flex-col items-center text-center py-10">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="font-display font-bold text-gray-900">No rejected records</p>
              <p className="text-sm text-muted-foreground mt-1">Every batch you have submitted was accepted in full.</p>
            </div>
          </Panel>
        ) : (
          <>
            <KpiGrid items={[
              { label: 'Rejected Records', value: n(upload.recordsRejected), icon: FileX2, tint: '#EF4444',
                sub: upload.recordsSubmitted ? `${((upload.recordsRejected / upload.recordsSubmitted) * 100).toFixed(2)}% of batch` : undefined },
              { label: 'Open Rules', value: open.length, icon: AlertTriangle, tint: open.length ? '#F59E0B' : '#94A3B8', sub: `${errors.length} total` },
              { label: 'Blocking Records', value: n(blocking), icon: ListX, tint: '#EF4444', sub: 'must be corrected' },
              { label: 'Correctable', value: n(upload.recordsRejected), icon: RotateCcw, tint: '#10B981', sub: 'resubmit as corrections' },
            ]} />

            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <span className="font-mono text-xs text-blue-600">{upload.uploadNo}</span>
              <span className="font-medium text-gray-900">{upload.fileName}</span>
              <span className="text-muted-foreground">{upload.period} · uploaded {fmtDate(upload.createdAt)}</span>
              <span className="ml-auto text-muted-foreground">{n(upload.recordsRejected)} of {n(upload.recordsSubmitted)} records rejected</span>
            </div>

            <Panel title="Error Breakdown" subtitle="Grouped by validation rule, largest impact first">
              <Table head={['Code', 'Rule', 'Records', 'Share', 'Sample Location', 'Suggested Fix', 'Severity', '']}>
                {errors.map((e: any) => (
                  <tr key={e.id} className={cn('transition-colors', e.status === 'resolved' ? 'opacity-50' : 'hover:bg-slate-50/70')}>
                    <Td><Badge tone={e.severity === 'blocking' ? 'red' : 'amber'}>{e.code}</Badge></Td>
                    <Td className="font-medium text-gray-900">{e.rule}</Td>
                    <Td>{n(e.affectedRecords)}</Td>
                    <Td className="w-28"><Bar value={(e.affectedRecords / maxAffected) * 100} color={e.severity === 'blocking' ? '#EF4444' : '#F59E0B'} /></Td>
                    <Td className="font-mono text-xs text-muted-foreground">{e.sampleLocation}</Td>
                    <Td className="text-muted-foreground max-w-[280px] whitespace-normal text-xs">{e.suggestedFix}</Td>
                    <Td><Badge tone={e.severity === 'blocking' ? 'red' : 'amber'}>{e.severity}</Badge></Td>
                    <Td>
                      {e.status === 'open'
                        ? <button onClick={() => resolve(e.id)} className="text-xs font-medium text-emerald-600 hover:underline">Mark fixed</button>
                        : <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3" /> fixed</span>}
                    </Td>
                  </tr>
                ))}
                {errors.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground py-6">No validation errors on this upload.</Td></tr>}
              </Table>
              <p className="px-5 py-3 text-xs text-muted-foreground border-t border-slate-100">
                Once corrected, submit the affected records as a <b>corrections batch</b> under Submit Data — they will be merged into the same reporting cycle.
              </p>
            </Panel>
          </>
        )}
      </div>
    </Layout>
  );
}
