import type { Peribahasa } from '../types/peribahasa';
import { EMOJI_PUZZLES } from '../content/emoji';
import { SITUATIONS } from '../content/situations';
import type { QuizMode } from './progress';
import { normalize, STOPWORDS, tokenize } from './text';
import { shuffle, seeded, hashString } from './random';

export interface QuizOption { label: string; recordId?: string }

export interface QuizQuestion {
  key: string;
  mode: QuizMode;
  recordId: string;
  difficulty: 1 | 2 | 3;
  /** Main prompt text (emoji string, saying with a blank, or the situation). */
  prompt: string;
  promptLabel?: string;
  options: QuizOption[];
  correctIndex: number;
  explanation: string;
}

export const SESSION_LENGTH = 8;

interface Ctx { byId: Map<string, Peribahasa>; pool: Peribahasa[] }

const excluded = (r: Peribahasa, ids: string[]) => ids.includes(r.id) || r.variants.some((v) => ids.includes(v));

/** Order questions from easier to harder, with a little shuffling inside each level. */
function progression<T extends { difficulty: number }>(items: T[], rand: () => number, n: number): T[] {
  const byLevel = [1, 2, 3].map((d) => shuffle(items.filter((i) => i.difficulty === d), rand));
  const quota = [Math.ceil(n * 0.4), Math.ceil(n * 0.35), n];
  const chosen: T[] = [];
  byLevel.forEach((level, i) => {
    for (const item of level) {
      if (chosen.length >= Math.min(n, quota.slice(0, i + 1).reduce((a, b) => a + b, 0))) break;
      chosen.push(item);
    }
  });
  // Top up from any level if a level ran short.
  for (const item of shuffle(items, rand)) if (chosen.length < n && !chosen.includes(item)) chosen.push(item);
  return chosen.slice(0, n).sort((a, b) => a.difficulty - b.difficulty);
}

function withOptions(answer: QuizOption, distractors: QuizOption[], rand: () => number) {
  const options = shuffle([answer, ...distractors], rand);
  return { options, correctIndex: options.indexOf(answer) };
}

export function buildEmojiQuiz(ctx: Ctx, seed: number, n = SESSION_LENGTH): QuizQuestion[] {
  const rand = seeded(seed);
  const puzzles = EMOJI_PUZZLES.filter((p) => ctx.byId.has(p.answer));
  return progression(puzzles, rand, n).map((p) => {
    const r = ctx.byId.get(p.answer)!;
    const others = shuffle(puzzles.filter((o) => o.answer !== p.answer).map((o) => ctx.byId.get(o.answer)!), rand)
      .filter((o) => !excluded(o, [r.id]))
      .slice(0, 3);
    const { options, correctIndex } = withOptions({ label: r.peribahasa, recordId: r.id }, others.map((o) => ({ label: o.peribahasa, recordId: o.id })), rand);
    return {
      key: `emoji:${r.id}`, mode: 'emoji', recordId: r.id, difficulty: p.difficulty,
      prompt: p.emoji, promptLabel: p.label, options, correctIndex,
      explanation: `${r.peribahasa}: ${r.maksud}`,
    };
  });
}

export function buildContextQuiz(ctx: Ctx, seed: number, n = SESSION_LENGTH): QuizQuestion[] {
  const rand = seeded(seed);
  const items = SITUATIONS.filter((s) => ctx.byId.has(s.answer) && s.distractors.every((d) => ctx.byId.has(d)));
  return progression(items, rand, n).map((s) => {
    const r = ctx.byId.get(s.answer)!;
    const { options, correctIndex } = withOptions(
      { label: r.peribahasa, recordId: r.id },
      s.distractors.map((d) => ({ label: ctx.byId.get(d)!.peribahasa, recordId: d })),
      rand,
    );
    return {
      key: `konteks:${s.id}`, mode: 'konteks', recordId: r.id, difficulty: s.difficulty,
      prompt: s.situasi, options, correctIndex,
      explanation: s.penerangan,
    };
  });
}

// ---------- Isi Tempat Kosong ----------

export interface Blank { record: Peribahasa; tokenIndex: number; word: string }

const IMAGE_HINT = /^(padi|pagar|ayam|harimau|ular|gajah|kucing|anjing|air|api|batu|bukit|hujan|ikan|udang|katak|tempurung|tebing|aur|buluh|rebung|kuih|acuan|kain|benang|bantal|payung|minyak|tangga|tanduk|telur|garam|gula|semut|pasir|keladi|kuku|belang|nama|janji|tali|arang|ruyung|sagu|kulit|kacang|labu|tikus|ketam|lalang|pinang|cendawan|sekam|duri|daging|kaca|kapal|gelombang|periuk|kerak|nasi|bubur|murai|ekor|biawak|bulan|bintang|lembu|kerbau|kambing|buaya|lintah|darah|perahu|jalan|mata|madu|sepah|selimut|tuba|kayu|abu|bara|embun|rumput|bunga|kera)$/;

