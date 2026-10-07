// ORDER 318 (Anders 2026-10-07, provspelet: kassan nådde −5 409 kr i vecka 1)
// — lagret per vara med hur länge det räcker och när det går ut, Inköp i dag
// bara dagens inköp, svinnet efter hållbarheten (oöppnade flaskor aldrig,
// öppnade efter ett par dagar), Bankens varning före stängningen och vad som
// drog ned kvällen.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { dishShelfEvenings, wasteAtDayEnd } from '../../strategic/simulation/stockPackages';
import { morningRows } from '../../strategic/simulation/morningBuy';
import { eveningDrags } from '../../strategic/simulation/eveningResult';
import { bankBelowZeroWarning } from '../../strategic/economy/BankDialog';
import { noteGlasses, syncLots } from '../shelfLife';
import { firstDayOfWeek } from '../calendar';
import { WASTE } from '../balance';
import { TABLE, pickLang, t as tt } from '../../content/nexusStrings';
import { setLanguage } from '../../content/language';
import type { SimulationState } from '../../strategic/types';

function morning(): SimulationState {
  const s = makeNewGameState(5);
  return { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 1 } };
}

describe('ORDER 318 — lagret per vara', () => {
  it('ett inköp blir ett parti med sista kvällen efter huvudråvaran', () => {
    const s = reducer(morning(), { type: 'BUY_ITEMS', items: { 'chicken-plate': 5 } });
    const day = s.day.dayNumber;
    expect(dishShelfEvenings('chicken-plate')).toBe(WASTE.shelfEvenings.chicken);
    // ORDER 318b — Anders beslut om F66.
    expect(['fish-plate', 'chicken-plate', 'pork-plate', 'dairy-dessert', 'lingon-sorbet', 'chanterelle-toast'].map(dishShelfEvenings)).toEqual([1, 2, 3, 2, 14, 2]);
    expect(WASTE.shelfEvenings['root-veg']).toBe(7);
    expect([dishShelfEvenings('root-soup'), dishShelfEvenings('lentil-plate')].every((n) => n >= 2 && n <= 3)).toBe(true);
    expect(s.dishLots!['chicken-plate']).toEqual([{ portions: 5, bought: day, lastEvening: day + WASTE.shelfEvenings.chicken - 1 }]);
    const row = morningRows(s).dishes.find((r) => r.dishId === 'chicken-plate')!;
    expect(row.today).toBe(5);
    expect(row.portions).toBe(5);
    expect(row.expiresInDays).toBe(WASTE.shelfEvenings.chicken - 1);
    expect(row.evenings).not.toBeNull();
  });

  it('Inköp i dag är bara dagens inköp; gårdagens lager går inte att lämna tillbaka', () => {
    let s = reducer(morning(), { type: 'BUY_ITEMS', items: { 'pork-plate': 5 } });
    // Nästa morgon: portionerna står kvar, men inget är köpt i dag.
    s = { ...s, day: { ...s.day, dayNumber: s.day.dayNumber + 1, boughtToday: {} } };
    const row = morningRows(s).dishes.find((r) => r.dishId === 'pork-plate')!;
    expect(row.portions).toBe(5);
    expect(row.today).toBe(0);
    const back = reducer(s, { type: 'RETURN_ITEMS', items: { 'pork-plate': 5 } });
    expect(back.dishPortions!['pork-plate']).toBe(5);
    expect(back.cash).toBe(s.cash);
  });
});

