// ORDER 296 (kärnan punkt 2 och 5, Vision Owner 2026-10-02): risken och
// mise en place efter inköpen. Talen står i balance.ts RISK och
// MISE_EN_PLACE; säsongens utfall mäts i order296Karnan.test.ts.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { dailyInterestSek, isClosed, settleWeek, weeklyTargetSek } from '../economy';
import { applyMiseAtDoors, misePlan } from '../miseEnPlace';
import { firstDayOfWeek } from '../calendar';
import { ECONOMY, MISE_EN_PLACE, RISK } from '../balance';
import type { SimulationState } from '../../strategic/types';

function vinbar(cash: number): SimulationState {
  const s = makeNewGameState(296);
  const loan = { originalSek: ECONOMY.normalWeeklyRevenueSek.vinbar * 2, principalSek: ECONOMY.normalWeeklyRevenueSek.vinbar * 2, weeksLeft: 8 };
  return { ...s, cash, economy: { ...s.economy, businessClass: 'vinbar', loan }, day: { ...s.day, dayNumber: firstDayOfWeek(3) } };
}

// En vecka med den här intäkten (state.revenue mot veckans start).
function week(s: SimulationState, revenueSek: number, cash: number): SimulationState {
  return settleWeek({ ...s, cash, revenue: s.economy.weekRevenueStartSek + revenueSek });
}

describe('ORDER 296 — risken', () => {
  it('startkassan är RISK.startCashSek', () => {
    expect(makeNewGameState(1).cash).toBe(RISK.startCashSek);
  });

  it('bara ränta under säsongen: ingen amortering', () => {
    const s = week(vinbar(RISK.startCashSek), weeklyTargetSek('vinbar'), RISK.startCashSek);
    expect(s.economy.lastSettlement?.amortisationSek).toBe(0);
    expect(s.economy.loan?.principalSek).toBe(ECONOMY.normalWeeklyRevenueSek.vinbar * 2);
  });

  it('veckomålet: två missade veckor i rad omförhandlar lånet, och räntan blir dubbel', () => {
    let s = vinbar(RISK.startCashSek);
    const before = dailyInterestSek(s.economy.loan);
    const short = weeklyTargetSek('vinbar') - 1;
    s = week(s, short, RISK.startCashSek);
    expect(s.economy.lastSettlement?.targetHit).toBe(false);
    expect(s.economy.risk?.renegotiated).toBe(false);
    s = week(s, short, RISK.startCashSek);
    expect(s.economy.lastSettlement?.renegotiatedNow).toBe(true);
    expect(dailyInterestSek(s.economy.loan)).toBeCloseTo(before * RISK.renegotiatedInterestFactor);
  });

  it('ett nått mål bryter raden', () => {
    let s = vinbar(RISK.startCashSek);
    s = week(s, 0, RISK.startCashSek);
    s = week(s, weeklyTargetSek('vinbar'), RISK.startCashSek);
    s = week(s, 0, RISK.startCashSek);
    expect(s.economy.risk?.renegotiated).toBe(false);
  });

  it('kassan under noll vid tre avräkningar i rad stänger krogen; servicen öppnar inte', () => {
    let s = vinbar(-1);
    for (let i = 0; i < RISK.closeAfterWeeksBelowZero - 1; i++) {
      s = week(s, 0, -1);
      expect(isClosed(s)).toBe(false);
    }
    s = week(s, 0, -1);
    expect(s.economy.lastSettlement?.closedNow).toBe(true);
    expect(isClosed(s)).toBe(true);
    const opened = reducer({ ...s, day: { ...s.day, period: 'morning' } }, { type: 'START_SERVICE' });
    expect(opened.day.period).toBe('morning');
  });

  it('en ny säsong efter stängningen behåller medaljerna', () => {
    const closed: SimulationState = { ...vinbar(-1), medals: { stensota: 'silver' } };
    const again = reducer(closed, { type: 'RESTART_SEASON' });
    expect(again.medals).toEqual({ stensota: 'silver' });
    expect(again.cash).toBe(RISK.startCashSek);
    expect(isClosed(again)).toBe(false);
  });
});

describe('ORDER 296 — mise en place efter inköpen', () => {
  it('behovet är portioner och bokade gäster; personalen hinner sina minuter', () => {
    const s = { ...vinbar(RISK.startCashSek), day: { ...vinbar(RISK.startCashSek).day, period: 'morning' as const } };
    const p = misePlan(s);
    expect(p.needMin).toBe(p.portions * MISE_EN_PLACE.perPortionMin + p.booked * MISE_EN_PLACE.perBookedGuestMin);
    expect(p.capacityMin).toBe(s.team.members.filter((m) => !m.isAgency).length * MISE_EN_PLACE.minutesPerStaff);
  });

  it('den extra handen kostar och ger fler minuter', () => {
    const s = { ...vinbar(RISK.startCashSek), day: { ...vinbar(RISK.startCashSek).day, period: 'morning' as const } };
    const h = reducer(s, { type: 'HIRE_PREP_HAND' });
    expect(h.cash).toBe(s.cash - MISE_EN_PLACE.extraHandCostSek);
    expect(misePlan(h).capacityMin).toBe(misePlan(s).capacityMin + MISE_EN_PLACE.extraHandMin);
    expect(reducer(h, { type: 'HIRE_PREP_HAND' }).cash).toBe(h.cash);
  });

  it('det som inte hinns sänker mise en place och står kvar som eftersläp', () => {
    const s = vinbar(RISK.startCashSek);
    const crowded: SimulationState = { ...s, day: { ...s.day, booking: { dayNumber: s.day.dayNumber, counts: { student: 0, middle: 200, high: 0 }, social: null, walkIns: 0, total: 200, billionaireInTown: false, billionaire: false } } };
    const out = applyMiseAtDoors(crowded, { garnish: 1 });
    expect(crowded.day.prepBacklogMin).toBeGreaterThan(0);
    expect(out.garnish).toBeLessThan(1);
  });
});
