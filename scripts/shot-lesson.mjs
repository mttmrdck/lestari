// Walk through the first lesson and photograph each kind of step: node scripts/shot-lesson.mjs <outDir> [width]
import { chromium } from 'playwright-core';
const [out, w = '390'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const page = await (await browser.newContext({ viewport: { width: Number(w), height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/');
await page.evaluate(() => localStorage.setItem('lestari:v1', JSON.stringify({ version: 1, profile: { name: 'Aina', level: 'menengah', dailyGoal: 50, createdAt: 1 } })));
await page.goto('http://localhost:4173/pelajaran/asas-1');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/lesson-teach-${w}.png` });
for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: /Faham, teruskan/ }).click(); await page.waitForTimeout(250); }
let shotQ = false, shotM = false, shotF = false;
for (let step = 0; step < 14; step++) {
  if (await page.getByText('Padankan peribahasa dengan maksudnya').isVisible().catch(() => false)) {
    if (!shotM) { await page.screenshot({ path: `${out}/lesson-match-${w}.png` }); shotM = true; }
    const lefts = page.locator('ul[aria-label="Peribahasa"] button');
    const n = await lefts.count();
    for (let k = 0; k < n; k++) {
      const left = lefts.nth(k);
      if (await left.isDisabled()) continue;
      await left.click();
      const rights = page.locator('ul[aria-label="Maksud"] button:not([disabled])');
      for (let j = 0; j < await rights.count(); j++) { await rights.nth(j).click(); await page.waitForTimeout(80); if (await left.isDisabled()) break; await left.click(); }
    }
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
    await page.waitForTimeout(300);
    continue;
  }
  const opts = page.locator('ol[aria-label="Pilihan jawapan"] button');
  if (!(await opts.count())) break;
  if (!shotQ) { await page.screenshot({ path: `${out}/lesson-question-${w}.png` }); shotQ = true; }
  await opts.nth(step % 2).click();
  await page.getByRole('button', { name: 'Semak', exact: true }).click();
  await page.waitForTimeout(450);
  if (!shotF) { await page.screenshot({ path: `${out}/lesson-feedback-${w}.png` }); shotF = true; }
  await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/lesson-results-${w}.png` });
console.log('done', errors);
await browser.close();
