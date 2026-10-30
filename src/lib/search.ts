import type { Kategori, Peribahasa, ThemeId } from '../types/peribahasa';
import { normalize, tokenize, contentTokens, stems, STOPWORDS, MIN_STEM_MATCH } from './text';
import { THEMES } from './data';
import { CONCEPT_BY_ID, detectConcepts, type ConceptHit } from './semantic';
import type { SituationConcept } from '../content/taxonomy';

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

/** True when a filter is set; the filters alone are then a valid search. */
const hasFilter = (f: KeywordFilters) => !!(f.category || f.theme);

export function keywordSearch(index: Indexed[], query: string, filters: KeywordFilters = {}, opts: { prefix?: boolean } = {}): KeywordResult[] {
  const q = normalize(query);
  if (!q) {
    if (!hasFilter(filters)) return [];
    // No words typed: list everything the filters allow, in a stable order.
    return index
      .filter(({ r }) => (!filters.category || r.category === filters.category) && (!filters.theme || r.themes.includes(filters.theme)))
      .map(({ r }): KeywordResult => ({ record: r, score: 0, where: 'tema', terms: [] }))
      .sort((a, b) => a.record.normalizedText.localeCompare(b.record.normalizedText, 'ms'));
  }
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
//
// Layers 1-3 (normalise, cues, concepts) live in ./semantic. Here: retrieve only sayings attached to a
// detected concept (layer 4), rank by how central that concept is to the saying and the sentence
// (layer 5), and return nothing rather than something weak (layer 6). Word overlap only reorders
// sayings that already fit; it can never bring a saying in, so "datang" cannot pull in "Orang luar".

export type Strength = 'kuat' | 'sederhana';

export interface SituationResult {
  record: Peribahasa;
  score: number;
  strength: Strength;
  /** Why this saying fits: the shared idea, not the learner's words echoed back. */
  sebab: string;
  /** Words from the student's text that drove the match. */
  matched: string[];
  concept: SituationConcept;
  alternatives: Peribahasa[];
}

export interface SituationResponse {
  results: SituationResult[];
  /** How the sentence was read, strongest first, shown to the learner as "Kami faham situasi ini tentang". */
  understood: { id: string; label: string }[];
  /** True when nothing fits well enough; the UI says so instead of pretending. */
  weak: boolean;
  /** Words from the input that exist in sayings, to offer as keyword searches. */
  relatedTerms: string[];
}

/** A result must reach this share of the best result, so one strong match is not padded with weak ones. */
const RELATIVE_FLOOR = 0.62;
const RELATED_WEIGHT = 0.68;
const MIN_CONCEPT_SCORE = 2;
// Tuned on the dev and validation sets, on a flat part of the curve (see docs/situation-search-evaluation.md).
const SIM_FLOOR = 0.55;
const SIM_MARGIN = 0;
const SIM_BAND = 0.02;
const CUE_BONUS = 0.06;

interface Link { conceptId: string; primary: boolean; rank: number }

/** Inverted concept index: concept -> sayings, and saying -> concepts it must never be used for. */
function linksFor(index: Indexed[]) {
  const byConcept = new Map<string, { item: Indexed; link: Link }[]>();
  for (const item of index) {
    const s = item.r.semantik;
    if (!s || item.r.sensitive || item.r.verificationStatus === 'perlu-semakan') continue;
    for (const [conceptId, rank] of Object.entries(s.utama)) (byConcept.get(conceptId) ?? byConcept.set(conceptId, []).get(conceptId)!).push({ item, link: { conceptId, primary: true, rank } });
    for (const [conceptId, rank] of Object.entries(s.berkaitan)) (byConcept.get(conceptId) ?? byConcept.set(conceptId, []).get(conceptId)!).push({ item, link: { conceptId, primary: false, rank } });
  }
  return byConcept;
}

const linkCache = new WeakMap<Indexed[], ReturnType<typeof linksFor>>();
function links(index: Indexed[]) {
  let l = linkCache.get(index);
  if (!l) { l = linksFor(index); linkCache.set(index, l); }
  return l;
}

/**
 * Combines the two readings. Similarity sees the whole sentence, so it decides; a cue is explicit
 * evidence and earns a bonus, which also lets similarity veto a cue that misfired on one word.
 * Without similarity (offline, or the service is down) the cues stand on their own.
 */
function mergeHits(cues: ConceptHit[], semantic: SemanticReading | undefined): ConceptHit[] {
  if (!semantic?.concepts.length) return cues;
  const sim = new Map(semantic.concepts.map((c) => [c.id, c.sim]));
  const cueById = new Map(cues.map((h) => [h.concept.id, h]));
  const candidates = [...new Set([...sim.keys(), ...cueById.keys()])]
    .map((id) => ({ id, final: (sim.get(id) ?? 0) + (cueById.has(id) ? CUE_BONUS : 0) }))
    .filter((c) => CONCEPT_BY_ID.has(c.id) && c.final >= SIM_FLOOR && c.final - semantic.neutral >= SIM_MARGIN)
    .sort((a, b) => b.final - a.final);
  if (!candidates.length) return [];
  const best = candidates[0].final;
  const kept = candidates.filter((c) => c.final >= best - SIM_BAND);
  const beaten = new Set(kept.flatMap((c) => CONCEPT_BY_ID.get(c.id)!.overrides ?? []));
  return kept.filter((c) => !beaten.has(c.id)).slice(0, 2).map((c) => ({
    concept: CONCEPT_BY_ID.get(c.id)!,
    score: 3 - (best - c.final) * 10,
    matched: cueById.get(c.id)?.matched ?? [],
  }));
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');

/** Sentence similarity from worker/situasi.ts. It only ever carries concept ids, never a saying. */
export interface SemanticReading { neutral: number; concepts: { id: string; sim: number }[] }

export function situationSearch(index: Indexed[], text: string, opts: { limit?: number; semantic?: SemanticReading } = {}): SituationResponse {
  const limit = opts.limit ?? 5;
  const input = text.trim();
  if (normalize(input).split(' ').length < 2) return { results: [], understood: [], weak: true, relatedTerms: [] };

  const hits = mergeHits(detectConcepts(input).filter((h) => h.score >= MIN_CONCEPT_SCORE), opts.semantic);
  const inputTokens = [...new Set(contentTokens(input).filter((t) => t.length > 2))];
  const relatedTerms = inputTokens.filter((t) => index.some((i) => i.sayingTokens.includes(t))).slice(0, 5);
  const understood = hits.slice(0, 3).map((h) => ({ id: h.concept.id, label: h.concept.label }));
  if (!hits.length) return { results: [], understood: [], weak: true, relatedTerms };

  const inputStems = new Set(inputTokens.flatMap(stems).filter((s) => s.length >= MIN_STEM_MATCH));
  const top = hits[0].score;
  const blocked = new Set(hits.flatMap((h) => byConceptAvoid(index, h.concept.id)));

  type Acc = { item: Indexed; score: number; hit: ConceptHit; primary: boolean; covered: number };
  const acc = new Map<string, Acc>();
  for (const hit of hits) {
    const weight = hit.score / top;
    for (const { item, link } of links(index).get(hit.concept.id) ?? []) {
      if (blocked.has(item.r.id)) continue;
      // Earlier in the curated list means a more central fit; related sayings stay below primary ones.
      const s = weight * (link.primary ? 1 : RELATED_WEIGHT) * (1 - Math.min(link.rank, 6) * 0.035);
      const cur = acc.get(item.r.id);
      if (!cur) acc.set(item.r.id, { item, score: s, hit, primary: link.primary, covered: 1 });
      else {
        if (s > cur.score) { cur.score = s; cur.hit = hit; cur.primary = link.primary; }
        cur.covered++;
      }
    }
  }

  const ranked = [...acc.values()].map((a) => {
    // A saying covering two of the detected ideas beats one covering only one. Shared meaning words
    // and the curriculum are tie-breakers: small, and only for sayings already retrieved.
    const overlap = [...a.item.maksudStems].filter((s) => inputStems.has(s)).length;
    const score = a.score + (a.covered - 1) * 0.08 + Math.min(overlap, 3) * 0.015 + (a.item.r.tingkatan.length ? 0.01 : 0);
    return { ...a, score };
  }).sort((a, b) => b.score - a.score || a.item.r.id.localeCompare(b.item.r.id));

  const best = ranked[0]?.score ?? 0;
  const results: SituationResult[] = [];
  const seen = new Set<string>();
  // Two sayings that truly mean this are a better answer than those two plus looser relatives.
  const strongEnough = new Set(ranked.filter((x) => x.primary && x.score >= best * RELATIVE_FLOOR).map((x) => x.item.r.id)).size >= 2;
  for (const x of ranked) {
    const r = x.item.r;
    if (x.score < best * RELATIVE_FLOOR || seen.has(r.id) || r.variants.some((v) => seen.has(v))) continue;
    if (strongEnough && !x.primary) continue;
    seen.add(r.id);
    const strength: Strength = x.primary && x.hit.score >= 3 && x.score >= best * 0.8 ? 'kuat' : 'sederhana';
    const alternatives = (links(index).get(x.hit.concept.id) ?? [])
      .filter(({ item, link }) => link.primary && item.r.id !== r.id && !r.variants.includes(item.r.id) && !blocked.has(item.r.id))
      .map(({ item }) => item.r);
    results.push({
      record: r, score: x.score, strength, matched: x.hit.matched, concept: x.hit.concept, alternatives,
      sebab: `${x.hit.concept.why} Maksudnya: ${lowerFirst(r.maksud)}.`,
    });
    if (results.length >= limit) break;
  }
  // "Other options" should add something: never repeat a saying already on the page.
  const shown = new Set(results.flatMap((x) => [x.record.id, ...x.record.variants]));
  for (const x of results) x.alternatives = x.alternatives.filter((a) => !shown.has(a.id)).slice(0, 2);
  return { results, understood, weak: !results.length, relatedTerms };
}

/** Sayings a concept must never surface, whatever else they match. */
function byConceptAvoid(index: Indexed[], conceptId: string): string[] {
  return index.filter((i) => i.r.semantik?.bukan.includes(conceptId)).map((i) => i.r.id);
}

export { CONCEPT_BY_ID };

export const POPULAR_KEYWORDS = ['Air', 'Ayam', 'Padi', 'Harimau', 'Ular', 'Ilmu', 'Usaha', 'Masa', 'Guru', 'Keluarga', 'Kerjasama', 'Kesabaran'];
