#!/usr/bin/env node
// ORDER 025 metadata engine — Phases A/B/C/D/E/F.
//
// Single script producing every metadata artefact future district
// production will need. Reads world.json + district-assign output +
// runtime source (for handcrafted vs procedural classification), and
// emits:
//
//   reports/metadata/districts.json    Phase A — completeness per district
//   reports/metadata/buildings.json    Phase B — family classification
//   reports/metadata/facades.json      Phase C — facade metadata prep
//   reports/metadata/landmarks.json    Phase D — landmark audit
//   reports/metadata/streets.json      Phase E — named-street intelligence
//   reports/metadata/pois.json         Phase F — POI database
//
// Deterministic from the current world.json — regenerating with an
// unchanged input produces bit-identical output.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const WORLD_PATH = 'frontend/src/strategic/data/grythyttan-world.json';
const ASSIGN_PATH = 'reports/districts/assignment.json';
const OUT = 'reports/metadata';
mkdirSync(OUT, { recursive: true });

const world = JSON.parse(readFileSync(WORLD_PATH, 'utf8'));
const assign = JSON.parse(readFileSync(ASSIGN_PATH, 'utf8'));

// ---------- Helpers ----------
function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length - 1; i++) s += poly[i][0]*poly[i+1][1] - poly[i+1][0]*poly[i][1];
  return Math.abs(s) / 2;
}
function polygonCentroid(poly) {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; n++; }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}
function polygonBounds(p) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [x, z] of p) { if (x<a)a=x; if (x>b)b=x; if (z<c)c=z; if (z>d)d=z; }
  return { minX: a, maxX: b, minZ: c, maxZ: d };
}
function polylineLength(poly) {
  let s = 0;
  for (let i = 1; i < poly.length; i++) s += Math.hypot(poly[i][0]-poly[i-1][0], poly[i][1]-poly[i-1][1]);
  return s;
}

