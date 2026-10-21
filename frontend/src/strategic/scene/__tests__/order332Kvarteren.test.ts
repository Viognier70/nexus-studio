// ORDER 332 D — kvarteren: gränserna efter gatorna, namnen på nivån Byn och gästerna på gatan per kvarter.
// Läser samma moduler som spelet: content/districts.ts (districtAt, DISTRICT_AREAS), DistrictLabels.tsx
// (districtLabelOpacity) och village/districtStreet.ts (det OsmPedestrians.tsx läser).

import { describe, expect, it } from 'vitest';
import worldRaw from '../../data/grythyttan-world.json';
import { DISTRICT_AREAS, districtAt } from '../../content/districts';
import { buildDistrictPolys, DISTRICT_BORDERS, pointInPoly } from '../../content/districtBorders';
import { WORLD } from '../../content/world';
import { TRUCK_SPOTS } from '../../content/truckSpots';
import { DISTRICT_IDS, type DistrictId } from '../../../sim/districts';
import { DISTRICT_STREET, type StreetGroupKey } from '../../../sim/balance';
import { LEVELS } from '../../village/villageEvening';
import { districtLabelOpacity } from '../village/DistrictLabels';
import { districtLanes, districtParties, districtWalkerCount, lakeModeFor, pickStreetGroups, streetGroupAt } from '../village/districtStreet';
import { stringsFor } from '../../../content/strings';
import type { SimulationState } from '../../types';

const centre = (id: string): [number, number] => {
  const b = (worldRaw as { buildings: Array<{ id: string; poly: number[][] }> }).buildings.find((x) => x.id === id)!;
  return [b.poly.reduce((a, p) => a + p[0], 0) / b.poly.length, b.poly.reduce((a, p) => a + p[1], 0) / b.poly.length];
};

describe('ORDER 332 D — gränserna', () => {
  it('spelets polygoner är skriptets: samma funktion på samma vägar', () => {
    expect(WORLD.roads).toEqual((worldRaw as { roads: unknown }).roads);
    expect(buildDistrictPolys((worldRaw as unknown as { roads: Array<{ id: string; poly: [number, number][] }> }).roads)).toEqual(DISTRICT_AREAS);
  });

  it('varje gatuben ligger på sin gata (ändpunkterna inom 1 m från mittlinjen)', () => {
    for (const id of DISTRICT_IDS) expect(DISTRICT_AREAS[id].maxOffRoadM).toBeLessThan(1);
  });

  // ORDER 333 B — Magasinsgatan ligger utanför kvarteren (avsnitt 8 punkt 1).
  it('vagnens platser ligger i sina kvarter, Magasinsgatan i inget', () => {
    for (const s of Object.values(TRUCK_SPOTS)) expect([s.id, districtAt(s.C[0], s.C[1])]).toEqual([s.id, s.outsideDistricts ? null : s.district]);
  });

  it('krogen, Gästgivaregården, kyrkan, Måltidens hus, Kärnhuset och Prästgatans studentsträcka', () => {
    const want: Array<[string, [number, number], DistrictId]> = [
      ['spelarens krog', centre('w869907975'), 'torget'],
      ['Gästgivaregården', centre('w869907964'), 'gastgivaregarden'],
      ['kyrkan', centre('w869907961'), 'gastgivaregarden'],
      ['Måltidens hus', centre('w193810975'), 'campus'],
      ['Kärnhuset', centre('w193810921'), 'campus'],
      ['källaren (D15)', centre('w193810970'), 'student'],
      ['sjön', [376, 268], 'sjon']
    ];
    for (const [what, p, d] of want) expect([what, districtAt(p[0], p[1])]).toEqual([what, d]);
    const prast = (worldRaw as { roads: Array<{ id: string; poly: number[][] }> }).roads.find((r) => r.id === 'w122157689')!.poly;
    for (const p of prast.filter((q) => q[0] > 210 && q[0] < 375)) {
      expect(districtAt(p[0], p[1] - 1)).toBe('student');
      expect(districtAt(p[0], p[1] + 1)).toBe('student');
    }
  });

  it('polygonerna överlappar inte (rutnät 3,1 m)', () => {
    let overlap = 0;
    for (let x = -200; x < 700; x += 3.1) for (let z = -300; z < 400; z += 3.1) {
      if (DISTRICT_IDS.filter((d) => pointInPoly(x, z, DISTRICT_AREAS[d].poly)).length > 1) overlap++;
    }
    expect(overlap).toBe(0);
  });

  it('namnets plats ligger i kvarteret, och varje kvarter har namn på svenska och engelska', () => {
    for (const id of DISTRICT_IDS) {
      const [x, z] = DISTRICT_AREAS[id].labelAt;
      expect(districtAt(x, z)).toBe(id);
      expect(stringsFor('sv').village.districts[id]).toBeTruthy();
      expect(stringsFor('en').village.districts[id]).toBeTruthy();
      expect(DISTRICT_BORDERS[id].legs.length).toBeGreaterThan(2);
    }
    expect(stringsFor('en').village.districts.campus).toContain('the House of the Meal');
  });
});

