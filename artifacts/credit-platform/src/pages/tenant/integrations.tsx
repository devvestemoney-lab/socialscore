import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Badge, Toggle } from '@/components/admin/page-kit';
import { Puzzle, Landmark, FolderSync, MessageSquare, Webhook } from 'lucide-react';

const initial = [
  { icon: Landmark, tint: '#4F6EF7', name: 'Core Banking Connect', desc: 'Direct T24 feed for daily tradeline updates to the bureau', on: true, health: 'connected', sync: '12 min ago' },
  { icon: Webhook, tint: '#6366F1', name: 'Event Webhooks', desc: 'Reports, alerts and dispute events pushed to your systems', on: true, health: 'connected', sync: '3 min ago' },
  { icon: FolderSync, tint: '#0EA5E9', name: 'SFTP Batch Exchange', desc: 'Fallback channel for monthly batch submissions', on: true, health: 'connected', sync: 'Yesterday' },
  { icon: MessageSquare, tint: '#10B981', name: 'SMS Notifications', desc: 'Notify your consumers on inquiries via the bureau gateway', on: false, health: 'not configured', sync: '—' },
];

export default function TenantIntegrations() {
  const [items, setItems] = useState(initial);
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Puzzle} tint="#0EA5E9" title="Integrations"
          subtitle="Connections between your systems and the Social Score platform" />
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((i, idx) => (
            <div key={i.name} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${i.tint}1A` }}>
                  <i.icon className="w-5 h-5" style={{ color: i.tint }} />
                </div>
                <Toggle on={i.on} onChange={() => setItems(prev => prev.map((x, j) => j === idx ? { ...x, on: !x.on } : x))} />
              </div>
              <p className="font-semibold text-gray-900">{i.name}</p>
              <p className="text-sm text-muted-foreground mt-1 flex-1">{i.desc}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <Badge tone={i.health === 'connected' ? 'green' : 'slate'}>{i.health}</Badge>
                <span className="text-xs text-muted-foreground">Last sync: {i.sync}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
