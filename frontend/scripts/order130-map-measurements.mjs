// ORDER 130 — kartan mäts.
//
// Två mätningar mot Grythyttans procedurella by:
//   1) Hus mot vägar. Byggnadsfootprints som skär vägars mittlinje
//      med vägbredden inräknad.
//   2) Fönster utanför fasad. `windowsFor()` i OsmBuildings placerar
//      fönster på OBB-facen (`ridgeW`/`ridgeD` etage). För icke-
//      rektangulära hus ligger OBB-facen delvis utanför den faktiska
//      polygonen — då hänger fönstret fritt i luften.
//
// Skriptet ändrar ingen geometri. Det läser JSON, kör en replikering
// av produktionens `orientedBbox` + `windowsFor` XZ-projektion i JS,
// och skriver mätresultat till `frontend/reports/order130/`.
//
// Ingen playwright, ingen dev-server, ingen react-runtime — mätningen
// är en ren datainspektion mot samma indata produktionens
// scenegenerator ser. Kör om det senare för att verifiera en rättelse:
//   node frontend/scripts/order130-map-measurements.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO = resolve(FRONTEND, '..');

const WORLD_JSON_PATH = resolve(
  FRONTEND,
  'src/strategic/data/grythyttan-world.json'
);
const REPORT_DIR = resolve(FRONTEND, 'reports/order130');

// -------- geometry primitives (replikat av src/strategic/procgen/geom.ts) --------

function polygonCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  // matches production: skips last vertex (closed poly convention)
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

function orientedBbox(poly) {
  // Rotate so the longest edge lies along local X, take AABB in that
  // frame. Same as `orientedBbox` in geom.ts:133.
  let bestLen = 0;
  let angle = 0;
  for (let i = 1; i < poly.length; i++) {
    const dx = poly[i][0] - poly[i - 1][0];
    const dz = poly[i][1] - poly[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (l > bestLen) {
      bestLen = l;
      angle = Math.atan2(dz, dx);
    }
  }
  const centre = polygonCentroid(poly);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of poly) {
    const u = (x - centre[0]) * cos - (z - centre[1]) * sin;
    const v = (x - centre[0]) * sin + (z - centre[1]) * cos;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
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

function distanceToSegment(ax, az, bx, bz, px, pz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function distanceToPolygonEdge(poly, x, z) {
  let m = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distanceToSegment(
      poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1], x, z
    );
    if (d < m) m = d;
  }
  return m;
}

// Signerad distans: negativt inuti, positivt utanför.
function signedDistanceOutward(poly, x, z) {
  const d = distanceToPolygonEdge(poly, x, z);
  return inside(poly, x, z) ? -d : d;
}

// Segment-segment shortest distance (endpoint-to-segment approximation
// gives correct result unless segments cross; separately test crossings).
function segmentsIntersect(a1, a2, b1, b2) {
  const [x1, y1] = a1, [x2, y2] = a2, [x3, y3] = b1, [x4, y4] = b2;
  const d1 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d2 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  const d3 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d4 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}

function segmentMinDistance(a1, a2, b1, b2) {
  if (segmentsIntersect(a1, a2, b1, b2)) return 0;
  return Math.min(
    distanceToSegment(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1]),
    distanceToSegment(a1[0], a1[1], a2[0], a2[1], b2[0], b2[1]),
    distanceToSegment(b1[0], b1[1], b2[0], b2[1], a1[0], a1[1]),
    distanceToSegment(b1[0], b1[1], b2[0], b2[1], a2[0], a2[1])
  );
}

// -------- replika av OsmBuildings.windowsFor() (XZ-positioner) --------
// Fokus: XZ-positionen på varje fönster. Höjden är irrelevant för
// "utanför fasad"-mätningen, bandet frågan är: ligger fönstrets
// XZ-punkt inuti byggnadens footprint?

function windowsForXZ(obb) {
  const { centre, w: rw, d: rd, angle: ridgeAngle } = obb;
  const angle = -ridgeAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
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
  // Long +Z face
  for (const lx of longXs) out.push({ face: 'long+Z', pos: project(lx, halfD) });
  // Long -Z face
  for (const lx of longXs) out.push({ face: 'long-Z', pos: project(lx, -halfD) });
  // Short +X face
  for (const lz of shortZs) out.push({ face: 'short+X', pos: project(halfW, lz) });
  // Short -X face
  for (const lz of shortZs) out.push({ face: 'short-X', pos: project(-halfW, lz) });
  return out;
}

