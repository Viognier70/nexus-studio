// ORDER 308b — ljuset i öppningen mot Designs skärmar.
// Jämför Designs sex skärmar (documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/
// skarmar/1280x720/) med spelets skärmar vid samma tid (scripts/order308-check.mjs, produktionsbygget,
// 1280 × 720). För varje par: medelluminansen (Rec. 709, 0–255) över hela bilden och i bildens mitt
// (30–70 % i båda leden, samma utsnitt som scripts/luminance.mjs), och spelets andel av Designs.
// Raderna och nålarna finns i båda bilderna; knappen Hoppa över finns bara i spelets (nere till höger,
// utanför mittutsnittet).
//
// Faserna är kataloger under reports/order308b/: 'fore' (före ORDER 308b, main 508822e:s ljus) och
// '.' (efter). En fas som saknas hoppas över. Dessutom första morgonen efter öppningen,
// spelets eget ljus, före och efter (controlMorningAfter): den ska inte ha ändrats.
//   node scripts/order308b-ljus.mjs   → reports/order308b/ljus.json

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const DESIGN = resolve(FRONTEND, '..', 'documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/skarmar/1280x720');
const OUT = resolve(FRONTEND, 'reports/order308b');
const SHOTS = ['oppning-texten', 'oppning-nalen-din-vinbar', 'oppning-raden-tom', 'oppning-raden-det-du-vet', 'oppning-nalen-ingrid', 'oppning-raden-stjarnan'];
// Byns bilder (spelets scen under överlägget) och vinbarens (openingBar.ts, egna dukar).
const SCENE = { 'oppning-texten': 'village', 'oppning-nalen-din-vinbar': 'village', 'oppning-raden-tom': 'bar', 'oppning-raden-det-du-vet': 'bar', 'oppning-nalen-ingrid': 'village', 'oppning-raden-stjarnan': 'village' };
const PHASES = [{ id: 'before', dir: resolve(OUT, 'fore') }, { id: 'after', dir: OUT }];

const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage();

async function lum(file) {
  const url = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  return page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const mean = (x0, y0, w, h) => {
      const d = x.getImageData(x0, y0, w, h).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / (d.length / 4);
    };
    return {
      size: `${img.width}x${img.height}`,
      full: mean(0, 0, img.width, img.height),
      centre: mean(Math.round(img.width * 0.3), Math.round(img.height * 0.3), Math.round(img.width * 0.4), Math.round(img.height * 0.4))
    };
  }, url);
}

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const rows = [];
for (const name of SHOTS) {
  const d = await lum(resolve(DESIGN, `${name}.png`));
  const row = { shot: name, scene: SCENE[name], design: { full: r1(d.full), centre: r1(d.centre) } };
  for (const ph of PHASES) {
    const f = resolve(ph.dir, `${name}-1280x720.png`);
    if (!existsSync(f)) continue;
    const g = await lum(f);
    row[ph.id] = { file: f.slice(FRONTEND.length + 1), full: r1(g.full), centre: r1(g.centre), ratioFull: r2(g.full / d.full), ratioCentre: r2(g.centre / d.centre) };
  }
  rows.push(row);
  console.log(name, JSON.stringify(row));
}
// Kontroll: första morgonen efter öppningen (spelets eget ljus) före och efter 308b. Ska vara oförändrad.
const control = { shot: 'oppning-morgonen-efter' };
for (const ph of PHASES) {
  const f = resolve(ph.dir, 'oppning-morgonen-efter-1280x720.png');
  if (!existsSync(f)) continue;
  const g = await lum(f);
  control[ph.id] = { file: f.slice(FRONTEND.length + 1), full: r1(g.full), centre: r1(g.centre) };
}
if (control.before && control.after) control.diffFull = r1(control.after.full - control.before.full);
console.log('kontroll', JSON.stringify(control));
await browser.close();

const avg = (xs) => (xs.length ? r2(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const summary = {};
for (const ph of PHASES) {
  const have = rows.filter((r) => r[ph.id]);
  summary[ph.id] = {
    meanRatioFull: avg(have.map((r) => r[ph.id].ratioFull)),
    meanRatioCentre: avg(have.map((r) => r[ph.id].ratioCentre)),
    villageMeanRatioFull: avg(have.filter((r) => r.scene === 'village').map((r) => r[ph.id].ratioFull)),
    barMeanRatioFull: avg(have.filter((r) => r.scene === 'bar').map((r) => r[ph.id].ratioFull)),
    minRatioFull: have.length ? Math.min(...have.map((r) => r[ph.id].ratioFull)) : null,
    maxRatioFull: have.length ? Math.max(...have.map((r) => r[ph.id].ratioFull)) : null
  };
}
writeFileSync(resolve(OUT, 'ljus.json'), JSON.stringify({
  definition: 'Medelluminans (Rec. 709, 0–255): full = hela bilden, centre = 30–70 % i båda leden. ratio = spelet / Design. before = reports/order308b/fore/ (main 508822e:s ljus), after = reports/order308b/ (ORDER 308b). Designs skärmar: skarmar/1280x720/. scripts/order308b-ljus.mjs.',
  rows, summary, controlMorningAfter: control
}, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 1));
