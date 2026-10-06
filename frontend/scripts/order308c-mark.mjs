// ORDER 308c — markens färg i öppningen mot Designs skärmar.
// Jämför Designs skärmar av byn (documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/
// skarmar/1280x720/: oppning-texten, -nalen-ingrid, -raden-stjarnan) med spelets skärmar vid samma
// tid (scripts/order308-check.mjs, produktionsbygget, 1280 × 720). Vinbarens två scener (raden-tom,
// raden-det-du-vet) har ingen mark. Nålen över vinbaren (-nalen-din-vinbar) mäts inte: kameran sjunker
// där, och bilden tas 0,1–0,2 s olika i olika körningar, så inramningen flyttar sig och fasta rutor
// hamnar på gräsmattan i en körning och på trottoaren i nästa.
//
// Marken: utvalda rutor där bilden visar marken (inga hus, vägar, tak, träd eller text), en lista för
// Designs bild och en för spelets (inramningen skiljer sig). Spelets kamera i öppningen är densamma
// före och efter, så samma rutor gäller båda faserna. Rutorna ritas in i reports/order308c/zoner/
// (magenta) så att de kan granskas. För markens bildpunkter: medel-RGB (0–255), kulören (HSV-hue,
// grader), mättnaden och värdet (0–1), och grönheten g − (r + b) / 2. Dessutom avståndet i RGB
// mellan spelets och Designs markfärg (dist).
//
// Faserna är kataloger under reports/order308c/: 'fore' (före ORDER 308c, main 51c7cbb7) och '.'
// (efter). En fas som saknas hoppas över. Dessutom byn efter öppningen (oppning-byn-efter, spelets
// egen mark), före och efter (controlVillageAfter): den ska vara oförändrad.
//   node scripts/order308c-mark.mjs   → reports/order308c/mark.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const DESIGN = resolve(FRONTEND, '..', 'documentation/leveranser/nexus-leverans-2026-10-04-oppningen-omtag/skarmar/1280x720');
const OUT = resolve(FRONTEND, 'reports/order308c');
const SHOTS = ['oppning-texten', 'oppning-nalen-ingrid', 'oppning-raden-stjarnan'];
const PHASES = [{ id: 'before', dir: resolve(OUT, 'fore') }, { id: 'after', dir: OUT }];
// Rutorna [x, y, bredd, höjd] i 1280 × 720.
const ZONES = {
  'oppning-texten': {
    design: [[1120, 320, 70, 50], [700, 520, 120, 40], [100, 350, 60, 60], [740, 320, 60, 40]],
    game: [[80, 300, 100, 60], [90, 390, 100, 50], [640, 560, 100, 40]]
  },
  'oppning-nalen-ingrid': {
    design: [[100, 520, 200, 80], [800, 240, 160, 80], [900, 580, 200, 60]],
    game: [[100, 460, 200, 80], [500, 540, 200, 80], [800, 480, 200, 60]]
  },
  'oppning-raden-stjarnan': {
    design: [[400, 400, 240, 120], [100, 360, 200, 100], [700, 420, 160, 100]],
    game: [[100, 380, 200, 100], [880, 440, 200, 80], [240, 180, 120, 60]]
  }
};

const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage();

mkdirSync(resolve(OUT, 'zoner'), { recursive: true });

/** Markens färg i rutorna; ritar rutorna i en kopia av bilden (zoner/<namn>.png). */
async function ground(file, zones, zoneOut) {
  const url = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  const res = await page.evaluate(async ({ src, zones }) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (const [zx, zy, zw, zh] of zones) {
      const d = x.getImageData(zx, zy, zw, zh).data;
      for (let i = 0; i < d.length; i += 4) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; }
    }
    const cr = sr / n, cg = sg / n, cb = sb / n;
    const r = cr / 255, g = cg / 255, b = cb / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    let h = 0;
    if (dl > 0) h = mx === r ? 60 * (((g - b) / dl) % 6) : mx === g ? 60 * ((b - r) / dl + 2) : 60 * ((r - g) / dl + 4);
    if (h < 0) h += 360;
    x.strokeStyle = '#ff00ff'; x.lineWidth = 2;
    for (const [zx, zy, zw, zh] of zones) x.strokeRect(zx, zy, zw, zh);
    return { size: `${img.width}x${img.height}`, pixels: n, rgb: [cr, cg, cb], hue: h, sat: mx === 0 ? 0 : dl / mx, val: mx, green: cg - (cr + cb) / 2, png: c.toDataURL('image/png').split(',')[1] };
  }, { src: url, zones });
  writeFileSync(zoneOut, Buffer.from(res.png, 'base64'));
  delete res.png;
  return res;
}

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const fmt = (g) => ({ pixels: g.pixels, rgb: g.rgb.map(r1), hue: r1(g.hue), sat: r2(g.sat), val: r2(g.val), green: r1(g.green) });
const dist = (a, b) => r1(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));

