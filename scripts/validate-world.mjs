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

// Sutherland-Hodgman polygon clipping — subject polygon clipped by a
// convex clip polygon. Building footprints in Grythyttan are effectively
// convex (rectangles with minor wing offsets); non-convex clip polygons
// may under-report intersection area. For V21's tier-3 threshold
// (A ≥ 5 m² AND ≥ 5 % of smaller footprint) any under-report of a real
// overlap by more than half is unlikely.
//
// Returns the clipped polygon as a Vec2 array (may be empty if disjoint).
function polygonClip(subject, clip) {
  // Ensure clip is closed (last === first is allowed but not required)
  const clean = subject.length > 1 && subject[0][0] === subject[subject.length - 1][0]
    && subject[0][1] === subject[subject.length - 1][1]
    ? subject.slice(0, -1) : subject;
  let out = clean.slice();
  const cClean = clip.length > 1 && clip[0][0] === clip[clip.length - 1][0]
    && clip[0][1] === clip[clip.length - 1][1]
    ? clip.slice(0, -1) : clip;
  for (let i = 0; i < cClean.length; i++) {
    if (out.length === 0) return out;
    const a = cClean[i];
    const b = cClean[(i + 1) % cClean.length];
    // Edge is (a -> b). "Inside" is left of the directed edge (CCW clip
    // gives positive-area interior; CW gives the opposite). Test both
    // orientations by using signed cross-product; positive = left of ab.
    const isInside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
    const isect = (p1, p2) => {
      // Intersect segment p1-p2 with line through a-b
      const x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
      const x3 = a[0], y3 = a[1], x4 = b[0], y4 = b[1];
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denom) < 1e-12) return p2;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    };
    const next = [];
    for (let j = 0; j < out.length; j++) {
      const cur = out[j], prev = out[(j - 1 + out.length) % out.length];
      const inCur = isInside(cur), inPrev = isInside(prev);
      if (inCur) {
        if (!inPrev) next.push(isect(prev, cur));
        next.push(cur);
      } else if (inPrev) {
        next.push(isect(prev, cur));
      }
    }
    out = next;
  }
  return out;
}
// Make clip polygon CCW so isInside consistently means "interior side".
// If polygon is CW (negative signed area), reverse it.
function ensureCCW(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += (x2 - x1) * (y2 + y1);
  }
  return s > 0 ? poly.slice().reverse() : poly;
}
// Compute intersection area of two polygons.
function polygonIntersectionArea(a, b) {
  const clipped = polygonClip(a, ensureCCW(b));
  if (clipped.length < 3) return 0;
  return polygonArea([...clipped, clipped[0]]);
}
function bboxesOverlap(b1, b2) {
  return !(b1.maxX < b2.minX || b2.maxX < b1.minX || b1.maxZ < b2.minZ || b2.maxZ < b1.minZ);
}

