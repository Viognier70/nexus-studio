import { describe, expect, it } from 'vitest';
import {
  arrivalProbability,
  economicArrivalMultiplier,
  maybeSpawnGuest,
  periodArrivalMultiplier,
  reputationArrivalMultiplier,
  scenarioSpawnStep,
  walkAwayProbability
} from '../arrivals';
import { PRICE_ARRIVAL_MULT, SERVICE_ARRIVAL_MULT } from '../economics';
import { makeGuest, makeInitialState } from '../model';
import type {
  DayPeriod,
  Guest,
  PricingTier,
  ServiceConcept,
  SimulationState
} from '../../types';
import type { Rng } from '../../util/rng';

// Deterministic rng harness — lets each test control chance() outcomes.
function fakeRng(values: number[]): Rng {
  let i = 0;
  const next = () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
  return {
    state: 0,
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p
  };
}

// Small helper: initial state pinned to a specific service period so
// arrivalProbability > 0 (the default period is 'morning', which is a
// closed window under the v3 period gate).
function stateInPeriod(seed: number, period: DayPeriod): SimulationState {
  const s = makeInitialState(seed);
  s.day = { ...s.day, period };
  return s;
}

describe('arrivalProbability', () => {
  it('is > 0 during lunch and dinner (open service periods)', () => {
    expect(arrivalProbability(stateInPeriod(1, 'lunch'))).toBeGreaterThan(0);
    expect(arrivalProbability(stateInPeriod(1, 'dinner'))).toBeGreaterThan(0);
  });

  it('is exactly 0 during morning / afternoon / evening (closed windows)', () => {
    expect(arrivalProbability(stateInPeriod(1, 'morning'))).toBe(0);
    expect(arrivalProbability(stateInPeriod(1, 'afternoon'))).toBe(0);
    expect(arrivalProbability(stateInPeriod(1, 'evening'))).toBe(0);
  });

  it('matches base * periodMult * SERVICE_MULT * PRICE_MULT * economicMult * reputationMult / 300 (5 Hz)', () => {
    const s = stateInPeriod(1, 'dinner');
    // ORDER 043 v3 §4 reputation loop wired into arrivalProbability:
    // rate now also scales with reputation. Initial reputation = 0.6.
    const expected =
      (12 *
        periodArrivalMultiplier('dinner') *
        SERVICE_ARRIVAL_MULT[s.policies.service] *
        PRICE_ARRIVAL_MULT[s.policies.pricing] *
        economicArrivalMultiplier(s) *
        reputationArrivalMultiplier(s.reputation)) /
      300;
    expect(arrivalProbability(s)).toBeCloseTo(expected, 10);
  });

  it('lunch fires at 60 % of dinner (all else equal)', () => {
    const lunch = arrivalProbability(stateInPeriod(1, 'lunch'));
    const dinner = arrivalProbability(stateInPeriod(1, 'dinner'));
    expect(lunch / dinner).toBeCloseTo(0.6, 6);
  });

  it('scales inversely with pricing tier (låg > medel > hög)', () => {
    const base = stateInPeriod(1, 'dinner');
    const low: SimulationState = {
      ...base,
      policies: { ...base.policies, pricing: 'låg' as PricingTier }
    };
    const mid: SimulationState = {
      ...base,
      policies: { ...base.policies, pricing: 'medel' as PricingTier }
    };
    const hi: SimulationState = {
      ...base,
      policies: { ...base.policies, pricing: 'hög' as PricingTier }
    };
    expect(arrivalProbability(low)).toBeGreaterThan(arrivalProbability(mid));
    expect(arrivalProbability(mid)).toBeGreaterThan(arrivalProbability(hi));
  });

  it('formell service reduces the probability relative to vardaglig', () => {
    const base = stateInPeriod(1, 'dinner');
    const casual: SimulationState = {
      ...base,
      policies: { ...base.policies, service: 'vardaglig' as ServiceConcept }
    };
    const formal: SimulationState = {
      ...base,
      policies: { ...base.policies, service: 'formell' as ServiceConcept }
    };
    expect(arrivalProbability(casual)).toBeGreaterThan(arrivalProbability(formal));
  });
});

