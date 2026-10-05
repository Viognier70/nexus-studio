// ORDER 278 — servicen syns (Vision Owner 2026-09-28, andra provspelet):
// strömmen visar beställningar, betalningar, dricks och slumpens
// händelser; lagret syns; det som tar slut ger missnöjda gäster; svinnet
// räknas efter kvällen, en del sparas och resten hämtas av sopbilen mot en
// miljöavgift.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeGuest, makeNewGameState } from '../../strategic/simulation/model';
import { minIngredientCost } from '../../strategic/simulation/m4Catalogue';
import { orderForGuest, profileFor, tipShare } from '../../strategic/simulation/guestOrders';
import { wasteAtDayEnd } from '../../strategic/simulation/stockPackages';
import { maybeChance, planChance } from '../serviceChance';
import { firstDayOfWeek } from '../calendar';
import { SERVICE_STREAM, WASTE } from '../balance';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;
const SEED = 5;

function morning(seed = SEED): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } };
}

function open(items: Record<string, number> | 'base', seed = SEED): SimulationState {
  let s = morning(seed);
  s = items === 'base' ? reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' }) : reducer(s, { type: 'BUY_ITEMS', items });
  return reducer(s, { type: 'START_SERVICE' });
}

// Spelar kvällen och samlar strömmens rader (strömmen har ett tak, så de
// samlas medan kvällen går).
function playEvening(s: SimulationState): { s: SimulationState; kinds: Map<string, number>; texts: string[] } {
  const kinds = new Map<string, number>();
  const texts: string[] = [];
  let seen = s.eventStream.length ? s.eventStream[s.eventStream.length - 1] : null;
  for (let i = 0; i < 30000 && s.day.period === 'dinner'; i++) {
    if (s.incidents?.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    s = reducer(s, TICK);
    const idx = seen ? s.eventStream.lastIndexOf(seen) : -1;
    for (const e of s.eventStream.slice(idx + 1)) { kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1); texts.push(e.text); }
    seen = s.eventStream.at(-1) ?? seen;
  }
  return { s, kinds, texts };
}

describe('ORDER 278 — strömmen i stunden', () => {
  it('beställningen läggs vid bordet och betalningen tickar in, med dricks', () => {
    const { s, kinds } = playEvening(open('base'));
    expect(kinds.get('guest_ordered') ?? 0).toBeGreaterThan(5);
    expect(kinds.get('guest_paid') ?? 0).toBeGreaterThan(5);
    expect(s.day.tipsSek ?? 0).toBeGreaterThan(0);
  });

  it('dricksen följer nöjdheten', () => {
    const [high, mid, low] = SERVICE_STREAM.tipBands;
    expect(tipShare(1)).toBe(high.share);
    expect(tipShare(mid.minSatisfaction)).toBe(mid.share);
    expect(tipShare(low.minSatisfaction)).toBe(low.share);
    expect(tipShare(0)).toBe(0);
    expect(high.share).toBeGreaterThan(mid.share);
  });

  it('slumpens händelser: mellan min och max per kväll, och de står i strömmen', () => {
    const s = open('base');
    expect(s.day.chanceTimes!.length).toBeGreaterThanOrEqual(SERVICE_STREAM.chanceMin);
    expect(s.day.chanceTimes!.length).toBeLessThanOrEqual(SERVICE_STREAM.chanceMax);
    const { kinds } = playEvening(s);
    const chance = [...kinds.entries()].filter(([k]) => k.startsWith('chance_')).reduce((a, [, n]) => a + n, 0);
    expect(chance).toBeGreaterThanOrEqual(1);
  });

  it('ett glas som välter tar ett glas ur lagret', () => {
    let s = open({ 'chicken-plate': 4, 'house-wine-glass': 6 });
    s = { ...s, day: { ...s.day, chanceTimes: [s.simTime] } };
    const before = s.day.platesRemaining['house-wine-glass'];
    // Dra tills glaset välter (vikten avgör vilken händelse som kommer).
    for (let seed = 0; seed < 200; seed++) {
      const draft = structuredClone({ ...s, rngState: seed + 1 });
      maybeChance(draft);
      if (draft.eventStream.at(-1)?.kind === 'chance_glassBroken') {
        expect(draft.day.platesRemaining['house-wine-glass']).toBe(before - SERVICE_STREAM.chance.glassBroken.glasses);
        expect(draft.day.chanceTimes).toEqual([]);
        return;
      }
    }
    throw new Error('glaset välte aldrig');
  });

  it('planChance lägger tiderna inom kvällen', () => {
    const s = planChance(morning(), 100, 700);
    for (const t of s.day.chanceTimes!) { expect(t).toBeGreaterThan(100); expect(t).toBeLessThan(700); }
  });
});

