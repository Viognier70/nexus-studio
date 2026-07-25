#!/usr/bin/env node
// ORDER 025 M2 — Phase I.
//
// Estimates rendering cost without touching the runtime. Counts what
// each scene layer will emit at village zoom, flags instancing
// opportunities, and reports material / draw-call hotspots.
//
// Static analysis — reads world.json + scene source; no browser.

import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'reports/metadata/performance.json';
const world = JSON.parse(readFileSync('frontend/src/strategic/data/grythyttan-world.json', 'utf8'));

// Runtime cost model — one entry per scene layer with the observed
// draw-call rule (grep-ed from the source).
const LAYERS = [
  { layer: 'OsmBuildings',        instanced: 'windows only', per_entity: '~5 meshes (wall + plinth + storey bands + cornerboards + roof cap)', draw_call_rule: 'one per building * mesh-type' },
  { layer: 'OsmRoads',            instanced: false,          per_entity: '~5 shape geometries per road (carriage + sidewalk + kerb + centre stripe + edge lines)', draw_call_rule: 'per-road per-shape' },
  { layer: 'OsmWater',            instanced: false,          per_entity: '2 (bed + surface)', draw_call_rule: 'per water polygon' },
  { layer: 'OsmDistricts',        instanced: false,          per_entity: '1', draw_call_rule: 'per landcover polygon' },
  { layer: 'OsmForest',           instanced: true,           per_entity: '4 (conifer trunk / conifer cone / decid trunk / decid canopy)', draw_call_rule: '4 total across all trees' },
  { layer: 'HorizonForest',       instanced: true,           per_entity: '2 (cool + warm distant cones)', draw_call_rule: '2 total' },
  { layer: 'OsmMeadowVegetation', instanced: true,           per_entity: '4', draw_call_rule: '4 total' },
  { layer: 'OsmTraffic',          instanced: false,          per_entity: '2 (body + cabin)', draw_call_rule: 'per vehicle * 2' },
  { layer: 'OsmPedestrians',      instanced: true,           per_entity: '?', draw_call_rule: 'instanced' },
  { layer: 'OsmLandmarks',        instanced: false,          per_entity: '1 (invisible click disc)', draw_call_rule: 'per landmark' },
  { layer: 'CraftedLandmarks',    instanced: false,          per_entity: 'high (per-landmark composition)', draw_call_rule: '~20 meshes per handcrafted landmark' },
  { layer: 'CraftedLandmarksD2',  instanced: 'partial',      per_entity: '~15 meshes per D2 building', draw_call_rule: '~15 * (station corridor + school complex)' },
  { layer: 'ChimneySmoke',        instanced: true,           per_entity: '1 particle system', draw_call_rule: '1 total' },
  { layer: 'OsmParcelBoundaries', instanced: true,           per_entity: 'fences per parcel', draw_call_rule: 'per fence style' },
  { layer: 'OsmDriveways',        instanced: false,          per_entity: '1 per driveway', draw_call_rule: 'per driveway' },
  { layer: 'OsmYards',            instanced: true,           per_entity: 'garden features', draw_call_rule: 'per feature type' },
  { layer: 'OsmProceduralOutbuildings', instanced: false,    per_entity: '~3 per outbuilding', draw_call_rule: 'per outbuilding' },
  { layer: 'OsmPropertyDetail',   instanced: true,           per_entity: 'wood piles / paving pads', draw_call_rule: 'per feature type' },
  { layer: 'Sky',                 instanced: false,          per_entity: '1 sphere', draw_call_rule: '1' },
  { layer: 'OsmTerrain',          instanced: false,          per_entity: '1 large plane', draw_call_rule: '1' }
];

// Rough draw-call estimate for the current world
const buildingCount = world.buildings.length;
const roadCount = world.roads.length;
const landmarkCount = world.landmarks.length;
const waterCount = world.water.length;
const forestCount = world.forest.length;

