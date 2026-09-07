import { Layout } from '@/components/layout';
import { PageHeader, Panel } from '@/components/admin/page-kit';
import { Bell, Megaphone, Wrench, FileText, CreditCard } from 'lucide-react';

const items = [
  { icon: Megaphone, tint: '#4F6EF7', title: 'SME Scorecard v2.1 rolling out to production', body: 'Your institution is in the 50% rollout cohort — expect improved discrimination on SME applications.', when: 'Today' },
  { icon: Wrench, tint: '#F59E0B', title: 'Scheduled maintenance — Sunday 07 Sep, 01:00–03:00 CAT', body: 'API responses may be delayed up to 30s during the database failover drill.', when: 'Yesterday' },
  { icon: FileText, tint: '#10B981', title: 'August statement available', body: 'Your usage statement and invoice INV-2026-084 are ready under Usage & Billing.', when: '2 days ago' },
  { icon: CreditCard, tint: '#8B5CF6', title: 'New endpoint: /v1/credit/score-batch', body: 'Score up to 500 consumers per call. See API documentation for request format.', when: '1 wk ago' },
];

export default function Notifications() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Bell} tint="#4F6EF7" title="System Notifications"
          subtitle="Platform announcements and service notices from the bureau" />
        <Panel padded>
          <div className="space-y-1">
            {items.map((n, i) => (
              <div key={i} className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${n.tint}1A` }}>
                  <n.icon className="w-5 h-5" style={{ color: n.tint }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{n.when}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
