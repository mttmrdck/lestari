/**
 * Stage 2 of the data pipeline: build the canonical knowledge base.
 *
 *   data/sources/raw/*.txt  +  data/curated/*.json  ->  src/data/peribahasa.json
 *                                                     src/data/sources.json
 *                                                     docs/data-quality-report.md
 *
 * Safe to rerun: output depends only on the inputs. Run with `npm run data:import`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalize, slugify, tokenize, contentTokens, stems, similarity } from '../src/lib/text';
import { validateRecords } from '../src/lib/validate';
import type { Kategori, Peribahasa, SourceInfo, ThemeId, Imagery, SourceRef } from '../src/types/peribahasa';

const ROOT = join(import.meta.dirname, '..');
const raw = (id: string) => readFileSync(join(ROOT, 'data/sources/raw', `${id}.txt`), 'utf8');
const curated = <T>(name: string, fallback: T): T => {
  const p = join(ROOT, 'data/curated', name);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback;
};

export const SOURCES: SourceInfo[] = [
  { id: 'kompilasi-320', title: 'Kompilasi Lengkap Peribahasa Melayu', file: '320 peribahasa.docx', origin: 'Dokumen dibekalkan; kompilasi daripada beberapa rujukan, disusun mengikut abjad', kind: 'dibekalkan' },
  { id: 'kamus-peribahasa-pdf', title: 'Senarai Peribahasa – Kamus Peribahasa Melayu dan Maksud', file: 'Senarai Peribahasa – Kamus Peribahasa Melayu dan Maksud.pdf', origin: 'Dokumen dibekalkan; tertera hak cipta senaraiperibahasa.com', kind: 'dibekalkan' },
  { id: 'senarai-spm', title: 'Senarai Peribahasa SPM (Tingkatan 1 hingga 5)', file: 'Senarai_Peribahasa_SPM.docx', origin: 'Dokumen dibekalkan; disusun mengikut tingkatan', kind: 'dibekalkan' },
  { id: 'senarai-t1-t3', title: 'Senarai Peribahasa (Tingkatan 1 hingga Tingkatan 3)', file: 'pdf-senarai-peribahasa.docx', origin: 'Dokumen dibekalkan; contoh daripada buku teks Tingkatan 1 hingga 3', kind: 'dibekalkan' },
  { id: 'seratus-peribahasa', title: '100 Peribahasa Melayu dan Ertinya', file: 'pdf-100-peribahasa-melayu-dan-maknanya.docx', origin: 'Dokumen dibekalkan', kind: 'dibekalkan' },
  { id: 'prpm', title: 'Pusat Rujukan Persuratan Melayu (PRPM), Dewan Bahasa dan Pustaka', origin: 'https://prpm.dbp.gov.my — petikan Kamus Dewan Edisi Keempat dan data peribahasa PRPM', kind: 'rujukan-luar' },
];

interface Row { peribahasa: string; maksud: string; source: string; tingkatan?: string }

// ---------- Parsing ----------

function parseTable(id: string): Row[] {
  const rows: Row[] = [];
  let tingkatan: string | undefined;
  for (const line of raw(id).split('\n')) {
    const level = /^TINGKATAN\s+(.+)$/i.exec(line.trim());
    if (level) { tingkatan = `Tingkatan ${level[1].trim()}`; continue; }
    if (!line.includes('\t')) continue;
    const [p, m] = line.split('\t').map((s) => s.trim());
    if (!p || !m || /^peribahasa$/i.test(p)) continue;
    rows.push({ peribahasa: p, maksud: m, source: id, tingkatan });
  }
  return rows;
}

function parsePairs(id: string): Row[] {
  const lines = raw(id).split('\n').map((s) => s.trim()).filter(Boolean).slice(1);
  const rows: Row[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) rows.push({ peribahasa: lines[i], maksud: lines[i + 1], source: id });
  return rows;
}

const primary = parseTable('kompilasi-320');
const spm = parseTable('senarai-spm');
const seratus = parsePairs('seratus-peribahasa');
// Free-text sources: used to confirm presence only.
const presenceText: Record<string, string> = {
  'kamus-peribahasa-pdf': ' ' + normalize(raw('kamus-peribahasa-pdf').replace(/\n/g, ' ')) + ' ',
  'senarai-t1-t3': ' ' + normalize(raw('senarai-t1-t3').replace(/[　-鿿＀-￯]/g, ' ').replace(/\n/g, ' ')) + ' ',
};

// ---------- Curated layer ----------

interface Enrichment {
  category?: Kategori;
  themes?: ThemeId[];
  contohAyat?: string[];
  usageTip?: string;
  bilaSesuai?: string;
  commonMistakes?: string[];
  related?: string[];
}
interface Review {
  sensitive: string[];
  flags: Record<string, string>;
  corrections: [string, string][];
  /** exact: PRPM shows this exact wording; otherwise the evidence is attached as a note only. */
  prpm: Record<string, { url: string; note: string; exact: boolean }>;
  notVariants: [string, string][];
  forceVariants: [string, string][];
}
interface Additional { peribahasa: string; maksud: string; url: string; note: string; category?: Kategori }

