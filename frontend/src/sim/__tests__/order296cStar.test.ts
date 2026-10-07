// ORDER 296c — stjärnan (Vision Owner 2026-10-02): guld i Gastronomiska
// Teatern, högt rykte och gott serviceomdöme två veckor i rad; delas ut i
// söndagstidningen, förloras efter en vecka under nivån, ger facket en tredje
// plats. Gränserna i balance.ts STAR.

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../strategic/simulation/model';
import { settleWeek } from '../economy';
import { newspaperFor } from '../newspaper';
import { slotCount } from '../shop';
import { firstDayOfWeek } from '../calendar';
import { ECONOMY, SHOP, STAR } from '../balance';
import type { EveningRecord } from '../economy';
import type { SimulationState } from '../../strategic/types';

function week(s: SimulationState, rep: number, fired: number, cleared: number): SimulationState {
  const ev: EveningRecord = { dayNumber: s.day.dayNumber, revenueSek: 0, reputationDelta: 0, guests: 0, marketCap: 0, gaveUp: 0, rockets: { fired, cleared } };
  return settleWeek({ ...s, reputation: rep, economy: { ...s.economy, weekEvenings: [ev] } });
}

// ORDER 315a — stjärnan delas bara ut i bistron (sim/ladderStep.ts starsPossible).
function base(): SimulationState {
  const s = makeNewGameState(296);
  return { ...s, ladder: { step: 'bistro', reachedOnDay: {}, offer: null }, cash: 100000, medals: { gastronomiskateatern: 'guld' }, economy: { ...s.economy, businessClass: 'vinbar', loan: { originalSek: ECONOMY.normalWeeklyRevenueSek.vinbar * 2, principalSek: ECONOMY.normalWeeklyRevenueSek.vinbar * 2, weeksLeft: 8 } }, day: { ...s.day, dayNumber: firstDayOfWeek(3) } };
}

describe('ORDER 296c — stjärnan', () => {
  // ORDER 296e — tre veckor i rad (STAR.weeksToEarn).
  it('STAR.weeksToEarn veckor i rad på nivån ger stjärnan och en tredje plats i facket', () => {
    let s = base();
    expect(slotCount(s)).toBe(SHOP.slots);
    for (let i = 0; i < STAR.weeksToEarn - 1; i++) {
      s = week(s, STAR.reputationAtLeast, STAR.minRocketsInWeek, STAR.minRocketsInWeek);
      expect(s.star?.held).toBe(false);
    }
    s = week(s, STAR.reputationAtLeast, STAR.minRocketsInWeek, STAR.minRocketsInWeek);
    expect(s.star?.held).toBe(true);
    expect(s.economy.lastSettlement?.star?.earnedNow).toBe(true);
    expect(slotCount(s)).toBe(SHOP.slotsAtStar);
    expect(newspaperFor(s, 'Vinbaren', [], () => null)?.sections.some((x) => x.id === 'star')).toBe(true);
  });

  it('en vecka under nivån tar stjärnan', () => {
    let s = base();
    for (let i = 0; i < STAR.weeksToEarn; i++) s = week(s, 0.9, 10, 10);
    expect(s.star?.held).toBe(true);
    s = week(s, 0.9, 10, Math.floor(10 * STAR.judgementAtLeast) - 1);
    expect(s.star?.held).toBe(false);
    expect(s.economy.lastSettlement?.star?.lostNow).toBe(true);
    expect(slotCount(s)).toBe(SHOP.slots);
  });

  it('utan guld i Teatern, eller med för lågt rykte, ingen stjärna', () => {
    let s: SimulationState = { ...base(), medals: { gastronomiskateatern: 'silver' } };
    for (let i = 0; i < STAR.weeksToEarn; i++) s = week(s, 0.9, 10, 10);
    expect(s.star?.held).toBe(false);
    let t = base();
    for (let i = 0; i < STAR.weeksToEarn; i++) t = week(t, STAR.reputationAtLeast - 0.01, 10, 10);
    expect(t.star?.held).toBe(false);
  });
});