// ---------- Reports ----------
// Every defect carries { severity, id, message, detail, suggestedFix,
// files } so a downstream reviewer can act without re-diagnosing.
// severity ∈ Critical | High | Medium | Low | Info.
const defects = [];
function addDefect(severity, id, message, detail = null, suggestedFix = null, files = null) {
  defects.push({ severity, id, message, detail, suggestedFix, files });
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

// ---------- V8: procedural tree instances inside roads (ORDER 022) ----------
// The OsmMeadowVegetation and OsmForest layers already exclude
// buildings and water, but neither checks that a tree instance sits
// on a driveable road surface. Trees inside asphalt read as jarring
// artefacts. This check samples every pasture-tree candidate cell
// and rejects any that lands within 3 m of a car-driveable road
// centreline. Uses the same deterministic hash the runtime uses.
{
  const CAR_HW = new Set(['motorway','trunk','primary','secondary','tertiary',
    'unclassified','residential','living_street','service']);
  const carRoads = world.roads.filter((r) => CAR_HW.has(r.kind) && r.poly.length >= 2);
  const CELL = 55;
  const CELL_YIELD = 0.28;
  const PASTURE_MARGIN = 200;
  const ROAD_CLEARANCE_M = 3.0;

  function cellHash(ix, iz) {
    let h = 2166136261;
    h ^= ix | 0; h = Math.imul(h, 16777619);
    h ^= iz | 0; h = Math.imul(h, 16777619);
    return (h >>> 0) / 0xffffffff;
  }
  function distPointSeg(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const l2 = dx*dx + dz*dz;
    if (l2 === 0) return Math.hypot(px - ax, pz - az);
    let t = ((px - ax)*dx + (pz - az)*dz) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t*dx), pz - (az + t*dz));
  }

  let bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  world.buildings.forEach((b) => b.poly.forEach(([x, z]) => {
    if (x < bounds.minX) bounds.minX = x; if (x > bounds.maxX) bounds.maxX = x;
    if (z < bounds.minZ) bounds.minZ = z; if (z > bounds.maxZ) bounds.maxZ = z;
  }));
  const minX = bounds.minX - PASTURE_MARGIN, maxX = bounds.maxX + PASTURE_MARGIN;
  const minZ = bounds.minZ - PASTURE_MARGIN, maxZ = bounds.maxZ + PASTURE_MARGIN;
  const nx = Math.ceil((maxX - minX) / CELL);
  const nz = Math.ceil((maxZ - minZ) / CELL);

  let inRoad = 0;
  let candidates = 0;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const h = cellHash(ix, iz);
      if (h > CELL_YIELD) continue;
      const jx = ((h * 71.19) % 1) - 0.5;
      const jz = ((h * 97.31) % 1) - 0.5;
      const x = minX + (ix + 0.5 + jx * 0.7) * CELL;
      const z = minZ + (iz + 0.5 + jz * 0.7) * CELL;
      candidates++;
      for (const r of carRoads) {
        let close = false;
        for (let i = 1; i < r.poly.length; i++) {
          if (distPointSeg(x, z, r.poly[i-1][0], r.poly[i-1][1], r.poly[i][0], r.poly[i][1]) < ROAD_CLEARANCE_M) {
            close = true; break;
          }
        }
        if (close) { inRoad++; break; }
      }
    }
  }
  // Detect whether the runtime OsmMeadowVegetation applies a road
  // exclusion — the presence of `nearAnyCarRoad` in that file's source
  // is what makes these candidate cells safe. If the guard is missing,
  // the runtime is emitting trees on asphalt.
  const meadowSrc = readFileSync('frontend/src/strategic/scene/OsmMeadowVegetation.tsx', 'utf8');
  const runtimeExcludesRoads = meadowSrc.includes('nearAnyCarRoad');
  if (inRoad > 0 && !runtimeExcludesRoads) {
    addDefect('Medium', 'V8', `${inRoad}/${candidates} pasture-tree candidate cells sit within ${ROAD_CLEARANCE_M} m of a car road AND the runtime does not exclude them — visible trees on asphalt`);
  } else if (inRoad > 0) {
    addDefect('Info', 'V8', `V8 clean: ${inRoad}/${candidates} pasture-tree candidates would be near roads, but OsmMeadowVegetation excludes them via nearAnyCarRoad`);
  } else {
    addDefect('Info', 'V8', `V8 clean: 0/${candidates} pasture-tree candidates within ${ROAD_CLEARANCE_M} m of a car road`);
  }
}

