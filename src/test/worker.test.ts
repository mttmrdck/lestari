// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { handleApi } from '../../worker/index';
import { DAILY_XP_CAP, klDay, price, type Claim } from '../../worker/xp';
import { byRank, periodStart, rankBoard, type Row } from '../../worker/leaderboard';
import { scoreConcepts } from '../../worker/situasi';
import { hashPassword } from '../../worker/crypto';
import { XP } from '../lib/progress';
import { LESSONS } from '../lib/lessons';
import { CORE, LEARNABLE, RECORDS } from '../lib/data';
import { dailyAnswer, dailyPool } from '../lib/daily';
import { createD1 } from './d1-shim';
import type { Env } from '../../worker/env';

const BASE = 'https://lestari.test';
const NOW = Date.UTC(2026, 9, 28, 4); // Wednesday 2026-10-28, noon in Malaysia
const DAY = 86_400_000;

let env: Env;
let aiCalls: number;
let aiResult: () => Promise<unknown>;
let cookie = '';

const call = async (method: string, path: string, body?: unknown, opts: { now?: number; cookie?: string; headers?: Record<string, string> } = {}) => {
  const res = await handleApi(new Request(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', cookie: opts.cookie ?? cookie, ...opts.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env, opts.now ?? NOW);
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: await res.json() as Record<string, any>, setCookie }; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const asCookie = (setCookie: string | null) => (setCookie ?? '').split(';')[0];
const ALI = { displayName: 'Ali Hakim', username: 'ali_hakim', email: 'ali@contoh.my', password: 'rahsia123' };
async function register(user = ALI) {
  const r = await call('POST', '/api/auth/daftar', user);
  expect(r.status).toBe(201);
  return { ...r, cookie: asCookie(r.setCookie) };
}
const claim = (events: Claim[], c = cookie, now = NOW) => call('POST', '/api/xp', { events }, { cookie: c, now });
const quiz = (recordId: string, mode: 'maksud' | 'konteks' = 'maksud'): Claim => ({ kind: 'quiz', mode, recordId });

beforeEach(() => {
  aiCalls = 0;
  aiResult = async () => ({ data: [new Array(1024).fill(0.1)] });
  env = { DB: createD1() as never, ASSETS: {} as never, AI: { run: () => { aiCalls++; return aiResult(); } } as never };
  cookie = '';
});

describe('registration', () => {
  it('creates an account, sets a hardened cookie and returns a recovery code once', async () => {
    const r = await register();
    expect(r.setCookie).toMatch(/^__Host-lestari_s=/);
    expect(r.setCookie).toMatch(/HttpOnly/);
    expect(r.setCookie).toMatch(/Secure/);
    expect(r.setCookie).toMatch(/SameSite=Lax/);
    expect(r.body.recoveryCode).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    expect(JSON.stringify(r.body)).not.toContain('rahsia123');
  });

  it('stores neither the password nor the session token in plain text', async () => {
    const r = await register();
    const dump = JSON.stringify((env.DB as never as ReturnType<typeof createD1>).raw.prepare('SELECT * FROM users').all());
    expect(dump).not.toContain('rahsia123');
    expect(dump).not.toContain(r.body.recoveryCode);
    const sessions = JSON.stringify((env.DB as never as ReturnType<typeof createD1>).raw.prepare('SELECT * FROM sessions').all());
    expect(sessions).not.toContain(r.cookie.split('=')[1]);
  });

  it.each([
    [{ ...ALI, email: 'bukan-emel' }, 'bad-email'],
    [{ ...ALI, username: 'A B' }, 'bad-username'],
    [{ ...ALI, username: 'ab' }, 'bad-username'],
    [{ ...ALI, password: 'pendek1' }, 'weak-password'],
    [{ ...ALI, password: 'tiadanombor' }, 'weak-password'],
    [{ ...ALI, password: '12345678' }, 'weak-password'],
    [{ ...ALI, displayName: 'A' }, 'bad-name'],
    [{}, 'bad-name'],
  ])('rejects invalid input %#', async (user, code) => {
    const r = await call('POST', '/api/auth/daftar', user);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe(code);
  });

  it('refuses a duplicate email and a duplicate username, ignoring case', async () => {
    await register();
    const a = await call('POST', '/api/auth/daftar', { ...ALI, username: 'lain', email: 'ALI@contoh.my' });
    expect(a.status).toBe(409);
    expect(a.body.error).toBe('email-taken');
    const b = await call('POST', '/api/auth/daftar', { ...ALI, username: 'ALI_HAKIM', email: 'lain@contoh.my' });
    expect(b.status).toBe(409);
    expect(b.body.error).toBe('username-taken');
  });

  it('reports username availability', async () => {
    await register();
    expect((await call('GET', '/api/auth/nama?u=ali_hakim')).body.available).toBe(false);
    expect((await call('GET', '/api/auth/nama?u=orang_baru')).body.available).toBe(true);
  });
});

describe('login and sessions', () => {
  it('logs in by email or username, case-insensitively', async () => {
    await register();
    for (const identifier of ['ali@contoh.my', 'ALI@CONTOH.MY', 'ali_hakim']) {
      const r = await call('POST', '/api/auth/masuk', { identifier, password: ALI.password });
      expect(r.status).toBe(200);
      expect(r.body.user.username).toBe('ali_hakim');
    }
  });

  it('gives the same error for a wrong password and an unknown account', async () => {
    await register();
    const a = await call('POST', '/api/auth/masuk', { identifier: 'ali@contoh.my', password: 'salah1234' });
    const b = await call('POST', '/api/auth/masuk', { identifier: 'tiada@contoh.my', password: 'salah1234' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it('rejects empty fields', async () => {
    expect((await call('POST', '/api/auth/masuk', { identifier: '', password: '' })).status).toBe(400);
  });

  it('rate-limits password guessing on one account', async () => {
    await register();
    for (let i = 0; i < 8; i++) expect((await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: 'salah1234' })).status).toBe(401);
    const blocked = await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: ALI.password });
    expect(blocked.status).toBe(429);
    const later = await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: ALI.password }, { now: NOW + 16 * 60_000 });
    expect(later.status).toBe(200);
  });

  it('remember me keeps a 30-day cookie; otherwise it is a browser session', async () => {
    await register();
    const yes = await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: ALI.password, remember: true });
    expect(yes.setCookie).toMatch(/Max-Age=2592000/);
    const no = await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: ALI.password });
    expect(no.setCookie).not.toMatch(/Max-Age/);
  });

  it('recognises the session, and ends it on logout', async () => {
    const r = await register();
    expect((await call('GET', '/api/auth/me', undefined, { cookie: r.cookie })).body.user.username).toBe('ali_hakim');
    await call('POST', '/api/auth/keluar', {}, { cookie: r.cookie });
    expect((await call('GET', '/api/auth/me', undefined, { cookie: r.cookie })).body.user).toBeNull();
  });

  it('expires sessions on the server', async () => {
    const r = await register();
    const after = NOW + 2 * DAY;
    expect((await call('GET', '/api/auth/me', undefined, { cookie: r.cookie, now: after })).body.user).toBeNull();
    expect((await call('GET', '/api/kemajuan', undefined, { cookie: r.cookie, now: after })).status).toBe(401);
  });

  it('protects private endpoints', async () => {
    expect((await call('GET', '/api/kemajuan')).status).toBe(401);
    expect((await call('POST', '/api/xp', { events: [] })).status).toBe(401);
    expect((await call('POST', '/api/auth/kata-laluan', {})).status).toBe(401);
    expect((await call('POST', '/api/auth/padam', {})).status).toBe(401);
  });

  it('refuses cross-site writes', async () => {
    const r = await call('POST', '/api/auth/masuk', { identifier: 'x', password: 'y' }, { headers: { origin: 'https://jahat.example' } });
    expect(r.status).toBe(403);
  });

  it('requires JSON, so a plain HTML form cannot post', async () => {
    const res = await handleApi(new Request(`${BASE}/api/auth/masuk`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=b' }), env, NOW);
    expect(res.status).toBe(415);
  });

  it('answers unknown API paths with JSON 404, not the app shell', async () => {
    const r = await call('GET', '/api/tiada');
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('not-found');
  });
});

