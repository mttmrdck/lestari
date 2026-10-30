import { Link } from 'react-router';
import { Check, Star, Lock, BookOpenText } from 'lucide-react';
import type { Unit, UnitColor, NodeState } from '../lib/lessons';
import { Mascot } from './Mascot';

export const UNIT_COLORS: Record<UnitColor, { fill: string; edge: string; on: string; soft: string; ink: string }> = {
  green: { fill: 'var(--color-primary)', edge: 'var(--color-primary-edge)', on: 'var(--color-on-primary)', soft: 'var(--color-primary-soft)', ink: 'var(--color-on-primary-soft)' },
  sun: { fill: 'var(--color-sun)', edge: 'var(--color-sun-edge)', on: 'var(--color-ink)', soft: 'var(--color-sun-soft)', ink: 'var(--color-sun-ink)' },
  sky: { fill: 'var(--color-sky)', edge: 'var(--color-sky-edge)', on: 'var(--color-on-sky)', soft: 'var(--color-sky-soft)', ink: 'var(--color-sky-ink)' },
  rose: { fill: 'var(--color-rose)', edge: 'var(--color-rose-edge)', on: 'var(--color-on-rose)', soft: 'var(--color-rose-soft)', ink: 'var(--color-coral)' },
  lavender: { fill: 'var(--color-lavender)', edge: 'var(--color-lavender-edge)', on: 'var(--color-on-lavender)', soft: 'var(--color-lavender-soft)', ink: 'var(--color-lavender-ink)' },
};

// Horizontal offsets that make the trail snake; small enough to stay inside a phone column.
const OFFSETS = [0, 44, 64, 44, 0, -44, -64, -44];

export function UnitBanner({ unit, number, done }: { unit: Unit; number: number; done: number }) {
  const c = UNIT_COLORS[unit.color];
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] px-5 py-4" style={{ background: c.fill, color: c.on, boxShadow: `0 4px 0 ${c.edge}` }}>
      <p className="text-[0.8125rem] font-[800]">Unit {number}</p>
      <h3 className="text-[1.3rem] font-[900] leading-tight">{unit.title}</h3>
      <p className="mt-0.5 text-[0.9rem] font-[650] opacity-90">{unit.blurb}</p>
      <p className="tnum mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[0.8125rem] font-[850]" style={{ background: 'rgb(255 255 255 / 0.35)' }}>{done}/{unit.lessons.length} pelajaran</p>
      <BookOpenText className="absolute -right-3 -top-3 size-24 opacity-20" strokeWidth={1.6} aria-hidden />
    </div>
  );
}

export function PathNodes({ unit, states, highlight }: { unit: Unit; states: Map<string, NodeState>; highlight?: string | null }) {
  const c = UNIT_COLORS[unit.color];
  return (
    <ol className="relative mx-auto flex max-w-[360px] flex-col items-center gap-5 py-6" aria-label={`Laluan ${unit.title}`}>
      {unit.lessons.map((l, i) => {
        const st = states.get(l.id) ?? 'locked';
        const x = OFFSETS[i % OFFSETS.length];
        const label = `${l.title}: ${st === 'done' ? 'selesai' : st === 'current' ? 'pelajaran semasa' : 'dikunci'}`;
        const style = st === 'locked'
          ? { background: 'var(--color-line)', color: 'var(--color-ink-subtle)', boxShadow: '0 6px 0 var(--color-line-strong)' }
          : ({ background: c.fill, color: c.on, boxShadow: `0 6px 0 ${c.edge}`, '--node-edge': c.edge, '--node-ring': c.soft } as React.CSSProperties);
        const Icon = st === 'done' ? Check : st === 'current' ? Star : Lock;
        const node = (
          <span className={`relative grid size-[76px] place-items-center rounded-full transition-transform duration-150 active:translate-y-[5px] ${st === 'current' ? 'node-pulse' : ''} ${highlight === l.id ? 'pop' : ''}`} style={style}>
            <Icon className="size-9" strokeWidth={3} aria-hidden fill={st === 'current' ? 'currentColor' : 'none'} />
          </span>
        );
        return (
          <li key={l.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${x}px)` }}>
            {st === 'current' && (
              <span className="hop mb-2 rounded-[12px] border-2 border-line bg-surface px-3 py-1 text-[0.875rem] font-[900] shadow-[0_3px_0_var(--color-line)]" style={{ color: c.ink }}>Mula</span>
            )}
            {st === 'locked' ? (
              <span role="img" aria-label={`${label}. Selesaikan pelajaran sebelumnya dahulu.`} title="Selesaikan pelajaran sebelumnya dahulu">{node}</span>
            ) : (
              <Link to={`/pelajaran/${l.id}`} aria-label={label} className="rounded-full no-underline">{node}</Link>
            )}
            <span className={`mt-3 text-center text-[0.875rem] font-[800] ${st === 'locked' ? 'text-ink-subtle' : 'text-ink'}`}>{l.title}</span>
            {st === 'current' && (
              <Mascot mood="wave" idle className={`pointer-events-none absolute top-6 size-24 ${x >= 0 ? '-left-28' : '-right-28'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
