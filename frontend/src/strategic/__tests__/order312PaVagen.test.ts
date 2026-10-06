// ORDER 312 — ligger något i spelet på vägen? (Anders 2026-10-06: husen låg
// på vägarna i Designs prototyp av byn; spelet ska inte ha samma fel.)
//
// Testet kör mätningen i scene/onRoadAudit.ts mot den riktiga kartan
// (grythyttan-world.json). Vägytan är den som OsmRoads ritar
// (content/roadSurface.ts roadRenderPieces), med bredden per vägtyp ur
// roadRoles.ts ROLE_SPECS. Husen är de som ritas, uthusen med.
//
// Rapporten med alla konflikter och bilderna gör skriptet
// scripts/order312-on-road.mjs (reports/order312/). Det kör den här filen med
// ORDER312_OUT satt, och då skrivs mätningen dit.

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ROLE_SPECS } from '../content/roadRoles';
import { boxFootprint, roadOverlapsForPolygon, roadRenderPieces, stripEdges } from '../content/roadSurface';
import type { Vec2Tuple } from '../content/world';
import {
  auditDeliveryVan,
  auditHouses,
  auditRivals,
  auditTraffic,
  auditTrucks,
  auditVillageLifeCars,
  auditWineBar,
  auditOnRoad,
  type Conflict
} from '../scene/onRoadAudit';

const show = (c: Conflict[]) => c.map((x) => `${x.kind} ${x.subject} @(${x.at[0]}, ${x.at[1]}) ${x.other ?? ''} ${x.depthM ?? x.lengthM ?? ''}`).join('\n');

// ORDER 271 (businessRoom.ts roomSizeFor): vinbarens rum byggs i Designs
// minimimått 14,6 × 11,0 m, centrerat i huset w869907975 som är 14,5 × 10,1 m.
// Väggarna står därför upp till 0,47 m utanför husets fot på långsidorna.
// Det är en känd, öppen fråga till Design och Vision Owner (ORDER 271 och
// ORDER_312_RAPPORT.md). Testet tillåter just det, och inget mer.
const KNOWN_ROOM_OVERHANG_M = 0.5;

describe('ORDER 312 — inget i spelet ligger på vägen', () => {
  beforeAll(() => {
    if (process.env.ORDER312_OUT) {
      mkdirSync(dirname(process.env.ORDER312_OUT), { recursive: true });
      writeFileSync(process.env.ORDER312_OUT, JSON.stringify(auditOnRoad(), null, 2) + '\n');
    }
  }, 300000);

  it('vägytan har renderingens bredd per vägtyp: Hälleforsvägen 10 m, gångvägen 1,3 m', () => {
    const pieces = roadRenderPieces();
    const halle = pieces.find((p) => p.road.ref === '244');
    const foot = pieces.find((p) => p.role === 'footpath');
    expect(halle?.role).toBe('primary');
    expect(halle!.half * 2).toBe(ROLE_SPECS.primary.width);
    expect(foot!.half * 2).toBe(ROLE_SPECS.footpath.width);
    // En 2 × 2 m låda 4 m från Hälleforsvägens mittlinje står på vägen; 4 m
    // från gångvägens mittlinje gör den det inte.
    const probe = (p: typeof halle, offset: number) => {
      const poly = p!.poly;
      const i = Math.floor(poly.length / 2);
      const { left } = stripEdges(poly, offset);
      return roadOverlapsForPolygon(boxFootprint(left[i][0], left[i][1], 0, 2, 2) as Vec2Tuple[])
        .filter((o) => o.pieceId === p!.id && o.surface === 'carriageway');
    };
    expect(probe(halle, 4).length).toBeGreaterThan(0);
    expect(probe(foot, 4)).toEqual([]);
  });

  it('1. inget hus och inget uthus står på en väg (körbana eller trottoar)', () => {
    const c = auditHouses();
    expect(c, show(c)).toEqual([]);
  });

  it('2. bilarna kör bara på bilvägar: byns bilar och bussen, trafiken, leveransbilen', () => {
    const c = [...auditVillageLifeCars(), ...auditTraffic(), ...auditDeliveryVan()];
    expect(c, show(c)).toEqual([]);
  });

  it('3. vinbaren: entrén i husets fot och mot en gata, rummet inte på vägen eller i grannhuset', () => {
    const wb = auditWineBar();
    expect(wb).not.toBeNull();
    const other = wb!.conflicts.filter((c) => c.kind !== 'winebar-room-outside-building');
    expect(other, show(other)).toEqual([]);
    expect(wb!.facing.hit).not.toBeNull();
    // Den kända avvikelsen (ORDER 271): bara rummets hörn, högst 0,5 m ut.
    const overhang = wb!.conflicts.filter((c) => c.kind === 'winebar-room-outside-building');
    for (const c of overhang) expect(c.depthM!, show([c])).toBeLessThanOrEqual(KNOWN_ROOM_OVERHANG_M);
  });

  it('4. rivalernas krogar och vagnarnas platser står på land, inte på vägen', () => {
    const c = [...auditRivals(), ...auditTrucks()];
    expect(c, show(c)).toEqual([]);
  });
}, 300000);