const enrichment = curated<Record<string, Enrichment>>('enrichment.json', {});
const review = curated<Review>('review.json', { sensitive: [], flags: {}, corrections: [], prpm: {}, notVariants: [], forceVariants: [] });
const additional = curated<Additional[]>('additional.json', []);
// PDF rows the compilation left out, transcribed from data/sources/raw/kamus-peribahasa-pdf.txt.
const pdfExtra = curated<{ peribahasa: string; maksud: string }[]>('pdf-extra.json', []).map(
  (r): Row => ({ ...r, source: 'kamus-peribahasa-pdf' }),
);

// ---------- Derivation rules ----------

const SIMILE = new Set(['bagai', 'bagaikan', 'seperti', 'umpama', 'ibarat', 'laksana', 'macam', 'bak', 'sebagai', 'seumpama']);
const ADVICE_START = /^(jangan|biar|biarlah|alang-alang|sediakan|ukur|mengukur|melentur|baik|kalau takut|tidak dapat dibaiki|sepuluh kali|hendak|malu bertanya|berani kerana|di mana bumi|ingat)/;

export function deriveCategory(text: string): Kategori {
  const n = normalize(text);
  const words = n.split(' ');
  if (words.some((w) => SIMILE.has(w))) return 'Perumpamaan';
  if (!text.includes(',') && words.length <= 3) return 'Simpulan Bahasa';
  if (ADVICE_START.test(n) || words.includes('jangan')) return 'Bidalan';
  return 'Pepatah';
}

