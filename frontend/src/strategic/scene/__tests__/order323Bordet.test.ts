// ORDER 323 §9 (Anders 2026-10-09): "Bistron: vinflaskorna svävar i luften
// bredvid borden. Föremål på bord (flaskor, glas, ljus) ska stå på
// bordsskivan och följa bordet när rummet byggs om (vinbar → bistro). Lägg
// till ett test: inget föremål på bord svävar eller står utanför ett bord."
//
// Ytorna läses ur rummets ritade meshar (planRects via propSurfaces), samma
// som TheatreStage ställer föremålen på. Provet går igenom båda rummen:
// dukningen (flaskorna i baren), karaffen på varje bord, ägarbokens glas,
// tallrikar och flaskor i plats 0–5 på varje sällskaps bord, och ljusen.

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createWineBarRoom, type RoomLayout, type WineBarRoom } from '../wineBarRoom';
import { groupsFor } from '../serviceFlow';
import { propSurfaces, surfaceUnder, TheatreStage, type PropSurface } from '../theatreStage';

const LAYOUTS: RoomLayout[] = ['winebar', 'bistro'];
const TOL_M = 0.005;

function onTop(surfaces: readonly PropSurface[], p: { x: number; y: number; z: number }): string | null {
  const s = surfaceUnder(surfaces, p.x, p.z);
  if (!s) return 'står utanför ett bord';
  if (Math.abs(p.y - s.top) > TOL_M) return `${p.y > s.top ? 'svävar' : 'sjunker'} ${(Math.abs(p.y - s.top) * 100).toFixed(1)} cm över/under ${s.name}`;
  return null;
}

function stageFor(room: WineBarRoom) {
  const group = new THREE.Group();
  const stage = new TheatreStage(group, room.floorY, 0, 0);
  const groups = groupsFor(room);
  stage.dress(groups, room);
  const items = ['glass', 'plate', 'bottle'] as const;
  const ledger = groups.flatMap((g) => Array.from({ length: 6 }, (_, slot) => ({
    id: `${g.id}:${slot}`, item: items[slot % 3],
    owner: { kind: 'table' as const, group: g.id, groupKind: g.kind, at: g.serveAt, facing: g.serveFacing, slot, tableAt: g.tableAt }
  })));
  stage.props({ propLedger: () => ledger } as never, 1, [], [], [], [], [], []);
  return { stage, groups };
}

describe('ORDER 323 §9 — föremålen på borden', () => {
  for (const layout of LAYOUTS) {
    it(`${layout}: flaskorna, karafferna, glasen och tallrikarna står på en skiva`, () => {
      const room = createWineBarRoom({ layout });
      const surfaces = propSurfaces(room);
      expect(surfaces.length).toBeGreaterThan(5);
      const { stage, groups } = stageFor(room);
      const placed = stage.standingProps();
      // Fyra flaskor i baren, en karaff per sällskap utom vid baren, sex föremål per sällskap.
      expect(placed.length).toBe(4 + groups.filter((g) => g.kind !== 'bar').length + groups.length * 6);
      const wrong = placed.map((p) => ({ p, why: onTop(surfaces, p) })).filter((x) => x.why);
      expect(wrong.map((x) => `${x.p.name} (${x.p.x.toFixed(2)}, ${x.p.z.toFixed(2)}): ${x.why}`)).toEqual([]);
      // Flaskorna i baren står på rummets egen bardisk.
      const bottles = placed.slice(0, 4);
      for (const b of bottles) expect(surfaceUnder(surfaces, b.x, b.z)!.name).toMatch(/^barTop/);
    });

    it(`${layout}: ljusen står på bordsskivan eller disken`, () => {
      const room = createWineBarRoom({ layout });
      const surfaces = propSurfaces(room);
      room.group.updateWorldMatrix(true, true);
      const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
      const candles: { x: number; y: number; z: number; name: string }[] = [];
      room.parts.interior.traverse((o) => {
        if (!o.name.startsWith('candle_')) return;
        const v = o.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
        candles.push({ name: o.name, x: v.x, y: v.y, z: v.z });
      });
      expect(candles.length).toBeGreaterThan(3);
      const wrong = candles.map((c) => ({ c, why: onTop(surfaces, c) })).filter((x) => x.why);
      expect(wrong.map((x) => `${x.c.name}: ${x.why}`)).toEqual([]);
    });
  }

  it('flaskorna följer rummet när det byggs om: i bistron ingen flaska vid vinbarens bar', () => {
    const wine = createWineBarRoom({ layout: 'winebar' });
    const bistro = createWineBarRoom({ layout: 'bistro' });
    const bw = stageFor(wine).stage.standingProps().slice(0, 4);
    const bb = stageFor(bistro).stage.standingProps().slice(0, 4);
    const bistroSurfaces = propSurfaces(bistro);
    for (const b of bb) expect(surfaceUnder(bistroSurfaces, b.x, b.z)?.name).toBe('barTopBistro');
    // Vinbarens platser för flaskorna har ingen skiva i bistron (det var de som svävade).
    for (const b of bw) expect(surfaceUnder(bistroSurfaces, b.x, b.z)).toBeNull();
  });
});
