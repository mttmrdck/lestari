// Browser checks with a real Chromium-based browser (playwright-core, no bundled download).
//   node scripts/e2e.mjs [baseUrl] [shotsDir]
// Set CHROME_PATH to use a specific browser; otherwise common macOS paths are tried.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('../src/data/peribahasa.json', import.meta.url), 'utf8'));
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();

const BASE = process.argv[2] ?? 'http://localhost:8787';
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
  // The browser logs every 4xx; the negative auth checks below cause some on purpose.
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 4(01|09)/.test(m.text())) errors.push(`${viewport.width} console: ${m.text()}`); });
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
  check('onboarding lands on the dashboard', await page.getByText(/Aina!/).first().isVisible() && await page.getByRole('link', { name: /Jom Belajar/ }).isVisible());
  check('fresh dashboard shows zero XP honestly', (await page.getByRole('link', { name: '0 XP keseluruhan' }).first().count()) > 0);
  check('learning path shows a current and locked lessons', (await page.getByRole('link', { name: /pelajaran semasa/ }).count()) === 1 && (await page.getByRole('img', { name: /dikunci/ }).count()) >= 1);
  await page.screenshot({ path: `${SHOTS}/flow-02-dashboard.png`, fullPage: true });

  // Pass the first lesson, answering from the real data.
  await page.getByRole('link', { name: /Jom Belajar/ }).click();
  await settle(page);
  const sayings = [];
  while (await page.getByRole('button', { name: /Faham, teruskan/ }).isVisible().catch(() => false)) {
    sayings.push(norm(await page.locator('article h1').innerText()));
    await page.getByRole('button', { name: /Faham, teruskan/ }).click();
    await page.waitForTimeout(200);
  }
  const recs = sayings.map((t) => DATA.find((r) => r.normalizedText === t));
  check('lesson teaches four real sayings first', recs.length === 4 && recs.every(Boolean), String(recs.length));
  for (let step = 0; step < 14; step++) {
    if (await page.getByText('Padankan peribahasa dengan maksudnya').isVisible().catch(() => false)) {
      for (const r of recs) {
        await page.locator('ul[aria-label="Peribahasa"] button', { hasText: r.peribahasa }).click();
        await page.locator('ul[aria-label="Maksud"] button', { hasText: r.maksud }).click();
        await page.waitForTimeout(80);
      }
      await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
      await page.waitForTimeout(250);
      continue;
    }
    const opts = page.locator('ol[aria-label="Pilihan jawapan"] button');
    if (!(await opts.count())) break;
    const prompt = norm(await page.locator('.saying').first().innerText().catch(() => ''));
    const labels = (await opts.allInnerTexts()).map((t) => t.replace(/^\d+\s*/, '').trim());
    let pick = labels.findIndex((l) => recs.some((r) => norm(r.peribahasa) === norm(l) || norm(r.maksud) === norm(l)));
    if (pick < 0) pick = labels.findIndex((l) => recs.some((r) => norm(prompt.replace('?', l)) === r.normalizedText));
    await opts.nth(Math.max(0, pick)).click();
    await page.getByRole('button', { name: 'Semak', exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1300);
  check('passing a lesson shows the celebration', await page.getByRole('heading', { name: 'Pelajaran selesai!' }).isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-02b-lesson-results.png`, fullPage: true });
  const afterLesson = await page.evaluate(() => JSON.parse(localStorage.getItem('lestari:v1')));
  check('lesson recorded with its bonus and badge', Object.keys(afterLesson.lessonsDone).length === 1 && !!afterLesson.achievements['mula-melangkah'] && afterLesson.awarded['lesson:asas-1'] === 1);
  await page.getByRole('button', { name: 'Kembali ke Laluan' }).click();
  await settle(page);
  check('next lesson unlocked on the path', (await page.getByRole('link', { name: /selesai/ }).count()) >= 1 && (await page.getByRole('link', { name: /pelajaran semasa/ }).count()) === 1);
  await page.reload();
  await settle(page);
  check('lesson progress survives refresh', (await page.getByRole('link', { name: /selesai/ }).count()) >= 1);
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
  await page.locator('article h2, [data-testid="tiada-padanan"]').first().waitFor();
  const first = await page.locator('article h2').first().innerText();
  check('situation search ranks the right saying first', /Sudah terantuk baru tengadah/.test(first), first);
  check('every result explains why it fits', await page.locator('article').first().getByText('Mengapa sesuai').isVisible() && await page.getByTestId('kefahaman').isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-04-situasi.png`, fullPage: true });
  await page.getByLabel('Ceritakan situasi').fill('Saya suka warna biru dan lagu pop.');
  await page.getByRole('button', { name: 'Cari padanan' }).click();
  await page.getByTestId('tiada-padanan').waitFor();
  check('no-match situation is reported honestly', await page.getByText('Belum jumpa peribahasa yang benar-benar sepadan').isVisible() && (await page.locator('article').count()) === 0);

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

  // Teka Maksud and the saved collection
  await page.goto(BASE + '/kuiz/maksud');
  await settle(page);
  check('Teka Maksud asks for a meaning', await page.getByText('Apakah maksud peribahasa ini?').isVisible());
  await page.goto(BASE + '/simpanan');
  await settle(page);
  check('saved collection lists the bookmark', await page.locator('a[href="/peribahasa/harapkan-pagar-pagar-makan-padi"]').isVisible());
  await page.getByLabel('Cari dalam senarai').fill('tiada-padanan-zz');
  check('saved search filters with an empty state', await page.getByText('Tiada padanan dalam senarai ini').isVisible());
  await page.getByLabel('Cari dalam senarai').fill('');
  await page.getByRole('link', { name: /Kad imbas senarai ini/ }).click();
  await settle(page);
  check('flashcards launch from saved items', await page.getByRole('button', { name: 'Tunjuk maksud' }).isVisible());
  await page.goto(BASE + '/simpanan');
  await page.getByRole('radio', { name: /Kesilapan/ }).click();
  check('mistakes tab lists wrong answers', (await page.locator('a[href^="/peribahasa/"]').count()) > 0);
  const navBefore = await page.locator('nav[aria-label="Navigasi utama"] li[aria-hidden]').last().getAttribute('style');
  await page.getByRole('navigation', { name: 'Navigasi utama' }).last().getByRole('link', { name: 'Latihan' }).click();
  await page.waitForTimeout(400);
  const navAfter = await page.locator('nav[aria-label="Navigasi utama"] li[aria-hidden]').last().getAttribute('style');
  check('bottom nav indicator moves with the route', navBefore !== navAfter, `${navBefore} -> ${navAfter}`);

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


// ---------- 1b. Cari: every theme in the real UI ----------
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  const THEMES = [...new Set(DATA.flatMap((r) => r.themes))];
  const count = async () => Number((await page.getByTestId('bilangan-hasil').innerText()).match(/\d+/)?.[0]);
  await page.goto(BASE + '/cari');
  await settle(page);
  const tiles = await page.locator('button.card-link').count();
  check('theme browser offers every theme', tiles === THEMES.length, String(tiles));
  let good = 0;
  for (let i = 0; i < tiles; i++) {
    await page.goto(BASE + '/cari');
    await page.locator('button.card-link').nth(i).click();
    await page.getByTestId('bilangan-hasil').waitFor({ timeout: 4000 }).catch(() => {});
    const theme = new URL(page.url()).searchParams.get('tema');
    const expected = DATA.filter((r) => r.themes.includes(theme)).length;
    const shown = await count().catch(() => -1);
    const active = await page.getByRole('group', { name: 'Tapisan aktif' }).count().catch(() => 0);
    const rows = await page.locator('a[href^="/peribahasa/"]').count();
    if (shown === expected && active === 0 && rows > 0) good++; else check(`theme ${theme}`, false, `${shown} vs ${expected}`);
  }
  check('every theme shows all its sayings', good === tiles, `${good}/${tiles}`);
  await page.goto(BASE + '/cari?tema=persahabatan');
  await page.getByTestId('bilangan-hasil').waitFor();
  check('selected theme stays visible', await page.getByRole('button', { name: 'Buang tema Persahabatan' }).isVisible());
  await page.screenshot({ path: `${SHOTS}/flow-12-tema.png`, fullPage: true });
  await page.getByLabel('Kata kunci peribahasa').fill('kawan');
  await page.waitForTimeout(500);
  const inter = await count();
  check('keyword and theme intersect', inter > 0 && inter < 11, String(inter));
  await page.getByLabel('Kata kunci peribahasa').fill('');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Buang tema Persahabatan' }).click();
  await page.waitForTimeout(300);
  check('removing the theme restores browsing', await page.getByRole('heading', { name: 'Terokai mengikut tema' }).isVisible() && !page.url().includes('tema='));
  await page.goto(BASE + '/cari?tema=persahabatan&kategori=Perumpamaan');
  await page.getByRole('radio', { name: 'Situasi' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('radio', { name: 'Kata Kunci' }).click();
  await page.waitForTimeout(300);
  check('switching modes leaves no stale filter', !/tema=|kategori=/.test(page.url()) && await page.getByRole('heading', { name: 'Terokai mengikut tema' }).isVisible());
  await page.goto(BASE + '/cari?tema=rekaan');
  await settle(page);
  check('an unknown theme in the URL is ignored', await page.getByRole('heading', { name: 'Terokai mengikut tema' }).isVisible());
  await page.goto(BASE + '/cari?mode=situasi&q=' + encodeURIComponent('Kawan itu berkawan dengan saya kerana kepentingan sendiri.'));
  await page.locator('article h2').first().waitFor();
  const friend = await page.locator('article h2').allInnerTexts();
  check('self-interest is not answered with close friendship', !friend.some((t) => /isi dengan kuku/.test(t)) && friend.some((t) => /Lagi lauk|Habis madu|Guna-guna/.test(t)), friend.join(' / '));
  await page.screenshot({ path: `${SHOTS}/flow-13-situasi-kawan.png`, fullPage: true });
  await ctx.close();
}

// ---------- 1c. Accounts ----------
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  const id = `uji${Date.now() % 1000000}`;
  const email = `${id}@contoh.my`;
  const password = 'rahsia123';
  const pwField = () => page.getByLabel('Kata laluan', { exact: true });

  await page.goto(BASE + '/akaun');
  await page.waitForURL(/\/masuk\?ke=/);
  check('account page redirects guests to login', page.url().includes('/masuk?ke=/akaun'));
  await page.getByRole('button', { name: 'Jom Masuk' }).click();
  check('empty login shows errors', await page.getByText('Isikan e-mel atau nama pengguna.').isVisible() && await page.getByText('Isikan kata laluan.').isVisible());

  await page.getByRole('link', { name: 'Daftar', exact: true }).click();
  await page.getByLabel('Nama paparan').waitFor();
  await page.getByLabel('E-mel').fill('bukan-emel');
  await page.getByLabel('E-mel').blur();
  await page.getByText(/e-mel yang sah/).waitFor({ timeout: 3000 }).catch(() => {});
  check('invalid email is flagged inline', await page.getByText(/e-mel yang sah/).isVisible());
  await page.getByLabel('Nama paparan').fill('Aina Sofea');
  await page.getByLabel('Nama pengguna').fill(id);
  await page.getByLabel('E-mel').fill(email);
  await pwField().fill(password);
  await page.getByLabel('Sahkan kata laluan').fill('lainpula1');
  await page.getByLabel('Sahkan kata laluan').blur();
  check('password mismatch is flagged', await page.getByText('Kata laluan tidak sama.').isVisible());
  await page.getByLabel('Sahkan kata laluan').fill(password);
  await page.getByText('Nama pengguna ini tersedia.').waitFor();
  check('username availability is checked live', true);
  await page.screenshot({ path: `${SHOTS}/flow-14-daftar.png`, fullPage: true });
  await page.getByRole('button', { name: 'Cipta Akaun' }).click();
  await page.getByTestId('kod-pemulihan').waitFor({ timeout: 6000 });
  const recovery = await page.getByTestId('kod-pemulihan').innerText();
  check('registration shows the recovery code before anything else', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(recovery), recovery);
  check('recovery code must be acknowledged', await page.getByRole('button', { name: 'Jom Mula' }).isDisabled());
  await page.getByLabel('Saya sudah simpan kod ini').check();
  await page.getByRole('button', { name: 'Jom Mula' }).click();
  await page.getByRole('heading', { name: 'Aina Sofea' }).waitFor();
  check('registration returns to the page that asked for it', await page.getByRole('heading', { name: 'Aina Sofea' }).isVisible());
  await page.goto(BASE + '/');
  await page.getByText(/Aina Sofea!/).first().waitFor();
  check('new account gets a dashboard with its name', true);
  const cookies = await ctx.cookies();
  const session = cookies.find((c) => c.name.includes('lestari_s'));
  check('session cookie is HttpOnly', !!session?.httpOnly && session.sameSite === 'Lax');
  check('session is not readable from scripts', !(await page.evaluate(() => document.cookie)).includes('lestari_s'));

  await page.reload();
  await settle(page);
  check('session survives a refresh', await page.getByText(/Aina Sofea!/).first().isVisible());
  await page.goto(BASE + '/masuk');
  await page.waitForURL((u) => !u.pathname.startsWith('/masuk'));
  check('signed-in learners skip the login page', true);

  // XP: earned in the app, stored on the server.
  await page.goto(BASE + '/kuiz/maksud');
  await settle(page);
  const answers = DATA.map((r) => r);
  for (let i = 0; i < 8; i++) {
    const prompt = norm(await page.locator('main .saying').first().innerText());
    const rec = answers.find((r) => r.normalizedText === prompt);
    if (!rec) console.log('  (prompt not matched)', prompt);
    const opts = page.locator('ol[aria-label="Pilihan jawapan"] button');
    const labels = (await opts.allInnerTexts()).map((t) => t.replace(/^\d+\s*/, '').trim());
    const pick = labels.findIndex((l) => norm(l).includes(norm(rec?.maksud ?? '?')));
    await opts.nth(Math.max(0, pick)).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: /Soalan seterusnya|Lihat keputusan/ }).click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1600);
  const localXp = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).xpTotal, await page.evaluate(() => `lestari:v1:u:${localStorage.getItem('lestari:akaun')}`));
  const ledger = await page.evaluate(() => fetch('/api/papan-juara?tempoh=minggu&demo=0').then((r) => r.json()));
  check('server ledger matches the XP earned', ledger.you?.xp === localXp && localXp >= 80, `${ledger.you?.xp} vs ${localXp}`);
  const cheat = await page.evaluate(() => fetch('/api/xp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [{ kind: 'quiz', mode: 'maksud', recordId: 'rekaan', amount: 100000 }, { kind: 'lesson', lessonId: 'rekaan', correct: 1, total: 1 }] }) }).then((r) => r.json()));
  check('forged XP is rejected', cheat.results.every((x) => x.status === 'rejected') && cheat.total === ledger.you.xp, JSON.stringify(cheat.results));
  const tamper = await page.evaluate(() => fetch('/api/kemajuan', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: { version: 1, xpTotal: 999999 } }) }).then(() => fetch('/api/papan-juara?tempoh=minggu&demo=0')).then((r) => r.json()));
  check('editing progress does not change the ranking', tamper.you.xp === ledger.you.xp);
  // Put the real snapshot back so the rest of the flow sees it.
  await page.evaluate(async () => { const key = `lestari:v1:u:${localStorage.getItem('lestari:akaun')}`; await fetch('/api/kemajuan', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: JSON.parse(localStorage.getItem(key)) }) }); });

  // Leaderboard
  await page.goto(BASE + '/papan-juara');
  await page.getByTestId('kedudukan-kamu').waitFor();
  await page.waitForTimeout(1600);
  check('leaderboard shows the learner', (await page.getByTestId('kedudukan-kamu').innerText()).includes('Aina Sofea'));
  const bar = await page.getByTestId('kedudukan-kamu').boundingBox();
  check('own rank stays pinned inside the viewport', !!bar && bar.y >= 0 && bar.y + bar.height <= 844, JSON.stringify(bar));
  const demoRows = await page.locator('[data-testid^="podium-"], li[data-key]').allInnerTexts();
  check('every demo profile is labelled', demoRows.filter((t) => /Sang Kancil|Mak Tempua|Pak Belang|Cik Merbah/.test(t)).every((t) => /Demo/.test(t)));
  check('podium has three ranks', (await page.locator('[data-testid^="podium-"]').count()) === 3);
  await page.screenshot({ path: `${SHOTS}/flow-15-papan-juara.png`, fullPage: false });
  await page.getByRole('radio', { name: 'Keseluruhan' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('radio', { name: 'Bulan Ini' }).click();
  await page.waitForTimeout(1200);
  check('period filters work', await page.getByTestId('podium-1').isVisible());
  await page.getByRole('button', { name: 'Sembunyikan demo' }).click();
  await page.waitForTimeout(800);
  const realOnly = await page.evaluate(() => document.querySelector('main').innerText);
  check('demo profiles can be hidden', !/Sang Kancil/.test(realOnly) && /Aina Sofea/.test(realOnly));
  await page.reload();
  await page.getByTestId('kedudukan-kamu').waitFor();
  check('rank survives a refresh', true);

  // Sign out, wrong password, sign in, second device
  await page.goto(BASE + '/akaun');
  await page.getByRole('button', { name: 'Log Keluar' }).click();
  await page.getByRole('heading', { name: /Fahami Makna|Selamat/ }).first().waitFor();
  const afterOut = await page.evaluate(() => fetch('/api/kemajuan').then((r) => r.status));
  check('logout ends the session on the server', afterOut === 401);
  check('logout removes this account from the device', !(await page.evaluate(() => Object.keys(localStorage).some((k) => k.includes(':u:')))));
  await page.goto(BASE + '/masuk');
  await page.getByLabel('E-mel atau nama pengguna').fill(email);
  await pwField().fill('salahsekali1');
  await page.getByRole('button', { name: 'Jom Masuk' }).click();
  await page.getByText(/tidak betul/).waitFor();
  check('wrong password shows a clear error', true);
  await page.screenshot({ path: `${SHOTS}/flow-16-salah.png`, fullPage: true });
  await pwField().fill(password);
  await page.getByRole('button', { name: 'Jom Masuk' }).click();
  await page.getByText(/Aina Sofea!/).first().waitFor();
  const xpBack = await page.getByRole('link', { name: /XP keseluruhan/ }).first().getAttribute('aria-label');
  check('progress comes back after signing in', parseInt(xpBack) >= 80, xpBack);

  await ctx.clearCookies();
  await page.reload();
  await settle(page);
  check('an ended session returns to guest with a notice', await page.getByText(/Sesi kamu telah tamat/).isVisible());

  await page.goto(BASE + '/daftar');
  await page.getByLabel('Nama paparan').fill('Orang Lain');
  await page.getByLabel('Nama pengguna').fill(`${id}x`);
  await page.getByLabel('E-mel').fill(email);
  await pwField().fill(password);
  await page.getByLabel('Sahkan kata laluan').fill(password);
  await page.getByRole('button', { name: 'Cipta Akaun' }).click();
  await page.getByText('E-mel ini sudah didaftarkan').waitFor();
  check('duplicate email is refused', true);

  await page.goto(BASE + '/lupa-kata-laluan');
  await page.getByLabel('E-mel atau nama pengguna').fill(id);
  await page.getByLabel('Kod pemulihan').fill('AAAA-AAAA-AAAA-AAAA');
  await page.getByLabel('Kata laluan baharu').fill('baharu123');
  await page.getByRole('button', { name: 'Pulihkan Akaun' }).click();
  await page.getByText(/kod pemulihan tidak betul/).waitFor();
  check('a wrong recovery code is refused', true);
  await page.getByLabel('Kod pemulihan').fill(recovery);
  await page.getByRole('button', { name: 'Pulihkan Akaun' }).click();
  await page.getByTestId('kod-pemulihan').waitFor();
  check('the recovery code resets the password and rotates', (await page.getByTestId('kod-pemulihan').innerText()) !== recovery);
  await ctx.close();
}

// ---------- 1d. Offline: the API is down ----------
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.route('**/api/**', (r) => r.abort());
  await page.goto(BASE + '/cari?mode=situasi&q=' + encodeURIComponent('Dia sangat sombong dengan kawan-kawannya.'));
  await page.locator('article h2').first().waitFor({ timeout: 8000 });
  check('situation search still works without the server', await page.getByText(/peta konsep sahaja/).isVisible());
  await page.goto(BASE + '/papan-juara');
  await page.getByText('Papan Juara tidak dapat dimuatkan.').waitFor({ timeout: 13000 });
  check('leaderboard explains when it cannot load', true);
  await ctx.close();
  { const kept = errors.filter((e) => !/ERR_FAILED|Failed to fetch/.test(e)); errors.length = 0; errors.push(...kept); }
}

// ---------- Reduced motion ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.setItem('lestari:v1', JSON.stringify({ version: 1, profile: { name: 'Aina', level: 'menengah', dailyGoal: 50, createdAt: 1 } })));
  await page.goto(BASE + '/');
  await settle(page);
  const dur = await page.locator('.float').first().evaluate((el) => getComputedStyle(el).animationDuration);
  check('reduced motion stops idle animation', dur === '0.001s' || dur === '1ms', dur);
  await ctx.close();
}

// ---------- 2. Layout at four widths ----------
const ROUTES = ['/masuk', '/daftar', '/lupa-kata-laluan', '/papan-juara', '/', '/laluan', '/simpanan', '/pelajaran/asas-1', '/cari', '/cari?mode=kata&q=ayam', '/cari?mode=situasi&q=Semua%20ahli%20kelas%20bergotong-royong%20membersihkan%20kelas%20bersama-sama.', '/peribahasa/sudah-terantuk-baru-tengadah', '/kuiz', '/kuiz/emoji', '/kad-imbas', '/profil', '/harian', '/tentang'];
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
