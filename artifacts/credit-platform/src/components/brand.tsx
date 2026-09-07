export const NAVY = '#0E2A5C';
export const GREEN = '#16A34A';

/* Mini speedometer used as the "o" in the logo */
export function GaugeO({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="inline-block align-baseline" style={{ transform: 'translateY(2px)' }}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#E2E8F0" strokeWidth="4" />
      <path d="M 2.5 12 A 9.5 9.5 0 0 1 7 3.9" fill="none" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
      <path d="M 8.6 3.1 A 9.5 9.5 0 0 1 15.4 3.1" fill="none" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
      <path d="M 17 3.9 A 9.5 9.5 0 0 1 21.5 12" fill="none" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
      <line x1="12" y1="12" x2="17" y2="7.5" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill={NAVY} />
    </svg>
  );
}

export function Logo({ light = false, size = 'text-2xl' }: { light?: boolean; size?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${size} leading-none select-none`}>
      <span style={{ color: light ? '#FFFFFF' : NAVY }}>Social</span>
      <span style={{ color: GREEN }}>Sc</span><GaugeO /><span style={{ color: GREEN }}>re</span>
    </span>
  );
}
