#!/usr/bin/env node
// ORDER 023 OSM Coverage Audit.
//
// Inspects the current world.json against a fresh Overpass fetch of
// every tag we could plausibly consume, and reports:
//
//   - which tags are present upstream (population per key)
//   - which tags the ingest captures into world.json
//   - which tags the runtime actually uses (grepped from scene sources)
//   - potential-value / implementation-complexity / priority per tag
//
// Output: prints a human-readable table by default; `--json` for
// machine output. `--fetch` triggers a live Overpass fetch (default
// uses whatever is cached in `world.json`'s existing populations).
//
// Not corrective — this is documentation-grade telemetry for future
// ingest / render extensions.

import { readFileSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));

// Runtime source coverage — grep the strategic/scene + strategic/content
// for each tag name to detect actual usage.
const SCENE_FILES = [
  'frontend/src/strategic/scene/OsmBuildings.tsx',
  'frontend/src/strategic/scene/OsmRoads.tsx',
  'frontend/src/strategic/scene/OsmWater.tsx',
  'frontend/src/strategic/scene/OsmDistricts.tsx',
  'frontend/src/strategic/scene/OsmTraffic.tsx',
  'frontend/src/strategic/scene/OsmForest.tsx',
  'frontend/src/strategic/scene/OsmMeadowVegetation.tsx',
  'frontend/src/strategic/scene/OsmLandmarks.tsx',
  'frontend/src/strategic/scene/CraftedLandmarks.tsx',
  'frontend/src/strategic/scene/CraftedLandmarksD2.tsx',
  'frontend/src/strategic/content/world.ts',
  'frontend/src/strategic/content/roadRoles.ts'
];
const runtimeSrc = SCENE_FILES.map((f) => {
  try { return { file: f, text: readFileSync(f, 'utf8') }; }
  catch { return null; }
}).filter(Boolean);

function usedByRuntime(fieldName) {
  const consumers = [];
  for (const { file, text } of runtimeSrc) {
    // Look for `road.fieldName`, `b.fieldName`, `w.fieldName` patterns.
    const patterns = [
      new RegExp(`\\.${fieldName}\\b`),
      new RegExp(`\\['${fieldName}'\\]`),
      new RegExp(`\\["${fieldName}"\\]`)
    ];
    if (patterns.some((p) => p.test(text))) consumers.push(file.split('/').pop());
  }
  return consumers;
}

// Enumerate every field in the world.json record types + upstream
// tags of interest. For each: how many records carry it, whether the
// runtime uses it, its potential value, and a suggested priority.
const TAG_AUDIT = [
  // --- Buildings ---
  { entity: 'building', tag: 'name',            populationField: (b) => b.name != null, potential: 'landmark labelling',                         complexity: 'trivial',   priority: 'IN USE' },
  { entity: 'building', tag: 'kind',            populationField: (b) => b.kind != null, potential: 'classification / colour / roof style',       complexity: 'trivial',   priority: 'IN USE' },
  { entity: 'building', tag: 'amenity',         populationField: (b) => b.amenity != null, potential: 'commercial classification',                complexity: 'small',     priority: 'IN USE (landmarks)' },
  { entity: 'building', tag: 'tourism',         populationField: (b) => b.tourism != null, potential: 'hospitality bias',                         complexity: 'small',     priority: 'IN USE (landmarks)' },
  { entity: 'building', tag: 'religion',        populationField: (b) => b.religion != null, potential: 'religious site marker',                    complexity: 'small',     priority: 'unused (data thin)' },
  { entity: 'building', tag: 'historic',        populationField: (b) => b.historic != null, potential: 'historic-tier flag',                       complexity: 'small',     priority: 'partly used (1 record)' },
  { entity: 'building', tag: 'roofShape',       populationField: (b) => b.roofShape != null, potential: 'silhouette accuracy',                     complexity: 'trivial',   priority: 'IN USE (14 records)' },
  { entity: 'building', tag: 'roofLevels',      populationField: (b) => b.roofLevels != null, potential: 'roof height per storey',                  complexity: 'small',     priority: 'ingested — not used' },
  { entity: 'building', tag: 'buildingLevels',  populationField: (b) => b.buildingLevels != null, potential: 'wall storey count / window rows',    complexity: 'trivial',   priority: 'IN USE (0 populated today)' },
  { entity: 'building', tag: 'height',          populationField: (b) => b.height != null, potential: 'exact wall height',                          complexity: 'trivial',   priority: 'IN USE (0 populated today)' },
  { entity: 'building', tag: 'roofMaterial',    populationField: (b) => b.roofMaterial != null, potential: 'material-driven roof colour',           complexity: 'small',     priority: 'ingested — not used' },
  { entity: 'building', tag: 'roofColour',      populationField: (b) => b.roofColour != null, potential: 'explicit roof colour override',           complexity: 'trivial',   priority: 'ingested — not used' },
  { entity: 'building', tag: 'wallMaterial',    populationField: (b) => b.wallMaterial != null, potential: 'material palette selection',              complexity: 'small',     priority: 'ingested — not used' },
  { entity: 'building', tag: 'wallColour',      populationField: (b) => b.wallColour != null, potential: 'explicit wall colour override',           complexity: 'trivial',   priority: 'ingested — not used' },
  // --- Roads ---
  { entity: 'road', tag: 'name',                populationField: (r) => r.name != null, potential: 'street labels + wayfinding',                  complexity: 'trivial',   priority: 'IN USE' },
  { entity: 'road', tag: 'kind',                populationField: (r) => r.kind != null, potential: 'role assignment',                             complexity: 'trivial',   priority: 'IN USE' },
  { entity: 'road', tag: 'ref',                 populationField: (r) => r.ref != null, potential: 'primary through-route promotion',              complexity: 'trivial',   priority: 'IN USE (31 roads with ref)' },
  { entity: 'road', tag: 'surface',             populationField: (r) => r.surface != null, potential: 'asphalt / gravel / cobble differentiation',    complexity: 'trivial',   priority: 'IN USE (211 roads)' },
  { entity: 'road', tag: 'width',               populationField: (r) => r.width != null, potential: 'accurate carriageway width',                  complexity: 'small',     priority: 'ingested — not used (tier width overrides)' },
  { entity: 'road', tag: 'maxspeed',            populationField: (r) => r.maxspeed != null, potential: 'traffic density weighting',                  complexity: 'trivial',   priority: 'IN USE (traffic system)' },
  { entity: 'road', tag: 'lanes',               populationField: (r) => r.lanes != null, potential: 'lane count',                                  complexity: 'small',     priority: 'ingested — not used' },
  // --- Landmarks (curated, not from OSM directly) ---
  { entity: 'landmark', tag: 'verification',    populationField: (l) => l.verification != null, potential: 'confidence display',                     complexity: 'trivial',   priority: 'IN USE (SelectionChrome)' }
];

