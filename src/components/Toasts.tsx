import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Sparkles, Trophy, Target, X } from 'lucide-react';
import { useStore } from '../app/store';
import type { ProgressEvent } from '../lib/progress';
import { Mascot } from './Mascot';
import { useReducedMotion } from '../hooks/media';

interface Toast { id: number; kind: 'xp' | 'goal'; text: string }

/** XP and goal toasts, plus a larger moment for achievement unlocks. All announced politely. */
export function ProgressFeedback() {
  const store = useStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unlocked, setUnlocked] = useState<{ title: string; rule: string } | null>(null);
  const seq = useRef(0);

  useEffect(() => store.onEvent((e: ProgressEvent) => {
    if (e.type === 'achievement') { setUnlocked({ title: e.achievement.title, rule: e.achievement.rule }); return; }
    const id = ++seq.current;
    const t: Toast = e.type === 'xp' ? { id, kind: 'xp', text: `+${e.amount} XP: ${e.reason}` } : { id, kind: 'goal', text: 'Matlamat harian tercapai! Bagus, teruskan esok.' };
    setToasts((prev) => {
      // Merge rapid XP gains into one line rather than stacking many toasts.
      const last = prev[prev.length - 1];
      if (t.kind === 'xp' && last?.kind === 'xp' && e.type === 'xp') {
        const amount = Number(/\+(\d+)/.exec(last.text)?.[1] ?? 0) + e.amount;
        return [...prev.slice(0, -1), { id, kind: 'xp', text: `+${amount} XP: ${e.reason}` }];
      }
      return [...prev.slice(-2), t];
    });
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.kind === 'goal' ? 4200 : 2400);
  }), [store]);

  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="rise-in flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.875rem] font-[650] text-on-night shadow-[var(--shadow-lift)]">
            {t.kind === 'xp' ? <Sparkles className="size-4 text-sun" aria-hidden /> : <Target className="size-4 text-mint-bright" aria-hidden />}
            {t.text}
          </div>
        ))}
      </div>
      {unlocked && <AchievementMoment {...unlocked} onClose={() => setUnlocked(null)} />}
    </>
  );
}

function AchievementMoment({ title, rule, onClose }: { title: string; rule: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const ctx = gsap.context(() => {
      gsap.timeline()
        .from('.ach-card', { y: 24, scale: 0.94, opacity: 0, duration: 0.42, ease: 'power3.out' })
        .from('.ach-trophy', { rotate: -18, scale: 0.6, duration: 0.5, ease: 'back.out(2)' }, '-=0.2')
        .from('.ach-ray', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out' }, '<');
    }, el);
    return () => ctx.revert();
  }, [reduced]);
  useEffect(() => {
    const t = window.setTimeout(onClose, 6000);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div ref={ref} role="status" aria-live="assertive" className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div className="ach-card relative flex w-full max-w-[420px] items-center gap-4 overflow-hidden rounded-[var(--radius-xl)] bg-night p-4 pr-5 text-on-night shadow-[var(--shadow-lift)]">
        <div className="relative grid size-16 shrink-0 place-items-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="ach-ray absolute h-8 w-1 rounded-full bg-sun/70" style={{ transform: `rotate(${i * 45}deg) translateY(-22px)` }} />
          ))}
          <span className="ach-trophy relative grid size-12 place-items-center rounded-full bg-sun text-ink">
            <Trophy className="size-6" aria-hidden />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-[650] text-sun">Pencapaian baharu</p>
          <p className="font-display text-[1.25rem] font-[720] leading-tight">{title}</p>
          <p className="text-[0.8125rem] text-on-night-muted">{rule}</p>
        </div>
        <Mascot mood="cheer" className="hidden size-14 shrink-0 sm:block" />
        <button type="button" onClick={onClose} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full text-on-night-muted hover:text-on-night" aria-label="Tutup pemberitahuan pencapaian"><X className="size-4" aria-hidden /></button>
      </div>
    </div>
  );
}
