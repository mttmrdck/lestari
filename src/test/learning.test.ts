import { describe, expect, it } from 'vitest';
import { rate, RELEARN_MS, isCardMastered } from '../lib/srs';
import { createStore, currentStreak, longestStreak, isMastered, emptyState, loadState, XP } from '../lib/progress';
import { DAY_MS, startOfDay, dateKey } from '../lib/date';
import { dailyAnswer, dailyPool, isCorrectGuess, cluesFor, DAILY_ATTEMPTS } from '../lib/daily';
import { buildQuiz, chooseBlank, blankedText } from '../lib/quiz';
import { BY_ID, CORE, LEARNABLE } from '../lib/data';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  };
}

const NOW = new Date(2026, 9, 29, 10, 0, 0).getTime();

describe('spaced repetition', () => {
  it('schedules Susah again in ten minutes', () => {
    const c = rate(undefined, 'x', 'susah', NOW);
    expect(c.due).toBe(NOW + RELEARN_MS);
    expect(c.interval).toBe(0);
  });

  it('grows intervals for Sederhana: 1, 3, then × ease', () => {
    let c = rate(undefined, 'x', 'sederhana', NOW);
    expect(c.interval).toBe(1);
    expect(c.due).toBe(startOfDay(NOW) + DAY_MS);
    c = rate(c, 'x', 'sederhana', c.due);
    expect(c.interval).toBe(3);
    c = rate(c, 'x', 'sederhana', c.due);
    expect(c.interval).toBeGreaterThanOrEqual(7);
  });

  it('gives Mudah the longest first interval', () => {
    expect(rate(undefined, 'x', 'mudah', NOW).interval).toBe(4);
  });

  it('counts a lapse and resets the run when a learned card is rated Susah', () => {
    let c = rate(undefined, 'x', 'mudah', NOW);
    c = rate(c, 'x', 'susah', NOW + 5 * DAY_MS);
    expect(c.lapses).toBe(1);
    expect(c.reps).toBe(0);
    expect(isCardMastered(c)).toBe(false);
  });

  it('keeps the review history', () => {
    let c = rate(undefined, 'x', 'mudah', NOW);
    c = rate(c, 'x', 'sederhana', NOW + DAY_MS * 4);
    expect(c.history.map((h) => h.r)).toEqual(['mudah', 'sederhana']);
  });
});

describe('progress store', () => {
  it('pays quiz XP once per question per session and once per saying per day', () => {
    const store = createStore(memoryStorage(), () => NOW);
    const a = { sessionId: 's1', questionKey: 'q1', mode: 'emoji' as const, recordId: 'ada-gula-ada-semut', correct: true };
    expect(store.answerQuiz(a)).toBe(XP.quizCorrect);
    expect(store.answerQuiz(a)).toBe(0); // same question again
    expect(store.answerQuiz({ ...a, sessionId: 's2' })).toBe(0); // same saying, same day
    expect(store.getState().xpTotal).toBe(XP.quizCorrect);
    expect(store.getState().answers['ada-gula-ada-semut'].correct).toBe(2);
  });

  it('pays nothing for re-opening a saying', () => {
    const store = createStore(memoryStorage(), () => NOW);
    store.explore('ada-gula-ada-semut', 'Ada gula ada semut');
    store.explore('ada-gula-ada-semut', 'Ada gula ada semut');
    expect(store.getState().xpTotal).toBe(XP.explore);
  });

  it('caps exploration XP per day', () => {
    const store = createStore(memoryStorage(), () => NOW);
    LEARNABLE.slice(0, 40).forEach((r) => store.explore(r.id, r.peribahasa));
    expect(store.getState().xpTotal).toBe(XP.exploreDailyCap * XP.explore);
  });

  it('pays review XP once per card per day but still schedules every rating', () => {
    const store = createStore(memoryStorage(), () => NOW);
    store.review('ada-gula-ada-semut', 'susah', 'x');
    store.review('ada-gula-ada-semut', 'sederhana', 'x');
    expect(store.getState().xpTotal).toBe(XP.review);
    expect(store.getState().cards['ada-gula-ada-semut'].history).toHaveLength(2);
  });

  it('persists favourites', () => {
    const storage = memoryStorage();
    const store = createStore(storage, () => NOW);
    store.toggleFavourite('ada-gula-ada-semut');
    const again = createStore(storage, () => NOW);
    expect(again.getState().favourites).toEqual(['ada-gula-ada-semut']);
  });

  it('recovers from corrupted storage and keeps a backup', () => {
    const storage = memoryStorage({ 'lestari:v1': '{not json' });
    const { state, notice } = loadState(storage);
    expect(state).toEqual(emptyState());
    expect(notice).toMatch(/rosak/);
    expect(Object.keys(storage.data).some((k) => k.startsWith('lestari:v1:rosak:'))).toBe(true);
  });

  it('fills missing fields in older saved data', () => {
    const storage = memoryStorage({ 'lestari:v1': JSON.stringify({ version: 1, xpTotal: 40, favourites: ['a'] }) });
    const { state } = loadState(storage);
    expect(state.xpTotal).toBe(40);
    expect(state.cards).toEqual({});
    expect(state.counters.reviews).toBe(0);
  });

  it('works without storage', () => {
    const store = createStore(null, () => NOW);
    store.toggleFavourite('x');
    expect(store.getState().favourites).toEqual(['x']);
    expect(store.getNotice()).toBeTruthy();
  });

  it('unlocks an achievement only when its rule is met', () => {
    const store = createStore(memoryStorage(), () => NOW);
    expect(store.getState().achievements['langkah-pertama']).toBeUndefined();
    store.completeQuiz({ id: 'q', mode: 'emoji', correct: 3, total: 8, xp: 30, wrongIds: [] });
    expect(store.getState().achievements['langkah-pertama']).toBe(NOW);
    store.completeQuiz({ id: 'q', mode: 'emoji', correct: 3, total: 8, xp: 30, wrongIds: [] });
    expect(store.getState().counters.quizzesCompleted).toBe(1);
  });
});

