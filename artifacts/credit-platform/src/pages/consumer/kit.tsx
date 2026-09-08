import { Bar } from '@/components/admin/page-kit';
import { cn } from '@/lib/utils';

export const API = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

export const bandTone: Record<string, string> = { A: 'green', B: 'blue', C: 'amber', D: 'red', E: 'red' };
export const BAND_COLOR: Record<string, string> = { A: '#10B981', B: '#4F6EF7', C: '#F59E0B', D: '#F97316', E: '#EF4444' };
export const money = (v: number) => `K${Math.round(Number(v)).toLocaleString()}`;
export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : `${Math.floor(d / 30)} mo ago`;
};

/** Big score dial used across the consumer portal */
export function ScoreDial({ score, band, rating, size = 200 }: { score: number; band: string; rating: string; size?: number }) {
  const pct = Math.max(0, Math.min(1, (score - 300) / 550));
  const r = 80, circ = Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size * 0.62 }}>
      <svg viewBox="0 0 200 112" className="w-full">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E2E8F0" strokeWidth="16" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={BAND_COLOR[band] ?? '#4F6EF7'} strokeWidth="16"
          strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <p className="font-display font-extrabold text-gray-900" style={{ fontSize: size * 0.22 }}>{score}</p>
        <p className="text-sm font-bold" style={{ color: BAND_COLOR[band] }}>{rating}</p>
        <p className="text-[10px] text-gray-400">Band {band} · 300–850</p>
      </div>
    </div>
  );
}

/** Plain-language factor row */
export function FactorRow({ label, value, hint }: { label: string; value: number; hint: string }) {
  const tone = value >= 75 ? '#10B981' : value >= 55 ? '#4F6EF7' : value >= 40 ? '#F59E0B' : '#EF4444';
  const verdict = value >= 75 ? 'Excellent' : value >= 55 ? 'Good' : value >= 40 ? 'Needs work' : 'Hurting your score';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-xs font-bold" style={{ color: tone }}>{verdict}</span>
      </div>
      <Bar value={value} color={tone} />
      <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

export const FACTOR_HINTS: Record<string, { label: string; hint: string }> = {
  repaymentHistory: { label: 'Paying on time', hint: 'The single biggest factor — every payment you make on schedule helps.' },
  transactionPatterns: { label: 'How you use credit', hint: 'Steady, predictable activity scores better than sudden spikes.' },
  loanDefaults: { label: 'Defaults and write-offs', hint: 'Accounts that went bad stay on your file and weigh heavily.' },
  mobileMoney: { label: 'Mobile money behaviour', hint: 'Your wallet activity helps build a picture even without bank loans.' },
  accountAge: { label: 'Length of credit history', hint: 'The longer your accounts have been open, the better.' },
};
