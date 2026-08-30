#!/usr/bin/env node
// ORDER 132 §4-punkt 2/3 — verifiering av polygon-guarden.
//
// ORDER 130:s `order130-map-measurements.mjs` mäter det UNGUARDED
// resultatet av `windowsFor()` och rapporterade 3 156 fönster utanför
// polygonen på 297/338 hus. Denna script replikerar produktionens
// guard (OsmBuildings.tsx `inFootprint` — `inside(poly, x, z)`) mot
// samma input, och visar N_genererade → N_kvar → N_droppade.
//
// Sanning: samma inside()-test som mätskriptet använder är också
// guarden. Om båda gör samma sak ska antalet droppade fönster vara
// exakt lika stort som antalet ORDER 130 rapporterade som "utanför".
// Om siffran avviker är antingen guarden fel eller mätningen fel.
//
// Kör om:  node frontend/scripts/order132-verify.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order132');
mkdirSync(REPORT_DIR, { recursive: true });

const WORLD_JSON_PATH = resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json');

// -------- geometry (replika av procgen/geom.ts, samma som ORDER 130) --------

function polygonCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; n++; }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

function orientedBbox(poly) {
  let bestLen = 0, angle = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i][0] - poly[i - 1][0];
    const dz = poly[i][1] - poly[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (l > bestLen) { bestLen = l; angle = Math.atan2(dz, dx); }
  }
  const centre = polygonCentroid(poly);
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of poly) {
    const u = (x - centre[0]) * cos - (z - centre[1]) * sin;
    const v = (x - centre[0]) * sin + (z - centre[1]) * cos;
    if (u < minU) minU = u; if (u > maxU) maxU = u;
    if (v < minV) minV = v; if (v > maxV) maxV = v;
  }
  return { centre, w: maxU - minU, d: maxV - minV, angle };
}

function inside(polygon, x, z) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) hit = !hit;
  }
  return hit;
}

// -------- windowsFor XZ-projektion (samma som OsmBuildings.tsx) --------

function windowsForXZ(obb) {
  const { centre, w: rw, d: rd, angle: ridgeAngle } = obb;
  const angle = -ridgeAngle;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const halfD = rd / 2 - 0.03;
  const halfW = rw / 2 - 0.03;
  const longBays = Math.max(2, Math.min(8, Math.round(rw / 3.2)));
  const shortBays = Math.max(1, Math.min(4, Math.round(rd / 3.2)));
  const longSpan = rw - 1.8;
  const shortSpan = rd - 1.8;
  const longXs = [];
  for (let i = 0; i < longBays; i++) {
    longXs.push(-longSpan / 2 + (i * longSpan) / Math.max(1, longBays - 1));
  }
  const shortZs = [];
  for (let i = 0; i < shortBays; i++) {
    shortZs.push(-shortSpan / 2 + (i * shortSpan) / Math.max(1, shortBays - 1));
  }
  const project = (lx, lz) => [
    centre[0] + lx * cos - lz * sin,
    centre[1] + lx * sin + lz * cos
  ];
  const out = [];
  for (const lx of longXs) out.push(project(lx, halfD));
  for (const lx of longXs) out.push(project(lx, -halfD));
  for (const lz of shortZs) out.push(project(halfW, lz));
  for (const lz of shortZs) out.push(project(-halfW, lz));
  return out;
}

// -------- mätning --------

const worldRaw = JSON.parse(readFileSync(WORLD_JSON_PATH, 'utf8'));
// Samma urval som OsmBuildings-renderaren gör: bara byggnader vars
// `kind` finns i WINDOW_KINDS (rad 1258 i OsmBuildings.tsx) genererar
// fönster i produktion. Övriga hade noll fönster genererade även utan
// guarden — de får inte räknas som "droppade" i mätningen.
const WINDOW_KINDS = new Set([
  'house', 'detached', 'residential', 'apartments',
  'hotel', 'school', 'university', 'train_station',
  'commercial'
]);
const buildings = worldRaw.buildings.filter((b) => WINDOW_KINDS.has(b.kind));

let genTotal = 0;
let keptTotal = 0;
let droppedTotal = 0;
let buildingsWithAllDropped = 0;
let buildingsWithSomeDropped = 0;
let buildingsUntouched = 0;

const perBuilding = [];

for (const b of buildings) {
  if (b.poly.length < 4) continue;
  const obb = orientedBbox(b.poly);
  const wins = windowsForXZ(obb);
  const gen = wins.length;
  let kept = 0;
  for (const p of wins) if (inside(b.poly, p[0], p[1])) kept++;
  const dropped = gen - kept;
  genTotal += gen;
  keptTotal += kept;
  droppedTotal += dropped;
  if (dropped === gen && gen > 0) buildingsWithAllDropped++;
  else if (dropped > 0) buildingsWithSomeDropped++;
  else buildingsUntouched++;
  if (dropped > 0) {
    perBuilding.push({
      id: b.id,
      kind: b.kind,
      generated: gen,
      kept,
      dropped
    });
  }
}

perBuilding.sort((a, b) => b.dropped - a.dropped);

const summary = {
  totalBuildings: buildings.length,
  generatedTotal: genTotal,
  keptTotal,
  droppedTotal,
  buildingsUntouched,
  buildingsWithSomeDropped,
  buildingsWithAllDropped,
  worstOffenders: perBuilding.slice(0, 10)
};

writeFileSync(
  resolve(REPORT_DIR, 'guardVerify.json'),
  JSON.stringify({ summary, perBuilding }, null, 2)
);

console.log('=== ORDER 132 — polygon-guard verifiering ===\n');
console.log(`Byggnader totalt:                     ${summary.totalBuildings}`);
console.log('');
console.log(`Fönster genererade (före guard):      ${summary.generatedTotal}`);
console.log(`Fönster kvar (efter guard):           ${summary.keptTotal}`);
console.log(`Fönster droppade (utanför polygon):   ${summary.droppedTotal}`);
console.log('');
console.log(`Byggnader utan droppade fönster:      ${summary.buildingsUntouched}`);
console.log(`Byggnader med några droppade:         ${summary.buildingsWithSomeDropped}`);
console.log(`Byggnader med ALLA droppade (varning):${summary.buildingsWithAllDropped}`);
console.log('');
console.log('Värsta 5 (flest droppade):');
for (const p of summary.worstOffenders.slice(0, 5)) {
  console.log(`  ${p.id.padEnd(14)} kind=${(p.kind || 'unknown').padEnd(15)} gen=${p.generated} kept=${p.kept} dropped=${p.dropped}`);
}
console.log('');
console.log(`Rapport: ${resolve(REPORT_DIR, 'guardVerify.json')}`);