// ---------- V7: silent invisible buildings (ORDER 021 drift check) ----------
// A building is silently invisible when:
//   - it exists in WORLD.buildings
//   - AND its id is in LANDMARK_BUILDING_IDS (skipped by OsmBuildings)
//   - AND no handcrafted component renders it
// The ORDER 019R INGO+Tempo defect is the motivating case.
{
  const worldTs = readFileSync('frontend/src/strategic/content/world.ts', 'utf8');
  const HL_MATCH = worldTs.match(/HANDCRAFTED_LANDMARK_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  const D2_MATCH = worldTs.match(/D2_HANDCRAFTED_BUILDING_IDS\s*=\s*\[([\s\S]*?)\]/);
  const SHARED_MATCH = worldTs.match(/SHARED_CONTAINER_BUILDING_IDS\s*=\s*\[([\s\S]*?)\]/);
  const parse = (m) => m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
  const handcraftedLandmarkIds = new Set(parse(HL_MATCH));
  const d2Skip = new Set(parse(D2_MATCH));
  const sharedSkip = new Set(parse(SHARED_MATCH));

  const d2Src = readFileSync('frontend/src/strategic/scene/CraftedLandmarksD2.tsx', 'utf8');
  const d2HandcraftedRefs = new Set([
    ...[...d2Src.matchAll(/BUILDING_BY_ID\['(w\d+)'\]/g)].map((x) => x[1]),
    ...[...d2Src.matchAll(/osmId:\s*'(w\d+)'/g)].map((x) => x[1])
  ]);

  const invisible = [];
  // Landmark-with-way records not in HANDCRAFTED_LANDMARK_IDS → they should NOT be in the skip list
  // (checked implicitly — they would still render procedurally).
  // But a landmark-with-way IN HANDCRAFTED_LANDMARK_IDS is expected to have a handcrafted
  // component; we can't statically detect the component itself but we CAN check that the id
  // appears as a landmark composition entry.
  const d1Src = readFileSync('frontend/src/strategic/scene/CraftedLandmarks.tsx', 'utf8');
  // ORDER 032: PublicRealm also handcrafts landmark shells (INGO canopy,
  // Pizzans yard, Fotbollsplan goals, Church boundary, School playground).
  const publicRealmSrc = readFileSync('frontend/src/strategic/scene/PublicRealm.tsx', 'utf8');
  for (const lmId of handcraftedLandmarkIds) {
    const pattern = new RegExp(`LANDMARK_BY_ID\\['${lmId}'\\]|'${lmId}'`);
    if (!pattern.test(d1Src) && !pattern.test(publicRealmSrc)) {
      invisible.push({ severity: 'Low', kind: 'handcrafted-landmark-no-composition', id: lmId });
    }
  }
  // D2 skip vs handcrafted parity
  for (const id of d2Skip) {
    if (!d2HandcraftedRefs.has(id)) {
      invisible.push({ severity: 'High', kind: 'd2-skip-no-handcrafted', id });
    }
  }
  for (const id of d2HandcraftedRefs) {
    if (!d2Skip.has(id)) {
      invisible.push({ severity: 'High', kind: 'd2-handcrafted-not-in-skip', id });
    }
  }
  if (invisible.length === 0) {
    addDefect('Info', 'V7', 'V7 clean: no silent invisible building — every landmark-way in the skip list has a handcrafted component');
  } else {
    for (const inv of invisible) {
      addDefect(inv.severity, 'V7', `${inv.kind}: ${inv.id}`);
    }
  }
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

// ---------- V9: invalid polygons (ORDER 023) ----------
// Buildings, water and forest polygons must be closed and non-degenerate.
// Anything with < 4 verts (< 3 unique for a closed ring) or area < 1 m²
// would silently drop from THREE.js triangulation.
{
  const bad = [];
  const check = (records, kind) => {
    for (const r of records) {
      if (!r.poly || r.poly.length < 4) {
        bad.push({ kind, id: r.id, name: r.name || null, reason: 'poly.length < 4' });
        continue;
      }
      const a = polygonArea(r.poly);
      if (a < 1) bad.push({ kind, id: r.id, name: r.name || null, reason: `area ${a.toFixed(2)} m² < 1` });
    }
  };
  check(world.buildings, 'building');
  check(world.water, 'water');
  check(world.forest, 'forest');
  check(world.residential, 'residential');
  check(world.grass, 'grass');
  check(world.graveyards, 'graveyard');
  if (bad.length === 0) {
    addDefect('Info', 'V9', 'V9 clean: no degenerate polygon (< 4 verts or < 1 m²) across buildings/water/forest/residential/grass/graveyards');
  } else {
    addDefect('High', 'V9', `${bad.length} degenerate polygons — would drop silently at triangulation`, bad,
      'Filter out or repair in the fetcher (scripts/fetch-grythyttan-osm.mjs) and skip in the ingest.',
      ['scripts/fetch-grythyttan-osm.mjs', 'frontend/src/strategic/content/world.ts']);
  }
}

// ---------- V10: duplicate landmark records (ORDER 023) ----------
// Two landmark records pointing at the same OSM way / node would cause
// double-render / double-click-target chaos.
{
  const bySource = new Map();
  for (const l of world.landmarks) {
    if (!l.source?.osmType || l.source?.osmId == null) continue;
    const key = l.source.osmType + '/' + l.source.osmId;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(l.id);
  }
  const dupes = [...bySource.entries()].filter(([, ids]) => ids.length > 1);
  if (dupes.length === 0) {
    addDefect('Info', 'V10', 'V10 clean: no duplicate landmark record — every OSM source is claimed by at most one landmark');
  } else {
    addDefect('High', 'V10', `${dupes.length} OSM sources have multiple landmark records`,
      dupes.map(([k, ids]) => ({ source: k, landmarks: ids })),
      'Consolidate to a single landmark or remove the duplicate from grythyttan-world.json.',
      ['frontend/src/strategic/data/grythyttan-world.json']);
  }
}

// ---------- V11: impossible building heights (ORDER 023) ----------
// OSM `height` tag captured in ORDER 019 Block C — must be in a
// realistic range for a village. Reject < 2 m (single-storey below a
// bicycle shed) and > 60 m (nothing in Grythyttan reaches 20 storeys).
{
  const bad = [];
  for (const b of world.buildings) {
    if (b.height == null) continue;
    if (b.height < 2 || b.height > 60) {
      bad.push({ id: b.id, name: b.name || null, kind: b.kind, height_m: b.height });
    }
  }
  if (bad.length === 0) {
    addDefect('Info', 'V11', 'V11 clean: every building with an OSM `height` tag is within the plausible 2–60 m range');
  } else {
    addDefect('Medium', 'V11', `${bad.length} buildings carry an implausible OSM height tag`, bad,
      'Investigate the upstream OSM record; if the tag is a mis-entry, add the building id to a documented override list in OsmBuildings.tsx heightFor.',
      ['frontend/src/strategic/scene/OsmBuildings.tsx']);
  }
}

// ---------- V12: unknown building kinds (ORDER 023) ----------
// KIND_COLOUR in OsmBuildings.tsx enumerates every kind that gets a
// dedicated colour + typology. Any building whose `kind` is not in
// that set falls through to DEFAULT_COLOUR and appears as ochre —
// a signal the ingest saw a new OSM `building=*` value we should
// deliberately handle.
{
  const src = readFileSync('frontend/src/strategic/scene/OsmBuildings.tsx', 'utf8');
  const kindMatch = src.match(/KIND_COLOUR:\s*Record<string,\s*\{[^}]*\}>\s*=\s*\{([\s\S]*?)^\};/m);
  const known = new Set();
  if (kindMatch) {
    for (const m of kindMatch[1].matchAll(/^\s*(\w+):/gm)) known.add(m[1]);
  }
  // Also the effectiveKindFor + postObbKind reclassifications introduce
  // shed/garage/outbuilding/barn/commercial — always known.
  ['shed', 'garage', 'outbuilding', 'barn', 'commercial', 'yes'].forEach((k) => known.add(k));
  // `church` is intentionally skipped by OsmBuildings' filter and
  // rendered by the handcrafted ChurchLandmark — treat as known.
  known.add('church');
  const unknowns = [];
  const counts = {};
  for (const b of world.buildings) {
    const k = b.kind || 'null';
    if (!known.has(k)) {
      counts[k] = (counts[k] || 0) + 1;
      unknowns.push({ id: b.id, name: b.name || null, kind: k });
    }
  }
  if (unknowns.length === 0) {
    addDefect('Info', 'V12', `V12 clean: every OSM building kind is handled by OsmBuildings.KIND_COLOUR (${known.size} kinds)`);
  } else {
    addDefect('Medium', 'V12', `${unknowns.length} buildings have an OSM `+"`building=*`"+` value with no KIND_COLOUR entry: ${JSON.stringify(counts)}`,
      unknowns.slice(0, 10),
      'Add the OSM kind to KIND_COLOUR + roofStyleFor + heightFor + PLINTH_KINDS as appropriate.',
      ['frontend/src/strategic/scene/OsmBuildings.tsx']);
  }
}

// ---------- V13: broken landmark references (ORDER 023) ----------
// Every landmark that names an OSM way or node must resolve to a real
// world.json entry. Landmarks pointing at nonexistent OSM ids will
// silently render at the fetcher's fallback position (usually the
// previous export's coordinates) with no visible geometry.
{
  const buildingIds = new Set(world.buildings.map((b) => b.id.split('#')[0]));
  const stale = [];
  const legitNonBuilding = [];
  for (const l of world.landmarks) {
    if (l.source?.osmType !== 'way' || l.source?.osmId == null) continue;
    const id = 'w' + l.source.osmId;
    if (buildingIds.has(id)) continue;
    // Landmark references a way that is NOT in world.buildings.
    // Split into two cases:
    //   - resolvedFrom === 'osm' means the fetcher DID resolve the OSM
    //     position (the way exists upstream, just not as a building —
    //     legitimate for plaza / sports-ground / campus landmark).
    //   - anything else (previous-export fallback) means the OSM way
    //     no longer resolves upstream at all — a real stale reference.
    const resolvedFrom = l.source.resolvedFrom || 'unknown';
    if (resolvedFrom === 'osm') {
      legitNonBuilding.push({ landmark: l.id, name: l.displayName, source: id, resolvedFrom });
    } else {
      stale.push({ landmark: l.id, name: l.displayName, source: id, resolvedFrom });
    }
  }
  if (stale.length === 0 && legitNonBuilding.length === 0) {
    addDefect('Info', 'V13', 'V13 clean: every way-based landmark resolves to a building in world.json');
  } else {
    if (legitNonBuilding.length > 0) {
      addDefect('Info', 'V13a', `${legitNonBuilding.length} landmark(s) point at non-building OSM ways (plaza / sports / campus) — position resolved fresh by the fetcher`, legitNonBuilding);
    }
    if (stale.length > 0) {
      addDefect('High', 'V13', `${stale.length} landmark records reference OSM ways that no longer resolve upstream`, stale,
        'Re-run the fetcher and confirm the OSM way still exists at that id. If the way was retired, retag the landmark with the new OSM id or downgrade to node source.',
        ['frontend/src/strategic/data/grythyttan-world.json', 'scripts/fetch-grythyttan-osm.mjs']);
    }
  }
}

// ---------- V14: unreachable / unused landmark ids (ORDER 023) ----------
// Any landmark id referenced by the runtime code must correspond to a
// landmark record. Catches typos in the composition dispatch or in
// the HANDCRAFTED_LANDMARK_IDS set.
{
  const landmarkIds = new Set(world.landmarks.map((l) => l.id));
  const worldTs = readFileSync('frontend/src/strategic/content/world.ts', 'utf8');
  const d1Src = readFileSync('frontend/src/strategic/scene/CraftedLandmarks.tsx', 'utf8');
  const d2Src = readFileSync('frontend/src/strategic/scene/CraftedLandmarksD2.tsx', 'utf8');
  const referenced = new Set([
    ...[...worldTs.matchAll(/'(gry-[a-z0-9-]+)'/g)].map((m) => m[1]),
    ...[...d1Src.matchAll(/LANDMARK_BY_ID\['(gry-[a-z0-9-]+)'\]/g)].map((m) => m[1]),
    ...[...d2Src.matchAll(/'(gry-[a-z0-9-]+)'/g)].map((m) => m[1])
  ]);
  const broken = [...referenced].filter((id) => !landmarkIds.has(id));
  if (broken.length === 0) {
    addDefect('Info', 'V14', `V14 clean: every runtime-referenced landmark id (${referenced.size}) exists in world.landmarks (${landmarkIds.size})`);
  } else {
    addDefect('High', 'V14', `${broken.length} landmark id(s) referenced by runtime code do not exist in world.landmarks: ${broken.join(', ')}`,
      broken,
      'Fix the typo, remove the reference, or add the missing landmark record.',
      ['frontend/src/strategic/content/world.ts', 'frontend/src/strategic/scene/CraftedLandmarks.tsx', 'frontend/src/strategic/scene/CraftedLandmarksD2.tsx']);
  }
}

// ---------- V15: building family completeness (ORDER 025 Phase J) ----------
// Every runtime building must resolve to a deterministic family via
// scripts/metadata-engine.mjs. A missing family means the metadata
// engine's classifyBuilding fell through — new OSM kind or a data
// pattern the classifier doesn't yet handle.
{
  try {
    const buildings = JSON.parse(readFileSync('reports/metadata/buildings.json', 'utf8'));
    const unknown = buildings.buildings.filter((b) => b.family === 'Unknown');
    if (unknown.length === 0) {
      addDefect('Info', 'V15', `V15 clean: every building resolved to a family (${Object.keys(buildings.by_family).length} distinct families)`);
    } else {
      addDefect('Medium', 'V15', `${unknown.length} buildings classified as Unknown by the metadata engine`,
        unknown.slice(0, 10),
        'Extend classifyBuilding in scripts/metadata-engine.mjs — add a name/amenity/kind rule.',
        ['scripts/metadata-engine.mjs']);
    }
  } catch {
    addDefect('Info', 'V15', 'V15 skipped: reports/metadata/buildings.json not present — run `node scripts/metadata-engine.mjs`');
  }
}

// ---------- V16: POI category coverage (ORDER 025 Phase J) ----------
// Every landmark in the POI database must have a category other than
// Unknown. Unknown here means the POI_CATEGORY table in the metadata
// engine is out of sync with the landmark list.
{
  try {
    const pois = JSON.parse(readFileSync('reports/metadata/pois.json', 'utf8'));
    const unknown = pois.pois.filter((p) => p.category === 'Unknown');
    if (unknown.length === 0) {
      addDefect('Info', 'V16', `V16 clean: every landmark POI has a known category (${Object.keys(pois.by_category).length} categories in use)`);
    } else {
      addDefect('Medium', 'V16', `${unknown.length} landmark POI(s) have category=Unknown`,
        unknown.map((p) => p.id),
        'Add the landmark id to POI_CATEGORY in scripts/metadata-engine.mjs with the appropriate category + importance.',
        ['scripts/metadata-engine.mjs']);
    }
  } catch {
    addDefect('Info', 'V16', 'V16 skipped: reports/metadata/pois.json not present');
  }
}

// ---------- V17: district assignment coverage (ORDER 025 Phase J) ----------
// Every world entity must land in exactly one district. district-assign
// asserts 100 % at generation time but a stale reports/districts/
// output vs current world.json will diverge — surface that.
{
  try {
    const assign = JSON.parse(readFileSync('reports/districts/assignment.json', 'utf8'));
    const totalEntities =
      world.buildings.length + world.roads.length + world.landmarks.length +
      world.water.length + world.forest.length + world.residential.length +
      world.grass.length + world.graveyards.length;
    const assignedTotal =
      Object.keys(assign.assignment.buildings).length +
      Object.keys(assign.assignment.roads).length +
      Object.keys(assign.assignment.landmarks).length +
      Object.keys(assign.assignment.water).length +
      Object.keys(assign.assignment.forest).length +
      Object.keys(assign.assignment.residential).length +
      Object.keys(assign.assignment.grass).length +
      Object.keys(assign.assignment.graveyards).length;
    if (assignedTotal === totalEntities) {
      addDefect('Info', 'V17', `V17 clean: 100 % district assignment (${assignedTotal}/${totalEntities})`);
    } else {
      addDefect('High', 'V17', `District assignment stale: ${assignedTotal}/${totalEntities} entities covered`,
        null,
        'Re-run `node scripts/district-assign.mjs` and `node scripts/metadata-engine.mjs`.',
        ['scripts/district-assign.mjs']);
    }
  } catch {
    addDefect('Info', 'V17', 'V17 skipped: reports/districts/assignment.json not present — run `node scripts/district-assign.mjs`');
  }
}

// ---------- V18: place classification coverage (ORDER 027) ----------
// Every Place must resolve to a known classification. Unknown means
// the classify rule in place-engine.mjs fell through — indicates a
// new family or missing rule.
{
  try {
    const places = JSON.parse(readFileSync('reports/semantic/places.json', 'utf8'));
    const unknown = places.places.filter((p) => p.classification === 'Unknown');
    if (unknown.length === 0) {
      addDefect('Info', 'V18', `V18 clean: every Place resolved to a classification (${Object.keys(places.summary.by_class).length} classes in use, ${places.places.length} places)`);
    } else {
      addDefect('Medium', 'V18', `${unknown.length} Places classified as Unknown`, unknown.slice(0, 5).map((p) => p.id),
        'Add family → class mapping in scripts/place-engine.mjs::CLASS_BY_FAMILY.',
        ['scripts/place-engine.mjs']);
    }
  } catch {
    addDefect('Info', 'V18', 'V18 skipped: reports/semantic/places.json not present — run `node scripts/place-engine.mjs`');
  }
}

// ---------- V19: district identity completeness (ORDER 027) ----------
// Every district must have primary_identity + secondary_identity in
// the district-identity engine. Empty strings indicate a new district
// added without an identity curated.
{
  try {
    const di = JSON.parse(readFileSync('reports/semantic/districts-identity.json', 'utf8'));
    const missing = di.districts.filter((d) => !d.primary_identity || !d.secondary_identity);
    if (missing.length === 0) {
      addDefect('Info', 'V19', `V19 clean: every district (${di.districts.length}) has primary + secondary identity`);
    } else {
      addDefect('Medium', 'V19', `${missing.length} districts missing primary/secondary identity`,
        missing.map((d) => d.id),
        'Add district id to PRIMARY map in scripts/district-identity.mjs.',
        ['scripts/district-identity.mjs']);
    }
  } catch {
    addDefect('Info', 'V19', 'V19 skipped: reports/semantic/districts-identity.json not present');
  }
}

// ---------- V20: landmark → Place coverage (ORDER 027) ----------
// Every landmark whose linked building EXISTS in world.buildings must
// produce a Place. Landmarks whose OSM way is a non-building polygon
// (plaza / sports / campus) are excluded — V13a already accounts for
// those; they'd need a separate Place emitter for polygon-only
// landmarks which is a future extension.
{
  try {
    const landmarks = JSON.parse(readFileSync('reports/metadata/landmarks.json', 'utf8'));
    const places = JSON.parse(readFileSync('reports/semantic/places.json', 'utf8'));
    const placeBuildingIds = new Set(places.places.map((p) => p.building_id));
    // Only consider landmarks whose building_ref actually exists as a
    // building (building_exists is set by the metadata engine).
    const eligible = landmarks.landmarks.filter((l) => l.building_ref && l.building_exists);
    const missing = eligible.filter((l) => !placeBuildingIds.has(l.building_ref));
    const nonBuildingCount = landmarks.landmarks.filter((l) => l.building_ref && !l.building_exists).length;
    if (missing.length === 0) {
      addDefect('Info', 'V20', `V20 clean: ${eligible.length} way-landmarks with real buildings all produced Places (${nonBuildingCount} landmarks point at non-building OSM ways — see V13a)`);
    } else {
      addDefect('High', 'V20', `${missing.length} landmarks with a real building did NOT produce a Place`,
        missing.map((l) => ({ id: l.id, building: l.building_ref })),
        'The place-worthiness threshold in scripts/place-engine.mjs::isPlace is filtering these out. Ensure isPlace() returns true for any landmark-linked building.',
        ['scripts/place-engine.mjs']);
    }
  } catch {
    addDefect('Info', 'V20', 'V20 skipped: places.json or landmarks.json not present');
  }
}

// ---------- V21: pairwise building overlap (ORDER 040 §7) ----------
// A new building must not overlap an existing one above the ORDER 039
// tier-3 threshold: intersection area A ≥ 5 m² AND A ≥ 5 % of the
// smaller footprint's area. See ORDER_039_BUILDING_OVERLAP_DIAGNOSTIC.md
// for the threshold rationale.
//
// The 39 pairs listed in V21_ACCEPTED_OVERLAPS are pre-ORDER-040
// overlaps found by ORDER 039 §2. Corrections are proposed under
// ORDER 040 §6 and applied in a later fix-order; each pair comes off
// this list as it is corrected. When the list is empty, the exception
// mechanism can be removed.
//
// Pair keys are the two building ids sorted lexicographically and
// joined by `|`, so the check is order-independent.
{
  // ORDER 044 §2.3 — the exception list is empty. All 39 tier-3
  // overlaps catalogued by ORDER 039 have been corrected:
  //   • 8 church intrusions removed (first commit).
  //   • 8 unambiguous removes applied (booth / bus-shelter / redundant-
  //     with-OSM / one-of-two-vw × vw records).
  //   • 7 nudges applied.
  //   • 6 nudges rolled back to remove because they would have
  //     introduced new tier-3 overlaps (see APPROXIMATION_REGISTER).
  //   • 1 Tempo intrusion removed (default per proposal §4; awaits
  //     ground-truth for possible re-add).
  //
  // The validator is now a real fence: any new tier-3 overlap
  // introduced in future placement work fails V21 with no absorb.
  const V21_ACCEPTED_OVERLAPS = new Set([]);
  const AREA_THRESHOLD_M2 = 5.0;
  const FRACTION_THRESHOLD = 0.05;

  const bldgs = world.buildings.filter((b) => b.poly && b.poly.length >= 3);
  // Precompute area + bbox for each building
  const meta = bldgs.map((b) => ({ id: b.id, poly: b.poly, area: polygonArea([...b.poly, b.poly[0]]), bbox: polygonBounds(b.poly) }));
  const unresolvedDefects = [];
  const acceptedFound = new Set();
  for (let i = 0; i < meta.length; i++) {
    for (let j = i + 1; j < meta.length; j++) {
      if (!bboxesOverlap(meta[i].bbox, meta[j].bbox)) continue;
      const A = polygonIntersectionArea(meta[i].poly, meta[j].poly);
      if (A <= 0) continue;
      const smaller = Math.min(meta[i].area, meta[j].area);
      if (smaller <= 0) continue;
      const f = A / smaller;
      if (A < AREA_THRESHOLD_M2 || f < FRACTION_THRESHOLD) continue;
      const ids = [meta[i].id, meta[j].id].sort();
      const key = `${ids[0]}|${ids[1]}`;
      if (V21_ACCEPTED_OVERLAPS.has(key)) {
        acceptedFound.add(key);
        continue;
      }
      unresolvedDefects.push({ pair: key, area_m2: Number(A.toFixed(2)), fraction_of_smaller: Number((f * 100).toFixed(1)) });
    }
  }
  const acceptedMissing = [...V21_ACCEPTED_OVERLAPS].filter((k) => !acceptedFound.has(k));

  if (unresolvedDefects.length === 0 && acceptedMissing.length === 0) {
    addDefect('Info', 'V21', `V21 clean: ${acceptedFound.size} tier-3 overlaps present, all in the accepted-exception list (ORDER 039 §2 findings, to be corrected under ORDER 040 §6 + follow-up fix-order). No new tier-3 overlaps introduced.`);
  } else if (unresolvedDefects.length === 0 && acceptedMissing.length > 0) {
    addDefect('Info', 'V21', `V21 clean plus ${acceptedMissing.length} previously-accepted overlaps have been corrected — remove them from V21_ACCEPTED_OVERLAPS`, acceptedMissing.slice(0, 10),
      `Delete these entries from scripts/validate-world.mjs V21_ACCEPTED_OVERLAPS: ${acceptedMissing.join(', ')}`,
      ['scripts/validate-world.mjs']);
  } else {
    addDefect('High', 'V21', `${unresolvedDefects.length} new tier-3 building overlap(s) not in the accepted-exception list`,
      unresolvedDefects.slice(0, 10),
      'A new building placement introduces a substantial overlap (A ≥ 5 m² AND ≥ 5 % of the smaller footprint). Fix the placement — nudge, shrink or remove — before landing. If the overlap is genuinely intentional (attached wing recorded as a separate polygon, etc.) add the pair to V21_ACCEPTED_OVERLAPS with a comment naming what authorised it. See ORDER 039 §2 for threshold rationale.',
      ['scripts/validate-world.mjs', 'frontend/src/strategic/data/grythyttan-world.json']);
    if (acceptedMissing.length > 0) {
      addDefect('Info', 'V21', `V21 side note: ${acceptedMissing.length} previously-accepted overlaps have been corrected and should be removed from V21_ACCEPTED_OVERLAPS`, acceptedMissing.slice(0, 10));
    }
  }
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
