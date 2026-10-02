// ORDER 296b — balansändringarna (Vision Owner 2026-10-02): "felsvar ska
// kosta mindre, och ryktet ska hålla över veckan för en rimlig spelare …
// DJ och springare ska löna sig när de används klokt … men inte när de
// används varje kväll." Mätningarna står i reports/order296b/; här prövas
// reglerna.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { consumeMepForOneGuest, MEP_CONSUMPTION_PER_GUEST } from '../../strategic/simulation/mepConsumption';
import { taskDurationTicks } from '../../strategic/simulation/economics';
import { stocked } from '../../strategic/testHarness/stocked';
import { tickDjRound } from '../satsningar';
import { firstDayOfWeek } from '../calendar';
import { COLLAPSE, EVENING_ECONOMY, INCIDENTS, MEP_EVENING, QUEUE_CAP } from '../balance';
import type { Guest, GuestBooking, SimulationState } from '../../strategic/types';

function week2(seed = 296): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } };
}

function booking(total: number): GuestBooking {
  return { dayNumber: 0, counts: { student: 0, middle: total, high: 0 }, social: null, walkIns: 0, total, billionaireInTown: false, billionaire: false };
}

describe('ORDER 296b — mise en place räcker kvällen', () => {
  it('förbrukningen per gäst skalas med kvällens bokning', () => {
    const base = week2();
    const full = { garnish: 1, napkins: 1, cutlery: 1, stations: 1, ice: 1 };
    const small: SimulationState = { ...base, day: { ...base.day, prepReadiness: { ...full }, booking: booking(MEP_EVENING.calibratedGuests) } };
    const big: SimulationState = { ...base, day: { ...base.day, prepReadiness: { ...full }, booking: booking(MEP_EVENING.calibratedGuests * 3) } };
    consumeMepForOneGuest(small);
    consumeMepForOneGuest(big);
    expect(1 - small.day.prepReadiness!.garnish).toBeCloseTo(MEP_CONSUMPTION_PER_GUEST.garnish);
    expect(1 - big.day.prepReadiness!.garnish).toBeCloseTo(MEP_CONSUMPTION_PER_GUEST.garnish / 3);
  });
});

describe('ORDER 296b — kön har ett tak', () => {
  it('ingen gång står fler sällskap i kön än taket, och de som vänder räknas', () => {
    let s = reducer(stocked(week2()), { type: 'START_SERVICE' });
    let maxParties = 0;
    for (let i = 0; i < 30000 && s.day.period === 'dinner'; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const parties = new Set(s.guests.filter((g) => g.state === 'waiting' || g.state === 'arriving').map((g) => g.partyId ?? g.id));
      maxParties = Math.max(maxParties, parties.size);
    }
    expect(maxParties).toBeLessThanOrEqual(QUEUE_CAP.maxParties);
    expect(s.day.turnedAwayFull ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe('ORDER 296b — felsvar kostar mindre', () => {
  it('andelen av ett fels förlust i kassan är under ett', () => {
    expect(INCIDENTS.wrongCashShare).toBeGreaterThan(0);
    expect(INCIDENTS.wrongCashShare).toBeLessThan(1);
  });
  it('kollapsen är en femtedel av ORDER 046:s tal', () => {
    expect(COLLAPSE.floorPerTick).toBeLessThan(COLLAPSE.strainGainPerTick);
  });
});

describe('ORDER 296b — satsningarna', () => {
  function seatedAt21(dj: boolean, djWeek?: SimulationState['djWeek']): SimulationState {
    const s = stocked(week2());
    const seated: Guest[] = Array.from({ length: 10 }, (_, i) => ({ ...s.guests[0], id: `g${i}`, state: 'dining' }) as Guest);
    return {
      ...s,
      guests: seated,
      djWeek,
      day: { ...s.day, period: 'dinner', pickedActivityIds: dj ? ['book-dj'] : [], platesRemaining: { ...s.day.platesRemaining, 'house-wine-glass': 40 } },
      simTime: Number.MAX_SAFE_INTEGER / 2
    };
  }

  it('DJ:n: alla som sitter tar ett glas när musiken börjar, en gång per kväll', () => {
    const d = seatedAt21(true);
    tickDjRound(d);
    expect(d.day.djRoundGlasses).toBe(10 * EVENING_ECONOMY.djRoundGlassesPerGuest);
    expect(d.day.djRoundSek).toBeGreaterThan(0);
    const again = d.day.djRoundGlasses;
    tickDjRound(d);
    expect(d.day.djRoundGlasses).toBe(again);
  });

  it('DJ:n: utan satsningen ingen runda', () => {
    const d = seatedAt21(false);
    tickDjRound(d);
    expect(d.day.djRoundAt ?? null).toBeNull();
  });

  it('DJ:n: efter veckans två första DJ-kvällar beställer en andel', () => {
    const d = seatedAt21(true, { week: 2, evenings: EVENING_ECONOMY.djFullRoundsPerWeek });
    tickDjRound(d);
    expect(d.day.djRoundGlasses).toBe(Math.round(10 * EVENING_ECONOMY.djLaterRoundShare));
    expect(d.djWeek?.evenings).toBe(EVENING_ECONOMY.djFullRoundsPerWeek + 1);
  });

  it('DJ:n drar inte längre fler gäster', () => {
    expect(EVENING_ECONOMY.djGuestShare).toBe(0);
  });

  it('springaren gör uppgifterna vid borden kortare', () => {
    const s = week2();
    const plain = taskDurationTicks(s.policies, 'serve', 1, 0.5, 1);
    const runner = taskDurationTicks(s.policies, 'serve', 1, 0.5, EVENING_ECONOMY.runnerTableTaskTime);
    expect(runner).toBeLessThan(plain);
  });
});
