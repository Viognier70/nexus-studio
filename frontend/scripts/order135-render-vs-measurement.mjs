#!/usr/bin/env node
// ORDER 135 — utred om ORDER 133:s mätning mäter samma geometri som
// OsmRoads faktiskt renderar.
//
// Vision Owner ser i dev-servern att vägar går rakt in i och under
// byggnader — meter, inte centimeter. ORDER 133 rapporterade 33
// kvarvarande fall med intrusion < 2 m och kallade dem "verkliga
// smågränsöverlappningar". Slutsatsen står nu i tvist.
//
// Hypotes: mätningen använde `road.width` (OSM-tagg) eller kind-
// default (`defaultRoadWidth()`), medan renderingen använder
// `ROLE_SPECS[roleFor(road)].width` — en helt annan tabell.
//
// Detta skript räknar om ORDER 133:s hus-vs-vägar mot renderings-
// bredderna och jämför:
//   A. ORDER 133-bredd (OSM if present, else kind-default)
//   B. Renderad bredd (ROLE_SPECS.width — carriageway only)
//   C. Renderad envelope (ROLE_SPECS.width + 2 × sidewalkWidth)
//
// Ingen ändring. Bara mätning.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order135');
mkdirSync(REPORT_DIR, { recursive: true });

const WORLD_JSON_PATH = resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json');

// -------- roll → bredd (kopia av roadRoles.ts ROLE_SPECS) --------

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

// Namn som PROMOTAS från residential/living_street till village_street
// per roadRoles.ts VILLAGE_STREET_NAMES.
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

