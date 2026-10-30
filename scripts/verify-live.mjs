// Post-deploy check against a real URL. Creates one throwaway account and deletes it at the end.
//   node scripts/verify-live.mjs https://lestari.zafranakif74.workers.dev
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'https://lestari.zafranakif74.workers.dev';
const DATA = JSON.parse(readFileSync(new URL('../src/data/peribahasa.json', import.meta.url), 'utf8'));
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/status of 4(01|09)/.test(m.text())) errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const id = `ujian_${Date.now() % 100000000}`;
const password = 'Ujian' + Date.now() % 1000000;
const timed = async (fn) => { const t = Date.now(); await fn(); return Date.now() - t; };

await page.goto(BASE + '/cari');
await page.locator('button.card-link', { hasText: 'Persahabatan' }).click();
await page.getByTestId('bilangan-hasil').waitFor();
check('theme filter returns its sayings', /\b11\b/.test(await page.getByTestId('bilangan-hasil').innerText()), await page.getByTestId('bilangan-hasil').innerText());

for (const [q, want] of [
  ['Dia hanya datang apabila saya mempunyai wang.', /Lagi lauk|Habis madu|Guna-guna|Ada gula/],
  ['Dia tidak pernah mengeluarkan sesen pun untuk orang lain walaupun hartanya banyak.', /Ketam batu|Tangkai jering/],
  ['Pekerja itu ditamatkan khidmat sebaik sahaja projek syarikat selesai.', /Habis madu|Guna-guna/],
]) {
  let ms = 0;
  await page.goto(`${BASE}/cari?mode=situasi&q=${encodeURIComponent(q)}`);
  ms = await timed(() => page.locator('article h2, [data-testid="tiada-padanan"]').first().waitFor());
  const titles = await page.locator('article h2').allInnerTexts();
  check(`situasi: ${q.slice(0, 44)}`, want.test(titles[0] ?? ''), `${titles[0]}, ${ms}ms`);
  check('  used the live model', !(await page.getByText(/peta konsep sahaja/).isVisible()));
}
await page.goto(`${BASE}/cari?mode=situasi&q=${encodeURIComponent('Saya membeli sebotol air di kedai runcit.')}`);
await page.getByTestId('tiada-padanan').waitFor();
check('situasi: no match stays honest', (await page.locator('article').count()) === 0);

await page.goto(BASE + '/daftar');
await page.getByLabel('Nama paparan').fill('Ujian Automatik');
await page.getByLabel('Nama pengguna').fill(id);
await page.getByLabel('E-mel').fill(`${id}@contoh.my`);
await page.getByLabel('Kata laluan', { exact: true }).fill(password);
await page.getByLabel('Sahkan kata laluan').fill(password);
const regMs = await timed(async () => { await page.getByRole('button', { name: 'Cipta Akaun' }).click(); await page.getByTestId('kod-pemulihan').waitFor({ timeout: 15000 }); });
check('registration works', true, `${regMs}ms`);
const cookie = (await ctx.cookies()).find((c) => c.name.includes('lestari_s'));
check('cookie is hardened', cookie?.name === '__Host-lestari_s' && cookie.httpOnly && cookie.secure && cookie.sameSite === 'Lax', cookie?.name);
await page.getByLabel('Saya sudah simpan kod ini').check();
await page.getByRole('button', { name: 'Jom Mula' }).click();
await page.getByText(/Ujian Automatik!/).first().waitFor();

await page.goto(BASE + '/kuiz/maksud');
await page.locator('main .saying').first().waitFor();
for (let i = 0; i < 8; i++) {
  const prompt = norm(await page.locator("main .saying").first().innerText());
  const rec = DATA.find((r) => r.normalizedText === prompt);
  const opts = page.locator('ol[aria-label="Pilihan jawapan"] button');
  const labels = await opts.allInnerTexts();
  await opts.nth(Math.max(0, labels.findIndex((l) => norm(l).includes(norm(rec?.maksud ?? '?'))))).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /Soalan seterusnya|Lihat keputusan/ }).click();
  await page.waitForTimeout(200);
}
await page.waitForTimeout(2500);
const key = await page.evaluate(() => `lestari:v1:u:${localStorage.getItem('lestari:akaun')}`);
const local = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).xpTotal, key);
const board = await page.evaluate(() => fetch('/api/papan-juara?tempoh=minggu&demo=0').then((r) => r.json()));
check('XP reaches the server ledger', board.you?.xp === local && local >= 80, `${board.you?.xp} vs ${local}`);
const forged = await page.evaluate(() => fetch('/api/xp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [{ kind: 'lesson', lessonId: 'rekaan', correct: 1, total: 1, amount: 99999 }] }) }).then((r) => r.json()));
check('forged XP is rejected', forged.results[0].status === 'rejected' && forged.total === board.you.xp);

await page.goto(BASE + '/papan-juara');
await page.getByTestId('kedudukan-kamu').waitFor();
await page.waitForTimeout(1500);
const bar = await page.getByTestId('kedudukan-kamu').boundingBox();
check('leaderboard loads with own rank pinned', !!bar && bar.y + bar.height <= 844);
check('no horizontal overflow on a phone', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);

await page.goto(BASE + '/akaun');
await page.getByRole('button', { name: 'Log Keluar' }).click();
await page.waitForTimeout(1500);
check('logout ends the session', (await page.evaluate(() => fetch('/api/kemajuan').then((r) => r.status))) === 401);
for (let i = 0; i < 3; i++) {
  await page.goto(BASE + '/masuk');
  await page.getByLabel('E-mel atau nama pengguna').fill(id);
  await page.getByLabel('Kata laluan', { exact: true }).fill(i < 2 ? 'SalahSekali1' : password);
  const ms = await timed(async () => { await page.getByRole('button', { name: 'Jom Masuk' }).click(); await (i < 2 ? page.getByText(/tidak betul/) : page.getByText(/Ujian Automatik!/).first()).waitFor({ timeout: 15000 }); });
  check(i < 2 ? 'wrong password refused' : 'login works and restores progress', true, `${ms}ms`);
}
const sync = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).xpTotal, key);
check('progress came back from the server', sync === local, `${sync}`);

await page.goto(BASE + '/akaun');
await page.getByRole('button', { name: 'Padam Akaun' }).click();
await page.getByLabel('Kata laluan', { exact: true }).last().fill(password);
await page.getByRole('button', { name: 'Ya, padam' }).click();
await page.waitForTimeout(2000);
const after = await page.evaluate(() => fetch('/api/papan-juara?tempoh=semua&demo=0').then((r) => r.json()));
check('test account removed from the board', !after.entries.some((e) => e.username === undefined ? false : e.name === 'Ujian Automatik'));

await browser.close();
check('no console, runtime or server errors', errors.length === 0, errors.slice(0, 4).join(' | '));
console.log(failed ? `\n${failed} checks FAILED` : '\nAll live checks passed');
process.exit(failed ? 1 : 0);