describe('password recovery and change', () => {
  it('resets with the code, revokes old sessions and rotates the code', async () => {
    const r = await register();
    const out = await call('POST', '/api/auth/pulih', { identifier: 'ali@contoh.my', recoveryCode: r.body.recoveryCode.toLowerCase(), password: 'baharu123' });
    expect(out.status).toBe(200);
    expect(out.body.recoveryCode).not.toBe(r.body.recoveryCode);
    expect((await call('GET', '/api/auth/me', undefined, { cookie: r.cookie })).body.user).toBeNull();
    expect((await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: ALI.password })).status).toBe(401);
    expect((await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: 'baharu123' })).status).toBe(200);
    const again = await call('POST', '/api/auth/pulih', { identifier: 'ali@contoh.my', recoveryCode: r.body.recoveryCode, password: 'lagibaru1' });
    expect(again.status).toBe(401);
  });

  it('rejects a wrong code', async () => {
    await register();
    expect((await call('POST', '/api/auth/pulih', { identifier: 'ali@contoh.my', recoveryCode: 'AAAA-AAAA-AAAA-AAAA', password: 'baharu123' })).status).toBe(401);
  });

  it('changes the password only with the current one', async () => {
    const r = await register();
    expect((await call('POST', '/api/auth/kata-laluan', { current: 'salah1234', next: 'baharu123' }, { cookie: r.cookie })).status).toBe(401);
    expect((await call('POST', '/api/auth/kata-laluan', { current: ALI.password, next: 'baharu123' }, { cookie: r.cookie })).status).toBe(200);
    expect((await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: 'baharu123' })).status).toBe(200);
  });

  it('deletes the account and everything attached to it', async () => {
    const r = await register();
    await claim([quiz(LEARNABLE[0].id)], r.cookie);
    expect((await call('POST', '/api/auth/padam', { password: 'salah1234' }, { cookie: r.cookie })).status).toBe(401);
    expect((await call('POST', '/api/auth/padam', { password: ALI.password }, { cookie: r.cookie })).status).toBe(200);
    expect((await call('GET', '/api/papan-juara?tempoh=semua&demo=0')).body.entries).toEqual([]);
    expect((await call('POST', '/api/auth/masuk', { identifier: 'ali_hakim', password: ALI.password })).status).toBe(401);
  });

  it('derives a stable hash', async () => {
    expect(await hashPassword('a', 'AAAA', 1000)).toBe(await hashPassword('a', 'AAAA', 1000));
    expect(await hashPassword('a', 'AAAA', 1000)).not.toBe(await hashPassword('b', 'AAAA', 1000));
  });
});

