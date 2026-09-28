// ORDER 277 — morgonen är insatsen (Vision Owner 2026-09-28, andra
// provspelet): menyn och dryckeslistan och mängderna sätts innan servicen
// kan starta; gästerna har kost och plånbok, och ett saknat alternativ
// tappar försäljning och rykte, och ett sällskap kan lämna.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeGuest, makeNewGameState } from '../../strategic/simulation/model';
import { DISHES, dishAllergens, dishDiet, findDish } from '../../strategic/simulation/m4Catalogue';
import { itemsCostSek, orderSheetDishIds, packagesFor } from '../../strategic/simulation/packages';
import { stockReadiness } from '../../strategic/simulation/stockPackages';
import { orderForGuest, profileFor, suitsProfile, type GuestProfile } from '../../strategic/simulation/guestOrders';
import { firstDayOfWeek } from '../calendar';
import { GUESTS } from '../balance';
import type { Guest, SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;
const SEED = 5;

function morning(seed = SEED): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
}

// En gäst vars profil stämmer med `want` (sökt bland id:n i fröet).
// Med `partySize` får varje försök ett eget sällskap (plånboken är
// sällskapets).
function guestWith(seed: number, want: (p: GuestProfile) => boolean, party?: { id: string; size: number } | number): Guest {
  for (let i = 0; i < 5000; i++) {
    const p = typeof party === 'number' ? { id: `party-t${i}`, size: party } : party;
    const g = makeGuest(0, false, false, p);
    if (want(profileFor(seed, g))) return { ...g, state: 'paying', seatIndex: 4 };
  }
  throw new Error('ingen gäst med profilen');
}

// Ett läge mitt i servicen med det som köpts på morgonen.
function serviceWith(items: Record<string, number>): SimulationState {
  let s = reducer(morning(), { type: 'BUY_ITEMS', items });
  s = reducer(s, { type: 'START_SERVICE' });
  expect(s.day.period).toBe('dinner');
  return s;
}

describe('ORDER 277 — menyn och dryckeslistan', () => {
  it('kosten och allergenerna läses ur recepten', () => {
    expect(dishDiet('lentil-plate')).toBe('vegan');
    expect(dishDiet('lingon-sorbet')).toBe('vegan');
    expect(dishDiet('root-soup')).toBe('vegetarian');
    expect(dishDiet('chanterelle-toast')).toBe('vegetarian');
    expect(dishDiet('fish-plate')).toBe('fish');
    expect(dishDiet('chicken-plate')).toBe('meat');
    expect(dishAllergens('chanterelle-toast').sort()).toEqual(['gluten', 'lactose']);
    expect(dishAllergens('lentil-plate')).toEqual([]);
  });

  it('dryckeslistan har viner på glas och flaska, öl och alkoholfritt', () => {
    const drinks = orderSheetDishIds('vinbar').map((id) => findDish(id)!).filter((d) => d.kind === 'drink');
    expect(new Set(drinks.map((d) => d.drink))).toEqual(new Set(['wine-glass', 'wine-bottle', 'beer', 'alcohol-free']));
    const bottle = DISHES.find((d) => d.drink === 'wine-bottle')!;
    expect(bottle.recipe[0].units).toBe(bottle.glassesPerBottle);
    // Menyn har rätter före drycker.
    const sheet = orderSheetDishIds('vinbar');
    expect(findDish(sheet[0])!.kind).not.toBe('drink');
    expect(findDish(sheet.at(-1)!)!.kind).toBe('drink');
  });

  it('inköpslistan drar kassan direkt och fyller lagret och menyn', () => {
    const s = morning();
    const items = { 'chicken-plate': 4, 'house-wine-bottle': 2 };
    const after = reducer(s, { type: 'BUY_ITEMS', items });
    expect(after.cash).toBeCloseTo(s.cash - itemsCostSek(items), 6);
    expect(after.ledger.at(-1)).toMatchObject({ category: 'stock', amount: -itemsCostSek(items) });
    expect(after.stock.chicken).toBe((s.stock.chicken ?? 0) + 4);
    expect(after.stock['house-wine']).toBe((s.stock['house-wine'] ?? 0) + 10);
    expect(after.menu.map((m) => m.dishId).sort()).toEqual(['chicken-plate', 'house-wine-bottle', 'house-wine-glass'].sort());
  });

  it('inköpslistan gäller bara på morgonen och bara klassens artiklar', () => {
    const s = serviceWith({ 'chicken-plate': 2, 'beer-pairing': 2 });
    expect(reducer(s, { type: 'BUY_ITEMS', items: { 'chicken-plate': 2 } })).toBe(s);
    const m = morning();
    expect(reducer(m, { type: 'BUY_ITEMS', items: { 'no-such-dish': 3 } })).toBe(m);
  });
});

