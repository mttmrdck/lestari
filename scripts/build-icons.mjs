// Renders the app icons from the LESTARI mark: node scripts/build-icons.mjs
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const mark = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${40 + 2 * pad} ${40 + 2 * pad}" width="100%" height="100%"><rect x="${-pad}" y="${-pad}" width="${40 + 2 * pad}" height="${40 + 2 * pad}" fill="#58CC02"/><circle cx="16" cy="21" r="9" fill="#263238"/><path d="M21 14c5-5 13-4 16 2-4-1-9-1-14 1z" fill="#FF8A3D"/><path d="M23 17c6-1 12 2 14 8-5-2-10-3-15-2z" fill="#FFC800"/><circle cx="18" cy="19" r="2.6" fill="#fff"/></svg>`;
const ICONS = [['icon-192.png', 192, 3], ['icon-512.png', 512, 3], ['apple-touch-icon.png', 180, 5], ['maskable-512.png', 512, 11]];
const executablePath = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].filter(Boolean).find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath });
for (const [name, size, pad] of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<!doctype html><body style="margin:0">${mark(pad)}</body>`);
  await page.screenshot({ path: `public/icons/${name}` });
  await page.close();
}
await browser.close();
