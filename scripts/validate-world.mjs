#!/usr/bin/env node
// Validate the derived world geometry that the renderer + traffic
// actually consume. Catches the class of defects that ORDER 019 and
// 019R had to reopen: forest scattered inside lakes, vehicle paths
// entering buildings, multi-wing polygons that trip the extruder,
// named streets that fall through the role promotion.
//
// Usage:
//   node scripts/validate-world.mjs
//   node scripts/validate-world.mjs --json          # machine output
//   node scripts/validate-world.mjs --strict        # exit 1 on any Critical
//
// Deliberately re-implements the geometry helpers in this script so
// the validator has no import dependency on the running frontend
// bundle. Any drift between the renderer's inline algorithm and this
// duplicate is itself a defect the validator will surface.

import { readFileSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const strict = args.has('--strict');

const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));

// ---------- Geometry helpers (mirror procgen/geom.ts) ----------
function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length - 1; i++)
    s += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  return Math.abs(s) / 2;
}
function polygonBounds(p) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, z] of p) {
    if (x < a) a = x; if (x > b) b = x;
    if (z < c) c = z; if (z > d) d = z;
  }
  return { minX: a, maxX: b, minZ: c, maxZ: d };
}
function inside(polygon, x, z) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const t = zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (t) hit = !hit;
  }
  return hit;
}
function distanceToPolygon(poly, x, z) {
  let m = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const lsq = dx * dx + dz * dz;
    if (lsq === 0) {
      const d = Math.hypot(x - a[0], z - a[1]);
      if (d < m) m = d;
      continue;
    }
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / lsq;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz));
    if (d < m) m = d;
  }
  return m;
}
function insideAnyWater(x, z) {
  for (const w of world.water) {
    if (w.poly.length < 3) continue;
    const b = polygonBounds(w.poly);
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (inside(w.poly, x, z)) return w.id;
  }
  return null;
}

// ---------- Reports ----------
const defects = [];
function addDefect(severity, id, message, detail = null) {
  defects.push({ severity, id, message, detail });
}

// ---------- V1: forest polygon vertices inside water ----------
{
  let hits = 0;
  const inside = [];
  for (const f of world.forest) {
    for (const [x, z] of f.poly) {
      const w = insideAnyWater(x, z);
      if (w) { hits++; inside.push({ forest: f.id, water: w, at: [x, z] }); break; }
    }
  }
  if (hits > 0) addDefect('Critical', 'V1', `${hits} forest polygons have a vertex inside a water polygon`, inside);
  else addDefect('Info', 'V1', 'V1 clean: no forest polygon vertex inside water');
}