// -------- vägbredd per kind (OSM-defaults) --------
// Faktiska bredder saknas på ~262/327 vägar; produktionens
// preprocessing populerade `width` sparsamt. Här används
// OpenStreetMap-typiska defaults per `highway`-kind så mätningen
// inte förstår "trottoar" som "motorväg".
function defaultRoadWidth(kind) {
  switch (kind) {
    case 'motorway':
    case 'trunk':
    case 'primary':
      return 8;
    case 'secondary':
    case 'tertiary':
      return 6;
    case 'unclassified':
    case 'residential':
      return 4;
    case 'service':
    case 'track':
      return 3;
    case 'footway':
    case 'pedestrian':
    case 'path':
    case 'cycleway':
    case 'steps':
      return 1.5;
    default:
      return 3;
  }
}

// -------- fasindelning för §3.3-mönsterprövning --------

// Restaurant.tsx / player business + landmarks — dessa har egen
// geometri och testas inte som "OSM box"; men vi mäter allt först
// och rapporterar per kind + provenance i sammanfattningen. Den
// visuella observationen av "fönster i luften" gäller OsmBuildings
// (LOD-2 boxrenderaren) — den delen filtrerar bort LANDMARKS +
// churches. Vi replikerar det urvalet här när vi väljer vad som
// räknas som en riktig träff.

// -------- läs indata --------

const worldRaw = JSON.parse(readFileSync(WORLD_JSON_PATH, 'utf8'));
const buildings = worldRaw.buildings;
const roads = worldRaw.roads;

// LANDMARK-IDs som OsmBuildings filtrerar bort per rad 1247. Läs dem
// ur en snapshot av `LANDMARK_BUILDING_IDS` — här hårdkodat via en
// grep av content/world.ts skulle vara skört, så vi räknar allt och
// markerar kind === 'church' + provenance-egenskaper i rapporten.
const LANDMARK_BLACKLIST = new Set(); // rapportera per kind istället

// -------- MÄTNING 1: hus mot vägar --------

const busVsRoads = [];

for (const b of buildings) {
  const hits = [];
  const bpoly = b.poly;
  for (const r of roads) {
    if (r.poly.length < 2) continue;
    const w = r.width != null ? r.width : defaultRoadWidth(r.kind);
    const halfW = w / 2;
    // Prövning A: någon byggnadsvertex inuti vägbandet (dist till
    // mittlinjen < halfW).
    let vertexInside = null;
    for (let i = 0; i < bpoly.length - 1; i++) {
      const dv = distanceToPolygonEdge(r.poly, bpoly[i][0], bpoly[i][1]);
      if (dv < halfW) {
        vertexInside = { vertex: i, distToCentre: dv, halfWidth: halfW };
        break;
      }
    }
    // Prövning B: någon vägvertex inuti byggnadens polygon.
    let roadVertexInside = null;
    for (let i = 0; i < r.poly.length; i++) {
      if (inside(bpoly, r.poly[i][0], r.poly[i][1])) {
        roadVertexInside = { vertex: i, coord: r.poly[i] };
        break;
      }
    }
    // Prövning C: någon byggnadsedge korsar en vägedge geometrisk
    // (för fallet där hela huset ligger på båda sidor om vägen med
    // vägen genom det).
    let edgeCrossing = null;
    outer: for (let i = 0; i < bpoly.length - 1; i++) {
      for (let j = 0; j < r.poly.length - 1; j++) {
        if (segmentsIntersect(bpoly[i], bpoly[i + 1], r.poly[j], r.poly[j + 1])) {
          edgeCrossing = { buildingEdge: i, roadEdge: j };
          break outer;
        }
      }
    }
    if (vertexInside || roadVertexInside || edgeCrossing) {
      // Beräkna djupsta intrusion: hur långt in i vägbandet det värsta
      // hörnet ligger (halfWidth - distToCentre).
      let worstOverlap = 0;
      for (let i = 0; i < bpoly.length - 1; i++) {
        const dv = distanceToPolygonEdge(r.poly, bpoly[i][0], bpoly[i][1]);
        if (dv < halfW) {
          const overlap = halfW - dv;
          if (overlap > worstOverlap) worstOverlap = overlap;
        }
      }
      hits.push({
        roadId: r.id,
        roadKind: r.kind,
        roadWidth: w,
        roadWidthSource: r.width != null ? 'osm' : 'default',
        vertexInside,
        roadVertexInside,
        edgeCrossing,
        worstOverlapM: Number(worstOverlap.toFixed(3))
      });
    }
  }
  if (hits.length > 0) {
    busVsRoads.push({
      buildingId: b.id,
      buildingKind: b.kind,
      buildingName: b.name || null,
      provenance: b.provenance,
      centre: polygonCentroid(b.poly).map((v) => Number(v.toFixed(2))),
      hits
    });
  }
}

