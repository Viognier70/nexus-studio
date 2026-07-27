#!/usr/bin/env node
// ORDER 032 — village densification.
//
// Reality shows continuous residential coverage along every named village
// street. OSM has only a sparse subset. This script walks every named
// residential road in world.json and places hand-authored building
// footprints on both sides at regular intervals — skipping positions
// that overlap existing buildings, water, forest polygons, or landmark
// zones.
//
// Buildings use the fronting street's StreetProfile.colour_tendency
// (imported inline as a lookup table so this script has no TypeScript
// dependency).
//
// Runs deterministically: same inputs produce identical additions.

import { readFileSync, writeFileSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));

// ---------- Street profile lookup (inlined from streetProfiles.ts) ----------
// Only the fields the densifier needs: colour_tendency + tree_species hint
// for kind selection. Streets not in this table use DEFAULT.

const PROFILE = new Map(Object.entries({
  Kyrkogatan:      { colour: 'faluröd',  hasFence: true,  density: 0.75 },
  Torget:          { colour: 'faluröd',  hasFence: false, density: 0.3 },
  Kyrkbacken:      { colour: 'faluröd',  hasFence: true,  density: 0.75 },
  Skolgatan:       { colour: 'mixed',    hasFence: true,  density: 0.75 },
  Mässingsslatan:  { colour: 'institutional', hasFence: false, density: 0.5 },
  Prästgatan:      { colour: 'mixedwarm', hasFence: false, density: 0.65 },
  Nygatan:         { colour: 'brick',    hasFence: true,  density: 0.7 },
  Lokavägen:       { colour: 'brick',    hasFence: false, density: 0.35 },
  Badvägen:        { colour: 'cream',    hasFence: true,  density: 0.6 },
  Härjeredvägen:   { colour: 'mixedwarm', hasFence: true,  density: 0.5 },
  Hammargatan:     { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  Åsgatan:         { colour: 'mixedwarm', hasFence: true,  density: 0.75 },
  Stentrygatan:    { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  Skiffergatan:    { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  Bergslagsgatan:  { colour: 'mixedwarm', hasFence: false, density: 0.55 },
  'Baluns väg':    { colour: 'weathered', hasFence: false, density: 0.35 },
  Kvarnvägen:      { colour: 'mixedwarm', hasFence: true,  density: 0.55 },
  Magasinsgatan:   { colour: 'brick',    hasFence: false, density: 0.55 },
  Stationsgatan:   { colour: 'mixedwarm', hasFence: false, density: 0.65 },
  Järnvägsgatan:   { colour: 'mixedwarm', hasFence: false, density: 0.55 },
  Kolargatan:      { colour: 'mixedwarm', hasFence: true,  density: 0.65 },
  Stallgatan:      { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  'Norra Bergvägen':{ colour: 'mixedwarm', hasFence: true, density: 0.7 },
  'Östra Bergvägen':{ colour: 'mixedwarm', hasFence: true, density: 0.65 },
  'Västra Bergvägen':{ colour: 'mixedwarm', hasFence: true, density: 0.7 },
  Sjögatan:        { colour: 'mixedwarm', hasFence: true,  density: 0.6 },
  Hyttgatan:       { colour: 'mixedwarm', hasFence: true,  density: 0.65 },
  Hantverksgatan:  { colour: 'mixedwarm', hasFence: true,  density: 0.65 },
  Nygatan:         { colour: 'brick',    hasFence: true,  density: 0.7 },
  Östergatan:      { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  Vintervägen:     { colour: 'mixedwarm', hasFence: true,  density: 0.65 },
  Mellanvägen:     { colour: 'mixedwarm', hasFence: true,  density: 0.65 },
  'Erik Andersgatan':{ colour: 'mixedwarm', hasFence: true, density: 0.6 },
  Kyrkogårdsgatan: { colour: 'mixedwarm', hasFence: true,  density: 0.6 },
  Närkesgatan:     { colour: 'mixedwarm', hasFence: true,  density: 0.6 },
  'Baluns väg':    { colour: 'weathered', hasFence: false, density: 0.4 },
  Åsgatan:         { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  'Artur Lindqvists gata': { colour: 'mixedwarm', hasFence: true, density: 0.6 },
  Bergslagsgatan:  { colour: 'mixedwarm', hasFence: true,  density: 0.6 },
  Smedsgatan:      { colour: 'faluröd',  hasFence: true,  density: 0.7 },
  Hammargatan:     { colour: 'mixedwarm', hasFence: true,  density: 0.7 },
  'Baluns väg':    { colour: 'weathered', hasFence: false, density: 0.4 },
  Åsgatan:         { colour: 'mixedwarm', hasFence: true,  density: 0.7 }
}));
const DEFAULT_PROFILE = { colour: 'mixedwarm', hasFence: true, density: 0.55 };

// Colour palette per tendency. Each entry is a list of possible wall
// colours; hash mod length picks one. Roof pairs.
const PALETTES = {
  faluröd:       [{ w:'#a24a3a', r:'#3a2b22'},{ w:'#8a3f2f', r:'#3a2b22'},{ w:'#9c4432', r:'#402d24'}],
  cream:         [{ w:'#efe6d4', r:'#3a2b22'},{ w:'#e8dcb8', r:'#3a2b22'},{ w:'#e6c76a', r:'#3a2b22'},{ w:'#f5f0e0', r:'#3a2b22'}],
  brick:         [{ w:'#8a4232', r:'#3a2e20'},{ w:'#7c3a2a', r:'#3a2e20'},{ w:'#a24a3a', r:'#402d24'}],
  institutional: [{ w:'#c9b28e', r:'#5a3f30'},{ w:'#c4ac86', r:'#5a3f30'},{ w:'#d8d0bc', r:'#5a3f30'}],
  mixedwarm:     [{ w:'#a24a3a', r:'#3a2b22'},{ w:'#e8dcb8', r:'#3a2b22'},{ w:'#c9b28e', r:'#4a4136'},{ w:'#8a4232', r:'#3a2e20'}],
  weathered:     [{ w:'#6a4838', r:'#3a2b22'},{ w:'#7a4a35', r:'#3a2b22'},{ w:'#5a4432', r:'#3a2b22'}]
};

// ---------- Geometry helpers ----------

function makeBox(cx, cz, w, d, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]].map(([lx,lz]) => [
    Math.round((cx + lx*cos - lz*sin)*100)/100,
    Math.round((cx + lx*cos - lz*sin) !== 0 ? (cz + lx*sin + lz*cos)*100/100 : 0),
  ]);
}
// Simpler makeBox — the above had a bug (conditional). Correct:
function makeBoxFixed(cx, cz, w, d, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]].map(([lx,lz]) => [
    Math.round((cx + lx*cos - lz*sin)*100)/100,
    Math.round((cz + lx*sin + lz*cos)*100)/100
  ]);
}

function inside(polygon, x, z) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < (xj - xi) * (z - zi) / (zj - zi + 1e-9) + xi) hit = !hit;
  }
  return hit;
}

