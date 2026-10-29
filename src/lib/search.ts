import type { Kategori, Peribahasa, ThemeId } from '../types/peribahasa';
import { CONCEPTS, type Concept } from '../content/concepts';
import { normalize, tokenize, contentTokens, stems, STOPWORDS, MIN_STEM_MATCH } from './text';
import { THEMES } from './data';

// ---------- Index ----------

interface Indexed {
  r: Peribahasa;
  sayingTokens: string[];
  sayingStems: Set<string>;
  maksudStems: Set<string>;
  keywordStems: Set<string>;
}

const stemSet = (tokens: string[]) => new Set(tokens.flatMap(stems));

export function buildIndex(records: Peribahasa[]): Indexed[] {
  return records.map((r) => {
    const sayingTokens = tokenize(r.peribahasa);
    return {
      r,
      sayingTokens,
      sayingStems: stemSet(sayingTokens),
      maksudStems: stemSet(contentTokens(r.maksud)),
      keywordStems: stemSet(r.keywords),
    };
  });
}

// ---------- Mode A: Carian Kata Kunci ----------

export interface KeywordFilters {
  category?: Kategori | null;
  theme?: ThemeId | null;
}

export interface KeywordResult {
  record: Peribahasa;
  score: number;
  /** "peribahasa": the query is in the saying itself; "maksud": only in its meaning; "tema": by theme only. */
  where: 'peribahasa' | 'maksud' | 'tema';
  /** Normalised words to highlight. */
  terms: string[];
}

export function keywordSearch(index: Indexed[], query: string, filters: KeywordFilters = {}, opts: { prefix?: boolean } = {}): KeywordResult[] {
  const q = normalize(query);
  if (!q) return [];
  let qTokens = contentTokens(q, true);
  if (!qTokens.length) qTokens = tokenize(q);
  const qStems = qTokens.map((t) => new Set(stems(t).filter((x) => x === t || x.length >= MIN_STEM_MATCH)));
  // A query that names a theme ("keluarga", "kesabaran") also brings in that theme's sayings.
  const qRoots = new Set(qStems.flatMap((s) => [...s]));
  const themeHit = (Object.entries(THEMES) as [ThemeId, { label: string }][]).find(([, t]) =>
    tokenize(t.label).some((w) => w.length >= 4 && (qRoots.has(w) || stems(w).some((x) => x.length >= MIN_STEM_MATCH && qRoots.has(x)))),
  )?.[0];
  const results: KeywordResult[] = [];

  for (const item of index) {
    const { r } = item;
    if (filters.category && r.category !== filters.category) continue;
    if (filters.theme && !r.themes.includes(filters.theme)) continue;
    const padded = ` ${r.normalizedText} `;
    let score = 0;
    let inSaying = false;
    const terms: string[] = [];

    if (r.normalizedText === q) { score += 1000; inSaying = true; }
    else if (padded.includes(` ${q} `)) { score += 500; inSaying = true; }
    else if (r.normalizedText.startsWith(opts.prefix ? q : `${q} `) && q.length >= 3) { score += 400; inSaying = true; }

    let allMatched = true;
    qTokens.forEach((t, i) => {
      if (item.sayingTokens.includes(t)) { score += 60; inSaying = true; terms.push(t); return; }
      const hitStem = [...qStems[i]].find((s) => item.sayingStems.has(s));
      if (hitStem) {
        score += 35; inSaying = true;
        terms.push(...item.sayingTokens.filter((w) => stems(w).includes(hitStem)));
        return;
      }
      if (opts.prefix && t.length >= 3 && i === qTokens.length - 1) {
        const prefixHit = item.sayingTokens.find((w) => w.startsWith(t));
        if (prefixHit) { score += 20; inSaying = true; terms.push(prefixHit); return; }
      }
      if ([...qStems[i]].some((s) => item.maksudStems.has(s) || item.keywordStems.has(s))) { score += 15; terms.push(t); return; }
      allMatched = false;
    });
    if (score >= 400) allMatched = true; // whole-phrase hits count even if a token is a stopword
    if ((!allMatched || score === 0) && themeHit && r.themes.includes(themeHit)) {
      results.push({ record: r, score: 5 - r.themes.indexOf(themeHit), where: 'tema', terms: [] });
      continue;
    }
    if (!allMatched || score === 0) continue;
    // Shorter sayings rank above long ones with the same hits.
    score -= item.sayingTokens.length * 0.5;
    results.push({ record: r, score, where: inSaying ? 'peribahasa' : 'maksud', terms: [...new Set(terms.length ? terms : qTokens)] });
  }
  return results.sort((a, b) => b.score - a.score || a.record.normalizedText.localeCompare(b.record.normalizedText, 'ms'));
}

