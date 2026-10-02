// ORDER 296 — butiken, förmågorna, bandet i byn och recensenten (Designs
// leverans hovmästaren och butiken; kärnan punkt 3 och 4).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { abilityActive, abilityUnlocked, creditsOf, slotCount, stoneState } from '../shop';
import { misePlan } from '../miseEnPlace';
import { arrivedShare, villageLive, villageRank } from '../villageLive';
import { reviewerComes } from '../serviceEvents';
import { firstDayOfWeek } from '../calendar';
import { ECONOMY, EVENTS, MISE_EN_PLACE, REPUTATION, SHOP, VILLAGE } from '../balance';
import type { SimulationState } from '../../strategic/types';

function player(credits: number, medals: SimulationState['medals']): SimulationState {
  const s = makeNewGameState(296);
  const loan = { originalSek: ECONOMY.normalWeeklyRevenueSek.vinbar * 2, principalSek: ECONOMY.normalWeeklyRevenueSek.vinbar * 2, weeksLeft: 8 };
  return {
    ...s,
    medals,
    knowledgeCredits: { episteme: credits, techne: 0, phronesis: 0 },
    knowledgeTracks: { ...s.knowledgeTracks, episteme: { ...s.knowledgeTracks.episteme, untagged: credits } },
    economy: { ...s.economy, businessClass: 'vinbar', loan },
    day: { ...s.day, dayNumber: firstDayOfWeek(2), period: 'morning' }
  };
}

describe('ORDER 296 — butiken', () => {
  it('medaljen öppnar stenen, krediterna betalar, och köpet läggs i facket', () => {
    const s = player(SHOP.abilities.sommBottle.price, { stensota: 'brons' });
    expect(stoneState(s, 'sommBottle')).toBe('open');
    expect(stoneState(s, 'wineFridge')).toBe('locked');
    const after = reducer(s, { type: 'SHOP_BUY', id: 'sommBottle' });
    expect(creditsOf(after)).toBe(0);
    expect(after.shop?.owned).toEqual(['sommBottle']);
    expect(abilityActive(after, 'sommBottle')).toBe(true);
    // Medaljen förbrukas inte.
    expect(after.medals.stensota).toBe('brons');
  });

  it('utan medalj eller krediter blir det inget köp', () => {
    const noMedal = player(1000, {});
    expect(abilityUnlocked(noMedal, 'sommBottle')).toBe(false);
    expect(reducer(noMedal, { type: 'SHOP_BUY', id: 'sommBottle' }).shop?.owned ?? []).toEqual([]);
    const poor = player(SHOP.abilities.sommBottle.price - 1, { stensota: 'brons' });
    expect(stoneState(poor, 'sommBottle')).toBe('short');
    expect(reducer(poor, { type: 'SHOP_BUY', id: 'sommBottle' }).shop?.owned ?? []).toEqual([]);
  });

  it('facket har två platser; köpta förmågor behålls när de tas ur', () => {
    let s = player(1000, { stensota: 'brons', metodkoket: 'brons', maltidbiblioteket: 'brons' });
    s = reducer(s, { type: 'SHOP_BUY', id: 'sommBottle' });
    s = reducer(s, { type: 'SHOP_BUY', id: 'fastPass' });
    s = reducer(s, { type: 'SHOP_BUY', id: 'menuStory' });
    expect(slotCount(s)).toBe(SHOP.slots);
    expect(s.shop?.slot).toEqual(['sommBottle', 'fastPass']);
    s = reducer(s, { type: 'SHOP_SLOT', id: 'sommBottle', on: false });
    s = reducer(s, { type: 'SHOP_SLOT', id: 'menuStory', on: true });
    expect(s.shop?.slot).toEqual(['fastPass', 'menuStory']);
    expect(s.shop?.owned).toContain('sommBottle');
  });

  it('vid stjärnan (guld i Teatern) har facket fler platser', () => {
    expect(slotCount(player(0, { gastronomiskateatern: 'guld' }))).toBe(SHOP.slotsAtStar);
  });

  it('mise en place-rutinen ger förberedelsen fler minuter', () => {
    const s = player(0, {});
    const withMise: SimulationState = { ...s, shop: { owned: ['mise'], slot: ['mise'] } };
    expect(misePlan(withMise).capacityMin).toBe(misePlan(s).capacityMin + SHOP.effects.miseExtraMin);
    expect(MISE_EN_PLACE.minutesPerStaff).toBeGreaterThan(0);
  });

  it('en ny säsong behåller det köpta', () => {
    const s: SimulationState = { ...player(0, {}), shop: { owned: ['sommBottle'], slot: ['sommBottle'] } };
    expect(reducer(s, { type: 'RESTART_SEASON' }).shop).toEqual({ owned: ['sommBottle'], slot: ['sommBottle'] });
  });
});

describe('ORDER 296 — bandet i byn', () => {
  it('andelen som har kommit växer från noll till ett över fönstret', () => {
    expect(arrivedShare(VILLAGE.arriveFromMinute)).toBe(0);
    expect(arrivedShare(VILLAGE.arriveUntilMinute)).toBe(1);
    const mid = (VILLAGE.arriveFromMinute + VILLAGE.arriveUntilMinute) / 2;
    expect(arrivedShare(mid)).toBeCloseTo(VILLAGE.arrivePeakShare);
  });

  it('vår plats räknas mot rivalerna, food truckarna med', () => {
    const rows = [
      { id: 'player', kind: 'player' as const, guests: 10 },
      { id: 'torgkrogen', kind: 'restaurant' as const, guests: 12 },
      { id: 'grillvagnen', kind: 'truck' as const, guests: 11 },
      { id: 'pizzeria-grytan', kind: 'restaurant' as const, guests: 4 }
    ];
    expect(villageRank(rows)).toBe(3);
  });

  it('bandet visar krogarna som har öppet i kväll', () => {
    const s = player(0, {});
    const rows = villageLive(s);
    expect(rows.some((r) => r.id === 'player')).toBe(true);
    expect(rows.every((r) => r.guests >= 0)).toBe(true);
  });
});

describe('ORDER 296 — recensenten', () => {
  it('gott rykte drar henne alltid; annars ibland', () => {
    const s = player(0, {});
    expect(reviewerComes({ ...s, reputation: EVENTS.reviewerReputationAtLeast / REPUTATION.scale })).toBe(true);
    const days = Array.from({ length: 200 }, (_, i) => reviewerComes({ ...s, reputation: 0.45, day: { ...s.day, dayNumber: i + 1 } }));
    const share = days.filter(Boolean).length / days.length;
    const want = EVENTS.reviewerChanceBase + EVENTS.reviewerChancePerReputation * 0.45;
    expect(share).toBeGreaterThan(want / 2);
    expect(share).toBeLessThan(want * 2);
  });
});
