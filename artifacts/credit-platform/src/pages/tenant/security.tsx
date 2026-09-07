import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Toggle, Badge, Table, Td } from '@/components/admin/page-kit';
import { ShieldCheck, Smartphone, Globe2 } from 'lucide-react';

const initial = [
  { label: 'Require MFA for all workspace users', desc: 'TOTP or hardware key on every login', on: true },
  { label: 'Restrict logins to office IP ranges', desc: '196.216.60.0/22 (registered ranges)', on: true },
  { label: 'Session timeout after 15 minutes idle', desc: 'Stricter than the platform default of 24h tokens', on: false },
  { label: 'Require purpose note on every report pull', desc: 'Free-text justification stored in the audit log', on: true },
];
const sessions = [
  { user: 'Chanda Mulenga', device: 'Chrome · macOS', ip: '196.216.61.44', started: '09:02 today', current: true },
  { user: 'Mwansa Banda', device: 'Edge · Windows', ip: '196.216.61.19', started: '08:15 today', current: false },
  { user: 'Peter Lungu', device: 'Chrome · Windows', ip: '196.216.62.101', started: 'Yesterday 16:40', current: false },
];

export default function SecuritySettings() {
  const [settings, setSettings] = useState(initial);
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={ShieldCheck} tint="#10B981" title="Security Settings"
          subtitle="Access controls for your workspace" />
        <Panel title="Policies" padded>
          <div className="divide-y divide-slate-100">
            {settings.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
                <Toggle on={s.on} onChange={() => setSettings(prev => prev.map((x, j) => j === i ? { ...x, on: !x.on } : x))} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Active Sessions">
          <Table head={['User', 'Device', 'IP Address', 'Started', 'Status', '']}>
            {sessions.map(s => (
              <tr key={s.user + s.started} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-semibold text-gray-900">{s.user}</Td>
                <Td className="text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" />{s.device}</span></Td>
                <Td className="font-mono text-xs"><span className="inline-flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-gray-400" />{s.ip}</span></Td>
                <Td className="text-muted-foreground">{s.started}</Td>
                <Td>{s.current ? <Badge tone="green">this session</Badge> : <Badge tone="blue">active</Badge>}</Td>
                <Td>{!s.current && <button className="text-xs font-medium text-rose-600 hover:underline">Revoke</button>}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