describe('ORDER 277 — servicen startar inte utan meny och dryckeslista', () => {
  it('utan lager, med bara mat eller bara dryck: ingen service', () => {
    const s = morning();
    expect(stockReadiness(s)).toMatchObject({ ready: false, dishes: 0, drinks: 0 });
    expect(reducer(s, { type: 'START_SERVICE' })).toBe(s);
    const food = reducer(s, { type: 'BUY_ITEMS', items: { 'chicken-plate': 2 } });
    expect(reducer(food, { type: 'START_SERVICE' })).toBe(food);
    const drink = reducer(s, { type: 'BUY_ITEMS', items: { 'beer-pairing': 2 } });
    expect(reducer(drink, { type: 'START_SERVICE' })).toBe(drink);
  });

  it('en rätt och en dryck räcker: mängden är spelarens sak', () => {
    const s = reducer(morning(), { type: 'BUY_ITEMS', items: { 'chicken-plate': 1, 'beer-pairing': 1 } });
    expect(stockReadiness(s).ready).toBe(true);
    expect(reducer(s, { type: 'START_SERVICE' }).day.period).toBe('dinner');
  });

  it('klasser utan paket spärras inte', () => {
    const s = { ...morning(), economy: { ...morning().economy, businessClass: 'restaurang' as const } };
    expect(stockReadiness(s).ready).toBe(true);
  });
});

