import { describe, expect, it } from 'vitest';
import { RECORDS, BY_ID } from '../lib/data';
import { buildIndex, keywordSearch, situationSearch, suggest } from '../lib/search';

const index = buildIndex(RECORDS);
const ids = (q: string) => keywordSearch(index, q).map((r) => r.record.id);
const situ = (q: string) => situationSearch(index, q, { byId: BY_ID });

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

describe('situation search', () => {
  it('matches starting to study too late', () => {
    const res = situ('Ali baru mula belajar apabila peperiksaan tinggal seminggu.');
    expect(res.weak).toBe(false);
    expect(res.results[0].record.id).toBe('sudah-terantuk-baru-tengadah');
    expect(res.results[0].sebab).toContain('baru mula');
    expect(res.results[0].strength).toBe('kuat');
  });

  it('matches cooperation', () => {
    const res = situ('Semua penduduk kampung bergotong-royong membersihkan surau bersama-sama.');
    expect(res.results.slice(0, 3).map((r) => r.record.id)).toContain('berat-sama-dipikul-ringan-sama-dijinjing');
  });

  it('matches perseverance', () => {
    const res = situ('Dia gagal dua kali tetapi tidak berputus asa dan terus mencuba sehingga berjaya.');
    expect(res.results[0].record.id).toBe('genggam-bara-api-biar-sampai-jadi-arang');
  });

  it('matches betrayal of trust', () => {
    const res = situ('Bendahari kelab yang dipercayai telah menyalahgunakan wang yuran ahli.');
    expect(res.results[0].record.id).toBe('harapkan-pagar-pagar-makan-padi');
  });

  it('says honestly when nothing fits', () => {
    const res = situ('Saya suka warna biru dan lagu pop.');
    expect(res.weak).toBe(true);
    expect(res.results.every((r) => r.strength === 'lemah')).toBe(true);
  });

  it('only returns records from the collection', () => {
    const res = situ('Abang menasihati adik supaya tidak bermain telefon sedangkan dia sendiri selalu bermain.');
    for (const r of res.results) expect(BY_ID.get(r.record.id)).toBe(r.record);
    expect(res.results[0].record.id).toBe('seperti-ketam-mengajar-anak-berjalan-lurus');
  });

  it('needs more than one word', () => {
    expect(situ('lewat').results).toEqual([]);
  });
});