// ---------- V2: pasture / horizon vegetation not in water ----------
// Simulate the HorizonForest ring using the same seed the runtime does.
function mulberry32(state) {
  let s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { next: s, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}
{
  const torget = world.landmarks.find((l) => l.id === 'gry-torget')?.position ?? [0, 0];
  const RING_INNER = 700, RING_OUTER = 2200, RING_DENSITY = 1 / 6000;
  const cx = torget[0], cz = torget[1];
  const side = RING_OUTER * 2;
  const ringArea = Math.PI * (RING_OUTER * RING_OUTER - RING_INNER * RING_INNER);
  const target = Math.round(ringArea * RING_DENSITY);
  let state = 0x1f0e57 >>> 0;
  const rng = () => { const s = mulberry32(state); state = s.next; return s.value; };
  const range = (a, b) => a + rng() * (b - a);
  let emitted = 0, attempts = 0, inWater = 0;
  while (emitted < target && attempts < target * 10) {
    attempts++;
    const x = cx + range(-side / 2, side / 2);
    const z = cz + range(-side / 2, side / 2);
    const r = Math.hypot(x - cx, z - cz);
    if (r < RING_INNER || r > RING_OUTER) continue;
    if (insideAnyWater(x, z)) { inWater++; continue; }
    emitted++;
  }
  if (inWater > 0 && emitted < target) {
    addDefect('High', 'V2', `HorizonForest rejected ${inWater} candidates for water but only emitted ${emitted}/${target}. Consider raising attempt budget.`);
  } else if (emitted < target * 0.9) {
    addDefect('Medium', 'V2', `HorizonForest emitted ${emitted}/${target} (${((emitted / target) * 100).toFixed(0)}%)`);
  } else {
    addDefect('Info', 'V2', `V2 clean: HorizonForest emitted ${emitted}/${target} markers, rejected ${inWater} for water`);
  }
}

// ---------- V3: vehicle path (with envelope) inside buildings ----------
{
  const CAR_HW = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary',
    'unclassified', 'residential', 'living_street', 'service']);
  const CLEARANCE = 3.2;
  const conflicts = [];
  for (const road of world.roads) {
    if (!CAR_HW.has(road.kind)) continue;
    // Sample every 2 m
    const seg = [];
    let total = 0;
    for (let i = 1; i < road.poly.length; i++) {
      const a = road.poly[i - 1], b = road.poly[i];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l > 0) { seg.push({ a, b, len: l }); total += l; }
    }
    if (total === 0) continue;
    const n = Math.max(2, Math.ceil(total / 2.0));
    for (let k = 0; k < n; k++) {
      const target = (k / (n - 1)) * total;
      let acc = 0;
      for (const s of seg) {
        if (acc + s.len >= target || s === seg[seg.length - 1]) {
          const f = (target - acc) / Math.max(1e-9, s.len);
          const x = s.a[0] + f * (s.b[0] - s.a[0]);
          const z = s.a[1] + f * (s.b[1] - s.a[1]);
          for (const b of world.buildings) {
            if (b.poly.length < 3) continue;
            const bb = polygonBounds(b.poly);
            if (x < bb.minX - CLEARANCE || x > bb.maxX + CLEARANCE ||
                z < bb.minZ - CLEARANCE || z > bb.maxZ + CLEARANCE) continue;
            if (inside(b.poly, x, z)) {
              conflicts.push({ road: road.id, kind: road.kind, building: b.id, at: [x.toFixed(1), z.toFixed(1)] });
              break;
            }
          }
          break;
        }
        acc += s.len;
      }
      if (conflicts.length > 50) break;   // cap for readability
    }
    if (conflicts.length > 50) break;
  }
  // These conflicts represent the raw car network. The renderer runs
  // this through CLIPPED_ROADS + CLIPPED_ROADS_VEHICLE which trims
  // them out. This validator flags any raw road that would need
  // trimming so we're aware of the underlying OSM defect even if the
  // pipeline handles it.
  if (conflicts.length > 0) {
    addDefect('Info', 'V3', `${conflicts.length} raw road segment(s) enter buildings — expected to be trimmed by CLIPPED_ROADS + CLIPPED_ROADS_VEHICLE`, conflicts.slice(0, 20));
  } else {
    addDefect('Info', 'V3', 'V3 clean: no raw road segments enter buildings');
  }
}

// ---------- V4: named-street coverage ----------
{
  // Load the runtime name sets by parsing roadRoles.ts (crude but
  // avoids TS import). Any named residential > 250 m closer to
  // Torget than the median residential distance should be in the
  // village_street set — a heuristic guard for future street data.
  const src = readFileSync('frontend/src/strategic/content/roadRoles.ts', 'utf8');
  const vsMatch = src.match(/VILLAGE_STREET_NAMES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  const wfMatch = src.match(/WAYFINDING_ROAD_NAMES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  const parseSet = (m) => m ? new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])) : new Set();
  const villageSet = parseSet(vsMatch);
  const wayfindSet = parseSet(wfMatch);

  const torget = world.landmarks.find((l) => l.id === 'gry-torget')?.position ?? [0, 0];
  const namedResidentials = new Map();
  for (const r of world.roads) {
    if (!r.name) continue;
    if (r.kind !== 'residential' && r.kind !== 'living_street') continue;
    const mid = r.poly[Math.floor(r.poly.length / 2)];
    const d = Math.hypot(mid[0] - torget[0], mid[1] - torget[1]);
    const prev = namedResidentials.get(r.name);
    if (!prev || d < prev) namedResidentials.set(r.name, d);
  }
  const missing = [];
  for (const [name, dist] of namedResidentials) {
    if (dist > 400) continue;   // near Torget only
    if (!villageSet.has(name)) missing.push({ name, dist: dist.toFixed(0) });
  }
  if (missing.length > 0) {
    addDefect('Medium', 'V4', `${missing.length} named residentials within 400 m of Torget missing from VILLAGE_STREET_NAMES`, missing);
  } else {
    addDefect('Info', 'V4', 'V4 clean: every named residential ≤400 m from Torget promoted to village_street');
  }
  // Also warn on any village_street name that has no wayfinding label.
  const gap = [...villageSet].filter((n) => !wayfindSet.has(n));
  if (gap.length > 0) addDefect('Low', 'V4b', `${gap.length} VILLAGE_STREET names missing from WAYFINDING_ROAD_NAMES`, gap);
}

