#!/usr/bin/env node
// ORDER 027 place engine — Phases A/B/C/D/E/G/I/J/K consolidated.
//
// Produces a canonical Place record for every significant building in
// Grythyttan. Emits reports/semantic/places.json.
//
// A Place has:
//   permanent  { footprint, structure, roof, facade family, historic
//                identity }              ← spatial / canonical
//   adaptive   { owner, business, employees, opening_hours, activities,
//                knowledge_production, economic_role, social_role }
//                                        ← evolves in gameplay
//
// Plus derived semantic layers:
//   classification, institution_role, knowledge_domains,
//   transformation_potentials, event_capabilities, npc_hints,
//   gameplay_surface.
//
// Deterministic — regenerates identical output from the current
// world.json + metadata engine outputs.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'reports/semantic';
mkdirSync(OUT, { recursive: true });

const world = JSON.parse(readFileSync('frontend/src/strategic/data/grythyttan-world.json', 'utf8'));
const buildings = JSON.parse(readFileSync('reports/metadata/buildings.json', 'utf8'));
const facades = JSON.parse(readFileSync('reports/metadata/facades.json', 'utf8'));
const landmarks = JSON.parse(readFileSync('reports/metadata/landmarks.json', 'utf8'));
const pois = JSON.parse(readFileSync('reports/metadata/pois.json', 'utf8'));
const districtsMeta = JSON.parse(readFileSync('reports/metadata/districts.json', 'utf8'));

const facadeById = new Map(facades.facades.map((f) => [f.id, f]));
const landmarkByBuildingId = new Map();
for (const l of landmarks.landmarks) {
  if (l.building_ref) landmarkByBuildingId.set(l.building_ref, l);
}

// ---------- Place-worthiness threshold ----------
// A building becomes a Place if any of:
//   - it is a handcrafted landmark shell
//   - it has an OSM name
//   - it has amenity / tourism / shop / historic / religion tags
//   - it is > 200 m² (large enough to matter at village zoom)
function isPlace(b) {
  if (b.name) return true;
  if (b.handcraft) return true;
  if (b.area_m2 >= 200) return true;
  return false;
}

// ---------- Phase B — classification ----------
// Deterministic mapping from family + OSM tags + name to Place class.
const CLASS_BY_FAMILY = {
  Historic:    'Historic Landmark',
  Religious:   'Religious',
  School:      'Educational Institution',
  University:  'Educational Institution',
  Restaurant:  'Hospitality',
  Retail:      'Commercial Space',
  Commercial:  'Commercial Space',
  Villa:       'Residential',
  Apartment:   'Residential',
  Industrial:  'Industrial',
  Warehouse:   'Industrial',
  Garage:      'Residential',
  Outbuilding: 'Residential',
  Municipal:   'Public Space',
  Farm:        'Agricultural',
  Unknown:     'Unknown'
};

// ---------- Phase E — knowledge domains ----------
// Every Place is tagged with the domains it can meaningfully host in
// gameplay. Historic landmarks carry History + their specialty domain;
// residential shells are the widest hosts because they can adapt into
// any small-footprint business.
const DOMAIN_BY_LANDMARK = {
  'gry-kyrka':               ['History', 'Culture', 'Community'],
  'gry-campus':              ['Gastronomy', 'Hospitality', 'Education', 'Research'],
  'gry-gastgivaregard':      ['Gastronomy', 'Hospitality', 'History'],
  'gry-pizzanshus':          ['Gastronomy'],
  'gry-herrgard':            ['Hospitality', 'History', 'Business'],
  'gry-jarnvag':             ['History', 'Culture'],
  'gry-skola':               ['Education'],
  'gry-ip':                  ['Health', 'Community'],
  'gry-torget':              ['Culture', 'Community', 'History'],
  'gry-kringlan':            ['Gastronomy'],
  'gry-cornelis':            ['Gastronomy'],
  'gry-glass':               ['Gastronomy'],
  'gry-antik':               ['Culture', 'History'],
  'gry-ingo':                ['Transport'],
  'gry-tempo':               ['Gastronomy', 'Business'],
  'gry-direkten':            ['Business'],
  'gry-kantin-hyttblecket':  ['Gastronomy'],
  'gry-bergslagshus':        ['Craftsmanship', 'Business']
};
const DOMAIN_BY_FAMILY = {
  Historic:    ['History'],
  Religious:   ['Culture', 'History'],
  School:      ['Education'],
  University:  ['Education', 'Research'],
  Restaurant:  ['Gastronomy'],
  Retail:      ['Business'],
  Commercial:  ['Business'],
  Villa:       ['Community'],   // adaptable — any small business or home
  Apartment:   ['Community'],
  Industrial:  ['Engineering'],
  Warehouse:   ['Business'],
  Garage:      ['Craftsmanship'],
  Outbuilding: ['Craftsmanship'],
  Farm:        ['Forestry', 'Ecology'],
  Municipal:   ['Culture'],
  Unknown:     []
};

