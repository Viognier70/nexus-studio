// Medelluminansen (Rec. 709, 0–255) i bildens mitt (30–70 % i båda leden, där
// HUD:en inte ligger), för att jämföra spelets bilder med Designs kontrollbilder.
//   [LUM_OUT=reports/x/ljus.json] node scripts/luminance.mjs bild1.png bild2.jpg …
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage();
const rows = [];
for (const f of process.argv.slice(2)) {
  const mime = extname(f).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const url = `data:${mime};base64,${readFileSync(f).toString('base64')}`;
  const v = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const x0 = Math.round(img.width * 0.3), y0 = Math.round(img.height * 0.3), w = Math.round(img.width * 0.4), h = Math.round(img.height * 0.4);
    const d = x.getImageData(x0, y0, w, h).data; let s = 0; const all = [];
    for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; all.push(l); }
    all.sort((a, b) => a - b);
    const q = (p) => all[Math.floor(p * (all.length - 1))];
    return { mean: s / (d.length / 4), p10: q(0.1), p50: q(0.5), p90: q(0.9) };
  }, url);
  // ORDER 297b — strålkastarnas verkan: de ljusaste mot de mörkaste, p90 / p10
  // och p90 − p50 (luminans i samma utsnitt).
  console.log(v.mean.toFixed(1), 'p90/p10', (v.p90 / Math.max(1, v.p10)).toFixed(2), 'p90-p50', (v.p90 - v.p50).toFixed(1), f);
  rows.push({ file: f, luminance: +v.mean.toFixed(1), p10: +v.p10.toFixed(1), p50: +v.p50.toFixed(1), p90: +v.p90.toFixed(1), contrast: +(v.p90 / Math.max(1, v.p10)).toFixed(2), spread: +(v.p90 - v.p50).toFixed(1) });
}
await browser.close();
if (process.env.LUM_OUT) { const { writeFileSync } = await import('node:fs'); writeFileSync(process.env.LUM_OUT, JSON.stringify({ definition: 'Medelluminans (Rec. 709, 0–255) i bildens mitt, 30–70 % i båda leden, med percentilerna p10/p50/p90, contrast = p90/p10 och spread = p90 − p50 (scripts/luminance.mjs).', rows }, null, 2) + '\n'); }
