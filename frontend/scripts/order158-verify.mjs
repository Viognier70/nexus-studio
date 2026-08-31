#!/usr/bin/env node
// ORDER 158 — mät byggnad-vs-vägenvelope före och efter polygon-guarden.
//
// DoD 2: samma envelope-geometri som ORDER 135 mätte. Vi lånar ORDER
// 135:s ROLE_SPECS-tabell + envelope-formel (width + 2×sidewalkWidth).
// Sedan replikeras guarden (samma clipPolylineForVehicles-strategi
// som OsmRoads.tsx importerar) mot samma polylines. Baseline = utan
// klipp; after = med klipp. Rapporten redovisar collision-antal före
// och efter, plus vad som händer per polylinie (bruten i N delar,
// bruten mitt i, försvunnen helt).
//
// DoD 3 (vägnätet är intakt): för varje rå polylinie mätter vi hur
// många sub-pieces guarden producerar. En polylinie som fanns med
// > 0 pieces före guarden ska ha ≥ 1 piece efter (annars är den helt
// borta), och vi räknar totalen renderade segment före/efter.
//
// DoD 4 (sammanhängande gator): en polylinie där guarden droppar en
// mittsektion får 2+ pieces. Vi separerar per fall — 1-piece klipp
// (kortare men obruten gata) vs. 2+-pieces klipp (gata med hål).
//
// Ingen kod från src/ körs — replikering per CLAUDE.md "Mätningar mot
// det de beskriver": mätningen dokumenterar avvikelsen och sanning
// hämtas från samma logik som renderingen (kopia här, samma numeriska
// definition).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order158');
mkdirSync(REPORT_DIR, { recursive: true });

const WORLD_JSON_PATH = resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json');

// -------- ROLE_SPECS-kopia (samma som ORDER 135) ------------------

const ROLE_SPECS = {
  primary:             { width: 10.0, sidewalkWidth: 1.6 },
  main:                { width: 9.0,  sidewalkWidth: 1.5 },
  secondary_connector: { width: 6.2,  sidewalkWidth: 1.2 },
  local_street:        { width: 5.0,  sidewalkWidth: 1.0 },
  village_street:      { width: 4.6,  sidewalkWidth: 0.9 },
  residential:         { width: 3.6,  sidewalkWidth: 0 },
  service:             { width: 2.8,  sidewalkWidth: 0 },
  track:               { width: 2.4,  sidewalkWidth: 0 },
  cycleway:            { width: 2.0,  sidewalkWidth: 0 },
  footpath:            { width: 1.3,  sidewalkWidth: 0 }
};

const VILLAGE_STREET_NAMES = new Set([
  'Prästgatan', 'Torget', 'Kyrkbacken',
  'Norra Bergvägen', 'Östra Bergvägen', 'Västra Bergvägen',
  'Nygatan', 'Östergatan', 'Hantverksgatan', 'Sjögatan',
  'Hyttgatan', 'Kolargatan',
  'Stationsgatan', 'Magasinsgatan', 'Järnvägsgatan', 'Stallgatan',
  'Skolgatan', 'Kyrkogårdsgatan', 'Artur Lindqvists gata',
  'Hammargatan', 'Bergslagsgatan', 'Närkesgatan', 'Skiffergatan',
  'Badvägen', 'Gruvgatan'
]);

const PRIMARY_ROAD_REFS = new Set(['244']);

// Ytor som skiljer från sidewalk-tier per OsmRoads.UNPAVED_SURFACES.
const UNPAVED_SURFACES = new Set([
  'unpaved', 'compacted', 'gravel', 'fine_gravel',
  'ground', 'dirt', 'grass', 'mud', 'sand'
]);

function roleFor(road) {
  if (road.ref && PRIMARY_ROAD_REFS.has(road.ref)) return 'primary';
  switch (road.kind) {
    case 'motorway': case 'trunk': return 'primary';
    case 'primary': case 'secondary': return 'main';
    case 'tertiary': return 'secondary_connector';
    case 'unclassified': return 'local_street';
    case 'residential':
    case 'living_street':
      if (road.name && VILLAGE_STREET_NAMES.has(road.name)) return 'village_street';
      return 'residential';
    case 'service': return 'service';
    case 'track': return 'track';
    case 'cycleway': return 'cycleway';
    case 'footway': case 'path': case 'steps':
    case 'pedestrian': case 'platform':
      return 'footpath';
    default: return 'local_street';
  }
}

function envelopeHalf(road) {
  const role = roleFor(road);
  const s = ROLE_SPECS[role];
  const isUnpaved = road.surface != null && UNPAVED_SURFACES.has(road.surface);
  return s.width / 2 + (isUnpaved ? 0 : s.sidewalkWidth);
}

// -------- geometri --------

