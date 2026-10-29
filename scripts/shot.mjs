// Quick screenshots after animations settle: node scripts/shot.mjs <outDir> <path> <width>x<height> [seedProfile]
import { chromium } from 'playwright-core';
const [out, path, size, seed] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' });
const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
await page.goto('http://localhost:4173/');
if (seed) await page.evaluate((s) => localStorage.setItem('lestari:v1', s), seed);
await page.goto('http://localhost:4173' + path);
await page.waitForTimeout(2600);
const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
await page.screenshot({ path: `${out}/${path.replace(/\W+/g, '_')}-${width}.png`, fullPage: process.env.FULL === "1" });
console.log(path, width, 'overflow', ov);
await browser.close();