function distToLine(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx*dx + dz*dz;
  if (l2 === 0) return Math.hypot(px-ax, pz-az);
  let t = ((px-ax)*dx + (pz-az)*dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx*t), pz - (az + dz*t));
}

function polyCentroid(poly) {
  let cx=0, cz=0;
  for (const [x,z] of poly) { cx+=x; cz+=z; }
  return [cx/poly.length, cz/poly.length];
}

function polyBounds(poly) {
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  for (const [x,z] of poly) { minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,z); maxy=Math.max(maxy,z); }
  return { minx, miny, maxx, maxy };
}

// Cached spatial index: for fast overlap checks.
const existingCentroids = world.buildings.map(b => {
  const [cx, cz] = polyCentroid(b.poly);
  return { id: b.id, cx, cz };
});

function nearAnyExistingBuilding(x, z, minDist) {
  for (const c of existingCentroids) {
    if (Math.hypot(c.cx - x, c.cz - z) < minDist) return true;
  }
  return false;
}

function inAnyWater(x, z) {
  for (const w of world.water) {
    if (w.poly.length >= 3 && inside(w.poly, x, z)) return true;
  }
  return false;
}

function inAnyForest(x, z) {
  for (const f of world.forest || []) {
    if (f.poly.length >= 3 && inside(f.poly, x, z)) return true;
  }
  return false;
}

// Deterministic hash per (x,z) seed.
function h(x, z, salt) {
  let n = 2166136261 ^ Math.round(x*10) ^ (Math.round(z*10) << 3) ^ salt;
  n = Math.imul(n, 16777619);
  return ((n >>> 0) / 0xffffffff);
}

// ---------- Densifier ----------

const SPACING = 28;       // metres between successive buildings same side
const SETBACK = 20;       // metres perpendicular from road centreline to building centre
const MIN_DIST_EXISTING = 12;  // don't overlap existing buildings

let added = 0;
const newBuildings = [];

