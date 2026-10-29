import { DAY_MS, startOfDay } from './date';

export type Rating = 'susah' | 'sederhana' | 'mudah';

export interface CardState {
  id: string;
  /** Timestamp (ms) when the card is next due. */
  due: number;
  /** Current interval in days (0 while relearning). */
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  lastRating?: Rating;
  introduced: number;
  history: { t: number; r: Rating }[];
}

export const RELEARN_MS = 10 * 60 * 1000;
export const MASTERED_INTERVAL = 7;

/**
 * Simplified SM-2, explained in docs/learning-model.md:
 *  - Susah: show again in 10 minutes, ease -0.2, the streak of successes resets.
 *  - Sederhana: 1 day, then 3 days, then interval × ease.
 *  - Mudah: 4 days, then interval × ease × 1.3, ease +0.1.
 * Day-based intervals land at the start of the due day so "due today" is predictable.
 */
export function rate(card: CardState | undefined, id: string, rating: Rating, now = Date.now()): CardState {
  const c: CardState = card
    ? { ...card, history: [...card.history] }
    : { id, due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, introduced: now, history: [] };

  if (rating === 'susah') {
    if (c.reps > 0) c.lapses += 1;
    c.reps = 0;
    c.interval = 0;
    c.ease = Math.max(1.3, round2(c.ease - 0.2));
    c.due = now + RELEARN_MS;
  } else {
    let interval: number;
    if (rating === 'sederhana') {
      interval = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(Math.max(1, c.interval) * c.ease);
      c.ease = Math.max(1.3, round2(c.ease - 0.05));
    } else {
      interval = c.reps === 0 ? 4 : Math.round(Math.max(1, c.interval) * c.ease * 1.3);
      c.ease = Math.min(3, round2(c.ease + 0.1));
    }
    c.interval = Math.max(interval, c.interval + 1);
    c.reps += 1;
    c.due = startOfDay(now) + c.interval * DAY_MS;
  }
  c.lastRating = rating;
  c.history.push({ t: now, r: rating });
  if (c.history.length > 30) c.history.splice(0, c.history.length - 30);
  return c;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const isDue = (c: CardState, now = Date.now()) => c.due <= now;
export const isDifficult = (c: CardState) => c.lapses >= 2 || c.lastRating === 'susah';
export const isCardMastered = (c: CardState) => c.interval >= MASTERED_INTERVAL && c.reps >= 2;
