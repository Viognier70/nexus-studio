// Diagnostic: enumerate every eligible facade footprint and classify
// by shape. Reports vertex count, near-rectangular flag, and cases
// where buildFacade would produce zero walls (which explains the
// "red-roof house with no walls" bug).

import { readFileSync } from 'node:fs';

const raw = JSON.parse(
  readFileSync('frontend/src/strategic/data/grythyttan-world.json', 'utf8')
);

const ELIGIBLE = new Set(['house', 'detached', 'residential', 'apartments']);

// Same split rule as strategic/content/world.ts:154 so we count the
// polygons the game actually sees.
const SPLIT_MAX_EDGE_M = 25;
const SPLIT_AREA_BBOX_RATIO = 0.6;

function polygonArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    sum += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  }
  return Math.abs(sum) / 2;
}

// Angle at vertex i (radians, interior angle), between edges (i-1→i)
// and (i→i+1).
function interiorAngle(poly, i) {
  const n = poly.length;
  const prev = poly[(i - 1 + n) % n];
  const curr = poly[i];
  const next = poly[(i + 1) % n];
  const ax = prev[0] - curr[0], az = prev[1] - curr[1];
  const bx = next[0] - curr[0], bz = next[1] - curr[1];
  const dot = ax * bx + az * bz;
  const cross = ax * bz - az * bx;
  return Math.atan2(Math.abs(cross), dot);
}

function classify(poly) {
  // Drop the closing-duplicate vertex if present (some OSM polygons
  // repeat the first vertex at the end).
  let p = poly;
  if (
    p.length >= 2 &&
    p[0][0] === p[p.length - 1][0] &&
    p[0][1] === p[p.length - 1][1]
  ) {
    p = p.slice(0, -1);
  }
  const n = p.length;
  if (n < 3) return { n, kind: 'degenerate (<3 verts)' };

  // Count edges above and below the min-len threshold used by
  // buildFacade (0.05 m); a polygon whose edges are all skipped
  // produces zero walls.
  let usableEdges = 0;
  for (let i = 0; i < n; i++) {
    const a = p[i];
    const b = p[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= 0.05) usableEdges += 1;
  }
  if (usableEdges === 0) return { n, kind: 'no usable edges' };

  // Rectangle test: 4 vertices AND all interior angles within 5° of 90°.
  const RIGHT = Math.PI / 2;
  const TOL = 5 * Math.PI / 180;
  if (n === 4) {
    let rect = true;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(interiorAngle(p, i) - RIGHT) > TOL) { rect = false; break; }
    }
    if (rect) return { n, kind: 'rectangle' };
    return { n, kind: '4-vert non-rectangle (quad)' };
  }
  return { n, kind: `${n}-vert polygon` };
}

// Rerun the world.ts split rule so we count what the game sees.
function polySplit(b) {
  if (b.poly.length < 4) return [b];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of b.poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const bboxArea = Math.max(1, (maxX - minX) * (maxZ - minZ));
  const ratio = polygonArea(b.poly) / bboxArea;
  if (ratio >= SPLIT_AREA_BBOX_RATIO) return [b];
  // For simplicity of the diagnostic, don't actually split — just
  // note that the game *would* split. Counting the unsplit version
  // slightly overstates "complex polygon" count.
  return [b];
}

const eligible = [];
for (const b of raw.buildings) {
  if (!ELIGIBLE.has(b.kind ?? '')) continue;
  for (const part of polySplit(b)) eligible.push(part);
}

const buckets = {};
const zeroWallSuspects = [];
for (const b of eligible) {
  const c = classify(b.poly);
  const key = c.kind;
  buckets[key] = (buckets[key] || 0) + 1;
  if (key === 'degenerate (<3 verts)' || key === 'no usable edges') {
    zeroWallSuspects.push({ id: b.id, kind: b.kind, poly: b.poly });
  }
}

console.log(`\nEligible-for-ProceduralFacades buildings: ${eligible.length}`);
console.log('\nShape breakdown:');
const sortedBuckets = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
for (const [k, v] of sortedBuckets) {
  const pct = ((v / eligible.length) * 100).toFixed(1);
  console.log(`  ${v.toString().padStart(4, ' ')}  ${pct.padStart(5, ' ')}%   ${k}`);
}

// Rectangular vs not
const rectCount = buckets['rectangle'] ?? 0;
const nonRect = eligible.length - rectCount;
console.log(
  `\nRectangular: ${rectCount} / ${eligible.length}  (${((rectCount / eligible.length) * 100).toFixed(1)}%)`
);
console.log(
  `Non-rectangular: ${nonRect} / ${eligible.length}  (${((nonRect / eligible.length) * 100).toFixed(1)}%)`
);

if (zeroWallSuspects.length > 0) {
  console.log(`\nZero-wall suspects (${zeroWallSuspects.length}):`);
  for (const s of zeroWallSuspects) {
    console.log(`  ${s.id}  (kind=${s.kind})  poly=${JSON.stringify(s.poly)}`);
  }
}

// Also dump the SE-of-torget candidates so we can identify the
// "red roof no walls" building the Vision Owner sighted.
// Torget centroid approximation: (0, 0) is not usable without the
// actual layout; instead, list the largest houses so the sighted one
// is likely in the list.
console.log('\nBig eligible houses (>150 m², may include the sighted one):');
const withArea = eligible.map((b) => ({
  id: b.id,
  kind: b.kind,
  area: polygonArea(b.poly),
  vertexCount: b.poly.length
}));
withArea
  .filter((b) => b.area > 150)
  .sort((a, b) => b.area - a.area)
  .slice(0, 15)
  .forEach((b) => console.log(`  ${b.id.padEnd(14)}  ${b.kind.padEnd(12)}  ${b.area.toFixed(0).padStart(5)} m²  verts=${b.vertexCount}`));
