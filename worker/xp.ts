import type { Env } from './env';
import { HttpError, json, rateLimit, readJson } from './http';
import { requireUser } from './auth';
import { BY_ID, CORE } from '../src/lib/data';
import { XP } from '../src/lib/progress';
import { LESSONS, PASS_RATIO } from '../src/lib/lessons';
import { DAILY_ATTEMPTS, dailyAnswer, dailyPool, isCorrectGuess } from '../src/lib/daily';

// The client reports what the learner did; it never says how much XP that is worth. Every amount,
// every duplicate check and every cap is decided here, against the same rules as src/lib/progress.ts.

/** Malaysian calendar day: leaderboards roll over at midnight for every learner at once. */
export const klDay = (t: number) => new Date(t + 8 * 3_600_000).toISOString().slice(0, 10);

/** XP a learner can add to the leaderboard in one day, whatever the client sends. */
export const DAILY_XP_CAP = 300;
const KIND_CAPS: Partial<Record<Claim['kind'], number>> = { 'quiz-done': 8, review: 60, explore: XP.exploreDailyCap };

type Mode = 'emoji' | 'kosong' | 'konteks' | 'maksud';
const MODES: Mode[] = ['emoji', 'kosong', 'konteks', 'maksud'];

export type Claim =
  | { kind: 'quiz'; mode: Mode; recordId: string }
  | { kind: 'quiz-done'; sessionId: string; total: number }
  | { kind: 'review'; recordId: string }
  | { kind: 'explore'; recordId: string }
  | { kind: 'lesson'; lessonId: string; correct: number; total: number }
  | { kind: 'daily'; day: string; guesses: string[] };

export type ClaimResult = { status: 'accepted'; xp: number } | { status: 'duplicate' | 'capped' | 'rejected'; xp: 0 };

const pool = dailyPool(CORE);
const knownRecord = (id: unknown) => typeof id === 'string' && !!BY_ID.get(id) && !BY_ID.get(id)!.sensitive;

/** Turns a claim into a rewardable event, or null if the action could not have happened. */
export function price(c: Claim, day: string): { key: string; amount: number } | null {
  switch (c?.kind) {
    case 'quiz':
      if (!knownRecord(c.recordId) || !MODES.includes(c.mode)) return null;
      return { key: `quiz:${day}:${c.mode}:${c.recordId}`, amount: XP.quizCorrect + (c.mode === 'konteks' ? XP.contextBonus : 0) };
    case 'quiz-done':
      if (typeof c.sessionId !== 'string' || !c.sessionId || c.sessionId.length > 80 || !(c.total >= 5)) return null;
      return { key: `quizbonus:${c.sessionId}`, amount: XP.quizComplete };
    case 'review':
      return knownRecord(c.recordId) ? { key: `review:${day}:${c.recordId}`, amount: XP.review } : null;
    case 'explore':
      return knownRecord(c.recordId) ? { key: `explore:${c.recordId}`, amount: XP.explore } : null;
    case 'lesson': {
      if (!LESSONS.some((l) => l.id === c.lessonId)) return null;
      if (!(c.total > 0) || !(c.correct >= 0) || c.correct > c.total || c.correct / c.total < PASS_RATIO) return null;
      return { key: `lesson:${c.lessonId}`, amount: XP.lessonComplete };
    }
    case 'daily': {
      // Re-grades the guesses against the saying of that date instead of trusting a win flag.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c.day ?? '') || !Array.isArray(c.guesses) || !c.guesses.length || c.guesses.length > DAILY_ATTEMPTS) return null;
      const offset = Math.abs(Date.parse(c.day) - Date.parse(day));
      if (!(offset <= 86_400_000)) return null;
      const answer = dailyAnswer(pool, c.day);
      const won = c.guesses.findIndex((g) => typeof g === 'string' && isCorrectGuess(answer, g, BY_ID));
      if (won >= 0) return won === c.guesses.length - 1 ? { key: `daily:${c.day}`, amount: XP.dailyWin[Math.min(won, 3)] } : null;
      return c.guesses.length === DAILY_ATTEMPTS ? { key: `daily:${c.day}`, amount: XP.dailyTried } : null;
    }
    default:
      return null;
  }
}

export async function totals(env: Env, userId: string): Promise<{ total: number }> {
  const row = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE user_id = ?1').bind(userId).first<{ total: number }>();
  return { total: row?.total ?? 0 };
}

export async function claimXp(env: Env, req: Request, now: number): Promise<Response> {
  const user = await requireUser(env, req, now);
  await rateLimit(env.DB, `xp:${user.id}`, 60, 60_000, now);
  const body = await readJson<{ events?: Claim[] }>(req);
  if (!Array.isArray(body.events) || body.events.length > 50) throw new HttpError(400, 'bad-events', 'Permintaan tidak sah.');

  const day = klDay(now);
  const today = await env.DB.prepare('SELECT kind, SUM(amount) AS xp, COUNT(*) AS n FROM xp_events WHERE user_id = ?1 AND day = ?2 GROUP BY kind').bind(user.id, day).all<{ kind: string; xp: number; n: number }>();
  let dayXp = today.results.reduce((a, r) => a + r.xp, 0);
  const counts = new Map(today.results.map((r) => [r.kind, r.n]));

  const results: ClaimResult[] = [];
  for (const claim of body.events) {
    const priced = price(claim, day);
    if (!priced) { results.push({ status: 'rejected', xp: 0 }); continue; }
    const cap = KIND_CAPS[claim.kind];
    if (dayXp + priced.amount > DAILY_XP_CAP || (cap !== undefined && (counts.get(claim.kind) ?? 0) >= cap)) { results.push({ status: 'capped', xp: 0 }); continue; }
    const res = await env.DB.prepare(
      'INSERT OR IGNORE INTO xp_events (user_id, dedupe_key, kind, amount, day, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
    ).bind(user.id, priced.key, claim.kind, priced.amount, day, now).run();
    if (!res.meta.changes) { results.push({ status: 'duplicate', xp: 0 }); continue; }
    dayXp += priced.amount;
    counts.set(claim.kind, (counts.get(claim.kind) ?? 0) + 1);
    results.push({ status: 'accepted', xp: priced.amount });
  }
  return json({ results, ...(await totals(env, user.id)) });
}
