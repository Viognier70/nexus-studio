#!/usr/bin/env node
// ORDER 133 — vägarnas bredd (utredning, ingen rättelse).
//
// ORDER 130 fann 37 byggnad-vs-väg-överlapp. Sidoupptäckt: de fyra
// värsta rör alla `living_street` med 12 m bredd (normen är 4-5 m).
// Denna mätning svarar på §2:
//   2.1 var kommer bredden ifrån?
//   2.2 vad har varje vägtyp för bredd?
//   2.3 hur många av de 37 försvinner om normerna används i stället?
//   2.4 vilka blir kvar och vad är de?
//
// Kör om:  node frontend/scripts/order133-road-width-audit.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order133');
mkdirSync(REPORT_DIR, { recursive: true });

const WORLD_JSON_PATH = resolve(FRONTEND, 'src/strategic/data/grythyttan-world.json');

// -------- normbredder per vägtyp (OSM highway=norm, meter) --------
// Källor: OSM Highway width guidelines, svenska VGU-riktvärden för
// bostadskvartersgator (living_street/gångfartsområde 3,0-5,5 m
// beroende på om cykel/personbil är med). Normerna nedan är CENTRALA
// värden i respektive intervall — inte optimistiska minima.
const NORM_WIDTH = {
  motorway: 8, trunk: 8, primary: 8,
  secondary: 6.5, tertiary: 5.5,
  unclassified: 4, residential: 4.5,
  living_street: 5,
  service: 3, track: 3,
  footway: 1.5, pedestrian: 3, path: 1, cycleway: 2, steps: 1.5,
  platform: 3
};
function normFor(kind) { return NORM_WIDTH[kind] ?? 3; }

// Baseline (samma logik som ORDER 130): OSM-tagg om finns, annars norm.
function baselineWidth(r) {
  return r.width != null ? r.width : normFor(r.kind);
}

// -------- geometri (samma primitives som ORDER 130) --------

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

// -------- kärnmätning: hus-vs-vägar med given widthFn --------