const estimate = {
  buildings_wall_meshes: buildingCount * 1,           // one wall extrusion per building
  buildings_decor_meshes: buildingCount * 4,          // plinth + storey band + cornerboards + roof cap approx
  buildings_windows_instances: buildingCount * 12,    // ~12 windows/building average
  roads_shape_geometries: roadCount * 3,              // carriageway + sidewalk + one marking
  water_meshes: waterCount * 2,
  landcover_meshes: forestCount + world.grass.length + world.residential.length + world.graveyards.length,
  landmark_click_discs: landmarkCount,
  handcrafted_meshes: 9 * 20 + 15 * 15,                // D1 landmarks × 20, D2 buildings × 15
  vehicles: 24 * 2,                                    // per KIND_CONFIG counts
  distant_forest_instances: 2278,
  osm_forest_instances: 1600,                          // MAX_TREES_TOTAL
  meadow_instances: 800,                               // rough
  total_estimated_draw_calls: null,
  total_estimated_mesh_count: null
};

const drawCalls =
  10 +   // Sky + terrain + sun/hemi/ambient
  buildingCount * 5 +
  roadCount * 3 +
  waterCount * 2 +
  (forestCount + world.grass.length + world.residential.length + world.graveyards.length) +
  landmarkCount +
  9 * 20 +
  15 * 15 +
  24 * 2 +
  2 +     // HorizonForest 2 instance calls
  4 +     // OsmForest 4 instance calls
  4;      // OsmMeadowVegetation 4 instance calls
estimate.total_estimated_draw_calls = drawCalls;
estimate.total_estimated_mesh_count = buildingCount * 5 + roadCount * 3 + waterCount * 2 + landmarkCount + 9 * 20 + 15 * 15;

// Instancing opportunities — layers that emit per-building geometry
// but don't currently instance
const opportunities = [
  {
    layer: 'OsmBuildings',
    finding: 'Every building emits ~5 separate meshes (wall, plinth, storey bands, cornerboards, roof cap). Only windows are drei-Instanced.',
    recommendation: 'Consider material-grouping walls of the same colour (needs BufferGeometryUtils.mergeGeometries per neighbourhood).',
    priority: 'medium',
    risk: 'medium (touches every building — must not regress World Alignment v1.0)'
  },
  {
    layer: 'OsmRoads',
    finding: 'One ShapeGeometry per road piece for carriageway + sidewalk + kerb + centreline + edge lines. ~1600 draw calls for 327 roads.',
    recommendation: 'Merge same-tier road geometries into one BufferGeometry per tier (still 5 tiers × 5 shape families = 25 draw calls).',
    priority: 'high',
    risk: 'medium'
  },
  {
    layer: 'CraftedLandmarks',
    finding: 'Handcrafted landmarks emit ~20 meshes each. Church, Gästgivaregården, station corridor etc. dominate the draw-call count for their sectors.',
    recommendation: 'Where a handcrafted landmark has repeated primitives (windows, dormers, chimneys), instance them.',
    priority: 'low',
    risk: 'high (per-landmark refactor)'
  },
  {
    layer: 'OsmTraffic',
    finding: '24 vehicles × 2 meshes each = 48 draw calls. Cheap; not a hotspot.',
    recommendation: 'Instance vehicle bodies by kind (one draw call per vehicle kind).',
    priority: 'low',
    risk: 'low'
  }
];

writeFileSync(OUT, JSON.stringify({
  generated_at: new Date().toISOString(),
  entity_counts: {
    buildings: buildingCount,
    roads: roadCount,
    landmarks: landmarkCount,
    water: waterCount,
    forest: forestCount
  },
  layers: LAYERS,
  estimate,
  instancing_opportunities: opportunities,
  memory_hotspots: [
    'OsmForest max 1600 instances × 4 geometries — bounded, OK',
    'HorizonForest ~2278 instances × 2 geometries — bounded, OK',
    'OsmBuildings shape extrusion per building — creates ~274 unique BufferGeometries at ingest'
  ]
}, null, 2));

console.log('=== performance-audit ===');
console.log('  layers documented: ' + LAYERS.length);
console.log('  estimated draw calls: ~' + estimate.total_estimated_draw_calls);
console.log('  estimated mesh count: ~' + estimate.total_estimated_mesh_count);
console.log('  instancing opportunities: ' + opportunities.length);
console.log('  wrote ' + OUT);