// -------- MÄTNING 2: fönster utanför fasad --------

const winOutside = [];

for (const b of buildings) {
  const bpoly = b.poly;
  if (bpoly.length < 4) continue;
  const obb = orientedBbox(bpoly);
  const windows = windowsForXZ(obb);
  const outsideForBuilding = [];
  for (const w of windows) {
    const d = signedDistanceOutward(bpoly, w.pos[0], w.pos[1]);
    if (d > 0.01) {
      // Fönstret ligger utanför polygonen. Rapportera med hur långt.
      outsideForBuilding.push({
        face: w.face,
        pos: w.pos.map((v) => Number(v.toFixed(3))),
        outwardM: Number(d.toFixed(3))
      });
    }
  }
  if (outsideForBuilding.length > 0) {
    outsideForBuilding.sort((a, b) => b.outwardM - a.outwardM);
    winOutside.push({
      buildingId: b.id,
      buildingKind: b.kind,
      buildingName: b.name || null,
      provenance: b.provenance,
      centre: polygonCentroid(bpoly).map((v) => Number(v.toFixed(2))),
      obb: {
        w: Number(obb.w.toFixed(2)),
        d: Number(obb.d.toFixed(2)),
        angleRad: Number(obb.angle.toFixed(4))
      },
      windowCount: windows.length,
      outsideCount: outsideForBuilding.length,
      worstOutwardM: outsideForBuilding[0].outwardM,
      outside: outsideForBuilding
    });
  }
}

// -------- MÄTNING 3: mönstersökning --------

function computeBounds(items, projector) {
  const xs = items.map((v) => projector(v)[0]);
  const zs = items.map((v) => projector(v)[1]);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minZ: Math.min(...zs), maxZ: Math.max(...zs)
  };
}

const pattern = {
  windowFailures: {
    total: winOutside.length,
    byKind: {},
    obbAngleHistogram: {},
    distanceFromOriginHistogram: {},
    worstOffenders: winOutside.slice().sort((a, b) => b.worstOutwardM - a.worstOutwardM).slice(0, 10)
  },
  buildingsVsRoads: {
    total: busVsRoads.length,
    byRoadKind: {},
    byBuildingKind: {},
    worstOffenders: busVsRoads.slice().sort((a, b) => {
      const aW = Math.max(...a.hits.map((h) => h.worstOverlapM));
      const bW = Math.max(...b.hits.map((h) => h.worstOverlapM));
      return bW - aW;
    }).slice(0, 10)
  }
};

for (const b of winOutside) {
  const k = b.buildingKind || 'unknown';
  pattern.windowFailures.byKind[k] = (pattern.windowFailures.byKind[k] || 0) + 1;
  // OBB-vinkel — vinklade byggnader vs axel-parallella
  const deg = Math.round(((b.obb.angleRad * 180) / Math.PI + 360) % 90);
  const bucket = Math.floor(deg / 10) * 10;
  pattern.windowFailures.obbAngleHistogram[bucket] =
    (pattern.windowFailures.obbAngleHistogram[bucket] || 0) + 1;
  // avstånd från origo
  const dist = Math.hypot(b.centre[0], b.centre[1]);
  const bucketD = Math.floor(dist / 100) * 100;
  pattern.windowFailures.distanceFromOriginHistogram[bucketD] =
    (pattern.windowFailures.distanceFromOriginHistogram[bucketD] || 0) + 1;
}