describe('streaks and mastery', () => {
  it('counts the current streak ending today or yesterday', () => {
    expect(currentStreak(['2026-10-27', '2026-10-28', '2026-10-29'], '2026-10-29')).toBe(3);
    expect(currentStreak(['2026-10-27', '2026-10-28'], '2026-10-29')).toBe(2);
    expect(currentStreak(['2026-10-26'], '2026-10-29')).toBe(0);
    expect(longestStreak(['2026-10-01', '2026-10-02', '2026-10-05'])).toBe(2);
  });

  it('does not treat opening many cards as mastery', () => {
    const s = emptyState();
    s.explored = Object.fromEntries(LEARNABLE.slice(0, 100).map((r) => [r.id, NOW]));
    expect(LEARNABLE.slice(0, 100).some((r) => isMastered(s, r.id))).toBe(false);
  });

  it('requires correct contextual answers for quiz-based mastery', () => {
    const s = emptyState();
    s.answers.x = { correct: 3, wrong: 0, contextCorrect: 0, lastCorrect: true };
    expect(isMastered(s, 'x')).toBe(false);
    s.answers.x.contextCorrect = 1;
    expect(isMastered(s, 'x')).toBe(true);
    s.answers.x.lastCorrect = false;
    expect(isMastered(s, 'x')).toBe(false);
  });
});

describe('daily challenge', () => {
  const pool = dailyPool(CORE);

  it('is the same saying for the same date', () => {
    expect(dailyAnswer(pool, '2026-10-29').id).toBe(dailyAnswer(pool, '2026-10-29').id);
    const week = new Set(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'].map((d) => dailyAnswer(pool, d).id));
    expect(week.size).toBeGreaterThan(1);
  });

  it('accepts small typos and variants, rejects other sayings', () => {
    const r = BY_ID.get('harapkan-pagar-pagar-makan-padi')!;
    expect(isCorrectGuess(r, 'harapkan pagar pagar makan padi', BY_ID)).toBe(true);
    expect(isCorrectGuess(r, 'Harapkan pagar, pagar makan padii', BY_ID)).toBe(true);
    expect(isCorrectGuess(r, 'Ada udang di sebalik batu', BY_ID)).toBe(false);
  });

  it('reveals clues progressively', () => {
    const r = BY_ID.get('harapkan-pagar-pagar-makan-padi')!;
    expect(cluesFor(r, 0).map((c) => c.label)).toEqual(['Maksud']);
    expect(cluesFor(r, 2).map((c) => c.label)).toEqual(['Maksud', 'Kategori', 'Perkataan pertama']);
  });

  it('stops after the last attempt and does not reset', () => {
    const storage = memoryStorage();
    const store = createStore(storage, () => NOW);
    const day = dateKey(NOW);
    for (let i = 0; i < DAILY_ATTEMPTS + 2; i++) store.dailyGuess(day, 'x', `salah ${i}`, false, DAILY_ATTEMPTS);
    const saved = createStore(storage, () => NOW).getState().daily[day];
    expect(saved.status).toBe('lost');
    expect(saved.guesses).toHaveLength(DAILY_ATTEMPTS);
    expect(store.getState().xpTotal).toBe(XP.dailyTried);
  });
});

describe('quiz builders', () => {
  const ctx = { byId: BY_ID, pool: CORE };

  for (const mode of ['emoji', 'kosong', 'konteks'] as const) {
    it(`builds a valid ${mode} session`, () => {
      const qs = buildQuiz(mode, ctx, `test-${mode}`);
      expect(qs.length).toBeGreaterThanOrEqual(6);
      expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
      for (const q of qs) {
        expect(q.options.length).toBe(4);
        expect(new Set(q.options.map((o) => o.label)).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        const answer = BY_ID.get(q.recordId)!;
        for (const o of q.options) if (o.recordId && o.recordId !== answer.id) expect(answer.variants).not.toContain(o.recordId);
      }
      for (let i = 1; i < qs.length; i++) expect(qs[i].difficulty).toBeGreaterThanOrEqual(qs[i - 1].difficulty);
    });
  }

  it('blanks one word and the answer completes the real saying', () => {
    const r = BY_ID.get('sehari-selembar-benang-lama-lama-menjadi-kain')!;
    const b = chooseBlank(r)!;
    expect(blankedText(b)).toContain('____');
    expect(blankedText(b).replace('____', b.word)).toBe(r.peribahasa);
  });

  it('is reproducible for the same session id', () => {
    expect(buildQuiz('kosong', ctx, 'abc').map((q) => q.key)).toEqual(buildQuiz('kosong', ctx, 'abc').map((q) => q.key));
  });
});
