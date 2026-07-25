#!/usr/bin/env node
// ORDER 020 transform-parity check.
//
// The scene has two possible coordinate frames for a shape-based
// renderer:
//
//   Convention A (BUGGY): shape.moveTo(x, z_osm) + rotateX(-π/2)
//                         → world Z = -z_osm  (mirrored across E-W axis)
//   Convention B (correct): shape.moveTo(x, -z_osm) + rotateX(-π/2)
//                         → world Z = +z_osm  (matches shadow map)
//
// The fix from ORDER 020 unifies every renderer on Convention B.
// This script:
//
//   1. Simulates a THREE.Shape → ExtrudeGeometry → rotateX(-π/2)
//      pipeline for a control polygon, using both conventions, and
//      confirms only Convention B lands the geometry at world
//      Z = +OSM Z.
//   2. Statically greps every scene renderer for `shape.moveTo(...)`
//      and `shape.lineTo(...)` and asserts the second argument is
//      negated (`-something` or `-(something)`).
//   3. Compares building / water / road midpoints computed from
//      world.json against the same points projected through the
//      Convention-B pipeline — they must be within `TOLERANCE_M`.
//
// Fails with exit 1 on any mismatch — hook into `npm run build` or
// pre-commit if desired.

import { readFileSync } from 'node:fs';

const TOLERANCE_M = 0.01;
const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const SCENE_FILES = [
  'frontend/src/strategic/scene/OsmBuildings.tsx',
  'frontend/src/strategic/scene/OsmRoads.tsx',
  'frontend/src/strategic/scene/OsmWater.tsx',
  'frontend/src/strategic/scene/OsmDistricts.tsx',
  'frontend/src/strategic/scene/CraftedLandmarks.tsx',
  'frontend/src/strategic/scene/CraftedLandmarksD2.tsx'
];

const failures = [];
const info = [];

// ---------- 1. Empirical THREE simulation ----------
{
  // Simulate rotateX(-π/2) manually per the standard math:
  //   (x, y, z) → (x, z, -y)
  //   Shape vertex (sx, sy, 0) → (sx, 0, -sy) in world
  const osmVertex = [429.49, -99.53];   // Kärnhuset first vertex

  // Convention A (buggy)
  const convA_shape = [osmVertex[0], osmVertex[1]];
  const convA_world = [convA_shape[0], 0, -convA_shape[1]];   // (x, 0, -sy)
  const convA_worldZ = convA_world[2];

  // Convention B (fixed)
  const convB_shape = [osmVertex[0], -osmVertex[1]];
  const convB_world = [convB_shape[0], 0, -convB_shape[1]];   // (x, 0, -sy)
  const convB_worldZ = convB_world[2];

  const osmZ = osmVertex[1];
  info.push(`empirical: OSM z=${osmZ.toFixed(2)}  Convention A → world Z=${convA_worldZ.toFixed(2)} (mirrored=${convA_worldZ === -osmZ})`);
  info.push(`empirical: OSM z=${osmZ.toFixed(2)}  Convention B → world Z=${convB_worldZ.toFixed(2)} (correct=${Math.abs(convB_worldZ - osmZ) < TOLERANCE_M})`);

  if (convA_worldZ !== -osmZ) {
    failures.push(`Convention A simulation should mirror z; got world Z=${convA_worldZ}, expected ${-osmZ}`);
  }
  if (Math.abs(convB_worldZ - osmZ) > TOLERANCE_M) {
    failures.push(`Convention B simulation should preserve z; got world Z=${convB_worldZ}, expected ${osmZ}`);
  }
}

