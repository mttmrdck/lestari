import { addDays, dateKey, type DateKey } from './date';
import { rate, isCardMastered, type CardState, type Rating } from './srs';

// ---------- State ----------

/** 'maksud' is the one-question meaning check on the detail page. */
export type QuizMode = 'emoji' | 'kosong' | 'konteks' | 'maksud';

export interface Profile {
  name: string;
  level: 'rendah' | 'menengah';
  dailyGoal: number;
  createdAt: number;
}

export interface AnswerStat {
  correct: number;
  wrong: number;
  contextCorrect: number;
  lastCorrect: boolean;
}

export interface QuizSummary {
  id: string;
  mode: QuizMode;
  date: DateKey;
  correct: number;
  total: number;
  xp: number;
  wrongIds: string[];
}

export interface DailyState {
  answerId: string;
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
  xp: number;
}

export interface ActivityItem {
  t: number;
  kind: 'quiz' | 'review' | 'daily' | 'explore' | 'favourite' | 'achievement';
  text: string;
}

export interface ProgressState {
  version: 1;
  profile: Profile | null;
  xpTotal: number;
  xpByDay: Record<DateKey, number>;
  activeDays: DateKey[];
  /** Keys of rewarded actions, so the same action never pays twice. */
  awarded: Record<string, 1>;
  explored: Record<string, number>;
  favourites: string[];
  cards: Record<string, CardState>;
  answers: Record<string, AnswerStat>;
  revisionList: string[];
  quizHistory: QuizSummary[];
  daily: Record<DateKey, DailyState>;
  achievements: Partial<Record<AchievementId, number>>;
  counters: { situationSearches: number; emojiCorrect: number; contextCorrect: number; quizzesCompleted: number; reviews: number; dailySolved: number };
  situationQueries: string[];
  activity: ActivityItem[];
  settings: { timer: boolean };
}

export const emptyState = (): ProgressState => ({
  version: 1,
  profile: null,
  xpTotal: 0,
  xpByDay: {},
  activeDays: [],
  awarded: {},
  explored: {},
  favourites: [],
  cards: {},
  answers: {},
  revisionList: [],
  quizHistory: [],
  daily: {},
  achievements: {},
  counters: { situationSearches: 0, emojiCorrect: 0, contextCorrect: 0, quizzesCompleted: 0, reviews: 0, dailySolved: 0 },
  situationQueries: [],
  activity: [],
  settings: { timer: false },
});

// ---------- XP rules (also documented in docs/learning-model.md) ----------

export const XP = {
  quizCorrect: 10,
  contextBonus: 5,
  quizComplete: 10,
  review: 3,
  explore: 1,
  exploreDailyCap: 20,
  dailyWin: [30, 25, 20, 15] as const,
  dailyTried: 5,
};

// ---------- Achievements ----------

export type AchievementId = 'langkah-pertama' | 'pencari-tegar' | 'pakar-emoji' | 'mahir-konteks' | 'konsisten-belajar' | 'pendekar-bahasa' | 'teka-harian' | 'ulang-kaji-rajin';

export interface Achievement {
  id: AchievementId;
  title: string;
  rule: string;
  target: number;
  value: (s: ProgressState) => number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'langkah-pertama', title: 'Langkah Pertama', rule: 'Selesaikan satu sesi kuiz.', target: 1, value: (s) => s.counters.quizzesCompleted },
  { id: 'pencari-tegar', title: 'Pencari Tegar', rule: 'Buat 10 carian situasi yang berbeza.', target: 10, value: (s) => s.counters.situationSearches },
  { id: 'pakar-emoji', title: 'Pakar Emoji', rule: 'Jawab 15 soalan Teka Emoji dengan betul.', target: 15, value: (s) => s.counters.emojiCorrect },
  { id: 'mahir-konteks', title: 'Mahir Konteks', rule: 'Jawab 20 soalan Pilih Peribahasa dengan betul.', target: 20, value: (s) => s.counters.contextCorrect },
  { id: 'konsisten-belajar', title: 'Konsisten Belajar', rule: 'Belajar 7 hari berturut-turut.', target: 7, value: (s) => longestStreak(s.activeDays) },
  { id: 'pendekar-bahasa', title: 'Pendekar Bahasa', rule: 'Kuasai 25 peribahasa.', target: 25, value: (s) => masteredIds(s).length },
  { id: 'teka-harian', title: 'Penebak Harian', rule: 'Selesaikan 5 cabaran Peribahasa Hari Ini.', target: 5, value: (s) => s.counters.dailySolved },
  { id: 'ulang-kaji-rajin', title: 'Ulang Kaji Rajin', rule: 'Buat 50 ulang kaji kad imbas.', target: 50, value: (s) => s.counters.reviews },
];