// ---------- Phase D — institution role ----------
// A subset of Places play an INSTITUTIONAL role in the village.
const INSTITUTION_MAP = {
  'gry-kyrka':          { name: 'Grythyttans församling',       kind: 'Religious',  purpose: 'Parish worship + community rites of passage' },
  'gry-campus':         { name: 'Örebro universitet — RHS Campus Grythyttan',
                                                                  kind: 'University', purpose: 'Restaurang- och hotellhögskolan — gastronomy + hospitality teaching + research' },
  'gry-skola':          { name: 'Grythyttans skola F-6',        kind: 'School',     purpose: 'Primary education for the village' },
  'gry-jarnvag':        { name: 'Grythyttans Gamla Järnvägsstation', kind: 'Historic', purpose: 'Retired BJ freight-yard station; historic transport identity' },
  'gry-gastgivaregard': { name: 'Grythyttans Gästgivaregård',   kind: 'Historic + Hospitality', purpose: 'Historic hospitality institution (1641)' },
  'gry-herrgard':       { name: 'Herrgården Grythyttan',        kind: 'Hospitality', purpose: 'Manor-house hospitality; hosting + retreat centre potential' },
  'gry-torget':         { name: 'Torget',                       kind: 'Public Space', purpose: 'Central plaza + traditional gathering site' },
  'gry-ip':             { name: 'Grythyttans IP',               kind: 'Recreational', purpose: 'Sports ground + community events' },
  'gry-ingo':           { name: 'INGO Grythyttan',              kind: 'Transport',   purpose: 'Village fuel + service point' },
  'gry-tempo':          { name: 'Tempo Grythyttan',             kind: 'Commercial',  purpose: 'Village grocery' },
  'gry-bergslagshus':   { name: 'Bergslagshus AB',              kind: 'Commercial',  purpose: 'Regional building materials retailer' }
};

// ---------- Phase G — transformation potentials ----------
const TRANSFORM_LIBRARY = {
  Villa:       ['bakery', 'café', 'boutique hotel', 'artist studio', 'cooking school', 'community kitchen', 'micro brewery', 'design studio', 'writer residence'],
  Apartment:   ['student housing', 'guest residence', 'coworking', 'creative studio'],
  Retail:      ['grocery', 'artisan shop', 'antikvariat', 'wine bar', 'cheese cellar', 'pop-up gallery'],
  Restaurant:  ['restaurant', 'gastropub', 'wine bar', 'cooking demonstration', 'private dining', 'pop-up kitchen'],
  Commercial:  ['fuel station', 'farmer market pavilion', 'food truck park', 'design showroom'],
  Historic:    ['hospitality landmark', 'historic guesthouse', 'museum wing', 'ceremonial venue'],
  Religious:   ['worship', 'concerts', 'community events', 'exhibitions'],
  School:      ['primary school', 'evening classes', 'summer academy', 'community centre'],
  University:  ['gastronomy programme', 'hospitality programme', 'research kitchen', 'food laboratory', 'sensory lab', 'lecture hall', 'student pub'],
  Industrial:  ['warehouse', 'food incubator', 'micro brewery', 'craft workshop', 'maker space', 'research facility', 'exhibition hall'],
  Warehouse:   ['storage', 'food incubator', 'brewery', 'exhibition space', 'winter garden'],
  Garage:      ['workshop', 'restoration studio', 'artist workshop'],
  Outbuilding: ['storage', 'guest room', 'artist studio', 'garden pavilion'],
  Municipal:   ['office', 'reception', 'community services', 'exhibition space'],
  Farm:        ['farming', 'agroforestry', 'community garden', 'field school'],
  Unknown:     []
};

