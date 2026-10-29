import { Footprints, Flame, BookOpen, Crown, Search, Smile, MessagesSquare, CalendarCheck, Layers, Puzzle, Lock } from 'lucide-react';
import type { AchievementId } from '../lib/progress';

// Illustrated achievement badges: a shield with a ribbon, coloured per achievement, grey when locked.
const STYLE: Record<AchievementId, { fill: string; edge: string; icon: typeof Flame }> = {
  'mula-melangkah': { fill: '#58CC02', edge: '#46A302', icon: Footprints },
  'langkah-pertama': { fill: '#1CB0F6', edge: '#1899D6', icon: Puzzle },
  konsisten: { fill: '#FF8A3D', edge: '#E06F22', icon: Flame },
  'bijak-bahasa': { fill: '#CE82FF', edge: '#A568CC', icon: BookOpen },
  'raja-peribahasa': { fill: '#FFC800', edge: '#E0A800', icon: Crown },
  'pencari-tegar': { fill: '#1CB0F6', edge: '#1899D6', icon: Search },
  'pakar-emoji': { fill: '#FF6B6B', edge: '#E05555', icon: Smile },
  'mahir-konteks': { fill: '#58CC02', edge: '#46A302', icon: MessagesSquare },
  'teka-harian': { fill: '#CE82FF', edge: '#A568CC', icon: CalendarCheck },
  'ulang-kaji-rajin': { fill: '#FF6B6B', edge: '#E05555', icon: Layers },
};

export function AchievementBadge({ id, unlocked, className = 'size-16' }: { id: AchievementId; unlocked: boolean; className?: string }) {
  const s = STYLE[id];
  const Icon = unlocked ? s.icon : Lock;
  const fill = unlocked ? s.fill : '#E9E4D4';
  const edge = unlocked ? s.edge : '#D9D2BE';
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} aria-hidden>
      <svg viewBox="0 0 64 70" className="absolute inset-0 size-full">
        <path d="M32 4l24 8v20c0 16-10 28-24 34C18 60 8 48 8 32V12z" fill={edge} transform="translate(0 3)" />
        <path d="M32 4l24 8v20c0 16-10 28-24 34C18 60 8 48 8 32V12z" fill={fill} />
        <path d="M32 9l19 6v17c0 13-8 23-19 28" fill="#FFFFFF" opacity={unlocked ? 0.22 : 0.4} />
      </svg>
      <Icon className={`relative -mt-1 size-[42%] ${unlocked ? 'text-surface drop-shadow-[0_2px_0_var(--color-mascot-shadow)]' : 'text-ink-subtle'}`} strokeWidth={2.6} />
    </span>
  );
}
