export const KATEGORI = ['Simpulan Bahasa', 'Perumpamaan', 'Pepatah', 'Bidalan', 'Perbilangan'] as const;
export type Kategori = (typeof KATEGORI)[number];

export const THEME_IDS = [
  'ilmu-pendidikan',
  'kerajinan-usaha',
  'kerjasama-perpaduan',
  'persahabatan',
  'keluarga',
  'kepimpinan',
  'kesabaran',
  'kejujuran-amanah',
  'berjimat-cermat',
  'alam-sekitar',
  'masyarakat',
  'kejayaan-kegagalan',
  'sikap-keperibadian',
  'emosi-perasaan',
  'pertuturan',
  'berhati-hati',
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type Imagery = 'haiwan' | 'tumbuhan' | 'alam' | 'makanan' | 'rumah-alatan' | 'anggota-badan';

/**
 * - sumber-dibekalkan: appears in one supplied document only
 * - dirujuk-silang: appears in two or more supplied documents
 * - disahkan-prpm: wording checked against PRPM (Dewan Bahasa dan Pustaka)
 * - perlu-semakan: a reviewer flagged the wording or meaning as doubtful
 */
export type VerificationStatus = 'sumber-dibekalkan' | 'dirujuk-silang' | 'disahkan-prpm' | 'perlu-semakan';

export interface SourceRef {
  id: string;
  /** Meaning as written in that source, when it differs from the primary one. */
  maksud?: string;
  /** Curriculum level, for the SPM list. */
  tingkatan?: string;
  url?: string;
  note?: string;
  /** Page in the supplied PDF where the entry appears. */
  page?: number;
}

export interface ContohAyat {
  text: string;
  /** "disediakan-lestari": written by the LESTARI team, not copied from a source. */
  origin: 'sumber' | 'disediakan-lestari';
}

/** Curated meaning map from data/curated/semantics.json: concept id -> position in that concept's list. */
export interface Semantik {
  utama: Record<string, number>;
  berkaitan: Record<string, number>;
  /** Concepts this saying sounds related to but must never be used for. */
  bukan: string[];
}

export interface Peribahasa {
  id: string;
  peribahasa: string;
  normalizedText: string;
  category: Kategori;
  /** "peraturan": derived by documented rules (sources carry no category); "kurasi": set by hand. */
  categoryBasis: 'peraturan' | 'kurasi';
  maksud: string;
  /** The untouched source text when a spelling correction was applied to `maksud`. */
  maksudAsal?: string;
  contohAyat: ContohAyat[];
  keywords: string[];
  themes: ThemeId[];
  imagery: Imagery[];
  difficulty: 1 | 2 | 3;
  tingkatan: string[];
  commonMistakes: string[];
  usageTip?: string;
  bilaSesuai?: string;
  semantik?: Semantik;
  relatedPeribahasa: string[];
  /** Records that are spelling or wording variants of the same saying. */
  variants: string[];
  sources: SourceRef[];
  sourceUrl?: string;
  verificationStatus: VerificationStatus;
  reviewNotes: string[];
  /** Adult, crude or stereotyping content: searchable, but kept out of games and daily picks. */
  sensitive: boolean;
}

export interface SourceInfo {
  id: string;
  title: string;
  file?: string;
  origin: string;
  kind: 'dibekalkan' | 'rujukan-luar';
}
