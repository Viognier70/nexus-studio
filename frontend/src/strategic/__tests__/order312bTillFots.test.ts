// ORDER 312b — folk till fots går bara på ritade gångytor och trottoarer, på
// samma sätt som bilarna (Anders 2026-10-06).
//
// Testet kör mätningen i scene/walkAudit.ts mot den riktiga kartan: byns
// gående (VillageLife) på sina rutter, med samma gångnät, rutter, avstånd och
// gångplats som renderingen (content/villageNetwork.ts walkNetwork,
// routeBetween, sidewalkOffsets, walkerPoint), mot vägytan som OsmRoads
// ritar (content/roadSurface.ts). Med ORDER312B_OUT satt skrivs mätningen
// dit (reports/order312b/walk.json).

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { auditWalkers } from '../scene/walkAudit';
import { walkNetwork, walkPlace } from '../content/villageNetwork';
import { EDGE_WALK_M, roadRenderPieces, stripEdges } from '../content/roadSurface';
import type { Vec2Tuple } from '../content/world';

describe('ORDER 312b — till fots bara på gångytor och trottoarer', () => {
  it('gångplatsen: trottoarens mitt är gångyta, gatans mitt och gräset bredvid är det inte', () => {
    const street = roadRenderPieces().find((p) => p.id === 'w122157691#p1')!; // Prästgatan
    expect(street.sidewalk).toBeGreaterThan(0);
    const i = Math.floor(street.poly.length / 2);
    const at = (off: number): Vec2Tuple => stripEdges(street.poly, off).left[i];
    const ways = new Set([street.wayId]);
    expect(walkPlace(...at(street.half + street.sidewalk / 2), ways)).toBe('walk');
    expect(walkPlace(...at(0), ways)).toBeNull();
    expect(walkPlace(...at(street.half + street.sidewalk + 1), ways)).toBeNull();
    // En servicegata utan trottoar (vägen till Sjöboden): kanten går man på,
    // mitten inte.
    const service = roadRenderPieces().find((p) => p.id === 'w860753013')!;
    expect(service.sidewalk).toBe(0);
    const j = Math.floor(service.poly.length / 2);
    const sat = (off: number): Vec2Tuple => stripEdges(service.poly, off).left[j];
    const sways = new Set([service.wayId]);
    expect(walkPlace(...sat(service.half - EDGE_WALK_M / 2), sways)).toBe('walk');
    expect(walkPlace(...sat(0), sways)).toBeNull();
  });

  it('byns gående: inget prov på den egna gatans körbana, på gräs eller på gårdar', () => {
    const a = auditWalkers();
    if (process.env.ORDER312B_OUT) {
      mkdirSync(dirname(process.env.ORDER312B_OUT), { recursive: true });
      writeFileSync(process.env.ORDER312B_OUT, JSON.stringify({ routes: a.routes, samples: a.samples, crossings: a.crossings, conflictCount: a.conflicts.length, nodes: a.nodes, doors: a.doors, conflicts: a.conflicts.slice(0, 200) }, null, 2) + '\n');
    }
    expect(a.routes).toBeGreaterThan(100);
    expect(a.samples).toBeGreaterThan(100000);
    expect(a.conflicts.slice(0, 20), JSON.stringify(a.conflicts.slice(0, 20))).toEqual([]);
    // Övergångarna är undantaget, inte regeln.
    expect(a.crossings / a.samples).toBeLessThan(0.05);
    // Krogarnas dörrar ligger i gångnätet nära huset.
    for (const [id, d] of Object.entries(a.doors)) expect(d.distanceM, id).toBeLessThan(30);
    expect(walkNetwork().main.reduce((n, x) => n + x, 0)).toBeGreaterThan(1000);
  });
}, 600000);