const THEME_LEXICON: Record<ThemeId, string[]> = {
  'ilmu-pendidikan': ['ilmu', 'belajar', 'pelajaran', 'pandai', 'bodoh', 'cerdik', 'bijak', 'bijaksana', 'pengetahuan', 'didik', 'didikan', 'ajar', 'guru', 'murid', 'faham', 'fikir', 'fikiran', 'akal', 'berilmu', 'nasihat', 'pengalaman', 'baca', 'buku', 'pengajaran', 'pintar', 'cerdas'],
  'kerajinan-usaha': ['rajin', 'usaha', 'malas', 'kerja', 'pekerjaan', 'gigih', 'sungguh', 'tekun', 'ikhtiar', 'tenaga', 'cuba', 'daya', 'azam', 'cekap', 'tangkas'],
  'kerjasama-perpaduan': ['satu', 'bersatu', 'kerjasama', 'muafakat', 'sepakat', 'tolong', 'bantu', 'perpaduan', 'pecah', 'berpecah', 'persatuan', 'bersama-sama', 'tolong-menolong', 'bantu-membantu', 'bertolong-tolongan'],
  persahabatan: ['sahabat', 'persahabatan', 'kawan', 'rakan', 'teman', 'gaul', 'pergaulan', 'erat', 'karib', 'mesra'],
  keluarga: ['anak', 'ibu', 'bapa', 'keluarga', 'saudara', 'adik', 'kakak', 'suami', 'isteri', 'keturunan', 'menantu', 'kekeluargaan', 'emak', 'ayah', 'adik-beradik', 'perempuan', 'pengantin', 'kahwin'],
  kepimpinan: ['pemimpin', 'ketua', 'raja', 'kuasa', 'berkuasa', 'kekuasaan', 'pemerintahan', 'rakyat', 'berpangkat', 'pangkat', 'kedudukan', 'darjat', 'nakhoda', 'organisasi', 'diketuai', 'perintah', 'taraf'],
  kesabaran: ['sabar', 'tabah', 'putus', 'tunggu', 'menunggu', 'gopoh', 'tergesa-gesa', 'lambat', 'tenang', 'beransur'],
  'kejujuran-amanah': ['jujur', 'amanah', 'khianat', 'janji', 'tipu', 'bohong', 'dusta', 'percaya', 'kepercayaan', 'benar', 'kebenaran', 'rahsia', 'pura', 'berpura-pura', 'tersembunyi', 'mungkir', 'rasuah', 'muslihat', 'niat', 'mengaku'],
  'berjimat-cermat': ['wang', 'belanja', 'perbelanjaan', 'jimat', 'hutang', 'pinjam', 'kedekut', 'bakhil', 'miskin', 'kaya', 'harta', 'rezeki', 'pendapatan', 'modal', 'harga', 'mahal', 'murah', 'duit', 'simpan'],
  'alam-sekitar': [],
  masyarakat: ['masyarakat', 'adat', 'negeri', 'budaya', 'resam', 'bangsa', 'kampung', 'negara', 'tanah', 'maruah', 'ramai', 'jiran', 'zaman', 'asal'],
  'kejayaan-kegagalan': ['berjaya', 'kejayaan', 'gagal', 'kegagalan', 'hasil', 'matlamat', 'capai', 'tercapai', 'untung', 'keuntungan', 'nasib', 'malang', 'peluang', 'menang', 'kalah', 'rugi', 'kerugian', 'akibat', 'kecelakaan'],
  'sikap-keperibadian': ['sombong', 'bongkak', 'angkuh', 'rendah', 'marah', 'degil', 'berani', 'pengecut', 'penakut', 'sifat', 'perangai', 'kelakuan', 'sikap', 'tamak', 'dengki', 'megah', 'pemurah', 'lupa', 'jahat', 'baik', 'budi', 'kejahatan', 'kebaikan', 'peribadi'],
  'emosi-perasaan': ['sedih', 'gembira', 'kecewa', 'perasaan', 'takut', 'rindu', 'bimbang', 'gelisah', 'malu', 'kasih', 'sayang', 'cinta', 'bangga', 'hiba', 'terluka', 'gugup', 'menyesal', 'suka', 'benci'],
  pertuturan: ['cakap', 'bercakap', 'percakapan', 'kata', 'kata-kata', 'mulut', 'lidah', 'berita', 'khabar', 'cerita', 'teguran', 'bising', 'pendiam', 'tutur'],
  'berhati-hati': ['hati-hati', 'berhati-hati', 'bahaya', 'risiko', 'teliti', 'waspada', 'persediaan', 'bersedia', 'cermat', 'merbahaya'],
};
const THEME_STEMS = Object.fromEntries(
  Object.entries(THEME_LEXICON).map(([k, words]) => [k, new Set(words)]),
) as Record<ThemeId, Set<string>>;

