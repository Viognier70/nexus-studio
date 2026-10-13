// ORDER 332 D — kvarterens gränser efter gatorna: bilden för Anders godkännande och mätningen.
//
// Polygonerna byggs med spelets egen funktion: skriptet importerar src/strategic/content/districtBorders.ts direkt
// (Nodes typborttagning; filen har inga importer vid körning) och kör buildDistrictPolys på vägarna i
// grythyttan-world.json. Spelet (content/districts.ts) kör samma funktion på WORLD.roads, som är samma vägar
// oförändrade (content/world.ts: WORLD = { ...WORLD_RAW, buildings }). Ingen replik: samma kod, samma data.
// Kvarteret en punkt ligger i läses med samma districtIn som spelets districtAt.
//
// Utdata: reports/order332/kvarteren.svg, kvarteren.png (Playwright, finns redan i devDependencies) och
// kvarteren.json (polygonerna, benen per gata, vilka platser och landmärken som ligger i vilket kvarter, och
// överlappet mellan polygonerna i ett rutnät).
//
//   node scripts/order332-kvarteren.mjs        (SKIP_PNG=1 hoppar över PNG:n)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order332');
mkdirSync(OUT, { recursive: true });

const { DISTRICT_BORDERS, buildDistrictPolys, districtIn, pointInPoly } = await import(resolve(FRONTEND, 'src/strategic/content/districtBorders.ts'));
const { TRUCK_SPOTS } = await import(resolve(FRONTEND, 'src/strategic/content/truckSpots.ts'));
const world = JSON.parse(readFileSync(resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json'), 'utf8'));
const polys = buildDistrictPolys(world.roads);

// D15 d15Strings.js quarter.* (spelets text: nexusStrings.ts village.districts).
const NAMES = { torget: 'Torget', student: 'Studentkvarteret', gastgivaregarden: 'Gästgivaregården och kyrkan', campus: 'Campus och Måltidens hus', sjon: 'Vid sjön' };
const COLOURS = { torget: '#e8b93a', student: '#5aa0d8', gastgivaregarden: '#c0607a', campus: '#58b07a', sjon: '#1f9a8a' };

const centroid = (poly) => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
const bld = (id) => world.buildings.find((b) => b.id === id);
const lm = (id) => world.landmarks.find((l) => l.id === id);

// Det som ska ligga i rätt kvarter (ordern, punkt 1).
const checks = [
  ...Object.values(TRUCK_SPOTS).map((s) => ({ what: `vagnens plats ${s.id}`, at: s.C, want: s.district })),
  { what: 'spelarens krog w869907975', at: centroid(bld('w869907975').poly), want: 'torget' },
  { what: 'Torget (landmärke)', at: lm('gry-torget').position, want: 'torget' },
  { what: 'Gästgivaregården w869907964', at: centroid(bld('w869907964').poly), want: 'gastgivaregarden' },
  { what: 'kyrkan w869907961', at: centroid(bld('w869907961').poly), want: 'gastgivaregarden' },
  { what: 'Måltidens hus w193810975', at: centroid(bld('w193810975').poly), want: 'campus' },
  { what: 'Kärnhuset w193810921', at: centroid(bld('w193810921').poly), want: 'campus' },
  { what: 'Prästgatan, studenternas sträcka w122157689 (mitten)', at: world.roads.find((r) => r.id === 'w122157689').poly[3], want: 'student', onBorder: true },
  { what: 'källaren w193810970 (D15)', at: centroid(bld('w193810970').poly), want: 'student' },
  { what: 'salongen w193810957 (D15)', at: centroid(bld('w193810957').poly), want: 'gastgivaregarden' },
  { what: 'sjön r8482507 (mitten)', at: [376, 268], want: 'sjon' }
].map((c) => ({ ...c, got: districtIn(polys, c.at[0], c.at[1]), ok: districtIn(polys, c.at[0], c.at[1]) === c.want }));
// Prästgatans mittlinje är gränsen mellan Torget/Gästgivaregården och studentkvarteret bara väster om Sjögatan;
// öster om Sjögatan går den inne i studentkvarteret (till korsningen med Lokavägen, som är gränsen). Punkterna prövas
// en meter på var sida om gatan.
const prast = world.roads.find((r) => r.id === 'w122157689').poly;
const prastStretch = prast.filter((p) => p[0] > 210 && p[0] < 375).flatMap((p) => [[p[0], p[1] - 1], [p[0], p[1] + 1]]);
const prastInStudent = prastStretch.filter((p) => districtIn(polys, p[0], p[1]) === 'student').length;
checks.push({ what: 'Prästgatan öster om Sjögatan, båda sidor', at: null, want: 'student', got: `${prastInStudent}/${prastStretch.length}`, ok: prastInStudent === prastStretch.length });

// Överlappet i ett rutnät (2,37 m, så att inga provpunkter hamnar på en gräns).
let overlap = 0, samples = 0;
const area = {};
for (let x = -200; x < 700; x += 2.37) for (let z = -300; z < 400; z += 2.37) {
  const ins = Object.keys(polys).filter((k) => pointInPoly(x, z, polys[k].poly));
  samples++;
  if (ins.length > 1) overlap++;
  for (const k of ins) area[k] = (area[k] ?? 0) + 2.37 * 2.37;
}

const report = {
  order: '332 D',
  source: 'src/strategic/content/districtBorders.ts buildDistrictPolys på grythyttan-world.json roads (samma som content/districts.ts)',
  districts: Object.fromEntries(Object.entries(polys).map(([id, d]) => [id, {
    name: NAMES[id], labelAt: d.labelAt, areaM2: Math.round(area[id] ?? 0), streetM: Math.round(d.streetM), gapM: Math.round(d.gapM), maxOffRoadM: +d.maxOffRoadM.toFixed(2),
    legs: DISTRICT_BORDERS[id].legs.map((l) => ('way' in l ? { street: l.name, way: l.way } : { gap: l.gap })),
    poly: d.poly.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)])
  }])),
  checks,
  allChecksOk: checks.every((c) => c.ok),
  overlap: { samples, overlapping: overlap, gridM: 2.37 }
};
writeFileSync(resolve(OUT, 'kvarteren.json'), JSON.stringify(report, null, 2));

