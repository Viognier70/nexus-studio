// ORDER 113 fel 1 uppföljning — integrations-test som kör HELA
// tick-kedjan för foodtruck. Inte isolerade helpers.
//
// **Varför den finns:** ORDER 111:s fem DoD-tester var alla gröna
// medan spelet inte fyllde kön i praktiken. Alla var isolerade —
// testade `maybeSpawnGuest`, `setGuestSeated`, `arrivalProbability`
// separat, med hand-riggat state. Inget test drev reducern med
// TICK-actions från makeInitialState → OPEN_SERVICE → observera
// vad som faktiskt händer. Det gapet gjorde att `findFreeSeat`-
// genvägen i tickGuests kunde route:a arriving-gäster förbi
// waitingIds utan att en enda test-assertion fångade det.
//
// Denna svit stänger den luckan. Alla test här driver reducern
// forward via `{ type: 'TICK', dt: 0.2 }` och observerar
// slut-tillståndet — samma väg som SimulationProvider:s ticker
// tar i browsern.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { capacityForBusiness, seatsFree, businessHasSeats } from '../businessClass';
import { computePlayerBusinessInterior } from '../interiorLayout';
import type { GuestState, SimulationState } from '../../types';

// Hjälpare: bygg ett foodtruck-state från makeInitialState och boosta
// arrival-conditions så en 500-sim-sek loop faktiskt genererar arrivals.
// Simulerar det applyDevBusinessOverride + boost-dispatches som
// SimulationProvider gör vid URL-param + benchmark-scriptet.
function makeFoodtruckState(seed = 20260819): SimulationState {
  let s = makeInitialState(seed);
  s = {
    ...s,
    businessClass: 'foodtrucken',
    policies: {
      ...s.policies,
      capacity: capacityForBusiness('foodtrucken', s.policies.staffCount)
    },
    cash: 240_000
  };
  return s;
}

// Kör N ticks med dt=0.2 (5 Hz — samma tick-hastighet som
// SimulationProvider) och returnera det observerade slut-tillståndet
// plus en spårning av vilka gäst-states som setts under körningen.
function runTicks(state: SimulationState, ticks: number): {
  finalState: SimulationState;
  observedGuestStates: Set<GuestState>;
  maxWaiting: number;
  maxSeated: number;
  maxOrdering: number;
  maxPaying: number;
  arrivals: number;
} {
  let s = state;
  const observed = new Set<GuestState>();
  let maxWaiting = 0;
  let maxSeated = 0;
  let maxOrdering = 0;
  let maxPaying = 0;
  let seenGuestIds = new Set<string>();
  for (let i = 0; i < ticks; i++) {
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    if (s.scenario.awaitingChoice) {
      // Undvik att fastna på scenario-overlay: seat as-is.
      s = reducer(s, { type: 'RESOLVE_SCENARIO', choice: 'A' });
    }
    if (s.waitingIds.length > maxWaiting) maxWaiting = s.waitingIds.length;
    if (s.seatedIds.length > maxSeated) maxSeated = s.seatedIds.length;
    let ordering = 0;
    let paying = 0;
    for (const g of s.guests) {
      observed.add(g.state);
      seenGuestIds.add(g.id);
      if (g.state === 'ordering') ordering += 1;
      if (g.state === 'paying') paying += 1;
    }
    if (ordering > maxOrdering) maxOrdering = ordering;
    if (paying > maxPaying) maxPaying = paying;
  }
  return {
    finalState: s,
    observedGuestStates: observed,
    maxWaiting,
    maxSeated,
    maxOrdering,
    maxPaying,
    arrivals: seenGuestIds.size
  };
}

// -----------------------------------------------------------------------------
// Tick-chain — foodtruck bygger kö organiskt
// -----------------------------------------------------------------------------

