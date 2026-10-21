// ORDER 332 D–G (Anders 2026-10-13) — kvarteren i simuleringen:
// D. kvarterets gäster skiljer sig mellan vardag och helg, termin, säsong, marknad och konferens (balance.ts DISTRICTS);
// E. gästen väger kvaliteten mot pris och rykte: kräsenheten väger kvaliteten, plånboken priset;
// F. spelarens krog ligger på Torget och Torgets tal är dagens;
// G. vagnens fem platser, valet i morgonrutan och avgiften.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { DISTRICTS, VILLAGE } from '../balance';
import { calendarFor, firstDayOfWeek } from '../calendar';
import {
  districtTonight, isConferenceDay, isTermTime, playerDistrictOf, playerQuality, playerTruckSpotOf, qualityWeight,
  truckSpotFeeSek, truckSpotOpen, DISTRICT_IDS, TRUCK_SPOT_IDS, TRUCK_SPOTS
} from '../districts';
import { districtMix, playerChoiceShare, venueWeight } from '../village';
import { dailyGuestCap } from '../economy';
import { typeShares } from '../../strategic/simulation/guestTypes';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import type { SimulationState } from '../../strategic/types';

const morning = (s: SimulationState): SimulationState => ({ ...s, day: { ...s.day, period: 'morning' } });
const at = (s: SimulationState, spot: (typeof TRUCK_SPOT_IDS)[number]): SimulationState => ({ ...s, economy: { ...s.economy, truckSpot: spot } });
const TYPES = ['student', 'middle', 'high'] as const;

describe('ORDER 332 F — Torgets tal är dagens', () => {
  it('Torget har alla faktorer 1, ingen kräsenhet och byns blandning', () => {
    const t = DISTRICTS.list.torget;
    expect([t.pool, t.walletPriceK, t.walletComfortK, t.pickiness, t.starK, t.termK, t.outOfTermK, t.marketK, t.conferenceK]).toEqual([1, 1, 1, 0, 1, 1, 1, 1, 1]);
    expect([t.doorMix, t.weekday, t.seasonByWeek, t.weatherK, t.openWeeks]).toEqual([null, null, null, null, null]);
    expect(districtMix('torget')).toBe(VILLAGE.poolMix);
  });
  it('vikten på Torget är densamma som utan kvarter, för alla kvaliteter', () => {
    const taste = { student: 2, middle: 3, high: 1.5 };
    for (const ty of TYPES) for (const stars of [1, 3, 5]) for (const bill of [80, 210, 600]) for (const q of [0, 0.5, 1]) {
      expect(venueWeight(ty, taste, stars, bill, 'torget', q)).toBe(venueWeight(ty, taste, stars, bill));
    }
  });
  it('Torgets kväll är 1 varje dag i säsongen, med alla väder', () => {
    for (let day = 1; day <= 56; day++) for (const w of ['sun', 'rain', 'wind', 'cool'] as const) {
      expect(districtTonight('torget', day, w).poolFactor).toBe(1);
    }
  });
  it('vinbaren och bistron står på Torget, och vagnen på Torget är Torget', () => {
    const s = startInFoodtruck(3, firstDayOfWeek(2));
    expect(playerTruckSpotOf(s)).toBe('torget');
    expect(playerDistrictOf(s)).toBe('torget');
    expect(playerDistrictOf({ economy: { businessClass: 'vinbar', truckSpot: 'sjon' } })).toBe('torget');
    // Vagnen på Torget får vagnens gäster som förut, inte kvarterets.
    expect(typeShares(s)).not.toBe(DISTRICTS.list.student.doorMix);
  });
});

describe('ORDER 332 G — platserna', () => {
  // ORDER 333 B — och Magasinsgatan, den sjätte, med Torgets gäster och en egen avgift.
  it('sex platser, var och en i sitt kvarter, Torget och Campus som D15', () => {
    expect(TRUCK_SPOT_IDS).toHaveLength(6);
    expect(TRUCK_SPOTS.magasinsgatan.district).toBe('torget');
    expect(truckSpotFeeSek('magasinsgatan')).toBeGreaterThan(0);
    expect(TRUCK_SPOTS.torget.C).toEqual([17.0, -21.9]);
    expect(TRUCK_SPOTS.campus.C).toEqual([550.3, -70.42]);
    expect(new Set(TRUCK_SPOT_IDS.map((id) => TRUCK_SPOTS[id].district))).toEqual(new Set(DISTRICT_IDS));
  });
  it('platsen väljs på morgonen, inte under servicen', () => {
    const s = morning(startInFoodtruck(3, firstDayOfWeek(2)));
    const moved = reducer(s, { type: 'SET_TRUCK_SPOT', spot: 'campus' });
    expect(playerTruckSpotOf(moved)).toBe('campus');
    const dinner = { ...moved, day: { ...moved.day, period: 'dinner' as const } };
    expect(reducer(dinner, { type: 'SET_TRUCK_SPOT', spot: 'prastgatan' })).toBe(dinner);
  });
  it('Sjön är säsongsbunden: stängd efter badsäsongen och går inte att välja', () => {
    const late = morning(startInFoodtruck(3, firstDayOfWeek(7) + 1));
    expect(truckSpotOpen('sjon', late.day.dayNumber)).toBe(false);
    expect(reducer(late, { type: 'SET_TRUCK_SPOT', spot: 'sjon' })).toBe(late);
    expect(districtTonight('sjon', late.day.dayNumber).poolFactor).toBe(0);
    expect(truckSpotOpen('sjon', firstDayOfWeek(2))).toBe(true);
  });
  it('avgiften dras när dörrarna öppnar, Torget ingen', () => {
    const s = morning(startInFoodtruck(5, firstDayOfWeek(2) + 3));
    const open = (x: SimulationState) => reducer(x, { type: 'START_SERVICE' });
    const cashTorget = open(s).cash;
    const cashGgg = open(reducer(s, { type: 'SET_TRUCK_SPOT', spot: 'gastgivaregarden' })).cash;
    expect(cashTorget - cashGgg).toBe(DISTRICTS.truckSpotFeeSek.gastgivaregarden);
    expect(DISTRICTS.truckSpotFeeSek.torget).toBe(0);
  });
});

