import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Badge, Toggle } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import {
  Puzzle, Landmark, Smartphone, Fingerprint, CreditCard, MessageSquare,
  Webhook, FolderSync, ShieldCheck, RefreshCw,
} from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const META: Record<string, { icon: any; tint: string }> = {
  'core-banking': { icon: Landmark, tint: '#4F6EF7' },
  'mno-feed': { icon: Smartphone, tint: '#14B8A6' },
  'nrc-registry': { icon: Fingerprint, tint: '#8B5CF6' },
  payments: { icon: CreditCard, tint: '#F59E0B' },
  sms: { icon: MessageSquare, tint: '#10B981' },
  webhooks: { icon: Webhook, tint: '#6366F1' },
  sftp: { icon: FolderSync, tint: '#0EA5E9' },
  sanctions: { icon: ShieldCheck, tint: '#EF4444' },
};
const healthTone: Record<string, string> = { connected: 'green', degraded: 'amber', not_configured: 'slate', disabled: 'slate' };

const timeAgo = (iso: string | null) => {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} day(s) ago`;
};

export default function Integrations() {
  const { request } = useAuth();
  const [items, setItems] = useState<any[] | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function load() {
    const res = await request(`${API}/admin/integrations`);
    setItems((await res.json()).integrations ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(i: any) {
    const res = await request(`${API}/admin/integrations/${i.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !i.enabled }),
    });
    if (res.ok) {
      const { integration } = await res.json();
      setItems(prev => prev!.map(x => (x.id === i.id ? integration : x)));
    }
  }

  async function sync(i: any) {
    setSyncing(i.id);
    const res = await request(`${API}/admin/integrations/${i.id}/sync`, { method: 'POST' });
    if (res.ok) {
      const { integration } = await res.json();
      setItems(prev => prev!.map(x => (x.id === i.id ? integration : x)));
    }
    setSyncing(null);
  }

  if (!items) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Puzzle} tint="#0EA5E9" title="Integrations"
          subtitle="External systems connected to the bureau platform" />

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(i => {
            const meta = META[i.key] ?? { icon: Puzzle, tint: '#64748B' };
            return (
              <div key={i.id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${meta.tint}1A` }}>
                    <meta.icon className="w-5 h-5" style={{ color: meta.tint }} />
                  </div>
                  <Toggle on={i.enabled} onChange={() => toggle(i)} />
                </div>
                <p className="font-semibold text-gray-900">{i.name}</p>
                <p className="text-sm text-muted-foreground mt-1 flex-1">{i.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <Badge tone={healthTone[i.health]}>{i.health.replace('_', ' ')}</Badge>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Sync: {timeAgo(i.lastSyncAt)}</span>
                    {i.enabled && (
                      <button onClick={() => sync(i)} disabled={syncing === i.id} title="Sync now"
                        className="text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50">
                        <RefreshCw className={syncing === i.id ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
