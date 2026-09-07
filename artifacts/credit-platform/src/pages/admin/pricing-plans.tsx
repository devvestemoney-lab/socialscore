import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { Tags, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter', price: 'K7,500', per: '/month', tint: '#64748B', popular: false, tenants: 3,
    features: ['2,500 credit reports / month', 'Score-only API access', '2 user seats included', 'Email support (48h SLA)', 'Monthly batch submission'],
  },
  {
    name: 'Growth', price: 'K24,000', per: '/month', tint: '#4F6EF7', popular: true, tenants: 4,
    features: ['10,000 credit reports / month', 'Full report + score APIs', '15 user seats included', 'Priority support (8h SLA)', 'Daily API data submission', 'Webhook event delivery'],
  },
  {
    name: 'Enterprise', price: 'K68,000', per: '/month', tint: '#8B5CF6', popular: false, tenants: 5,
    features: ['25,000 credit reports / month', 'All APIs + portfolio monitoring', 'Unlimited user seats', 'Dedicated account manager', 'Real-time data streaming', 'Custom scorecards', '99.9% uptime SLA'],
  },
];

const addons = [
  { item: 'Additional credit report (overage)', price: 'K35 each', applied: 'All plans' },
  { item: 'Sanctions & PEP screening enrichment', price: 'K12 per report', applied: 'Growth, Enterprise' },
  { item: 'Portfolio monitoring module', price: 'K9,500 / month', applied: 'Growth' },
  { item: 'Dedicated sandbox environment', price: 'K3,000 / month', applied: 'All plans' },
];

export default function PricingPlans() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Tags} tint="#8B5CF6" title="Pricing Plans"
          subtitle="Subscription tiers and add-ons offered to participating institutions"
          actions={
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-900 text-sm font-medium transition-colors">
              <Pencil className="w-4 h-4" /> Edit Pricing
            </button>
          } />

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.name} className={cn('relative p-6 rounded-2xl bg-white border flex flex-col', p.popular ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-slate-200')}>
              {p.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold">
                  Most Popular
                </span>
              )}
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: p.tint }}>{p.name}</p>
              <p className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.per}</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: p.tint }} /> {f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-muted-foreground">
                {p.tenants} tenant{p.tenants !== 1 ? 's' : ''} currently subscribed
              </p>
            </div>
          ))}
        </div>

        <Panel title="Add-ons & Overage Pricing">
          <Table head={['Item', 'Price', 'Available On']}>
            {addons.map(a => (
              <tr key={a.item} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-medium text-gray-900">{a.item}</Td>
                <Td>{a.price}</Td>
                <Td><Badge tone="blue">{a.applied}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
