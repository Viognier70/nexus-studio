// ORDER 059 diagnostic — for every eligible building, print
// wallTopY, vaningar, sockelH and polygon winding sign. Buildings
// where walls "aren't visible" but windows are should have all
// sensible values for §1 + §3 (my code paths cannot produce a
// non-empty wallGeos array with NaN or zero-height walls unless
// vaningar is zero, which it never is). Winding sign is what §
// isn't in the list but is my working hypothesis: an OSM polygon
// in CW winding produces inward-facing wall normals, and three.js
// backface culling hides them.

import { readFileSync } from 'node:fs';

const raw = JSON.parse(
  readFileSync('frontend/src/strategic/data/grythyttan-world.json', 'utf8')
);

const ELIGIBLE = new Set(['house', 'detached', 'residential', 'apartments']);

// FNV-1a same as paramsFor
function hash32(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function stream(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n ^ (n >>> 15), 0x2c1b3c6d) >>> 0) ^ (n >>> 12);
    n = (Math.imul(n ^ (n << 3), 0x297a2d39) >>> 0) ^ (n >>> 7);
    return (n >>> 0) / 4294967296;
  };
}
function pick(rng, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
  return entries[entries.length - 1][0];
}
function pickRange(rng, a, b) { return a + rng() * (b - a); }

// Reproduce paramsFor's vaningar + sockel picks (same order as
// paramsFor calls its rng — critical for determinism).
function reproduceParams(osmId) {
  const rng = stream(hash32(osmId));
  const KULOR = [['falurod',0.68],['ockragul',0.14],['vit',0.13],['ljusgra',0.05]];
  const PANEL = [['locklist',0.55],['staende',0.30],['liggande',0.15]];
  const VAN = [[1,0.30],[1.5,0.35],[2,0.35]];
  const TT = [['tegel',0.72],['plat',0.22],['tjarpapp',0.06]];
  const KN = [['vit',0.82],['omalad',0.18]];
  const SOCK = [['grasten',0.62],['puts',0.28],['ingen',0.10]];
  const FT = [['korspost',0.55],['tvaluft',0.30],['enluft',0.15]];
  pick(rng, KULOR);
  pick(rng, PANEL);
  const vaningar = pick(rng, VAN);
  const raw = pickRange(rng, 22, 45);
  pick(rng, TT);
  pick(rng, KN);
  const sockel = pick(rng, SOCK);
  pickRange(rng, 0.20, 0.35);
  pick(rng, FT);
  void raw;
  return { vaningar, sockel };
}

// Signed area (shoelace, in XZ plane). CCW → positive, CW → negative.
function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
}

const SOCKELHOJD_M = 0.35;
const VANINGSHOJD_M = 2.70;

const eligible = raw.buildings.filter(b => ELIGIBLE.has(b.kind));

let ccwCount = 0, cwCount = 0, zeroCount = 0;
let minWallTop = Infinity, maxWallTop = -Infinity;
let nanCount = 0, zeroWallTop = 0;
const cwHouses = [];

for (const b of eligible) {
  const { vaningar, sockel } = reproduceParams(b.id);
  const sockelH = sockel === 'ingen' ? 0 : SOCKELHOJD_M;
  const wallTopY = vaningar * VANINGSHOJD_M + sockelH;
  const area = signedArea(b.poly);
  if (!Number.isFinite(wallTopY)) nanCount++;
  if (wallTopY === 0) zeroWallTop++;
  if (wallTopY < minWallTop) minWallTop = wallTopY;
  if (wallTopY > maxWallTop) maxWallTop = wallTopY;
  if (Math.abs(area) < 1e-6) zeroCount++;
  else if (area > 0) ccwCount++;
  else {
    cwCount++;
    cwHouses.push({ id: b.id, kind: b.kind, area, vaningar, sockel, wallTopY });
  }
}

console.log(`Total eligible: ${eligible.length}`);
console.log(`\n§1 wallTopY range: ${minWallTop.toFixed(2)} .. ${maxWallTop.toFixed(2)} m`);
console.log(`  NaN: ${nanCount}  Zero: ${zeroWallTop}`);
console.log(`\nPolygon winding:`);
console.log(`  CCW (positive area): ${ccwCount}`);
console.log(`  CW  (negative area): ${cwCount}   ← wall normals point INWARD, backface culled`);
console.log(`  Degenerate (zero area): ${zeroCount}`);

if (cwHouses.length > 0) {
  console.log(`\nFirst 15 CW (hypothesised invisible-wall) houses:`);
  console.log(`  ${'id'.padEnd(20)} ${'kind'.padEnd(12)}  area (m²)   vaningar  sockel     wallTopY   centroid`);
  for (const h of cwHouses.slice(0, 15)) {
    const b = eligible.find(bb => bb.id === h.id);
    let cx = 0, cz = 0;
    for (const [x, z] of b.poly) { cx += x; cz += z; }
    cx /= b.poly.length; cz /= b.poly.length;
    console.log(
      `  ${h.id.padEnd(20)} ${h.kind.padEnd(12)}  ${Math.abs(h.area).toFixed(0).padStart(6)}  ${String(h.vaningar).padStart(8)}  ${h.sockel.padEnd(8)}  ${h.wallTopY.toFixed(2).padStart(5)} m   (${cx.toFixed(0)}, ${cz.toFixed(0)})`
    );
  }
}