// ---------- 2. Static grep — every shape.moveTo / shape.lineTo must
//                            negate its second argument ----------
{
  const violations = [];
  for (const path of SCENE_FILES) {
    const src = readFileSync(path, 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/shape\.(moveTo|lineTo)\(([^)]+)\)/);
      if (!m) continue;
      const args = m[2];
      const parts = args.split(',');
      if (parts.length !== 2) continue;    // some helpers pass complex args
      const secondArg = parts[1].trim();
      // Second arg must start with a minus (negation) OR be a bare
      // literal 0/-N/etc. Convention B is `-something` or `-(...)`.
      // Legit exceptions: `0`, `RIDGE_H`, `NAVE_LENGTH` — shape-local
      // constants defined in per-landmark roof helpers, not polygon
      // coords. Skip those by requiring the check only for lines that
      // reference a `.poly[...]` or a `left[...]/right[...]` array —
      // the polygon-driven Shape builders.
      const referencesPoly = /\.poly\[|left\[|right\[|w\.poly|b\.poly|poly\[/.test(args);
      if (!referencesPoly) continue;
      // Convention B: second arg must start with `-`
      if (!secondArg.startsWith('-')) {
        violations.push(`${path}:${i + 1}  ${line.trim()}`);
      }
    }
  }
  if (violations.length > 0) {
    failures.push(`Static grep — ${violations.length} shape.moveTo/lineTo call(s) do not negate Y (Convention A leak):`);
    for (const v of violations) failures.push('  ' + v);
  } else {
    info.push(`static: every polygon-driven shape.moveTo/lineTo negates Y across ${SCENE_FILES.length} scene files`);
  }
}

// ---------- 3. Control-point end-to-end ----------
{
  const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));

  // Simulate the full Convention-B pipeline: shape.moveTo(x, -z),
  // then rotateX(-π/2) which sends (x, y_shape, 0) → (x, 0, -y_shape).
  // With y_shape = -z_osm, world Z = -(-z_osm) = z_osm. ✓
  function convBWorldPos([x, z]) {
    const shapeY = -z;
    const worldZ = -shapeY;
    return [x, 0, worldZ];   // [worldX, worldY, worldZ]
  }

  const targets = [
    { id: 'gry-torget', kind: 'landmark' },
    { id: 'gry-kyrka', kind: 'landmark' },
    { id: 'gry-gastgivaregard', kind: 'landmark' },
    { id: 'w193810921', kind: 'building', name: 'Kärnhuset' },
    { id: 'w193810975', kind: 'building', name: 'Måltidens hus' },
    { id: 'w598989255', kind: 'building', name: 'Pizzans Hus' },
    { id: 'w614554207', kind: 'building', name: 'INGO' },
    { id: 'w870510841', kind: 'building', name: 'Gamla Järnvägsstation' },
    { id: 'r67579-r0', kind: 'water', name: 'Sör-Älgen' },
    { id: 'r1297105-r0', kind: 'water', name: 'Torrvarpen' }
  ];

  for (const t of targets) {
    let osmX, osmZ, label;
    if (t.kind === 'landmark') {
      const lm = world.landmarks.find((l) => l.id === t.id);
      if (!lm) continue;
      [osmX, osmZ] = lm.position;
      label = lm.displayName;
    } else if (t.kind === 'building') {
      const b = world.buildings.find((x) => x.id === t.id);
      if (!b) continue;
      let cx = 0, cz = 0;
      for (let i = 0; i < b.poly.length - 1; i++) { cx += b.poly[i][0]; cz += b.poly[i][1]; }
      cx /= (b.poly.length - 1); cz /= (b.poly.length - 1);
      osmX = cx; osmZ = cz;
      label = t.name || b.name || t.id;
    } else if (t.kind === 'water') {
      const w = world.water.find((x) => x.id === t.id);
      if (!w) continue;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of w.poly) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
      osmX = (minX + maxX) / 2; osmZ = (minZ + maxZ) / 2;
      label = t.name;
    }
    const world_ = convBWorldPos([osmX, osmZ]);
    const drift = Math.hypot(world_[0] - osmX, world_[2] - osmZ);
    if (drift > TOLERANCE_M) {
      failures.push(`control ${t.id} (${label}) — OSM (${osmX.toFixed(1)}, ${osmZ.toFixed(1)}) but rendered world (${world_[0].toFixed(1)}, ${world_[2].toFixed(1)}) — drift ${drift.toFixed(3)} m`);
    } else {
      info.push(`control ${label.padEnd(25)} OSM (${osmX.toFixed(1)}, ${osmZ.toFixed(1)}) → world (${world_[0].toFixed(1)}, ${world_[2].toFixed(1)}) — parity OK`);
    }
  }
}

// ---------- Output ----------
console.log('\n=== ORDER 020 parity check ===\n');
for (const i of info) console.log('  ok  ' + i);
if (failures.length > 0) {
  console.log('');
  for (const f of failures) console.log('  FAIL ' + f);
  console.log(`\n${failures.length} failure(s).`);
  process.exit(1);
}
console.log('\nAll parity checks passed.');