const IMAGERY_LEXICON: Record<Imagery, string[]> = {
  haiwan: ['ayam', 'itik', 'kucing', 'anjing', 'harimau', 'gajah', 'kerbau', 'lembu', 'kambing', 'ular', 'katak', 'ikan', 'udang', 'burung', 'murai', 'gagak', 'enggang', 'pipit', 'pelanduk', 'kancil', 'kera', 'monyet', 'tikus', 'cacing', 'semut', 'lintah', 'lipas', 'ketam', 'buaya', 'rusa', 'belut', 'naga', 'helang', 'merak', 'merpati', 'pungguk', 'tupai', 'kuman', 'agas', 'langau', 'pacat', 'musang', 'babi', 'kutu', 'cicak', 'tungau', 'belalang', 'kumbang', 'yu', 'biawak', 'tempua', 'kuda', 'garuda', 'sapi', 'lebah', 'kerang', 'ubur-ubur', 'nyamuk', 'pikat'],
  tumbuhan: ['padi', 'lalang', 'buluh', 'rebung', 'aur', 'enau', 'pinang', 'durian', 'mentimun', 'entimun', 'timun', 'nangka', 'cempedak', 'ubi', 'keladi', 'kelapa', 'labu', 'bunga', 'rotan', 'ruyung', 'jagung', 'bacang', 'embacang', 'manggis', 'limau', 'sirih', 'pisang', 'nipah', 'kayu', 'akar', 'rumput', 'cendawan', 'daun', 'pokok', 'jering', 'kacang', 'talas', 'kapas', 'sabut', 'betung', 'kaduk', 'umbut', 'pucuk', 'ranting', 'buah', 'rengas', 'dahan', 'pelepah', 'jerangau', 'belukar'],
  alam: ['air', 'hujan', 'sungai', 'laut', 'lautan', 'ombak', 'gunung', 'bukit', 'bulan', 'bintang', 'matahari', 'angin', 'api', 'embun', 'batu', 'tanah', 'pasir', 'langit', 'guruh', 'panas', 'lurah', 'pantai', 'pulau', 'telaga', 'kemarau', 'musim', 'gelombang', 'arang', 'asap', 'hutan', 'padang', 'bumi', 'fajar', 'paya', 'tebing', 'pancuran', 'daratan', 'bara'],
  makanan: ['nasi', 'gulai', 'garam', 'asam', 'gula', 'kuih', 'bubur', 'sambal', 'lada', 'minyak', 'madu', 'susu', 'pekasam', 'telur', 'kerak', 'lauk', 'sagu', 'kuah', 'arak', 'tuba', 'sekam', 'ampas', 'pati'],
  'rumah-alatan': ['periuk', 'tangga', 'pagar', 'tempurung', 'acuan', 'kain', 'baju', 'payung', 'perahu', 'sampan', 'kapal', 'cincin', 'permata', 'dakwat', 'kertas', 'pelita', 'bantal', 'sangkar', 'gergaji', 'pahat', 'penukul', 'dulang', 'tempayan', 'tikar', 'layang-layang', 'wau', 'jarum', 'tongkat', 'timba', 'perigi', 'beliung', 'kapak', 'parang', 'gantang', 'nyiru', 'alu', 'cawan', 'mangkuk', 'biduk', 'rumah', 'kandang', 'tali', 'kemudi', 'haluan', 'cangkul', 'sutera', 'benang', 'jerat', 'gelegar', 'rasuk', 'pembetung', 'emas', 'intan', 'berlian', 'kaca', 'cermin', 'bendul', 'kandar', 'pajak', 'kartu'],
  'anggota-badan': ['tangan', 'kaki', 'kepala', 'mata', 'mulut', 'hati', 'telinga', 'hidung', 'perut', 'muka', 'lidah', 'tulang', 'dada', 'darah', 'bahu', 'jari', 'rambut', 'kuku', 'daging', 'lengan', 'pinggang', 'rusuk', 'otak', 'gigi', 'jantung', 'peluh', 'keringat', 'kulit', 'pipi', 'badan', 'leher', 'riba', 'ketiak', 'tapak'],
};

function deriveThemes(peribahasa: string, maksud: string, imagery: Imagery[]): ThemeId[] {
  const words = new Set<string>();
  for (const t of tokenize(maksud)) for (const s of stems(t)) words.add(s);
  const n = ' ' + normalize(maksud) + ' ';
  const scores: [ThemeId, number][] = [];
  for (const [theme, lex] of Object.entries(THEME_STEMS) as [ThemeId, Set<string>][]) {
    let score = 0;
    for (const w of lex) {
      if (w.includes(' ') || w.includes('-') ? n.includes(' ' + w + ' ') : words.has(w)) score++;
    }
    if (score) scores.push([theme, score]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  const themes = scores.slice(0, 3).map(([t]) => t);
  // Alam sekitar is a discovery theme for sayings built on nature imagery.
  if (imagery.includes('alam') || imagery.includes('tumbuhan')) themes.push('alam-sekitar');
  if (!themes.length) themes.push('sikap-keperibadian');
  void peribahasa;
  return themes;
}

function deriveImagery(peribahasa: string): Imagery[] {
  const tokens = new Set<string>();
  for (const t of tokenize(peribahasa)) for (const s of stems(t)) tokens.add(s);
  return (Object.entries(IMAGERY_LEXICON) as [Imagery, string[]][])
    .filter(([, words]) => words.some((w) => tokens.has(w)))
    .map(([k]) => k);
}

function deriveKeywords(peribahasa: string, maksud: string): string[] {
  const kw = new Set<string>();
  for (const t of contentTokens(peribahasa)) kw.add(t);
  for (const t of contentTokens(maksud)) if (t.length > 3) kw.add(t);
  return [...kw];
}

function correctMaksud(maksud: string): { text: string; changed: boolean } {
  let text = maksud.trim();
  for (const [from, to] of review.corrections) text = text.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  text = text.replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1');
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?)]$/.test(text)) text += '.';
  const changed = normalize(text) !== normalize(maksud);
  return { text, changed };
}