describe('foodtruck integration — kön fylls organiskt via tick-loopen', () => {
  it('over 1000 ticks (200 sim-sek) med öppen lunch: maxWaiting > 0', () => {
    let s = makeFoodtruckState();
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    const r = runTicks(s, 1000);
    expect(r.arrivals, `arrivals över 200 sim-sek: ${r.arrivals}`).toBeGreaterThan(3);
    expect(
      r.maxWaiting,
      `waitingIds nådde aldrig >0 — findFreeSeat-genvägen aktiv? observed states: ${[...r.observedGuestStates].join(',')}`
    ).toBeGreaterThan(0);
  });

  it('gäster passerar hela pipelinen — waiting/ordering/paying observerade', () => {
    let s = makeFoodtruckState();
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    const r = runTicks(s, 1500);
    expect(r.observedGuestStates.has('waiting'), 'waiting-state observerades aldrig').toBe(true);
    expect(r.observedGuestStates.has('ordering'), 'ordering-state observerades aldrig').toBe(true);
    // Paying är starkare bevis på att staff:s 'order'-task komplett
    // körde igenom foodtruck-branchen (ORDER 111 §3(a)).
    expect(r.observedGuestStates.has('paying'), 'paying-state observerades aldrig — order-task fullbordas inte').toBe(true);
  });

  it('gäster hamnar ALDRIG i seated eller dining — foodtruck saknar matsal', () => {
    let s = makeFoodtruckState();
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    const r = runTicks(s, 1500);
    expect(r.maxSeated, 'seatedIds > 0 i foodtruck').toBe(0);
    expect(r.observedGuestStates.has('seated'), 'seated-state observerades i foodtruck').toBe(false);
    expect(r.observedGuestStates.has('dining'), 'dining-state observerades i foodtruck').toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Regression — restaurang fortsätter fungera
// -----------------------------------------------------------------------------

describe('restaurant integration — regressionskontroll efter fel 1', () => {
  it('restaurang bygger seatedIds under service (findFreeSeat-guarden gäller bara foodtruck)', () => {
    let s = makeInitialState();
    // capacity = TOTAL_SEATS (16) från default
    s = { ...s, cash: 240_000 };
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 });
    const r = runTicks(s, 2000);
    expect(r.maxSeated, 'restaurang fyller aldrig stolar').toBeGreaterThan(0);
    expect(r.observedGuestStates.has('seated')).toBe(true);
    expect(r.observedGuestStates.has('dining')).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// seatsFree — per-verksamhet räknare
// -----------------------------------------------------------------------------

describe('seatsFree — per-verksamhet räknare', () => {
  it('foodtruck: seatsFree = queueCapacity - waitingIds.length', () => {
    const s = makeFoodtruckState();
    expect(s.policies.capacity).toBe(capacityForBusiness('foodtrucken', s.policies.staffCount));
    // Tom kö → hela kapaciteten fri
    expect(seatsFree(s)).toBe(s.policies.capacity);
    // Fyll kön till hälften
    const half = Math.floor(s.policies.capacity / 2);
    const withHalfQueue = { ...s, waitingIds: Array.from({ length: half }, (_, i) => `q-${i}`) };
    expect(seatsFree(withHalfQueue)).toBe(s.policies.capacity - half);
    // Full kö
    const full = { ...s, waitingIds: Array.from({ length: s.policies.capacity }, (_, i) => `q-${i}`) };
    expect(seatsFree(full)).toBe(0);
    // Överfull (kan hända om capacity sänks mid-service): klämpat till 0
    const over = { ...s, waitingIds: Array.from({ length: s.policies.capacity + 3 }, (_, i) => `q-${i}`) };
    expect(seatsFree(over)).toBe(0);
  });

  it('restaurant: seatsFree = seatCapacity - seatedIds.length (INTE waitingIds)', () => {
    const s = makeInitialState();
    expect(s.businessClass).toBe('kvarterskrogen');
    // Tom → hela kapaciteten fri
    expect(seatsFree(s)).toBe(s.policies.capacity);
    // Om restaurang hade läst waitingIds skulle testet ge fel svar:
    // sätter waiting=5, seated=3 → skulle ge capacity-5 istället för capacity-3
    const mixed = {
      ...s,
      waitingIds: ['w1', 'w2', 'w3', 'w4', 'w5'],
      seatedIds: ['s1', 's2', 's3']
    };
    expect(seatsFree(mixed)).toBe(s.policies.capacity - 3);
  });

  it('foodtruck: seatsFree läser INTE seated (som skulle vara noll ändå men den branchen skulle vara buggen)', () => {
    // Om seatsFree hade läst seatedIds för foodtruck skulle svaret alltid
    // bli capacity (eftersom foodtruck aldrig sitter). Denna test fångar
    // att fel formel används per verksamhet.
    const s = makeFoodtruckState();
    const withQueue = { ...s, waitingIds: ['q1', 'q2', 'q3'] };
    // seatsFree ska bry sig om kön, inte om seated
    expect(seatsFree(withQueue)).toBe(s.policies.capacity - 3);
    // Även om seatedIds är dubbelt så stor som capacity (omöjligt i praktiken
    // men bra defense-in-depth) ska svaret följa kö-formeln
    const bogus = { ...withQueue, seatedIds: Array.from({ length: 99 }, (_, i) => `s-${i}`) };
    expect(seatsFree(bogus)).toBe(s.policies.capacity - 3);
  });
});

// -----------------------------------------------------------------------------
// Layoutdrift — foodtruck ska INTE bära restaurangens matsal
// -----------------------------------------------------------------------------

describe('computePlayerBusinessInterior — verksamhets-gated', () => {
  it('foodtruck → null (ingen matsal, ingen 16-stols-inredning)', () => {
    // Före fel 1-uppföljningen returnerade computePlayerBusinessInterior
    // restaurangens 16-stols-matsal även för foodtruck; DevPanel loggade
    // `layout.seats=16 (DRIFT)` permanent. Testet asserterar att foodtruck
    // nu inte får någon matsal-inredning tilldelad.
    expect(computePlayerBusinessInterior('foodtrucken')).toBeNull();
  });

  it('restaurant → InteriorLayout med matsal-stolar', () => {
    const layout = computePlayerBusinessInterior('kvarterskrogen');
    expect(layout).not.toBeNull();
    expect(layout!.seats.length).toBeGreaterThan(0);
    expect(layout!.totalSeats).toBeGreaterThan(0);
  });

  it('värdshus → InteriorLayout med matsal-stolar (samma som restaurant tills egen skepnad byggs)', () => {
    const layout = computePlayerBusinessInterior('gästgiveriet');
    expect(layout).not.toBeNull();
    expect(layout!.seats.length).toBeGreaterThan(0);
  });

  it('ingen argument → default beteende (restaurangens matsal, backwards compat)', () => {
    // Äldre anropssidor (InteriorGuests, InteriorStaff, AnimationPrototype)
    // fortsätter fungera utan att behöva pass:a businessClass.
    const layout = computePlayerBusinessInterior();
    expect(layout).not.toBeNull();
    expect(layout!.seats.length).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------------
// businessHasSeats — semantisk snabb-check att helpern gör vad tick-testerna ovan förutsätter
// -----------------------------------------------------------------------------

describe('businessHasSeats — semantik för seatsFree- och layout-guarderna', () => {
  it('foodtruck: false', () => {
    expect(businessHasSeats('foodtrucken')).toBe(false);
  });
  it('restaurant: true', () => {
    expect(businessHasSeats('kvarterskrogen')).toBe(true);
  });
  it('värdshus: true', () => {
    expect(businessHasSeats('gästgiveriet')).toBe(true);
  });
});