function distanceToSegment(ax, az, bx, bz, px, pz) {
  const dx = bx - ax, dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
function distanceToPolygon(poly, x, z) {
  let m = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distanceToSegment(poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1], x, z);
    if (d < m) m = d;
  }
  return m;
}
function inside(polygon, x, z) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) hit = !hit;
  }
  return hit;
}
function polygonBounds(poly) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}
function segmentsIntersect(a1, a2, b1, b2) {
  const [x1, y1] = a1, [x2, y2] = a2, [x3, y3] = b1, [x4, y4] = b2;
  const d1 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d2 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  const d3 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d4 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}
function polygonCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; n++; }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

// -------- klipp-replikering (samma som procgen/geom.ts) ---------

function clipPolylineForVehicles(poly, clearanceM, stepM = 1.0, bufferM = 0.5, buildings) {
  if (poly.length < 2) return [];
  const seg = [];
  let total = 0;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > 0) { seg.push({ a, b, len: l }); total += l; }
  }
  if (total === 0) return [];
  const n = Math.max(2, Math.ceil(total / stepM));

  const insideOrNear = (x, z) => {
    for (const b of buildings) {
      if (b.poly.length < 3) continue;
      const bb = polygonBounds(b.poly);
      if (
        x < bb.minX - clearanceM || x > bb.maxX + clearanceM ||
        z < bb.minZ - clearanceM || z > bb.maxZ + clearanceM
      ) continue;
      if (inside(b.poly, x, z)) return true;
      if (distanceToPolygon(b.poly, x, z) < clearanceM) return true;
    }
    return false;
  };

  const samples = [];
  for (let k = 0; k < n; k++) {
    const target = (k / (n - 1)) * total;
    let acc = 0;
    for (const s of seg) {
      if (acc + s.len >= target || s === seg[seg.length - 1]) {
        const f = (target - acc) / Math.max(1e-9, s.len);
        const x = s.a[0] + f * (s.b[0] - s.a[0]);
        const z = s.a[1] + f * (s.b[1] - s.a[1]);
        samples.push({ x, z, safe: !insideOrNear(x, z) });
        break;
      }
      acc += s.len;
    }
  }

  const runs = [];
  let current = [];
  const bufferSteps = Math.max(1, Math.round(bufferM / stepM));
  for (const s of samples) {
    if (s.safe) current.push([s.x, s.z]);
    else if (current.length > 0) {
      const trimmed = current.slice(0, Math.max(0, current.length - bufferSteps));
      if (trimmed.length >= 2) runs.push(trimmed);
      current = [];
    }
  }
  if (current.length >= 2) runs.push(current);
  return runs;
}

// -------- kollisions-detektor mot envelope (ORDER 135 stil) ------

function collideRoads(buildings, roads) {
  const hits = [];
  for (const b of buildings) {
    let worstOverlap = 0;
    const bhits = [];
    for (const r of roads) {
      if (r.poly.length < 2) continue;
      const halfW = envelopeHalf(r);
      let vertexIn = false;
      let wOv = 0;
      for (let i = 0; i < b.poly.length - 1; i++) {
        const dv = distanceToPolygon(r.poly, b.poly[i][0], b.poly[i][1]);
        if (dv < halfW) {
          vertexIn = true;
          const ov = halfW - dv;
          if (ov > wOv) wOv = ov;
        }
      }
      let roadVertexIn = false;
      for (let i = 0; i < r.poly.length; i++) {
        if (inside(b.poly, r.poly[i][0], r.poly[i][1])) { roadVertexIn = true; break; }
      }
      let edgeX = false;
      outer: for (let i = 0; i < b.poly.length - 1; i++) {
        for (let j = 0; j < r.poly.length - 1; j++) {
          if (segmentsIntersect(b.poly[i], b.poly[i + 1], r.poly[j], r.poly[j + 1])) { edgeX = true; break outer; }
        }
      }
      if (vertexIn || roadVertexIn || edgeX) {
        if (wOv > worstOverlap) worstOverlap = wOv;
        bhits.push({
          roadId: r.id, roadKind: r.kind, roadName: r.name || null,
          role: roleFor(r), envelopeHalf: Number(halfW.toFixed(2)),
          worstOverlap: Number(wOv.toFixed(3))
        });
      }
    }
    if (bhits.length > 0) {
      hits.push({
        buildingId: b.id, buildingKind: b.kind, buildingName: b.name || null,
        centre: polygonCentroid(b.poly).map((v) => Number(v.toFixed(2))),
        worstOverlap: Number(worstOverlap.toFixed(3)),
        hits: bhits
      });
    }
  }
  return hits;
}

// -------- CLIPPED_ROADS-replikering (world.ts:372) ---------------
// Vi replikerar clipPolylineAgainstBuildings så att baselinen matchar
// vad OsmRoads faktiskt tar emot (inte råa WORLD.roads).