describe('ORDER 332 D — kvarteren över veckan och säsongen', () => {
  it('studenterna kommer i terminen, inte i sommarlovet', () => {
    const summer = firstDayOfWeek(3) + 1, term = firstDayOfWeek(8) + 1;
    expect([isTermTime(summer), isTermTime(term)]).toEqual([false, true]);
    expect(districtTonight('student', term).poolFactor).toBeGreaterThan(2 * districtTonight('student', summer).poolFactor);
  });
  it('campus fylls på konferensdagarna och töms på lördagen', () => {
    const conf = firstDayOfWeek(2) + 2; // onsdag vecka 2
    expect(isConferenceDay(conf)).toBe(true);
    expect(districtTonight('campus', conf).poolFactor).toBeGreaterThan(districtTonight('campus', firstDayOfWeek(3) + 2).poolFactor);
    expect(districtTonight('campus', firstDayOfWeek(3) + 5).poolFactor).toBeLessThan(districtTonight('campus', firstDayOfWeek(3) + 2).poolFactor);
  });
  it('sjön lever en sommarhelg i sol och är nästan tom en regnig vardag', () => {
    const sat = firstDayOfWeek(2) + 5, mon = firstDayOfWeek(6);
    expect(calendarFor(sat).weekday).toBe('sat');
    expect(districtTonight('sjon', sat, 'sun').poolFactor).toBeGreaterThan(5 * districtTonight('sjon', mon, 'rain').poolFactor);
  });
  it('marknadsdagarna är torgets: de andra kvarteren tappar', () => {
    const market = firstDayOfWeek(3) + 4; // fredag vecka 3, Grythyttedagarna
    expect(districtTonight('student', market).market).toBe(true);
    expect(districtTonight('torget', market).poolFactor).toBe(1);
  });
  it('vagnen i ett annat kvarter får kvarterets gäster och kvarterets mängd', () => {
    const s = morning(startInFoodtruck(3, firstDayOfWeek(2) + 2));
    expect(typeShares(at(s, 'prastgatan'))).toEqual(DISTRICTS.list.student.doorMix);
    const capTorget = dailyGuestCap(s), capSjon = dailyGuestCap(at(s, 'sjon'));
    expect(capTorget).toBeGreaterThan(0);
    expect(capSjon).not.toBe(capTorget);
  });
});

describe('ORDER 332 E — kvaliteten mot pris och rykte', () => {
  it('kräsenheten väger kvaliteten: vid Gästgivaregården mycket, på Torget inte', () => {
    expect(qualityWeight('gastgivaregarden', 0.8) / qualityWeight('gastgivaregarden', 0.3)).toBeGreaterThan(3);
    expect(qualityWeight('torget', 0.8)).toBe(qualityWeight('torget', 0.3));
  });
  it('plånboken väger priset: en dyr nota straffas hårdare bland studenterna än på Torget', () => {
    const taste = { student: 2, middle: 3, high: 1.5 };
    const drop = (d: 'torget' | 'student') => venueWeight('student', taste, 3, 200, d) / venueWeight('student', taste, 3, 100, d);
    expect(drop('student')).toBeLessThan(drop('torget'));
    const dropHigh = (d: 'torget' | 'gastgivaregarden') => venueWeight('high', taste, 3, 900, d) / venueWeight('high', taste, 3, 400, d);
    expect(dropHigh('gastgivaregarden')).toBeGreaterThan(dropHigh('torget'));
  });
  it('Gästgivaregården läser helheten (den svagaste), Campus medaljerna', () => {
    const q = { qualityFood: 0.9, qualityDrink: 0.3, qualityService: 0.8, medals: { stensota: 'guld' as const, kalastorget: 'silver' as const } };
    expect(playerQuality(q, 'gastgivaregarden')).toBe(0.3);
    expect(playerQuality(q, 'campus')).toBeCloseTo((3 + 2) / (5 * 4));
  });
  it('bättre kvalitet ger större andel vid Gästgivaregården', () => {
    const s = morning(at(startInFoodtruck(3, firstDayOfWeek(2) + 2), 'gastgivaregarden'));
    const low = playerChoiceShare({ ...s, qualityFood: 0.2, qualityDrink: 0.2, qualityService: 0.2 });
    const high = playerChoiceShare({ ...s, qualityFood: 0.9, qualityDrink: 0.9, qualityService: 0.9 });
    expect(high).toBeGreaterThan(low * 2);
  });
});
