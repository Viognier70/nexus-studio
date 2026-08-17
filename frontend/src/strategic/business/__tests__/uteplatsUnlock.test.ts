// ORDER 115 rev 2 — auto-unlock av uteplats + serving-fas.
//
// Kartläggning mot revideringen:
//   rev 2 DoD A  Serving-fas är egen GuestState och varar 2.5 sim-sek.
//   rev 2 DoD B  Auto-unlock: policies.hasUteplats sätts när aktiv
//                tröskel nås; permanent (nollställs aldrig).
//   rev 2 DoD C  Tröskeln är default HAPPY_TOTAL ≥ 40 (kandidat C).
//   rev 2 DoD D  Metrics uppdateras korrekt: giveUpsThisService per
//                service, consecutiveCleanServices per stängd service.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { capacityForBusiness } from '../businessClass';
import {
  ALL_UTEPLATS_CANDIDATES,
  CANDIDATE_A_REPUTATION,
  CANDIDATE_B_CLEAN_SERVICES,
  CANDIDATE_C_HAPPY_TOTAL,
  DEFAULT_UTEPLATS_THRESHOLD,
  shouldUnlockUteplats
} from '../uteplatsUnlock';
import type { Guest, SimulationState } from '../../types';

function makeFoodtruckState(seed = 20260817): SimulationState {
  let s = makeInitialState(seed);
  s = {
    ...s,
    businessClass: 'foodtruck',
    policies: {
      ...s.policies,
      capacity: capacityForBusiness('foodtruck', s.policies.staffCount),
      hasUteplats: false
    },
    cash: 240_000
  };
  return s;
}

function makeOrderingGuest(id: string, s: SimulationState): Guest {
  return {
    id,
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
}

// -----------------------------------------------------------------------------
// DoD A — serving-fas 2.5 sim-sek
// -----------------------------------------------------------------------------

describe('ORDER 115 rev 2 DoD A — serving-fas är egen GuestState', () => {
  it('foodtruck: ordering → serving (via completeStaffTask) → paying', () => {
    // Skapa foodtruck-state med en gäst i ordering som slutar precis nu.
    // Vi behöver simulera att staff-tasken slutförs; enklaste sättet är
    // att köra hela TICK-loopen och observera state-övergångarna på en
    // riggad gäst.
    let s = makeFoodtruckState();
    const guest = makeOrderingGuest('g-serving', s);
    s = { ...s, guests: [guest] };

    const observed = new Set<string>();
    for (let i = 0; i < 500; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-serving');
      if (g) observed.add(g.state);
    }
    expect(observed.has('serving'), `serving inte observerad: ${[...observed].join(',')}`).toBe(true);
    expect(observed.has('paying'), 'paying inte observerad efter serving').toBe(true);
  });

  it('restaurant: hoppar över serving (ordering går till paying direkt)', () => {
    // Restaurangen har hasSeats=true och service.ts:s ordering-branch
    // gate:ar serving på businessHasSeats=false (foodtruck-only).
    let s = makeInitialState();
    const guest: Guest = { ...makeOrderingGuest('g-rest', s), seatIndex: 0, state: 'ordering' };
    s = { ...s, guests: [guest], seatedIds: ['g-rest'] };

    const observed = new Set<string>();
    for (let i = 0; i < 300; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      const g = s.guests.find((x) => x.id === 'g-rest');
      if (g) observed.add(g.state);
    }
    expect(observed.has('serving'), `serving läckte till restaurangen: ${[...observed].join(',')}`).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// DoD B/C — auto-unlock via HAPPY_TOTAL ≥ 40
// -----------------------------------------------------------------------------

describe('ORDER 115 rev 2 DoD B/C — auto-unlock uteplats', () => {
  it('default-tröskel är CANDIDATE_C_HAPPY_TOTAL', () => {
    expect(DEFAULT_UTEPLATS_THRESHOLD).toBe(CANDIDATE_C_HAPPY_TOTAL);
    expect(DEFAULT_UTEPLATS_THRESHOLD.value).toBe(40);
  });

  it('tre kandidater finns exakt: A/B/C', () => {
    expect(ALL_UTEPLATS_CANDIDATES).toHaveLength(3);
    const ids = ALL_UTEPLATS_CANDIDATES.map((c) => c.candidate);
    expect(ids).toEqual(['REPUTATION', 'CLEAN_SERVICES', 'HAPPY_TOTAL']);
  });

  it('shouldUnlockUteplats: false när restaurant, oavsett metrics', () => {
    let s = makeInitialState();   // restaurant
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 999 } };
    expect(shouldUnlockUteplats(s)).toBe(false);
  });

  it('shouldUnlockUteplats: false när redan upplåst', () => {
    let s = makeFoodtruckState();
    s = {
      ...s,
      policies: { ...s.policies, hasUteplats: true },
      metrics: { ...s.metrics, happyDeparturesTotal: 999 }
    };
    expect(shouldUnlockUteplats(s)).toBe(false);
  });

  it('shouldUnlockUteplats: false under tröskeln', () => {
    let s = makeFoodtruckState();
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 39 } };
    expect(shouldUnlockUteplats(s)).toBe(false);
  });

  it('shouldUnlockUteplats: true vid tröskeln (=40)', () => {
    let s = makeFoodtruckState();
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 40 } };
    expect(shouldUnlockUteplats(s)).toBe(true);
  });

  it('reducer TICK: sätter hasUteplats=true och loggar event vid tröskel', () => {
    let s = makeFoodtruckState();
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 40 } };
    const eventsBefore = s.events.length;
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.policies.hasUteplats).toBe(true);
    expect(s.events.length).toBe(eventsBefore + 1);
    expect(s.events[s.events.length - 1].text).toContain('Uteplats');
  });

  it('reducer TICK: fires bara EN GÅNG (permanent, ingen upprepad log)', () => {
    let s = makeFoodtruckState();
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 40 } };
    s = reducer(s, { type: 'TICK', dt: 0.2 });   // första tick — låser upp
    const eventsAfterUnlock = s.events.length;
    // Kör 20 tick till — inga fler upplåsnings-events ska loggas.
    for (let i = 0; i < 20; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
    }
    const uteplatsEvents = s.events.filter((e) => e.text.includes('Uteplats öppnad'));
    expect(uteplatsEvents).toHaveLength(1);
    expect(s.policies.hasUteplats).toBe(true);
    // eventsAfterUnlock var direkt efter unlock; efter 20 tick till kan
    // andra events ha loggats (t.ex. scenario), men uteplats-eventet är
    // fortfarande bara ett.
    expect(s.events.length).toBeGreaterThanOrEqual(eventsAfterUnlock);
  });
});

