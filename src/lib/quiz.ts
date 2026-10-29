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

export function buildQuiz(mode: Exclude<QuizMode, 'maksud'>, ctx: Ctx, sessionId: string): QuizQuestion[] {
  const seed = hashString(sessionId);
  if (mode === 'emoji') return buildEmojiQuiz(ctx, seed);
  if (mode === 'konteks') return buildContextQuiz(ctx, seed);
  return buildBlankQuiz(ctx, seed);
}
