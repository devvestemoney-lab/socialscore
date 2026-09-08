import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { ScrollText, Download, FileText, Gauge, Scale } from 'lucide-react';
import { API, fmtDate, bandTone } from './kit';

const KIND: Record<string, { label: string; icon: any }> = {
  full_report: { label: 'Full credit report', icon: FileText },
  score_only: { label: 'Score certificate', icon: Gauge },
  dispute_pack: { label: 'Dispute pack', icon: Scale },
};
const bandOf = (s: number | null) => (s == null ? null : s >= 720 ? 'A' : s >= 660 ? 'B' : s >= 580 ? 'C' : s >= 480 ? 'D' : 'E');

export default function ReportHistory() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/downloads`);
      setData(res.ok ? await res.json() : { downloads: [], allowance: {} });
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { downloads, allowance } = data;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ScrollText} tint="#6366F1" title="Report History"
          subtitle="Copies of your credit report you have requested"
          actions={
            <Link href="/my/download" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
              <Download className="w-4 h-4" /> Get a new report
            </Link>
          } />

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Reports requested', value: downloads.length },
            { label: 'Free reports used this year', value: `${allowance.used ?? 0} of ${allowance.perYear ?? 2}` },
            { label: 'Free reports remaining', value: allowance.remaining ?? 0 },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <p className="text-2xl font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Panel title="Your reports" subtitle="Copies stay available for 90 days from the date issued">
          <Table head={['Reference', 'Type', 'Format', 'Score at the time', 'Issued', '']}>
            {downloads.map((d: any) => {
              const meta = KIND[d.kind] ?? KIND.full_report;
              const band = bandOf(d.scoreAtIssue);
              const expired = Date.now() - new Date(d.createdAt).getTime() > 90 * 86400000;
              return (
                <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="font-mono text-xs text-emerald-700">{d.reference}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                      <meta.icon className="w-3.5 h-3.5 text-gray-400" />{meta.label}
                    </span>
                  </Td>
                  <Td><Badge tone="slate">{d.format.toUpperCase()}</Badge></Td>
                  <Td>{d.scoreAtIssue ? <Badge tone={bandTone[band!]}>{d.scoreAtIssue}</Badge> : <span className="text-muted-foreground">—</span>}</Td>
                  <Td className="text-muted-foreground">{fmtDate(d.createdAt)}</Td>
                  <Td>
                    {expired
                      ? <span className="text-xs text-gray-400">Expired</span>
                      : <button onClick={() => window.print()} className="text-xs font-medium text-emerald-700 hover:underline">Open</button>}
                  </Td>
                </tr>
              );
            })}
            {downloads.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">You haven't requested a report yet.</Td></tr>}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
