// Bayu, the LESTARI guide: an original hornbill (enggang) drawn in SVG.
// Groups carry class names so GSAP timelines can move the wing, head and casque.
export type Mood = 'happy' | 'cheer' | 'think' | 'read';

interface Props {
  mood?: Mood;
  className?: string;
  /** Leave empty when the mascot is decorative next to text that says the same thing. */
  label?: string;
}

export function Mascot({ mood = 'happy', className, label }: Props) {
  const decorative = !label;
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={label}
      focusable="false"
    >
      {/* tail */}
      <path className="bayu-tail" d="M70 176c-14 12-24 24-30 36l20-4c8-10 16-20 22-28z" fill="#2E2858" />
      <path d="M40 212l20-4c-2 3-4 6-7 8z" fill="#FFF6E6" />
      {/* feet */}
      <g fill="#F2762E">
        <rect x="88" y="190" width="14" height="12" rx="6" />
        <rect x="114" y="190" width="14" height="12" rx="6" />
      </g>
      {/* body */}
      <g className="bayu-body">
        <path d="M108 72c40 0 54 40 52 72-2 34-24 52-52 52s-50-18-52-52c-2-32 12-72 52-72z" fill="#1E1A3C" />
        <path d="M108 112c24 0 33 20 32 38-1 22-14 36-32 36s-31-14-32-36c-1-18 8-38 32-38z" fill="#FFF6E6" />
        {/* songket scarf */}
        <path d="M74 104c22 12 46 12 68 0l3 13c-23 12-51 12-74 0z" fill="#5B3FD8" />
        <path d="M128 112l14 26-15-4-6-18z" fill="#4A30BF" />
        <g fill="#FFC845">
          <circle cx="88" cy="111" r="2" />
          <circle cx="101" cy="114" r="2" />
          <circle cx="114" cy="114" r="2" />
          <circle cx="127" cy="111" r="2" />
        </g>
      </g>
      {/* wing */}
      <g className="bayu-wing" style={{ transformOrigin: '84px 128px', transformBox: 'view-box' }}>
        {mood === 'cheer' ? (
          <path d="M80 126c-20-10-30-30-26-50 14 6 26 18 34 34z" fill="#2E2858" />
        ) : (
          <path d="M66 128c-14 20-8 44 12 50-2-20 2-36 12-46z" fill="#2E2858" />
        )}
      </g>
      {mood === 'read' && (
        <g className="bayu-book">
          <path d="M80 150l28 8 28-8v30l-28 8-28-8z" fill="#FFFDF8" stroke="#D3C6AC" strokeWidth="2" strokeLinejoin="round" />
          <path d="M108 158v30" stroke="#D3C6AC" strokeWidth="2" />
          <path d="M88 160l14 4M88 168l14 4M114 164l14-4M114 172l14-4" stroke="#5B3FD8" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {/* head */}
      <g className="bayu-head" style={{ transformOrigin: '110px 96px', transformBox: 'view-box' }}>
        <circle cx="106" cy="70" r="38" fill="#1E1A3C" />
        {/* casque */}
        <path className="bayu-casque" d="M124 46c18-16 50-12 64 12-16-4-38-5-58 2z" fill="#F2762E" />
        <path d="M134 44c10-5 24-4 34 2" stroke="#FFB27A" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* beak */}
        <path d="M134 58c26-4 56 10 68 40-22-10-46-14-70-10z" fill="#FFC845" />
        <path d="M134 86c22-2 44 2 66 11-20 1-44 1-68-2z" fill="#E8A92A" />
        {/* eye */}
        {mood === 'think' ? (
          <>
            <circle cx="114" cy="64" r="12" fill="#FFFDF8" />
            <path d="M102 62a12 12 0 0 1 24 0z" fill="#1E1A3C" />
            <circle cx="117" cy="67" r="5" fill="#1E1A3C" />
          </>
        ) : (
          <>
            <circle cx="114" cy="64" r="12" fill="#FFFDF8" />
            <circle className="bayu-pupil" cx="117" cy="65" r="6.5" fill="#1E1A3C" />
            <circle cx="119.5" cy="62" r="2.2" fill="#FFFDF8" />
          </>
        )}
        <ellipse cx="96" cy="86" rx="8" ry="4.5" fill="#FF9A8B" opacity="0.5" />
      </g>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="#5B3FD8" />
      <circle cx="16" cy="22" r="9" fill="#1E1A3C" />
      <path d="M21 15c5-5 13-4 16 2-4-1-9-1-14 1z" fill="#F2762E" />
      <path d="M23 18c6-1 12 2 14 8-5-2-10-3-15-2z" fill="#FFC845" />
      <circle cx="18" cy="20" r="2.4" fill="#FFFDF8" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-8 shrink-0" />
      <span className="font-display text-[1.375rem] font-[760] leading-none tracking-[-0.03em] text-ink">lestari</span>
    </span>
  );
}
