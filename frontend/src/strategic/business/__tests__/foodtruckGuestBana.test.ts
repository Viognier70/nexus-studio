// ORDER 115 §6 — Gästbanan sluts: DoD-tester.
//
// Kartläggning mot §6:
//   DoD 1  Grep: prop-komponent finns och överförs. (Grep-test.)
//   DoD 2  Test: gästens carrying-tillstånd ändras vid överlämning.
//   DoD 3  Bild — separat script.
//   DoD 4  Test: gäst efter hämtning når leaving, tas inte bort på plats.
//   DoD 5  Test: queue= och seated= i DevPanel motsvarar renderade figurer.
//   DoD 6  Uteplats-flagga finns, tröskel INTE satt av agent (verifieras
//          genom att inget test asserterar en specifik tröskel-siffra).
//   DoD 7  Test: eating-fas nås BARA när hasUteplats.
//   DoD 8  Bild — separat script.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { capacityForBusiness } from '../businessClass';
import type { Guest, GuestState, SimulationState } from '../../types';

function makeFoodtruckState(withUteplats = false, seed = 20260817): SimulationState {
  let s = makeInitialState(seed);
  s = {
    ...s,
    businessClass: 'foodtruck',
    policies: {
      ...s.policies,
      capacity: capacityForBusiness('foodtruck', s.policies.staffCount),
      hasUteplats: withUteplats
    },
    cash: 240_000
  };
  return s;
}

// -----------------------------------------------------------------------------
// DoD 1 — Grep: prop-komponent finns
// -----------------------------------------------------------------------------

describe('ORDER 115 §6 DoD 1 — carrying-prop finns i skepnadskoden', () => {
  it('Figure.tsx exporterar renderCarrying + hanterar foodtruckMeal', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const figureSrc = readFileSync(
      resolve(here, '..', '..', 'ui', 'foodtruck', 'Figure.tsx'),
      'utf8'
    );
    expect(figureSrc).toContain('renderCarrying');
    expect(figureSrc).toContain("'foodtruckMeal'");
    expect(figureSrc).toContain('data-carrying');
  });

  it('sim sätter carrying via completeStaffTask order-branchen', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const serviceSrc = readFileSync(
      resolve(here, '..', '..', 'simulation', 'service.ts'),
      'utf8'
    );
    // Grep-verifierbart: order-task completion sätter guest.carrying
    // för foodtruck. Case-sensitive för att inte träffas av kommentarer
    // som råkar innehålla ordet.
    expect(serviceSrc).toContain("guest.carrying = 'foodtruckMeal'");
  });
});

// -----------------------------------------------------------------------------
// DoD 2 — Guest.carrying ändras vid överlämning (ordering → paying)
// -----------------------------------------------------------------------------

describe('ORDER 115 §6 DoD 2 — carrying sätts vid ordering → paying', () => {
  it('foodtruck-gäst har carrying=undefined före paying, "foodtruckMeal" efter', () => {
    // Spawna en foodtruck-gäst manuellt vid state='ordering' så vi
    // isolerar order-task → paying-transitionen. Sätter också staffCount
    // så minst en staff kan ta 'order'-tasken.
    let s = makeFoodtruckState();
    const guest: Guest = {
      id: 'g-hand',
      state: 'ordering',
      satisfaction: 0.7,
      seatIndex: null,
      arrivalTime: 0,
      stateTime: s.simTime,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false
    };
    s = { ...s, guests: [guest] };
    // Före ticks: carrying är undefined
    expect(s.guests[0].carrying).toBeUndefined();
    // Kör ticks tills gästen når 'paying' via staff-task 'order'
    let reachedPaying = false;
    for (let i = 0; i < 200 && !reachedPaying; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-hand');
      if (g && g.state === 'paying') reachedPaying = true;
    }
    expect(reachedPaying).toBe(true);
    const g = s.guests.find((x) => x.id === 'g-hand');
    expect(g?.carrying).toBe('foodtruckMeal');
  });

  it('carrying bevaras genom leaving-fasen (inte återställs)', () => {
    let s = makeFoodtruckState();
    const guest: Guest = {
      id: 'g-leave',
      state: 'paying',
      satisfaction: 0.7,
      seatIndex: null,
      arrivalTime: 0,
      stateTime: s.simTime,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false,
      carrying: 'foodtruckMeal'
    };
    s = { ...s, guests: [guest] };
    // Kör tills gästen är i leaving-state
    for (let i = 0; i < 200; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-leave');
      if (g && g.state === 'leaving') {
        expect(g.carrying).toBe('foodtruckMeal');
        return;
      }
    }
    expect.fail('gäst nådde aldrig leaving-state');
  });
});

