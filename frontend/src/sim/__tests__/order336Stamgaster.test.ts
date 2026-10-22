// ORDER 336 C (Anders 2026-10-22): stamgästerna på Magasinsgatan blir fyra fler per kväll upp till 30, och när spelaren
// tar över vinbaren följer en andel med (balance.ts DISTRICTS.magasinsgatan.followShare) och kommer varje kväll som bybor.
import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { firstDayOfWeek } from '../calendar';
import { DISTRICTS } from '../balance';
import { followingRegularsAtTakeover, truckRegularsTonight } from '../districts';
import { bookingFor } from '../../strategic/simulation/guestTypes';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import type { SimulationState } from '../../strategic/types';

function offeredAt(nights: number): SimulationState {
  const s = startInFoodtruck(3, firstDayOfWeek(3) + 1);
  return {
    ...s, cash: 500000, day: { ...s.day, period: 'morning' },
    economy: { ...s.economy, truckSpot: 'magasinsgatan', truckNights: { magasinsgatan: nights } },
    ladder: { ...s.ladder!, offer: { to: 'vinbar', depositSek: 50000, loanSek: 0, state: 'offered', offeredOnDay: s.day.dayNumber } }
  };
}

describe('ORDER 336 C — stamgästerna från Magasinsgatan', () => {
  it('fyra fler per kväll vagnen stått där, taket 30', () => {
    const m = DISTRICTS.magasinsgatan;
    expect([m.regularsPerEvening, m.regularsMax]).toEqual([4, 30]);
    expect(truckRegularsTonight(offeredAt(3))).toBe(12);
    expect(truckRegularsTonight(offeredAt(20))).toBe(30);
  });

  it('en andel följer med till vinbaren och bokas varje kväll som bybor; utan kvällar på Magasinsgatan ingen', () => {
    const taken = reducer(offeredAt(6), { type: 'LADDER_TAKE', premises: 'salongen' });
    const last = Math.min(30, 4 * 5);
    expect(taken.economy.followingRegulars).toBe(Math.floor(DISTRICTS.magasinsgatan.followShare * last));
    expect(followingRegularsAtTakeover(offeredAt(6))).toBe(taken.economy.followingRegulars);
    expect(truckRegularsTonight(taken)).toBe(taken.economy.followingRegulars);
    const b = bookingFor({ ...taken, day: { ...taken.day, dayNumber: firstDayOfWeek(3) + 2 } });
    expect(b.regulars).toBe(taken.economy.followingRegulars);
    expect(b.counts.middle).toBeGreaterThanOrEqual(b.regulars!);
    expect(reducer(offeredAt(0), { type: 'LADDER_TAKE' }).economy.followingRegulars).toBe(0);
  });
});
