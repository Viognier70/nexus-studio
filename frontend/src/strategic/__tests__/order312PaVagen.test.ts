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
import { boxFootprint, roadOverlapsForPolygon, roadQuadsAt, roadRenderPieces, stripEdges } from '../content/roadSurface';
import { deliveryStop } from '../business/deliveryStop';
import { computePlayerBusinessInterior } from '../business/interiorLayout';
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

// ORDER 312b (Anders 2026-10-06): vinbarens rum byggs i husets mått
// (businessRoom.ts roomSizeFor), så inget överhäng tillåts.

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

  it('2b. leveransbilen stannar på Prästgatan (Anders 2026-10-06, ORDER 312b)', () => {
    const layout = computePlayerBusinessInterior();
    const stop = deliveryStop(layout!);
    expect(stop).not.toBeNull();
    const names = (p: Vec2Tuple) => roadQuadsAt(p[0], p[1]).filter((q) => q.surface === 'carriageway').map((q) => q.piece.road.name);
    expect(names(stop!.bay)).toContain('Prästgatan');
    expect(names(stop!.approach)).toContain('Prästgatan');
  });

  it('3. vinbaren: entrén i husets fot och mot en gata, rummet inne i huset, inte på vägen eller i grannhuset', () => {
    const wb = auditWineBar();
    expect(wb).not.toBeNull();
    expect(wb!.conflicts, show(wb!.conflicts)).toEqual([]);
    expect(wb!.facing.hit).not.toBeNull();
  });

  it('4. rivalernas krogar och vagnarnas platser står på land, inte på vägen', () => {
    const c = [...auditRivals(), ...auditTrucks()];
    expect(c, show(c)).toEqual([]);
  });
}, 300000);
