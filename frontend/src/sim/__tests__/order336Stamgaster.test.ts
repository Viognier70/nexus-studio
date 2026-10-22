// ORDER 336 C (Anders 2026-10-22): stamgästerna på Magasinsgatan blir fyra fler per kväll upp till 30, och när spelaren
// tar över vinbaren följer en andel med (balance.ts DISTRICTS.magasinsgatan.followShare) och kommer varje kväll som bybor.
import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { firstDayOfWeek } from '../calendar';
import { DISTRICTS } from '../balance';
import { followingRegularsAtTakeover, truckRegularsTonight } from '../districts';
import { dailyGuestCap } from '../economy';
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
  // ORDER 337 B — taket vid vagnen 20 (förut 30).
  it('fyra fler per kväll vagnen stått där, taket 20', () => {
    const m = DISTRICTS.magasinsgatan;
    expect([m.regularsPerEvening, m.regularsMax]).toEqual([4, 20]);
    expect(truckRegularsTonight(offeredAt(3))).toBe(12);
    expect(truckRegularsTonight(offeredAt(20))).toBe(20);
  });

  it('en andel följer med till vinbaren och bokas varje kväll som bybor; utan kvällar på Magasinsgatan ingen', () => {
    const taken = reducer(offeredAt(6), { type: 'LADDER_TAKE', premises: 'salongen' });
    const last = Math.min(20, 4 * 5);
    expect(taken.economy.followingRegulars).toBe(Math.floor(DISTRICTS.magasinsgatan.followShare * last));
    expect(followingRegularsAtTakeover(offeredAt(6))).toBe(taken.economy.followingRegulars);
    expect(truckRegularsTonight(taken)).toBe(taken.economy.followingRegulars);
    const b = bookingFor({ ...taken, day: { ...taken.day, dayNumber: firstDayOfWeek(3) + 2 } });
    expect(b.regulars).toBe(taken.economy.followingRegulars);
    expect(b.counts.middle).toBeGreaterThanOrEqual(b.regulars!);
    expect(reducer(offeredAt(0), { type: 'LADDER_TAKE' }).economy.followingRegulars).toBe(0);
  });

  it('i krogen är stamgästerna ett golv: kvällens tak blir aldrig lägre än dem, men de läggs inte ovanpå en full kväll', () => {
    const taken = reducer(offeredAt(6), { type: 'LADDER_TAKE' });
    const day = { ...taken.day, dayNumber: firstDayOfWeek(3) + 2 };
    const without = dailyGuestCap({ ...taken, day, economy: { ...taken.economy, followingRegulars: 0 } });
    const loyal = taken.economy.followingRegulars!;
    expect(dailyGuestCap({ ...taken, day })).toBe(Math.max(without, loyal));
    // En kväll med få gäster (lågt rykte): stamgästerna kommer ändå.
    const thin = { ...taken, day, economy: { ...taken.economy, followingRegulars: 999 } };
    expect(dailyGuestCap(thin)).toBeGreaterThanOrEqual(999);
  });
});

// ORDER 337 B (Anders 2026-10-22): stamgästernas väntan i kön sänker inte ryktet.
describe('ORDER 337 B — stamgästerna i kön', () => {
  it('nöjdheten sjunker inte och de går inte ur kön, också långt efter tålamodet', async () => {
    const { tickGuests, isSeatedCapacity } = await import('../../strategic/simulation/service');
    const { makeGuest } = await import('../../strategic/simulation/model');
    const s = reducer(offeredAt(6), { type: 'LADDER_TAKE' });
    // Rummet fullt: varje plats har en gäst som äter, så de två i kön får ingen plats.
    const cap = isSeatedCapacity(s);
    const seated = Array.from({ length: cap }, (_, i) => ({ ...makeGuest(0), id: `s${i}`, state: 'eating' as const, seatIndex: i, stateTime: 9999 }));
    const wait = (id: string, regular: boolean) => ({ ...makeGuest(0), id, state: 'waiting' as const, stateTime: 0, satisfaction: 0.5, ...(regular ? { spotRegular: 0 } : {}) });
    const st = { ...s, simTime: 10000, guests: [...seated, wait('r', true), wait('o', false)], waitingIds: ['r', 'o'], seatedIds: seated.map((g) => g.id) } as SimulationState;
    tickGuests(st);
    const r = st.guests.find((g) => g.id === 'r')!, o = st.guests.find((g) => g.id === 'o')!;
    expect([r.satisfaction, r.state]).toEqual([0.5, 'waiting']);
    expect(o.satisfaction).toBeLessThan(0.5);
  });
});
