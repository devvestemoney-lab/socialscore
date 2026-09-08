import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { FileSearch, Zap, Feather, Ban, Info, AlertTriangle } from 'lucide-react';
import { API, fmtDate, ago } from './kit';
import { cn } from '@/lib/utils';

const OUTCOME: Record<string, { label: string; tone: string }> = {
  report_issued: { label: 'Report issued', tone: 'green' },
  declined_no_consent: { label: 'Refused — no consent', tone: 'red' },
  declined_policy: { label: 'Refused — policy', tone: 'red' },
};

export default function MyInquiries() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);
  const [kind, setKind] = useState('all');

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/inquiries`);
      setData(res.ok ? await res.json() : { inquiries: [], reports: [] });
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { inquiries } = data;
  const shown = kind === 'all' ? inquiries : inquiries.filter((i: any) => i.kind === kind);
  const hard90 = inquiries.filter((i: any) => i.kind === 'hard' && Date.now() - new Date(i.createdAt).getTime() < 90 * 86400000).length;
  const refused = inquiries.filter((i: any) => i.outcome !== 'report_issued').length;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={FileSearch} tint="#8B5CF6" title="Credit Inquiries"
          subtitle="Every time someone has looked at your credit file" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total searches', value: inquiries.length, tint: '#4F6EF7', icon: FileSearch, sub: 'all time' },
            { label: 'Full checks (90 days)', value: hard90, tint: hard90 > 4 ? '#F59E0B' : '#10B981', icon: Zap, sub: 'visible to other lenders' },
            { label: 'Soft checks', value: inquiries.filter((i: any) => i.kind === 'soft').length, tint: '#14B8A6', icon: Feather, sub: 'do not affect your score' },
            { label: 'Refused', value: refused, tint: refused ? '#EF4444' : '#94A3B8', icon: Ban, sub: 'blocked by the bureau' },
          ].map(k => (
            <div key={k.label} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${k.tint}1A` }}>
                <k.icon className="w-5 h-5" style={{ color: k.tint }} />
              </div>
              <p className="text-2xl font-display font-bold text-gray-900">{k.value}</p>
              <p className="text-sm text-gray-600 mt-0.5">{k.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {hard90 > 4 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            You have had {hard90} full credit checks in the last 90 days. Lenders may read frequent applications as a sign of financial pressure — try spacing them out.
          </div>
        )}

        <Panel padded>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-amber-600" /></span>
              <div>
                <p className="font-semibold text-gray-900">Full checks</p>
                <p className="text-xs text-muted-foreground mt-0.5">Made when you apply for credit. Other lenders can see these for 12 months, and too many in a short period can lower your score.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Feather className="w-4 h-4 text-gray-500" /></span>
              <div>
                <p className="font-semibold text-gray-900">Soft checks</p>
                <p className="text-xs text-muted-foreground mt-0.5">Background reviews by lenders you already deal with, or your own checks. These are private and never affect your score.</p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="flex gap-2">
          {[['all', 'All'], ['hard', 'Full checks'], ['soft', 'Soft checks']].map(([v, l]) => (
            <button key={v} onClick={() => setKind(v)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                kind === v ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        <Panel title="Search history" subtitle="If you do not recognise a full check, raise a dispute — it may be identity fraud">
          <Table head={['When', 'Who searched', 'Type', 'Why they said', 'Outcome']}>
            {shown.map((i: any) => (
              <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                <Td>
                  <p className="text-gray-900">{fmtDate(i.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">{ago(i.createdAt)}</p>
                </Td>
                <Td className="font-semibold text-gray-900">{i.institutionName}</Td>
                <Td><Badge tone={i.kind === 'hard' ? 'amber' : 'slate'}>{i.kind === 'hard' ? 'full check' : 'soft check'}</Badge></Td>
                <Td className="text-muted-foreground max-w-[280px] truncate">{i.purpose}</Td>
                <Td><Badge tone={OUTCOME[i.outcome]?.tone ?? 'slate'}>{OUTCOME[i.outcome]?.label ?? i.outcome}</Badge></Td>
              </tr>
            ))}
            {shown.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">No searches in this category.</Td></tr>}
          </Table>
          <p className="px-5 py-3 text-xs text-muted-foreground border-t border-slate-100 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0" />
            Don't recognise one of these? <Link href="/my/disputes" className="font-semibold text-emerald-700 underline ml-1">Raise a dispute</Link> — the bureau must investigate within 21 days.
          </p>
        </Panel>
      </div>
    </Layout>
  );
}
