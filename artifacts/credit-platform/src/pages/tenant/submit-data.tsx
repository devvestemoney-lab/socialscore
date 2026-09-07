import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Field, inputCls } from '@/components/admin/page-kit';
import { UploadCloud, FileUp, CheckCircle2, Info } from 'lucide-react';

export default function SubmitData() {
  const [period, setPeriod] = useState('2026-09');
  const [file, setFile] = useState<string | null>(null);
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={UploadCloud} tint="#4F6EF7" title="Submit Data"
          subtitle="Upload your monthly tradeline submission — CRB-XML v3 or CSV batch format" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="New Submission" padded className="lg:col-span-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reporting Period">
                  <select className={inputCls} value={period} onChange={e => setPeriod(e.target.value)}>
                    <option value="2026-09">September 2026</option>
                    <option value="2026-08">August 2026 (late)</option>
                  </select>
                </Field>
                <Field label="Format">
                  <select className={inputCls}><option>CRB-XML v3</option><option>CSV batch</option></select>
                </Field>
              </div>
              <label className="block border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition">
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0]?.name ?? null)} />
                <FileUp className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                {file ? (
                  <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {file}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900">Drop your batch file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 500MB · .xml, .csv or .zip</p>
                  </>
                )}
              </label>
              <button disabled={!file}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-40">
                Validate & Submit
              </button>
            </div>
          </Panel>
          <Panel title="Submission Checklist" padded>
            <div className="space-y-3 text-sm text-gray-700">
              {['All active facilities included (open, closed, written-off)', 'NRC present on every record', 'Balances as at month-end', 'Arrears buckets: 30/60/90+ DPD', 'Currency in ZMW with 2 decimals'].map(t => (
                <p key={t} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {t}</p>
              ))}
              <p className="flex items-start gap-2 pt-2 border-t border-slate-100 text-xs text-muted-foreground">
                <Info className="w-4 h-4 shrink-0 mt-0.5" /> Due by the 5th of the following month. Late or missing cycles are flagged to the bureau supervisor.
              </p>
            </div>
          </Panel>
        </div>
        <Panel title="Current Cycle Status" padded>
          <div className="flex items-center gap-4">
            <Badge tone="green">August 2026 · accepted</Badge>
            <span className="text-sm text-muted-foreground">412,330 records submitted · 409,981 accepted · 2,349 rejected (0.6%) · submitted 01 Sep, 06:12</span>
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