// ---------- bilden ----------
const X0 = -170, X1 = 680, Z0 = -260, Z1 = 380, S = 1.7;
const W = Math.round((X1 - X0) * S), H = Math.round((Z1 - Z0) * S) + 70;
const px = (p) => `${((p[0] - X0) * S).toFixed(1)},${((p[1] - Z0) * S).toFixed(1)}`;
const path = (poly, close) => 'M' + poly.map(px).join('L') + (close ? 'Z' : '');
const inView = (poly) => poly.some((p) => p[0] > X0 - 50 && p[0] < X1 + 50 && p[1] > Z0 - 50 && p[1] < Z1 + 50);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`);
svg.push(`<rect width="${W}" height="${H}" fill="#f3efe6"/>`);
for (const f of world.forest ?? []) if (inView(f.poly)) svg.push(`<path d="${path(f.poly, true)}" fill="#dfe6d3"/>`);
for (const w of world.water) if (inView(w.poly)) svg.push(`<path d="${path(w.poly, true)}" fill="#a9c8e0" stroke="#7fa7c6" stroke-width="1"/>`);
for (const [id, d] of Object.entries(polys)) svg.push(`<path d="${path(d.poly, true)}" fill="${COLOURS[id]}" fill-opacity="0.2" stroke="${COLOURS[id]}" stroke-width="4" stroke-opacity="0.9" stroke-linejoin="round"/>`);
for (const r of world.roads) if (inView(r.poly)) {
  const major = r.kind === 'secondary' || r.kind === 'tertiary' || r.kind === 'primary';
  svg.push(`<path d="${path(r.poly, false)}" fill="none" stroke="${r.car ? '#8a8378' : '#b3aa9a'}" stroke-width="${major ? 3 : r.car ? 2 : 1}" ${r.car ? '' : 'stroke-dasharray="3 3"'} stroke-linecap="round"/>`);
}
for (const b of world.buildings) if (inView(b.poly)) {
  const player = b.id === 'w869907975';
  svg.push(`<path d="${path(b.poly, true)}" fill="${player ? '#e8b93a' : '#b9ad99'}" stroke="${player ? '#7a5a10' : '#8f8370'}" stroke-width="${player ? 2 : 0.6}"/>`);
}
// Gatunamnen: ett per namn, vid den längsta biten i bild.
const named = new Map();
for (const r of world.roads) {
  const name = r.name ?? (r.ref === '244' ? 'Hälleforsvägen (Rv 244)' : null);
  if (!name || !inView(r.poly)) continue;
  const len = r.poly.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - r.poly[i - 1][0], p[1] - r.poly[i - 1][1]) : 0), 0);
  if ((named.get(name)?.len ?? 0) < len) named.set(name, { r, len });
}
for (const [name, { r }] of named) {
  const i = Math.floor((r.poly.length - 1) / 2), a = r.poly[i], b = r.poly[i + 1] ?? a;
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (m[0] < X0 || m[0] > X1 || m[1] < Z0 || m[1] > Z1) continue;
  let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
  const [x, y] = px(m).split(',');
  svg.push(`<text x="${x}" y="${y}" transform="rotate(${ang.toFixed(1)} ${x} ${y})" text-anchor="middle" dy="-4" font-size="11" fill="#3b342d" stroke="#f3efe6" stroke-width="3" paint-order="stroke">${esc(name)}</text>`);
}
for (const s of Object.values(TRUCK_SPOTS)) {
  const [x, y] = px(s.C).split(',');
  svg.push(`<rect x="${+x - 7}" y="${+y - 7}" width="14" height="14" fill="#2c4f86" stroke="#fff" stroke-width="2" transform="rotate(45 ${x} ${y})"/>`);
  svg.push(`<text x="${+x + 11}" y="${+y + 4}" font-size="11" font-weight="700" fill="#2c4f86" stroke="#f3efe6" stroke-width="3" paint-order="stroke">vagnen: ${esc(s.id)}</text>`);
}
{
  const c = centroid(bld('w869907975').poly), [x, y] = px(c).split(',');
  svg.push(`<text x="${+x + 10}" y="${+y - 10}" font-size="11" font-weight="700" fill="#7a5a10" stroke="#f3efe6" stroke-width="3" paint-order="stroke">spelarens krog</text>`);
}
for (const [id, d] of Object.entries(polys)) {
  const [x, y] = px(d.labelAt).split(',');
  svg.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="20" font-weight="800" letter-spacing="2" fill="${COLOURS[id]}" stroke="#f3efe6" stroke-width="5" paint-order="stroke">${esc(NAMES[id].toUpperCase())}</text>`);
}
svg.push(`<text x="12" y="${H - 44}" font-size="13" fill="#3b342d">ORDER 332 D — förslag: kvarterens gränser efter gatorna (mittlinjerna i grythyttan-world.json). Norr upp, 1 px = ${(1 / S).toFixed(2)} m.</text>`);
svg.push(`<text x="12" y="${H - 26}" font-size="13" fill="#3b342d">Raka bitar utan gata: Sjögatan–Lokavägen 70 m, Kolargatan–Rv 244 22 m, och kartans kant öster om campus och söder om sjön. Romb = vagnens plats.</text>`);
svg.push(`<text x="12" y="${H - 8}" font-size="13" fill="#3b342d">Kontroller: ${checks.filter((c) => c.ok).length}/${checks.length} i rätt kvarter, överlapp ${overlap} av ${samples} provpunkter (reports/order332/kvarteren.json).</text>`);
svg.push('</svg>');
writeFileSync(resolve(OUT, 'kvarteren.svg'), svg.join('\n'));

if (!process.env.SKIP_PNG) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<html><body style="margin:0">${svg.join('\n')}</body></html>`);
  await page.screenshot({ path: resolve(OUT, 'kvarteren.png'), clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
}
console.log(JSON.stringify({ allChecksOk: report.allChecksOk, overlap: report.overlap, checks: checks.map((c) => `${c.ok ? 'ok ' : 'FEL'} ${c.what}: ${c.got}`) }, null, 2));
