import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

const alerts = [
  { sev: 'high', text: 'Mwansa Chileshe — score dropped below your 700 threshold (now 696)', rule: 'Score drop > 30 pts', when: '2 hr ago', status: 'open' },
  { sev: 'high', text: 'Joseph Sichone — hard inquiry by Madison Finance', rule: 'Competitor inquiry on borrower', when: '6 hr ago', status: 'open' },
  { sev: 'medium', text: 'Thandiwe Ngoma — reported 30 DPD by another institution', rule: 'External arrears event', when: 'Yesterday', status: 'acknowledged' },
  { sev: 'medium', text: 'Kunda Musonda — new mobile-money facility opened', rule: 'New tradeline', when: 'Yesterday', status: 'open' },
  { sev: 'low', text: 'Namakau Sitali — consent expiring in 14 days', rule: 'Consent expiry', when: '2 days ago', status: 'resolved' },
];
const dot: Record<string, string> = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-slate-400' };

export default function ConsumerAlerts() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={BellRing} tint="#EF4444" title="Consumer Alerts"
          subtitle="Triggered by your alert rules on monitored consumers" />
        <Panel title="Alert Feed" padded>
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <div key={i} className={cn('flex items-start gap-3 p-4 rounded-xl border border-slate-200 transition-colors', a.status === 'resolved' ? 'opacity-50' : 'hover:bg-slate-50/70')}>
                <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', dot[a.sev], a.status === 'open' && a.sev === 'high' && 'animate-pulse')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rule: {a.rule} · {a.when}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={a.sev === 'high' ? 'red' : a.sev === 'medium' ? 'amber' : 'slate'}>{a.sev}</Badge>
                  <Badge tone={a.status === 'open' ? 'red' : a.status === 'acknowledged' ? 'amber' : 'green'}>{a.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
