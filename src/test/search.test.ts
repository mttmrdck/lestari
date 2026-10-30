import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RECORDS, BY_ID, THEMES, THEME_COUNTS } from '../lib/data';
import { buildIndex, keywordSearch, situationSearch, suggest, type SemanticReading } from '../lib/search';
import { detectConcepts, standardise } from '../lib/semantic';
import { CONCEPTS, CONCEPT_BY_ID } from '../content/taxonomy';
import { KATEGORI, THEME_IDS, type ThemeId } from '../types/peribahasa';

const index = buildIndex(RECORDS);
const ids = (q: string) => keywordSearch(index, q).map((r) => r.record.id);
const situ = (q: string) => situationSearch(index, q);

describe('keyword search', () => {
  it('finds an exact saying first', () => {
    expect(ids('Harapkan pagar, pagar makan padi')[0]).toBe('harapkan-pagar-pagar-makan-padi');
  });

  it('finds a keyword inside sayings and returns every saying that contains it', () => {
    const results = keywordSearch(index, 'padi');
    const inSaying = results.filter((r) => r.where === 'peribahasa').map((r) => r.record.id);
    const expected = RECORDS.filter((r) => r.normalizedText.split(' ').includes('padi')).map((r) => r.id);
    for (const id of expected) expect(inSaying).toContain(id);
    expect(inSaying).toContain('harapkan-pagar-pagar-makan-padi');
  });

  it('ignores capitalisation and extra spaces', () => {
    expect(ids('  HARIMAU   ')).toEqual(ids('harimau'));
    expect(ids('AyAm').length).toBeGreaterThan(10);
  });

  it('matches word forms through stems', () => {
    // "usaha" should reach sayings whose meaning says "berusaha" or "usaha".
    expect(keywordSearch(index, 'usaha').length).toBeGreaterThan(5);
  });

  it('applies category filters', () => {
    const r = keywordSearch(index, 'air', { category: 'Perumpamaan' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.record.category === 'Perumpamaan')).toBe(true);
  });

  it('returns nothing for gibberish and never invents records', () => {
    expect(keywordSearch(index, 'zxqvbn')).toEqual([]);
    for (const r of keywordSearch(index, 'ular')) expect(BY_ID.get(r.record.id)).toBe(r.record);
  });

  it('suggests sayings while typing a prefix', () => {
    expect(suggest(index, 'bagai ka').map((r) => r.id)).toContain('bagai-kaca-terhempas-ke-batu');
  });
});

describe('theme and category filters', () => {
  const allIds = (theme: ThemeId) => RECORDS.filter((r) => r.themes.includes(theme)).map((r) => r.id).sort();

  it('lists themes and only themes that exist', () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
  });

  it.each(THEME_IDS)('theme %s with no keyword returns exactly its sayings', (theme) => {
    const results = keywordSearch(index, '', { theme }).map((r) => r.record.id).sort();
    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(allIds(theme));
    expect(results.length).toBe(THEME_COUNTS[theme]);
  });

  it.each(KATEGORI)('category %s with no keyword returns exactly its sayings', (category) => {
    const results = keywordSearch(index, '', { category });
    expect(results.length).toBe(RECORDS.filter((r) => r.category === category).length);
    expect(results.length).toBeGreaterThan(0);
  });

  it('treats a space-only query as empty', () => {
    expect(keywordSearch(index, '   ', { theme: 'persahabatan' }).length).toBe(THEME_COUNTS.persahabatan);
  });

  it('clearing the filter restores the unfiltered state', () => {
    expect(keywordSearch(index, '', { theme: 'keluarga' }).length).toBeGreaterThan(0);
    expect(keywordSearch(index, '', {})).toEqual([]);
    expect(keywordSearch(index, 'padi', { theme: null })).toEqual(keywordSearch(index, 'padi'));
  });

  it('keyword plus theme gives the intersection', () => {
    const both = keywordSearch(index, 'air', { theme: 'alam-sekitar' });
    expect(both.length).toBeGreaterThan(0);
    for (const r of both) expect(r.record.themes).toContain('alam-sekitar');
    const plain = new Set(keywordSearch(index, 'air').map((r) => r.record.id));
    for (const r of both) expect(plain.has(r.record.id)).toBe(true);
  });

  it('theme plus category gives the intersection', () => {
    const r = keywordSearch(index, '', { theme: 'keluarga', category: 'Perumpamaan' });
    expect(r.length).toBe(RECORDS.filter((x) => x.themes.includes('keluarga') && x.category === 'Perumpamaan').length);
    expect(r.length).toBeGreaterThan(0);
  });

  it('a combination with genuinely no sayings stays empty', () => {
    expect(keywordSearch(index, 'zxqvbn', { theme: 'keluarga' })).toEqual([]);
  });

  it('lists filter results in a stable order', () => {
    const a = keywordSearch(index, '', { theme: 'kesabaran' }).map((r) => r.record.id);
    const b = keywordSearch(index, '', { theme: 'kesabaran' }).map((r) => r.record.id);
    expect(a).toEqual(b);
  });
});