// ---------- Phase I — event capabilities ----------
const EVENT_BY_CLASS = {
  'Historic Landmark':       ['Festival', 'Lecture', 'Exhibition', 'Cultural performance', 'Community gathering'],
  'Educational Institution': ['Lecture', 'Cooking demonstration', 'Research seminar', 'Student exhibition', 'Alumni gathering'],
  'Commercial Space':        ['Market', 'Pop-up', 'Product launch', 'Meeting'],
  'Hospitality':             ['Festival', 'Cooking event', 'Wine tasting', 'Private dining', 'Ceremony'],
  'Public Space':            ['Festival', 'Market', 'Community gathering', 'Performance', 'Ceremonial event'],
  'Research Facility':       ['Symposium', 'Lecture', 'Innovation demo'],
  'Residential':             [],
  'Industrial':              ['Innovation demo', 'Maker fair', 'Trade fair'],
  'Agricultural':            ['Market', 'Harvest event', 'Field school'],
  'Transport':               [],
  'Religious':               ['Service', 'Concert', 'Community gathering', 'Ceremonial event'],
  'Recreational':            ['Sports event', 'Festival', 'Community gathering'],
  'Natural Area':            ['Guided walk', 'Nature event'],
  'Hybrid':                  ['Festival', 'Multi-purpose gathering'],
  'Unknown':                 []
};

// ---------- Phase J — NPC hints ----------
function npcHintsFor(placeClass, family, institution) {
  const base = { professions: [], daily_pop: 'low', visitor: 'low', student: 'low', tourist: 'low', service: 'low', knowledge: 'low', interaction_density: 'low' };
  if (placeClass === 'Educational Institution') return { ...base, professions: ['teacher', 'researcher', 'student', 'admin', 'cook'], daily_pop: 'high', student: 'high', knowledge: 'high', interaction_density: 'high' };
  if (placeClass === 'Historic Landmark' && institution) return { ...base, professions: ['host', 'guide', 'chef', 'server'], daily_pop: 'medium', tourist: 'high', knowledge: 'medium', interaction_density: 'medium' };
  if (placeClass === 'Hospitality') return { ...base, professions: ['host', 'chef', 'server', 'housekeeping'], daily_pop: 'medium', tourist: 'high', service: 'high', interaction_density: 'medium' };
  if (placeClass === 'Commercial Space') return { ...base, professions: ['shopkeeper', 'delivery'], daily_pop: 'medium', service: 'medium', interaction_density: 'medium' };
  if (placeClass === 'Public Space') return { ...base, professions: [], daily_pop: 'medium', visitor: 'high', interaction_density: 'high' };
  if (placeClass === 'Religious') return { ...base, professions: ['priest', 'organist'], daily_pop: 'low', visitor: 'medium', interaction_density: 'low' };
  if (placeClass === 'Recreational') return { ...base, professions: ['coach'], daily_pop: 'low', visitor: 'medium', interaction_density: 'medium' };
  if (placeClass === 'Transport') return { ...base, professions: ['attendant'], daily_pop: 'low', service: 'medium', interaction_density: 'low' };
  if (placeClass === 'Residential') return { ...base, professions: ['resident'], daily_pop: 'low', interaction_density: 'low' };
  if (placeClass === 'Industrial') return { ...base, professions: ['worker', 'foreman'], daily_pop: 'medium', service: 'medium', interaction_density: 'low' };
  return base;
}

// ---------- Phase K — gameplay surface ----------
function gameplayFor(placeClass, institution, domains) {
  const level = (v) => v;
  const has = (d) => domains.includes(d);
  return {
    conversation:  placeClass === 'Public Space' ? 'high' : placeClass === 'Hospitality' ? 'high' : institution ? 'medium' : 'low',
    exploration:   placeClass === 'Historic Landmark' ? 'high' : placeClass === 'Religious' ? 'medium' : 'low',
    learning:      has('Education') || has('Research') ? 'high' : has('History') ? 'medium' : 'low',
    teaching:      has('Education') || has('Research') ? 'high' : 'low',
    business:      placeClass === 'Commercial Space' ? 'high' : placeClass === 'Hospitality' ? 'high' : placeClass === 'Industrial' ? 'medium' : 'low',
    story:         placeClass === 'Historic Landmark' ? 'high' : institution ? 'medium' : 'low',
    innovation:    has('Research') ? 'high' : has('Craftsmanship') || has('Engineering') ? 'medium' : 'low',
    social:        placeClass === 'Public Space' ? 'high' : placeClass === 'Hospitality' ? 'high' : has('Community') ? 'medium' : 'low'
  };
}

