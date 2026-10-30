import type { Env } from './env';
import { HttpError, clientIp, json, rateLimit, readJson } from './http';
import prototypes from './generated/prototypes.json';

// Layer 3b of Carian Situasi: compares the learner's sentence with LESTARI's example situations.
// The answer is only ever concept ids and similarities. No saying passes through the model, so it
// cannot invent one: the app still chooses from its curated concept map (src/lib/search.ts).
// On any failure the response is empty and the app falls back to its local cue matching.

const MODEL = '@cf/baai/bge-m3';
const TIMEOUT_MS = 2500;
const MAX_CHARS = 500;
const TOP = 40;

interface Index { labels: string[]; starts: number[]; counts: number[]; data: Int8Array; dim: number }
let cached: Index | null = null;

function load(): Index {
  if (cached) return cached;
  const { labels, counts, vectors, dim } = prototypes as { labels: string[]; counts: number[]; vectors: string; dim: number };
  const bytes = Uint8Array.from(atob(vectors), (c) => c.charCodeAt(0));
  const starts: number[] = [];
  let at = 0;
  for (const n of counts) { starts.push(at); at += n; }
  cached = { labels, starts, counts, dim, data: new Int8Array(bytes.buffer) };
  return cached;
}

/** A concept's similarity is the mean of its two closest example sentences. */
export function scoreConcepts(query: Float32Array | number[]): { neutral: number; concepts: { id: string; sim: number }[] } {
  const { labels, starts, counts, data, dim } = load();
  const norm = Math.hypot(...query) || 1;
  const out: { id: string; sim: number }[] = [];
  let neutral = 0;
  labels.forEach((label, i) => {
    let a = -1;
    let b = -1;
    for (let k = 0; k < counts[i]; k++) {
      const offset = (starts[i] + k) * dim;
      let s = 0;
      for (let d = 0; d < dim; d++) s += query[d] * data[offset + d];
      s /= norm * 127;
      if (s > a) { b = a; a = s; } else if (s > b) b = s;
    }
    const sim = (a + (b < 0 ? a : b)) / 2;
    if (label === '_neutral') neutral = sim;
    else out.push({ id: label, sim: Math.round(sim * 10000) / 10000 });
  });
  return { neutral, concepts: out.sort((x, y) => y.sim - x.sim).slice(0, TOP) };
}

export async function situasi(env: Env, req: Request, now: number): Promise<Response> {
  await rateLimit(env.DB, `situasi:${clientIp(req)}`, 40, 60_000, now);
  const { q } = await readJson<{ q?: unknown }>(req);
  const text = typeof q === 'string' ? q.trim().slice(0, MAX_CHARS) : '';
  if (text.length < 3) throw new HttpError(400, 'too-short', 'Ayat terlalu pendek.');
  try {
    const run = env.AI.run(MODEL as never, { text: [text] } as never) as unknown as Promise<{ data: number[][] }>;
    const timeout = new Promise<never>((_, reject) => { setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS); });
    const res = await Promise.race([run, timeout]);
    const vector = res?.data?.[0];
    if (!Array.isArray(vector) || vector.length !== load().dim) throw new Error('bad embedding');
    return json({ available: true, ...scoreConcepts(vector) });
  } catch (e) {
    console.warn('situasi: falling back to cues', String(e));
    return json({ available: false, neutral: 0, concepts: [] });
  }
}
