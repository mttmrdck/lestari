// Layers 1-3 of Carian Situasi: clean the sentence, keep track of negation, and work out which
// concepts it is really about. Deterministic and local: the same sentence always gives the same
// reading, and every concept found can be traced to a cue in src/content/taxonomy.ts.
import { CONCEPTS, CONCEPT_BY_ID, type SituationConcept } from '../content/taxonomy';
import { normalize, stems } from './text';

// ---------- Layer 1: normalisation ----------

/** Everyday and SMS spellings mapped to standard words, so cues only need one form. */
const INFORMAL: Record<string, string> = {
  tak: 'tidak', x: 'tidak', tk: 'tidak', tdk: 'tidak', tiak: 'tidak', ndak: 'tidak', nda: 'tidak', xnak: 'tidak hendak',
  takde: 'tiada', xde: 'tiada', tade: 'tiada', takda: 'tiada', xda: 'tiada', ta: 'tidak',
  nak: 'hendak', nk: 'hendak', dah: 'sudah', da: 'sudah', udah: 'sudah', je: 'sahaja', jer: 'sahaja', aje: 'sahaja', saja: 'sahaja',
  kat: 'di', sbb: 'sebab', sebabkan: 'kerana', pasal: 'tentang', kwn: 'kawan', member: 'kawan', geng: 'kawan', mamat: 'lelaki',
  org: 'orang', bila: 'apabila', bile: 'apabila', mcm: 'macam', cam: 'macam', camtu: 'begitu', camni: 'begini', tau: 'tahu', taw: 'tahu',
  blh: 'boleh', sgt: 'sangat', dpt: 'dapat', utk: 'untuk', yg: 'yang', dgn: 'dengan', krn: 'kerana', tp: 'tetapi', tapi: 'tetapi',
  lg: 'lagi', lps: 'selepas', lepastu: 'selepas', pastu: 'selepas', bwk: 'bawa', ckp: 'cakap', keje: 'kerja', kerje: 'kerja', byk: 'banyak',
  skit: 'sedikit', sikit: 'sedikit', tgk: 'lihat', tengok: 'lihat', aku: 'saya', gua: 'saya', ko: 'kamu', kau: 'kamu', engkau: 'kamu', hang: 'kamu',
  korang: 'kamu', kitorang: 'kami', kiteorang: 'kami', diorang: 'mereka', dorang: 'mereka', depa: 'mereka', dia: 'dia', ni: 'ini', tu: 'itu',
  mak: 'ibu', emak: 'ibu', abah: 'ayah', bapak: 'ayah', cikgu: 'guru', boss: 'ketua', bos: 'ketua', exam: 'peperiksaan', study: 'belajar',
  duit: 'wang', ringgit: 'wang', rm: 'wang', bestfriend: 'kawan baik', bff: 'kawan baik', bestie: 'kawan baik', asyik: 'selalu', asik: 'selalu',
  ajer: 'sahaja', lak: 'pula', plak: 'pula', jgn: 'jangan', sy: 'saya', kt: 'di', bg: 'beri', pun: 'pun', mmg: 'memang', btul: 'betul', gaduh: 'bergaduh',
  sesapa: 'sesiapa', sape: 'siapa', sapa: 'siapa', apsal: 'kenapa', tolak: 'tolak', susah2: 'susah-susah', baru2: 'baru-baru',
};

/** Standard words the cues expect. Reduplication typed as "kawan2" becomes "kawan-kawan". */
export function standardise(input: string): string[] {
  const base = normalize(input).replace(/([\p{L}]{2,})2(?=\s|$)/gu, '$1-$1');
  return base.split(' ').filter(Boolean).flatMap((t) => (INFORMAL[t] ?? t).split(' '));
}

