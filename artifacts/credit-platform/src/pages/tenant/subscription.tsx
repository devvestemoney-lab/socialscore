import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { useAuth } from '@/hooks/use-auth';
import { Tags, Check, CalendarClock, Headset, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';
const money = (v: number | string) => `K${Number(v).toLocaleString()}`;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const planTone: Record<string, string> = { Enterprise: 'violet', Growth: 'blue', Starter: 'slate' };

export default function Subscription() {
  const { request } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const res = await request(`${API}/tenant/subscription`);
      setData(await res.json());
    })();
  }, []);

  if (!data) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  const { subscription: s, plans, addons } = data;
  if (!s) return <Layout><Panel padded><p className="text-center text-muted-foreground py-10">No subscription on file — contact your account manager.</p></Panel></Layout>;

  const current = s.plan;
  const myAddons = addons.filter((a: any) => (s.addons ?? []).includes(a.code));
  const otherPlans = plans.filter((p: any) => p.id !== current.id);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader icon={Tags} tint="#8B5CF6" title="Subscription Plan"
          subtitle="Your current plan, add-ons and contract terms" />

        <div className="grid lg:grid-cols-3 gap-6">
          <Panel padded className="lg:col-span-2 border-violet-300">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone={planTone[current.name] ?? 'slate'}>{current.name}</Badge>
                <p className="mt-3 text-3xl font-display font-extrabold text-gray-900">
                  {money(current.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {current.includedReports.toLocaleString()} reports included · overage {money(current.overageRatePerReport)} per report
                  {Number(s.discountPct) > 0 && <span className="text-emerald-600 font-medium"> · {Number(s.discountPct)}% contract discount</span>}
                </p>
              </div>
              <Badge tone={s.status === 'active' ? 'green' : s.status === 'past_due' ? 'red' : 'amber'}>{s.status.replace('_', ' ')}</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5 mt-6">
              {(current.features ?? []).map((f: string) => (
                <p key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" /> {f}
                </p>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
              {[
                ['Subscribed since', fmtDate(s.startedAt)],
                ['Renews', fmtDate(s.renewsAt)],
                ['Contract ends', fmtDate(s.contractEndsAt)],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{l}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Your Add-ons" padded>
            <div className="space-y-4">
              {myAddons.map((a: any) => (
                <div key={a.code} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                  <Badge tone="green">{money(a.price)}{a.unit === 'per_report' ? '/report' : '/mo'}</Badge>
                </div>
              ))}
              {myAddons.length === 0 && <p className="text-sm text-muted-foreground">No add-ons on your plan.</p>}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Available</p>
              <div className="space-y-2.5">
                {addons.filter((a: any) => !(s.addons ?? []).includes(a.code)).map((a: any) => (
                  <div key={a.code} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{money(a.price)}{a.unit === 'per_report' ? '/report' : '/mo'}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-700 hover:bg-slate-50">
                <Headset className="w-4 h-4" /> Contact account manager
              </button>
            </div>
          </Panel>
        </div>

        <Panel title="Other Plans" subtitle="Changes take effect from your next renewal — speak to your account manager to switch">
          <Table head={['Plan', 'Monthly', 'Included Reports', 'Overage', 'Seats', '']}>
            {otherPlans.map((p: any) => {
              const upgrade = p.tier > current.tier;
              return (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td><Badge tone={planTone[p.name] ?? 'slate'}>{p.name}</Badge></Td>
                  <Td className="font-bold text-gray-900">{money(p.monthlyPrice)}</Td>
                  <Td>{p.includedReports.toLocaleString()}</Td>
                  <Td className="text-muted-foreground">{money(p.overageRatePerReport)}/report</Td>
                  <Td className="text-muted-foreground">{p.includedSeats === 0 ? 'Unlimited' : p.includedSeats}</Td>
                  <Td>
                    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', upgrade ? 'text-emerald-600' : 'text-gray-400')}>
                      {upgrade && <ArrowUpRight className="w-3 h-3" />}{upgrade ? 'Upgrade' : 'Downgrade'}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Panel>
      </div>
    </Layout>
  );
}
