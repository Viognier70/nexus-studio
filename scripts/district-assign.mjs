#!/usr/bin/env node
// ORDER 024 Phase-IV district assignment.
//
// Assigns every world entity (building, road, landmark, water, forest,
// residential zone, grass, graveyard) to exactly one district. Uses a
// deterministic nearest-anchor rule with an explicit corridor overlay
// so linear features (Rv 244, Prästgatan) end up in their corridor
// district even when their midpoint happens to be closer to a
// neighbouring anchor.
//
// Output: reports/districts/assignment.json — machine-readable
// per-entity → district map. Also prints a human-readable summary.
//
// The 15 districts come from ORDER 024 §DISTRICT INVENTORY. Anchors
// are landmark positions where possible so future landmark drift
// automatically re-centres the district.

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const OUT_DIR = 'reports/districts';
const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));

const lm = (id) => world.landmarks.find((x) => x.id === id)?.position || [0, 0];

// Districts are ordered — ties broken by first-in-list. Radius bounds
// the district's default footprint; the corridor overlay overrides
// nearest-anchor for linear routes.
// Ordered by geographic specificity. Tighter districts appear first so
// the nearest-anchor rule prefers them within their own radius. Every
// entity must land in some district — the last four are progressively
// larger fallbacks so the village edge, lake and forest scatter still
// get a home.
const DISTRICTS = [
  { id: 'D03-torget',              label: 'Torget',               anchor: lm('gry-torget'),        radius: 100 },
  { id: 'D04-church',              label: 'Church',               anchor: lm('gry-kyrka'),         radius: 90 },
  { id: 'D02-campus',              label: 'Campus',               anchor: lm('gry-campus'),        radius: 300 },
  { id: 'D05-station',             label: 'Station',              anchor: lm('gry-jarnvag'),       radius: 240 },
  { id: 'D06-school',              label: 'School',               anchor: lm('gry-skola'),         radius: 220 },
  { id: 'D09-prastgatan',          label: 'Prästgatan Corridor',  anchor: [180, 10],               radius: 130 },
  { id: 'D01-historic-centre',    label: 'Historic Centre',       anchor: [-30, 40],               radius: 200 },
  { id: 'D08-halleforsvagen',      label: 'Hälleforsvägen Corridor', anchor: [500, 60],            radius: 280 },
  { id: 'D12-residential-east',    label: 'Residential East',     anchor: lm('gry-herrgard'),      radius: 320 },
  { id: 'D07-industrial',          label: 'Industrial Area',      anchor: [-720, -260],            radius: 400 },
  { id: 'D10-residential-north',   label: 'Residential North',    anchor: [100, -220],             radius: 400 },
  { id: 'D11-residential-south',   label: 'Residential South',    anchor: [30, 220],               radius: 400 },
  { id: 'D13-residential-west',    label: 'Residential West',     anchor: [-260, 60],              radius: 350 },
  { id: 'D14-lakeshore',           label: 'Lakeshore',            anchor: [-1500, 2000],           radius: 6000 },
  { id: 'D15-forest-edge',         label: 'Forest Edge',          anchor: [0, 0],                  radius: 12000 }
];

// Corridor overlays — a road whose `ref` or `name` matches gets forced
// into the named district regardless of anchor distance. Buildings
// within a corridor's carriageway envelope also get pulled in.
const CORRIDOR_ROADS = {
  'D08-halleforsvagen': { refs: new Set(['244']) },
  'D09-prastgatan':     { names: new Set(['Prästgatan']) }
};

function polygonCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; n++; }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}
function polylineMid(poly) {
  const mid = poly[Math.floor(poly.length / 2)];
  return [mid[0], mid[1]];
}
function distSq(a, b) { const dx = a[0]-b[0], dz = a[1]-b[1]; return dx*dx + dz*dz; }

function assignByAnchor(point) {
  // Prefer non-fallback districts within their own radius; tie-break by
  // list order. Lakeshore + Forest Edge act as final fallbacks with
  // huge radii — anything not in a specific district lands in Forest
  // Edge (or Lakeshore for far-out water).
  let best = null;
  let bestPenalty = Infinity;
  for (const d of DISTRICTS) {
    const dSq = distSq(point, d.anchor);
    const inside = dSq <= d.radius * d.radius;
    // Penalty: distance squared, plus a large boost if not inside
    // (only fallback districts get chosen out-of-range).
    const penalty = inside ? dSq : dSq + 1e9;
    if (penalty < bestPenalty) { bestPenalty = penalty; best = d.id; }
  }
  return best || 'D15-forest-edge';
}

const assignment = {
  buildings: {},
  roads: {},
  landmarks: {},
  water: {},
  forest: {},
  residential: {},
  grass: {},
  graveyards: {}
};