function collide(buildings, roads, widthFn) {
  const hits = [];
  for (const b of buildings) {
    const bhits = [];
    for (const r of roads) {
      if (r.poly.length < 2) continue;
      const w = widthFn(r);
      const halfW = w / 2;
      let vertexIn = false;
      let worstOverlap = 0;
      for (let i = 0; i < b.poly.length - 1; i++) {
        const dv = distanceToPolygonEdge(r.poly, b.poly[i][0], b.poly[i][1]);
        if (dv < halfW) {
          vertexIn = true;
          const ov = halfW - dv;
          if (ov > worstOverlap) worstOverlap = ov;
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
        bhits.push({
          roadId: r.id, roadKind: r.kind, roadWidth: w,
          osmWidth: r.width, worstOverlap: Number(worstOverlap.toFixed(3))
        });
      }
    }
    if (bhits.length > 0) hits.push({
      buildingId: b.id, buildingKind: b.kind,
      centre: polygonCentroid(b.poly).map((v) => Number(v.toFixed(2))),
      hits: bhits,
      worstOverlap: Math.max(...bhits.map((h) => h.worstOverlap))
    });
  }
  return hits;
}

// -------- läs indata --------

const worldRaw = JSON.parse(readFileSync(WORLD_JSON_PATH, 'utf8'));
const buildings = worldRaw.buildings;
const roads = worldRaw.roads;

// -------- §2.1: var kommer 12m från? --------

const wideLivingStreets = roads.filter((r) => r.kind === 'living_street' && r.width != null && r.width > 6);
const suspectRoads = roads.filter((r) => r.width != null && r.width >= 10);

// -------- §2.2: bredd per vägtyp --------

const byKind = {};
for (const r of roads) {
  if (!byKind[r.kind]) byKind[r.kind] = { count: 0, withWidth: 0, widths: [] };
  byKind[r.kind].count++;
  if (r.width != null) { byKind[r.kind].withWidth++; byKind[r.kind].widths.push(r.width); }
}
const kindReport = {};
for (const [k, v] of Object.entries(byKind)) {
  const sorted = v.widths.slice().sort((a, b) => a - b);
  kindReport[k] = {
    total: v.count,
    withOsmWidth: v.withWidth,
    norm: normFor(k),
    osmMin: sorted[0] ?? null,
    osmMax: sorted[sorted.length - 1] ?? null,
    osmMedian: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    osmOverNorm: sorted.filter((w) => w > normFor(k) * 1.5).length
  };
}

// -------- §2.3: räkna om med normer --------

const baselineHits = collide(buildings, roads, baselineWidth);
const normedHits = collide(buildings, roads, (r) => normFor(r.kind));

const baselineIds = new Set(baselineHits.map((h) => h.buildingId));
const normedIds = new Set(normedHits.map((h) => h.buildingId));
const removedByNorm = [...baselineIds].filter((id) => !normedIds.has(id));
const stillHitting = normedHits.slice().sort((a, b) => b.worstOverlap - a.worstOverlap);

// -------- skriv rapport --------

writeFileSync(
  resolve(REPORT_DIR, 'widthAudit.json'),
  JSON.stringify({
    kindReport,
    wideLivingStreets: wideLivingStreets.map((r) => ({
      id: r.id, kind: r.kind, name: r.name, width: r.width,
      polyStart: r.poly[0], polyEnd: r.poly[r.poly.length - 1]
    })),
    suspectRoads: suspectRoads.map((r) => ({
      id: r.id, kind: r.kind, width: r.width, norm: normFor(r.kind), overNormBy: r.width - normFor(r.kind)
    })),
    baseline: { total: baselineHits.length, hits: baselineHits },
    normed:   { total: normedHits.length,   hits: normedHits },
    removedByNorm,
    stillHitting: stillHitting.slice(0, 20)
  }, null, 2)
);

// -------- konsollutdata --------

console.log('=== ORDER 133 — vägarnas bredd ===\n');
console.log('§2.1 — misstänkta vägbredder i OSM-data:');
console.log(`  living_street med width > 6: ${wideLivingStreets.length}`);
for (const r of wideLivingStreets) {
  console.log(`    ${r.id} kind=${r.kind} name=${r.name || '-'} osmWidth=${r.width} m (norm ${normFor(r.kind)} m)`);
}
console.log(`  Alla vägar med width ≥ 10 m: ${suspectRoads.length}`);
for (const r of suspectRoads) {
  console.log(`    ${r.id} kind=${r.kind} osmWidth=${r.width} m (norm ${normFor(r.kind)} m, ${(r.width - normFor(r.kind)).toFixed(1)} m över)`);
}
console.log('');
console.log('§2.2 — bredd per vägtyp (n=count, w=antal med OSM-width, med=median, max=max):');
console.log('  kind           n    w    norm  med  max  över-1.5×norm');
for (const [k, r] of Object.entries(kindReport).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${k.padEnd(14)} ${String(r.total).padStart(3)} ${String(r.withOsmWidth).padStart(4)} ${String(r.norm).padStart(5)} ${String(r.osmMedian ?? '-').padStart(4)} ${String(r.osmMax ?? '-').padStart(4)}  ${r.osmOverNorm}`);
}
console.log('');
console.log('§2.3 — kollisioner vid respektive breddregim:');
console.log(`  Baseline (OSM if present, annars norm) — samma som ORDER 130:   ${baselineHits.length} byggnader`);
console.log(`  Normed (norm per kind, ignorera OSM-widths):                    ${normedHits.length} byggnader`);
console.log(`  Försvann med norm:                                              ${removedByNorm.length} (id: ${removedByNorm.join(', ') || '-'})`);
console.log('');
console.log('§2.4 — kvarvarande fall vid normerade bredder (topp 20 sorterat på worstOverlap):');
for (const h of stillHitting.slice(0, 20)) {
  const hitStr = h.hits.map((x) => `${x.roadKind}(${x.roadWidth}m${x.osmWidth != null ? ',osm' + x.osmWidth : ',def'})`).slice(0, 3).join(',');
  console.log(`  ${h.buildingId.padEnd(20)} kind=${(h.buildingKind || 'unknown').padEnd(11)} centre=(${h.centre[0]},${h.centre[1]}) worst=${h.worstOverlap.toFixed(2)}m vs [${hitStr}]`);
}
console.log('');
console.log(`Rapport: ${resolve(REPORT_DIR, 'widthAudit.json')}`);
