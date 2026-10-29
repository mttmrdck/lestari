import type { Peribahasa } from '../types/peribahasa';
import { hashString } from './random';
import { normalize, similarity } from './text';
import type { DateKey } from './date';

export const DAILY_ATTEMPTS = 4;

/** Sayings eligible for the daily puzzle: learnable, at least three words, sorted by id for stability. */
export function dailyPool(core: Peribahasa[]): Peribahasa[] {
  return core.filter((r) => r.normalizedText.split(' ').length >= 3).sort((a, b) => a.id.localeCompare(b.id));
}

/** Same date → same saying for every learner, and it never changes on refresh. */
export function dailyAnswer(pool: Peribahasa[], day: DateKey): Peribahasa {
  return pool[hashString(`lestari:${day}`) % pool.length];
}

export function isCorrectGuess(answer: Peribahasa, guess: string, byId: Map<string, Peribahasa>): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const forms = [answer, ...answer.variants.map((v) => byId.get(v)).filter((x): x is Peribahasa => !!x)];
  return forms.some((f) => f.normalizedText === g || similarity(f.normalizedText, g) >= 0.9);
}

export interface Clue { label: string; value: string }

/** Clues unlock in order: meaning, category, first word, then the word shape. */
export function cluesFor(answer: Peribahasa, wrongGuesses: number): Clue[] {
  const words = answer.peribahasa.replace(/[,:;]/g, '').split(/\s+/);
  const clues: Clue[] = [{ label: 'Maksud', value: answer.maksud }];
  if (wrongGuesses >= 1) clues.push({ label: 'Kategori', value: answer.category });
  if (wrongGuesses >= 2) clues.push({ label: 'Perkataan pertama', value: words[0] });
  if (wrongGuesses >= 3) clues.push({ label: 'Bentuk', value: words.map((w, i) => (i === 0 ? w : w[0] + '·'.repeat(Math.max(0, w.length - 1)))).join(' ') });
  return clues;
}
