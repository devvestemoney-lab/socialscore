import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  History, Wallet, CheckCircle2, AlertTriangle, FileSearch, Gauge, Scale,
} from 'lucide-react';
import { API, fmtDate, ago } from './kit';
import { cn } from '@/lib/utils';

const KIND: Record<string, { icon: any; tint: string; label: string }> = {
  account_opened: { icon: Wallet, tint: '#4F6EF7', label: 'Account opened' },
  account_closed: { icon: CheckCircle2, tint: '#10B981', label: 'Account closed' },
  adverse: { icon: AlertTriangle, tint: '#EF4444', label: 'Adverse record' },
  inquiry: { icon: FileSearch, tint: '#8B5CF6', label: 'File searched' },
  scored: { icon: Gauge, tint: '#14B8A6', label: 'Score updated' },
  dispute: { icon: Scale, tint: '#F59E0B', label: 'Dispute raised' },
};

export default function CreditHistory() {
  const { request } = useAuth();
  const [events, setEvents] = useState<any[] | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/consumer/history`);
      setEvents(res.ok ? (await res.json()).events : []);
    })();
  }, []);

  if (!events) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const shown = filter === 'all' ? events : events.filter(e => e.kind === filter);

  // group by month
  const groups: Record<string, any[]> = {};
  shown.forEach(e => {
    const key = new Date(e.at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    (groups[key] ??= []).push(e);
  });

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={History} tint="#14B8A6" title="Credit History"
          subtitle="Everything that has happened on your credit file, newest first" />

        <div className="flex gap-2 flex-wrap">
          {[['all', 'Everything'], ...Object.entries(KIND).map(([k, v]) => [k, v.label])].map(([v, l]: any) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                filter === v ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : 'bg-white text-muted-foreground border-slate-200 hover:bg-slate-50')}>{l}</button>
          ))}
        </div>

        {Object.entries(groups).map(([month, items]) => (
          <Panel key={month} title={month} padded>
            <div className="space-y-1">
              {items.map((e, i) => {
                const meta = KIND[e.kind] ?? { icon: History, tint: '#94A3B8', label: e.kind };
                return (
                  <div key={i} className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.tint}1A` }}>
                      <meta.icon className="w-4 h-4" style={{ color: meta.tint }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{e.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{fmtDate(e.at)}</p>
                      <p className="text-[11px] text-gray-400">{ago(e.at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
        {shown.length === 0 && (
          <Panel padded><p className="text-center text-muted-foreground py-10">Nothing to show in this category yet.</p></Panel>
        )}
      </div>
    </Layout>
  );
}
