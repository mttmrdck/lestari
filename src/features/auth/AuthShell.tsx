import { useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Mascot, Wordmark, type Mood } from '../../components/Mascot';
import { useReducedMotion } from '../../hooks/media';

export interface BayuState { mood: Mood; cover: 'none' | 'full' | 'peek'; look: number; say: string }

/** The night hills with Bayu on one side and the form on the other. Stacks on phones. */
export function AuthShell({ bayu, children }: { bayu: BayuState; children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useGSAP(() => {
    if (reduced) return;
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.a-scene', { opacity: 0, scale: 0.97, duration: 0.5 })
      .from('.a-bayu', { y: 40, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' }, 0.1)
      .from('.a-bubble', { scale: 0.8, opacity: 0, transformOrigin: 'left bottom', duration: 0.35, ease: 'back.out(2)' }, 0.45)
      .from('.a-form > *', { y: 14, opacity: 0, duration: 0.35, stagger: 0.05 }, 0.15);
  }, { scope, dependencies: [reduced] });

  return (
    <div ref={scope} className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="a-scene on-night relative overflow-hidden bg-night text-on-night lg:min-h-dvh">
        <Starfield />
        <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full lg:h-56" aria-hidden>
          <path d="M0 110c60-30 110-34 160-14s110 22 150-6 70-30 90-24v94H0z" fill="var(--color-night-raised)" />
          <path d="M0 136c70-22 130-20 190-4s120 14 210-14v42H0z" fill="var(--color-primary-edge)" />
          <path d="M0 150c80-14 150-12 210-2s120 8 190-6v18H0z" fill="var(--color-primary)" />
        </svg>
        <div className="relative mx-auto flex max-w-[520px] flex-col px-4 pb-3 pt-[calc(14px+env(safe-area-inset-top))] sm:px-8 lg:h-full lg:justify-center lg:pb-24 lg:pt-10">
          <Link to="/" aria-label="LESTARI, laman utama" className="no-underline lg:absolute lg:left-8 lg:top-8">
            <span className="inline-block rounded-[14px] bg-surface px-2.5 py-1.5"><Wordmark /></span>
          </Link>
          <div className="mt-2 flex items-end gap-2 lg:mt-0 lg:flex-col lg:items-center lg:gap-5">
            <p aria-live="polite" className="a-bubble order-2 mb-8 min-w-0 flex-1 rounded-[18px] rounded-bl-[4px] bg-surface px-4 py-3 text-[0.9375rem] font-[750] leading-snug text-ink lg:order-1 lg:mb-0 lg:flex-none lg:rounded-bl-[18px] lg:px-5 lg:text-[1.125rem]">{bayu.say}</p>
            <div className="a-bayu order-1 w-[112px] shrink-0 sm:w-[136px] lg:order-2 lg:w-[300px]">
              <Mascot mood={bayu.mood} cover={bayu.cover} look={bayu.look} idle className="w-full drop-shadow-[0_10px_18px_var(--color-mascot-shadow)]" label="Bayu, burung enggang pemandu LESTARI" />
            </div>
          </div>
        </div>
      </aside>
      <main className="flex items-start justify-center px-4 pb-10 pt-6 sm:px-8 lg:items-center lg:py-10">
        <div className="a-form w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}

function Starfield() {
  const pts = [[8, 14], [20, 40], [36, 10], [58, 26], [76, 12], [90, 34], [48, 46], [14, 58], [82, 54], [64, 8]];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-on-night" aria-hidden>
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.7 : 0.4} fill="currentColor" opacity={0.6} />)}
    </svg>
  );
}

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string | null;
  good?: string | null;
  hint?: ReactNode;
}

export function Field({ id, label, icon: Icon, error, good, hint, type, ...rest }: FieldProps) {
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error || good ? `${id}-mesej` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-[0.9375rem] font-[800]">{label}</label>
      <div className="relative mt-1">
        <Icon className={`pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 transition-colors duration-150 ${error ? 'text-coral' : 'text-ink-subtle'}`} aria-hidden />
        <input
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`field pl-11 ${isPassword ? 'pr-12' : ''} ${error ? '!border-coral' : good ? '!border-primary' : ''}`}
          {...rest}
        />
        {isPassword && (
          <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-label={shown ? 'Sembunyikan kata laluan' : 'Tunjuk kata laluan'} className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-surface-sunk">
            <span key={String(shown)} className="pop grid place-items-center">{shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}</span>
          </button>
        )}
      </div>
      {error && <p id={`${id}-mesej`} role="alert" className="shake mt-1 flex items-center gap-1.5 text-[0.875rem] font-[700] text-coral"><AlertCircle className="size-4 shrink-0" aria-hidden />{error}</p>}
      {!error && good && <p id={`${id}-mesej`} className="mt-1 flex items-center gap-1.5 text-[0.875rem] font-[700] text-primary-ink"><CheckCircle2 className="size-4 shrink-0" aria-hidden />{good}</p>}
      {hint}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return <p role="alert" className="shake flex items-start gap-2 rounded-[var(--radius-md)] bg-coral-soft px-3.5 py-2.5 text-[0.9375rem] font-[750] text-coral"><AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />{children}</p>;
}

export function Spinner() {
  return <span aria-hidden className="spin inline-block size-5 rounded-full border-[3px] border-current border-r-transparent" />;
}