describe('periodArrivalMultiplier', () => {
  it('closes morning / afternoon / evening (0.0)', () => {
    expect(periodArrivalMultiplier('morning')).toBe(0);
    expect(periodArrivalMultiplier('afternoon')).toBe(0);
    expect(periodArrivalMultiplier('evening')).toBe(0);
  });

  it('opens lunch at 0.6 and dinner at 1.0', () => {
    expect(periodArrivalMultiplier('lunch')).toBe(0.6);
    expect(periodArrivalMultiplier('dinner')).toBe(1.0);
  });
});

describe('maybeSpawnGuest', () => {
  it('returns null when the active-guest cap (24) is reached', () => {
    const s = stateInPeriod(1, 'dinner');
    for (let i = 0; i < 24; i++) s.guests.push(makeGuest(s.simTime, false));
    // rng.chance would fire (0 < any probability), but the cap short-circuits.
    const g = maybeSpawnGuest(s, fakeRng([0]));
    expect(g).toBeNull();
  });

  it('still admits when active is 23 (one below cap)', () => {
    const s = stateInPeriod(1, 'dinner');
    for (let i = 0; i < 23; i++) s.guests.push(makeGuest(s.simTime, false));
    const g = maybeSpawnGuest(s, fakeRng([0, 0.9]));
    expect(g).not.toBeNull();
  });

  it('returns null when rng.chance rolls above the probability', () => {
    const s = stateInPeriod(1, 'dinner');
    // 0.999 > arrivalProbability, so chance() returns false.
    const g = maybeSpawnGuest(s, fakeRng([0.999]));
    expect(g).toBeNull();
  });

  it('returns null during a closed window regardless of rng', () => {
    // Any rng roll should be short-circuited by arrivalProbability = 0
    // when the period gate is closed.
    const s = stateInPeriod(1, 'morning');
    const g = maybeSpawnGuest(s, fakeRng([0, 0]));
    expect(g).toBeNull();
  });

  it('returns a new non-scenario guest when the roll passes the probability', () => {
    const s = stateInPeriod(1, 'dinner');
    const g = maybeSpawnGuest(s, fakeRng([0, 0.9]));
    expect(g).not.toBeNull();
    expect(g!.scenarioSource).toBe(false);
    expect(g!.state).toBe('arriving');
    expect(g!.arrivalTime).toBe(s.simTime);
  });
});

describe('scenarioSpawnStep', () => {
  function armedState(remaining: number, nextAt: number, simTime = 0): SimulationState {
    const s = makeInitialState(1);
    s.simTime = simTime;
    s.scenario = {
      ...s.scenario,
      spawnedRemaining: remaining,
      nextSpawnAt: nextAt,
      awaitingChoice: false,
      choice: 'A',
      choiceAt: 0,
      active: true,
      hasAutoTriggered: true
    };
    return s;
  }

  it('returns null when spawnedRemaining is 0', () => {
    const s = armedState(0, 0);
    expect(scenarioSpawnStep(s)).toBeNull();
  });

  it('returns null when simTime has not reached nextSpawnAt', () => {
    const s = armedState(3, 5, 4);
    expect(scenarioSpawnStep(s)).toBeNull();
  });

  it('returns a scenario-flagged guest when timing is due', () => {
    const s = armedState(3, 5, 5);
    const g = scenarioSpawnStep(s);
    expect(g).not.toBeNull();
    const guest = g as Guest;
    expect(guest.scenarioSource).toBe(true);
    expect(guest.state).toBe('arriving');
    expect(guest.arrivalTime).toBe(5);
  });

  it('scenario-flagged guests never walk away', () => {
    // Even at critically weak economic reading, scenario guests must
    // reach the door — the whole point of a scenario is that the
    // player responds to a specific arrival. Walk-away is for
    // ambient regulars only. ORDER 050 §3 (2026-08-10): the reading
    // now derives from state.cash.
    const s = armedState(3, 5, 5);
    s.cash = 0;
    const g = scenarioSpawnStep(s) as Guest;
    expect(g.walkAwayOnArrival).toBe(false);
  });
});