for (const b of busVsRoads) {
  const k = b.buildingKind || 'unknown';
  pattern.buildingsVsRoads.byBuildingKind[k] =
    (pattern.buildingsVsRoads.byBuildingKind[k] || 0) + 1;
  for (const h of b.hits) {
    pattern.buildingsVsRoads.byRoadKind[h.roadKind] =
      (pattern.buildingsVsRoads.byRoadKind[h.roadKind] || 0) + 1;
  }
}

// -------- skriv resultat --------

mkdirSync(REPORT_DIR, { recursive: true });

writeFileSync(
  resolve(REPORT_DIR, 'hus-vs-vagar.json'),
  JSON.stringify(busVsRoads, null, 2)
);
writeFileSync(
  resolve(REPORT_DIR, 'fonster-utanfor.json'),
  JSON.stringify(winOutside, null, 2)
);
writeFileSync(
  resolve(REPORT_DIR, 'monster.json'),
  JSON.stringify(pattern, null, 2)
);

// -------- konsoll-sammanfattning --------

console.log('=== ORDER 130 — kartan mäts ===\n');
console.log(`Byggnader totalt: ${buildings.length}`);
console.log(`Vägar totalt:     ${roads.length}`);
console.log(`Vägar med osm-width: ${roads.filter((r) => r.width != null).length} (resten defaultar per kind)`);
console.log('');
console.log('MÄTNING 1 — hus mot vägar:');
console.log(`  ${busVsRoads.length}/${buildings.length} byggnader skär minst en vägbanan.`);
console.log('  Per vägtyp:');
for (const [k, n] of Object.entries(pattern.buildingsVsRoads.byRoadKind).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(15)} ${n}`);
}
console.log('  Per byggnadstyp (topp 5):');
const kindEntries = Object.entries(pattern.buildingsVsRoads.byBuildingKind).sort((a, b) => b[1] - a[1]);
for (const [k, n] of kindEntries.slice(0, 5)) {
  console.log(`    ${(k || 'unknown').padEnd(15)} ${n}`);
}
console.log('  Värsta intrusion (topp 5):');
for (const b of pattern.buildingsVsRoads.worstOffenders.slice(0, 5)) {
  const worst = Math.max(...b.hits.map((h) => h.worstOverlapM));
  const hitStr = b.hits.map((h) => `${h.roadKind}(${h.roadWidth}m)`).slice(0, 3).join(',');
  console.log(`    ${b.buildingId} kind=${b.buildingKind} centre=(${b.centre[0]},${b.centre[1]}) worst=${worst.toFixed(2)}m vs [${hitStr}]`);
}
console.log('');
console.log('MÄTNING 2 — fönster utanför fasad:');
console.log(`  ${winOutside.length}/${buildings.length} byggnader har minst ett fönster utanför sin polygon.`);
const totalWindows = winOutside.reduce((s, b) => s + b.windowCount, 0);
const totalOutside = winOutside.reduce((s, b) => s + b.outsideCount, 0);
console.log(`  ${totalOutside} fönster totalt utanför (av ${totalWindows} genererade på dessa hus).`);
console.log('  Per byggnadstyp (topp 5):');
for (const [k, n] of Object.entries(pattern.windowFailures.byKind).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
  console.log(`    ${(k || 'unknown').padEnd(15)} ${n}`);
}
console.log('  OBB-vinkel-histogram (grader mod 90):');
for (const [b, n] of Object.entries(pattern.windowFailures.obbAngleHistogram).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`    ${String(b).padStart(3)}–${String(Number(b) + 10).padStart(3)}°: ${n}`);
}
console.log('  Värsta fönster-överhäng (topp 5):');
for (const b of pattern.windowFailures.worstOffenders.slice(0, 5)) {
  console.log(`    ${b.buildingId} kind=${b.buildingKind} obb=${b.obb.w}×${b.obb.d} worstOutward=${b.worstOutwardM}m centre=(${b.centre[0]},${b.centre[1]})`);
}
console.log('');
console.log(`Rapportfiler i ${REPORT_DIR}/`);
console.log('  hus-vs-vagar.json     — alla träffar per byggnad');
console.log('  fonster-utanfor.json  — alla överhäng per byggnad');
console.log('  monster.json          — histogram + värsta-listor');
