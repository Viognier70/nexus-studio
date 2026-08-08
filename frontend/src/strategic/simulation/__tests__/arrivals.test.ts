import { describe, expect, it } from 'vitest';
import {
  arrivalProbability,
  economicArrivalMultiplier,
  maybeSpawnGuest,
  periodArrivalMultiplier,
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

  it('matches base * periodMult * SERVICE_MULT * PRICE_MULT * economicMult / 300 (5 Hz)', () => {
    const s = stateInPeriod(1, 'dinner');
    // ORDER 043 v3 room-flow retune: base rate is 12/min, gated by the
    // period multiplier (dinner = 1.0). At initial economic capital 0.55,
    // the economic multiplier is 0.73.
    const expected =
      (12 *
        periodArrivalMultiplier('dinner') *
        SERVICE_ARRIVAL_MULT[s.policies.service] *
        PRICE_ARRIVAL_MULT[s.policies.pricing] *
        economicArrivalMultiplier(s.capitals.values.economic)) /
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
    // Even at critically weak economic, scenario guests must reach the
    // door — the whole point of a scenario is that the player responds
    // to a specific arrival. Walk-away is for ambient regulars only.
    const s = armedState(3, 5, 5);
    s.capitals.values.economic = 0;
    const g = scenarioSpawnStep(s) as Guest;
    expect(g.walkAwayOnArrival).toBe(false);
  });
});

describe('ORDER 043 §6 economic arrival multiplier', () => {
  it('is ECONOMIC_ARRIVAL_FLOOR (0.4) at capital = 0 and 1 at capital = 1', () => {
    expect(economicArrivalMultiplier(0)).toBeCloseTo(0.4, 10);
    expect(economicArrivalMultiplier(1)).toBeCloseTo(1, 10);
  });

  it('is monotonically increasing across [0, 1]', () => {
    let last = -Infinity;
    for (let v = 0; v <= 1; v += 0.1) {
      const m = economicArrivalMultiplier(v);
      expect(m).toBeGreaterThanOrEqual(last);
      last = m;
    }
  });

  it('clamps out-of-range inputs', () => {
    expect(economicArrivalMultiplier(-1)).toBeCloseTo(0.4, 10);
    expect(economicArrivalMultiplier(2)).toBeCloseTo(1, 10);
  });

  it('arrivalProbability visibly falls as economic drops', () => {
    const strong = stateInPeriod(1, 'dinner');
    strong.capitals.values.economic = 1;
    const weak = stateInPeriod(1, 'dinner');
    weak.capitals.values.economic = 0;
    // At floor 0.4 vs 1.0, weak should be 40% of strong's rate.
    expect(arrivalProbability(weak) / arrivalProbability(strong)).toBeCloseTo(0.4, 3);
  });
});

describe('ORDER 043 §6 walk-away probability', () => {
  it('is 0 at economic = 1 (no walk-aways in a strong economy)', () => {
    expect(walkAwayProbability(1)).toBe(0);
  });

  it('is ECONOMIC_WALKAWAY_CEIL (0.2) at economic = 0', () => {
    // Halved from 0.4 at the room-flow retune. At economic = 0 one in
    // five arrivals refuses entry; the previous 0.4 flooded lunch with
    // vändare beyond what the arrival pressure could absorb.
    expect(walkAwayProbability(0)).toBeCloseTo(0.2, 10);
  });

  it('is monotonically decreasing across [0, 1]', () => {
    let last = Infinity;
    for (let v = 0; v <= 1; v += 0.1) {
      const p = walkAwayProbability(v);
      expect(p).toBeLessThanOrEqual(last);
      last = p;
    }
  });

  it('maybeSpawnGuest flags walk-away when the second roll fires at low economic', () => {
    const s = stateInPeriod(1, 'dinner');
    s.capitals.values.economic = 0; // walk-away probability = 0.2
    // First roll (arrival chance) at 0 → passes. Second roll (walk-away)
    // at 0 → below 0.2 → walk-away flagged.
    const g = maybeSpawnGuest(s, fakeRng([0, 0]));
    expect(g).not.toBeNull();
    expect(g!.walkAwayOnArrival).toBe(true);
  });

  it('maybeSpawnGuest does not flag walk-away when second roll misses', () => {
    const s = stateInPeriod(1, 'dinner');
    s.capitals.values.economic = 0.55; // walk-away probability = 0.09
    // First roll 0 → arrival fires. Second roll 0.9 → above 0.09 → no walk-away.
    const g = maybeSpawnGuest(s, fakeRng([0, 0.9]));
    expect(g).not.toBeNull();
    expect(g!.walkAwayOnArrival).toBe(false);
  });
});
