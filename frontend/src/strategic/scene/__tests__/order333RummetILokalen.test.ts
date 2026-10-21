// ORDER 333 D — vinbarens rum i lokalens hus (Anders 2026-10-21: rummet flyttas). Rummet, gästernas dörr och kamerans
// förval följer lokalen (content/playerPremises.ts); väggarna ligger innanför husets mått; Torget är som förut.
// Med WRITE_REPORTS=1 skrivs reports/order333/rummet.json.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { currentPremises, premisesBuilding, setCurrentPremises } from '../../content/playerPremises';
import { LANDMARK_BUILDING_IDS, PLAYER_BUSINESS_BUILDING_IDS, WORLD } from '../../content/world';
import { pointInPolygon } from '../../content/roadSurface';
import { venuePlaces } from '../../content/villagePlaces';
import { PRESETS } from '../../camera/viewLevels';
import { PREMISES_IDS, type PremisesId } from '../../../sim/districts';

// D15 kvarterPlatser.js VENUES glashornet.outline: Flygelns yttre kant i lokalens ram (Kärnhusets polygon är hela huset).
const FLYGELN_OUTLINE: [number, number][] = [[-8.25, 9.43], [-8.24, -8.67], [8.25, -8.67], [8.24, 7.91], [2.59, 7.91]];
const house = (p: PremisesId) => {
  if (p === 'glashornet') {
    const th = 0.90619, c = Math.cos(th), s = Math.sin(th);
    return FLYGELN_OUTLINE.map(([x, z]) => [427.75 + c * x - s * z, -87.7 + s * x + c * z] as [number, number]);
  }
  return WORLD.buildings.find((b) => b.id === premisesBuilding(p)!.id)!.poly;
};

function measure(p: PremisesId) {
  setCurrentPremises(p);
  const L = computePlayerBusinessInterior()!;
  const v = venuePlaces().player;
  const e = L.entrance as unknown as [number, number];
  // Rummets egna hörn med väggarna (layoutens mitt, mått och vinkel), inte det tänkta husets.
  const c = Math.cos(L.worldAngle), sn = Math.sin(L.worldAngle), hw = L.width / 2, hd = L.depth / 2;
  const corners = p === 'torget' ? null : ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as const).map(([x, z]) => [L.centre[0] + x * c - z * sn, L.centre[1] + x * sn + z * c] as [number, number]);
  return {
    centre: L.centre, angle: L.worldAngle, entrance: e,
    cornersInsideHouse: corners ? corners.filter((q) => pointInPolygon(house(p), q[0], q[1])).length : null,
    doorNodeToEntranceM: Math.round(Math.hypot(v.doorPoint[0] - e[0], v.doorPoint[1] - e[1]) * 10) / 10,
    myBusinessFocus: PRESETS.myBusiness.target.focus
  };
}

afterEach(() => setCurrentPremises('torget'));

describe('ORDER 333 D — rummet i lokalens hus', () => {
  it('Torget är som förut, också efter en annan lokal', () => {
    const before = measure('torget');
    measure('salongen');
    expect(measure('torget')).toEqual(before);
    expect([...PLAYER_BUSINESS_BUILDING_IDS]).toEqual(['w869907975']);
    expect(LANDMARK_BUILDING_IDS.has('w869907975')).toBe(true);
    expect(LANDMARK_BUILDING_IDS.has('w193810957')).toBe(false);
    expect(LANDMARK_BUILDING_IDS.has('w193810921')).toBe(true);
  });

  it('i en lokal står rummet med väggarna innanför husets mått, och gästernas dörr ligger vid entrén', () => {
    for (const p of PREMISES_IDS.filter((x) => x !== 'torget')) {
      const m = measure(p);
      expect([p, currentPremises(), m.cornersInsideHouse]).toEqual([p, p, 4]);
      expect([p, m.doorNodeToEntranceM < 25]).toEqual([p, true]);
      expect(LANDMARK_BUILDING_IDS.has('w869907975')).toBe(false);
      expect(Math.hypot(m.myBusinessFocus.x - m.centre[0], m.myBusinessFocus.z - m.centre[1])).toBeLessThan(20);
    }
  });

  it.skipIf(!process.env.WRITE_REPORTS)('skriver reports/order333/rummet.json', () => {
    const rows = Object.fromEntries(PREMISES_IDS.map((p) => [p, measure(p)]));
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order333');
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, 'rummet.json'), JSON.stringify({
      definition: 'ORDER 333 D. Per lokal: rummets mitt och vinkel (computePlayerBusinessInterior), entrén, hur många av det tänkta husets fyra hörn (vinbarens yttermått) som ligger i husets polygon (Flygeln: D15:s outline), metrarna från gästernas dörrnod (venuePlaces) till entrén och kamerans förval Krogen (PRESETS.myBusiness).',
      rows
    }, null, 1) + '\n');
  });
});