// Parse handcrafted set from source
const worldTs = readFileSync('frontend/src/strategic/content/world.ts', 'utf8');
const HL_MATCH = worldTs.match(/HANDCRAFTED_LANDMARK_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
const D2_MATCH = worldTs.match(/D2_HANDCRAFTED_BUILDING_IDS\s*=\s*\[([\s\S]*?)\]/);
const SHARED_MATCH = worldTs.match(/SHARED_CONTAINER_BUILDING_IDS\s*=\s*\[([\s\S]*?)\]/);
const parse = (m) => m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
const HANDCRAFTED_LM_IDS = new Set(parse(HL_MATCH));
const D2_HANDCRAFTED_WAYS = new Set(parse(D2_MATCH));
const SHARED_WAYS = new Set(parse(SHARED_MATCH));

function isHandcrafted(buildingId) {
  if (D2_HANDCRAFTED_WAYS.has(buildingId)) return 'D2';
  if (SHARED_WAYS.has(buildingId)) return 'D1-shared';
  const lm = world.landmarks.find((l) =>
    l.source?.osmType === 'way' &&
    l.source?.osmId != null &&
    'w' + l.source.osmId === buildingId &&
    HANDCRAFTED_LM_IDS.has(l.id));
  return lm ? 'D1' : null;
}

// ---------- Phase B — building classification ----------
// Deterministic family per building. Preference order:
//   1. explicit named landmarks → dedicated family
//   2. OSM building=* + amenity/shop hints
//   3. area-based reclassification for building=yes
//   4. fallback Unknown

const KIND_TO_FAMILY = {
  church: 'Religious',
  university: 'University',
  hotel: 'Commercial',
  school: 'School',
  train_station: 'Municipal',
  commercial: 'Commercial',
  industrial: 'Industrial',
  apartments: 'Apartment',
  residential: 'Apartment',
  house: 'Villa',
  detached: 'Villa',
  roof: 'Commercial',   // petrol canopies etc.
  // ORDER 032 additions from Vision Owner archive
  shed: 'Outbuilding',
  outbuilding: 'Outbuilding',
  chapel: 'Religious',
  historic: 'Historic'
};

function classifyBuilding(b) {
  // Explicit-name override for a handful of landmark-tier buildings
  if (b.name === 'Grythyttans Kyrka' || b.kind === 'church') return { family: 'Religious', confidence: 'high' };
  if (b.name === 'Kärnhuset' || b.name === 'Måltidens hus') return { family: 'University', confidence: 'high' };
  if (b.name === 'Grythyttans Gästgivaregård') return { family: 'Historic', confidence: 'high' };
  if (b.name === 'Herrgården Grythyttan') return { family: 'Historic', confidence: 'high' };
  if (b.name === 'Grythyttans Gamla Järnvägsstation') return { family: 'Historic', confidence: 'high' };
  if (b.name === 'Ingo') return { family: 'Commercial', confidence: 'high' };
  if (b.name === 'Tempo') return { family: 'Retail', confidence: 'high' };
  if (b.name === 'Pizzans Hus') return { family: 'Restaurant', confidence: 'high' };
  if (b.name === 'Swedecote') return { family: 'Industrial', confidence: 'high' };
  if (b.name === 'Länsmansgården') return { family: 'Historic', confidence: 'medium' };

  // amenity / shop hints
  if (b.amenity === 'fuel') return { family: 'Commercial', confidence: 'medium' };
  if (b.amenity === 'restaurant' || b.amenity === 'cafe' || b.amenity === 'pub') return { family: 'Restaurant', confidence: 'medium' };
  if (b.amenity === 'school' || b.amenity === 'kindergarten') return { family: 'School', confidence: 'medium' };
  if (b.amenity === 'place_of_worship') return { family: 'Religious', confidence: 'medium' };
  if (b.tourism === 'hotel' || b.tourism === 'guest_house') return { family: 'Commercial', confidence: 'medium' };
  if (b.historic) return { family: 'Historic', confidence: 'medium' };

  // Kind-based
  const kf = KIND_TO_FAMILY[b.kind];
  if (kf) return { family: kf, confidence: b.kind === 'yes' ? 'low' : 'medium' };

  // building=yes: area-based
  if (b.kind === 'yes') {
    const area = polygonArea(b.poly);
    if (area < 22) return { family: 'Outbuilding', confidence: 'low' };
    if (area < 55) return { family: 'Garage', confidence: 'low' };
    if (area < 140) return { family: 'Outbuilding', confidence: 'low' };
    if (area > 800) return { family: 'Warehouse', confidence: 'low' };
    return { family: 'Villa', confidence: 'low' };
  }
  return { family: 'Unknown', confidence: 'low' };
}

const buildings = world.buildings.map((b) => {
  const cls = classifyBuilding(b);
  const [cx, cz] = polygonCentroid(b.poly);
  const area = polygonArea(b.poly);
  const bb = polygonBounds(b.poly);
  return {
    id: b.id,
    name: b.name || null,
    osm_kind: b.kind,
    family: cls.family,
    confidence: cls.confidence,
    district: assign.assignment.buildings[b.id] || null,
    handcraft: isHandcrafted(b.id),
    centroid: [+cx.toFixed(1), +cz.toFixed(1)],
    area_m2: +area.toFixed(1),
    bbox_size: [+(bb.maxX - bb.minX).toFixed(1), +(bb.maxZ - bb.minZ).toFixed(1)],
    vertex_count: b.poly.length,
    osm_levels: b.buildingLevels || null,
    osm_height: b.height || null,
    osm_roof_shape: b.roofShape || null
  };
});
writeFileSync(`${OUT}/buildings.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: buildings.length,
  by_family: Object.fromEntries(
    Object.entries(buildings.reduce((acc, b) => { acc[b.family] = (acc[b.family]||0)+1; return acc; }, {}))
      .sort((a, b) => b[1] - a[1])
  ),
  by_confidence: buildings.reduce((acc, b) => { acc[b.confidence] = (acc[b.confidence]||0)+1; return acc; }, {}),
  handcraft_split: {
    D1: buildings.filter((b) => b.handcraft === 'D1').length,
    D2: buildings.filter((b) => b.handcraft === 'D2').length,
    'D1-shared': buildings.filter((b) => b.handcraft === 'D1-shared').length,
    procedural: buildings.filter((b) => !b.handcraft).length
  },
  buildings
}, null, 2));

// ---------- Phase C — facade metadata ----------
// Deterministic estimate of what the future renderer will need per
// building. Derived from geometry — no rendering change.
const facades = buildings.map((b) => {
  const bldg = world.buildings.find((x) => x.id === b.id);
  const perimeter = (() => {
    let s = 0;
    for (let i = 1; i < bldg.poly.length; i++) s += Math.hypot(bldg.poly[i][0]-bldg.poly[i-1][0], bldg.poly[i][1]-bldg.poly[i-1][1]);
    return s;
  })();
  // OBB-ish: longest edge as ridge axis
  let ridgeLen = 0;
  for (let i = 1; i < bldg.poly.length; i++) {
    const l = Math.hypot(bldg.poly[i][0]-bldg.poly[i-1][0], bldg.poly[i][1]-bldg.poly[i-1][1]);
    if (l > ridgeLen) ridgeLen = l;
  }
  // Rough storey estimate
  const family = b.family;
  const heightGuess =
    b.osm_height != null ? b.osm_height :
    b.osm_levels != null ? b.osm_levels * 3.0 :
    family === 'Villa' ? 4.5 :
    family === 'Apartment' ? 8.5 :
    family === 'Historic' ? 8.0 :
    family === 'School' ? 8.0 :
    family === 'University' ? 9.0 :
    family === 'Industrial' ? 7.0 :
    family === 'Warehouse' ? 6.0 :
    family === 'Commercial' ? 6.0 :
    family === 'Restaurant' ? 5.0 :
    family === 'Retail' ? 5.0 :
    family === 'Religious' ? 12.0 :
    family === 'Garage' ? 3.2 :
    family === 'Outbuilding' ? 4.0 :
    5.0;
  const storeys = Math.max(1, Math.min(4, Math.floor((heightGuess - 0.42) / 2.43)));
  const roofFamily =
    ['Villa', 'Historic'].includes(family) ? 'gable' :
    ['Apartment', 'School', 'University', 'Commercial'].includes(family) ? 'hip' :
    ['Industrial', 'Warehouse'].includes(family) ? 'flat' :
    family === 'Garage' ? 'shed' :
    family === 'Religious' ? 'steep-gable' :
    'flat';
  return {
    id: b.id,
    family,
    height_estimate_m: +heightGuess.toFixed(1),
    storey_estimate: storeys,
    ridge_length_m: +ridgeLen.toFixed(1),
    perimeter_m: +perimeter.toFixed(1),
    vertex_count: bldg.poly.length,
    corner_count: bldg.poly.length - 1,  // closed polygon
    complexity: bldg.poly.length > 12 ? 'complex' : bldg.poly.length > 6 ? 'medium' : 'simple',
    roof_family: roofFamily,
    roof_orientation_deg: null,  // future: compute from OBB
    material_hint: null,          // future: pick from material library
    approximation_level:
      b.osm_height != null ? 'measured' :
      b.osm_levels != null ? 'levels-known' :
      'typology-guess'
  };
});
writeFileSync(`${OUT}/facades.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: facades.length,
  by_roof_family: facades.reduce((acc, f) => { acc[f.roof_family] = (acc[f.roof_family]||0)+1; return acc; }, {}),
  by_complexity: facades.reduce((acc, f) => { acc[f.complexity] = (acc[f.complexity]||0)+1; return acc; }, {}),
  by_approximation_level: facades.reduce((acc, f) => { acc[f.approximation_level] = (acc[f.approximation_level]||0)+1; return acc; }, {}),
  facades
}, null, 2));