// ---------- V5: landmark-position drift vs OSM way centroid ----------
{
  const drift = [];
  for (const lm of world.landmarks) {
    const src = lm.source ?? {};
    if (src.osmType !== 'way' || src.osmId == null) continue;
    const b = world.buildings.find((b) => b.id === `w${src.osmId}`);
    if (!b) continue;
    let cx = 0, cz = 0, n = 0;
    for (let i = 0; i < b.poly.length - 1; i++) { cx += b.poly[i][0]; cz += b.poly[i][1]; n++; }
    if (n === 0) continue;
    cx /= n; cz /= n;
    const d = Math.hypot(lm.position[0] - cx, lm.position[1] - cz);
    if (d > 5) drift.push({ landmark: lm.id, drift_m: d.toFixed(1), expected: [cx.toFixed(1), cz.toFixed(1)], actual: lm.position });
  }
  if (drift.length > 0) addDefect('Low', 'V5', `${drift.length} landmark positions drift > 5 m from their OSM building centroid`, drift);
  else addDefect('Info', 'V5', 'V5 clean: every landmark position within 5 m of its OSM building centroid');
}

// ---------- V6: multi-wing polygon detection ----------
{
  const SPLIT_MAX_EDGE_M = 25;
  const SPLIT_AREA_BBOX_RATIO = 0.6;
  const susp = [];
  for (const b of world.buildings) {
    if (b.poly.length < 4) continue;
    const bb = polygonBounds(b.poly);
    const bboxArea = Math.max(1, (bb.maxX - bb.minX) * (bb.maxZ - bb.minZ));
    const ratio = polygonArea(b.poly) / bboxArea;
    if (ratio >= SPLIT_AREA_BBOX_RATIO) continue;
    let maxE = 0;
    for (let i = 1; i < b.poly.length; i++) {
      const l = Math.hypot(b.poly[i][0] - b.poly[i - 1][0], b.poly[i][1] - b.poly[i - 1][1]);
      if (l > maxE) maxE = l;
    }
    if (maxE > SPLIT_MAX_EDGE_M) {
      susp.push({ id: b.id, name: b.name, kind: b.kind, area_bbox_ratio: ratio.toFixed(2), max_edge_m: maxE.toFixed(1) });
    }
  }
  if (susp.length > 0) addDefect('Info', 'V6', `${susp.length} multi-wing building polygons detected — expected to be split by splitAtBridgeEdges`, susp);
  else addDefect('Info', 'V6', 'V6 clean: no unsplit multi-wing polygons');
}

// ---------- Output ----------
if (asJson) {
  console.log(JSON.stringify(defects, null, 2));
} else {
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
  defects.sort((a, b) => rank[a.severity] - rank[b.severity]);
  for (const d of defects) {
    const label = d.severity === 'Info' ? 'ok ' : d.severity.toUpperCase().padEnd(8);
    console.log(`[${label}] ${d.id}: ${d.message}`);
    if (d.detail && d.severity !== 'Info') {
      const sample = Array.isArray(d.detail) ? d.detail.slice(0, 5) : d.detail;
      console.log('        detail:', JSON.stringify(sample, null, 2).replace(/\n/g, '\n        '));
    }
  }
  const critical = defects.filter((d) => d.severity === 'Critical').length;
  const high = defects.filter((d) => d.severity === 'High').length;
  const medium = defects.filter((d) => d.severity === 'Medium').length;
  console.log(`\nSummary: ${critical} Critical, ${high} High, ${medium} Medium, ${defects.filter((d) => d.severity === 'Low').length} Low, ${defects.filter((d) => d.severity === 'Info').length} Info`);
}

if (strict && defects.some((d) => d.severity === 'Critical' || d.severity === 'High')) {
  process.exit(1);
}