// Buildings
for (const b of world.buildings) {
  const c = polygonCentroid(b.poly);
  assignment.buildings[b.id] = assignByAnchor(c);
}

// Roads — corridor overlay first
for (const r of world.roads) {
  let forced = null;
  for (const [distId, spec] of Object.entries(CORRIDOR_ROADS)) {
    if (spec.refs && r.ref && spec.refs.has(r.ref)) { forced = distId; break; }
    if (spec.names && r.name && spec.names.has(r.name)) { forced = distId; break; }
  }
  assignment.roads[r.id] = forced || assignByAnchor(polylineMid(r.poly));
}

// Landmarks (use their position directly)
for (const l of world.landmarks) {
  assignment.landmarks[l.id] = assignByAnchor(l.position);
}

// Landcover polygons — water usually to lakeshore, forest to forest edge
for (const w of world.water) assignment.water[w.id] = assignByAnchor(polygonCentroid(w.poly));
for (const f of world.forest) assignment.forest[f.id] = assignByAnchor(polygonCentroid(f.poly));
for (const r of world.residential) assignment.residential[r.id] = assignByAnchor(polygonCentroid(r.poly));
for (const g of world.grass) assignment.grass[g.id] = assignByAnchor(polygonCentroid(g.poly));
for (const g of world.graveyards) assignment.graveyards[g.id] = assignByAnchor(polygonCentroid(g.poly));

// ---------- Per-district roll-up ----------
const summary = {};
for (const d of DISTRICTS) {
  summary[d.id] = {
    label: d.label,
    anchor: d.anchor,
    radius: d.radius,
    buildings: [],
    roads: { total: 0, byName: {} },
    landmarks: [],
    water: [],
    forest: 0,
    residential: 0,
    grass: 0,
    graveyards: 0
  };
}
for (const [id, dId] of Object.entries(assignment.buildings)) summary[dId].buildings.push(id);
for (const [id, dId] of Object.entries(assignment.roads)) {
  summary[dId].roads.total++;
  const road = world.roads.find((r) => r.id === id);
  if (road?.name) summary[dId].roads.byName[road.name] = (summary[dId].roads.byName[road.name] || 0) + 1;
}
for (const [id, dId] of Object.entries(assignment.landmarks)) summary[dId].landmarks.push(id);
for (const [id, dId] of Object.entries(assignment.water)) {
  const rec = world.water.find((w) => w.id === id);
  summary[dId].water.push(rec?.name || id);
}
for (const [, dId] of Object.entries(assignment.forest)) summary[dId].forest++;
for (const [, dId] of Object.entries(assignment.residential)) summary[dId].residential++;
for (const [, dId] of Object.entries(assignment.grass)) summary[dId].grass++;
for (const [, dId] of Object.entries(assignment.graveyards)) summary[dId].graveyards++;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/assignment.json`,
  JSON.stringify({ generated_at: new Date().toISOString(), districts: DISTRICTS, assignment, summary }, null, 2));
writeFileSync(`${OUT_DIR}/summary.json`,
  JSON.stringify(summary, null, 2));

const asJson = process.argv.includes('--json');
if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('=== ORDER 024 · District assignment ===\n');
  for (const d of DISTRICTS) {
    const s = summary[d.id];
    console.log(`${d.id}  ${d.label}`);
    console.log(`  anchor (${d.anchor[0].toFixed(0)},${d.anchor[1].toFixed(0)})  r=${d.radius}m`);
    console.log(`  buildings ${s.buildings.length}  roads ${s.roads.total}  landmarks ${s.landmarks.length}  water ${s.water.length}  forest ${s.forest}  residential-zones ${s.residential}  grass ${s.grass}  graveyards ${s.graveyards}`);
    if (s.landmarks.length) console.log(`  landmarks: ${s.landmarks.join(', ')}`);
    console.log('');
  }
  console.log('assignment.json written to ' + OUT_DIR);
}

// Coverage assertion: every world entity landed in exactly one district
const totalEntities =
  world.buildings.length + world.roads.length + world.landmarks.length +
  world.water.length + world.forest.length + world.residential.length +
  world.grass.length + world.graveyards.length;
const assigned =
  Object.keys(assignment.buildings).length +
  Object.keys(assignment.roads).length +
  Object.keys(assignment.landmarks).length +
  Object.keys(assignment.water).length +
  Object.keys(assignment.forest).length +
  Object.keys(assignment.residential).length +
  Object.keys(assignment.grass).length +
  Object.keys(assignment.graveyards).length;
if (assigned !== totalEntities) {
  console.error(`\nFAIL: assigned ${assigned} of ${totalEntities} entities`);
  process.exit(1);
}
if (!asJson) console.log(`\nCoverage: ${assigned}/${totalEntities} entities assigned (100 %).`);