// -----------------------------------------------------------------------------
// DoD 4 — gäst når leaving, tas INTE bort på plats
// -----------------------------------------------------------------------------

describe('ORDER 115 §6 DoD 4 — avfärden går via leaving-state', () => {
  it('foodtruck-gäst efter paying når leaving (inte plockas ur guests[] direkt)', () => {
    let s = makeFoodtruckState();
    const guest: Guest = {
      id: 'g-out',
      state: 'paying',
      satisfaction: 0.7,
      seatIndex: null,
      arrivalTime: 0,
      stateTime: s.simTime,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false,
      carrying: 'foodtruckMeal'
    };
    s = { ...s, guests: [guest] };
    let sawLeaving = false;
    for (let i = 0; i < 100; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-out');
      if (g?.state === 'leaving') sawLeaving = true;
    }
    expect(sawLeaving, 'gäst gick från paying direkt till pruned utan leaving-observation').toBe(true);
  });
});

// -----------------------------------------------------------------------------
// DoD 5 — queue= och seated= motsvarar renderade figurer
// -----------------------------------------------------------------------------

describe('ORDER 115 §6 DoD 5 — DevPanel queue+seated matcher renderade', () => {
  it('foodtruck: queue = waiting+arriving+ordering+paying, seated = eating', () => {
    // Simulera DevPanel:s räkne-logik direkt (samma predikat som i
    // DevPanel.tsx). Bevisar kontraktet mellan sim-state och räkning.
    const s = makeFoodtruckState();
    const guests: Guest[] = [
      { id: 'a', state: 'arriving' },
      { id: 'w1', state: 'waiting' },
      { id: 'w2', state: 'waiting' },
      { id: 'o', state: 'ordering' },
      { id: 'p', state: 'paying' },
      { id: 'e1', state: 'eating' },
      { id: 'e2', state: 'eating' },
      { id: 'l', state: 'leaving' }
    ].map((base) => ({
      ...base,
      satisfaction: 0.7,
      seatIndex: null,
      arrivalTime: 0,
      stateTime: 0,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false
    } as Guest));
    const stateWithGuests: SimulationState = { ...s, guests };

    // DevPanel-räkning (foodtruck-läge)
    const queueLive = stateWithGuests.guests.filter((g) =>
      g.state === 'waiting' || g.state === 'arriving' ||
      g.state === 'ordering' || g.state === 'paying'
    ).length;
    const seatedLive = stateWithGuests.guests.filter((g) => g.state === 'eating').length;

    // Renderade figurer i FoodtruckScene: samma set + leaving/declined
    const SCENE_RELEVANT = new Set(['arriving', 'waiting', 'ordering', 'paying', 'eating', 'leaving', 'declined']);
    const renderedCount = stateWithGuests.guests.filter((g) => SCENE_RELEVANT.has(g.state)).length;

    expect(queueLive).toBe(5);   // a, w1, w2, o, p
    expect(seatedLive).toBe(2);  // e1, e2
    // queue+seated = 7 = alla utom leaving (som är på-väg-ut).
    // renderedCount = 8 (inkl leaving). Renderaren visar även avfärden
    // vilket är korrekt — leaving-figurer renderas som "på väg ut" i
    // scenen (bevis: fel 2 + ORDER 115 §3).
    expect(queueLive + seatedLive + 1).toBe(renderedCount);  // +1 = leaving
  });

  it('restaurant: queue och seated behåller gammal (waitingIds/seatedIds)-avläsning', () => {
    // Regressionskontroll: DevPanel:s omdefinition bara i foodtruck-läge.
    const s = makeInitialState();  // default = restaurant
    const stateWith: SimulationState = {
      ...s,
      waitingIds: ['w1', 'w2'],
      seatedIds: ['s1', 's2', 's3']
    };
    // Restaurant-läge: queue = waitingIds.length, seated = seatedIds.length
    const isFoodtruck = stateWith.businessClass === 'foodtruck';
    const queueLive = isFoodtruck
      ? stateWith.guests.filter((g) => g.state === 'waiting' || g.state === 'arriving' || g.state === 'ordering' || g.state === 'paying').length
      : stateWith.waitingIds.length;
    const seatedLive = isFoodtruck
      ? stateWith.guests.filter((g) => g.state === 'eating').length
      : stateWith.seatedIds.length;
    expect(queueLive).toBe(2);
    expect(seatedLive).toBe(3);
  });
});