// ORDER 050 §3 (2026-08-10) — economicArrivalMultiplier and
// walkAwayProbability now take SimulationState and derive the [0,1]
// reading from state.cash / weekly-operating-baseline capped at 4
// weeks. Tests reason in cash-SEK; a strong reading needs enough
// cash to reach the cap, a weak reading needs cash → 0.
describe('ORDER 043 §6 economic arrival multiplier (post-ORDER-050 cash refactor)', () => {
  function stateWithCash(cash: number): SimulationState {
    const s = stateInPeriod(1, 'dinner');
    s.cash = cash;
    return s;
  }

  it('is ECONOMIC_ARRIVAL_FLOOR (0.4) at cash = 0 and 1 at cash-past-the-cap', () => {
    // Cap at 4 weeks × ~25.2 kSEK weekly ops (3 default team members
    // dailyCost 1200 + 1000 + 1400 = 3600 × 7 = 25 200) ≈ 100 kSEK.
    // 500 kSEK is comfortably past the cap.
    expect(economicArrivalMultiplier(stateWithCash(0))).toBeCloseTo(0.4, 10);
    expect(economicArrivalMultiplier(stateWithCash(500_000))).toBeCloseTo(1, 10);
  });

  it('is monotonically increasing as cash rises', () => {
    let last = -Infinity;
    for (const cash of [0, 20_000, 40_000, 60_000, 80_000, 120_000, 200_000]) {
      const m = economicArrivalMultiplier(stateWithCash(cash));
      expect(m).toBeGreaterThanOrEqual(last);
      last = m;
    }
  });

  it('clamps out-of-range inputs (negative cash reads as 0 floor)', () => {
    expect(economicArrivalMultiplier(stateWithCash(-1000))).toBeCloseTo(0.4, 10);
    expect(economicArrivalMultiplier(stateWithCash(9_999_999))).toBeCloseTo(1, 10);
  });

  it('arrivalProbability visibly falls as cash drops', () => {
    const strong = stateWithCash(500_000);
    const weak = stateWithCash(0);
    // At floor 0.4 vs 1.0, weak should be 40% of strong's rate.
    expect(arrivalProbability(weak) / arrivalProbability(strong)).toBeCloseTo(0.4, 3);
  });
});

describe('ORDER 043 §6 walk-away probability (post-ORDER-050 cash refactor)', () => {
  function stateWithCash(cash: number): SimulationState {
    const s = stateInPeriod(1, 'dinner');
    s.cash = cash;
    return s;
  }

  it('is 0 at cash past the runway cap (no walk-aways in a strong economy)', () => {
    expect(walkAwayProbability(stateWithCash(500_000))).toBe(0);
  });

  it('is ECONOMIC_WALKAWAY_CEIL (0.2) at cash = 0', () => {
    expect(walkAwayProbability(stateWithCash(0))).toBeCloseTo(0.2, 10);
  });

  it('is monotonically decreasing as cash rises', () => {
    let last = Infinity;
    for (const cash of [0, 20_000, 40_000, 60_000, 80_000, 120_000, 200_000]) {
      const p = walkAwayProbability(stateWithCash(cash));
      expect(p).toBeLessThanOrEqual(last);
      last = p;
    }
  });

  it('maybeSpawnGuest flags walk-away when the second roll fires at zero cash', () => {
    const s = stateWithCash(0); // walk-away probability = 0.2
    // First roll (arrival chance) at 0 → passes. Second roll
    // (walk-away) at 0 → below 0.2 → walk-away flagged.
    const g = maybeSpawnGuest(s, fakeRng([0, 0]));
    expect(g).not.toBeNull();
    expect(g!.walkAwayOnArrival).toBe(true);
  });

  it('maybeSpawnGuest does not flag walk-away at mid-cash when the second roll misses', () => {
    // At ~55 kSEK cash on the default team (~25.2 kSEK/week ops),
    // weeks-of-runway ≈ 2.2, reading ≈ 0.55, walk-away probability
    // ≈ 0.09. Second roll of 0.9 misses that threshold.
    const s = stateWithCash(55_000);
    const g = maybeSpawnGuest(s, fakeRng([0, 0.9]));
    expect(g).not.toBeNull();
    expect(g!.walkAwayOnArrival).toBe(false);
  });
});