function segmentIntersection(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax, ry = by - ay;
  const sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { tA: t };
}
function clipPolylineAgainstBuildings(poly, buildings) {
  if (poly.length < 2) return [];
  const insideAnyBuilding = (x, z) => {
    for (const b of buildings) {
      if (b.poly.length < 3) continue;
      const bb = polygonBounds(b.poly);
      if (x < bb.minX || x > bb.maxX || z < bb.minZ || z > bb.maxZ) continue;
      if (inside(b.poly, x, z)) return true;
    }
    return false;
  };
  const result = [];
  let current = [];
  let openOutside = false;
  const flush = () => { if (current.length >= 2) result.push(current); current = []; openOutside = false; };
  const pushOutside = (x, z) => {
    const last = current[current.length - 1];
    if (!last || Math.abs(last[0] - x) > 1e-9 || Math.abs(last[1] - z) > 1e-9) current.push([x, z]);
  };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i]; const b = poly[i + 1];
    const minX = Math.min(a[0], b[0]); const maxX = Math.max(a[0], b[0]);
    const minZ = Math.min(a[1], b[1]); const maxZ = Math.max(a[1], b[1]);
    const ts = [0, 1];
    for (const bd of buildings) {
      if (bd.poly.length < 3) continue;
      const bb = polygonBounds(bd.poly);
      if (maxX < bb.minX || bb.maxX < minX) continue;
      if (maxZ < bb.minZ || bb.maxZ < minZ) continue;
      for (let j = 0; j < bd.poly.length - 1; j++) {
        const p1 = bd.poly[j], p2 = bd.poly[j + 1];
        const hit = segmentIntersection(a[0], a[1], b[0], b[1], p1[0], p1[1], p2[0], p2[1]);
        if (hit) ts.push(hit.tA);
      }
    }
    ts.sort((p, q) => p - q);
    const uniq = [ts[0]];
    for (let k = 1; k < ts.length; k++) if (ts[k] - uniq[uniq.length - 1] > 1e-6) uniq.push(ts[k]);
    for (let k = 0; k < uniq.length - 1; k++) {
      const t0 = uniq[k], t1 = uniq[k + 1];
      const mt = (t0 + t1) / 2;
      const mx = a[0] + mt * (b[0] - a[0]);
      const mz = a[1] + mt * (b[1] - a[1]);
      if (insideAnyBuilding(mx, mz)) { if (openOutside) flush(); continue; }
      const x0 = a[0] + t0 * (b[0] - a[0]); const z0 = a[1] + t0 * (b[1] - a[1]);
      const x1 = a[0] + t1 * (b[0] - a[0]); const z1 = a[1] + t1 * (b[1] - a[1]);
      if (!openOutside) { current.push([x0, z0]); openOutside = true; }
      else pushOutside(x0, z0);
      pushOutside(x1, z1);
    }
  }
  flush();
  return result;
}

// -------- huvudflöde --------

const worldRaw = JSON.parse(readFileSync(WORLD_JSON_PATH, 'utf8'));
const buildings = worldRaw.buildings;
const rawRoads = worldRaw.roads;

// Steg 1: baseline = CLIPPED_ROADS (centreline-klipp mot polygon-edge).
// Detta är exakt vad OsmRoads.tsx tar emot idag.
const baselineRoads = [];
for (const road of rawRoads) {
  if (road.poly.length < 2) continue;
  const pieces = clipPolylineAgainstBuildings(road.poly, buildings);
  if (pieces.length === 0) continue;
  pieces.forEach((piece, idx) => {
    baselineRoads.push({
      ...road,
      id: idx === 0 ? road.id : `${road.id}#p${idx}`,
      poly: piece
    });
  });
}

// Steg 2: efter guarden = CLIPPED_ROADS + envelope-klipp per road.
const afterRoads = [];
const perRawRoadEffect = new Map(); // parent id → { role, before, pieces, splits }
for (const road of baselineRoads) {
  const half = envelopeHalf(road);
  const pieces = clipPolylineForVehicles(road.poly, half, 1.0, 0.5, buildings);
  const parentId = road.id.split('#')[0];
  const existing = perRawRoadEffect.get(parentId) ?? {
    role: roleFor(road), baselineSegments: 0, afterSegments: 0, splits: [],
    name: road.name || null, kind: road.kind
  };
  existing.baselineSegments += 1;
  existing.afterSegments += pieces.length;
  if (pieces.length !== 1) existing.splits.push({ pieceId: road.id, pieces: pieces.length });
  perRawRoadEffect.set(parentId, existing);
  pieces.forEach((piece, idx) => {
    afterRoads.push({
      ...road,
      id: idx === 0 ? road.id : `${road.id}#e${idx}`,
      poly: piece
    });
  });
}

