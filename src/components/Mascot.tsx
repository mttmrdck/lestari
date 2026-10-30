// Bayu, the LESTARI guide: an original rhinoceros hornbill (enggang) drawn in SVG.
// A small set of expressions reused across the app; `idle` adds a gentle float and blink.
// Groups carry class names so GSAP timelines can move the wing, head and casque.
export type Mood = 'happy' | 'cheer' | 'think' | 'read' | 'encourage' | 'wave' | 'wow';

interface Props {
  mood?: Mood;
  className?: string;
  /** Leave empty when the mascot is decorative next to text that says the same thing. */
  label?: string;
  /** Gentle float and blink. Disabled automatically under prefers-reduced-motion (global CSS). */
  idle?: boolean;
  /** Wing over the eye: 'full' hides it (password typing), 'peek' leaves a gap (password shown). */
  cover?: 'none' | 'full' | 'peek';
  /** Where Bayu looks, -1 (left) to 1 (right); follows typing on the sign-in form. */
  look?: number;
}

const BODY = '#263238';
const WING = '#34454D';
const BELLY = '#FFFDF5';
const BEAK = '#FFC800';
const BEAK_LOW = '#F0A500';
const CASQUE = '#FF8A3D';
const SCARF = '#58CC02';
const SCARF_EDGE = '#46A302';

