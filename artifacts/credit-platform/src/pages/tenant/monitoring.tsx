import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge } from '@/components/admin/page-kit';
import { Radar, Eye, TrendingDown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const events = [
  { sev: 'high', text: 'Mwansa Chileshe — score dropped 46 pts (742 → 696) after new arrears at Bayport', when: '2 hr ago' },
  { sev: 'high', text: 'Joseph Sichone — 3 hard inquiries at other institutions in the last 7 days', when: '5 hr ago' },
  { sev: 'medium', text: 'Kunda Musonda — new tradeline opened at MTN Mobile Money (K2,400)', when: 'Yesterday' },
  { sev: 'medium', text: 'Thandiwe Ngoma — missed payment reported by FINCA Zambia (30 DPD)', when: 'Yesterday' },
  { sev: 'low', text: 'Namakau Sitali — score improved 12 pts, now 761 (Band A)', when: '2 days ago' },
  { sev: 'low', text: 'Bwalya Kapembwa — consent renewed for 6 months', when: '3 days ago' },
];
const dot: Record<string, string> = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-emerald-400' };

export default function Monitoring() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Radar} tint="#EF4444" title="Monitoring & Alerts"
          subtitle="Change events on consumers your institution is watching" />
        <KpiGrid items={[
          { label: 'Monitored Consumers', value: 184, icon: Eye, tint: '#4F6EF7', sub: 'of your active borrowers' },
          { label: 'Events (7d)', value: 43, icon: Bell, tint: '#F59E0B' },
          { label: 'Score Deteriorations', value: 9, icon: TrendingDown, tint: '#EF4444', sub: 'drop > 30 pts' },
          { label: 'Competitor Inquiries', value: 17, icon: Radar, tint: '#8B5CF6', sub: 'on your borrowers' },
        ]} />
        <Panel title="Event Stream" subtitle="Configure triggers under Alerts & Notifications → Alert Rules" padded>
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors">
                <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', dot[e.sev])} />
                <p className="text-sm text-gray-900 flex-1">{e.text}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge tone={e.sev === 'high' ? 'red' : e.sev === 'medium' ? 'amber' : 'green'}>{e.sev}</Badge>
                  <span className="text-xs text-muted-foreground">{e.when}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