describe('ORDER 332 D — namnen syns bara på nivån Byn', () => {
  it('fullt på byns nivå, borta på kvarterets, gatans och krogens', () => {
    const at = (id: string) => LEVELS.find((l) => l.id === id)!.dist;
    expect(districtLabelOpacity(at('village'))).toBe(1);
    for (const l of LEVELS) if (l.id !== 'village') expect([l.id, districtLabelOpacity(l.dist)]).toEqual([l.id, 0]);
  });
});

describe('ORDER 332 D — gästerna på gatan per kvarter', () => {
  it('kvarterets lager följer andelarna i balance.ts (DISTRICT_STREET.mix)', () => {
    for (const d of DISTRICT_IDS) {
      const n = 20;
      const groups = pickStreetGroups(DISTRICT_STREET.mix[d], n, 7);
      expect(groups.length).toBe(n);
      for (const [g, share] of Object.entries(DISTRICT_STREET.mix[d]) as [StreetGroupKey, number][]) {
        const got = groups.filter((x) => x === g).length;
        expect(Math.abs(got - share * n)).toBeLessThanOrEqual(1);
      }
      for (const g of groups) expect(Object.keys(DISTRICT_STREET.mix[d])).toContain(g);
    }
  });

  it('sällskapen rör sig som i D15', () => {
    const S = DISTRICT_STREET.style;
    const student = districtParties('student', 40, 3);
    for (const p of student.filter((x) => x.group === 'student')) {
      expect(p.members.length).toBeLessThanOrEqual(3);
      expect(p.speedMps).toBe(p.hurried ? S.studentHurriedMps : S.speedMps.student);
    }
    expect(student.some((p) => p.group === 'student' && p.members.length === 3)).toBe(true);
    const gg = districtParties('gastgivaregarden', 40, 3);
    for (const p of gg.filter((x) => x.group === 'tourist')) { expect(p.stopLook).toBe(true); expect(p.speedMps).toBe(S.speedMps.tourist); }
    for (const p of gg.filter((x) => x.group === 'gourmet')) expect(p.members.length).toBeLessThanOrEqual(2);
    const campus = districtParties('campus', 40, 3);
    expect(campus.some((p) => p.group === 'business' && p.members.length === 2 && p.talk)).toBe(true);
    const sjon = districtParties('sjon', 20, 3);
    const fam = sjon.filter((p) => p.group === 'family');
    expect(fam.length).toBeGreaterThan(0);
    for (const p of fam) expect(p.members.map((m) => [m.group, m.sizeK])).toEqual([['villager', 1], ['child', DISTRICT_STREET.style.childSizeK]]);
  });

  it('byns gående tar kvarterets andelar där de går', () => {
    const [x, z] = DISTRICT_AREAS.student.labelAt;
    const seen = new Set<string | null>();
    for (let i = 0; i < 200; i++) seen.add(streetGroupAt(x, z, i / 200));
    expect([...seen].sort()).toEqual(['student', 'villager']);
    expect(streetGroupAt(-900, -900, 0.5)).toBeNull();
  });

  it('sjöns två lägen: sommarhelgen och höstvardagen, antalet ur balance.ts', () => {
    const st = (dayNumber: number, weather: string) => ({ day: { dayNumber, truck: { weather } }, seed: 1, prov: null }) as unknown as SimulationState;
    // Dag 5 = fredag vecka 1 (sjön öppen), dag 1 = måndag, dag 47 = fredag vecka 7 (sjön stängd).
    expect(lakeModeFor(st(5, 'sun'))).toBe('summerWeekend');
    expect(lakeModeFor(st(5, 'rain'))).toBe('autumnWeekday');
    expect(lakeModeFor(st(1, 'sun'))).toBe('autumnWeekday');
    expect(lakeModeFor(st(47, 'sun'))).toBe('autumnWeekday');
    expect(districtWalkerCount('sjon', 'summerWeekend')).toBe(DISTRICT_STREET.lake.summerWeekend.walkers);
    expect(districtWalkerCount('sjon', 'autumnWeekday')).toBe(DISTRICT_STREET.lake.autumnWeekday.walkers);
  });

  it('varje kvarter har gångplatser att gå på, mest inne i kvarteret', () => {
    for (const d of DISTRICT_IDS) {
      const lanes = districtLanes(d);
      expect([d, lanes.length > 0]).toEqual([d, true]);
      for (const lane of lanes) {
        const inside = lane.filter((p) => pointInPoly(p[0], p[1], DISTRICT_AREAS[d].poly)).length / lane.length;
        expect(inside).toBeGreaterThanOrEqual(0.7);
      }
    }
  });
});
