import { describe, expect, it } from 'vitest';
import { arrivalProbability, maybeSpawnGuest, scenarioSpawnStep } from '../arrivals';
import { PRICE_ARRIVAL_MULT, SERVICE_ARRIVAL_MULT } from '../economics';
import { makeGuest, makeInitialState } from '../model';
import type { Guest, PricingTier, ServiceConcept, SimulationState } from '../../types';
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

describe('arrivalProbability', () => {
  it('is > 0 for default policies', () => {
    const s = makeInitialState(1);
    expect(arrivalProbability(s)).toBeGreaterThan(0);
  });

  it('matches perMinute * SERVICE_MULT * PRICE_MULT / 300 (5 Hz)', () => {
    const s = makeInitialState(1);
    const expected =
      (3.2 * SERVICE_ARRIVAL_MULT[s.policies.service] * PRICE_ARRIVAL_MULT[s.policies.pricing]) /
      300;
    expect(arrivalProbability(s)).toBeCloseTo(expected, 10);
  });

  it('scales inversely with pricing tier (låg > medel > hög)', () => {
    const base = makeInitialState(1);
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
    const base = makeInitialState(1);
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

describe('maybeSpawnGuest', () => {
  it('returns null when the guest cap (12) is reached', () => {
    const s = makeInitialState(1);
    for (let i = 0; i < 12; i++) s.guests.push(makeGuest(s.simTime, false));
    // rng.chance would fire (0 < any probability), but the cap short-circuits.
    const g = maybeSpawnGuest(s, fakeRng([0]));
    expect(g).toBeNull();
  });

  it('returns null when rng.chance rolls above the probability', () => {
    const s = makeInitialState(1);
    // 0.999 > arrivalProbability (≈ 0.012), so chance() returns false.
    const g = maybeSpawnGuest(s, fakeRng([0.999]));
    expect(g).toBeNull();
  });

  it('returns a new non-scenario guest when the roll passes the probability', () => {
    const s = makeInitialState(1);
    const g = maybeSpawnGuest(s, fakeRng([0]));
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
});