// ---------- Build ----------

const records = new Map<string, Peribahasa>();
const stats = { primaryRows: primary.length, duplicatesExact: [] as string[], mergedFromLists: [] as string[], addedFromLists: [] as string[], corrected: [] as string[] };

function makeRecord(row: Row, sourceRefs: SourceRef[]): Peribahasa {
  const id = slugify(row.peribahasa);
  const { text: maksud, changed } = correctMaksud(row.maksud);
  if (changed) stats.corrected.push(id);
  const imagery = deriveImagery(row.peribahasa);
  return {
    id,
    peribahasa: row.peribahasa.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim(),
    normalizedText: normalize(row.peribahasa),
    category: deriveCategory(row.peribahasa),
    categoryBasis: 'peraturan',
    maksud,
    ...(changed ? { maksudAsal: row.maksud.trim() } : {}),
    contohAyat: [],
    keywords: deriveKeywords(row.peribahasa, maksud),
    themes: deriveThemes(row.peribahasa, maksud, imagery),
    imagery,
    difficulty: 2,
    tingkatan: [],
    commonMistakes: [],
    relatedPeribahasa: [],
    variants: [],
    sources: sourceRefs,
    verificationStatus: 'sumber-dibekalkan',
    reviewNotes: [],
    sensitive: false,
  };
}

for (const row of primary) {
  const id = slugify(row.peribahasa);
  if (records.has(id)) { stats.duplicatesExact.push(id); continue; }
  records.set(id, makeRecord(row, [{ id: 'kompilasi-320' }]));
}

const SIMILE_PREFIX = /^(bagai|bagaikan|seperti|umpama|ibarat|laksana|macam|sebagai) /;

/** Find the existing record for a row from another list: exact id first, then close spelling. */
function findMatch(text: string): Peribahasa | undefined {
  const id = slugify(text);
  if (records.has(id)) return records.get(id);
  let best: Peribahasa | undefined;
  let bestScore = 0;
  const coreText = normalize(text).replace(SIMILE_PREFIX, '');
  for (const r of records.values()) {
    const s = Math.max(similarity(r.peribahasa, text), similarity(r.normalizedText.replace(SIMILE_PREFIX, ''), coreText));
    if (s > bestScore) { bestScore = s; best = r; }
  }
  return bestScore >= 0.88 ? best : undefined;
}

for (const row of [...spm, ...seratus, ...pdfExtra]) {
  const match = findMatch(row.peribahasa);
  const ref: SourceRef = { id: row.source, ...(row.tingkatan ? { tingkatan: row.tingkatan } : {}) };
  if (match) {
    if (normalize(match.maksud) !== normalize(row.maksud)) ref.maksud = correctMaksud(row.maksud).text;
    if (slugify(row.peribahasa) !== match.id) ref.note = `Ditulis sebagai “${row.peribahasa.replace(/\.$/, '')}”`;
    if (!match.sources.some((s) => s.id === row.source)) match.sources.push(ref);
    if (row.tingkatan && !match.tingkatan.includes(row.tingkatan)) match.tingkatan.push(row.tingkatan);
    stats.mergedFromLists.push(match.id);
  } else {
    const rec = makeRecord(row, [ref]);
    if (row.tingkatan) rec.tingkatan.push(row.tingkatan);
    records.set(rec.id, rec);
    stats.addedFromLists.push(rec.id);
  }
}

