// ORDER 322 B.1 (Anders 2026-10-09) — spelets karta som renderingen ritar den, för jämförelsen med den riktiga
// kartan (scripts/order322-karta.mjs, reports/order322/karta.json och karta-*.png).
//
// Källorna är renderingens egna:
//   - vägarna: content/roadSurface.ts roadRenderPieces (OsmRoads), med bredden ur roadRoles.ts ROLE_SPECS;
//   - husen: scene/onRoadAudit.ts renderedFootprints (OsmBuildings och ProceduralFacades: OSM- och syntetiska hus
//     utom de dolda i BUILDINGS_ON_ROADS, och uthusen), där OsmBuildings hoppar över LANDMARK_BUILDING_IDS och
//     kyrkor (kind 'church');
//   - de handbyggda landmärkena (CraftedLandmarks.tsx useLandmarkWallGeo): OSM-polygonen centrerad på sitt
//     medelvärde utan den slutande punkten (polygonCentre) och placerad på landmark.position.
// Skriptet kör filen med ORDER322_OUT satt; utan den prövas bara att utdraget går att göra.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { roadRenderPieces } from '../content/roadSurface';
import { renderedFootprints } from '../scene/onRoadAudit';
import { BUILDINGS_ON_ROADS } from '../content/buildingsOnRoads';
import { LANDMARK_BUILDING_IDS, WORLD, type Vec2Tuple } from '../content/world';

// Landmärkena vars väggar CraftedLandmarks.tsx flyttar till landmark.position (useLandmarkWallGeo).
const CRAFTED_AT_POSITION = ['gry-kyrka', 'gry-campus', 'gry-gastgivaregard', 'gry-pizzanshus', 'gry-herrgard', 'gry-jarnvag'];

function polygonCentre(poly: Vec2Tuple[]): [number, number] {
  let cx = 0, cz = 0;
  for (let i = 0; i < poly.length - 1; i++) { cx += poly[i][0]; cz += poly[i][1]; }
  return [cx / (poly.length - 1), cz / (poly.length - 1)];
}

export function gameMap() {
  const roads = roadRenderPieces().map((p) => ({ id: p.id, wayId: p.wayId, role: p.role, half: p.half, sidewalk: p.sidewalk, kind: p.road.kind, name: p.road.name ?? null, poly: p.poly }));
  const byId = new Map(WORLD.buildings.map((b) => [b.id, b]));
  const crafted = CRAFTED_AT_POSITION.flatMap((lid) => {
    const l = WORLD.landmarks.find((x) => x.id === lid);
    const b = l && l.source.osmType === 'way' ? byId.get(`w${l.source.osmId}`) : undefined;
    if (!l || !b) return [];
    const c = polygonCentre(b.poly);
    const dx = l.position[0] - c[0], dz = l.position[1] - c[1];
    return [{ landmark: lid, id: b.id, shift: [+dx.toFixed(2), +dz.toFixed(2)], poly: b.poly.map(([x, z]) => [+(x + dx).toFixed(2), +(z + dz).toFixed(2)]) }];
  });
  const craftedIds = new Set(crafted.map((c) => c.id));
  const buildings = renderedFootprints()
    .filter((f) => !craftedIds.has(f.id))
    .map((f) => {
      const b = byId.get(f.id);
      const skipped = f.source === 'building' && (b?.kind === 'church' || (LANDMARK_BUILDING_IDS.has(f.id) && !craftedIds.has(f.id)));
      return { id: f.id, source: f.source, provenance: b?.provenance ?? null, kind: b?.kind ?? null, name: b?.name ?? null, handcrafted: LANDMARK_BUILDING_IDS.has(f.id), churchSkipped: b?.kind === 'church' && !LANDMARK_BUILDING_IDS.has(f.id), skipped, poly: f.poly };
    });
  const hidden = [...BUILDINGS_ON_ROADS].map((id) => { const b = byId.get(id); return { id, provenance: b?.provenance ?? null, kind: b?.kind ?? null, poly: b?.poly ?? [] }; });
  const landmarks = WORLD.landmarks.map((l) => ({ id: l.id, name: l.displayName, position: l.position, osm: l.source.osmType ? `${l.source.osmType[0]}${l.source.osmId}` : null }));
  return { roads, buildings, crafted, hidden, landmarks, landmarkBuildingIds: [...LANDMARK_BUILDING_IDS] };
}

describe('ORDER 322 B.1 — spelets karta', () => {
  it('utdraget har vägarna, husen och landmärkena', () => {
    const m = gameMap();
    if (process.env.ORDER322_OUT) {
      mkdirSync(dirname(process.env.ORDER322_OUT), { recursive: true });
      writeFileSync(process.env.ORDER322_OUT, JSON.stringify(m) + '\n');
    }
    expect(m.roads.length).toBeGreaterThan(0);
    expect(m.buildings.length).toBeGreaterThan(0);
    expect(m.crafted.length).toBe(CRAFTED_AT_POSITION.length);
  }, 300000);
});
