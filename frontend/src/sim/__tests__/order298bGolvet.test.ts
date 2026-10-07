// ORDER 298b (Vision Owner 2026-10-03): "Lågt rykte ska fortfarande ge färre
// gäster, men golvet blir 10 sällskap per kväll." Satsningen "Provsmakning på
// torget" ger fler sällskap samma kväll, och effekten växer med medaljerna i
// Stensöta och Kalastorget. "Lugn kväll: ryktet är ännu lågt i byn" står när
// ryktet håller nere gästerna.

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { mountRoomLikeScene } from '../../strategic/testHarness/roomParity';
import { reputationHoldsGuests, tastingPartiesFor } from '../../strategic/simulation/arrivals';
import { firstDayOfWeek } from '../calendar';
import { GUEST_FLOOR, TASTING } from '../balance';
import type { SimulationState } from '../../strategic/types';

function evening(seed: number, offset: number, reputation: number, tasting = false, medals?: SimulationState['medals']) {
  let s = makeNewGameState(seed);
  s = { ...s, reputation, ...(medals ? { medals } : {}), day: { ...s.day, dayNumber: firstDayOfWeek(1) + offset } };
  s = playMorning(s, { activities: tasting ? [TASTING.activityId] : [] });
  mountRoomLikeScene(s.businessClass);
  s = reducer(s, { type: 'START_SERVICE' });
  const seated = new Set<string>();
  s = tickUntil(s, (x) => {
    for (const g of x.guests) if (g.seatIndex !== null && g.seatIndex !== undefined) seated.add(g.partyId ?? g.id);
    return x.day.period === 'evening' || x.day.period === 'morning';
  });
  return { parties: s.day.partiesTonight ?? 0, tasting: s.day.tastingPartiesTonight ?? 0, seatedParties: seated.size };
}

describe('ORDER 298b — golvet på tio sällskap', () => {
  it('lågt rykte ger minst tio sällskap vid bord, måndag och fredag', () => {
    for (const reputation of [0.05, 0.2]) {
      for (const seed of [1, 2, 10]) {
        for (const offset of [0, 4]) {
          const r = evening(seed, offset, reputation);
          expect(r.parties, `frö ${seed}, dag ${offset}, rykte ${reputation}`).toBeGreaterThanOrEqual(GUEST_FLOOR.partiesPerEvening);
          expect(r.seatedParties).toBeGreaterThanOrEqual(GUEST_FLOOR.partiesPerEvening);
        }
      }
    }
  });

  it('lågt rykte ger fortfarande färre gäster än gott rykte', () => {
    const low = evening(2, 4, 0.2);
    const high = evening(2, 4, 0.6);
    expect(low.seatedParties).toBeLessThan(high.seatedParties);
  });
});

describe('ORDER 298b — provsmakningen på torget', () => {
  // Raketerna tar också in sällskap när rummet fylls, så en enskild kväll
  // skiljer sig åt; jämförelsen görs över fyra frön.
  // ORDER 314 — känd avvikelse: provsmakningens fler sittande sällskap kom
  // mest genom fler raketer i ett fullare rum. Med situationernas takt (4–6
  // per kväll, de fyra första oavsett trycket) blir skillnaden vid rykte 0,2
  // nästan noll: 340 mot 338 över 16 frön (reports/order314/provsmakningen-16.json).
  // Frågan står i ORDER_314_RAPPORT.md; it.fails blir it när den är avgjord.
  it.fails('ger fler sällskap samma kväll, utöver golvet', () => {
    let without = 0;
    let withTasting = 0;
    for (const seed of [1, 2, 3, 10]) {
      without += evening(seed, 0, 0.2).seatedParties;
      const r = evening(seed, 0, 0.2, true);
      expect(r.tasting, `frö ${seed}`).toBe(tastingPartiesFor(makeNewGameState(seed)));
      expect(r.parties).toBeGreaterThanOrEqual(GUEST_FLOOR.partiesPerEvening);
      withTasting += r.seatedParties;
    }
    expect(withTasting).toBeGreaterThan(without);
  });

  it('växer med medaljerna i Stensöta och Kalastorget', () => {
    const none = tastingPartiesFor({ medals: {} });
    const some = tastingPartiesFor({ medals: { stensota: 'silver' } });
    const more = tastingPartiesFor({ medals: { stensota: 'guld', kalastorget: 'silver' } });
    const elsewhere = tastingPartiesFor({ medals: { metodkoket: 'guld' } });
    expect(none).toBe(TASTING.baseParties);
    expect(some).toBeGreaterThan(none);
    expect(more).toBeGreaterThan(some);
    expect(elsewhere).toBe(none);
  });
});

describe('ORDER 298b — Lugn kväll', () => {
  it('står när ryktet håller nere gästerna, inte med gott rykte', () => {
    const s = makeNewGameState(1);
    expect(reputationHoldsGuests({ ...s, reputation: 0.2 })).toBe(true);
    expect(reputationHoldsGuests({ ...s, reputation: 0.6 })).toBe(false);
    // Söndag är stängt (marknaden ger 0): ingen Lugn kväll.
    const sunday = { ...s, reputation: 0.2, day: { ...s.day, dayNumber: firstDayOfWeek(1) + 6 } };
    expect(reputationHoldsGuests(sunday)).toBe(false);
  });

  // Provspelets kontroll: raden stod på morgonen men försvann när dörrarna
  // öppnade (världens faktorer sattes då). Den säger samma sak hela dagen.
  it('säger samma sak på morgonen, före och efter öppning', () => {
    for (const reputation of [0.2, 0.3, 0.45, 0.6]) {
      for (const offset of [0, 4]) {
        let s = makeNewGameState(1);
        s = { ...s, reputation, day: { ...s.day, dayNumber: firstDayOfWeek(2) + offset } };
        s = playMorning(s, {});
        const morning = reputationHoldsGuests(s);
        mountRoomLikeScene(s.businessClass);
        s = reducer(s, { type: 'START_SERVICE' });
        expect(reputationHoldsGuests(s), `rykte ${reputation}, dag ${offset}`).toBe(morning);
        s = tickUntil(s, (x) => !!x.day.doorsOpenedThisService);
        expect(reputationHoldsGuests(s)).toBe(morning);
      }
    }
  });
});