// -----------------------------------------------------------------------------
// Kandidat-checkers — separata + korrekt känsliga för sina villkor
// -----------------------------------------------------------------------------

describe('ORDER 115 rev 2 — kandidat-checkers', () => {
  it('A (REPUTATION): true bara när reputation ≥ 0.72', () => {
    let s = makeFoodtruckState();
    s = { ...s, reputation: 0.71 };
    expect(CANDIDATE_A_REPUTATION.check(s)).toBe(false);
    s = { ...s, reputation: 0.72 };
    expect(CANDIDATE_A_REPUTATION.check(s)).toBe(true);
    s = { ...s, reputation: 0.95 };
    expect(CANDIDATE_A_REPUTATION.check(s)).toBe(true);
  });

  it('B (CLEAN_SERVICES): true bara när consecutiveCleanServices ≥ 4', () => {
    let s = makeFoodtruckState();
    s = { ...s, metrics: { ...s.metrics, consecutiveCleanServices: 3 } };
    expect(CANDIDATE_B_CLEAN_SERVICES.check(s)).toBe(false);
    s = { ...s, metrics: { ...s.metrics, consecutiveCleanServices: 4 } };
    expect(CANDIDATE_B_CLEAN_SERVICES.check(s)).toBe(true);
  });

  it('C (HAPPY_TOTAL): true bara när happyDeparturesTotal ≥ 40', () => {
    let s = makeFoodtruckState();
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 39 } };
    expect(CANDIDATE_C_HAPPY_TOTAL.check(s)).toBe(false);
    s = { ...s, metrics: { ...s.metrics, happyDeparturesTotal: 40 } };
    expect(CANDIDATE_C_HAPPY_TOTAL.check(s)).toBe(true);
  });
});
