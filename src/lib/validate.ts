import { KATEGORI, THEME_IDS, type Peribahasa } from '../types/peribahasa';
import { slugify } from './text';

export interface Issue {
  level: 'error' | 'warning';
  id: string;
  message: string;
}

const STATUSES = new Set(['sumber-dibekalkan', 'dirujuk-silang', 'disahkan-prpm', 'perlu-semakan']);

/** Structural checks on the knowledge base. Errors block the import; warnings go to the report. */
export function validateRecords(records: Peribahasa[]): Issue[] {
  const issues: Issue[] = [];
  const ids = new Set<string>();
  const texts = new Map<string, string>();
  const err = (id: string, message: string) => issues.push({ level: 'error', id, message });
  const warn = (id: string, message: string) => issues.push({ level: 'warning', id, message });

  for (const r of records) {
    if (!r.id || r.id !== slugify(r.peribahasa)) err(r.id || '(kosong)', 'id does not match the slug of the saying');
    if (ids.has(r.id)) err(r.id, 'duplicate id');
    ids.add(r.id);
    if (!r.peribahasa?.trim()) err(r.id, 'empty peribahasa');
    if (!r.maksud?.trim()) err(r.id, 'missing maksud');
    if (!KATEGORI.includes(r.category)) err(r.id, `invalid category "${r.category}"`);
    if (!STATUSES.has(r.verificationStatus)) err(r.id, `invalid verification status "${r.verificationStatus}"`);
    for (const t of r.themes) if (!(THEME_IDS as readonly string[]).includes(t)) err(r.id, `invalid theme "${t}"`);
    if (!r.sources?.length) err(r.id, 'no source recorded');
    if (r.sources.some((s) => s.id === 'prpm') && !r.sourceUrl) err(r.id, 'PRPM record without sourceUrl');
    for (const c of r.contohAyat) if (!c.text.trim()) err(r.id, 'empty example sentence');
    const prior = texts.get(r.normalizedText);
    if (prior) warn(r.id, `same text as ${prior}`);
    texts.set(r.normalizedText, r.id);
  }
  for (const r of records) {
    for (const rel of r.relatedPeribahasa) if (!ids.has(rel)) err(r.id, `related saying "${rel}" does not exist`);
    for (const v of r.variants) if (!ids.has(v)) err(r.id, `variant "${v}" does not exist`);
  }
  return issues;
}

/** Ids referenced by curated content (quizzes, contrasts) must exist. */
export function checkReferences(label: string, refs: string[], ids: Set<string>): Issue[] {
  return refs.filter((id) => !ids.has(id)).map((id) => ({ level: 'error' as const, id, message: `${label} refers to a missing record` }));
}