// A short saying inside a longer one ("ringan tulang" in "ringan tulang berat perut") is not evidence.
const allTexts = [...records.values()].map((r) => r.normalizedText);
function presentIn(text: string, needle: string): boolean {
  const longer = allTexts.filter((t) => t !== needle && t.startsWith(needle + ' '));
  for (let at = text.indexOf(' ' + needle + ' '); at >= 0; at = text.indexOf(' ' + needle + ' ', at + 1)) {
    if (!longer.some((l) => text.startsWith(' ' + l + ' ', at))) return true;
  }
  return false;
}
// The PDF repeats a "PERIBAHASA MAKSUD" header at the top of each page; use it to record source pages.
const pdfPages = raw('kamus-peribahasa-pdf').split(/^PERIBAHASA MAKSUD\s*$/m).map((t) => ' ' + normalize(t.replace(/\n/g, ' ')) + ' ');
for (const r of records.values()) {
  for (const [sid, text] of Object.entries(presenceText)) {
    if (!r.sources.some((s) => s.id === sid) && presentIn(text, r.normalizedText)) r.sources.push({ id: sid });
  }
  const pdfRef = r.sources.find((s) => s.id === 'kamus-peribahasa-pdf');
  if (pdfRef) {
    const page = pdfPages.findIndex((t) => presentIn(t, r.normalizedText));
    if (page >= 1) pdfRef.page = page; // chunk 0 is the title before the first page header
  }
}

// PRPM-verified additions
const addedPrpm: string[] = [];
for (const a of additional) {
  const id = slugify(a.peribahasa);
  if (records.has(id)) throw new Error(`Additional entry already exists: ${id}`);
  const rec = makeRecord({ peribahasa: a.peribahasa, maksud: a.maksud, source: 'prpm' }, [{ id: 'prpm', url: a.url, note: a.note }]);
  rec.sourceUrl = a.url;
  rec.verificationStatus = 'disahkan-prpm';
  if (a.category) { rec.category = a.category; rec.categoryBasis = 'kurasi'; }
  records.set(id, rec);
  addedPrpm.push(id);
}

// Variants: same saying written differently (e.g. "Bagai …" vs "Seperti …", typos).
const core = (r: Peribahasa) => r.normalizedText.replace(SIMILE_PREFIX, '');
const list = [...records.values()];
for (let i = 0; i < list.length; i++) {
  for (let j = i + 1; j < list.length; j++) {
    const a = list[i];
    const b = list[j];
    if (a.normalizedText.split(' ').length < 3 && b.normalizedText.split(' ').length < 3) continue;
    const ca = core(a);
    const cb = core(b);
    if (review.notVariants.some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id))) continue;
    if (ca === cb || similarity(ca, cb) >= 0.86 || (ca.length > 18 && (ca.startsWith(cb) || cb.startsWith(ca)))) {
      a.variants.push(b.id);
      b.variants.push(a.id);
    }
  }
}

for (const [x, y] of review.forceVariants) {
  const a = records.get(x);
  const b = records.get(y);
  if (!a || !b) throw new Error(`forceVariants refers to a missing record: ${x} / ${y}`);
  if (!a.variants.includes(y)) a.variants.push(y);
  if (!b.variants.includes(x)) b.variants.push(x);
}

for (const key of [...Object.keys(enrichment), ...review.sensitive, ...Object.keys(review.flags), ...Object.keys(review.prpm)]) {
  if (!key.startsWith('_') && !records.has(key)) throw new Error(`Curated data refers to a missing record: ${key}`);
}