/** Pick the word to blank: a concrete image word when there is one, otherwise the last content word. */
export function chooseBlank(r: Peribahasa): Blank | null {
  const words = r.peribahasa.replace(/[,:;.]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 4) return null;
  const norm = words.map((w) => normalize(w));
  const counts = norm.reduce<Record<string, number>>((a, w) => ((a[w] = (a[w] ?? 0) + 1), a), {});
  const candidates = norm
    .map((w, i) => ({ w, i }))
    .filter(({ w, i }) => i > 0 && w.length >= 3 && !STOPWORDS.has(w) && counts[w] === 1);
  if (!candidates.length) return null;
  const image = candidates.filter(({ w }) => IMAGE_HINT.test(w));
  const chosen = (image.length ? image[image.length - 1] : candidates[candidates.length - 1]);
  return { record: r, tokenIndex: chosen.i, word: words[chosen.i].replace(/[^\p{L}-]/gu, '') };
}

export function blankedText(b: Blank): string {
  const words = b.record.peribahasa.split(/(\s+)/);
  let idx = -1;
  return words.map((w) => {
    if (/^\s+$/.test(w)) return w;
    idx++;
    return idx === b.tokenIndex ? w.replace(/[\p{L}-]+/u, '____') : w;
  }).join('');
}

export function buildBlankQuiz(ctx: Ctx, seed: number, n = SESSION_LENGTH): QuizQuestion[] {
  const rand = seeded(seed);
  const texts = new Set(ctx.pool.map((r) => r.normalizedText));
  const blanks = ctx.pool.map(chooseBlank).filter((b): b is Blank => !!b);
  const wordPool = [...new Set(blanks.map((b) => normalize(b.word)))];
  const items = blanks.map((b) => ({ b, difficulty: b.record.difficulty }));
  return progression(items, rand, n).map(({ b }) => {
    const answer = normalize(b.word);
    const sameImage = wordPool.filter((w) => IMAGE_HINT.test(w) === IMAGE_HINT.test(answer));
    const distractors: string[] = [];
    for (const w of shuffle(sameImage.length > 6 ? sameImage : wordPool, rand)) {
      if (distractors.length === 3) break;
      if (w === answer || distractors.includes(w)) continue;
      // Never offer a word that would form another real saying.
      const tokens = tokenize(b.record.peribahasa);
      tokens[b.tokenIndex] = w;
      if (texts.has(tokens.join(' '))) continue;
      distractors.push(w);
    }
    const { options, correctIndex } = withOptions({ label: answer }, distractors.map((label) => ({ label })), rand);
    return {
      key: `kosong:${b.record.id}`, mode: 'kosong', recordId: b.record.id, difficulty: b.record.difficulty,
      prompt: blankedText(b), options, correctIndex,
      explanation: `${b.record.peribahasa}: ${b.record.maksud}`,
    };
  });
}

// ---------- Teka Maksud ----------

/** Wrong meanings come from sayings with a different main theme, never a variant or a related saying. */
export function meaningDistractors(r: Peribahasa, pool: Peribahasa[], rand: () => number, n = 3): string[] {
  const banned = new Set([r.id, ...r.variants, ...r.relatedPeribahasa]);
  const out: string[] = [];
  for (const o of shuffle(pool, rand)) {
    if (out.length >= n) break;
    if (banned.has(o.id) || o.themes[0] === r.themes[0] || o.maksud === r.maksud || out.includes(o.maksud)) continue;
    if (o.maksud.length < 12 || Math.abs(o.maksud.length - r.maksud.length) > 60) continue;
    out.push(o.maksud);
  }
  return out;
}

export function meaningQuestion(r: Peribahasa, pool: Peribahasa[], rand: () => number): QuizQuestion {
  const { options, correctIndex } = withOptions({ label: r.maksud, recordId: r.id }, meaningDistractors(r, pool, rand).map((label) => ({ label })), rand);
  return {
    key: `maksud:${r.id}`, mode: 'maksud', recordId: r.id, difficulty: r.difficulty,
    prompt: r.peribahasa, options, correctIndex,
    explanation: `${r.peribahasa} bermaksud ${r.maksud.charAt(0).toLowerCase()}${r.maksud.slice(1)}`,
  };
}