const rows = [];
for (const name of SHOTS) {
  const d = await ground(resolve(DESIGN, `${name}.png`), ZONES[name].design, resolve(OUT, 'zoner', `design-${name}.png`));
  const row = { shot: name, design: fmt(d) };
  for (const ph of PHASES) {
    const f = resolve(ph.dir, `${name}-1280x720.png`);
    if (!existsSync(f)) continue;
    const g = await ground(f, ZONES[name].game, resolve(OUT, 'zoner', `${ph.id}-${name}.png`));
    row[ph.id] = { file: f.slice(FRONTEND.length + 1), ...fmt(g), dist: dist(g.rgb, d.rgb), dHue: r1(g.hue - d.hue), dGreen: r1(g.green - d.green) };
  }
  rows.push(row);
  console.log(name, JSON.stringify(row));
}
// Kontroll: byn efter öppningen (spelets eget ljus och mark, Byn (V) på 660 m), före och efter 308c.
// Samma kamera i båda, så bilderna jämförs bildpunkt för bildpunkt: medel-RGB över hela bilden och
// medelavvikelsen per bildpunkt och kanal (0–255). Den ska vara (nära) noll.
async function pixels(file) {
  const url = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  return page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    return Array.from(x.getImageData(0, 0, img.width, img.height).data);
  }, url);
}
const CONTROL = 'oppning-byn-efter';
const control = { shot: CONTROL };
const px = {};
for (const ph of PHASES) {
  const f = resolve(ph.dir, `${CONTROL}-1280x720.png`);
  if (!existsSync(f)) continue;
  const d = await pixels(f);
  px[ph.id] = d;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  control[ph.id] = { file: f.slice(FRONTEND.length + 1), rgb: [r / n, g / n, b / n].map(r1) };
}
if (px.before && px.after && px.before.length === px.after.length) {
  let s = 0, k = 0;
  for (let i = 0; i < px.before.length; i += 4) for (let c = 0; c < 3; c++) { s += Math.abs(px.after[i + c] - px.before[i + c]); k++; }
  control.meanAbsDiff = r2(s / k);
  control.dist = dist(control.after.rgb, control.before.rgb);
}
console.log('kontroll', JSON.stringify(control));
await browser.close();

const avg = (xs) => (xs.length ? r1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const summary = { design: { meanHue: avg(rows.map((r) => r.design.hue)), meanGreen: avg(rows.map((r) => r.design.green)) } };
for (const ph of PHASES) {
  const have = rows.filter((r) => r[ph.id]);
  if (!have.length) continue;
  summary[ph.id] = {
    meanHue: avg(have.map((r) => r[ph.id].hue)),
    meanGreen: avg(have.map((r) => r[ph.id].green)),
    meanDist: avg(have.map((r) => r[ph.id].dist)),
    maxDist: Math.max(...have.map((r) => r[ph.id].dist)),
    meanAbsDHue: avg(have.map((r) => Math.abs(r[ph.id].dHue)))
  };
}
writeFileSync(resolve(OUT, 'mark.json'), JSON.stringify({
  definition: `Marken = medelfärgen i rutorna ZONES (scripts/order308c-mark.mjs; inritade i reports/order308c/zoner/), där bilden visar mark. pixels = antal bildpunkter, rgb 0–255, hue i grader (HSV), sat och val 0–1, green = g − (r + b) / 2. dist = RGB-avståndet till Designs markfärg, dHue och dGreen = spelet − Design. before = reports/order308c/fore/ (main 51c7cbb7), after = reports/order308c/ (ORDER 308c). Designs skärmar: skarmar/1280x720/. controlVillageAfter: byn efter öppningen (Byn, V), hela bilden, meanAbsDiff = medelavvikelse per bildpunkt och kanal mellan faserna. scripts/order308c-mark.mjs.`,
  rows, summary, controlVillageAfter: control
}, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 1));
