// Browser checks with a real Chromium-based browser (playwright-core, no bundled download).
//   node scripts/e2e.mjs [baseUrl] [shotsDir]
// Set CHROME_PATH to use a specific browser; otherwise common macOS paths are tried.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const SHOTS = process.argv[3] ?? 'e2e-shots';
mkdirSync(SHOTS, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) { console.error('No Chromium-based browser found; set CHROME_PATH.'); process.exit(2); }

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

const browser = await chromium.launch({ executablePath, headless: true });
const errors = [];
async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${viewport.width}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${viewport.width} console: ${m.text()}`); });
  return { ctx, page };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const settle = (page) => page.waitForTimeout(900);

// ---------- 1. Flows on a phone viewport ----------
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.goto(BASE + '/');
  await settle(page);
  check('welcome shows tagline', await page.getByRole('heading', { name: /Fahami Makna/ }).isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-01-welcome.png`, fullPage: true });

  await page.getByRole('button', { name: 'Mula Belajar' }).first().click();
  await page.getByLabel('Nama panggilan').fill('Aina');
  await page.getByRole('radio', { name: 'Biasa' }).click();
  await page.locator('dialog').getByRole('button', { name: 'Mula Belajar' }).click();
  await settle(page);
  check('onboarding lands on home', await page.getByRole('heading', { name: /Aina/ }).isVisible());
  check('fresh home shows zero XP honestly', (await page.locator('text=Jumlah XP').locator('..').innerText()).includes('0'));
  await page.screenshot({ path: `${SHOTS}/flow-02-home-fresh.png`, fullPage: true });

  // Keyword search
  await page.getByRole('navigation', { name: 'Navigasi utama' }).last().getByRole('link', { name: 'Cari' }).click();
  await page.getByRole('button', { name: 'Padi', exact: true }).click();
  await page.waitForTimeout(500);
  const padiCount = await page.locator('a[href^="/peribahasa/"]').count();
  check('chip "Padi" runs a search', padiCount > 3, `${padiCount} results`);
  check('exact padi saying found', await page.locator('a[href="/peribahasa/harapkan-pagar-pagar-makan-padi"]').isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-03-search-padi.png`, fullPage: true });
  await page.getByRole('button', { name: 'Perumpamaan', exact: true }).click();
  await page.waitForTimeout(400);
  const filtered = await page.locator('a[href^="/peribahasa/"]').count();
  check('category filter narrows results', filtered < padiCount, `${filtered} after filter`);
  await page.getByLabel('Kata kunci peribahasa').fill('   HARIMAU  ');
  await page.waitForTimeout(500);
  check('search ignores case and spaces', (await page.locator('a[href^="/peribahasa/"]').count()) > 0);
  await page.getByLabel('Kosongkan carian').click();
  check('clear empties the query', (await page.getByLabel('Kata kunci peribahasa').inputValue()) === '');

  // Situation search
  await page.getByRole('radio', { name: 'Situasi' }).click();
  await page.getByLabel('Ceritakan situasi').fill('Ali baru mula belajar apabila peperiksaan tinggal seminggu.');
  await page.getByRole('button', { name: 'Cari padanan' }).click();
  await page.waitForTimeout(600);
  const first = await page.locator('article h2').first().innerText();
  check('situation search ranks the right saying first', /Sudah terantuk baru tengadah/.test(first), first);
  check('explanation quotes the student', await page.locator('article').first().getByText(/Kamu menyebut “baru mula”/).isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-04-situasi.png`, fullPage: true });
  await page.getByLabel('Ceritakan situasi').fill('Saya suka warna biru dan lagu pop.');
  await page.getByRole('button', { name: 'Cari padanan' }).click();
  await page.waitForTimeout(500);
  check('weak situation is reported honestly', await page.getByText('Tiada padanan yang kukuh').isVisible());

  // Detail, favourite, copy
  await page.goto(BASE + '/peribahasa/harapkan-pagar-pagar-makan-padi');
  await settle(page);
  await page.getByRole('button', { name: 'Simpan' }).click();
  check('favourite toggles', await page.getByRole('button', { name: 'Disimpan' }).isVisible());
  await page.getByRole('button', { name: 'Salin' }).click();
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  check('copy writes the saying to the clipboard', clip.startsWith('Harapkan pagar'), clip.slice(0, 30));
  await page.getByRole('button', { name: 'Sekolah' }).click();
  check('template example is labelled', await page.getByText(/Contoh templat/).isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-05-detail.png`, fullPage: true });
  await page.reload();
  await settle(page);
  check('favourite persists after refresh', await page.getByRole('button', { name: 'Disimpan' }).isVisible());
  check('deep link works after refresh', await page.getByRole('heading', { level: 1, name: /Harapkan pagar/ }).isVisible());

  // Quiz
  await page.goto(BASE + '/kuiz/konteks');
  await settle(page);
  const xpBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('lestari:v1')).xpTotal);
  await page.locator('ol[aria-label="Pilihan jawapan"] button').first().click();
  await page.waitForTimeout(300);
  check('answer shows feedback', await page.locator('#maklum-balas').isVisible());
  check('options lock after answering', await page.locator('ol[aria-label="Pilihan jawapan"] button').first().isDisabled());
  await page.screenshot({ path: `${SHOTS}/flow-06-quiz-feedback.png`, fullPage: true });
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: /Soalan seterusnya|Lihat keputusan/ }).click();
    await page.waitForTimeout(150);
    if (i < 7) { const b = page.locator('ol[aria-label="Pilihan jawapan"] button').nth(1); if (await b.isVisible()) { await b.click(); await page.waitForTimeout(150); } }
  }
  if (await page.getByRole('button', { name: 'Lihat keputusan' }).isVisible()) await page.getByRole('button', { name: 'Lihat keputusan' }).click();
  await settle(page);
  check('quiz shows results', await page.getByText(/\/ 8/).first().isVisible());
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('lestari:v1')));
  check('quiz history saved', st.quizHistory.length === 1 && st.quizHistory[0].total === 8);
  check('XP only from correct answers', st.xpTotal - xpBefore === st.quizHistory[0].xp, `${st.xpTotal - xpBefore} vs ${st.quizHistory[0].xp}`);
  await page.screenshot({ path: `${SHOTS}/flow-07-quiz-results.png`, fullPage: true });

  // Timer
  await page.goto(BASE + '/kuiz');
  await page.getByRole('switch').check();
  await page.goto(BASE + '/kuiz/kosong');
  await page.waitForTimeout(1200);
  const t1 = await page.getByRole('timer').innerText();
  await page.waitForTimeout(2200);
  const t2 = await page.getByRole('timer').innerText();
  check('timer counts down', parseInt(t1) > parseInt(t2), `${t1} -> ${t2}`);
  await page.locator('ol[aria-label="Pilihan jawapan"] button').first().click();
  await page.waitForTimeout(1500);
  check('timer stops after answering', (await page.getByRole('timer').innerText()).includes('Berhenti'));
  await page.screenshot({ path: `${SHOTS}/flow-08-blank-timer.png`, fullPage: true });

  // Flashcards
  await page.goto(BASE + '/kad-imbas');
  await settle(page);
  await page.getByRole('button', { name: /Mula sesi/ }).click();
  await page.getByRole('button', { name: 'Tunjuk maksud' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/flow-09-flashcard-back.png`, fullPage: true });
  await page.getByRole('button', { name: /^Mudah/ }).click();
  const cards = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('lestari:v1')).cards));
  check('flashcard rating is scheduled', cards.length === 1 && cards[0].interval === 4, JSON.stringify(cards[0]?.interval));

  // Daily challenge
  await page.goto(BASE + '/harian');
  await settle(page);
  await page.getByLabel(/Jawapan kamu/).fill('ini jawapan salah');
  await page.getByRole('button', { name: 'Hantar jawapan' }).click();
  await page.waitForTimeout(300);
  check('wrong guess reveals the category clue', await page.getByText('2. Kategori').isVisible());
  await page.reload();
  await settle(page);
  check('daily progress survives refresh', await page.getByText('2. Kategori').isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-10-daily.png`, fullPage: true });

  // Profile
  await page.goto(BASE + '/profil');
  await settle(page);
  check('achievement unlocked after first quiz', (await page.locator('li', { hasText: 'Selesaikan satu sesi kuiz' }).innerText()).includes('Dibuka'));
  await page.screenshot({ path: `${SHOTS}/flow-11-profile.png`, fullPage: true });

  // Corrupted storage
  await page.evaluate(() => localStorage.setItem('lestari:v1', '{rosak'));
  await page.goto(BASE + '/');
  await settle(page);
  check('corrupted storage recovers with a notice', await page.getByText(/rosak/).first().isVisible());
  await page.goto(BASE + '/tiada-laman');
  await settle(page);
  check('unknown route shows 404', await page.getByText('Halaman ini tidak ditemui').isVisible());
  await page.goto(BASE + '/peribahasa/tiada-id');
  await settle(page);
  check('missing record shows a useful state', await page.getByText('Peribahasa ini tidak ditemui').isVisible());
  await ctx.close();
}

// ---------- 2. Layout at four widths ----------
const ROUTES = ['/', '/cari', '/cari?mode=kata&q=ayam', '/cari?mode=situasi&q=Semua%20ahli%20kelas%20bergotong-royong%20membersihkan%20kelas%20bersama-sama.', '/peribahasa/sudah-terantuk-baru-tengadah', '/kuiz', '/kuiz/emoji', '/kad-imbas', '/profil', '/harian', '/tentang'];
for (const vp of [{ width: 375, height: 812 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  const { ctx, page } = await newPage(vp);
  // Seed a profile so routes render the app shell; welcome is captured separately.
  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.setItem('lestari:v1', JSON.stringify({ version: 1, profile: { name: 'Aina', level: 'menengah', dailyGoal: 50, createdAt: Date.now() } })));
  for (const r of ROUTES) {
    await page.goto(BASE + r);
    await settle(page);
    const o = await overflow(page);
    check(`no horizontal overflow ${vp.width}px ${r}`, o <= 0, o > 0 ? `${o}px` : '');
    const name = r.replace(/[/?=&%]+/g, '_').slice(0, 40) || 'home';
    await page.screenshot({ path: `${SHOTS}/w${vp.width}${name}.png`, fullPage: true });
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/');
  await settle(page);
  await page.screenshot({ path: `${SHOTS}/w${vp.width}_welcome.png`, fullPage: false });
  check(`welcome headline and action above the fold at ${vp.width}px`, await page.getByRole('button', { name: 'Mula Belajar' }).first().isVisible());
  await ctx.close();
}

await browser.close();
check('no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