describe('XP ledger', () => {
  const id = LEARNABLE[0].id;

  it('prices actions itself and ignores any amount the client sends', async () => {
    const r = await register();
    const res = await claim([{ ...quiz(id), amount: 99999, xp: 99999 } as unknown as Claim], r.cookie);
    expect(res.body.results[0]).toEqual({ status: 'accepted', xp: XP.quizCorrect });
    expect(res.body.total).toBe(XP.quizCorrect);
  });

  it('pays the context bonus', () => {
    expect(price(quiz(id, 'konteks'), '2026-10-28')?.amount).toBe(XP.quizCorrect + XP.contextBonus);
  });

  it('never pays the same action twice, even in one batch or after a retry', async () => {
    const r = await register();
    const once = await claim([quiz(id), quiz(id)], r.cookie);
    expect(once.body.results.map((x: { status: string }) => x.status)).toEqual(['accepted', 'duplicate']);
    const retry = await claim([quiz(id)], r.cookie);
    expect(retry.body.results[0].status).toBe('duplicate');
    expect(retry.body.total).toBe(XP.quizCorrect);
  });

  it('pays the same saying again on a new day, as the client does', async () => {
    const r = await register();
    await claim([quiz(id)], r.cookie);
    const next = await claim([quiz(id)], r.cookie, NOW + DAY);
    expect(next.body.results[0].status).toBe('accepted');
  });

  it('rejects fabricated or impossible actions', async () => {
    const r = await register();
    const sensitive = RECORDS.find((x) => x.sensitive)!;
    const fake: Claim[] = [
      quiz('peribahasa-rekaan'),
      quiz(sensitive.id),
      { kind: 'quiz', mode: 'rekaan' as 'maksud', recordId: id },
      { kind: 'lesson', lessonId: 'pelajaran-rekaan', correct: 8, total: 8 },
      { kind: 'lesson', lessonId: LESSONS[0].id, correct: 1, total: 8 },
      { kind: 'lesson', lessonId: LESSONS[0].id, correct: 9, total: 8 },
      { kind: 'quiz-done', sessionId: 'pendek', total: 3 },
      { kind: 'tiada' as 'review', recordId: id },
      { kind: 'daily', day: '2020-01-01', guesses: ['x'] },
    ];
    const res = await claim(fake, r.cookie);
    expect(res.body.results.every((x: { status: string }) => x.status === 'rejected')).toBe(true);
    expect(res.body.total).toBe(0);
  });

  it('grades the daily challenge itself', async () => {
    const r = await register();
    const day = klDay(NOW);
    const answer = dailyAnswer(dailyPool(CORE), day);
    expect(price({ kind: 'daily', day, guesses: ['jawapan salah'] }, day)).toBeNull(); // not won, attempts left
    expect(price({ kind: 'daily', day, guesses: ['a', 'b', 'c', 'd'] }, day)?.amount).toBe(XP.dailyTried);
    const res = await claim([{ kind: 'daily', day, guesses: ['salah', answer.peribahasa] }], r.cookie);
    expect(res.body.results[0]).toEqual({ status: 'accepted', xp: XP.dailyWin[1] });
    expect((await claim([{ kind: 'daily', day, guesses: [answer.peribahasa] }], r.cookie)).body.results[0].status).toBe('duplicate');
  });

  it('caps what one day can add', async () => {
    const r = await register();
    const results: { status: string }[] = [];
    for (let i = 0; i < 2; i++) {
      const res = await claim(LEARNABLE.slice(i * 40, (i + 1) * 40).map((x) => quiz(x.id)), r.cookie);
      results.push(...res.body.results);
    }
    expect(results.filter((x) => x.status === 'capped').length).toBe(50);
    const total = (await claim([], r.cookie)).body.total;
    expect(total).toBe(DAILY_XP_CAP);
    expect((await claim([quiz(LEARNABLE[90].id)], r.cookie, NOW + DAY)).body.results[0].status).toBe('accepted');
  });

  it('caps exploration like the client does', async () => {
    const r = await register();
    const res = await claim(LEARNABLE.slice(0, 25).map((x) => ({ kind: 'explore', recordId: x.id })), r.cookie);
    expect(res.body.results.filter((x: { status: string }) => x.status === 'accepted').length).toBe(XP.exploreDailyCap);
  });

  it('refuses an oversized batch', async () => {
    const r = await register();
    expect((await claim(new Array(51).fill(quiz(id)), r.cookie)).status).toBe(400);
  });
});