describe('ORDER 318 — svinnet efter hållbarheten', () => {
  it('kycklingen blir svinn efter sin sista kväll, fläsket står kvar', () => {
    const s = reducer(morning(), { type: 'BUY_ITEMS', items: { 'chicken-plate': 5, 'pork-plate': 5 } });
    expect(wasteAtDayEnd(s).dishPortions!['chicken-plate']).toBe(5);
    const later = { ...s, day: { ...s.day, dayNumber: s.day.dayNumber + WASTE.shelfEvenings.chicken - 1 } };
    const { waste, dishPortions, dishLots } = wasteAtDayEnd(later);
    expect(dishPortions!['chicken-plate'] ?? 0).toBe(0);
    expect(dishPortions!['pork-plate']).toBe(5);
    expect(dishLots!['pork-plate'][0].portions).toBe(5);
    // Rätten med flest förlorade portioner läggs undan till morgonens fråga (ORDER 285).
    expect(waste!.units + (waste!.aside?.portions ?? 0)).toBe(5);
  });

  it('det som har passerat sin sista kväll blir svinn, det nyare står kvar', () => {
    const s0 = morning();
    const day = s0.day.dayNumber;
    const s = reducer(s0, { type: 'BUY_ITEMS', items: { 'pork-plate': 10 } });
    const old = { ...s, dishLots: { 'pork-plate': [{ portions: 4, bought: day - 2, lastEvening: day }, { portions: 6, bought: day, lastEvening: day + 2 }] } };
    const { dishPortions } = wasteAtDayEnd(old);
    expect(dishPortions!['pork-plate']).toBe(6);
  });

  it('oöppnade flaskor blir aldrig svinn; en öppnad efter openBottleEvenings kvällar', () => {
    const s = reducer(morning(), { type: 'BUY_ITEMS', items: { 'house-wine-glass': 10 } });
    const day = s.day.dayNumber;
    const later = { ...s, day: { ...s.day, dayNumber: day + 20 } };
    expect(wasteAtDayEnd(later).stock['house-wine']).toBe(10);
    // En flaska öppnad för openBottleEvenings kvällar sedan, två glas kvar i den.
    const opened = { ...s, stock: { ...s.stock, 'house-wine': 7 }, openBottles: { 'house-wine': { openedDay: day - WASTE.openBottleEvenings + 1 } } };
    const w = wasteAtDayEnd(opened);
    expect(w.stock['house-wine']).toBe(5);
    expect(w.waste!.openGlasses).toBe(2);
    expect(w.openBottles!['house-wine']).toBeUndefined();
    // Öppnad i går: står kvar.
    const fresh = { ...opened, openBottles: { 'house-wine': { openedDay: day - 1 } } };
    expect(wasteAtDayEnd(fresh).stock['house-wine']).toBe(7);
  });

  it('flaskan får sin dag när den öppnas', () => {
    expect(noteGlasses({}, 'w', 10, 9, 5, 3)).toEqual({ w: { openedDay: 3 } });
    expect(noteGlasses({ w: { openedDay: 3 } }, 'w', 9, 8, 5, 4)).toEqual({ w: { openedDay: 3 } });
    expect(noteGlasses({ w: { openedDay: 3 } }, 'w', 6, 5, 5, 4)).toEqual({});
    expect(noteGlasses({ w: { openedDay: 3 } }, 'w', 6, 4, 5, 4)).toEqual({ w: { openedDay: 4 } });
  });

  it('partierna följer portionsboken (sparade spel från före ordern)', () => {
    expect(syncLots(undefined, { a: 4 }, 7, () => 2)).toEqual({ a: [{ portions: 4, bought: 7, lastEvening: 8 }] });
    expect(syncLots({ a: [{ portions: 3, bought: 5, lastEvening: 6 }, { portions: 3, bought: 7, lastEvening: 8 }] }, { a: 4 }, 7, () => 2))
      .toEqual({ a: [{ portions: 1, bought: 5, lastEvening: 6 }, { portions: 3, bought: 7, lastEvening: 8 }] });
  });
});

describe('ORDER 318 — Bankens varning och vad som drog ned kvällen', () => {
  const withRisk = (below: number): SimulationState => {
    const s = morning();
    return { ...s, economy: { ...s.economy, businessClass: 'vinbar', risk: { missedInRow: 0, belowZeroInRow: below, renegotiated: false, closedWeek: null } } };
  };

  it('efter första och andra bokslutet under noll, med Anders meningar', () => {
    setLanguage('sv');
    expect(bankBelowZeroWarning(withRisk(0))).toBeNull();
    expect(bankBelowZeroWarning(withRisk(1))).toBe('Kassan är under noll. Två bokslut till i rad, så stänger krogen.');
    expect(bankBelowZeroWarning(withRisk(2))).toBe('Ett bokslut till under noll, så stänger vi.');
    expect(tt('en', 'risk.bank.oneLeft')).toBe('One more settlement below zero, and we close you down.');
    setLanguage('en');
  });

  it('svinn, fel svar och inköp, störst först', () => {
    let s = reducer(morning(), { type: 'BUY_ITEMS', items: { 'pork-plate': 10 } });
    const day = s.day.dayNumber;
    s = { ...s, lastWaste: { dayNumber: day, units: 4, sek: 300, feeSek: 450 } };
    s = { ...s, incidents: { ...(s.incidents ?? {}), log: [{ id: 'x', step: 0, optionId: 'a', quality: 'wrong', situation: null, context: { clock: null }, at: 1, deltas: { cashSek: -2000, reputation: 0, credits: -1, guestsIn: 0 } }] } as unknown as SimulationState['incidents'] };
    const drags = eveningDrags(s);
    expect(drags.map((d) => d.key)).toEqual(['wrong', 'waste', 'stock'].filter((k) => drags.some((d) => d.key === k)).sort((a, b) => drags.find((d) => d.key === b)!.sek - drags.find((d) => d.key === a)!.sek));
    expect(drags.find((d) => d.key === 'waste')!.sek).toBe(750);
    expect(drags.find((d) => d.key === 'wrong')!.detail.count).toBe(1);
    expect(drags.find((d) => d.key === 'stock')!.sek).toBeGreaterThan(0);
  });

  it('knappen Öppna dörrarna visar klockans tid', () => {
    expect(pickLang(TABLE, 'sv').morningBuy.openDoors('19.05')).toBe('Öppna dörrarna 19.05');
  });
});