describe('situation search (local cues only)', () => {
  const top = (q: string) => situ(q).results[0]?.record.id;

  it.each([
    ['Dia hanya datang apabila saya mempunyai wang.', 'lagi-lauk-lagi-nasi'],
    ['Ali baru mula belajar apabila peperiksaan tinggal seminggu.', 'sudah-terantuk-baru-tengadah'],
    ['Dia gagal dua kali tetapi tidak berputus asa dan terus mencuba sehingga berjaya.', 'genggam-bara-api-biar-sampai-jadi-arang'],
    ['Bendahari kelab yang dipercayai telah menyalahgunakan wang yuran ahli.', 'harapkan-pagar-pagar-makan-padi'],
    ['Abang menasihati adik supaya tidak bermain telefon sedangkan dia sendiri selalu bermain.', 'seperti-ketam-mengajar-anak-berjalan-lurus'],
  ])('matches: %s', (q, id) => {
    expect(top(q)).toBe(id);
  });

  it('matches cooperation', () => {
    const res = situ('Semua penduduk kampung bergotong-royong membersihkan surau bersama-sama.');
    expect(res.results.slice(0, 3).map((r) => r.record.id)).toContain('berat-sama-dipikul-ringan-sama-dijinjing');
  });

  it('explains with the shared idea, not by echoing the sentence', () => {
    const q = 'Dia hanya datang apabila saya mempunyai wang.';
    const r = situ(q).results[0];
    expect(r.sebab).toContain('bukan kerana persahabatan yang ikhlas');
    expect(r.sebab).toContain(r.record.maksud.slice(1).replace(/\.$/, ''));
    expect(r.sebab).not.toContain(q);
  });

  it('tells a close friendship from a self-interested one', () => {
    const close = situ('Dua sahabat itu sangat rapat dan tidak pernah berpisah sejak kecil.').results.map((r) => r.record.id);
    const selfish = situ('Kawan itu berkawan dengan saya kerana kepentingan sendiri.').results.map((r) => r.record.id);
    expect(close).toContain('bagai-isi-dengan-kuku');
    expect(close).not.toContain('lagi-lauk-lagi-nasi');
    expect(selfish).toContain('lagi-lauk-lagi-nasi');
    expect(selfish).not.toContain('bagai-isi-dengan-kuku');
  });

  it('understands negation', () => {
    expect(top('Dia tidak sombong walaupun sudah kaya.')).not.toBe('tinggi-hati');
    expect(situ('Dia tidak mudah berputus asa.').results.map((r) => r.record.id)).not.toContain('putus-asa');
    expect(situ('Dia sombong.').results.length).toBeGreaterThan(0);
    expect(situ('Dia sudah berputus asa.').results.map((r) => r.record.id)).toContain('putus-asa');
  });

  it('understands informal spelling', () => {
    expect(situ('kawan aku ni bila aku takde duit terus hilang, bila ada duit baru dia cari aku').results.length).toBeGreaterThan(0);
    expect(standardise('xde duit sbb dia je')).toEqual(['tiada', 'wang', 'sebab', 'dia', 'sahaja']);
    expect(standardise('kawan2 aku')).toEqual(['kawan-kawan', 'saya']);
  });

  it('does not treat one word as a concept', () => {
    expect(detectConcepts('Kawan saya membeli telefon baharu.')).toEqual([]);
    expect(detectConcepts('Kerajaan berusaha menurunkan harga minyak.')).toEqual([]);
  });

  it('does not misread a neutral sentence that mentions money and friends', () => {
    expect(detectConcepts('Kawan saya beli kereta kerana dia kaya.').map((h) => h.concept.id)).not.toContain('kawan-kepentingan');
  });

  it('says honestly when nothing fits', () => {
    for (const q of ['Saya suka warna biru dan lagu pop.', 'Ayam di belakang rumah saya bertelur banyak hari ini.', 'Harimau di zoo itu tidur sepanjang hari.']) {
      const res = situ(q);
      expect(res.weak).toBe(true);
      expect(res.results).toEqual([]);
    }
  });

  it('never returns a vocabulary entry, a sensitive record or anything outside the collection', () => {
    for (const q of ['Dia datang dari tempat lain.', 'Saya berjalan-jalan makan angin.', 'Dia marah dan sangat sedih dengan kawannya.']) {
      for (const r of situ(q).results) {
        expect(BY_ID.get(r.record.id)).toBe(r.record);
        expect(r.record.sensitive).toBe(false);
        expect(r.record.verificationStatus).not.toBe('perlu-semakan');
        expect(r.record.semantik).toBeTruthy();
      }
    }
  });

  it('returns at most one of a pair of variants', () => {
    const ids = situ('Mereka bertengkar teruk tetapi dua beradik itu berbaik semula.').results.map((r) => r.record.id);
    expect(ids.filter((id) => id.startsWith('air-dicincang')).length).toBe(1);
  });

  it('needs more than one word', () => {
    expect(situ('lewat').results).toEqual([]);
  });
});