describe('progress snapshot', () => {
  it('round-trips a device copy per user', async () => {
    const a = await register();
    const b = await register({ ...ALI, username: 'siti', email: 'siti@contoh.my' });
    const state = { version: 1, xpTotal: 42 };
    expect((await call('PUT', '/api/kemajuan', { state }, { cookie: a.cookie })).status).toBe(200);
    expect((await call('GET', '/api/kemajuan', undefined, { cookie: a.cookie })).body.state).toEqual(state);
    expect((await call('GET', '/api/kemajuan', undefined, { cookie: b.cookie })).body.state).toBeNull();
  });

  it('does not let a snapshot change the leaderboard', async () => {
    const a = await register();
    await call('PUT', '/api/kemajuan', { state: { version: 1, xpTotal: 999999 } }, { cookie: a.cookie });
    expect((await call('GET', '/api/papan-juara?tempoh=semua&demo=0')).body.entries).toEqual([]);
  });

  it('rejects a malformed snapshot', async () => {
    const a = await register();
    expect((await call('PUT', '/api/kemajuan', { state: { version: 9 } }, { cookie: a.cookie })).status).toBe(400);
  });
});

describe('leaderboard', () => {
  async function player(name: string, ids: number[], now = NOW) {
    const r = await register({ displayName: name, username: name.toLowerCase(), email: `${name.toLowerCase()}@contoh.my`, password: 'rahsia123' });
    if (ids.length) await claim(ids.map((i) => quiz(LEARNABLE[i].id)), r.cookie, now);
    return r.cookie;
  }
  const board = async (q: string, c = '', now = NOW) => (await call('GET', `/api/papan-juara?${q}`, undefined, { cookie: c, now })).body;

  it('orders players by XP and returns no private data', async () => {
    await player('Satu', [1]);
    await player('Tiga', [1, 2, 3]);
    await player('Dua', [1, 2]);
    const b = await board('tempoh=semua&demo=0');
    expect(b.entries.map((e: { name: string }) => e.name)).toEqual(['Tiga', 'Dua', 'Satu']);
    expect(b.entries.map((e: { rank: number }) => e.rank)).toEqual([1, 2, 3]);
    expect(b.entries[0].xp).toBe(30);
    expect(JSON.stringify(b)).not.toContain('@contoh.my');
  });

  it('breaks ties deterministically: first to reach the score ranks higher', async () => {
    await player('Awal', [1, 2]);
    await player('Lewat', [3, 4]);
    const first = await board('tempoh=semua&demo=0');
    const again = await board('tempoh=semua&demo=0');
    expect(first.entries.map((e: { name: string }) => e.name)).toEqual(['Awal', 'Lewat']);
    expect(again.entries).toEqual(first.entries);
  });

  it('uses a stable final tie-break', () => {
    const rows: Row[] = [{ key: 'b', name: 'B', username: 'b', xp: 10, last: 1 }, { key: 'a', name: 'A', username: 'a', xp: 10, last: 1 }];
    expect([...rows].sort(byRank).map((r) => r.key)).toEqual(['a', 'b']);
  });

  it('computes weekly and monthly totals from timestamps, not lifetime XP', async () => {
    const lastMonth = Date.UTC(2026, 8, 20, 4);
    const earlierThisMonth = Date.UTC(2026, 9, 5, 4);
    const c = await player('Lama', [1, 2, 3], lastMonth);
    await claim([quiz(LEARNABLE[4].id)], c, earlierThisMonth);
    await claim([quiz(LEARNABLE[5].id)], c, NOW);
    const you = async (t: string) => (await board(`tempoh=${t}&demo=0`, c)).you.xp;
    expect(await you('semua')).toBe(50);
    expect(await you('bulan')).toBe(20);
    expect(await you('minggu')).toBe(10);
  });

  it('starts weeks on Monday and days in Malaysian time', () => {
    expect(periodStart('minggu', NOW)).toBe('2026-10-26');
    expect(periodStart('bulan', NOW)).toBe('2026-10-01');
    expect(klDay(Date.UTC(2026, 9, 27, 16, 30))).toBe('2026-10-28'); // 00:30 in Kuala Lumpur
  });

  it('shows the current user and an unranked visitor correctly', async () => {
    const c = await player('Saya', [1]);
    expect((await board('tempoh=semua&demo=0', c)).you).toMatchObject({ rank: 1, you: true, xp: 10 });
    const guest = await board('tempoh=semua&demo=0');
    expect(guest.you).toBeNull();
    expect(guest.signedIn).toBe(false);
  });

  it('reports rank movement against yesterday', async () => {
    const a = await player('Ani', [1, 2], NOW - DAY);
    await player('Budi', [3, 4, 5], NOW - DAY);
    await claim([6, 7].map((i) => quiz(LEARNABLE[i].id)), a, NOW);
    const b = await board('tempoh=semua&demo=0');
    expect(b.entries.map((e: { name: string; move: number }) => [e.name, e.move])).toEqual([['Ani', 1], ['Budi', -1]]);
  });

  it('marks players who are new today', () => {
    const e = rankBoard([{ key: 'a', name: 'A', username: 'a', xp: 5, last: 1 }], [], null);
    expect(e[0].move).toBeNull();
  });

  it('is empty, not an error, with no players and demo off', async () => {
    const b = await board('tempoh=minggu&demo=0');
    expect(b.entries).toEqual([]);
    expect(b.realPlayers).toBe(0);
  });

  it('keeps demo profiles flagged, separate and out of the database', async () => {
    const auto = await board('tempoh=minggu');
    expect(auto.demoIncluded).toBe(true);
    expect(auto.realPlayers).toBe(0);
    expect(auto.entries.every((e: { demo: boolean }) => e.demo)).toBe(true);
    expect((env.DB as never as ReturnType<typeof createD1>).raw.prepare('SELECT COUNT(*) AS n FROM users').all()).toEqual([{ n: 0 }]);
  });

  it('drops demo profiles automatically once three real players exist', async () => {
    await player('Aaa', [1]); await player('Bbb', [2]); await player('Ccc', [3]);
    const b = await board('tempoh=minggu');
    expect(b.demoIncluded).toBe(false);
    expect(b.entries.some((e: { demo: boolean }) => e.demo)).toBe(false);
  });

  it('never counts demo profiles as real players', async () => {
    await player('Aaa', [1]);
    const b = await board('tempoh=minggu&demo=1');
    expect(b.realPlayers).toBe(1);
    expect(b.entries.filter((e: { demo: boolean }) => !e.demo).length).toBe(1);
  });

  it('rejects an unknown period', async () => {
    expect((await call('GET', '/api/papan-juara?tempoh=abad')).status).toBe(400);
  });
});