const NEGATORS = new Set(['tidak', 'bukan', 'tiada', 'belum', 'tanpa', 'jangan', 'enggan', 'kurang', 'gagal']);
// Words allowed between a negator and what it negates: "tidak pernah sombong", "tidak mudah putus asa".
const BRIDGE = new Set(['pernah', 'mudah', 'mahu', 'hendak', 'suka', 'lagi', 'begitu', 'terlalu', 'langsung', 'sekali', 'pun', 'sudi', 'ingin', 'dapat', 'boleh', 'siapa', 'akan', 'juga', 'sesekali', 'sama', 'cuba', 'seorang', 'ada', 'sangat', 'berapa', 'mampu', 'berani', 'mengharapkan', 'harapkan', 'mengharap', 'meminta']);

export interface Token { t: string; lemmas: Set<string>; negated: boolean }

/** A word plus the roots it could come from: berusaha, usahanya and diusahakan all contain "usaha". */
export function lemmasOf(word: string): Set<string> {
  const s = new Set<string>([word]);
  for (const x of stems(word)) if (x.length >= 3) s.add(x);
  return s;
}

export function analyse(input: string): Token[] {
  const words = standardise(input);
  return words.map((t, i) => {
    let negated = false;
    for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
      if (NEGATORS.has(words[j])) { negated = true; break; }
      if (!BRIDGE.has(words[j])) break;
    }
    return { t, lemmas: lemmasOf(t), negated };
  });
}

// ---------- Layer 2: cue matching ----------

interface Term { words: string[]; negated: boolean; exact: boolean }
interface Rule { weight: number; groups: Term[][]; none: Term[] }

function parseTerm(raw: string): Term {
  let s = raw.trim();
  const negated = s.startsWith('~');
  if (negated) s = s.slice(1);
  const exact = s.startsWith('=');
  if (exact) s = s.slice(1);
  return { words: s.split(/\s+/), negated, exact };
}

function parseRule(cue: string): Rule {
  const m = /^(\d):(.*)$/.exec(cue);
  const [body, noneRaw] = (m ? m[2] : cue).split('!');
  const toTerms = (part: string) => part.split('|').map((x) => x.trim()).filter(Boolean).map(parseTerm);
  return { weight: m ? Number(m[1]) : 2, groups: body.split('+').map(toTerms), none: noneRaw ? toTerms(noneRaw) : [] };
}

const COMPILED = new Map(CONCEPTS.map((c) => [c.id, c.cues.map(parseRule)]));

/** Finds a term in the sentence and returns the matched surface words. */
function findTerm(term: Term, tokens: Token[]): string | null {
  const n = term.words.length;
  for (let i = 0; i + n <= tokens.length; i++) {
    let ok = true;
    for (let k = 0; k < n; k++) {
      const tok = tokens[i + k];
      const w = term.words[k];
      if (term.exact ? tok.t !== w : !tok.lemmas.has(w) && !(tok.t === w)) { ok = false; break; }
    }
    if (!ok) continue;
    // A phrase is negated by what precedes its first word.
    if (tokens[i].negated !== term.negated) continue;
    return tokens.slice(i, i + n).map((x) => x.t).join(' ');
  }
  return null;
}

export interface ConceptHit { concept: SituationConcept; score: number; matched: string[] }

/** Layer 3: every concept the sentence supports, strongest first, after narrower readings override broader ones. */
export function detectConcepts(input: string): ConceptHit[] {
  const tokens = analyse(input);
  const hits: ConceptHit[] = [];
  for (const concept of CONCEPTS) {
    let score = 0;
    const matched = new Set<string>();
    for (const rule of COMPILED.get(concept.id)!) {
      if (rule.none.some((term) => findTerm(term, tokens))) continue;
      const found = rule.groups.map((g) => g.map((term) => findTerm(term, tokens)).find(Boolean));
      if (found.some((x) => !x)) continue;
      score += rule.weight;
      for (const f of found) matched.add(f!);
    }
    if (score >= 2) hits.push({ concept, score, matched: [...matched] });
  }
  const active = new Set(hits.map((h) => h.concept.id));
  const beaten = new Set<string>();
  for (const h of hits) for (const o of h.concept.overrides ?? []) if (active.has(o)) beaten.add(o);
  return hits.filter((h) => !beaten.has(h.concept.id)).sort((a, b) => b.score - a.score || a.concept.id.localeCompare(b.concept.id));
}

export { CONCEPT_BY_ID };
