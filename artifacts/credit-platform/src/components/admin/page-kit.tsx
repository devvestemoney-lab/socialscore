import React from 'react';
import { cn } from '@/lib/utils';

/* ---------- Page header ---------- */
export function PageHeader({ icon: Icon, tint, title, subtitle, actions }: {
  icon: React.ElementType; tint: string; title: string; subtitle: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tint}1A` }}>
          <Icon className="w-5 h-5" style={{ color: tint }} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- KPI cards ---------- */
export type Kpi = { label: string; value: React.ReactNode; icon: React.ElementType; tint: string; sub?: React.ReactNode };

export function KpiGrid({ items }: { items: Kpi[] }) {
  const cols = items.length >= 5 ? 'md:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-4';
  return (
    <div className={cn('grid grid-cols-2 gap-4', cols)}>
      {items.map(({ label, value, icon: Icon, tint, sub }) => (
        <div key={label} className="p-5 rounded-xl bg-white border border-slate-200">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${tint}1A` }}>
            <Icon className="w-5 h-5" style={{ color: tint }} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Panel ---------- */
export function Panel({ title, subtitle, action, children, className, padded = false }: {
  title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <div className={cn('rounded-xl bg-white border border-slate-200 overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

/* ---------- Badge ---------- */
const tones: Record<string, string> = {
  green: 'bg-emerald-500/10 text-emerald-600',
  amber: 'bg-amber-500/10 text-amber-600',
  red: 'bg-rose-500/10 text-rose-600',
  blue: 'bg-blue-500/10 text-blue-600',
  violet: 'bg-violet-500/10 text-violet-600',
  cyan: 'bg-cyan-500/10 text-cyan-600',
  slate: 'bg-slate-500/10 text-slate-600',
};

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof tones | string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', tones[tone] ?? tones.slate)}>
      {children}
    </span>
  );
}

/* ---------- Progress bar ---------- */
export function Bar({ value, color = '#4F6EF7', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-2 rounded-full bg-slate-100 overflow-hidden w-full min-w-[80px]', className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

/* ---------- Table ---------- */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60">
            {head.map((h, i) => (
              <th key={i} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn('py-3 px-4 whitespace-nowrap text-gray-700', className)}>{children}</td>;
}

/* ---------- Toggle ---------- */
export function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange?.(!on)} aria-pressed={on}
      className={cn('relative w-10 h-[22px] rounded-full transition-colors shrink-0', on ? 'bg-blue-600' : 'bg-slate-300')}>
      <span className={cn('absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all', on ? 'left-[21px]' : 'left-[3px]')} />
    </button>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, subtitle, children, wide = false }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-h-[90vh] overflow-y-auto', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-lg text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Form field ---------- */
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {hint && <span className="font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-gray-900 text-sm ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition';

/* ---------- Pager ---------- */
export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm">
      <span className="text-muted-foreground text-xs">
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-gray-700 disabled:opacity-40 hover:bg-slate-50">Previous</button>
        <span className="text-xs text-muted-foreground">Page {page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-gray-700 disabled:opacity-40 hover:bg-slate-50">Next</button>
      </div>
    </div>
  );
}
