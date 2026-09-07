import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Field, inputCls, Bar } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { UploadCloud, FileUp, CheckCircle2, Info, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const n = (v: number) => v.toLocaleString();
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const statusTone: Record<string, string> = { accepted: 'green', accepted_with_errors: 'amber', partial: 'amber', rejected: 'red', processing: 'blue', overdue: 'red', validating: 'blue' };

const CHECKLIST = [
  'All active facilities included (open, closed, written-off)',
  'NRC present and correctly formatted on every record',
  'Balances as at month end',
  'Arrears buckets: 30 / 60 / 90+ DPD',
  'Currency in ZMW with two decimal places',
];

export default function SubmitData() {
  const { request } = useAuth();
  const [ctx, setCtx] = useState<any>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [format, setFormat] = useState('crb_xml_v3');
  const [fileName, setFileName] = useState('');
  const [recordCount, setRecordCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function load() {
    const res = await request(`${API}/tenant/submissions`);
    if (res.ok) setCtx(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(''); setResult(null);
    const res = await request(`${API}/tenant/uploads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, period, format, recordCount: Number(recordCount) }),
    });
    setSubmitting(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Submission failed'); return; }
    setResult(body);
    setFileName(''); setRecordCount('');
    load();
  }

  const periods = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UploadCloud} tint="#4F6EF7" title="Submit Data"
          subtitle="Upload your monthly tradeline submission — validated on receipt against the bureau rule set" />

        {result && (
          <div className={cn('flex items-start gap-3 px-4 py-4 rounded-xl border',
            result.upload.status === 'accepted' ? 'bg-emerald-50 border-emerald-200' :
            result.upload.status === 'rejected' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200')}>
            {result.upload.status === 'accepted' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              : result.upload.status === 'rejected' ? <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {result.upload.uploadNo} — {result.upload.status.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-gray-700 mt-0.5">
                {n(result.upload.recordsAccepted)} of {n(result.upload.recordsSubmitted)} records accepted
                {result.rejected > 0 && ` · ${n(result.rejected)} rejected across ${result.findings} validation rule(s)`}
              </p>
              {result.rejected > 0 && <p className="text-xs text-muted-foreground mt-1">Review the detail under Validation Errors and resubmit a corrections batch.</p>}
            </div>
          </div>
        )}
        {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="New Submission" padded className="lg:col-span-2">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reporting Period">
                  <select className={inputCls} value={period} onChange={e => setPeriod(e.target.value)}>
                    {periods.map(p => <option key={p} value={p}>{fmtPeriod(p)}</option>)}
                  </select>
                </Field>
                <Field label="Format">
                  <select className={inputCls} value={format} onChange={e => setFormat(e.target.value)}>
                    <option value="crb_xml_v3">CRB-XML v3</option>
                    <option value="csv_batch">CSV batch</option>
                    <option value="corrections">Corrections batch</option>
                  </select>
                </Field>
              </div>
              <label className={cn('block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition',
                fileName ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/40')}>
                <input type="file" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setFileName(f.name); setRecordCount(String(Math.max(1, Math.round(f.size / 420)))); }
                }} />
                <FileUp className={cn('w-8 h-8 mx-auto mb-3', fileName ? 'text-emerald-500' : 'text-gray-300')} />
                {fileName ? (
                  <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {fileName}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900">Drop your batch file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 500MB · .xml, .csv or .zip</p>
                  </>
                )}
              </label>
              <Field label="Record count" hint="estimated from file size — adjust if needed">
                <input type="number" min={1} required className={inputCls} value={recordCount}
                  onChange={e => setRecordCount(e.target.value)} placeholder="e.g. 412330" />
              </Field>
              <button type="submit" disabled={submitting || !fileName || !recordCount}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-40">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Validate &amp; Submit
              </button>
            </form>
          </Panel>

          <Panel title="Submission Checklist" padded>
            <div className="space-y-3 text-sm text-gray-700">
              {CHECKLIST.map(t => (
                <p key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {t}</p>
              ))}
              <p className="flex items-start gap-2 pt-3 border-t border-slate-100 text-xs text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" /> Due by the 5th of the following month. Late or missing cycles are reported to the bureau supervisor.
              </p>
            </div>
          </Panel>
        </div>

        {ctx?.currentCycle ? (
          <Panel title={`${fmtPeriod(ctx.currentCycle.period)} Cycle Status`} padded>
            <div className="flex flex-wrap items-center gap-4">
              <Badge tone={statusTone[ctx.currentCycle.status] ?? 'slate'}>{ctx.currentCycle.status.replace(/_/g, ' ')}</Badge>
              <span className="text-sm text-muted-foreground">
                {n(ctx.currentCycle.recordsSubmitted)} submitted · {n(ctx.currentCycle.recordsAccepted)} accepted ·
                {' '}{n(ctx.currentCycle.recordsRejected)} rejected
                {ctx.currentCycle.submittedAt && ` · ${new Date(ctx.currentCycle.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
              </span>
              <div className="flex-1 min-w-[160px] max-w-xs">
                <Bar value={ctx.currentCycle.recordsSubmitted > 0 ? (ctx.currentCycle.recordsAccepted / ctx.currentCycle.recordsSubmitted) * 100 : 0} color="#10B981" />
              </div>
            </div>
          </Panel>
        ) : ctx && (
          <Panel padded>
            <p className="text-sm text-amber-600 inline-flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> No submission recorded for {fmtPeriod(ctx.currentPeriod)} yet.
            </p>
          </Panel>
        )}
      </div>
    </Layout>
  );
}
