import type { Peribahasa, ThemeId } from '../types/peribahasa';
import { CORE } from './data';

// The learning path: units built from the meaning-derived themes, each split into short lessons
// of four sayings. A saying belongs to one lesson only, so progress never double counts.

export type UnitColor = 'green' | 'sky' | 'sun' | 'rose' | 'lavender';

export interface UnitDef {
  id: string;
  title: string;
  blurb: string;
  color: UnitColor;
  /** Sayings qualify when their primary theme is listed (or, for the first unit, their curriculum level). */
  themes: ThemeId[];
  tingkatan1?: boolean;
  /** Hand-checked: sayings that clearly belong here even if their derived theme differs. */
  include?: string[];
  /** Hand-checked: rule-derived matches whose meaning does not fit this unit. */
  exclude?: string[];
}

export interface Lesson {
  id: string;
  unitId: string;
  index: number;
  title: string;
  sayings: Peribahasa[];
}

export interface Unit extends UnitDef {
  lessons: Lesson[];
}

export const UNIT_DEFS: UnitDef[] = [
  { id: 'asas', title: 'Asas Peribahasa', blurb: 'Simpulan bahasa dan peribahasa Tingkatan 1 untuk bermula.', color: 'green', themes: [], tingkatan1: true },
  { id: 'usaha', title: 'Usaha dan Kejayaan', blurb: 'Rajin, gigih dan tidak mudah mengalah.', color: 'sun', themes: ['kerajinan-usaha', 'kejayaan-kegagalan'] },
  { id: 'bijak', title: 'Kebijaksanaan', blurb: 'Ilmu, akal dan belajar daripada pengalaman.', color: 'sky', themes: ['ilmu-pendidikan'], exclude: ['kecil-tapak-tangan-nyiru-ditadahkan'] },
  { id: 'kerjasama', title: 'Kerjasama', blurb: 'Bersatu, bermuafakat dan hidup bermasyarakat.', color: 'rose', themes: ['kerjasama-perpaduan', 'masyarakat'], include: ['muafakat-membawa-berkat-berpecah-membawa-rebah'], exclude: ['seperti-orang-mengantuk-disorongkan-bantal'] },
  { id: 'kasih', title: 'Keluarga dan Persahabatan', blurb: 'Hubungan dengan keluarga dan kawan.', color: 'lavender', themes: ['keluarga', 'persahabatan'] },
  { id: 'sabar', title: 'Kesabaran', blurb: 'Tenang, berhati-hati dan tidak gopoh.', color: 'sky', themes: ['kesabaran', 'berhati-hati'], include: ['genggam-bara-api-biar-sampai-jadi-arang'], exclude: ['tepuk-dada-tanya-selera', 'bagai-itik-pulang-petang', 'bagaikan-pelita-kehabisan-minyak'] },
  { id: 'nilai', title: 'Nilai Murni', blurb: 'Jujur, amanah dan berjimat cermat.', color: 'green', themes: ['kejujuran-amanah', 'berjimat-cermat'], include: ['kerbau-dipegang-pada-talinya-manusia-dipegang-pada-janjinya'], exclude: ['sagu-hati'] },
];

const LESSON_SIZE = 4;
const MAX_LESSONS = 3;
const LESSON_NAMES = ['Kenali', 'Fahami', 'Kuasai'];

function buildUnits(): Unit[] {
  const used = new Set<string>();
  // Prefer sayings with reviewed teaching notes, then shorter, easier ones.
  const ranked = [...CORE].sort((a, b) => (b.contohAyat.length ? 1 : 0) - (a.contohAyat.length ? 1 : 0) || a.difficulty - b.difficulty || a.id.localeCompare(b.id));
  return UNIT_DEFS.map((def) => {
    const included = (def.include ?? []).map((id) => ranked.find((r) => r.id === id)).filter((r): r is Peribahasa => !!r);
    const pool = [...included, ...ranked.filter((r) => !included.includes(r))]
      .filter((r) => !used.has(r.id) && !def.exclude?.includes(r.id))
      .filter((r) => included.includes(r) || (def.tingkatan1 ? r.tingkatan.includes('Tingkatan 1') : def.themes.includes(r.themes[0])))
      // Never put two forms of the same saying in one unit.
      .filter((r, i, arr) => !arr.slice(0, i).some((o) => o.variants.includes(r.id)));
    const take = pool.slice(0, LESSON_SIZE * MAX_LESSONS - ((pool.length >= LESSON_SIZE * MAX_LESSONS) ? 0 : pool.length % LESSON_SIZE));
    take.forEach((r) => used.add(r.id));
    const lessons: Lesson[] = [];
    for (let i = 0; i * LESSON_SIZE < take.length; i++) {
      lessons.push({ id: `${def.id}-${i + 1}`, unitId: def.id, index: i, title: `${LESSON_NAMES[i]} ${def.title.split(' ')[0].toLowerCase()}`, sayings: take.slice(i * LESSON_SIZE, (i + 1) * LESSON_SIZE) });
    }
    return { ...def, lessons };
  }).filter((u) => u.lessons.length > 0);
}

export const UNITS: Unit[] = buildUnits();
export const LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export type NodeState = 'done' | 'current' | 'locked';

/** Lessons unlock in order: the first not-yet-completed lesson is current; everything after is locked. */
export function nodeStates(done: Record<string, unknown>): Map<string, NodeState> {
  const m = new Map<string, NodeState>();
  let foundCurrent = false;
  for (const l of LESSONS) {
    if (done[l.id]) m.set(l.id, 'done');
    else if (!foundCurrent) { m.set(l.id, 'current'); foundCurrent = true; }
    else m.set(l.id, 'locked');
  }
  return m;
}

export function currentLesson(done: Record<string, unknown>): Lesson | null {
  return LESSONS.find((l) => !done[l.id]) ?? null;
}

/** A lesson counts as complete at 60% or better; below that the learner is invited to retry. */
export const PASS_RATIO = 0.6;