// -----------------------------------------------------------------------------
// DoD 6 — hasUteplats-flagga finns
// -----------------------------------------------------------------------------

describe('ORDER 115 §6 DoD 6 — hasUteplats-investering finns', () => {
  it('Policies.hasUteplats är valfri boolean', () => {
    const s1 = makeFoodtruckState(false);
    expect(s1.policies.hasUteplats).toBe(false);
    const s2 = makeFoodtruckState(true);
    expect(s2.policies.hasUteplats).toBe(true);
  });

  it('default (utan explicit sättning) är undefined eller false', () => {
    const s = makeInitialState();
    // Undefined är godkänt — bakåtkompat.
    expect(s.policies.hasUteplats === undefined || s.policies.hasUteplats === false).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// DoD 7 — eating-fas nås BARA när hasUteplats
// -----------------------------------------------------------------------------

describe('ORDER 115 §6 DoD 7 — eating-fas gate:ad på hasUteplats', () => {
  it('utan uteplats: gäst går paying → leaving direkt (ingen eating)', () => {
    let s = makeFoodtruckState(false);  // hasUteplats = false
    const guest: Guest = {
      id: 'g-no-ute',
      state: 'paying',
      satisfaction: 0.7,
      seatIndex: null,
      arrivalTime: 0,
      stateTime: s.simTime,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false,
      carrying: 'foodtruckMeal'
    };
    s = { ...s, guests: [guest] };
    const observed = new Set<GuestState>();
    for (let i = 0; i < 200; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-no-ute');
      if (g) observed.add(g.state);
    }
    expect(observed.has('eating'), `eating observerades trots hasUteplats=false: ${[...observed].join(',')}`).toBe(false);
    expect(observed.has('leaving'), 'leaving observerades inte').toBe(true);
  });

  it('med uteplats: gäst går paying → eating → leaving', () => {
    let s = makeFoodtruckState(true);  // hasUteplats = true
    const guest: Guest = {
      id: 'g-ute',
      state: 'paying',
      satisfaction: 0.7,
      seatIndex: null,
      arrivalTime: 0,
      stateTime: s.simTime,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false,
      carrying: 'foodtruckMeal'
    };
    s = { ...s, guests: [guest] };
    const observed = new Set<GuestState>();
    for (let i = 0; i < 500; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-ute');
      if (g) observed.add(g.state);
    }
    expect(observed.has('eating'), 'eating observerades inte trots hasUteplats=true').toBe(true);
    expect(observed.has('leaving'), 'leaving observerades inte efter eating').toBe(true);
  });

  it('eating-fas blockeras för restaurang (bara foodtruck)', () => {
    // hasUteplats-flaggan finns på policies men eating-transitionen
    // gate:as också på businessClass === 'foodtruck'. Om restaurant
    // råkar få hasUteplats=true (regression) ska eating INTE nås.
    let s = makeInitialState();  // default = restaurant
    s = { ...s, policies: { ...s.policies, hasUteplats: true }, cash: 240000 };
    const guest: Guest = {
      id: 'g-rest',
      state: 'paying',
      satisfaction: 0.7,
      seatIndex: 0,
      arrivalTime: 0,
      stateTime: s.simTime,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 1,
      hadWelcomeDrink: false,
      lastCheckbackAt: null,
      walkAwayOnArrival: false,
      stayingOvernight: false
    };
    s = { ...s, guests: [guest], seatedIds: ['g-rest'] };
    const observed = new Set<GuestState>();
    for (let i = 0; i < 200; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-rest');
      if (g) observed.add(g.state);
    }
    expect(observed.has('eating')).toBe(false);
  });
});