describe('situation search (with sentence similarity)', () => {
  const reading = (neutral: number, ...concepts: [string, number][]): SemanticReading => ({ neutral, concepts: concepts.map(([id, sim]) => ({ id, sim })) });

  it('finds a concept the cues cannot see', () => {
    const q = 'Dia tidak pernah mengeluarkan sesen pun untuk orang lain.';
    const res = situationSearch(index, q, { semantic: reading(0.5, ['kedekut', 0.8]) });
    expect(res.results.map((r) => r.record.id)).toContain('ketam-batu');
  });

  it('lets similarity overrule a cue that misfired on one word', () => {
    const q = 'Sebelum membeli rumah, ayah tergesa-gesa bertanya pendapat ramai orang.';
    expect(detectConcepts(q).map((h) => h.concept.id)).toContain('gopoh');
    const res = situationSearch(index, q, { semantic: reading(0.5, ['fikir-dahulu', 0.8], ['gopoh', 0.6]) });
    expect(res.understood[0].id).toBe('fikir-dahulu');
  });

  it('adds weight to a concept both readings agree on', () => {
    const res = situationSearch(index, 'Dia sombong sekali.', { semantic: reading(0.5, ['tamak', 0.68], ['sombong', 0.66]) });
    expect(res.understood[0].id).toBe('sombong');
  });

  it('refuses when the sentence is closest to ordinary everyday text', () => {
    const res = situationSearch(index, 'Saya minum kopi setiap pagi di kafe.', { semantic: reading(0.8, ['rajin', 0.6]) });
    expect(res.results).toEqual([]);
    expect(res.weak).toBe(true);
  });

  it('refuses when nothing is similar enough', () => {
    expect(situationSearch(index, 'Ayat tentang perkara lain.', { semantic: reading(0.3, ['rajin', 0.5]) }).results).toEqual([]);
  });

  it('ignores a concept id it does not know', () => {
    const res = situationSearch(index, 'Ayat tentang perkara lain.', { semantic: reading(0.3, ['konsep-rekaan', 0.9]) });
    expect(res.results).toEqual([]);
  });

  it('falls back to local cues when the reading is unavailable', () => {
    const res = situationSearch(index, 'Dia sombong sekali.', { semantic: { neutral: 0, concepts: [] } });
    expect(res.results.length).toBeGreaterThan(0);
  });
});

describe('semantic curation', () => {
  it('uses only concepts that exist, each with cues, an explanation and example situations', () => {
    const examples = JSON.parse(readFileSync(join(import.meta.dirname, '../../data/curated/situations.json'), 'utf8')) as Record<string, string[]>;
    for (const r of RECORDS) {
      if (!r.semantik) continue;
      for (const id of [...Object.keys(r.semantik.utama), ...Object.keys(r.semantik.berkaitan), ...r.semantik.bukan]) expect(CONCEPT_BY_ID.has(id), id).toBe(true);
    }
    for (const c of CONCEPTS) {
      expect(c.cues.length, c.id).toBeGreaterThan(0);
      expect(c.why, c.id).toMatch(/^Peribahasa ini /);
      expect(examples[c.id]?.length ?? 0, c.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives every concept at least one saying, so no reading leads nowhere', () => {
    for (const c of CONCEPTS) {
      expect(RECORDS.some((r) => r.semantik?.utama[c.id] !== undefined), c.id).toBe(true);
    }
  });

  it('never maps a sensitive record', () => {
    expect(RECORDS.filter((r) => r.sensitive && r.semantik)).toEqual([]);
  });

  it('never lists a saying as both fitting and unsuitable for a concept', () => {
    for (const r of RECORDS) {
      if (!r.semantik) continue;
      for (const id of r.semantik.bukan) {
        expect(r.semantik.utama[id], `${r.id} ${id}`).toBeUndefined();
        expect(r.semantik.berkaitan[id], `${r.id} ${id}`).toBeUndefined();
      }
    }
  });

  it('ground truth only names real records', () => {
    for (const name of ['dev', 'holdout', 'ujian']) {
      const { cases } = JSON.parse(readFileSync(join(import.meta.dirname, `../../data/eval/situasi-${name}.json`), 'utf8')) as { cases: { id: string; relevant: string[]; excluded: string[] }[] };
      for (const c of cases) for (const id of [...c.relevant, ...c.excluded]) expect(BY_ID.has(id), `${c.id}: ${id}`).toBe(true);
    }
  });
});