// ---------- Phase D — landmark audit ----------
const landmarkAudit = world.landmarks.map((l) => {
  const source = l.source || {};
  const buildingId = source.osmType === 'way' && source.osmId != null ? 'w' + source.osmId : null;
  const linkedBuilding = buildingId ? world.buildings.find((b) => b.id === buildingId) : null;
  const handcraft = HANDCRAFTED_LM_IDS.has(l.id);
  const district = assign.assignment.landmarks[l.id] || null;
  return {
    id: l.id,
    display: l.displayName,
    kind: l.kind,
    verification: l.verification,
    osm: { type: source.osmType || null, id: source.osmId || null, resolvedFrom: source.resolvedFrom || null },
    building_ref: buildingId,
    building_exists: !!linkedBuilding,
    building_name: linkedBuilding?.name || null,
    district,
    handcrafted_component: handcraft,
    clickable: true,
    reference_package: null,  // populated manually as reference packages land
    tier: handcraft ? 'landmark' : l.verification === 'verified' ? 'recognition' : 'approximate'
  };
});
writeFileSync(`${OUT}/landmarks.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: landmarkAudit.length,
  by_tier: landmarkAudit.reduce((acc, l) => { acc[l.tier] = (acc[l.tier]||0)+1; return acc; }, {}),
  by_verification: landmarkAudit.reduce((acc, l) => { acc[l.verification] = (acc[l.verification]||0)+1; return acc; }, {}),
  by_district: landmarkAudit.reduce((acc, l) => { acc[l.district || 'unassigned'] = (acc[l.district || 'unassigned']||0)+1; return acc; }, {}),
  landmarks: landmarkAudit
}, null, 2));

// ---------- Phase E — named-street intelligence ----------
const namedRoadIds = {};
for (const r of world.roads) {
  if (!r.name) continue;
  if (!namedRoadIds[r.name]) namedRoadIds[r.name] = [];
  namedRoadIds[r.name].push(r);
}
const streets = Object.entries(namedRoadIds).map(([name, segments]) => {
  const totalLen = segments.reduce((s, r) => s + polylineLength(r.poly), 0);
  const kinds = [...new Set(segments.map((r) => r.kind))];
  const refs = [...new Set(segments.map((r) => r.ref).filter(Boolean))];
  const districts = [...new Set(segments.map((r) => assign.assignment.roads[r.id]).filter(Boolean))];
  const buildingsServed = world.buildings.filter((b) => {
    const [cx, cz] = polygonCentroid(b.poly);
    return segments.some((r) => {
      const mid = r.poly[Math.floor(r.poly.length/2)];
      return Math.hypot(cx - mid[0], cz - mid[1]) < 40;
    });
  }).length;
  return {
    name,
    total_length_m: +totalLen.toFixed(0),
    segments: segments.length,
    kinds,
    refs,
    districts,
    buildings_within_40m: buildingsServed,
    hierarchy:
      refs.includes('244') ? 'primary' :
      kinds.includes('secondary') ? 'main' :
      kinds.includes('tertiary') ? 'secondary_connector' :
      kinds.includes('unclassified') ? 'local_street' :
      'residential'
  };
});
streets.sort((a, b) => b.total_length_m - a.total_length_m);
writeFileSync(`${OUT}/streets.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: streets.length,
  by_hierarchy: streets.reduce((acc, s) => { acc[s.hierarchy] = (acc[s.hierarchy]||0)+1; return acc; }, {}),
  total_named_length_km: +(streets.reduce((s, x) => s + x.total_length_m, 0) / 1000).toFixed(2),
  streets
}, null, 2));

