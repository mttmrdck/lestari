import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { X, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import type { Peribahasa } from '../../types/peribahasa';
import { STATUS_INFO } from '../../lib/data';
import { normalize, stems } from '../../lib/text';

export function CategoryBadge({ r, showBasis = false }: { r: Peribahasa; showBasis?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.78rem] font-[650] text-on-primary-soft">
      {r.category}
      {showBasis && r.categoryBasis === 'peraturan' && <span className="font-[500]">(anggaran)</span>}
    </span>
  );
}

export function StatusBadge({ r, compact = false }: { r: Peribahasa; compact?: boolean }) {
  const info = STATUS_INFO[r.verificationStatus];
  if (compact && info.tone === 'neutral') return null;
  const cls = info.tone === 'good' ? 'bg-mint-soft text-mint' : info.tone === 'warn' ? 'bg-sun-soft text-sun-ink' : 'bg-surface-sunk text-ink-muted';
  const Icon = info.tone === 'warn' ? AlertTriangle : ShieldCheck;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.78rem] font-[650] ${cls}`}>
      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
      {compact ? (info.tone === 'good' ? 'PRPM' : 'Semak') : info.label}
    </span>
  );
}

export function ProgressBar({ value, max, label, tone = 'mint', className = '' }: { value: number; max: number; label: string; tone?: 'mint' | 'violet' | 'sun'; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill = tone === 'violet' ? 'bg-primary' : tone === 'sun' ? 'bg-sun' : 'bg-mint-bright';
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className={`h-2.5 overflow-hidden rounded-full bg-surface-sunk ${className}`}>
      <div className={`h-full rounded-full ${fill} origin-left transition-transform duration-500 ease-[var(--ease-out)]`} style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-[14px] bg-surface-sunk p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3 text-[0.9375rem] font-[680] transition-[background-color,color,box-shadow] duration-200 ${active ? 'bg-surface text-ink shadow-[var(--shadow-rest)]' : 'text-ink-muted hover:text-ink'}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Highlight words of `text` whose normalised form (or a stem) is in `terms`. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  // Phrase triggers ("baru mula") highlight each of their words.
  const words = terms.flatMap((t) => normalize(t).split(' ')).filter(Boolean);
  const set = new Set(words);
  const termStems = new Set(words.flatMap((t) => stems(t)).filter((x) => x.length >= 5));
  const parts = text.split(/(\s+|[,.;:!?“”"()]+)/);
  const isHit = (p: string) => { const n = normalize(p); return !!n && (set.has(n) || stems(n).some((x) => termStems.has(x))); };
  const hits = parts.map(isHit);
  // Merge "baru" + " " + "mula" into one mark so a matched phrase reads as one.
  const merged: { text: string; hit: boolean }[] = [];
  parts.forEach((p, i) => {
    const bridge = /^\s+$/.test(p) && hits[i - 1] && hits[i + 1];
    const hit = hits[i] || bridge;
    const last = merged[merged.length - 1];
    if (last && last.hit === hit) last.text += p; else merged.push({ text: p, hit });
  });
  return (
    <>
      {merged.map((m, i) => m.hit ? <mark key={i} className="rounded-[4px] bg-sun-soft px-0.5 text-ink [box-decoration-break:clone]">{m.text}</mark> : <span key={i}>{m.text}</span>)}
    </>
  );
}

export function PeribahasaRow({ r, terms = [], trailing, note }: { r: Peribahasa; terms?: string[]; trailing?: ReactNode; note?: ReactNode }) {
  return (
    <Link to={`/peribahasa/${r.id}`} className="card card-link group flex items-start gap-3 p-4 no-underline sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="saying text-[1.125rem] leading-snug text-ink">
          <Highlight text={r.peribahasa} terms={terms} />
        </p>
        <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-muted">
          <Highlight text={r.maksud} terms={terms} />
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <CategoryBadge r={r} />
          <StatusBadge r={r} compact />
          {note}
        </div>
      </div>
      {trailing ?? <ChevronRight className="mt-1 size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />}
    </Link>
  );
}

export function EmptyState({ art, title, children, action }: { art?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line-strong px-6 py-10 text-center">
      {art}
      <h3 className="text-[1.125rem] font-[680]">{title}</h3>
      {children && <div className="max-w-[46ch] text-[0.9375rem] text-ink-muted">{children}</div>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 mt-10 flex items-end justify-between gap-3 first:mt-0">
      <h2 id={id} className="text-[1.25rem] font-[700] tracking-[-0.015em]">{children}</h2>
      {action}
    </div>
  );
}

/** Modal sheet built on <dialog>: native focus trapping and Escape handling. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="sheet mx-auto mb-0 mt-auto w-full max-w-full rounded-t-[var(--radius-xl)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/40 sm:m-auto sm:w-[min(520px,calc(100vw-24px))] sm:rounded-[var(--radius-xl)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id={id} className="text-[1.125rem] font-[700]">{title}</h2>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-surface-sunk" aria-label="Tutup">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="sheet-body px-5 py-5">{children}</div>
    </dialog>
  );
}

export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="tnum font-display text-[1.75rem] font-[720] leading-none tracking-[-0.02em]">{value}</div>
      <div className="mt-1.5 text-[0.8125rem] font-[600] text-ink-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[0.75rem] text-ink-subtle">{hint}</div>}
    </div>
  );
}
