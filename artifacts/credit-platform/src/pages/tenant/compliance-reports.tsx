import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  FileCheck2, Download, Printer, ArrowLeft, Loader2, ShieldCheck, FileText, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const TYPE_TONE: Record<string, string> = {
  'BoZ regulatory': 'blue', 'Data Protection Act': 'green',
  'Internal audit': 'violet', 'Bureau attestation': 'cyan',
};
const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ─── Generated report document ─── */
function ReportDocument({ report, onBack }: { report: any; onBack: () => void }) {
  const { meta, sections, attestation } = report;

  function exportCsv() {
    const lines: string[][] = [[meta.name], [`${meta.institution} · ${fmtPeriod(meta.period)}`], []];
    sections.forEach((s: any) => {
      lines.push([s.title]);
      if (s.kind === 'stats') s.stats.forEach((st: any) => lines.push([st.label, String(st.value)]));
      else { lines.push(s.head); s.rows.forEach((r: any[]) => lines.push(r.map(String))); }
      lines.push([]);
    });
    const blob = new Blob([lines.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${meta.reference}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-gray-700 hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4" /> Back to reports
        </button>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      <Panel padded>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Social Score · Compliance Report</p>
            <h1 className="text-2xl font-display font-bold text-gray-900 mt-1">{meta.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {meta.institution} · {fmtPeriod(meta.period)} · generated {fmtDateTime(meta.generatedAt)} by {meta.generatedBy}
            </p>
          </div>
          <div className="text-right">
            <Badge tone={TYPE_TONE[meta.type] ?? 'slate'}>{meta.type}</Badge>
            <p className="font-mono text-xs text-gray-500 mt-2">{meta.reference}</p>
          </div>
        </div>
      </Panel>

      {sections.map((s: any, i: number) => (
        <Panel key={s.title} title={`${i + 1} · ${s.title}`} padded={s.kind === 'stats'}>
          {s.kind === 'stats' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {s.stats.map((st: any) => (
                <div key={st.label} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-2xl font-display font-bold text-gray-900">{st.value}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{st.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <Table head={s.head}>
              {s.rows.map((r: any[], ri: number) => (
                <tr key={ri} className="hover:bg-slate-50/70 transition-colors">
                  {r.map((cell, ci) => (
                    <Td key={ci} className={ci === 0 ? 'font-medium text-gray-900' : 'text-muted-foreground'}>{String(cell)}</Td>
                  ))}
                </tr>
              ))}
              {s.rows.length === 0 && <tr><Td colSpan={s.head.length} className="text-center text-muted-foreground py-6">No records in this period.</Td></tr>}
            </Table>
          )}
        </Panel>
      ))}

      <Panel padded>
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Attestation</p>
            <p className="text-sm text-gray-700 mt-1">{attestation}</p>
            <p className="text-xs text-muted-foreground mt-3">
              Figures are computed directly from {meta.institution}'s workspace activity on the Social Score platform at generation time.
              This report is intended for regulatory submission and internal audit purposes.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ─── Main page ─── */
export default function ComplianceReports() {
  const { request } = useAuth();
  const [catalogue, setCatalogue] = useState<any>(null);
  const [period, setPeriod] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/compliance-reports`);
      const body = await res.json();
      setCatalogue(body);
      setPeriod(body.periods[1] ?? body.periods[0]);
    })();
  }, []);

  async function generate(key: string) {
    setGenerating(key); setError('');
    const res = await request(`${API}/tenant/compliance-reports/${key}/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period }),
    });
    setGenerating(null);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Failed to generate report'); return; }
    setReport(body);
    setHistory(prev => [{ reference: body.meta.reference, name: body.meta.name, period: body.meta.period, generatedAt: body.meta.generatedAt, payload: body }, ...prev].slice(0, 10));
  }

  if (report) return <Layout><ReportDocument report={report} onBack={() => setReport(null)} /></Layout>;
  if (!catalogue) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileCheck2} tint="#10B981" title="Compliance Reports"
          subtitle="Regulator-ready packs generated live from your workspace activity"
          actions={
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 outline-none">
                {catalogue.periods.map((p: string) => <option key={p} value={p}>{fmtPeriod(p)}</option>)}
              </select>
            </div>
          } />

        {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {catalogue.reports.map((r: any) => (
            <div key={r.key} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <Badge tone={TYPE_TONE[r.type] ?? 'slate'}>{r.type}</Badge>
              </div>
              <p className="font-display font-bold text-gray-900">{r.name}</p>
              <p className="text-[13px] text-muted-foreground mt-1.5 flex-1">{r.description}</p>
              <button onClick={() => generate(r.key)} disabled={!!generating}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                {generating === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Generate for {fmtPeriod(period)}
              </button>
            </div>
          ))}
        </div>

        <Panel title="Generated This Session" subtitle="Reports are produced on demand from live data — regenerate any time">
          <Table head={['Reference', 'Report', 'Period', 'Generated', '']}>
            {history.map(h => (
              <tr key={h.reference} onClick={() => setReport(h.payload)} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                <Td className="font-mono text-xs text-blue-600">{h.reference}</Td>
                <Td className="font-semibold text-gray-900">{h.name}</Td>
                <Td className="text-muted-foreground">{fmtPeriod(h.period)}</Td>
                <Td className="text-muted-foreground">{fmtDateTime(h.generatedAt)}</Td>
                <Td><span className="text-xs font-semibold text-blue-600">Open</span></Td>
              </tr>
            ))}
            {history.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">No reports generated yet — pick a period and generate one above.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