/** Saying suggestions while typing. */
export function suggest(index: Indexed[], query: string, limit = 5): Peribahasa[] {
  if (normalize(query).length < 2) return [];
  return keywordSearch(index, query, {}, { prefix: true }).filter((x) => x.where === 'peribahasa').slice(0, limit).map((x) => x.record);
}

/** The most frequent image words in the collection, for extra keyword chips. */
export function frequentImageWords(records: Peribahasa[], exclude: string[], limit = 12): string[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    for (const t of new Set(contentTokens(r.peribahasa))) {
      if (t.length < 3 || STOPWORDS.has(t)) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const ex = new Set(exclude.map((e) => e.toLowerCase()));
  return [...counts.entries()]
    .filter(([w, c]) => c >= 4 && !ex.has(w) && !['hati', 'orang', 'sama', 'mati', 'besar', 'kecil'].includes(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

// ---------- Mode B: Carian Situasi ----------

export type Strength = 'kuat' | 'sederhana' | 'lemah';

export interface SituationResult {
  record: Peribahasa;
  score: number;
  strength: Strength;
  /** Explanation that quotes the student's own words. */
  sebab: string;
  /** Words from the student's text that drove the match. */
  matched: string[];
  concept?: Concept;
  alternatives: Peribahasa[];
}

export interface SituationResponse {
  results: SituationResult[];
  /** True when nothing reached a moderate match; the UI says so instead of pretending. */
  weak: boolean;
  /** Words from the input that exist as keywords in the collection, to offer as searches. */
  relatedTerms: string[];
}

interface ConceptHit { concept: Concept; weight: number; matched: string[] }

function matchConcepts(text: string): ConceptHit[] {
  const n = ` ${normalize(text)} `;
  const tokens = tokenize(text);
  const tokenStems = tokens.map((t) => ({ t, s: new Set(stems(t)) }));
  const hits: ConceptHit[] = [];
  for (const concept of CONCEPTS) {
    let weight = 0;
    const matched: string[] = [];
    for (const trigger of concept.triggers) {
      const nt = normalize(trigger);
      if (nt.includes(' ')) {
        if (n.includes(` ${nt} `)) { weight += 2; matched.push(nt); }
      } else {
        const ts = new Set(stems(nt));
        const hit = nt.includes('-')
          ? tokenStems.find(({ t }) => t === nt)
          : tokenStems.find(({ t, s }) => t === nt || (!STOPWORDS.has(t) && [...ts].some((x) => x.length >= MIN_STEM_MATCH && s.has(x))));
        if (hit && !matched.includes(hit.t)) { weight += nt.includes('-') ? 2 : 1; matched.push(hit.t); }
      }
    }
    if (weight > 0) hits.push({ concept, weight, matched });
  }
  return hits.sort((a, b) => b.weight - a.weight);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');
const quoteList = (words: string[]) => words.slice(0, 3).map((w) => `“${w}”`).join(words.length > 2 ? ', ' : ' dan ');

export function situationSearch(index: Indexed[], text: string, opts: { limit?: number; byId: Map<string, Peribahasa> }): SituationResponse {
  const { byId } = opts;
  const limit = opts.limit ?? 6;
  const input = text.trim();
  if (normalize(input).split(' ').length < 2) return { results: [], weak: true, relatedTerms: [] };

  const conceptHits = matchConcepts(input);
  const inputTokens = [...new Set(contentTokens(input).filter((t) => t.length > 2))];
  const inputStems = inputTokens.map((t) => ({ t, s: stems(t) }));

  // Document frequency for a light IDF weight on meaning words.
  const df = new Map<string, number>();
  for (const item of index) for (const s of item.maksudStems) df.set(s, (df.get(s) ?? 0) + 1);
  const N = index.length;

  type Acc = { score: number; conceptHit?: ConceptHit; conceptRank?: number; lexical: string[] };
  const acc = new Map<string, Acc>();
  const get = (id: string) => acc.get(id) ?? (acc.set(id, { score: 0, lexical: [] }), acc.get(id)!);

  for (const hit of conceptHits) {
    hit.concept.ids.forEach((id, rank) => {
      if (!byId.has(id)) return;
      const a = get(id);
      const add = hit.weight * (4 - Math.min(rank, 3) * 0.6);
      if (!a.conceptHit || add > a.score) { a.conceptHit = hit; a.conceptRank = rank; }
      a.score += add;
    });
  }

  for (const item of index) {
    if (item.r.sensitive) continue;
    let lex = 0;
    const words: string[] = [];
    for (const { t, s } of inputStems) {
      const hit = s.find((x) => (x === t || x.length >= MIN_STEM_MATCH) && (item.maksudStems.has(x) || item.keywordStems.has(x)));
      if (hit && !words.includes(t)) {
        lex += Math.log(1 + N / (df.get(hit) ?? 1));
        words.push(t);
      }
    }
    if (words.length >= 1 && lex > 0) {
      const a = get(item.r.id);
      a.score += lex * 0.55 * (words.length >= 2 ? 1.4 : 1);
      a.lexical = words;
    }
  }

  const ranked = [...acc.entries()]
    .map(([id, a]) => ({ id, ...a }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const results: SituationResult[] = [];
  const seen = new Set<string>();
  for (const x of ranked) {
    const record = byId.get(x.id)!;
    if (seen.has(x.id) || record.variants.some((v) => seen.has(v))) continue;
    seen.add(x.id);
    const conceptStrong = x.conceptHit && x.conceptHit.weight >= 2 && (x.conceptRank ?? 9) <= 1;
    const strength: Strength = conceptStrong ? 'kuat' : (x.conceptHit && x.conceptHit.weight >= 2) || x.lexical.length >= 2 ? 'sederhana' : 'lemah';
    const matched = x.conceptHit ? x.conceptHit.matched : x.lexical;
    const maksud = lowerFirst(record.maksud);
    const sebab = x.conceptHit
      ? `Kamu menyebut ${quoteList(x.conceptHit.matched)}. Situasi ini menggambarkan ${x.conceptHit.concept.label}. Peribahasa ini bermaksud ${maksud}, jadi ia sesuai dengan keadaan tersebut.`
      : `Perkataan ${quoteList(x.lexical)} dalam situasi kamu turut terdapat dalam maksud peribahasa ini: ${maksud}. Padanan ini berdasarkan kata kunci sahaja, jadi semak sama ada maksudnya benar-benar sesuai.`;
    const alternatives = (x.conceptHit?.concept.ids ?? [])
      .filter((id) => id !== x.id && byId.has(id))
      .map((id) => byId.get(id)!)
      .slice(0, 2);
    results.push({ record, score: x.score, strength, sebab, matched, concept: x.conceptHit?.concept, alternatives });
    if (results.length >= limit) break;
  }

  const weak = !results.some((r) => r.strength !== 'lemah');
  const relatedTerms = inputTokens.filter((t) => index.some((i) => i.sayingTokens.includes(t))).slice(0, 5);
  return { results: weak ? results.slice(0, 3) : results.filter((r) => r.strength !== 'lemah').slice(0, limit), weak, relatedTerms };
}

export const POPULAR_KEYWORDS = ['Air', 'Ayam', 'Padi', 'Harimau', 'Ular', 'Ilmu', 'Usaha', 'Masa', 'Guru', 'Keluarga', 'Kerjasama', 'Kesabaran'];
