/**
 * Rebuilds worker/generated/prototypes.json from data/curated/situations.json.
 * Run after editing the example situations:  npm run data:embed
 * Starts a throwaway local Worker for its AI binding (needs `wrangler login`); nothing is deployed.
 * Vectors are normalised and stored as signed bytes, which keeps ~700 sentences under 1 MB.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PORT = 8798;
const raw = JSON.parse(readFileSync(join(ROOT, 'data/curated/situations.json'), 'utf8')) as Record<string, string[] | string>;
const rows = Object.entries(raw).filter(([k]) => k !== '_nota').flatMap(([concept, list]) => (list as string[]).map((text) => ({ concept, text })));

const dev = spawn(join(ROOT, 'node_modules/.bin/wrangler'), ['dev', '--port', String(PORT)], { cwd: join(ROOT, 'scripts/embed-worker'), stdio: 'ignore' });
const stop = () => dev.kill();
process.on('exit', stop);

async function embed(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`http://localhost:${PORT}`, { method: 'POST', body: JSON.stringify({ texts }) });
      if (res.ok) return ((await res.json()) as { data: number[][] }).data;
    } catch { /* still starting */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Could not reach the local embedding worker.');
}

const dim = 1024;
const bytes = new Int8Array(rows.length * dim);
for (let i = 0; i < rows.length; i += 50) {
  const vectors = await embed(rows.slice(i, i + 50).map((r) => r.text));
  vectors.forEach((v, k) => {
    const n = Math.hypot(...v);
    v.forEach((x, d) => { bytes[(i + k) * dim + d] = Math.round((x / n) * 127); });
  });
  process.stdout.write(`\r${Math.min(i + 50, rows.length)}/${rows.length}`);
}
stop();
const labels: string[] = [];
const counts: number[] = [];
for (const r of rows) {
  if (labels[labels.length - 1] === r.concept) counts[counts.length - 1]++;
  else { labels.push(r.concept); counts.push(1); }
}
writeFileSync(join(ROOT, 'worker/generated/prototypes.json'), JSON.stringify({ model: '@cf/baai/bge-m3', dim, labels, counts, vectors: Buffer.from(bytes.buffer).toString('base64') }));
console.log(`\nwrote ${rows.length} vectors for ${labels.length} labels`);
process.exit(0);