// Steg 3: kollisions-detektering.
const hitsBefore = collideRoads(buildings, baselineRoads);
const hitsAfter = collideRoads(buildings, afterRoads);

// Steg 4: analys av vad guarden gjorde per polylinie.
let disappearedCount = 0;
let splitCount = 0;              // en polylinie som blev >1 delar (hål i gata)
let shortenedCount = 0;          // en polylinie som blev exakt 1 del men kortare
let untouchedCount = 0;          // en polylinie som inte påverkades
const disappeared = [];
const splits = [];               // fall där guarden delade upp
const shortened = [];            // fall där guarden bara kortade
for (const [parentId, eff] of perRawRoadEffect) {
  if (eff.afterSegments === 0) {
    disappearedCount += 1;
    disappeared.push({ parentId, role: eff.role, name: eff.name, kind: eff.kind });
  } else if (eff.afterSegments > eff.baselineSegments) {
    splitCount += 1;
    splits.push({ parentId, role: eff.role, name: eff.name, kind: eff.kind,
                  before: eff.baselineSegments, after: eff.afterSegments });
  } else if (eff.baselineSegments === eff.afterSegments) {
    // Samma antal segment — men kan vara kortade (bufferM inset).
    // Vi räknar det som "untouched or minor" utan att distinguisha finare.
    untouchedCount += 1;
  } else {
    shortenedCount += 1;
    shortened.push({ parentId, role: eff.role, name: eff.name, kind: eff.kind });
  }
}

const summary = {
  buildingsTotal: buildings.length,
  rawRoadsTotal: rawRoads.length,
  baselineRoadPieces: baselineRoads.length,
  afterRoadPieces: afterRoads.length,
  collisionsBefore: hitsBefore.length,
  collisionsAfter: hitsAfter.length,
  worstOverlapBefore: hitsBefore.length ? Math.max(...hitsBefore.map((h) => h.worstOverlap)) : 0,
  worstOverlapAfter: hitsAfter.length ? Math.max(...hitsAfter.map((h) => h.worstOverlap)) : 0,
  rawRoadsDisappeared: disappearedCount,
  rawRoadsSplit: splitCount,
  rawRoadsShortened: shortenedCount,
  rawRoadsUntouched: untouchedCount
};

writeFileSync(
  resolve(REPORT_DIR, 'guardVerify.json'),
  JSON.stringify({
    summary,
    disappeared,
    splits: splits.slice(0, 40),
    hitsBefore,
    hitsAfter
  }, null, 2)
);

console.log('=== ORDER 158 — polygon-guard verifiering ===\n');
console.log('DoD 2 (samma envelope-geometri som ORDER 135):');
console.log(`  Baseline (CLIPPED_ROADS, ingen envelope-guard):`);
console.log(`    ${hitsBefore.length} byggnader kolliderar   worst=${summary.worstOverlapBefore.toFixed(2)} m`);
console.log(`  After (CLIPPED_ROADS + ORDER 158-guarden):`);
console.log(`    ${hitsAfter.length} byggnader kolliderar   worst=${summary.worstOverlapAfter.toFixed(2)} m`);
console.log(`  Skillnad: ${hitsBefore.length - hitsAfter.length} byggnader befriade`);
console.log('');
console.log('DoD 3 (vägnätet intakt):');
console.log(`  Renderade vägdelar före guard:  ${baselineRoads.length}`);
console.log(`  Renderade vägdelar efter guard: ${afterRoads.length}`);
console.log(`  Rå polylines som försvann helt: ${disappearedCount}`);
if (disappearedCount > 0) {
  console.log('  → FEL: en rå polylinie ska aldrig försvinna helt.');
  console.log('  →      Rapportera dessa till Vision Owner:');
  for (const d of disappeared) console.log(`    ${d.parentId} (role=${d.role}, name=${d.name || '-'})`);
}
console.log('');
console.log('DoD 4 (sammanhängande gator — hål eller bara kortare?):');
console.log(`  Split (>1 delar — HÅL i gatan): ${splitCount}`);
console.log(`  Bara kortare (1 del):           ${shortenedCount}`);
console.log(`  Orörda:                         ${untouchedCount}`);
if (splits.length > 0) {
  console.log('');
  console.log(`  Topp ${Math.min(15, splits.length)} split-fall (rå polyline → N delar):`);
  splits
    .sort((a, b) => b.after - a.after)
    .slice(0, 15)
    .forEach((s) => {
      console.log(`    ${s.parentId.padEnd(24)} role=${s.role.padEnd(20)} ${s.before}→${s.after}   ${s.name || '-'}`);
    });
}
console.log('');
console.log(`Rapport: ${resolve(REPORT_DIR, 'guardVerify.json')}`);
