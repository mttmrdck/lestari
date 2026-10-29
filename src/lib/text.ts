// Text utilities shared by the data importer and the in-app search.
// Everything here is deterministic and dependency-free so search results are reproducible.

/** Lowercase, unify quotes and dashes, drop punctuation except in-word hyphens, collapse spaces. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[‘’“”"'`]/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/(^|\s)-+|-+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable record id derived from the saying itself, e.g. "sudah-terantuk-baru-tengadah". */
export function slugify(input: string): string {
  return normalize(input).replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function tokenize(input: string): string[] {
  const n = normalize(input);
  return n ? n.split(' ') : [];
}

// Function words that carry no meaning for matching. Kept short on purpose:
// words like "tidak", "jangan" and "sama" change meaning and must stay searchable.
export const STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'di', 'ke', 'dari', 'daripada', 'pada', 'kepada', 'untuk', 'dengan', 'itu', 'ini',
  'ia', 'dia', 'mereka', 'kita', 'kami', 'saya', 'aku', 'kamu', 'awak', 'adalah', 'ialah', 'iaitu', 'oleh',
  'akan', 'telah', 'sudah', 'sedang', 'masih', 'juga', 'pun', 'lah', 'kah', 'nya', 'se', 'sesuatu', 'seseorang',
  'orang', 'satu', 'sangat', 'amat', 'terlalu', 'lebih', 'paling', 'bagi', 'dalam', 'atas', 'bawah', 'tetapi',
  'tapi', 'namun', 'kerana', 'sebab', 'jika', 'kalau', 'apabila', 'bila', 'ketika', 'semasa', 'supaya', 'agar',
  'hendak', 'mahu', 'ada', 'tiada', 'ingin', 'baru', 'mula', 'lagi', 'semua', 'setiap', 'sendiri', 'tersebut',
  'biasanya', 'selalu', 'secara', 'antara', 'tentang', 'mengenai', 'macam', 'seperti', 'bagai', 'bagaikan',
  'umpama', 'ibarat', 'laksana', 'bak', 'yg', 'dgn', 'tu', 'ni', 'je', 'saja', 'sahaja', 'hanya', 'lain', 'banyak',
  'sedikit', 'perkara', 'hal', 'cara', 'tak', 'tidak', 'jangan', 'bukan',
  'boleh', 'dapat', 'perlu', 'mesti', 'harus', 'patut', 'buat', 'membuat', 'jadi', 'menjadi',
  'selepas', 'setelah', 'sesudah', 'sebelum', 'kemudian', 'lalu', 'terus', 'sentiasa', 'suka', 'kami', 'kita',
]);

/** Minimum length for a stem-only match; shorter roots ("tang", "ang") collide too often. */
export const MIN_STEM_MATCH = 5;

// Words that are function words for indexing but should not be dropped from a typed keyword query.
const QUERY_KEEP = new Set(['tidak', 'jangan', 'sedikit', 'banyak', 'bukan']);

const PARTICLES = ['lah', 'kah', 'tah', 'nya', 'pun'];
const SUFFIXES = ['kan', 'an', 'i'];

/**
 * Light Malay stemmer. Returns every plausible root so that "berusaha", "usahanya" and "diusahakan"
 * all meet at "usaha". Over-generation is fine for recall; ranking handles precision.
 */
export function stems(word: string): string[] {
  const out = new Set<string>([word]);
  const w = word.toLowerCase();
  const bases = new Set<string>([w]);
  for (const p of PARTICLES) if (w.endsWith(p) && w.length - p.length >= 4) bases.add(w.slice(0, -p.length));
  for (const b of [...bases]) {
    for (const s of SUFFIXES) if (b.endsWith(s) && b.length - s.length >= 4) bases.add(b.slice(0, -s.length));
  }
  for (const b of bases) {
    out.add(b);
    for (const root of stripPrefix(b)) if (root.length >= 3) out.add(root);
  }
  // Reduplication: "kawan-kawan" -> "kawan", "sedikit-sedikit" -> "sedikit"
  if (w.includes('-')) for (const part of w.split('-')) if (part.length >= 3) out.add(part);
  return [...out];
}

function stripPrefix(w: string): string[] {
  const r: string[] = [];
  const rules: [string, (rest: string) => string[]][] = [
    ['memper', (s) => [s]],
    ['mempel', (s) => ['l' + s]],
    ['meny', (s) => ['s' + s]],
    ['meng', (s) => [s, 'k' + s]],
    ['mem', (s) => [s, 'p' + s]],
    ['men', (s) => [s, 't' + s]],
    ['me', (s) => [s]],
    ['peny', (s) => ['s' + s]],
    ['peng', (s) => [s, 'k' + s]],
    ['pem', (s) => [s, 'p' + s]],
    ['pen', (s) => [s, 't' + s]],
    ['per', (s) => [s]],
    ['pe', (s) => [s]],
    ['ber', (s) => [s]],
    ['be', (s) => [s]],
    ['ter', (s) => [s]],
    ['di', (s) => [s]],
    ['ke', (s) => [s]],
    ['se', (s) => [s]],
  ];
  for (const [prefix, fn] of rules) {
    if (w.startsWith(prefix) && w.length - prefix.length >= 3) {
      r.push(...fn(w.slice(prefix.length)));
      break;
    }
  }
  // Confixes like ke-...-an / pe-...-an are covered because suffixes were stripped first.
  return r;
}

/** Content tokens of a text (stopwords removed). */
export function contentTokens(input: string, forQuery = false): string[] {
  return tokenize(input).filter((t) => t.length > 1 && (!STOPWORDS.has(t) || (forQuery && QUERY_KEEP.has(t))));
}

/** Levenshtein distance, used for forgiving answers in the daily challenge. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Similarity in [0, 1] based on edit distance of normalised strings. */
export function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  const len = Math.max(x.length, y.length) || 1;
  return 1 - levenshtein(x, y) / len;
}