// Iterate each named residential road.
for (const road of world.roads) {
  if (!road.name) continue;
  // Skip roads that aren't residential/unclassified/tertiary — main roads
  // (primary/secondary) run through fields, not built-up strips.
  const kind = road.kind;
  if (kind !== 'residential' && kind !== 'unclassified' && kind !== 'tertiary' && kind !== 'living_street' && kind !== 'service') continue;

  // Skip rural / peripheral roads: any road whose midpoint is > 700 m
  // from village centre AND longer than 800 m is a countryside road
  // through fields, not a built-up village street.
  let minx=Infinity, miny=Infinity, maxx=-Infinity, maxy=-Infinity;
  let totalLen = 0;
  for (let i = 0; i < road.poly.length; i++) {
    const [x, z] = road.poly[i];
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (z < miny) miny = z; if (z > maxy) maxy = z;
    if (i > 0) totalLen += Math.hypot(x - road.poly[i-1][0], z - road.poly[i-1][1]);
  }
  const midX = (minx + maxx) / 2;
  const midZ = (miny + maxy) / 2;
  const distFromCentre = Math.hypot(midX, midZ);
  if (distFromCentre > 700 && totalLen > 800) continue;

  const prof = PROFILE.get(road.name) || DEFAULT_PROFILE;
  const density = prof.density;
  const palette = PALETTES[prof.colour] || PALETTES.mixedwarm;

  // Walk the polyline. At each SPACING step, try both sides.
  let accumulated = 0;
  let cumulative = 0;   // total metres along the road (for stable IDs)
  for (let i = 1; i < road.poly.length; i++) {
    const [ax, az] = road.poly[i-1];
    const [bx, bz] = road.poly[i];
    const dx = bx - ax, dz = bz - az;
    const segLen = Math.hypot(dx, dz);
    if (segLen === 0) continue;
    const nx = -dz / segLen;   // perpendicular
    const nz = dx / segLen;
    const roadAngle = Math.atan2(dz, dx);

    let s = SPACING - accumulated;
    while (s < segLen) {
      const px = ax + (dx/segLen) * s;
      const pz = az + (dz/segLen) * s;
      const cumHere = cumulative + s;
      for (const side of [+1, -1]) {
        const cx = px + nx * SETBACK * side;
        const cz = pz + nz * SETBACK * side;

        // Density gate — deterministic per position.
        if (h(cx, cz, 1) > density) { continue; }
        // Skip if too close to existing building
        if (nearAnyExistingBuilding(cx, cz, MIN_DIST_EXISTING)) continue;
        // Skip if in water / forest / residential polygon
        if (inAnyWater(cx, cz)) continue;
        if (inAnyForest(cx, cz)) continue;

        // Building size + palette from hash.
        const hash = h(cx, cz, 2);
        const paletteIdx = Math.floor(hash * palette.length);
        const p = palette[paletteIdx];
        const wobble = h(cx, cz, 3);
        const bwidth = 10 + wobble * 4;   // 10-14m
        const bdepth = 7 + wobble * 3;    // 7-10m

        // 15% chance the building is a small outbuilding/garage
        const smallHash = h(cx, cz, 4);
        const isSmall = smallHash > 0.85;

        const id = `vw-dnf-${road.id}-${side>0?'r':'l'}-${Math.round(cumHere)}`;
        const poly = makeBoxFixed(cx, cz, isSmall ? bwidth * 0.4 : bwidth, isSmall ? bdepth * 0.4 : bdepth, roadAngle);
        newBuildings.push({
          id,
          poly,
          name: null,
          kind: isSmall ? 'outbuilding' : 'house',
          amenity: null, tourism: null, religion: null, historic: null,
          roofShape: 'gable',
          roofLevels: null,
          buildingLevels: isSmall ? 1 : 2,
          height: isSmall ? 3.2 : (4.5 + wobble * 1.2),
          roofMaterial: null,
          roofColour: p.r,
          wallMaterial: null,
          wallColour: p.w
        });
        // Update centroid index so subsequent placements avoid this one.
        existingCentroids.push({ id, cx, cz });
        added++;
      }
      s += SPACING;
    }
    accumulated = (SPACING - ((s - segLen + SPACING) % SPACING)) % SPACING;
    cumulative += segLen;
  }
}

world.buildings.push(...newBuildings);
writeFileSync(WORLD_PATH, JSON.stringify(world) + '\n');
console.log(`densified: added ${added} buildings, total ${world.buildings.length}`);
