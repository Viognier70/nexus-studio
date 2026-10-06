// ORDER 302c (Anders 2026-10-06) — gästernas färger på gatan, Designs leverans
// 2026-10-06 (documentation/leveranser/nexus-leverans-2026-10-06-gastfargerna-gatan,
// scene/guestGroups.ts med looks[].street).
//
// 1. Leveransens två nya kontroller som test: kropparna mot gatans markytor
//    (checkGroupsAgainstStreet) och tecknen mot kroppen (checkStreetSigns), och
//    rummets kontroll (checkGroupsAgainstFloors). Kvoterna läses ur samma
//    funktioner (med ett band som inget klarar, så att alla par listas) och
//    skrivs till reports/order302c/modell.json.
// 2. Gatans figurer (VillageLife via streetLookOf, OsmPedestrians, LandmarkGatherers,
//    cyklisterna) bär gatans variant.
// 3. Bytet vid dörren (guestLooks.ts stepStreetBlend, applyStreetBlend): dörrmattan
//    är room.queueSpots[0], 0,6 s med inOutSine (STREET_BLEND).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  checkGroupsAgainstFloors,
  checkGroupsAgainstStreet,
  checkStreetSigns,
  GUEST_GROUPS,
  LIGHT_SCALES,
  STREET_BLEND,
  STREET_SURFACES,
  type GuestGroupId
} from '../../strategic/scene/guestGroups';
import {
  applyStreetBlend,
  beyondDoorMat,
  DOOR_MAT_MARGIN_M,
  dressAllGroups,
  GROUP_IDS,
  showGroup,
  stepStreetBlend,
  streetShare,
  type StreetBlendState
} from '../../strategic/scene/guestLooks';
import { createFigureRig } from '../../strategic/scene/figureRig';
import { createWineBarRoom } from '../../strategic/scene/wineBarRoom';
import { streetLookOf } from '../../strategic/scene/village/streetLooks';
import type { GuestType } from '../../strategic/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../..');
const OUT = resolve(HERE, '../../../reports/order302c');
const hex = (c: THREE.Color) => '#' + c.getHexString();

describe('ORDER 302c — leveransens kontroller (guestGroups.ts)', () => {
  it('kropparna mot gatans markytor, tecknen mot kroppen och rummets golv: 0 fel; kvoterna i reports/order302c/modell.json', () => {
    expect(checkGroupsAgainstStreet()).toEqual([]);
    expect(checkStreetSigns()).toEqual([]);
    expect(checkGroupsAgainstFloors()).toEqual([]);

    // Alla par: samma funktioner med ett band som inget par klarar (lo = ∞), så att varje kvot listas.
    const street = checkGroupsAgainstStreet(undefined, Infinity, -Infinity);
    const signs = checkStreetSigns(Infinity);
    expect(street).toHaveLength(10 * STREET_SURFACES.length * Object.keys(LIGHT_SCALES).length);
    expect(signs).toHaveLength(10);
    const rows = GROUP_IDS.flatMap((g) => [0, 1].map((v) => {
      const mine = street.filter((f) => f.group === g && f.variant === v).map((f) => f.ratio);
      const L = GUEST_GROUPS[g].looks[v].street;
      return {
        group: g,
        variant: v,
        streetBody: L.body,
        streetAccent: L.accent,
        streetMin: +Math.min(...mine).toFixed(3),
        streetMax: +Math.max(...mine).toFixed(3),
        sign: +signs.find((s) => s.group === g && s.variant === v)!.ratio.toFixed(3)
      };
    }));
    mkdirSync(OUT, { recursive: true });
    writeFileSync(resolve(OUT, 'modell.json'), JSON.stringify({
      source: 'scene/guestGroups.ts checkGroupsAgainstStreet, checkStreetSigns (leveransens STREET_SURFACES ur byKvall.js, LIGHT_SCALES)',
      band: [1.8, 3.6],
      surfaces: STREET_SURFACES,
      lights: LIGHT_SCALES,
      rows
    }, null, 2) + '\n');
    for (const r of rows) {
      expect(r.streetMin).toBeGreaterThanOrEqual(1.8);
      expect(r.streetMax).toBeLessThanOrEqual(3.6);
      expect(r.sign).toBeGreaterThanOrEqual(1.8);
    }
  });
});

