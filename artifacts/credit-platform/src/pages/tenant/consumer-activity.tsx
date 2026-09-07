import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { Activity, FileText, Gauge, Star, Search } from 'lucide-react';

const feed = [
  { icon: FileText, tint: '#10B981', text: 'C. Mulenga pulled a full report for Mwansa Chileshe (Personal Loan K85,000)', when: '09:41 today' },
  { icon: Search, tint: '#4F6EF7', text: 'M. Banda ran a soft pre-qualification for Chisomo Phiri', when: '08:55 today' },
  { icon: Star, tint: '#F59E0B', text: 'P. Lungu saved Grace Tembo to Saved Consumers', when: 'Yesterday 16:10' },
  { icon: Gauge, tint: '#14B8A6', text: 'Monthly score refresh completed for 184 monitored consumers', when: 'Yesterday 02:00' },
  { icon: FileText, tint: '#10B981', text: 'C. Mulenga pulled a full report for Namakau Sitali (Credit Limit Increase)', when: 'Yesterday 08:12' },
  { icon: Search, tint: '#EF4444', text: 'Inquiry declined for Joseph Sichone — no active consent on file', when: '02 Sep 14:02' },
];

export default function ConsumerActivity() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Activity} tint="#14B8A6" title="Consumer Activity"
          subtitle="Timeline of your team's activity on consumer files" />
        <Panel title="Activity Feed" padded>
          <div className="space-y-1">
            {feed.map((f, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.tint}1A` }}>
                  <f.icon className="w-4 h-4" style={{ color: f.tint }} />
                </span>
                <p className="text-sm text-gray-900 flex-1">{f.text}</p>
                <span className="text-xs text-muted-foreground shrink-0">{f.when}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Layout>
  );
}