describe('ORDER 277 — gästernas kost och plånbok', () => {
  it('profilen är densamma varje gång, och andelarna följer balance.ts', () => {
    const n = 20000;
    const count = { vegetarian: 0, vegan: 0, lactose: 0, gluten: 0, noAlcohol: 0, tight: 0, generous: 0 };
    for (let i = 0; i < n; i++) {
      const p = profileFor(SEED, { id: `gst-${i}`, partyId: undefined });
      expect(profileFor(SEED, { id: `gst-${i}`, partyId: undefined })).toEqual(p);
      if (p.diet !== 'any') count[p.diet]++;
      if (p.allergy) count[p.allergy]++;
      if (p.noAlcohol) count.noAlcohol++;
      if (p.wallet !== 'normal') count[p.wallet]++;
    }
    const near = (k: keyof typeof count, want: number) => expect(Math.abs(count[k] / n - want), k).toBeLessThan(0.01);
    near('vegetarian', GUESTS.dietShare.vegetarian);
    near('vegan', GUESTS.dietShare.vegan);
    near('lactose', GUESTS.allergyShare.lactose);
    near('gluten', GUESTS.allergyShare.gluten);
    near('noAlcohol', GUESTS.noAlcoholShare);
    near('tight', GUESTS.walletShare.tight);
    near('generous', GUESTS.walletShare.generous);
  });

  it('ett sällskap delar plånbok, och fröet ger andra gäster', () => {
    const a = profileFor(SEED, { id: 'gst-1', partyId: 'party-9' });
    const b = profileFor(SEED, { id: 'gst-2', partyId: 'party-9' });
    expect(a.wallet).toBe(b.wallet);
    const diets = (seed: number) => Array.from({ length: 200 }, (_, i) => profileFor(seed, { id: `gst-${i}` }).diet).join();
    expect(diets(1)).not.toBe(diets(2));
  });

  it('en vegan utan veganskt på menyn går utan att beställa, ryktet sjunker och en rad står i strömmen', () => {
    const s = serviceWith({ 'chicken-plate': 6, 'root-soup': 6, 'house-wine-glass': 6 });
    const g = guestWith(SEED, (p) => p.diet === 'vegan');
    s.guests.push(g);
    const rep = s.reputation;
    const order = orderForGuest(s, g, () => 0.99);
    expect(order).toMatchObject({ kind: 'lost', reason: 'vegan' });
    expect(s.reputation).toBeCloseTo(rep - GUESTS.missingOptionReputation, 9);
    expect(s.eventStream.at(-1)?.kind).toBe('guest_lost_sale');
  });

  it('en vegan med linserna på menyn beställer dem', () => {
    const s = serviceWith({ 'chicken-plate': 6, 'lentil-plate': 2, 'house-wine-glass': 6 });
    const g = guestWith(SEED, (p) => p.diet === 'vegan' && !p.noAlcohol && p.wallet !== 'tight');
    const order = orderForGuest(s, g, () => 0.3);
    expect(order).toMatchObject({ kind: 'served', dishId: 'lentil-plate' });
    expect(suitsProfile('lentil-plate', profileFor(SEED, g))).toBe(true);
  });

  it('ett sällskap kan lämna med gästen som inget hittade', () => {
    const s = serviceWith({ 'chicken-plate': 6, 'house-wine-glass': 6 });
    const party = { id: 'party-900', size: 3 };
    const g = guestWith(SEED, (p) => p.diet === 'vegetarian', party);
    const mates = [makeGuest(0, false, false, party), makeGuest(0, false, false, party)].map((m) => ({ ...m, state: 'dining' as const, seatIndex: 5 }));
    s.guests.push(g, ...mates);
    const order = orderForGuest(s, g, () => 0);
    expect(order).toMatchObject({ kind: 'lost', reason: 'vegetarian', partyLeft: 2 });
    expect(mates.every((m) => s.guests.find((x) => x.id === m.id)!.state === 'leaving')).toBe(true);
  });

  it('en snål plånbok utan rätt i prisklassen tar bara en dryck', () => {
    const s = serviceWith({ 'game-plate': 4, 'beer-pairing': 6 });
    const g = guestWith(SEED, (p) => p.wallet === 'tight' && !p.noAlcohol && p.diet === 'any' && p.allergy === null);
    const order = orderForGuest(s, g, () => 0.3);
    expect(order).toMatchObject({ kind: 'served', dishId: null, missing: 'wallet' });
    expect(order.kind === 'served' && order.drinks[0]).toBe('beer-pairing');
  });

  it('ett generöst sällskap tar en flaska, och bordet delar på den', () => {
    const s = serviceWith({ 'chicken-plate': 6, 'house-wine-glass': 6, 'house-wine-bottle': 2 });
    const g = guestWith(SEED, (p) => p.wallet === 'generous' && !p.noAlcohol && p.diet === 'any' && p.allergy === null, 2);
    const party = { id: g.partyId!, size: 2 };
    const first = orderForGuest(s, g, () => 0);
    expect(first.kind === 'served' && first.drinks).toEqual(['house-wine-bottle']);
    const mate = { ...makeGuest(0, false, false, party), state: 'paying' as const };
    const second = orderForGuest(s, mate, () => 0);
    expect(second.kind === 'served' && second.drinks).toEqual([]);
  });

  it('en gäst som inte dricker alkohol och inget alkoholfritt på listan: en rad, inget glas', () => {
    const s = serviceWith({ 'chicken-plate': 6, 'root-soup': 6, 'lentil-plate': 4, 'house-wine-glass': 6 });
    const g = guestWith(SEED, (p) => p.noAlcohol && p.allergy === null);
    const order = orderForGuest(s, g, () => 0.3);
    expect(order.kind === 'served' && order.drinks).toEqual([]);
    expect(order.kind === 'served' && order.missing).toBe('alcoholFree');
    expect(s.eventStream.some((e) => e.kind === 'guest_missing_drink')).toBe(true);
  });

  it('baspaketet tappar färre gäster än en meny utan veganskt och alkoholfritt', () => {
    const lost = (items: Record<string, number> | 'base') => {
      let s = morning();
      s = items === 'base' ? reducer(s, { type: 'BUY_PACKAGE', packageId: packagesFor('vinbar')!.base.id }) : reducer(s, { type: 'BUY_ITEMS', items });
      s = reducer(s, { type: 'START_SERVICE' });
      for (let i = 0; i < 20000 && s.day.period === 'dinner'; i++) {
        if (s.incidents?.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' });
        s = reducer(s, TICK);
      }
      return s.eventStream.filter((e) => e.kind === 'guest_lost_sale' || e.kind === 'guest_missing_drink').length;
    };
    const narrow = lost({ 'chicken-plate': 16, 'pork-plate': 12, 'house-wine-glass': 40 });
    expect(narrow).toBeGreaterThan(lost('base'));
  });
});