describe('ORDER 302c — gatans figurer i gatans variant', () => {
  it('VillageLife (streetLookOf): kroppen, lemmarna och tecknet ur looks[].street', () => {
    for (const g of GROUP_IDS) for (const v of [0, 1]) {
      const l = streetLookOf('middle', g, v);
      expect(l).toEqual({ body: GUEST_GROUPS[g].looks[v].street.body, limb: GUEST_GROUPS[g].looks[v].street.limb, accent: GUEST_GROUPS[g].looks[v].street.accent });
    }
  });

  it('byns fotgängare, cyklister och folket vid landmärkena: gatans variant, inget rött', () => {
    const peds = readFileSync(resolve(SRC, 'strategic/scene/OsmPedestrians.tsx'), 'utf8');
    expect(peds).toMatch(/looks\.map\(\(l\) => l\.street\.body\)/);
    expect(peds).toMatch(/\.street\.accent/);
    expect(peds).toMatch(/rng\.pick\(CYCLIST_PALETTE\)/);
    expect(peds).not.toMatch(/#c9482f/);
    const gath = readFileSync(resolve(SRC, 'strategic/scene/LandmarkGatherers.tsx'), 'utf8');
    expect(gath).toMatch(/GUEST_GROUPS\[g\]\.looks\[Number\(v\) % 2\]\.street/);
    expect(gath).toMatch(/streetSignGeometry\(g, OSM_FRAME\)/);
    // Ingen egen hexpalett kvar för folket vid landmärkena.
    expect(gath).not.toMatch(/palette: \['#/);
    const life = readFileSync(resolve(SRC, 'strategic/scene/village/VillageLife.tsx'), 'utf8');
    expect(life).toMatch(/streetLookOf\(/);
  });
});

describe('ORDER 302c — bytet vid dörren (STREET_BLEND)', () => {
  it('leveransens värden: dörrmattan, 0,6 s, inOutSine', () => {
    expect(STREET_BLEND.blendS).toBe(0.6);
    expect(STREET_BLEND.ease).toBe('inOutSine');
    expect(STREET_BLEND.at).toMatch(/queueSpots\[0\]/);
  });

  it('dörrmattan är queueSpots[0]: kön på trottoaren och väntplatsen utanför, borden innanför', () => {
    const room = createWineBarRoom();
    const spots = [...room.queueSpots].sort((a, b) => a.order - b.order);
    const mat = spots[0].local;
    expect(spots[0]).toBe(room.queueSpots[0]);
    const out: [number, number] = [room.waitingSpot[0] - mat[0], room.waitingSpot[1] - mat[1]];
    for (const q of spots.filter((s) => s.side === 'outside')) expect(beyondDoorMat(q.local[0], q.local[1], mat, out)).toBeGreaterThan(DOOR_MAT_MARGIN_M);
    for (const s of room.seats) expect(beyondDoorMat(s.local[0], s.local[1], mat, out)).toBeLessThan(-DOOR_MAT_MARGIN_M);
    expect(beyondDoorMat(room.entrance[0], room.entrance[1], mat, out)).toBeLessThan(-DOOR_MAT_MARGIN_M);
  });

  it('in: från gatan till rummet på 0,6 s med inOutSine; ut det omvända; inom marginalen står det kvar', () => {
    const s: StreetBlendState = { u: 0, target: 0 };
    expect(stepStreetBlend(s, 2, 0, true)).toBe(1);
    // På mattan (inom marginalen) behåller figuren gatans färger.
    expect(stepStreetBlend(s, 0, 0.1)).toBe(1);
    // Innanför mattan: halva tiden ger hälften (inOutSine), hela tiden rummet.
    expect(stepStreetBlend(s, -0.5, STREET_BLEND.blendS / 2)).toBeCloseTo(0.5, 6);
    expect(stepStreetBlend(s, -0.5, STREET_BLEND.blendS / 4)).toBeCloseTo((1 - Math.cos(Math.PI * 0.25)) / 2, 6);
    expect(stepStreetBlend(s, -0.5, STREET_BLEND.blendS)).toBe(0);
    // Ut: tillbaka till gatan på samma tid.
    expect(stepStreetBlend(s, 1, STREET_BLEND.blendS * 0.999)).toBeLessThan(1);
    expect(stepStreetBlend(s, 1, 0.01)).toBe(1);
    expect(streetShare({ u: 0.5, target: 1 })).toBeCloseTo(0.5, 9);
  });

  it('riggen: gatans kropp, lemmar och tecken ute, rummets inne (bara den synliga gruppens tecken)', () => {
    const rig = createFigureRig({ variant: 'guest' });
    const dressed = dressAllGroups(rig, 0);
    const cases: [GuestType, GuestGroupId][] = [['student', 'student'], ['gourmet', 'gourmet'], ['middle', 'villager'], ['business', 'business'], ['tourist', 'tourist']];
    for (const [t, g] of cases) {
      dressed.blend = { u: 0, target: 0 };
      showGroup(rig, dressed, t, 0, '#888888');
      const L = GUEST_GROUPS[g].looks[0];
      expect(hex(rig.garment.color)).toBe(L.body);
      expect(hex(rig.materials[1].color)).toBe(L.limb);
      applyStreetBlend(rig, dressed, 1);
      expect(hex(rig.garment.color)).toBe(L.street.body);
      expect(hex(rig.materials[1].color)).toBe(L.street.limb);
      // Tecknet i gatans accentfärg (ryggsäcken och luvan, sjalen …).
      const signHexes = dressed.signs[g].map((o) => hex(((o as THREE.Mesh).material as THREE.MeshStandardMaterial).color));
      expect(signHexes).toContain(L.street.accent);
      applyStreetBlend(rig, dressed, 0);
      expect(hex(rig.garment.color)).toBe(L.body);
      expect(dressed.signs[g].map((o) => hex(((o as THREE.Mesh).material as THREE.MeshStandardMaterial).color))).toContain(L.accent);
    }
  });

  it('WineBarFigures stegar bytet per figur ur dörrmattan', () => {
    const src = readFileSync(resolve(SRC, 'strategic/scene/WineBarFigures.tsx'), 'utf8');
    expect(src).toMatch(/stepStreetBlend\(cast\.dressed\[i\]\.blend, beyondDoorMat\(sample\.x, sample\.z, cast\.doorMat\.at, cast\.doorMat\.out\)/);
    expect(src).toMatch(/applyStreetBlend\(rig, cast\.dressed\[i\], streetShare\(cast\.dressed\[i\]\.blend\)\)/);
  });
});