// Order 133-defaults (samma som order130-map-measurements.mjs).
function defaultRoadWidth133(kind) {
  switch (kind) {
    case 'motorway': case 'trunk': case 'primary': return 8;
    case 'secondary': case 'tertiary': return 6;
    case 'unclassified': case 'residential': return 4;
    case 'service': case 'track': return 3;
    case 'footway': case 'pedestrian': case 'path': case 'cycleway': case 'steps':
      return 1.5;
    default: return 3;
  }
}
function widthA_133(road) { return road.width != null ? road.width : defaultRoadWidth133(road.kind); }
function widthB_carriageway(road) { return ROLE_SPECS[roleFor(road)].width; }
function widthC_envelope(road) {
  const s = ROLE_SPECS[roleFor(road)];
  return s.width + 2 * s.sidewalkWidth;
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
function distanceToPolygonEdge(poly, x, z) {
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

function collide(buildings, roads, widthFn) {
  const hits = [];
  for (const b of buildings) {
    let worstOverlap = 0;
    const bhits = [];
    for (const r of roads) {
      if (r.poly.length < 2) continue;
      const w = widthFn(r);
      const halfW = w / 2;
      let vertexIn = false;
      let wOv = 0;
      for (let i = 0; i < b.poly.length - 1; i++) {
        const dv = distanceToPolygonEdge(r.poly, b.poly[i][0], b.poly[i][1]);
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
          roadId: r.id, roadKind: r.kind, roadName: r.name || null, roadRef: r.ref || null,
          role: roleFor(r), roadWidth: w, worstOverlap: Number(wOv.toFixed(3))
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

// -------- läs indata --------

const worldRaw = JSON.parse(readFileSync(WORLD_JSON_PATH, 'utf8'));
const buildings = worldRaw.buildings;
const roads = worldRaw.roads;

// -------- tre mätningar --------

const hitsA = collide(buildings, roads, widthA_133);        // ORDER 133-bredd
const hitsB = collide(buildings, roads, widthB_carriageway); // rendering, bara asfalt
const hitsC = collide(buildings, roads, widthC_envelope);    // rendering, med trottoar

// -------- jämför bredd per väg mellan A, B, C --------

const perRoadWidths = [];
for (const r of roads) {
  const wA = widthA_133(r);
  const wB = widthB_carriageway(r);
  const wC = widthC_envelope(r);
  perRoadWidths.push({
    id: r.id, kind: r.kind, name: r.name || null, ref: r.ref || null,
    role: roleFor(r),
    osmWidth: r.width,
    wA_133: wA, wB_carriageway: wB, wC_envelope: wC,
    diffBA: Number((wB - wA).toFixed(2)),
    diffCA: Number((wC - wA).toFixed(2))
  });
}

// Sortera efter största diff
perRoadWidths.sort((a, b) => Math.abs(b.diffCA) - Math.abs(a.diffCA));

// -------- kvantifiera skillnaden mellan de tre --------

const idsA = new Set(hitsA.map((h) => h.buildingId));
const idsB = new Set(hitsB.map((h) => h.buildingId));
const idsC = new Set(hitsC.map((h) => h.buildingId));

const onlyInB = [...idsB].filter((id) => !idsA.has(id));
const onlyInC = [...idsC].filter((id) => !idsA.has(id));
const droppedInB = [...idsA].filter((id) => !idsB.has(id));
const droppedInC = [...idsA].filter((id) => !idsC.has(id));

const worstA = hitsA.slice().sort((a, b) => b.worstOverlap - a.worstOverlap).slice(0, 10);
const worstB = hitsB.slice().sort((a, b) => b.worstOverlap - a.worstOverlap).slice(0, 10);
const worstC = hitsC.slice().sort((a, b) => b.worstOverlap - a.worstOverlap).slice(0, 10);

writeFileSync(
  resolve(REPORT_DIR, 'renderVsMeasurement.json'),
  JSON.stringify({
    summary: {
      buildingsTotal: buildings.length,
      roadsTotal: roads.length,
      countA_order133: hitsA.length,
      countB_carriageway: hitsB.length,
      countC_envelope: hitsC.length,
      newInB_vs_A: onlyInB.length,
      newInC_vs_A: onlyInC.length,
      droppedInB_vs_A: droppedInB.length,
      droppedInC_vs_A: droppedInC.length,
      worstOverlapA: hitsA.length ? Math.max(...hitsA.map((h) => h.worstOverlap)) : 0,
      worstOverlapB: hitsB.length ? Math.max(...hitsB.map((h) => h.worstOverlap)) : 0,
      worstOverlapC: hitsC.length ? Math.max(...hitsC.map((h) => h.worstOverlap)) : 0
    },
    idsOnlyInB: onlyInB, idsOnlyInC: onlyInC,
    idsDroppedInB: droppedInB, idsDroppedInC: droppedInC,
    worstA, worstB, worstC,
    perRoadWidths: perRoadWidths.slice(0, 30),
    hitsA, hitsB, hitsC
  }, null, 2)
);

// -------- konsollutdata --------

console.log('=== ORDER 135 — renderad väg vs ORDER 133-mätning ===\n');
console.log('Bredder används i ORDER 133 mätningen:');
console.log('  A. widthA_133 = OSM `width` om finns, annars kind-default (motorway=8, service=3, ...)');
console.log('Bredder används av rendering (OsmRoads.tsx via roadRoles.ROLE_SPECS):');
console.log('  B. widthB_carriageway = ROLE_SPECS[roleFor(r)].width (bara asfalt)');
console.log('  C. widthC_envelope    = width + 2 × sidewalkWidth (asfalt + trottoar per sida)');
console.log('');
console.log('Kollisioner (byggnader med ≥ 1 hit):');
console.log(`  A. ORDER 133 (som rapporterat):        ${hitsA.length} byggnader   worst=${(hitsA.length ? Math.max(...hitsA.map((h) => h.worstOverlap)) : 0).toFixed(2)} m`);
console.log(`  B. Renderad carriageway:               ${hitsB.length} byggnader   worst=${(hitsB.length ? Math.max(...hitsB.map((h) => h.worstOverlap)) : 0).toFixed(2)} m`);
console.log(`  C. Renderad envelope (med trottoar):   ${hitsC.length} byggnader   worst=${(hitsC.length ? Math.max(...hitsC.map((h) => h.worstOverlap)) : 0).toFixed(2)} m`);
console.log('');
console.log(`Nya kollisioner i B som ORDER 133 missade: ${onlyInB.length}`);
console.log(`Nya kollisioner i C som ORDER 133 missade: ${onlyInC.length}`);
console.log(`Dropp i B jämfört med A: ${droppedInB.length} (fall som ORDER 133 rapporterade men renderad carriageway inte träffar)`);
console.log(`Dropp i C jämfört med A: ${droppedInC.length}`);
console.log('');
console.log('Topp 10 skillnader mellan bredder (|widthC − widthA|):');
console.log('  road-id                  kind          role                 name              osm  wA   wB    wC    diffCA');
for (const r of perRoadWidths.slice(0, 15)) {
  console.log(
    `  ${r.id.padEnd(24)} ${(r.kind || '').padEnd(13)} ${r.role.padEnd(20)} ${(r.name || '-').padEnd(17)} ${String(r.osmWidth ?? '-').padStart(3)}  ${String(r.wA_133).padStart(4)} ${String(r.wB_carriageway).padStart(4)}  ${String(r.wC_envelope).padStart(4)}  ${(r.diffCA >= 0 ? '+' : '') + r.diffCA}`
  );
}
console.log('');
console.log('§B — renderad carriageway: värsta 10 kollisioner:');
for (const h of worstB.slice(0, 10)) {
  const hitStr = h.hits.map((x) => `${x.role}(${x.roadWidth}m,${x.roadKind}${x.roadName ? ',' + x.roadName : ''})`).slice(0, 3).join(',');
  console.log(`  ${h.buildingId.padEnd(20)} kind=${(h.buildingKind || 'unknown').padEnd(11)} centre=(${h.centre[0]},${h.centre[1]}) worst=${h.worstOverlap.toFixed(2)}m vs [${hitStr}]`);
}
console.log('');
console.log('§C — renderad envelope: värsta 10 kollisioner:');
for (const h of worstC.slice(0, 10)) {
  const hitStr = h.hits.map((x) => `${x.role}(${x.roadWidth}m,${x.roadKind}${x.roadName ? ',' + x.roadName : ''})`).slice(0, 3).join(',');
  console.log(`  ${h.buildingId.padEnd(20)} kind=${(h.buildingKind || 'unknown').padEnd(11)} centre=(${h.centre[0]},${h.centre[1]}) worst=${h.worstOverlap.toFixed(2)}m vs [${hitStr}]`);
}
console.log('');
console.log(`Rapport: ${resolve(REPORT_DIR, 'renderVsMeasurement.json')}`);
