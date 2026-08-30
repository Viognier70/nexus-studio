#!/usr/bin/env node
// ORDER 136 — svep över alternativa ROLE_SPECS mot ORDER 135:s
// 32 envelope-kollisioner. Ingen ROLE_SPECS ändras här — scriptet
// evaluerar tre parameterserier mot samma geometri för att visa
// vilka fall som försvinner respektive kvarstår.
//
// Regimer:
//   CURRENT — dagens ROLE_SPECS (matchar frontend/src/strategic/content/roadRoles.ts)
//   ALT_A   — smalare trottoarer (primary/main sidewalk 1,6/1,5 → 1,0)
//   ALT_B   — smalare vägar (primary 10→7, main 9→7, sidewalks 1,6/1,5→1,2)
//
// Kör om:  node frontend/scripts/order136-role-specs-sweep.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order136');
mkdirSync(REPORT_DIR, { recursive: true });

const WORLD_JSON_PATH = resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json');

// -------- ROLE_SPECS-regimer (bredder + sidewalks) --------

const CURRENT = {
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

// Alt A: smalare trottoarer.
const ALT_A = {
  ...CURRENT,
  primary: { width: 10.0, sidewalkWidth: 1.0 },
  main:    { width: 9.0,  sidewalkWidth: 1.0 }
};

// Alt B: smalare riksvägar + smalare trottoarer (dubbelt drag).
const ALT_B = {
  ...CURRENT,
  primary:             { width: 7.0, sidewalkWidth: 1.2 },
  main:                { width: 7.0, sidewalkWidth: 1.2 },
  secondary_connector: { width: 5.5, sidewalkWidth: 1.0 }
};

// Svensk bruksort — VGU-riktvärden (Trafikverket / Vägar och Gators
// Utformning). Källa: VGU 2020 kap. 6 (bygator), Trafikverket riksväg-
// standard för landsbygdsvägar med 60-70 km/h.
const NORM_SE = {
  primary:             { width: 7.5, sidewalkWidth: 2.0, note: 'Riksväg 244 i tätort — 6,5-8 m körbana + 1,8-2,4 m gångbana per sida (VGU 6.2)' },
  main:                { width: 6.5, sidewalkWidth: 1.8, note: 'Lokal Rv 205 / huvudgata i bruksort — 5,5-7 m + gångbana 1,5-2 m' },
  secondary_connector: { width: 5.5, sidewalkWidth: 1.5, note: 'Village collector — 5-6 m + 1,2-1,8 m gångbana' },
  local_street:        { width: 4.5, sidewalkWidth: 1.0, note: 'Bostadsgata primär — 4-5 m + 0,9-1,2 m gångbana när det finns' },
  village_street:      { width: 4.5, sidewalkWidth: 0.9, note: 'Bostadsgata sekundär — samma nivå' },
  residential:         { width: 3.5, sidewalkWidth: 0,   note: 'Angöringsgata — 3-4,5 m, sällan gångbana' },
  service:             { width: 3.0, sidewalkWidth: 0,   note: 'Servicegata — 2,5-3,5 m' },
  track:               { width: 2.5, sidewalkWidth: 0,   note: 'Skogsbilväg / traktorspår — 2-3 m' },
  cycleway:            { width: 2.0, sidewalkWidth: 0,   note: 'Cykelbana — 1,8-2,5 m enkelriktad, 2,5-3 m dubbelriktad' },
  footpath:            { width: 1.5, sidewalkWidth: 0,   note: 'Gångstig — 1,2-2 m' }
};

// -------- rollhärledning (kopia från roadRoles.ts) --------

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

function envelopeFor(specs, road) {
  const s = specs[roleFor(road)];
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

function collide(buildings, roads, specs) {
  const hits = [];
  for (const b of buildings) {
    let worstOverlap = 0;
    const bhits = [];
    // Aggregerade trigger-orsaker för hela byggnaden — svarar på
    // frågan "är detta ett bredd-fall eller ett struktur-fall?".
    let anyVertexInEnvelope = false;
    let anyRoadVertexInBuilding = false;
    let anyEdgeCrossing = false;
    for (const r of roads) {
      if (r.poly.length < 2) continue;
      const w = envelopeFor(specs, r);
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
        if (vertexIn) anyVertexInEnvelope = true;
        if (roadVertexIn) anyRoadVertexInBuilding = true;
        if (edgeX) anyEdgeCrossing = true;
        bhits.push({
          roadId: r.id, roadKind: r.kind, roadName: r.name || null, roadRef: r.ref || null,
          role: roleFor(r), envelope: w, worstOverlap: Number(wOv.toFixed(3)),
          triggers: { vertexInEnvelope: vertexIn, roadVertexInBuilding: roadVertexIn, edgeCrossing: edgeX }
        });
      }
    }
    if (bhits.length > 0) {
      hits.push({
        buildingId: b.id, buildingKind: b.kind, buildingName: b.name || null,
        centre: polygonCentroid(b.poly).map((v) => Number(v.toFixed(2))),
        worstOverlap: Number(worstOverlap.toFixed(3)),
        // widthOnly = kollisionen försvinner om vi tar bort envelope-krav
        // (om enda triggern är vertexInEnvelope, är det ett rent breddfall).
        widthOnly: anyVertexInEnvelope && !anyRoadVertexInBuilding && !anyEdgeCrossing,
        structural: anyRoadVertexInBuilding || anyEdgeCrossing,
        triggers: { anyVertexInEnvelope, anyRoadVertexInBuilding, anyEdgeCrossing },
        hits: bhits
      });
    }
  }
  return hits;
}

// -------- läs indata --------

const worldRaw = JSON.parse(readFileSync(WORLD_JSON_PATH, 'utf8'));

// -------- mät tre regimer --------

const results = {
  CURRENT: collide(worldRaw.buildings, worldRaw.roads, CURRENT),
  ALT_A:   collide(worldRaw.buildings, worldRaw.roads, ALT_A),
  ALT_B:   collide(worldRaw.buildings, worldRaw.roads, ALT_B)
};

// -------- normjämförelse per roll --------

const rollTable = [];
for (const role of Object.keys(CURRENT)) {
  const c = CURRENT[role], a = ALT_A[role], b = ALT_B[role], n = NORM_SE[role];
  const envC = c.width + 2 * c.sidewalkWidth;
  const envA = a.width + 2 * a.sidewalkWidth;
  const envB = b.width + 2 * b.sidewalkWidth;
  const envN = n.width + 2 * n.sidewalkWidth;
  rollTable.push({
    role,
    current: { width: c.width, sidewalk: c.sidewalkWidth, envelope: envC },
    altA:    { width: a.width, sidewalk: a.sidewalkWidth, envelope: envA },
    altB:    { width: b.width, sidewalk: b.sidewalkWidth, envelope: envB },
    normSE:  { width: n.width, sidewalk: n.sidewalkWidth, envelope: envN, note: n.note },
    currentVsNorm: Number((envC - envN).toFixed(1))
  });
}

// -------- kvantifiera skillnader --------

const idsCur = new Set(results.CURRENT.map((h) => h.buildingId));
const idsA = new Set(results.ALT_A.map((h) => h.buildingId));
const idsB = new Set(results.ALT_B.map((h) => h.buildingId));

const droppedInA = [...idsCur].filter((id) => !idsA.has(id));
const droppedInB = [...idsCur].filter((id) => !idsB.has(id));

function structuralBreakdown(hits) {
  const widthOnly = hits.filter((h) => h.widthOnly).length;
  const structural = hits.filter((h) => h.structural).length;
  return { widthOnly, structural };
}

const summary = {
  CURRENT: {
    count: results.CURRENT.length,
    worst: results.CURRENT.length ? Math.max(...results.CURRENT.map((h) => h.worstOverlap)) : 0,
    ...structuralBreakdown(results.CURRENT)
  },
  ALT_A: {
    count: results.ALT_A.length,
    worst: results.ALT_A.length ? Math.max(...results.ALT_A.map((h) => h.worstOverlap)) : 0,
    droppedFromCurrent: droppedInA.length,
    droppedIds: droppedInA,
    ...structuralBreakdown(results.ALT_A)
  },
  ALT_B: {
    count: results.ALT_B.length,
    worst: results.ALT_B.length ? Math.max(...results.ALT_B.map((h) => h.worstOverlap)) : 0,
    droppedFromCurrent: droppedInB.length,
    droppedIds: droppedInB,
    ...structuralBreakdown(results.ALT_B)
  }
};

writeFileSync(
  resolve(REPORT_DIR, 'roleSpecsSweep.json'),
  JSON.stringify({
    regimens: { CURRENT, ALT_A, ALT_B, NORM_SE },
    rollTable,
    summary,
    results: {
      CURRENT: results.CURRENT.slice().sort((a, b) => b.worstOverlap - a.worstOverlap),
      ALT_A: results.ALT_A.slice().sort((a, b) => b.worstOverlap - a.worstOverlap),
      ALT_B: results.ALT_B.slice().sort((a, b) => b.worstOverlap - a.worstOverlap)
    }
  }, null, 2)
);

// -------- konsollutdata --------

console.log('=== ORDER 136 — ROLE_SPECS-svep ===\n');
console.log('§2.1 — bredder per roll (carriageway + sidewalk × 2 = envelope), meter:');
console.log('  role                     CURRENT           ALT_A             ALT_B             NORM_SE          diff CUR-NORM');
for (const r of rollTable) {
  const fmt = (v) => `${v.width}+${v.sidewalk*2}=${v.envelope.toFixed(1)}`.padEnd(15);
  console.log(
    `  ${r.role.padEnd(22)} ${fmt(r.current)}   ${fmt(r.altA)}   ${fmt(r.altB)}   ${fmt(r.normSE)}   ${(r.currentVsNorm >= 0 ? '+' : '') + r.currentVsNorm} m`
  );
}
console.log('');
console.log('§2.2 — kollisioner per regim:');
console.log(`  CURRENT (dagens ROLE_SPECS):        ${summary.CURRENT.count} byggnader   värsta=${summary.CURRENT.worst.toFixed(2)} m   [widthOnly=${summary.CURRENT.widthOnly}, structural=${summary.CURRENT.structural}]`);
console.log(`  ALT_A (smala trottoarer):           ${summary.ALT_A.count} byggnader   värsta=${summary.ALT_A.worst.toFixed(2)} m   (försvann ${summary.ALT_A.droppedFromCurrent}) [widthOnly=${summary.ALT_A.widthOnly}, structural=${summary.ALT_A.structural}]`);
console.log(`  ALT_B (primary/main 7m + smalare):  ${summary.ALT_B.count} byggnader   värsta=${summary.ALT_B.worst.toFixed(2)} m   (försvann ${summary.ALT_B.droppedFromCurrent}) [widthOnly=${summary.ALT_B.widthOnly}, structural=${summary.ALT_B.structural}]`);
console.log('');
console.log('§2.3 — värsta 10 kvarvarande i ALT_B:');
const worstB = results.ALT_B.slice().sort((a, b) => b.worstOverlap - a.worstOverlap).slice(0, 10);
for (const h of worstB) {
  const hitStr = h.hits.map((x) => `${x.role}(${x.envelope.toFixed(1)}m,${x.roadKind}${x.roadName ? ',' + x.roadName : ''})`).slice(0, 3).join(',');
  console.log(`  ${h.buildingId.padEnd(20)} kind=${(h.buildingKind || 'unknown').padEnd(11)} centre=(${h.centre[0]},${h.centre[1]}) worst=${h.worstOverlap.toFixed(2)}m vs [${hitStr}]`);
}
console.log('');
console.log(`Rapport: ${resolve(REPORT_DIR, 'roleSpecsSweep.json')}`);