export function Mascot({ mood = 'happy', className, label, idle = false, cover = 'none', look = 0 }: Props) {
  const decorative = !label;
  const beakOpen = mood === 'cheer' || mood === 'wow' || mood === 'wave';
  const wingUp = mood === 'cheer' || mood === 'wave';
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={label}
      focusable="false"
    >
      <ellipse cx="110" cy="208" rx="46" ry="7" fill="#263238" opacity="0.12" />
      <g className={idle ? 'float' : undefined} style={{ transformBox: 'view-box', transformOrigin: '110px 200px' }}>
        {/* tail with white band */}
        <path d="M70 172c-14 12-24 24-30 36l22-4c8-10 16-20 22-28z" fill={WING} />
        <path d="M40 208l22-4c-2 3-4 6-7 8z" fill={BELLY} />
        {/* feet */}
        <g fill={CASQUE}>
          <rect x="88" y="188" width="15" height="12" rx="6" />
          <rect x="114" y="188" width="15" height="12" rx="6" />
        </g>
        {/* body */}
        <g className="bayu-body">
          <path d="M108 70c42 0 56 42 54 74-2 34-24 52-54 52s-52-18-54-52c-2-32 12-74 54-74z" fill={BODY} />
          <path d="M108 112c25 0 34 20 33 38-1 22-14 36-33 36s-32-14-33-36c-1-18 8-38 33-38z" fill={BELLY} />
          {/* songket scarf */}
          <path d="M72 102c23 13 49 13 72 0l3 14c-24 13-54 13-78 0z" fill={SCARF} />
          <path d="M72 109c23 13 49 13 72 0l2 7c-24 13-54 13-77 0z" fill={SCARF_EDGE} />
          <path d="M128 112l15 27-16-4-6-18z" fill={SCARF_EDGE} />
          <g fill={BEAK}>
            {[86, 100, 114, 128].map((x) => <path key={x} d={`M${x} 109l3 3-3 3-3-3z`} />)}
          </g>
        </g>
        {/* wing */}
        <g className="bayu-wing" style={{ transformOrigin: '84px 126px', transformBox: 'view-box' }}>
          {wingUp ? (
            <path d="M80 124c-22-8-34-30-30-52 16 6 28 20 36 36z" fill={WING} />
          ) : mood === 'think' ? (
            <path d="M70 126c-10 14-4 30 12 34 10-6 18-14 22-24-12 0-24-4-34-10z" fill={WING} />
          ) : (
            <path d="M64 126c-14 20-8 44 12 50-2-20 2-36 12-46z" fill={WING} />
          )}
        </g>
        {mood === 'read' && (
          <g className="bayu-book">
            <path d="M80 148l28 8 28-8v30l-28 8-28-8z" fill="#FFFFFF" stroke="#D9D2BE" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M108 156v30" stroke="#D9D2BE" strokeWidth="2.5" />
            <path d="M88 158l14 4M88 166l14 4M114 162l14-4M114 170l14-4" stroke={SCARF_EDGE} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
        {mood === 'encourage' && (
          <path d="M150 128c10-6 20-4 24 4l-8 10c-6-4-12-4-18 0z" fill={WING} />
        )}
        {/* head */}
        <g className="bayu-head" style={{ transformOrigin: '110px 96px', transformBox: 'view-box' }}>
          <circle cx="106" cy="68" r="39" fill={BODY} />
          {/* casque */}
          <path className="bayu-casque" d="M122 44c19-17 53-13 68 13-17-5-40-6-61 2z" fill={CASQUE} />
          <path d="M133 42c11-5 26-4 36 2" stroke="#FFC29A" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          {/* beak */}
          <path d="M133 57c27-4 58 10 70 40-23-10-48-14-72-10z" fill={BEAK} />
          <g style={{ transformOrigin: '134px 86px', transformBox: 'view-box', transform: beakOpen ? 'rotate(12deg)' : undefined }}>
            <path d="M133 85c23-2 46 2 68 11-21 1-46 1-70-2z" fill={BEAK_LOW} />
          </g>
          {beakOpen && <path d="M136 88c10 4 20 6 30 6-10 4-22 4-30 0z" fill="#E05555" />}
          {/* eye */}
          <g className={idle ? 'bayu-blink' : undefined}>
            <circle cx="114" cy="63" r="12.5" fill="#FFFFFF" />
            {mood === 'think' ? (
              <>
                <circle cx="119" cy="59" r="6" fill={BODY} />
                <circle cx="121" cy="57" r="2" fill="#FFFFFF" />
              </>
            ) : mood === 'wow' ? (
              <>
                <circle cx="114" cy="63" r="7.5" fill={BODY} />
                <circle cx="117" cy="60" r="2.6" fill="#FFFFFF" />
              </>
            ) : (
              <>
                <g className="bayu-look" style={{ transform: `translateX(${look * 4}px)` }}>
                  <circle className="bayu-pupil" cx="117" cy="64" r="6.5" fill={BODY} />
                  <circle cx="119.5" cy="61" r="2.3" fill="#FFFFFF" />
                </g>
              </>
            )}
            {mood === 'happy' || mood === 'cheer' || mood === 'wave' ? (
              <path d="M101 70c8 6 19 6 26 0" stroke={BODY} strokeWidth="5" fill="none" strokeLinecap="round" />
            ) : null}
          </g>
          {/* brows carry the emotion */}
          {mood === 'encourage' && <path d="M101 45c8-6 18-6 25 0" stroke="#FFC29A" strokeWidth="4" fill="none" strokeLinecap="round" />}
          {mood === 'think' && <path d="M103 46l22-5" stroke="#FFC29A" strokeWidth="4" strokeLinecap="round" />}
          {mood === 'wow' && <path d="M102 44c7-8 19-8 25 0" stroke="#FFC29A" strokeWidth="4" fill="none" strokeLinecap="round" />}
          <ellipse cx="96" cy="85" rx="8.5" ry="5" fill="#FF8E8E" opacity="0.55" />
          {/* wing that covers the eye while a password is typed */}
          <g className="bayu-cover" style={{ transform: cover === 'full' ? 'translateY(0)' : cover === 'peek' ? 'translateY(13px)' : 'translateY(60px)', opacity: cover === 'none' ? 0 : 1 }}>
            <path d="M92 74c-6-16 8-30 24-28 13 2 22 12 19 26-4 9-40 11-43 2z" fill={WING} />
            <path d="M99 70c7 4 22 4 30 0" stroke={BODY} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
          </g>
        </g>
        {mood === 'cheer' && (
          <g fill={BEAK}>
            <path d="M40 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
            <path d="M182 120l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
            <path d="M58 98l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="12" fill="#58CC02" />
      <rect y="34" width="40" height="6" rx="3" fill="#46A302" />
      <circle cx="16" cy="21" r="9" fill="#263238" />
      <path d="M21 14c5-5 13-4 16 2-4-1-9-1-14 1z" fill="#FF8A3D" />
      <path d="M23 17c6-1 12 2 14 8-5-2-10-3-15-2z" fill="#FFC800" />
      <circle cx="18" cy="19" r="2.6" fill="#FFFFFF" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-9 shrink-0" />
      <span className="font-display text-[1.5rem] font-[900] leading-none tracking-[-0.02em] text-primary-ink">lestari</span>
    </span>
  );
}
