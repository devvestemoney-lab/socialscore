import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, KpiGrid, Panel, Badge, Table, Td, Toggle, Modal, Field, inputCls } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Webhook, Plus, Send, Trash2, Loader2, Copy, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const healthTone: Record<string, string> = { healthy: 'green', degraded: 'amber', failing: 'red', paused: 'slate' };
const fmtTime = (iso: string | null) => {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

export default function Webhooks() {
  const { request, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: '', description: '', events: [] as string[] });
  const [secret, setSecret] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'tenant_admin';

  async function load() {
    const res = await request(`${API}/tenant/webhooks`);
    setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await request(`${API}/tenant/webhooks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    const body = await res.json();
    if (!res.ok) { setError(body.message ?? 'Failed to add endpoint'); return; }
    setSecret(body.secret); setForm({ url: '', description: '', events: [] });
    load();
  }

  async function toggle(w: any) {
    await request(`${API}/tenant/webhooks/${w.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !w.active }),
    });
    load();
  }

  async function test(w: any) {
    setTesting(w.id);
    await request(`${API}/tenant/webhooks/${w.id}/test`, { method: 'POST' });
    setTesting(null); load();
  }

  async function remove(w: any) {
    if (!confirm(`Delete the endpoint ${w.url}?`)) return;
    await request(`${API}/tenant/webhooks/${w.id}`, { method: 'DELETE' });
    load();
  }

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { webhooks, deliveries, events } = data;
  const failed = deliveries.filter((d: any) => d.response_code >= 400).length;
  const successRate = deliveries.length ? Math.round(((deliveries.length - failed) / deliveries.length) * 100) : 100;

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Webhook} tint="#6366F1" title="Webhooks"
          subtitle="Receive platform events in your systems in real time"
          actions={isAdmin && (
            <button onClick={() => { setShowCreate(true); setSecret(null); setError(''); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Endpoint
            </button>
          )} />

        <KpiGrid items={[
          { label: 'Endpoints', value: webhooks.length, icon: Webhook, tint: '#6366F1', sub: `${webhooks.filter((w: any) => w.active).length} active` },
          { label: 'Deliveries (recent)', value: deliveries.length, icon: Activity, tint: '#4F6EF7' },
          { label: 'Success Rate', value: `${successRate}%`, icon: CheckCircle2, tint: successRate >= 95 ? '#10B981' : '#F59E0B' },
          { label: 'Failed Deliveries', value: failed, icon: XCircle, tint: failed ? '#EF4444' : '#94A3B8', sub: 'retried up to 3×' },
        ]} />

        <Panel title="Endpoints">
          <Table head={['URL', 'Events', 'Signing Secret', 'Health', 'Last Delivery', 'Enabled', '']}>
            {webhooks.map((w: any) => (
              <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                <Td>
                  <p className="font-mono text-xs text-gray-900 max-w-[260px] truncate">{w.url}</p>
                  {w.description && <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>}
                </Td>
                <Td><span className="flex gap-1 flex-wrap max-w-[220px]">{w.events.map((e: string) => <Badge key={e} tone="blue">{e}</Badge>)}</span></Td>
                <Td className="font-mono text-xs text-muted-foreground">{w.secretPrefix}</Td>
                <Td><Badge tone={healthTone[w.health] ?? 'slate'}>{w.health}</Badge></Td>
                <Td className="text-muted-foreground">{fmtTime(w.lastDeliveryAt)}</Td>
                <Td><Toggle on={w.active} onChange={() => isAdmin && toggle(w)} /></Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <button onClick={() => test(w)} disabled={!w.active || testing === w.id}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-40">
                      {testing === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Test
                    </button>
                    {isAdmin && <button onClick={() => remove(w)} className="text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </Td>
              </tr>
            ))}
            {webhooks.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-8">No endpoints configured yet.</Td></tr>}
          </Table>
        </Panel>

        <Panel title="Recent Deliveries" subtitle="Failed deliveries are retried three times with backoff">
          <Table head={['Event', 'Endpoint', 'Response', 'Attempts', 'Duration', 'When', 'Error']}>
            {deliveries.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                <Td className="font-mono text-xs text-gray-900">{d.event}</Td>
                <Td className="font-mono text-xs text-muted-foreground max-w-[220px] truncate">{String(d.url).replace(/^https:\/\/[^/]+/, '…')}</Td>
                <Td><Badge tone={d.response_code < 300 ? 'green' : 'red'}>{d.response_code}</Badge></Td>
                <Td className={d.attempts > 1 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>{d.attempts}</Td>
                <Td className="text-muted-foreground">{d.duration_ms}ms</Td>
                <Td className="text-muted-foreground">{fmtTime(d.created_at)}</Td>
                <Td className="text-xs text-rose-600 max-w-[220px] truncate">{d.error ?? ''}</Td>
              </tr>
            ))}
            {deliveries.length === 0 && <tr><Td colSpan={7} className="text-center text-muted-foreground py-6">No deliveries recorded yet.</Td></tr>}
          </Table>
        </Panel>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} wide title="Add Webhook Endpoint"
        subtitle="Events are signed with a secret shown once on creation">
        {secret ? (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              Endpoint created. Store this signing secret — verify the <span className="font-mono">X-SocialScore-Signature</span> header with it.
            </div>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-gray-900 break-all">
              <span className="flex-1">{secret}</span>
              <button onClick={() => navigator.clipboard?.writeText(secret)} className="text-gray-400 hover:text-gray-700 shrink-0"><Copy className="w-4 h-4" /></button>
            </div>
            <button onClick={() => setShowCreate(false)} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={create} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">{error}</div>}
            <Field label="Endpoint URL" hint="HTTPS only">
              <input required className={inputCls + ' font-mono text-xs'} value={form.url} placeholder="https://api.yourbank.co.zm/hooks/socialscore"
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </Field>
            <Field label="Description" hint="optional">
              <input className={inputCls} value={form.description} placeholder="What consumes this endpoint?"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Subscribe to events">
              <div className="grid sm:grid-cols-2 gap-2">
                {events.map((ev: string) => (
                  <button key={ev} type="button"
                    onClick={() => setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(x => x !== ev) : [...f.events, ev] }))}
                    className={cn('px-3.5 py-2 rounded-xl border text-sm font-mono text-left transition',
                      form.events.includes(ev) ? 'bg-blue-500/10 text-blue-700 border-blue-400' : 'bg-white text-gray-600 border-slate-200 hover:border-slate-300')}>
                    {ev}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving || !form.url || form.events.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Endpoint
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
