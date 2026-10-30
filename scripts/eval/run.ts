/**
 * Evaluates Carian Situasi against the human-readable ground truth in data/eval/.
 *   npm run eval:situasi             print metrics and failures for every set
 *   npm run eval:situasi -- --report also rewrite docs/situation-search-evaluation.md
 * Sentence readings are cached in data/eval/readings.json, so results reproduce offline. A query
 * missing from the cache is embedded through the same local Worker as `npm run data:embed`.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RECORDS } from '../../src/lib/data';
import { buildIndex, situationSearch, type SemanticReading } from '../../src/lib/search';
import { scoreConcepts } from '../../worker/situasi';
import { score, type EvalCase } from './metrics';

const ROOT = join(import.meta.dirname, '../..');
const PORT = 8798;
const index = buildIndex(RECORDS);
const variants = new Map(RECORDS.map((r) => [r.id, r.variants]));
const load = (name: string): EvalCase[] => JSON.parse(readFileSync(join(ROOT, `data/eval/situasi-${name}.json`), 'utf8')).cases;
const SETS = [['dev', 'Pembangunan (dev): digunakan untuk penalaan'], ['holdout', 'Pengesahan (validation): dilihat semasa memilih seni bina'], ['ujian', 'Ujian akhir (test): dijalankan sekali, selepas pembekuan']] as const;
const sets = SETS.map(([name, title]) => ({ name, title, cases: load(name) }));

const cachePath = join(ROOT, 'data/eval/readings.json');
const cache: Record<string, SemanticReading> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const missing = sets.flatMap((s) => s.cases.map((c) => c.query)).filter((q) => !cache[q]);
if (missing.length) {
  const dev = spawn(join(ROOT, 'node_modules/.bin/wrangler'), ['dev', '--port', String(PORT)], { cwd: join(ROOT, 'scripts/embed-worker'), stdio: 'ignore' });
  process.on('exit', () => dev.kill());
  for (let i = 0; i < missing.length; i += 40) {
    const texts = missing.slice(i, i + 40);
    let data: number[][] | null = null;
    for (let attempt = 0; attempt < 60 && !data; attempt++) {
      try {
        const res = await fetch(`http://localhost:${PORT}`, { method: 'POST', body: JSON.stringify({ texts }) });
        if (res.ok) data = ((await res.json()) as { data: number[][] }).data;
      } catch { await new Promise((r) => setTimeout(r, 1000)); }
    }
    if (!data) throw new Error('Could not reach the local embedding worker.');
    texts.forEach((q, k) => { cache[q] = scoreConcepts(data[k]); });
  }
  dev.kill();
  writeFileSync(cachePath, JSON.stringify(cache));
}

const hybrid = (q: string) => {
  const r = situationSearch(index, q, { semantic: cache[q] });
  return { ids: r.results.map((x) => x.record.id), concepts: r.understood.map((u) => u.id) };
};
const cuesOnly = (q: string) => {
  const r = situationSearch(index, q);
  return { ids: r.results.map((x) => x.record.id), concepts: r.understood.map((u) => u.id) };
};
const out = sets.map((s) => ({ ...s, hybrid: score(s.cases, hybrid, variants), cues: score(s.cases, cuesOnly, variants) }));

for (const s of out) {
  console.log(`\n== ${s.name} ==`, JSON.stringify(Object.fromEntries(Object.entries(s.hybrid.metrics).map(([k, v]) => [k, Math.round(v * 1000) / 1000]))));
  for (const r of s.hybrid.rows) {
    if (!r.ok || r.irrelevant.length) console.log(`${r.ok ? ' ok ' : 'FAIL'} ${r.c.id} [${r.concepts.join(',') || '-'}] want ${r.c.expectedConcepts.join(',') || 'none'}\n     ${r.c.query}\n     -> ${r.ids.map((id) => (r.rel.includes(id) ? id : `!${id}`)).join('  ') || '(none)'}`);
  }
}

if (process.argv.includes('--report')) {
  const base = JSON.parse(readFileSync(join(ROOT, 'data/eval/baseline.json'), 'utf8')) as Record<string, { metrics: Record<string, number>; tops: Record<string, string | null> }>;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const line = (label: string, m: Record<string, number>) => `| ${label} | ${pct(m.topRelevance)} | ${pct(m.precisionAt3)} | ${pct(m.precisionAt5)} | ${pct(m.recallAt5)} | ${pct(m.irrelevantRate)} | ${pct(m.noMatchAccuracy)} | ${pct(m.answered)} |`;
  const name = (id: string | null | undefined) => (id ? RECORDS.find((r) => r.id === id)?.peribahasa ?? id : '(tiada)');
  const head = '| Enjin | Hasil teratas relevan | Precision@3 | Precision@5 | Recall@5 | Kadar tidak relevan | Ketepatan tiada-padanan | Dijawab |\n|---|---|---|---|---|---|---|---|';
  const summary = out.map((s) => `### ${s.title} (${s.cases.length} kes: ${s.hybrid.metrics.positive} berpadanan, ${s.hybrid.metrics.noMatchCases} tiada padanan)\n\n${head}\n${line('Lama (asal)', base[s.name].metrics)}\n${line('Kiu sahaja (luar talian)', s.cues.metrics)}\n${line('**Hibrid (kini)**', s.hybrid.metrics)}`).join('\n\n');
  const failures = out.map((s) => {
    const rows = s.hybrid.rows.filter((r) => !r.ok || r.irrelevant.length);
    return `### ${s.name}: ${s.hybrid.rows.filter((r) => !r.ok).length} kes gagal, ${rows.filter((r) => r.ok).length} kes dengan hasil tambahan yang tidak relevan\n\n${rows.length ? `| Kes | Jenis | Situasi | Konsep dijangka | Konsep dibaca | Hasil teratas | Tidak relevan |\n|---|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.ok ? '' : '**gagal** '}${r.c.id} | ${r.c.type} | ${r.c.query.replace(/\|/g, '/')} | ${r.c.expectedConcepts.join(', ') || 'tiada'} | ${r.concepts.join(', ') || 'tiada'} | ${name(r.ids[0])} | ${r.irrelevant.map(name).join('; ') || '-'} |`).join('\n')}` : 'Tiada.'}`;
  }).join('\n\n');
  const all = out.map((s) => `### ${s.name}\n\n| Kes | Jenis | Situasi | Konsep dijangka | Hasil lama | Hasil kini | Betul? |\n|---|---|---|---|---|---|---|\n${s.hybrid.rows.map((r) => `| ${r.c.id} | ${r.c.type} | ${r.c.query.replace(/\|/g, '/')} | ${r.c.expectedConcepts.join(', ') || 'tiada padanan'} | ${name(base[s.name].tops[r.c.id])} | ${name(r.ids[0])} | ${r.ok ? 'ya' : 'tidak'} |`).join('\n')}`).join('\n\n');
  const doc = readFileSync(join(ROOT, 'docs/situation-search-evaluation.template.md'), 'utf8').replace('{{SUMMARY}}', summary).replace('{{FAILURES}}', failures).replace('{{ALL}}', all);
  writeFileSync(join(ROOT, 'docs/situation-search-evaluation.md'), doc);
  console.log('\nwrote docs/situation-search-evaluation.md');
}
process.exit(0);