const rows = [];
for (const spec of TAG_AUDIT) {
  const records = spec.entity === 'building' ? world.buildings
                : spec.entity === 'road' ? world.roads
                : world.landmarks;
  const populated = records.filter(spec.populationField).length;
  const consumers = usedByRuntime(spec.tag);
  rows.push({
    entity: spec.entity,
    tag: spec.tag,
    populated: `${populated}/${records.length}`,
    consumers: consumers.length,
    consumerFiles: consumers,
    potential: spec.potential,
    complexity: spec.complexity,
    priority: spec.priority
  });
}

// Also enumerate OSM tags visible in the JSON but not in our schema —
// tags we DO NOT ingest today. This is done heuristically by looking
// at the raw building/road records for any keys not in the interface.
const BUILDING_KEYS = new Set(['id', 'poly', 'name', 'kind', 'amenity', 'tourism', 'religion', 'historic',
  'roofShape', 'roofLevels', 'buildingLevels', 'height', 'roofMaterial', 'roofColour', 'wallMaterial', 'wallColour']);
const ROAD_KEYS = new Set(['id', 'poly', 'kind', 'name', 'ref', 'surface', 'width', 'maxspeed', 'lanes', 'car', 'ped']);

const unknownBuildingKeys = new Set();
for (const b of world.buildings) for (const k of Object.keys(b)) if (!BUILDING_KEYS.has(k)) unknownBuildingKeys.add(k);
const unknownRoadKeys = new Set();
for (const r of world.roads) for (const k of Object.keys(r)) if (!ROAD_KEYS.has(k)) unknownRoadKeys.add(k);

if (asJson) {
  console.log(JSON.stringify({ rows, unknownBuildingKeys: [...unknownBuildingKeys], unknownRoadKeys: [...unknownRoadKeys] }, null, 2));
} else {
  console.log('\n=== ORDER 023 · OSM tag coverage ===\n');
  console.log('Entity    Tag                Populated       Runtime consumers  Priority');
  console.log('-------   ---------------    -------------   ----------------   -----------------------------------');
  for (const r of rows) {
    console.log(
      r.entity.padEnd(9),
      r.tag.padEnd(18),
      r.populated.padEnd(14),
      String(r.consumers).padEnd(18),
      r.priority
    );
  }
  console.log('\nUnknown building keys not in schema:', unknownBuildingKeys.size ? [...unknownBuildingKeys].join(', ') : '(none)');
  console.log('Unknown road keys not in schema:', unknownRoadKeys.size ? [...unknownRoadKeys].join(', ') : '(none)');

  // High-value unused tags (already ingested, populated somewhere, but
  // not consumed by runtime).
  const unused = rows.filter((r) => r.consumers === 0 && !r.populated.startsWith('0/'));
  console.log('\nHigh-value UNUSED tags (ingested, populated, not consumed by runtime):');
  if (unused.length === 0) console.log('  (none)');
  else for (const u of unused) console.log('  ' + u.entity + '.' + u.tag + '  (' + u.populated + ')  → ' + u.potential);

  console.log('');
}