// Curated enrichment, review flags and PRPM cross-checks
for (const r of records.values()) {
  const e = enrichment[r.id];
  if (e) {
    if (e.category) { r.category = e.category; r.categoryBasis = 'kurasi'; }
    if (e.themes) r.themes = [...new Set([...e.themes, ...r.themes])].slice(0, 4);
    if (e.contohAyat) r.contohAyat = e.contohAyat.map((text) => ({ text, origin: 'disediakan-lestari' as const }));
    if (e.usageTip) r.usageTip = e.usageTip;
    if (e.bilaSesuai) r.bilaSesuai = e.bilaSesuai;
    if (e.commonMistakes) r.commonMistakes = e.commonMistakes;
    if (e.related) r.relatedPeribahasa = e.related;
  }
  if (review.sensitive.includes(r.id)) r.sensitive = true;
  const p = review.prpm[r.id];
  if (p && r.verificationStatus !== 'disahkan-prpm') {
    r.sources.push({ id: 'prpm', url: p.url, note: p.note });
    r.sourceUrl = p.url;
    if (p.exact) r.verificationStatus = 'disahkan-prpm';
  }
  if (r.verificationStatus === 'sumber-dibekalkan' && new Set(r.sources.map((s) => s.id)).size >= 2) {
    r.verificationStatus = 'dirujuk-silang';
  }
  if (review.flags[r.id]) { r.reviewNotes.push(review.flags[r.id]); r.verificationStatus = 'perlu-semakan'; }
  if (r.maksud.length < 12) r.reviewNotes.push('Maksud dalam sumber sangat ringkas.');

  // Difficulty: curriculum level when known, otherwise length and category.
  const words = r.normalizedText.split(' ').length;
  const t = r.tingkatan.join(' ');
  r.difficulty = /Tingkatan 1\b/.test(t) ? 1 : /Tingkatan [23]\b/.test(t) ? 2 : /Tingkatan 4/.test(t) ? 3
    : r.category === 'Simpulan Bahasa' ? 1 : words <= 5 ? 2 : 3;
}

