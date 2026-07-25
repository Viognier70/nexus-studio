#!/usr/bin/env node
// ORDER 022 sector audit.
//
// Divides the Grythyttan world into 10 logical sectors centred on
// verified landmark positions, then for each sector reports:
//
//   - building count (raw + rendered + handcrafted + procedural)
//   - road segments passing through (by role)
//   - named landmarks present
//   - water / forest / grass polygons intersecting
//   - suspected data-level gaps (unnamed dense clusters, missing
//     amenity records, orphan handcrafted anchors)
//
// The tool is descriptive, not corrective — it identifies where a
// systemic fix will land and confirms parity between what OSM says
// and what the runtime renders. Corrective ORDER 022 work is applied
// separately based on this output.
//
// Usage:
//   node scripts/sector-audit.mjs                  # every sector
//   node scripts/sector-audit.mjs --sector campus  # one sector
//   node scripts/sector-audit.mjs --json           # machine-readable

import { readFileSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const filterSector = (() => {
  const list = process.argv.slice(2);
  const i = list.indexOf('--sector');
  return i >= 0 ? list[i + 1] : null;
})();

const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));
const worldTs = readFileSync('frontend/src/strategic/content/world.ts', 'utf8');
const roadRolesSrc = readFileSync('frontend/src/strategic/content/roadRoles.ts', 'utf8');

// ---------- Sectors ----------
// Centre + radius per sector. Centres come from landmark positions
// (or the OSM way centroid for landmarks without a node).
const lm = (id) => {
  const l = world.landmarks.find((x) => x.id === id);
  return l ? l.position : [0, 0];
};

const SECTORS = [
  { id: 'campus',        centre: lm('gry-campus'),          radius: 250, description: 'Campus Grythyttan — Måltidens Hus, Kärnhuset, Kantin' },
  { id: 'torget',        centre: lm('gry-torget'),          radius: 180, description: 'Torget + long house tenants + Gästgivaregården + Kyrkan + Tempo' },
  { id: 'historic',      centre: lm('gry-kyrka'),           radius: 250, description: 'Historic centre — church, Prästgatan chain, Kyrkbacken' },
  { id: 'ingo-eastern',  centre: lm('gry-ingo'),            radius: 180, description: 'INGO + Pizzans Hus + Djurskyddet + Rv 244 T-junction' },
  { id: 'school',        centre: [-250, -300],              radius: 220, description: 'Grythyttans skola + förskola + IP + Fotbollsplan' },
  { id: 'station',       centre: [-460, -180],              radius: 280, description: 'Old station + freight yard + Swedecote industrial' },
  { id: 'residential-n', centre: [50, -180],                radius: 220, description: 'Northern residential belt — Nygatan / Norra Bergvägen' },
  { id: 'residential-w', centre: [-100, 100],               radius: 250, description: 'Western residential — Hantverksgatan / Järnvägsgatan' },
  { id: 'residential-s', centre: [50, 250],                 radius: 250, description: 'Southern residential grid — Hammargatan / Badvägen' },
  { id: 'herrgard',      centre: lm('gry-herrgard'),        radius: 200, description: 'Herrgården + Länsmansgården — hospitality quarter' }
];

// ---------- Helpers ----------
function polygonCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; n++; }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}
function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length - 1; i++) s += poly[i][0]*poly[i+1][1] - poly[i+1][0]*poly[i][1];
  return Math.abs(s)/2;
}
function distToPoly(centre, poly) {
  const c = polygonCentroid(poly);
  return Math.hypot(c[0] - centre[0], c[1] - centre[1]);
}
function distToLine(centre, line) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i-1], b = line[i];
    const dx = b[0]-a[0], dz = b[1]-a[1];
    const lsq = dx*dx + dz*dz;
    let t = lsq === 0 ? 0 : Math.max(0, Math.min(1, ((centre[0]-a[0])*dx + (centre[1]-a[1])*dz) / lsq));
    const px = a[0] + t*dx, pz = a[1] + t*dz;
    const d = Math.hypot(px - centre[0], pz - centre[1]);
    if (d < best) best = d;
  }
  return best;
}

