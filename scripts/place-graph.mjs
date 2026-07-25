#!/usr/bin/env node
// ORDER 027 Phase F — Place relation graph extension.
//
// Builds a semantic graph on top of the existing knowledge-graph:
//   Place ↔ District           (located-in)
//   Place ↔ Institution        (hosts)
//   Place ↔ Knowledge Domain   (produces / hosts)
//   Place ↔ Landmark           (realises)
//   Place ↔ Road               (fronts)  (within 40 m of a road midpoint)
//   Place ↔ Event               (capable-of)
//   Place ↔ Transformation      (can-become)
//   Place ↔ NPC-profession      (draws)
//
// Every edge carries { from, to, kind }. Node types union with the
// existing knowledge-graph node types so future gameplay systems can
// treat the whole thing as one graph.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'reports/semantic';
mkdirSync(OUT, { recursive: true });

const places = JSON.parse(readFileSync(`${OUT}/places.json`, 'utf8')).places;
const world = JSON.parse(readFileSync('frontend/src/strategic/data/grythyttan-world.json', 'utf8'));
const streets = JSON.parse(readFileSync('reports/metadata/streets.json', 'utf8')).streets;
const districtsMeta = JSON.parse(readFileSync('reports/metadata/districts.json', 'utf8')).districts;
const landmarksMeta = JSON.parse(readFileSync('reports/metadata/landmarks.json', 'utf8')).landmarks;

const nodes = [];
const edges = [];

// ---------- Nodes ----------
for (const p of places) {
  nodes.push({ id: p.id, type: 'place', label: p.display, classification: p.classification, district: p.district });
}
for (const d of districtsMeta) {
  nodes.push({ id: d.id, type: 'district', label: d.label });
}
// Institutions (deduplicated by name)
const inst = new Map();
for (const p of places) {
  if (!p.institution) continue;
  const key = `institution::${p.institution.name}`;
  if (!inst.has(key)) inst.set(key, { id: key, type: 'institution', label: p.institution.name, kind: p.institution.kind, purpose: p.institution.purpose });
}
for (const n of inst.values()) nodes.push(n);

// Knowledge domains
const domains = [...new Set(places.flatMap((p) => p.knowledge_domains))].sort();
for (const d of domains) nodes.push({ id: `domain::${d}`, type: 'knowledge_domain', label: d });

// Landmarks
for (const l of landmarksMeta) nodes.push({ id: l.id, type: 'landmark', label: l.display, tier: l.tier });

// Streets
for (const s of streets) nodes.push({ id: `street::${s.name}`, type: 'street', label: s.name, hierarchy: s.hierarchy });

// Event surface (union of all event types across places)
const events = [...new Set(places.flatMap((p) => p.event_capabilities))].sort();
for (const e of events) nodes.push({ id: `event::${e}`, type: 'event_capability', label: e });

// Transformation options
const transforms = [...new Set(places.flatMap((p) => p.transformation.possible_transformations))].sort();
for (const t of transforms) nodes.push({ id: `transform::${t}`, type: 'transformation', label: t });

// NPC professions
const professions = [...new Set(places.flatMap((p) => p.npc_hints.professions))].sort();
for (const p of professions) nodes.push({ id: `profession::${p}`, type: 'npc_profession', label: p });

// ---------- Edges ----------
for (const p of places) {
  if (p.district) edges.push({ from: p.id, to: p.district, kind: 'located-in' });

  if (p.institution) {
    const iid = `institution::${p.institution.name}`;
    edges.push({ from: p.id, to: iid, kind: 'hosts' });
  }

  for (const d of p.knowledge_domains) {
    edges.push({ from: p.id, to: `domain::${d}`, kind: 'hosts-domain' });
  }

  // Place → landmark (when the place's building is a landmark's shell)
  const linkedLandmark = landmarksMeta.find((l) => l.building_ref === p.building_id);
  if (linkedLandmark) edges.push({ from: p.id, to: linkedLandmark.id, kind: 'realises' });

  // Place → nearest street (front onto)
  const centroid = p.permanent.centroid;
  let closest = null, closestDist = Infinity;
  for (const s of streets) {
    // Use street's average midpoint from its first segment representative
    const rec = world.roads.find((r) => r.name === s.name);
    if (!rec) continue;
    const mid = rec.poly[Math.floor(rec.poly.length / 2)];
    const d = Math.hypot(mid[0] - centroid[0], mid[1] - centroid[1]);
    if (d < closestDist) { closestDist = d; closest = s.name; }
  }
  if (closest && closestDist < 80) edges.push({ from: p.id, to: `street::${closest}`, kind: 'fronts', dist_m: +closestDist.toFixed(1) });

  // Place → event capability
  for (const e of p.event_capabilities) edges.push({ from: p.id, to: `event::${e}`, kind: 'capable-of' });

  // Place → transformation
  for (const t of p.transformation.possible_transformations) edges.push({ from: p.id, to: `transform::${t}`, kind: 'can-become' });

  // Place → NPC profession
  for (const pr of p.npc_hints.professions) edges.push({ from: p.id, to: `profession::${pr}`, kind: 'draws' });
}

writeFileSync(`${OUT}/place-graph.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  node_count: nodes.length,
  edge_count: edges.length,
  node_types: nodes.reduce((a, n) => { a[n.type] = (a[n.type]||0)+1; return a; }, {}),
  edge_kinds: edges.reduce((a, e) => { a[e.kind] = (a[e.kind]||0)+1; return a; }, {}),
  nodes,
  edges
}, null, 2));

console.log('=== ORDER 027 · place-graph ===');
console.log('  nodes:', nodes.length, 'edges:', edges.length);
console.log('  node types:', JSON.stringify(nodes.reduce((a, n) => { a[n.type] = (a[n.type]||0)+1; return a; }, {})));
console.log('  edge kinds:', JSON.stringify(edges.reduce((a, e) => { a[e.kind] = (a[e.kind]||0)+1; return a; }, {})));
console.log('  wrote', `${OUT}/place-graph.json`);