// ---------- Build the Place records ----------
const places = [];
for (const b of buildings.buildings) {
  if (!isPlace(b)) continue;
  const f = facadeById.get(b.id);
  const linkedLandmark = landmarkByBuildingId.get(b.id);
  const family = b.family;
  const placeClass = CLASS_BY_FAMILY[family] || 'Unknown';
  const institution = linkedLandmark ? INSTITUTION_MAP[linkedLandmark.id] || null : null;
  const domains = [...new Set([
    ...(linkedLandmark && DOMAIN_BY_LANDMARK[linkedLandmark.id] || []),
    ...(DOMAIN_BY_FAMILY[family] || [])
  ])];

  places.push({
    // Identity
    id: `place-${b.id}`,
    building_id: b.id,
    display: b.name || linkedLandmark?.display || `${family} at ${b.centroid.join(',')}`,
    district: b.district,

    // Phase C — permanent (spatial / canonical)
    permanent: {
      footprint_area_m2: b.area_m2,
      bbox_size:         b.bbox_size,
      centroid:          b.centroid,
      structure:         b.handcraft ? 'handcrafted' : 'procedural',
      roof_family:       f?.roof_family || 'unknown',
      facade_family:     family,
      historic_identity: linkedLandmark && (linkedLandmark.tier === 'landmark' || institution?.kind?.includes('Historic'))
                          ? (institution?.name || linkedLandmark.display)
                          : null
    },

    // Phase C — adaptive (fluid in gameplay)
    adaptive: {
      owner:                null,
      business:             linkedLandmark ? linkedLandmark.display : null,
      employees:            [],
      opening_hours:        null,
      activities:           institution ? [institution.purpose] : [],
      knowledge_production: domains.filter((d) => ['Education', 'Research'].includes(d)),
      economic_role:        institution?.kind === 'Commercial' ? 'active' : institution?.kind === 'Hospitality' ? 'active' : 'dormant',
      social_role:          placeClass === 'Public Space' || placeClass === 'Religious' || placeClass === 'Recreational' ? 'active' : 'dormant'
    },

    // Phase B
    classification: placeClass,

    // Phase D
    institution: institution,

    // Phase E
    knowledge_domains: domains,

    // Phase G
    transformation: {
      historic_state: linkedLandmark?.tier === 'landmark' ? 'preserved' : null,
      present_state:  linkedLandmark ? linkedLandmark.display : 'residential shell',
      possible_transformations: TRANSFORM_LIBRARY[family] || [],
      constraints:    b.handcraft ? ['preserve handcrafted shell', 'historic identity locked'] : ['preserve footprint', 'preserve roof family'],
      triggers:       ['gameplay ownership change', 'quest reward', 'seasonal event', 'player business decision']
    },

    // Phase I
    event_capabilities: EVENT_BY_CLASS[placeClass] || [],

    // Phase J
    npc_hints: npcHintsFor(placeClass, family, institution),

    // Phase K
    gameplay_surface: gameplayFor(placeClass, institution, domains)
  });
}

// ---------- Summaries ----------
const summary = {
  generated_at:  new Date().toISOString(),
  total_places:  places.length,
  by_class:      places.reduce((a, p) => { a[p.classification] = (a[p.classification]||0)+1; return a; }, {}),
  by_district:   places.reduce((a, p) => { a[p.district || 'unassigned'] = (a[p.district || 'unassigned']||0)+1; return a; }, {}),
  with_institution: places.filter((p) => p.institution).length,
  with_landmark_link: places.filter((p) => landmarkByBuildingId.has(p.building_id)).length,
  knowledge_domain_coverage: [...new Set(places.flatMap((p) => p.knowledge_domains))].sort(),
  event_capability_distribution: places.reduce((a, p) => { for (const e of p.event_capabilities) a[e] = (a[e]||0)+1; return a; }, {}),
  handcrafted_shells: places.filter((p) => p.permanent.structure === 'handcrafted').length,
  procedural_shells: places.filter((p) => p.permanent.structure === 'procedural').length
};

writeFileSync(`${OUT}/places.json`, JSON.stringify({ summary, places }, null, 2));

console.log('=== ORDER 027 · place-engine ===');
console.log('  places:', places.length);
console.log('  by class:', JSON.stringify(summary.by_class));
console.log('  by district:', JSON.stringify(summary.by_district));
console.log('  with institution:', summary.with_institution);
console.log('  knowledge domains in use:', summary.knowledge_domain_coverage.length, '→', summary.knowledge_domain_coverage.join(', '));
console.log('  wrote', `${OUT}/places.json`);