describe('ORDER 278 — det som tar slut ger missnöjda gäster', () => {
  it('gästen som ville ha en rätt som tagit slut får en annan och blir missnöjd', () => {
    // Lammet är slut (noll kvar på menyn), kycklingen finns. ORDER 307 — förut
    // fisken, som nu kommer från fiskaren.
    let s = open({ 'lamb-plate': 1, 'chicken-plate': 6, 'house-wine-glass': 6 });
    s = { ...s, day: { ...s.day, platesRemaining: { ...s.day.platesRemaining, 'lamb-plate': 0 } } };
    for (let i = 0; i < 400; i++) {
      const g = { ...makeGuest(0), state: 'dining' as const, seatIndex: 2 };
      const p = profileFor(SEED, g);
      if (p.diet !== 'any' || p.allergy || p.wallet !== 'generous') continue;
      const draft = structuredClone(s);
      const before = g.satisfaction;
      // Högsta slumpen väljer den dyraste rätten för en generös plånbok: lammet.
      const order = orderForGuest(draft, g, () => 0.999);
      if (order.kind === 'served' && order.dishId === 'chicken-plate' && draft.eventStream.some((e) => e.kind === 'guest_substituted')) {
        expect(g.satisfaction).toBeCloseTo(before + SERVICE_STREAM.soldOutSatisfaction, 9);
        return;
      }
    }
    throw new Error('ingen gäst ville ha lammet');
  });
});

describe('ORDER 278 — svinnet efter kvällen', () => {
  // ORDER 280 — Designs kg-taxa (S1): kilo i fyra fraktioner × taxan +
  // hämtningen. Svinnets värde visas men dras inte igen.
  it('en del sparas till nästa dag, resten kostar miljöavgift efter kilona', () => {
    const s = { ...morning(), stock: { chicken: 4, herbs: 3, 'house-wine': 5 } };
    const { stock, waste } = wasteAtDayEnd(s);
    expect(stock.chicken).toBe(Math.floor(4 * (WASTE.carryShare.chicken ?? 0)));
    expect(stock.herbs ?? 0).toBe(0);
    expect(stock['house-wine']).toBe(5);
    const lostChicken = 4 - stock.chicken;
    const units = lostChicken + 3;
    const value = lostChicken * minIngredientCost('chicken') + 3 * minIngredientCost('herbs');
    const kg = lostChicken * WASTE.kgPerUnit.portion + 3 * WASTE.kgPerUnit.pinch;
    expect(waste).toMatchObject({ units, kept: stock.chicken, sek: Math.round(value) });
    expect(waste!.fractions.map((f) => f.key)).toEqual(['unsold', 'plates', 'glass', 'cardboard']);
    expect(waste!.feeSek).toBe(Math.round(kg * WASTE.feePerKg + WASTE.pickupFeeSek));
    // Mer svinn ger högre avgift; tallrikar, flaskor och kartong räknas med.
    const busy = wasteAtDayEnd({ ...s, day: { ...s.day, portionsServed: 90, bottleGlassesPoured: 20, stockBoughtToday: true } }).waste!;
    const kgBusy = kg + Math.max(WASTE.plateKgMin, 90 * WASTE.plateKgPerServed) + 4 * WASTE.kgPerBottle + WASTE.cardboardKg;
    expect(busy.feeSek).toBe(Math.round(kgBusy * WASTE.feePerKg + WASTE.pickupFeeSek));
  });

  // ORDER 280 — sopbilen kommer när servicen stänger.
  it('när servicen stänger dras avgiften ur kassan med en rad i kassaboken', () => {
    const { s } = playEvening(open({ 'chicken-plate': 30, 'pork-plate': 20, 'house-wine-glass': 10 }));
    expect(s.day.wasteSettled).toBe(true);
    expect(s.lastWaste?.feeSek ?? 0).toBeGreaterThan(0);
    expect(s.ledger.some((l) => l.category === 'waste' && l.amount === -(s.lastWaste!.feeSek ?? 0))).toBe(true);
    expect((s.lastWaste?.kept ?? 0)).toBeGreaterThan(0);
  });
});