describe('situation similarity endpoint', () => {
  it('returns only concept ids and numbers, never a saying', async () => {
    const r = await call('POST', '/api/situasi', { q: 'Dia tidak mudah berputus asa.' });
    expect(r.body.available).toBe(true);
    expect(r.body.concepts.length).toBeGreaterThan(0);
    for (const c of r.body.concepts) expect(Object.keys(c).sort()).toEqual(['id', 'sim']);
    expect(aiCalls).toBe(1);
  });

  it('falls back quietly when the model fails', async () => {
    aiResult = async () => { throw new Error('down'); };
    const r = await call('POST', '/api/situasi', { q: 'Dia tidak mudah berputus asa.' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ available: false, neutral: 0, concepts: [] });
  });

  it('refuses a malformed model response', async () => {
    aiResult = async () => ({ data: [[1, 2, 3]] });
    expect((await call('POST', '/api/situasi', { q: 'Dia tidak mudah berputus asa.' })).body.available).toBe(false);
  });

  it('validates and rate-limits input', async () => {
    expect((await call('POST', '/api/situasi', { q: 'a' })).status).toBe(400);
    for (let i = 0; i < 39; i++) await call('POST', '/api/situasi', { q: 'ayat ujian' });
    expect((await call('POST', '/api/situasi', { q: 'ayat ujian' })).status).toBe(429);
  });

  it('scores a vector against every concept', () => {
    const res = scoreConcepts(new Array(1024).fill(0.5));
    expect(res.concepts.length).toBe(40);
    expect(res.concepts[0].sim).toBeGreaterThanOrEqual(res.concepts[39].sim);
  });
});