// ---------- Derived values ----------

/**
 * Mastery is evidence-based and separate from XP. A saying counts as mastered when either:
 *  - its flashcard has survived to an interval of 7+ days with 2+ successful reviews in a row, or
 *  - it was answered correctly 2+ times in quizzes, at least once in context, and the last answer was right.
 */
export function isMastered(s: ProgressState, id: string): boolean {
  const c = s.cards[id];
  if (c && isCardMastered(c)) return true;
  const a = s.answers[id];
  return !!a && a.correct >= 2 && a.contextCorrect >= 1 && a.lastCorrect;
}

export function masteredIds(s: ProgressState): string[] {
  const ids = new Set([...Object.keys(s.cards), ...Object.keys(s.answers)]);
  return [...ids].filter((id) => isMastered(s, id));
}

export function currentStreak(days: DateKey[], today = dateKey()): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) { n++; cursor = addDays(cursor, -1); }
  return n;
}

export function longestStreak(days: DateKey[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function quizAccuracy(s: ProgressState): number | null {
  let c = 0;
  let t = 0;
  for (const a of Object.values(s.answers)) { c += a.correct; t += a.correct + a.wrong; }
  return t ? c / t : null;
}

// ---------- Events (toasts, celebrations) ----------

export type ProgressEvent =
  | { type: 'xp'; amount: number; reason: string }
  | { type: 'achievement'; achievement: Achievement }
  | { type: 'goal' };

// ---------- Store ----------

const STORAGE_KEY = 'lestari:v1';

type Listener = () => void;

function sanitize(input: unknown): ProgressState {
  const base = emptyState();
  if (!input || typeof input !== 'object' || (input as { version?: unknown }).version !== 1) throw new Error('bad shape');
  const s = input as Partial<ProgressState>;
  const obj = <T extends object>(v: unknown, d: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : d);
  const arr = <T>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
  return {
    ...base,
    profile: s.profile && typeof s.profile.name === 'string' ? { ...s.profile, dailyGoal: Number(s.profile.dailyGoal) || 50 } : null,
    xpTotal: Number.isFinite(s.xpTotal) ? Math.max(0, Number(s.xpTotal)) : 0,
    xpByDay: obj(s.xpByDay, {}),
    activeDays: arr<string>(s.activeDays, []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    awarded: obj(s.awarded, {}),
    explored: obj(s.explored, {}),
    favourites: arr<string>(s.favourites, []).filter((x) => typeof x === 'string'),
    cards: obj(s.cards, {}),
    answers: obj(s.answers, {}),
    revisionList: arr<string>(s.revisionList, []),
    quizHistory: arr(s.quizHistory, []),
    daily: obj(s.daily, {}),
    achievements: obj(s.achievements, {}),
    counters: { ...base.counters, ...obj(s.counters, {}) },
    situationQueries: arr<string>(s.situationQueries, []),
    activity: arr(s.activity, []),
    settings: { ...base.settings, ...obj(s.settings, {}) },
  };
}

export interface LoadResult { state: ProgressState; notice: string | null }

export function loadState(storage: Pick<Storage, 'getItem' | 'setItem'> | null): LoadResult {
  if (!storage) return { state: emptyState(), notice: 'Storan pelayar tidak tersedia. Kemajuan kamu tidak akan disimpan selepas halaman ditutup.' };
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: emptyState(), notice: 'Storan pelayar disekat. Kemajuan kamu tidak akan disimpan.' };
  }
  if (!raw) return { state: emptyState(), notice: null };
  try {
    return { state: sanitize(JSON.parse(raw)), notice: null };
  } catch {
    try { storage.setItem(`${STORAGE_KEY}:rosak:${Date.now()}`, raw); } catch { /* best effort */ }
    return { state: emptyState(), notice: 'Data kemajuan yang tersimpan rosak, jadi kami mulakan semula. Salinan lama disimpan dalam pelayar.' };
  }
}

export function createStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null, now: () => number = Date.now) {
  const loaded = loadState(storage);
  let state = loaded.state;
  let storageNotice = loaded.notice;
  const listeners = new Set<Listener>();
  const eventListeners = new Set<(e: ProgressEvent) => void>();
  let pendingEvents: ProgressEvent[] = [];

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      storageNotice = 'Kemajuan tidak dapat disimpan kerana storan pelayar penuh atau disekat.';
    }
  };

  function commit(next: ProgressState) {
    const before = state;
    state = next;
    // Achievements are checked after every change against their stated rule.
    for (const a of ACHIEVEMENTS) {
      if (!state.achievements[a.id] && a.value(state) >= a.target) {
        state = {
          ...state,
          achievements: { ...state.achievements, [a.id]: now() },
          activity: pushActivity(state.activity, { t: now(), kind: 'achievement', text: `Pencapaian dibuka: ${a.title}` }),
        };
        pendingEvents.push({ type: 'achievement', achievement: a });
      }
    }
    const goal = state.profile?.dailyGoal ?? 50;
    const today = dateKey(now());
    if ((before.xpByDay[today] ?? 0) < goal && (state.xpByDay[today] ?? 0) >= goal) pendingEvents.push({ type: 'goal' });
    persist();
    listeners.forEach((l) => l());
    const events = pendingEvents;
    pendingEvents = [];
    events.forEach((e) => eventListeners.forEach((l) => l(e)));
  }

  /** Award XP once per key. Returns the amount actually given. */
  function award(s: ProgressState, key: string, amount: number, reason: string): [ProgressState, number] {
    if (amount <= 0 || s.awarded[key]) return [s, 0];
    const today = dateKey(now());
    pendingEvents.push({ type: 'xp', amount, reason });
    return [{
      ...s,
      awarded: { ...s.awarded, [key]: 1 },
      xpTotal: s.xpTotal + amount,
      xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + amount },
    }, amount];
  }

  const markActive = (s: ProgressState): ProgressState => {
    const today = dateKey(now());
    return s.activeDays.includes(today) ? s : { ...s, activeDays: [...s.activeDays, today].slice(-400) };
  };

  return {
    getState: () => state,
    getNotice: () => storageNotice,
    dismissNotice: () => { storageNotice = null; listeners.forEach((l) => l()); },
    subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
    onEvent(l: (e: ProgressEvent) => void) { eventListeners.add(l); return () => { eventListeners.delete(l); }; },

    setProfile(profile: Omit<Profile, 'createdAt'>) {
      commit({ ...state, profile: { ...profile, createdAt: state.profile?.createdAt ?? now() } });
    },

    setTimer(on: boolean) {
      commit({ ...state, settings: { ...state.settings, timer: on } });
    },

    /** Opening a saying for the first time: 1 XP, at most 20 per day. Re-opening pays nothing. */
    explore(id: string, title: string) {
      if (state.explored[id]) return;
      const today = dateKey(now());
      const todayCount = Object.keys(state.awarded).filter((k) => k.startsWith(`explore:${today}:`)).length;
      let s: ProgressState = { ...state, explored: { ...state.explored, [id]: now() }, activity: pushActivity(state.activity, { t: now(), kind: 'explore', text: `Meneroka “${title}”` }) };
      if (todayCount < XP.exploreDailyCap) [s] = award(s, `explore:${today}:${id}`, XP.explore, 'Peribahasa baharu diterokai');
      commit(s);
    },

    toggleFavourite(id: string) {
      const has = state.favourites.includes(id);
      commit({ ...state, favourites: has ? state.favourites.filter((x) => x !== id) : [id, ...state.favourites] });
      return !has;
    },

    addToRevision(ids: string[]) {
      const set = new Set([...ids, ...state.revisionList]);
      commit({ ...state, revisionList: [...set] });
    },

    logSituationSearch(query: string) {
      const q = query.trim().toLowerCase();
      if (!q || state.situationQueries.includes(q)) return;
      commit({ ...state, situationQueries: [q, ...state.situationQueries].slice(0, 50), counters: { ...state.counters, situationSearches: state.counters.situationSearches + 1 } });
    },

    /**
     * Record one quiz answer. XP is paid once per question per session, and once per saying,
     * mode and day, so repeating an easy session cannot farm XP.
     */
    answerQuiz(args: { sessionId: string; questionKey: string; mode: QuizMode; recordId: string; correct: boolean }) {
      const { sessionId, questionKey, mode, recordId, correct } = args;
      const answeredKey = `answered:${sessionId}:${questionKey}`;
      if (state.awarded[answeredKey]) return 0;
      const prev = state.answers[recordId] ?? { correct: 0, wrong: 0, contextCorrect: 0, lastCorrect: false };
      let s: ProgressState = markActive({
        ...state,
        awarded: { ...state.awarded, [answeredKey]: 1 },
        answers: {
          ...state.answers,
          [recordId]: {
            correct: prev.correct + (correct ? 1 : 0),
            wrong: prev.wrong + (correct ? 0 : 1),
            contextCorrect: prev.contextCorrect + (correct && mode === 'konteks' ? 1 : 0),
            lastCorrect: correct,
          },
        },
        counters: {
          ...state.counters,
          emojiCorrect: state.counters.emojiCorrect + (correct && mode === 'emoji' ? 1 : 0),
          contextCorrect: state.counters.contextCorrect + (correct && mode === 'konteks' ? 1 : 0),
        },
      });
      let gained = 0;
      if (correct) {
        const amount = XP.quizCorrect + (mode === 'konteks' ? XP.contextBonus : 0);
        [s, gained] = award(s, `quiz:${dateKey(now())}:${mode}:${recordId}`, amount, 'Jawapan betul');
      }
      commit(s);
      return gained;
    },

    completeQuiz(summary: Omit<QuizSummary, 'date' | 'xp'> & { xp: number }) {
      if (state.awarded[`quizdone:${summary.id}`]) return 0;
      let s: ProgressState = {
        ...state,
        awarded: { ...state.awarded, [`quizdone:${summary.id}`]: 1 },
        counters: { ...state.counters, quizzesCompleted: state.counters.quizzesCompleted + 1 },
      };
      let gained = 0;
      if (summary.total >= 5) [s, gained] = award(s, `quizbonus:${summary.id}`, XP.quizComplete, 'Sesi kuiz selesai');
      s = {
        ...s,
        quizHistory: [{ ...summary, date: dateKey(now()), xp: summary.xp + gained }, ...s.quizHistory].slice(0, 60),
        activity: pushActivity(s.activity, { t: now(), kind: 'quiz', text: `Kuiz ${MODE_LABEL[summary.mode]}: ${summary.correct}/${summary.total} betul` }),
      };
      commit(s);
      return gained;
    },

    /** Flashcard rating: schedules the card; 3 XP per card per day. */
    review(id: string, rating: Rating, title: string) {
      const card = rate(state.cards[id], id, rating, now());
      let s: ProgressState = markActive({
        ...state,
        cards: { ...state.cards, [id]: card },
        revisionList: rating === 'susah' ? state.revisionList : state.revisionList.filter((x) => x !== id),
        counters: { ...state.counters, reviews: state.counters.reviews + 1 },
        activity: pushActivity(state.activity, { t: now(), kind: 'review', text: `Ulang kaji “${title}” (${rating})` }),
      });
      [s] = award(s, `review:${dateKey(now())}:${id}`, XP.review, 'Ulang kaji kad');
      commit(s);
      return card;
    },

    dailyGuess(day: DateKey, answerId: string, guess: string, correct: boolean, maxAttempts: number) {
      const cur = state.daily[day] ?? { answerId, guesses: [], status: 'playing' as const, xp: 0 };
      if (cur.status !== 'playing') return cur;
      const guesses = [...cur.guesses, guess];
      const status: DailyState['status'] = correct ? 'won' : guesses.length >= maxAttempts ? 'lost' : 'playing';
      let s: ProgressState = markActive(state);
      let xp = 0;
      if (status === 'won') [s, xp] = award(s, `daily:${day}`, XP.dailyWin[Math.min(guesses.length - 1, 3)], 'Peribahasa Hari Ini');
      if (status === 'lost') [s, xp] = award(s, `daily:${day}`, XP.dailyTried, 'Mencuba Peribahasa Hari Ini');
      const next: DailyState = { answerId, guesses, status, xp };
      s = {
        ...s,
        daily: { ...s.daily, [day]: next },
        counters: status !== 'playing' ? { ...s.counters, dailySolved: s.counters.dailySolved + (status === 'won' ? 1 : 0) } : s.counters,
        activity: status !== 'playing' ? pushActivity(s.activity, { t: now(), kind: 'daily', text: status === 'won' ? `Berjaya meneka Peribahasa Hari Ini dalam ${guesses.length} cubaan` : 'Mencuba Peribahasa Hari Ini' }) : s.activity,
      };
      commit(s);
      return next;
    },

    reset() {
      try { storage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      commit(emptyState());
    },
  };
}

export type ProgressStore = ReturnType<typeof createStore>;

export const MODE_LABEL: Record<QuizMode, string> = { emoji: 'Teka Emoji', kosong: 'Isi Tempat Kosong', konteks: 'Pilih Peribahasa', maksud: 'Semak Maksud' };

function pushActivity(list: ActivityItem[], item: ActivityItem): ActivityItem[] {
  return [item, ...list].slice(0, 40);
}

// Re-export for components that need the card helpers.
export type { CardState, Rating };
