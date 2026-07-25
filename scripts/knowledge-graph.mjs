#!/usr/bin/env node
// ORDER 025 M1 — Phases G + H.
//
// Builds a structured knowledge graph linking districts / buildings /
// roads / landmarks / POIs, plus a gameplay annotation layer flagging
// candidate hotspots for future NPC / quest / interaction systems.
//
// Reads reports/metadata/*.json + reports/districts/assignment.json.
// Emits reports/metadata/knowledge-graph.json.
//
// NO gameplay implementation — only annotations. Do not treat this
// as a spec for gameplay code; it is a preparation surface.

import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'reports/metadata/knowledge-graph.json';
const districts = JSON.parse(readFileSync('reports/metadata/districts.json', 'utf8'));
const landmarks = JSON.parse(readFileSync('reports/metadata/landmarks.json', 'utf8'));
const pois = JSON.parse(readFileSync('reports/metadata/pois.json', 'utf8'));
const streets = JSON.parse(readFileSync('reports/metadata/streets.json', 'utf8'));
const buildings = JSON.parse(readFileSync('reports/metadata/buildings.json', 'utf8'));

// ---------- Nodes ----------
const nodes = [];
for (const d of districts.districts) nodes.push({ id: d.id, type: 'district', label: d.label, position: d.anchor });
for (const l of landmarks.landmarks) nodes.push({ id: l.id, type: 'landmark', label: l.display, position: l.osm.id ? null : null, district: l.district, tier: l.tier });
for (const p of pois.pois) nodes.push({ id: p.id + '::poi', type: 'poi', label: p.display, category: p.category, importance: p.importance, district: p.district });
// Buildings kept as terse — one node per handcrafted building only,
// plus one aggregate "procedural buildings" node per district. The
// full 274-entry building list lives in buildings.json; the graph
// stays lean by aggregating anonymous procedurals.
for (const b of buildings.buildings.filter((b) => b.handcraft || b.name)) {
  nodes.push({ id: b.id, type: 'building', label: b.name || b.id, family: b.family, district: b.district, handcraft: b.handcraft });
}
for (const d of districts.districts) {
  nodes.push({ id: `${d.id}::procedural`, type: 'procedural-cluster', label: `procedural buildings in ${d.id}`, district: d.id, count: d.buildings_procedural });
}
for (const s of streets.streets) nodes.push({ id: `street::${s.name}`, type: 'street', label: s.name, hierarchy: s.hierarchy, districts: s.districts, length_m: s.total_length_m });

// ---------- Edges ----------
const edges = [];
// Landmark → District
for (const l of landmarks.landmarks) if (l.district) edges.push({ from: l.id, to: l.district, kind: 'located-in' });
// POI → landmark
for (const p of pois.pois) edges.push({ from: p.id + '::poi', to: p.id, kind: 'realises' });
// POI → district
for (const p of pois.pois) if (p.district) edges.push({ from: p.id + '::poi', to: p.district, kind: 'located-in' });
// Landmark ↔ building (when building_ref present)
for (const l of landmarks.landmarks) if (l.building_ref) edges.push({ from: l.id, to: l.building_ref, kind: 'renders-as' });
// Building → district
for (const b of buildings.buildings.filter((b) => b.handcraft || b.name)) if (b.district) edges.push({ from: b.id, to: b.district, kind: 'located-in' });
// Street → district (for each district crossed)
for (const s of streets.streets) for (const d of s.districts) edges.push({ from: `street::${s.name}`, to: d, kind: 'crosses' });

// ---------- Gameplay annotations (Phase H) ----------
// Every landmark carries at least one annotation. Assignments are
// intentionally conservative — mark hotspots that a resident would
// use as reference points. No gameplay logic is implied.
const HOTSPOTS = {
  'gry-torget':           ['conversation', 'public-gathering', 'social', 'tourism'],
  'gry-kyrka':            ['historical', 'religious', 'social', 'tourism'],
  'gry-campus':           ['educational', 'teaching', 'research', 'institution'],
  'gry-skola':            ['educational', 'teaching', 'institution'],
  'gry-jarnvag':          ['historical', 'transport', 'tourism'],
  'gry-gastgivaregard':   ['historical', 'commercial', 'tourism', 'social', 'accommodation'],
  'gry-herrgard':         ['historical', 'accommodation'],
  'gry-pizzanshus':       ['commercial', 'social', 'food'],
  'gry-ip':               ['sports', 'public-gathering'],
  'gry-ingo':             ['commercial', 'transport'],
  'gry-tempo':            ['commercial', 'retail'],
  'gry-direkten':         ['commercial', 'retail'],
  'gry-kantin-hyttblecket':['commercial', 'food'],
  'gry-bergslagshus':     ['commercial', 'retail'],
  'gry-kringlan':         ['commercial', 'food', 'tourism'],
  'gry-cornelis':         ['commercial', 'food', 'social'],
  'gry-glass':            ['commercial', 'food', 'tourism'],
  'gry-antik':            ['commercial', 'retail']
};

const annotations = landmarks.landmarks.map((l) => ({
  id: l.id,
  display: l.display,
  district: l.district,
  hotspots: HOTSPOTS[l.id] || ['unknown'],
  quest_potential:
    (HOTSPOTS[l.id] || []).includes('historical') ? 'high' :
    (HOTSPOTS[l.id] || []).includes('educational') ? 'medium' :
    'low',
  investigation_potential:
    (HOTSPOTS[l.id] || []).includes('historical') ? 'high' :
    (HOTSPOTS[l.id] || []).includes('institution') ? 'medium' :
    'low',
  npc_density_hint:
    (HOTSPOTS[l.id] || []).includes('public-gathering') ? 'high' :
    (HOTSPOTS[l.id] || []).includes('institution') ? 'medium' :
    (HOTSPOTS[l.id] || []).includes('commercial') ? 'medium' :
    'low'
}));

// ---------- Emit ----------
writeFileSync(OUT, JSON.stringify({
  generated_at: new Date().toISOString(),
  node_count: nodes.length,
  edge_count: edges.length,
  annotation_count: annotations.length,
  types: nodes.reduce((acc, n) => { acc[n.type] = (acc[n.type]||0)+1; return acc; }, {}),
  edge_kinds: edges.reduce((acc, e) => { acc[e.kind] = (acc[e.kind]||0)+1; return acc; }, {}),
  hotspot_categories: annotations.reduce((acc, a) => { for (const h of a.hotspots) acc[h] = (acc[h]||0)+1; return acc; }, {}),
  nodes,
  edges,
  annotations
}, null, 2));

console.log('=== knowledge-graph ===');
console.log('  nodes ' + nodes.length + '  edges ' + edges.length + '  annotations ' + annotations.length);
console.log('  wrote ' + OUT);