// Related sayings: curated first, then variants, then sayings sharing the main theme and meaning words.
for (const r of records.values()) {
  if (r.relatedPeribahasa.length >= 3) continue;
  const mine = new Set(contentTokens(r.maksud).flatMap(stems).filter((s) => s.length > 3));
  const scored: [string, number][] = [];
  for (const o of records.values()) {
    if (o.id === r.id || o.sensitive || r.variants.includes(o.id)) continue;
    let overlap = 0;
    for (const s of new Set(contentTokens(o.maksud).flatMap(stems))) if (mine.has(s)) overlap++;
    const themeBonus = o.themes[0] === r.themes[0] ? 0.5 : 0;
    if (overlap >= 2) scored.push([o.id, overlap + themeBonus]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  for (const [id] of scored) {
    if (r.relatedPeribahasa.length >= 3) break;
    if (!r.relatedPeribahasa.includes(id)) r.relatedPeribahasa.push(id);
  }
}

const out = [...records.values()].sort((a, b) => a.normalizedText.localeCompare(b.normalizedText, 'ms'));
const issues = validateRecords(out);
const errors = issues.filter((i) => i.level === 'error');

writeFileSync(join(ROOT, 'src/data/peribahasa.json'), JSON.stringify(out));
writeFileSync(join(ROOT, 'src/data/sources.json'), JSON.stringify(SOURCES, null, 2));

// ---------- Report ----------

const count = <T>(xs: T[], f: (x: T) => string) => xs.reduce<Record<string, number>>((acc, x) => ((acc[f(x)] = (acc[f(x)] ?? 0) + 1), acc), {});
const byCat = count(out, (r) => r.category);
const byStatus = count(out, (r) => r.verificationStatus);
const variantGroups = out.filter((r) => r.variants.length).length;
const fromPrimary = out.filter((r) => r.sources.some((s) => s.id === 'kompilasi-320')).length;
const flagged = out.filter((r) => r.verificationStatus === 'perlu-semakan');
const missingMaksud = out.filter((r) => !r.maksud.trim()).length;

const report = `# Laporan Kualiti Data / Data Quality Report

Generated by \`npm run data:import\`. Do not edit by hand; edit the curated files in \`data/curated/\` and rerun.

## Summary

| Measure | Count |
|---|---|
| Rows detected in the primary source (\`320 peribahasa.docx\`) | ${stats.primaryRows} |
| Rows extracted successfully from the primary source | ${stats.primaryRows - stats.duplicatesExact.length} unique (+${stats.duplicatesExact.length} exact duplicates) |
| Exact duplicate rows in the primary source | ${stats.duplicatesExact.length}${stats.duplicatesExact.length ? ` (${stats.duplicatesExact.join(', ')})` : ''} |
| Rows in the SPM list | ${spm.length} |
| Rows in the "100 peribahasa" list | ${seratus.length} |
| PDF rows missing from the compilation (transcribed in \`data/curated/pdf-extra.json\`) | ${pdfExtra.length} |
| List rows matched to an existing record | ${stats.mergedFromLists.length} |
| Records added from the supplied lists (not in the primary source) | ${stats.addedFromLists.length} |
| **Records from supplied documents** | **${out.length - addedPrpm.length}** |
| Additional records verified against PRPM (DBP) | ${addedPrpm.length} |
| **Records imported into the application** | **${out.length}** |
| Records in a variant group (same saying, different wording) | ${variantGroups} |
| Records requiring manual verification (\`perlu-semakan\`) | ${flagged.length} |
| Records with a missing meaning | ${missingMaksud} |
| Records with a missing category in the source | ${out.length - addedPrpm.length} (no supplied source carries categories; see below) |
| Meanings with a spelling fix applied (original kept in \`maksudAsal\`) | ${stats.corrected.length} |
| Records marked sensitive (kept out of games) | ${out.filter((r) => r.sensitive).length} |
| Records with a LESTARI-written example sentence | ${out.filter((r) => r.contohAyat.length).length} |
| Validation errors | ${errors.length} |
| Validation warnings | ${issues.length - errors.length} |

The file named "320 peribahasa" actually contains ${stats.primaryRows} rows. All of them are accounted for above.
Records present in the primary source: ${fromPrimary}.

## Verification status

${Object.entries(byStatus).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}

- \`sumber-dibekalkan\`: found in one supplied document.
- \`dirujuk-silang\`: found in two or more supplied documents (the documents are internet compilations, so this is consistency, not authority).
- \`disahkan-prpm\`: wording checked against PRPM, Dewan Bahasa dan Pustaka (evidence in \`data/sources/prpm/evidence.json\`).
- \`perlu-semakan\`: flagged by a reviewer; the app shows a notice on these cards.

## Categories

None of the supplied documents gives a category, so categories are **derived by rule** (\`categoryBasis: "peraturan"\`) unless set by hand in \`data/curated/enrichment.json\` (\`"kurasi"\`). The app labels rule-derived categories as estimates.

Rules, in order: a simile word (bagai, seperti, umpama, ibarat, laksana, macam, bak, sebagai) → Perumpamaan; three words or fewer without a comma → Simpulan Bahasa; advice wording (jangan, biar, alang-alang, sediakan …) → Bidalan; otherwise → Pepatah.

${Object.entries(byCat).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
- Set by hand: ${out.filter((r) => r.categoryBasis === 'kurasi').length}

## Records requiring manual verification

${flagged.map((r) => `- **${r.peribahasa}** (\`${r.id}\`): ${r.reviewNotes.join(' ')} Source meaning: “${r.maksud}”`).join('\n') || 'None.'}

## Additional PRPM-verified records

${out.filter((r) => addedPrpm.includes(r.id)).map((r) => `- **${r.peribahasa}**: ${r.maksud} (${r.sourceUrl})`).join('\n') || 'None.'}

## Records added from the supplied lists

${stats.addedFromLists.map((id) => `- ${records.get(id)!.peribahasa} (${records.get(id)!.sources.map((s) => s.id).join(', ')})`).join('\n') || 'None.'}

## Spelling fixes applied to meanings

Corrections list: ${review.corrections.map(([a, b]) => `“${a}” → “${b}”`).join(', ')}. Records affected: ${stats.corrected.length}.

## Validation

${issues.length ? issues.map((i) => `- ${i.level.toUpperCase()} \`${i.id}\`: ${i.message}`).join('\n') : 'All checks passed.'}
`;
writeFileSync(join(ROOT, 'docs/data-quality-report.md'), report);

console.log(`records: ${out.length} (primary rows ${stats.primaryRows}, added from lists ${stats.addedFromLists.length}, PRPM ${addedPrpm.length})`);
console.log(`categories: ${JSON.stringify(byCat)}`);
console.log(`status: ${JSON.stringify(byStatus)}`);
console.log(`issues: ${errors.length} errors, ${issues.length - errors.length} warnings`);
if (errors.length) {
  for (const e of errors.slice(0, 20)) console.error(`ERROR ${e.id}: ${e.message}`);
  process.exit(1);
}
