// ORDER 275 — lagret är insatsen (Vision Owner 2026-09-28, provspel).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { findDish } from '../../strategic/simulation/m4Catalogue';
import { packageCostSek, packageIngredients, packagesFor } from '../../strategic/simulation/packages';
import { firstDayOfWeek } from '../calendar';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;
const BASE = packagesFor('vinbar')!.base;

function morning(seed = 5): SimulationState {
  let s = makeNewGameState(seed);
  return { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
}

function playService(s: SimulationState): SimulationState {
  s = reducer(s, { type: 'START_SERVICE' });
  for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
    const a = s.incidents?.active;
    if (a) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    s = reducer(s, TICK);
  }
  return s;
}

describe('ORDER 275 — paketen', () => {
  it('vinbaren har ett baspaket med rätter och drycker, och tillköp av viner och rätter', () => {
    const p = packagesFor('vinbar')!;
    const kinds = (ids: string[]) => ids.map((id) => findDish(id)?.kind ?? 'dish');
    expect(kinds(BASE.items.map((i) => i.dishId))).toEqual(expect.arrayContaining(['dish', 'drink']));
    const addOnKinds = p.addOns.flatMap((a) => kinds(a.items.map((i) => i.dishId)));
    expect(addOnKinds).toEqual(expect.arrayContaining(['dish', 'drink']));
    expect(p.addOns.some((a) => a.items.some((i) => i.dishId.includes('wine')))).toBe(true);
    expect(packagesFor('foodtruck')).toBeNull();
  });

  it('ett paket är en samling ingredienser via recepten, och priset är deras kostnad', () => {
    const ing = packageIngredients(BASE);
    expect(ing.chicken).toBe(10);
    expect(ing['house-wine']).toBe(30);
    expect(packageCostSek(BASE)).toBeGreaterThan(0);
  });
});

describe('ORDER 275 — köpet', () => {
  it('kassan sjunker direkt, lagret fylls och menyn är det som finns i lagret', () => {
    const s = morning();
    const after = reducer(s, { type: 'BUY_PACKAGE', packageId: BASE.id });
    expect(after.cash).toBe(s.cash - packageCostSek(BASE));
    expect(after.ledger.at(-1)).toMatchObject({ category: 'stock', amount: -packageCostSek(BASE), causeId: BASE.id });
    expect(after.stock.chicken).toBe((s.stock.chicken ?? 0) + 10);
    expect(after.menu.map((m) => m.dishId)).toEqual(expect.arrayContaining(['chicken-plate', 'house-wine-glass']));
    expect(after.packagesBoughtToday).toEqual([BASE.id]);
  });

  it('paket köps bara på morgonen', () => {
    const s = reducer(morning(), { type: 'START_SERVICE' });
    expect(reducer(s, { type: 'BUY_PACKAGE', packageId: BASE.id })).toBe(s);
  });

  it('okänt paket eller en klass utan paket gör ingenting', () => {
    const s = morning();
    expect(reducer(s, { type: 'BUY_PACKAGE', packageId: 'nope' })).toBe(s);
  });
});

describe('ORDER 275 — servicen', () => {
  it('portionerna säljs ur lagret, med en dryck till rätten', () => {
    const bought = reducer(morning(), { type: 'BUY_PACKAGE', packageId: BASE.id });
    const s = playService(bought);
    expect(s.serviceRevenueToday.dinner).toBeGreaterThan(0);
    // Mat och dryck har gått ur lagret.
    expect(s.stock.chicken ?? 0).toBeLessThan(bought.stock.chicken);
    expect(s.stock['house-wine'] ?? 0).toBeLessThan(bought.stock['house-wine']);
  });

  it('utan lager finns inget att beställa: gästerna går utan att betala', () => {
    const s = playService(morning());
    expect(s.serviceRevenueToday.dinner).toBe(0);
    expect(s.ledger.filter((l) => l.category === 'revenue' && l.amount > 0)).toHaveLength(0);
  });
});

describe('ORDER 275 — svinnet', () => {
  it('osåld mat blir svinn vid dagens slut, drycken står sig', () => {
    let s = reducer(morning(), { type: 'BUY_PACKAGE', packageId: BASE.id });
    s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-extra-covers' });
    s = playService(s);
    const wineLeft = s.stock['house-wine'] ?? 0;
    const foodLeft = (s.stock.chicken ?? 0) + (s.stock.pork ?? 0) + (s.stock['root-veg'] ?? 0);
    expect(foodLeft).toBeGreaterThan(0);
    const next = reducer(s, { type: 'END_EVENING' });
    const nextDay = next.day.period === 'evening' ? next : next;
    let t = nextDay;
    for (let i = 0; i < 5000 && t.day.dayNumber === s.day.dayNumber; i++) t = reducer(t, TICK);
    expect(t.day.dayNumber).toBe(s.day.dayNumber + 1);
    expect(t.lastWaste).toMatchObject({ dayNumber: s.day.dayNumber });
    expect(t.lastWaste!.sek).toBeGreaterThan(0);
    expect((t.stock.chicken ?? 0) + (t.stock.pork ?? 0)).toBe(0);
    expect(t.stock['house-wine'] ?? 0).toBe(wineLeft);
    expect(t.packagesBoughtToday).toEqual([]);
    expect(t.eventStream.some((e) => e.kind === 'stock_waste')).toBe(true);
  });
});