// ---------- Phase F — POI database ----------
const POI_CATEGORY = {
  'gry-kyrka': { category: 'Religion', importance: 'high' },
  'gry-campus': { category: 'Education', importance: 'high' },
  'gry-gastgivaregard': { category: 'Accommodation', importance: 'high' },
  'gry-pizzanshus': { category: 'Food', importance: 'medium' },
  'gry-herrgard': { category: 'Accommodation', importance: 'high' },
  'gry-jarnvag': { category: 'Historic', importance: 'high' },
  'gry-skola': { category: 'Education', importance: 'high' },
  'gry-ip': { category: 'Sports', importance: 'medium' },
  'gry-torget': { category: 'Culture', importance: 'high' },
  'gry-kringlan': { category: 'Food', importance: 'medium' },
  'gry-cornelis': { category: 'Food', importance: 'medium' },
  'gry-glass': { category: 'Retail', importance: 'medium' },
  'gry-antik': { category: 'Retail', importance: 'low' },
  'gry-ingo': { category: 'Transport', importance: 'high' },   // petrol station is a transport POI
  'gry-tempo': { category: 'Retail', importance: 'high' },
  'gry-direkten': { category: 'Retail', importance: 'medium' },
  'gry-kantin-hyttblecket': { category: 'Food', importance: 'medium' },
  'gry-bergslagshus': { category: 'Retail', importance: 'medium' },
  // ORDER 029 promotions
  'gry-karnhuset': { category: 'Education', importance: 'high' },        // campus core building (Örebro universitet — RHS)
  'gry-lansmansgarden': { category: 'Historic', importance: 'medium' },  // historic building near Torget
  'gry-swedecote': { category: 'Industrial', importance: 'medium' },     // slate industry, Lokavägen 1
  'gry-miljongruvan': { category: 'Historic', importance: 'high' },      // heritage mine, outdoor museum substitute
  'gry-fotbollsplan': { category: 'Sports', importance: 'medium' },      // soccer pitch, distinct from IP
  // ORDER 032 additions
  'gry-reningsverk': { category: 'Industrial', importance: 'low' },      // municipal wastewater plant, multipolygon recovery
  'gry-qvarn': { category: 'Historic', importance: 'medium' }            // Grythytte Qvarn heritage mill, Vision Owner add
};
const pois = world.landmarks.map((l) => {
  const info = POI_CATEGORY[l.id] || { category: 'Unknown', importance: 'low' };
  const district = assign.assignment.landmarks[l.id] || null;
  return {
    id: l.id,
    display: l.displayName,
    category: info.category,
    importance: info.importance,
    district,
    landmark_tier: HANDCRAFTED_LM_IDS.has(l.id) ? 'landmark' : 'recognition',
    verification: l.verification,
    position: l.position
  };
});
writeFileSync(`${OUT}/pois.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: pois.length,
  by_category: pois.reduce((acc, p) => { acc[p.category] = (acc[p.category]||0)+1; return acc; }, {}),
  by_importance: pois.reduce((acc, p) => { acc[p.importance] = (acc[p.importance]||0)+1; return acc; }, {}),
  by_district: pois.reduce((acc, p) => { acc[p.district || 'unassigned'] = (acc[p.district || 'unassigned']||0)+1; return acc; }, {}),
  pois
}, null, 2));

// ---------- Phase A — district completeness ----------
const districts = assign.districts.map((d) => {
  const buildingsInDist = buildings.filter((b) => b.district === d.id);
  const facadesInDist = facades.filter((f) => buildingsInDist.some((b) => b.id === f.id));
  const landmarksInDist = pois.filter((p) => p.district === d.id);
  const streetsInDist = streets.filter((s) => s.districts.includes(d.id));
  const familyMix = buildingsInDist.reduce((acc, b) => { acc[b.family] = (acc[b.family]||0)+1; return acc; }, {});
  const handcraftedCount = buildingsInDist.filter((b) => b.handcraft).length;
  const proceduralCount = buildingsInDist.length - handcraftedCount;
  const measuredHeight = buildingsInDist.filter((b) => b.osm_height != null).length;
  const levelsKnown = buildingsInDist.filter((b) => b.osm_levels != null).length;
  const confidence =
    landmarksInDist.length > 0 && handcraftedCount / Math.max(1, buildingsInDist.length) > 0.3 ? 'high' :
    landmarksInDist.length > 0 ? 'medium' :
    buildingsInDist.length > 0 ? 'medium' : 'low';
  return {
    id: d.id,
    label: d.label,
    anchor: d.anchor,
    radius: d.radius,
    buildings_total: buildingsInDist.length,
    buildings_handcrafted: handcraftedCount,
    buildings_procedural: proceduralCount,
    landmarks: landmarksInDist.length,
    landmark_ids: landmarksInDist.map((p) => p.id),
    named_streets: streetsInDist.length,
    family_mix: familyMix,
    facade_completeness: {
      total: facadesInDist.length,
      with_measured_height: measuredHeight,
      with_osm_levels: levelsKnown,
      typology_guess: facadesInDist.length - measuredHeight - levelsKnown
    },
    confidence,
    review_readiness: confidence !== 'low' ? 'ready' : 'blocked',
    freeze_readiness: 'not-started'  // manual advance per DISTRICT_FREEZE_GUIDE.md
  };
});
writeFileSync(`${OUT}/districts.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: districts.length,
  districts
}, null, 2));

// ---------- Console summary ----------
console.log('=== ORDER 025 metadata engine ===');
console.log('  districts.json   ' + districts.length + ' districts');
console.log('  buildings.json   ' + buildings.length + ' buildings, ' + Object.keys(buildings.reduce((a, b) => (a[b.family]=true, a), {})).length + ' families');
console.log('  facades.json     ' + facades.length + ' facades');
console.log('  landmarks.json   ' + landmarkAudit.length + ' landmarks');
console.log('  streets.json     ' + streets.length + ' named streets');
console.log('  pois.json        ' + pois.length + ' POIs');
console.log('  outputs written to ' + OUT);
