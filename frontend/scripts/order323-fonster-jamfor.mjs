// ORDER 323 §4 — bilderna före och efter sida vid sida, ett blad per hus (och Kvarteret), ur
// reports/order323/fonster/fore/ och efter/ (scripts/order323-fonster.mjs). Utdata: fonster/jamfor/*.png.
//
//   node scripts/order323-fonster-jamfor.mjs

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..', 'reports', 'order323', 'fonster');
const OUT = resolve(DIR, 'jamfor');
mkdirSync(OUT, { recursive: true });
const fore = JSON.parse(readFileSync(resolve(DIR, 'fore', 'hus.json'), 'utf8'));
const pairs = [['kvarteret.png', 'Kvarteret (C)'], ...fore.houses.map((h) => [h.image, `${h.id} (${h.kind}, ${h.renderer})`])];
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage({ viewport: { width: 1460, height: 500 } });
const img = (tag, f) => `data:image/png;base64,${readFileSync(resolve(DIR, tag, f)).toString('base64')}`;
for (const [f, label] of pairs) {
  await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:16px sans-serif">
    <div style="padding:6px 10px">${label}</div>
    <div style="display:flex;gap:20px;padding:0 0 10px">
      <figure style="margin:0"><img src="${img('fore', f)}" style="width:720px"><figcaption>Före</figcaption></figure>
      <figure style="margin:0"><img src="${img('efter', f)}" style="width:720px"><figcaption>Efter</figcaption></figure>
    </div></body></html>`);
  await page.screenshot({ path: resolve(OUT, f), fullPage: true });
}
await browser.close();
console.log(pairs.map(([f]) => `reports/order323/fonster/jamfor/${f}`).join('\n'));
