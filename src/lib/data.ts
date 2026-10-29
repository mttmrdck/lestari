import raw from '../data/peribahasa.json';
import sources from '../data/sources.json';
import type { Peribahasa, SourceInfo, ThemeId, Kategori, Imagery } from '../types/peribahasa';

export const RECORDS = raw as Peribahasa[];
export const SOURCES = sources as SourceInfo[];
export const BY_ID = new Map(RECORDS.map((r) => [r.id, r]));

export function getRecord(id: string | undefined): Peribahasa | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Records suitable for games, flashcards and the daily pick. */
export const LEARNABLE = RECORDS.filter((r) => !r.sensitive && r.verificationStatus !== 'perlu-semakan');

/** Core curriculum set: in the SPM / textbook lists, verified, or given LESTARI teaching notes. */
export const CORE = LEARNABLE.filter(
  (r) => r.tingkatan.length > 0 || r.contohAyat.length > 0 || r.verificationStatus === 'disahkan-prpm' ||
    r.sources.some((s) => s.id === 'seratus-peribahasa' || s.id === 'senarai-t1-t3'),
);

export const THEMES: Record<ThemeId, { label: string; blurb: string }> = {
  'ilmu-pendidikan': { label: 'Ilmu dan pendidikan', blurb: 'Belajar, berfikir dan menghargai ilmu' },
  'kerajinan-usaha': { label: 'Kerajinan dan usaha', blurb: 'Rajin, gigih dan tidak mudah mengalah' },
  'kerjasama-perpaduan': { label: 'Kerjasama dan perpaduan', blurb: 'Bersatu, bermuafakat dan saling membantu' },
  persahabatan: { label: 'Persahabatan', blurb: 'Kawan, rakan dan hubungan yang erat' },
  keluarga: { label: 'Keluarga', blurb: 'Ibu bapa, anak dan saudara-mara' },
  kepimpinan: { label: 'Kepimpinan', blurb: 'Ketua, kuasa dan tanggungjawab' },
  kesabaran: { label: 'Kesabaran', blurb: 'Tabah, tenang dan tidak gopoh' },
  'kejujuran-amanah': { label: 'Kejujuran dan amanah', blurb: 'Janji, kepercayaan dan niat' },
  'berjimat-cermat': { label: 'Berjimat cermat', blurb: 'Wang, harta dan perbelanjaan' },
  'alam-sekitar': { label: 'Alam sekitar', blurb: 'Peribahasa yang berimejkan alam dan tumbuhan' },
  masyarakat: { label: 'Masyarakat', blurb: 'Adat, budaya dan hidup bermasyarakat' },
  'kejayaan-kegagalan': { label: 'Kejayaan dan kegagalan', blurb: 'Hasil, nasib dan akibat' },
  'sikap-keperibadian': { label: 'Sikap dan keperibadian', blurb: 'Perangai baik dan buruk' },
  'emosi-perasaan': { label: 'Emosi dan perasaan', blurb: 'Sedih, gembira, malu dan kasih' },
  pertuturan: { label: 'Pertuturan', blurb: 'Kata-kata, cakap dan berita' },
  'berhati-hati': { label: 'Berhati-hati', blurb: 'Risiko, bahaya dan persediaan' },
};

export const CATEGORY_INFO: Record<Kategori, { blurb: string }> = {
  'Simpulan Bahasa': { blurb: 'Ungkapan ringkas dua atau tiga perkataan yang membawa makna kiasan.' },
  Perumpamaan: { blurb: 'Perbandingan yang biasanya bermula dengan bagai, seperti, umpama, ibarat atau laksana.' },
  Pepatah: { blurb: 'Susunan kata yang padat, berirama dan membawa pengajaran.' },
  Bidalan: { blurb: 'Peribahasa berbentuk nasihat atau peringatan.' },
  Perbilangan: { blurb: 'Kata-kata adat yang dijadikan pegangan masyarakat.' },
};

export const IMAGERY_LABEL: Record<Imagery, string> = {
  haiwan: 'Haiwan',
  tumbuhan: 'Tumbuhan',
  alam: 'Alam',
  makanan: 'Makanan',
  'rumah-alatan': 'Rumah & alatan',
  'anggota-badan': 'Anggota badan',
};

export const STATUS_INFO: Record<Peribahasa['verificationStatus'], { label: string; tone: 'good' | 'neutral' | 'warn' }> = {
  'disahkan-prpm': { label: 'Disemak dengan PRPM (DBP)', tone: 'good' },
  'dirujuk-silang': { label: 'Terdapat dalam beberapa sumber', tone: 'neutral' },
  'sumber-dibekalkan': { label: 'Daripada satu sumber', tone: 'neutral' },
  'perlu-semakan': { label: 'Perlu semakan guru', tone: 'warn' },
};

export function sourceTitle(id: string): string {
  return SOURCES.find((s) => s.id === id)?.title ?? id;
}

/** Number of records per theme, for browse tiles. */
export const THEME_COUNTS = RECORDS.reduce<Record<string, number>>((acc, r) => {
  for (const t of r.themes) acc[t] = (acc[t] ?? 0) + 1;
  return acc;
}, {});
