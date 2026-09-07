import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge } from '@/components/admin/page-kit';
import { Tags, Check } from 'lucide-react';

const FEATURES = ['25,000 credit reports / month', 'All APIs + portfolio monitoring', 'Unlimited user seats', 'Dedicated account manager', 'Real-time data streaming', 'Custom scorecards', '99.9% uptime SLA'];

export default function Subscription() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Tags} tint="#8B5CF6" title="Subscription Plan"
          subtitle="Your current plan and available options" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel padded className="lg:col-span-2 border-violet-300">
            <div className="flex items-start justify-between">
              <div>
                <Badge tone="violet">Enterprise</Badge>
                <p className="mt-3 text-3xl font-display font-extrabold text-gray-900">K68,000<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                <p className="text-sm text-muted-foreground mt-1">Renews monthly · contract until Jan 2027 · overage at K35/report</p>
              </div>
              <Badge tone="green">active</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5 mt-6">
              {FEATURES.map(f => (
                <p key={f} className="flex items-start gap-2 text-sm text-gray-700"><Check className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" /> {f}</p>
              ))}
            </div>
          </Panel>
          <Panel title="Add-ons" padded>
            <div className="space-y-4">
              {[['Sanctions & PEP screening', 'K12 per report', 'active'], ['Dedicated sandbox', 'K3,000 / month', 'active'], ['Portfolio monitoring module', 'included', 'included']].map(([n, p, s]) => (
                <div key={n} className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-medium text-gray-900">{n}</p><p className="text-xs text-muted-foreground">{p}</p></div>
                  <Badge tone={s === 'active' ? 'green' : 'blue'}>{s}</Badge>
                </div>
              ))}
              <button className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">
                Contact account manager
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
