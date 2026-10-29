import type { Peribahasa } from '../../types/peribahasa';
import type { ProgressState } from '../../lib/progress';
import { isMastered } from '../../lib/progress';
import { isDifficult } from '../../lib/srs';
import { CORE, BY_ID } from '../../lib/data';
import { dateKey, startOfDay } from '../../lib/date';

export const NEW_PER_DAY = 10;
export const SESSION_SIZE = 10;

export interface Queues {
  due: Peribahasa[];
  fresh: Peribahasa[];
  difficult: Peribahasa[];
  mastered: Peribahasa[];
  newToday: number;
}

/** Build the learning queues from real review history. */
export function buildQueues(s: ProgressState, now = Date.now()): Queues {
  const cards = Object.values(s.cards);
  const due = cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due).map((c) => BY_ID.get(c.id)).filter((r): r is Peribahasa => !!r);
  const difficult = cards.filter(isDifficult).map((c) => BY_ID.get(c.id)).filter((r): r is Peribahasa => !!r);
  const mastered = [...new Set([...Object.keys(s.cards), ...Object.keys(s.answers)])].filter((id) => isMastered(s, id)).map((id) => BY_ID.get(id)).filter((r): r is Peribahasa => !!r);
  const today = startOfDay(now);
  const newToday = cards.filter((c) => c.introduced >= today).length;

  // New cards: sayings the learner flagged first, then favourites, then the curriculum by level.
  const seen = new Set(Object.keys(s.cards));
  const level = s.profile?.level ?? 'menengah';
  const priority = [...s.revisionList, ...s.favourites].map((id) => BY_ID.get(id)).filter((r): r is Peribahasa => !!r && !r.sensitive);
  const curriculum = [...CORE].sort((a, b) => {
    const da = level === 'rendah' ? a.difficulty : a.tingkatan.length ? 0 : a.difficulty;
    const db = level === 'rendah' ? b.difficulty : b.tingkatan.length ? 0 : b.difficulty;
    return da - db || a.id.localeCompare(b.id);
  });
  const fresh: Peribahasa[] = [];
  for (const r of [...priority, ...curriculum]) {
    if (!seen.has(r.id) && !fresh.includes(r)) fresh.push(r);
  }
  return { due, fresh, difficult, mastered, newToday };
}

/** A short session: due cards first, then new cards within today's allowance. */
export function sessionCards(q: Queues): Peribahasa[] {
  const room = Math.max(0, NEW_PER_DAY - q.newToday);
  return [...q.due.slice(0, SESSION_SIZE), ...q.fresh.slice(0, room)].slice(0, SESSION_SIZE);
}

export const todayKey = () => dateKey();
