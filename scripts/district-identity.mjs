#!/usr/bin/env node
// ORDER 027 Phase H — district identity engine.
//
// For each of 15 districts, produces a canonical identity profile:
//   primary_identity      — one-line signature
//   secondary_identity    — supporting theme
//   knowledge_profile     — dominant knowledge domains
//   architectural_profile — dominant families / structures / eras
//   landscape_profile     — water / forest / open-ground character
//   gameplay_profile      — dominant Place gameplay surface
//   cultural_profile      — cultural signal per district
//   economic_profile      — commercial density
//   educational_profile   — teaching / research presence
//   historic_profile      — historic-tier landmark presence
//
// All derived deterministically from the place engine + metadata.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'reports/semantic';
mkdirSync(OUT, { recursive: true });

const places = JSON.parse(readFileSync(`${OUT}/places.json`, 'utf8')).places;
const districtsMeta = JSON.parse(readFileSync('reports/metadata/districts.json', 'utf8'));

// Curated primary identity per district — the Vision Owner's semantic
// anchor for what each district IS in the Living World Model. Every
// entry is drawn from what already exists in that district (landmarks,
// dominant family, or geography).
const PRIMARY = {
  'D01-historic-centre':    { primary: 'Historic quarter — Prästgatan chain', secondary: 'Tenant-carrier long house + adjoining residential' },
  'D02-campus':             { primary: 'Gastronomy campus — Örebro universitet RHS', secondary: 'Research + teaching + student life' },
  'D03-torget':             { primary: 'Central plaza — Torget + Gästgivaregården', secondary: 'Historic hospitality + village gathering' },
  'D04-church':             { primary: 'Ecclesiastical anchor — Grythyttans Kyrka', secondary: 'Parish + ceremony + community' },
  'D05-station':            { primary: 'Historic transport corridor — old BJ freight yard', secondary: 'Industrial-heritage station + preserved building group' },
  'D06-school':             { primary: 'Educational quarter — Grythyttans skola + IP', secondary: 'Primary schooling + community sports' },
  'D07-industrial':         { primary: 'Industrial estate — production + storage', secondary: 'Regional employers + logistics' },
  'D08-halleforsvagen':     { primary: 'Rv 244 approach — INGO + Pizzans Hus corridor', secondary: 'Transport gateway + eastern commercial edge' },
  'D09-prastgatan':         { primary: 'Prästgatan connector — Torget ↔ Rv 244', secondary: 'Historic residential fabric along the main axis' },
  'D10-residential-north':  { primary: 'Northern residential belt — Nygatan / Norra Bergvägen', secondary: 'Bergslag-typology houses + Bergslagshus commercial' },
  'D11-residential-south':  { primary: 'Southern residential — Rv 205 shoulder', secondary: 'Sparse — mostly Lokavägen frontage' },
  'D12-residential-east':   { primary: 'Hospitality quarter — Herrgården Grythyttan', secondary: 'Manor-house + Länsmansgården historic residence' },
  'D13-residential-west':   { primary: 'Western residential — Tempo + Hantverksgatan', secondary: 'Everyday retail + workshop-adjacent housing' },
  'D14-lakeshore':          { primary: 'Torrvarpen shoreline — natural + recreational', secondary: 'Water edge + occasional dwellings' },
  'D15-forest-edge':        { primary: 'Outlying rural / forest edge', secondary: 'Farms + isolated dwellings + landscape context' }
};

const districts = districtsMeta.districts.map((d) => {
  const dPlaces = places.filter((p) => p.district === d.id);
  const familyMix = dPlaces.reduce((a, p) => { a[p.permanent.facade_family] = (a[p.permanent.facade_family]||0)+1; return a; }, {});
  const classMix  = dPlaces.reduce((a, p) => { a[p.classification] = (a[p.classification]||0)+1; return a; }, {});
  const domainMix = dPlaces.reduce((a, p) => { for (const dm of p.knowledge_domains) a[dm] = (a[dm]||0)+1; return a; }, {});
  const eventMix  = dPlaces.reduce((a, p) => { for (const e of p.event_capabilities) a[e] = (a[e]||0)+1; return a; }, {});
  const institutions = dPlaces.filter((p) => p.institution).map((p) => p.institution.name);
  const handcrafted = dPlaces.filter((p) => p.permanent.structure === 'handcrafted').length;
  const total = dPlaces.length;
  const domTop = Object.entries(domainMix).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const classTop = Object.entries(classMix).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);

  const identity = PRIMARY[d.id] || { primary: d.label, secondary: '' };
  return {
    id: d.id,
    label: d.label,
    anchor: d.anchor,
    radius: d.radius,
    primary_identity:   identity.primary,
    secondary_identity: identity.secondary,
    knowledge_profile:  {
      dominant_domains: domTop,
      full_mix: domainMix
    },
    architectural_profile: {
      dominant_families: classTop,
      family_mix: familyMix,
      handcrafted_ratio: total ? +(handcrafted / total).toFixed(2) : 0,
      structure_mix: {
        handcrafted,
        procedural: total - handcrafted
      }
    },
    landscape_profile: {
      water_bodies: d.family_mix?.water || 0,  // metadata engine doesn't emit — noted as absent
      forest_patches: d.family_mix?.forest || 0,
      note: d.id === 'D14-lakeshore' ? 'Lake shoreline dominant' :
            d.id === 'D15-forest-edge' ? 'Forest + outer landscape dominant' :
            d.id === 'D07-industrial' ? 'Cleared industrial ground with adjoining forest' :
            d.id === 'D03-torget' ? 'Central paved plaza; minimal green' :
            'Village fabric with occasional garden trees'
    },
    gameplay_profile: {
      npc_density_hint: total >= 15 ? 'high' : total >= 6 ? 'medium' : 'low',
      social_hot: dPlaces.filter((p) => p.gameplay_surface.social === 'high').length,
      learning_hot: dPlaces.filter((p) => p.gameplay_surface.learning === 'high').length,
      business_hot: dPlaces.filter((p) => p.gameplay_surface.business === 'high').length
    },
    cultural_profile: {
      cultural_places: dPlaces.filter((p) => p.knowledge_domains.includes('Culture')).length,
      dominant_events: Object.entries(eventMix).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)
    },
    economic_profile: {
      commercial_places: classMix['Commercial Space'] || 0,
      hospitality_places: classMix['Hospitality'] || 0,
      industrial_places: classMix['Industrial'] || 0,
      active_economic_role: dPlaces.filter((p) => p.adaptive.economic_role === 'active').length
    },
    educational_profile: {
      educational_places: classMix['Educational Institution'] || 0,
      teaching_hot: dPlaces.filter((p) => p.gameplay_surface.teaching === 'high').length
    },
    historic_profile: {
      historic_landmarks: classMix['Historic Landmark'] || 0,
      institutions: institutions
    },
    place_count: total
  };
});

writeFileSync(`${OUT}/districts-identity.json`, JSON.stringify({
  generated_at: new Date().toISOString(),
  total: districts.length,
  districts
}, null, 2));

console.log('=== ORDER 027 · district-identity ===');
console.log('  districts:', districts.length);
console.log('  wrote', `${OUT}/districts-identity.json`);
