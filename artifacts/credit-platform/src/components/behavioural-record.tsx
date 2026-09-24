import { Panel, Badge, Table, Td } from '@/components/admin/page-kit';
import { Home, Smartphone, ShoppingCart, Briefcase, Users, Heart } from 'lucide-react';
import { DIMENSION_COLORS } from '@/components/risk-signals';
import { cn } from '@/lib/utils';

/**
 * Everything reported about a consumer outside traditional lending — every
 * rent payment, bill, refuse collection fee and peer loan — itemised for the analyst.
 * Shared by the tenant and super-admin report views.
 */

const ICON: Record<string, any> = {
  housing: Home, payments: Smartphone, peer: Users, commerce: ShoppingCart, stability: Briefcase,
};
const TINT = DIMENSION_COLORS;
const STATUS: Record<string, { label: string; tone: string }> = {
  on_time: { label: 'On time', tone: 'green' },
  late: { label: 'Late', tone: 'amber' },
  missed: { label: 'Missed', tone: 'red' },
  ongoing: { label: 'Ongoing', tone: 'blue' },
  ended: { label: 'Ended', tone: 'slate' },
};

const money = (v: number | null) => (v == null ? '—' : `K${Math.round(v).toLocaleString()}`);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function BehaviouralRecord({ record }: { record: any[] }) {
  if (!record?.length) {
    return (
      <Panel title="Behavioural Record" subtitle="Rent, bills, refuse collection, peer loans, instalments and employment reported about this consumer" padded>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nothing outside traditional lending has been reported about this consumer yet.
        </p>
      </Panel>
    );
  }

  const totalRecords = record.reduce((a, d) => a + d.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-display font-bold text-lg text-gray-900">Behavioural Record</h3>
          <p className="text-sm text-muted-foreground">
            {totalRecords} records across {record.length} area{record.length === 1 ? '' : 's'} of this consumer's life — every one reported by a named source
          </p>
        </div>
      </div>

      {record.map(dim => {
        const Icon = ICON[dim.key] ?? Heart;
        const tint = TINT[dim.key] ?? '#4F6EF7';
        return (
          <Panel key={dim.key}
            title={
              <span className="inline-flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${tint}1A` }}>
                  <Icon className="w-4 h-4" style={{ color: tint }} />
                </span>
                {dim.label}
                <span className="text-sm font-normal text-muted-foreground">· {dim.total} record{dim.total === 1 ? '' : 's'}</span>
              </span>
            }
            subtitle={dim.description}>

            {/* Summary by kind — "Airtime advances: 11 taken, 10 on time, 1 late, K215" */}
            <div className="px-6 py-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3 border-b border-slate-100">
              {dim.kinds.map((k: any) => (
                <div key={k.kind} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{k.label}{k.count > 1 ? 's' : ''}</p>
                    <p className="text-sm font-bold text-gray-900">{k.count}</p>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {k.onTime + k.late + k.missed > 0 ? (
                      <>
                        <span className={cn(k.onTime > 0 && 'text-emerald-600 font-medium')}>{k.onTime} on time</span>
                        {k.late > 0 && <> · <span className="text-amber-600 font-medium">{k.late} late</span></>}
                        {k.missed > 0 && <> · <span className="text-rose-600 font-medium">{k.missed} missed</span></>}
                      </>
                    ) : k.longestMonths != null ? (
                      <>{k.longestMonths} months</>
                    ) : (
                      <>reported</>
                    )}
                    {k.totalAmount != null && <> · {money(k.totalAmount)} total</>}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 truncate">{k.sources.join(', ')}</p>
                </div>
              ))}
            </div>

            <Table head={['Type', 'Reported by', 'Amount', 'Due', 'Paid', 'Status']}>
              {dim.records.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td>
                    <span className="font-medium text-gray-900">{r.kindLabel}</span>
                    {r.product && <span className="ml-1.5 text-[11px] text-gray-400">{r.product}</span>}
                  </Td>
                  <Td className="text-muted-foreground">{r.source}</Td>
                  <Td className={r.amount != null ? 'font-medium text-gray-900' : 'text-muted-foreground'}>
                    {r.months != null && r.amount == null ? `${r.months} months` : money(r.amount)}
                  </Td>
                  <Td className="text-muted-foreground">{fmtDate(r.dueDate)}</Td>
                  <Td className={cn('text-muted-foreground', r.status === 'missed' && 'text-rose-500')}>
                    {r.status === 'missed' ? 'not paid' : fmtDate(r.paidDate)}
                  </Td>
                  <Td><Badge tone={STATUS[r.status]?.tone ?? 'slate'}>{STATUS[r.status]?.label ?? r.status}</Badge></Td>
                </tr>
              ))}
            </Table>
          </Panel>
        );
      })}
    </div>
  );
}
