import type { Env } from './env';
import { HttpError, json } from './http';
import { currentUser } from './auth';
import { klDay } from './xp';

export type Period = 'minggu' | 'bulan' | 'semua';
const PERIODS: Period[] = ['minggu', 'bulan', 'semua'];
const TOP_N = 50;

/** First day of the period, in Malaysian time. Weeks start on Monday. */
export function periodStart(period: Period, now: number): string {
  const day = klDay(now);
  if (period === 'semua') return '0000-00-00';
  if (period === 'bulan') return `${day.slice(0, 7)}-01`;
  const d = new Date(`${day}T00:00:00Z`);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - sinceMonday * 86_400_000).toISOString().slice(0, 10);
}

export interface Row { key: string; name: string; username: string; xp: number; last: number; demo?: boolean }
export interface Entry { rank: number; key: string; name: string; username: string; xp: number; move: number | null; demo: boolean; you: boolean }

/** More XP first; on a tie, whoever reached that total earlier; then the id, so the order never flickers. */
export const byRank = (a: Row, b: Row) => b.xp - a.xp || a.last - b.last || a.key.localeCompare(b.key);

// Invented folk-tale names, always flagged `demo`, never stored in the database and only sent when
// asked for. They exist so a new board can be shown working; they are not participants.
const DEMO: { key: string; name: string; xp: Record<Period, number>; before: Record<Period, number> }[] = [
  { key: 'demo-kancil', name: 'Sang Kancil', xp: { minggu: 420, bulan: 1240, semua: 3180 }, before: { minggu: 360, bulan: 1180, semua: 3120 } },
  { key: 'demo-tempua', name: 'Mak Tempua', xp: { minggu: 385, bulan: 1420, semua: 2875 }, before: { minggu: 380, bulan: 1415, semua: 2870 } },
  { key: 'demo-belang', name: 'Pak Belang', xp: { minggu: 340, bulan: 980, semua: 2610 }, before: { minggu: 350, bulan: 960, semua: 2590 } },
  { key: 'demo-merbah', name: 'Cik Merbah', xp: { minggu: 275, bulan: 860, semua: 1940 }, before: { minggu: 210, bulan: 795, semua: 1875 } },
  { key: 'demo-tenggiling', name: 'Si Tenggiling', xp: { minggu: 210, bulan: 720, semua: 1525 }, before: { minggu: 205, bulan: 715, semua: 1520 } },
  { key: 'demo-kelip', name: 'Abang Kelip', xp: { minggu: 165, bulan: 540, semua: 1190 }, before: { minggu: 160, bulan: 535, semua: 1185 } },
  { key: 'demo-enggang', name: 'Tok Enggang', xp: { minggu: 95, bulan: 410, semua: 870 }, before: { minggu: 90, bulan: 405, semua: 865 } },
  { key: 'demo-pipit', name: 'Adik Pipit', xp: { minggu: 40, bulan: 180, semua: 345 }, before: { minggu: 30, bulan: 170, semua: 335 } },
];

const ranks = (rows: Row[]) => new Map([...rows].sort(byRank).map((r, i) => [r.key, i + 1]));

/** Rank movement compares the board at the end of yesterday with the board now. */
export function rankBoard(now: Row[], before: Row[], you: string | null): Entry[] {
  const prev = ranks(before);
  return [...now].sort(byRank).map((r, i) => {
    const was = prev.get(r.key);
    return { rank: i + 1, key: r.key, name: r.name, username: r.username, xp: r.xp, move: was === undefined ? null : was - (i + 1), demo: !!r.demo, you: r.key === you };
  });
}

const query = (env: Env, from: string, before: string) => env.DB.prepare(
  `SELECT u.id AS key, u.display_name AS name, u.username AS username, SUM(e.amount) AS xp, MAX(e.id) AS last
   FROM xp_events e JOIN users u ON u.id = e.user_id
   WHERE e.day >= ?1 AND e.day < ?2
   GROUP BY u.id`,
).bind(from, before).all<Row>();

export async function leaderboard(env: Env, req: Request, now: number): Promise<Response> {
  const url = new URL(req.url);
  const period = (url.searchParams.get('tempoh') ?? 'minggu') as Period;
  if (!PERIODS.includes(period)) throw new HttpError(400, 'bad-period', 'Tempoh tidak sah.');
  const user = await currentUser(env, req, now);
  const from = periodStart(period, now);
  const today = klDay(now);
  const tomorrow = klDay(now + 86_400_000);
  const [current, before] = await Promise.all([query(env, from, tomorrow), query(env, from, today)]);

  const realPlayers = current.results.length;
  // Demo profiles are opt-in per request. `demo=auto` adds them only while the real board is too
  // small to show a podium, and the response says so.
  const demoParam = url.searchParams.get('demo') ?? 'auto';
  const includeDemo = demoParam === '1' || (demoParam === 'auto' && realPlayers < 3);
  const demoNow: Row[] = includeDemo ? DEMO.map((d, i) => ({ key: d.key, name: d.name, username: '', xp: d.xp[period], last: i, demo: true })) : [];
  const demoBefore: Row[] = includeDemo ? DEMO.map((d, i) => ({ key: d.key, name: d.name, username: '', xp: d.before[period], last: i, demo: true })) : [];

  const entries = rankBoard([...current.results, ...demoNow], [...before.results, ...demoBefore], user?.id ?? null);
  const yourRow = entries.find((e) => e.you) ?? null;
  return json({
    period, from, to: today, generatedAt: now,
    entries: entries.slice(0, TOP_N),
    you: yourRow,
    signedIn: !!user,
    realPlayers,
    demoIncluded: includeDemo,
  });
}
