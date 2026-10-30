import { describe, expect, it } from 'vitest';
import { RECORDS, BY_ID, LEARNABLE, CORE } from '../lib/data';
import { validateRecords, checkReferences } from '../lib/validate';
import { EMOJI_PUZZLES } from '../content/emoji';
import { SITUATIONS } from '../content/situations';
import { CONTRASTS } from '../content/contrasts';
import { KATEGORI } from '../types/peribahasa';
import { slugify } from '../lib/text';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ids = new Set(RECORDS.map((r) => r.id));

describe('knowledge base', () => {
  it('accounts for every row of the primary source', () => {
    const raw = readFileSync(join(__dirname, '../../data/sources/raw/kompilasi-320.txt'), 'utf8');
    const rows = raw.split('\n').filter((l) => l.includes('\t')).map((l) => l.split('\t')[0].trim()).filter((p) => p && p !== 'Peribahasa');
    expect(rows.length).toBe(649);
    for (const p of rows) {
      const found = BY_ID.get(slugify(p)) ?? RECORDS.find((r) => r.sources.some((s) => s.id === 'kompilasi-320') && r.id === slugify(p));
      expect(found, p).toBeTruthy();
    }
  });

  it('passes structural validation with no errors', () => {
    const errors = validateRecords(RECORDS).filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });

  it('has unique ids derived from the saying', () => {
    expect(ids.size).toBe(RECORDS.length);
    for (const r of RECORDS) expect(r.id).toBe(slugify(r.peribahasa));
  });

  it('only uses valid categories and has a meaning for every record', () => {
    for (const r of RECORDS) {
      expect(KATEGORI).toContain(r.category);
      expect(r.maksud.trim().length).toBeGreaterThan(2);
    }
  });

  it('gives every PRPM-sourced record a URL and evidence', () => {
    const prpm = RECORDS.filter((r) => r.sources.some((s) => s.id === 'prpm'));
    expect(prpm.length).toBeGreaterThanOrEqual(10);
    for (const r of prpm) expect(r.sourceUrl).toMatch(/^https:\/\/prpm\.dbp\.gov\.my\//);
  });

  it('labels LESTARI-written examples as such, never as source text', () => {
    for (const r of RECORDS) for (const c of r.contohAyat) expect(c.origin).toBe('disediakan-lestari');
  });

  it('keeps sensitive and flagged records out of the learnable pool', () => {
    expect(LEARNABLE.some((r) => r.sensitive || r.verificationStatus === 'perlu-semakan')).toBe(false);
    expect(CORE.length).toBeGreaterThan(100);
  });

  it('resolves every id used by curated quiz and search content', () => {
    const refs = [
      ...EMOJI_PUZZLES.map((p) => p.answer),
      ...SITUATIONS.flatMap((s) => [s.answer, ...s.distractors]),
      ...RECORDS.filter((r) => r.semantik).map((r) => r.id),
      ...CONTRASTS.flatMap((c) => [c.a, c.b]),
    ];
    expect(checkReferences('curated content', refs, ids)).toEqual([]);
  });

  it('never uses a variant of the answer as a distractor in situation questions', () => {
    for (const s of SITUATIONS) {
      const answer = BY_ID.get(s.answer)!;
      for (const d of s.distractors) {
        expect(d).not.toBe(s.answer);
        expect(answer.variants).not.toContain(d);
      }
    }
  });
});
