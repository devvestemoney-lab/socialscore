import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Toggle } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Settings, Globe, ShieldCheck, Archive, BellRing, CheckCircle2 } from 'lucide-react';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

const GROUP_META: Record<string, { icon: any; tint: string }> = {
  General: { icon: Globe, tint: '#4F6EF7' },
  Security: { icon: ShieldCheck, tint: '#10B981' },
  'Data Retention': { icon: Archive, tint: '#F59E0B' },
  Notifications: { icon: BellRing, tint: '#8B5CF6' },
};
const GROUP_ORDER = ['General', 'Security', 'Data Retention', 'Notifications'];

export default function SystemSettings() {
  const { request } = useAuth();
  const [settings, setSettings] = useState<any[] | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/admin/settings`);
      setSettings((await res.json()).settings ?? []);
    })();
  }, []);

  async function toggle(s: any) {
    setSettings(prev => prev!.map(x => (x.key === s.key ? { ...x, enabled: !x.enabled } : x)));
    const res = await request(`${API}/admin/settings/${s.key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !s.enabled }),
    });
    if (res.ok) {
      setSavedKey(s.key);
      setTimeout(() => setSavedKey(k => (k === s.key ? null : k)), 1600);
    } else {
      setSettings(prev => prev!.map(x => (x.key === s.key ? { ...x, enabled: s.enabled } : x)));
    }
  }

  if (!settings) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Settings} tint="#64748B" title="System Settings"
          subtitle="Platform-wide configuration — changes persist immediately and are audit-logged" />

        <div className="grid lg:grid-cols-2 gap-6">
          {GROUP_ORDER.map(group => {
            const meta = GROUP_META[group];
            const items = settings.filter(s => s.groupName === group);
            if (!items.length) return null;
            return (
              <Panel key={group} padded>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${meta.tint}1A` }}>
                    <meta.icon className="w-5 h-5" style={{ color: meta.tint }} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{group}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(s => (
                    <div key={s.key} className="flex items-center justify-between gap-4 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900 inline-flex items-center gap-2">
                          {s.label}
                          {savedKey === s.key && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 className="w-3 h-3" /> saved</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      </div>
                      <Toggle on={s.enabled} onChange={() => toggle(s)} />
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