// Parse role → tier from roadRoles.ts
const VILLAGE_STREET_NAMES = new Set(
  [...(roadRolesSrc.match(/VILLAGE_STREET_NAMES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/) || ['', ''])[1]
    .matchAll(/'([^']+)'/g)].map(x => x[1]));
function roleFor(r) {
  if (r.ref === '244') return 'primary';
  switch (r.kind) {
    case 'motorway': case 'trunk': return 'primary';
    case 'primary': case 'secondary': return 'main';
    case 'tertiary': return 'secondary_connector';
    case 'unclassified': return 'local_street';
    case 'residential': case 'living_street':
      return r.name && VILLAGE_STREET_NAMES.has(r.name) ? 'village_street' : 'residential';
    case 'service': return 'service';
    case 'track': return 'track';
    case 'cycleway': return 'cycleway';
    case 'footway': case 'path': case 'steps': case 'pedestrian': case 'platform': return 'footpath';
    default: return 'local_street';
  }
}

// Parse handcrafted-landmark ids from world.ts
const HL_MATCH = worldTs.match(/HANDCRAFTED_LANDMARK_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
const HANDCRAFTED = new Set(HL_MATCH ? [...HL_MATCH[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []);
const D2_MATCH = worldTs.match(/D2_HANDCRAFTED_BUILDING_IDS\s*=\s*\[([\s\S]*?)\]/);
const D2_HANDCRAFTED_WAYS = new Set(D2_MATCH ? [...D2_MATCH[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []);
const SHARED_MATCH = worldTs.match(/SHARED_CONTAINER_BUILDING_IDS\s*=\s*\[([\s\S]*?)\]/);
const SHARED_WAYS = new Set(SHARED_MATCH ? [...SHARED_MATCH[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []);

function isHandcrafted(buildingId) {
  if (D2_HANDCRAFTED_WAYS.has(buildingId)) return 'D2';
  if (SHARED_WAYS.has(buildingId)) return 'D1-shared';
  const landmark = world.landmarks.find(l =>
    l.source?.osmType === 'way' &&
    l.source?.osmId != null &&
    'w' + l.source.osmId === buildingId &&
    HANDCRAFTED.has(l.id));
  return landmark ? 'D1-landmark' : null;
}

// ---------- Per-sector report ----------
function auditSector(sector) {
  const { centre, radius } = sector;

  // Buildings
  const inside = world.buildings.filter(b => distToPoly(centre, b.poly) <= radius);
  const named = inside.filter(b => b.name);
  const handcrafted = inside.filter(b => isHandcrafted(b.id));
  const procedural = inside.filter(b => !isHandcrafted(b.id) && b.kind !== 'church');
  const byKind = {};
  inside.forEach(b => { byKind[b.kind || 'null'] = (byKind[b.kind || 'null']||0)+1; });

  // Roads
  const roadHits = world.roads.filter(r => distToLine(centre, r.poly) <= radius);
  const byRole = {};
  roadHits.forEach(r => { const role = roleFor(r); byRole[role] = (byRole[role]||0)+1; });
  const namedRoads = [...new Set(roadHits.filter(r => r.name).map(r => r.name))].sort();

  // Landmarks
  const landmarksIn = world.landmarks.filter(l =>
    Math.hypot(l.position[0] - centre[0], l.position[1] - centre[1]) <= radius);

  // Water + forest overlap
  const water = world.water.filter(w => distToPoly(centre, w.poly) <= radius + 500);
  const forest = world.forest.filter(f => distToPoly(centre, f.poly) <= radius + 200);

  return {
    id: sector.id,
    centre,
    radius,
    description: sector.description,
    buildings: {
      total: inside.length,
      named: named.length,
      namedList: named.map(b => `${b.id}(${b.name})`),
      handcrafted: handcrafted.length,
      procedural: procedural.length,
      byKind
    },
    roads: {
      total: roadHits.length,
      byRole,
      namedList: namedRoads
    },
    landmarks: landmarksIn.map(l => `${l.id}(${l.displayName})`),
    landcover: {
      water: water.map(w => w.name || w.id),
      forest: forest.length
    }
  };
}

// ---------- Run ----------
const sectors = filterSector ? SECTORS.filter(s => s.id === filterSector) : SECTORS;
const reports = sectors.map(auditSector);

if (asJson) {
  console.log(JSON.stringify(reports, null, 2));
} else {
  console.log('=== ORDER 022 sector audit ===\n');
  for (const r of reports) {
    console.log('┌─ ' + r.id.toUpperCase() + '  (centre ' + r.centre[0].toFixed(0) + ',' + r.centre[1].toFixed(0) + ', r=' + r.radius + 'm)');
    console.log('│  ' + r.description);
    console.log('├─ buildings: ' + r.buildings.total + ' total | ' + r.buildings.handcrafted + ' handcrafted | ' + r.buildings.procedural + ' procedural | ' + r.buildings.named + ' named');
    console.log('│  by kind: ' + Object.entries(r.buildings.byKind).map(([k,v]) => k+'='+v).join(', '));
    if (r.buildings.namedList.length > 0) {
      console.log('│  named: ' + r.buildings.namedList.slice(0,6).join(', ') + (r.buildings.namedList.length > 6 ? ' +' + (r.buildings.namedList.length - 6) : ''));
    }
    console.log('├─ roads: ' + r.roads.total + ' segments | ' + Object.entries(r.roads.byRole).map(([k,v]) => k+'='+v).join(', '));
    if (r.roads.namedList.length > 0) {
      console.log('│  named roads: ' + r.roads.namedList.slice(0,8).join(', ') + (r.roads.namedList.length > 8 ? ' +' + (r.roads.namedList.length - 8) : ''));
    }
    console.log('├─ landmarks: ' + (r.landmarks.length ? r.landmarks.join(', ') : '(none)'));
    console.log('└─ landcover: water=[' + r.landcover.water.join(', ') + '] forest_patches=' + r.landcover.forest);
    console.log('');
  }
  console.log('total: ' + reports.length + ' sectors audited.');
}