export function buildMeaningQuiz(ctx: Ctx, seed: number, n = SESSION_LENGTH): QuizQuestion[] {
  const rand = seeded(seed);
  return progression(ctx.pool.map((r) => ({ r, difficulty: r.difficulty })), rand, n).map(({ r }) => meaningQuestion(r, ctx.pool, rand));
}

export function blankQuestion(r: Peribahasa, ctx: Ctx, rand: () => number): QuizQuestion | null {
  const b = chooseBlank(r);
  if (!b) return null;
  const texts = new Set(ctx.pool.map((x) => x.normalizedText));
  const words = [...new Set(ctx.pool.map(chooseBlank).filter((x): x is Blank => !!x).map((x) => normalize(x.word)))];
  const answer = normalize(b.word);
  const distractors: string[] = [];
  for (const w of shuffle(words, rand)) {
    if (distractors.length === 3) break;
    if (w === answer || distractors.includes(w)) continue;
    const tokens = tokenize(r.peribahasa);
    tokens[b.tokenIndex] = w;
    if (texts.has(tokens.join(' '))) continue;
    distractors.push(w);
  }
  const { options, correctIndex } = withOptions({ label: answer }, distractors.map((label) => ({ label })), rand);
  return { key: `kosong:${r.id}`, mode: 'kosong', recordId: r.id, difficulty: r.difficulty, prompt: blankedText(b), options, correctIndex, explanation: `${r.peribahasa}: ${r.maksud}` };
}

// ---------- Lessons ----------

export type LessonStep =
  | { kind: 'teach'; record: Peribahasa }
  | { kind: 'question'; q: QuizQuestion }
  | { kind: 'match'; key: string; pairs: { id: string; left: string; right: string }[] };

/** Teach four sayings, then practise them with mixed exercise types. */
export function buildLessonSteps(sayings: Peribahasa[], ctx: Ctx, runId: string): LessonStep[] {
  const rand = seeded(hashString(runId));
  const steps: LessonStep[] = sayings.map((record) => ({ kind: 'teach', record }));
  const questions: QuizQuestion[] = [];
  for (const r of sayings) questions.push(meaningQuestion(r, ctx.pool, rand));
  for (const r of shuffle(sayings, rand).slice(0, 2)) { const q = blankQuestion(r, ctx, rand); if (q) questions.push(q); }
  const ids = new Set(sayings.map((r) => r.id));
  const situ = SITUATIONS.find((x) => ids.has(x.answer) && x.distractors.every((d) => ctx.byId.has(d)));
  if (situ) {
    const r = ctx.byId.get(situ.answer)!;
    const { options, correctIndex } = withOptions({ label: r.peribahasa, recordId: r.id }, situ.distractors.map((d) => ({ label: ctx.byId.get(d)!.peribahasa, recordId: d })), rand);
    questions.push({ key: `konteks:${situ.id}`, mode: 'konteks', recordId: r.id, difficulty: situ.difficulty, prompt: situ.situasi, options, correctIndex, explanation: situ.penerangan });
  }
  const emoji = EMOJI_PUZZLES.find((p) => ids.has(p.answer));
  if (emoji) {
    const r = ctx.byId.get(emoji.answer)!;
    const others = shuffle(EMOJI_PUZZLES.filter((o) => o.answer !== r.id && !r.variants.includes(o.answer)), rand).slice(0, 3).map((o) => ctx.byId.get(o.answer)!).filter(Boolean);
    const { options, correctIndex } = withOptions({ label: r.peribahasa, recordId: r.id }, others.map((o) => ({ label: o.peribahasa, recordId: o.id })), rand);
    questions.push({ key: `emoji:${r.id}`, mode: 'emoji', recordId: r.id, difficulty: emoji.difficulty, prompt: emoji.emoji, promptLabel: emoji.label, options, correctIndex, explanation: `${r.peribahasa}: ${r.maksud}` });
  }
  const practice: LessonStep[] = shuffle(questions, rand).map((q) => ({ kind: 'question', q }));
  // The matching round sits in the middle so it breaks up the multiple-choice rhythm.
  practice.splice(Math.min(3, practice.length), 0, { kind: 'match', key: `padan:${sayings.map((r) => r.id).join('|')}`, pairs: sayings.map((r) => ({ id: r.id, left: r.peribahasa, right: r.maksud })) });
  return [...steps, ...practice];
}

export function buildQuiz(mode: QuizMode, ctx: Ctx, sessionId: string): QuizQuestion[] {
  const seed = hashString(sessionId);
  if (mode === 'maksud') return buildMeaningQuiz(ctx, seed);
  if (mode === 'emoji') return buildEmojiQuiz(ctx, seed);
  if (mode === 'konteks') return buildContextQuiz(ctx, seed);
  return buildBlankQuiz(ctx, seed);
}
