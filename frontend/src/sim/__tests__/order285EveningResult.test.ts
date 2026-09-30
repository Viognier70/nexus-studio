// ORDER 285 — kvällens resultat och gårdagens rester (Vision Owner
// 2026-09-29, tredje provspelet).
// - Kvällens resultat: åtta rader som läser samma källor som kvällen i
//   övrigt (kvällsavräkningen, lärdomens rutnät, kapitalen mot gryningen).
// - Svinnet går att använda nästa dag: den rätt med flest förlorade
//   portioner läggs undan, och morgonens fråga avgör.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { settleWaste } from '../../strategic/simulation/stockPackages';
import { SALVAGE_BEST, salvageGroup } from '../../strategic/simulation/salvage';
import { eveningResult } from '../../strategic/simulation/eveningResult';
import { eveningGrid, stepsCleared } from '../../strategic/ui/service/serviceView';
import { SALVAGE } from '../balance';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function monday(seed = 3): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
}

// Tio kycklingrätter köpta, inga sålda, sopbilen kommer.
function leftovers(): SimulationState {
  let s = reducer(monday(), { type: 'BUY_ITEMS', items: { 'chicken-plate': 10, 'house-wine-glass': 5 } });
  s = reducer(s, { type: 'START_SERVICE' });
  const d: SimulationState = { ...s, day: { ...s.day, wasteSettled: false } };
  settleWaste(d);
  return d;
}

function nextMorning(s: SimulationState): SimulationState {
  return { ...s, day: { ...s.day, period: 'morning', dayNumber: s.day.dayNumber + 1, wasteSettled: false } };
}

describe('ORDER 285 — gårdagens rester', () => {
  it('rätten med flest förlorade portioner läggs undan, utanför sopbilens kilo', () => {
    const d = leftovers();
    expect(d.salvage).toMatchObject({ dishId: 'chicken-plate', resolved: null });
    expect(d.salvage!.portions).toBeGreaterThanOrEqual(SALVAGE.minPortions);
    expect(d.lastWaste!.aside).toEqual({ dishId: 'chicken-plate', portions: d.salvage!.portions });
    // Portionerna står inte i portionsboken, men deras råvaror står kvar.
    const kept = d.dishPortions?.['chicken-plate'] ?? 0;
    expect(d.stock.chicken).toBe(kept + d.salvage!.portions);
  });

  it('rätt svar: portionerna går att sälja och den ekologiska stiger', () => {
    const d = nextMorning(leftovers());
    const n = d.salvage!.portions;
    const before = d.dishPortions?.['chicken-plate'] ?? 0;
    const eco = d.capitals.values.ecological;
    const s = reducer(d, { type: 'ANSWER_SALVAGE', optionId: SALVAGE_BEST[salvageGroup('chicken-plate')!] });
    expect(s.salvage!.resolved).toBe('right');
    expect(s.dishPortions!['chicken-plate']).toBe(before + n);
    expect(s.capitals.values.ecological).toBeCloseTo(eco + SALVAGE.ecologicalPerPortion * n, 6);
    expect(s.cash).toBe(d.cash);
    // Ett svar till ändrar ingenting.
    expect(reducer(s, { type: 'ANSWER_SALVAGE', optionId: 'a' })).toBe(s);
  });

  it('fel svar: sopbilen tar resterna, kassan betalar kilona', () => {
    const d = nextMorning(leftovers());
    const n = d.salvage!.portions;
    const wrong = ['a', 'b', 'c'].find((o) => o !== SALVAGE_BEST[salvageGroup('chicken-plate')!])!;
    const s = reducer(d, { type: 'ANSWER_SALVAGE', optionId: wrong });
    expect(s.salvage!.resolved).toBe('wrong');
    expect(s.salvage!.feeSek).toBeGreaterThan(0);
    expect(s.cash).toBe(d.cash - s.salvage!.feeSek!);
    expect(s.stock.chicken ?? 0).toBe((d.stock.chicken ?? 0) - n);
    expect(s.capitals.values.ecological).toBeLessThan(d.capitals.values.ecological);
  });

  it('inget svar före öppning: resterna går till sopbilen', () => {
    let d = nextMorning(leftovers());
    d = reducer(d, { type: 'BUY_ITEMS', items: { 'root-soup': 5, 'house-wine-glass': 5 } });
    const s = reducer(d, { type: 'START_SERVICE' });
    expect(s.day.period).toBe('dinner');
    expect(s.salvage!.resolved).toBe('discarded');
    expect(s.cash).toBeLessThan(d.cash);
  });
});

describe('ORDER 285 — kvällens resultat', () => {
  it('åtta rader ur kvällens egna källor', () => {
    let s = reducer(monday(5), { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) s = reducer(s, TICK);
    expect(s.day.period).toBe('evening');
    const rows = eveningResult(s);
    expect(rows.map((r) => r.key)).toEqual(['money', 'credits', 'reputation', 'knowledge', 'experience', 'social', 'economic', 'ecological']);
    // ORDER 291 — Pengar är samma resultat som skärmen efter servicen
    // (day.transfer), och intäkten dess försäljning.
    const tr = s.day.transfer!;
    expect(rows[0].delta).toBe(tr.resultSek);
    expect(rows[0].detail.revenue).toBe(tr.revenueSek);
    const { cleared, total } = stepsCleared(eveningGrid(s));
    expect(rows[3].detail).toEqual({ cleared, total });
    // ORDER 291 — erfarenheten räknar serverade gäster (kvällens notor).
    expect(rows[4].detail.served).toBe(s.day.billsTonight ?? 0);
  });
});
