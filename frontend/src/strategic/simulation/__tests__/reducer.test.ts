import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import type { SimulationState } from '../../types';

function tick(state: SimulationState, times = 1): SimulationState {
  let next = state;
  for (let i = 0; i < times; i++) {
    next = reducer(next, { type: 'TICK', dt: 1 / 5 });
  }
  return next;
}

describe('reducer TICK', () => {
  it('advances tick counter and simTime by 0.2 s per tick', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TICK', dt: 1 / 5 });
    expect(s1.tick).toBe(1);
    expect(s1.simTime).toBeCloseTo(0.2, 5);
  });

  it('reaches simTime ~120 s after 600 ticks (5 Hz)', () => {
    const s = tick(makeInitialState(1), 600);
    expect(s.tick).toBe(600);
    expect(s.simTime).toBeCloseTo(120, 3);
  });

  it('produces a new state object each tick (immutable per action)', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TICK', dt: 1 / 5 });
    expect(s1).not.toBe(s0);
    expect(s1.staff).not.toBe(s0.staff);
    expect(s1.guests).not.toBe(s0.guests);
  });

  it('advances rngState so successive ticks are non-deterministic per tick', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TICK', dt: 1 / 5 });
    // rngState will change once rng.next() is called during the tick.
    // The tick unconditionally calls rng.range for delivery cooldown.
    expect(s1.rngState).not.toBe(s0.rngState);
  });

  it('village residents advance progress each tick', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TICK', dt: 1 / 5 });
    const changed = s1.village.residents.some(
      (r, i) => r.progress !== s0.village.residents[i].progress
    );
    expect(changed).toBe(true);
  });
});

describe('reducer SET_SPEED', () => {
  it('updates the speed multiplier', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'SET_SPEED', speed: 4 });
    expect(s1.speed).toBe(4);
  });

  it('leaves other fields untouched', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'SET_SPEED', speed: 2 });
    expect(s1.tick).toBe(s0.tick);
    expect(s1.simTime).toBe(s0.simTime);
    expect(s1.staff).toBe(s0.staff);
  });
});

describe('reducer SET_POLICY', () => {
  it('applies a partial policy patch', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'SET_POLICY', patch: { pricing: 'hög' } });
    expect(s1.policies.pricing).toBe('hög');
    expect(s1.policies.service).toBe(s0.policies.service);
  });

  it('rebuilds staff when staffCount changes', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'SET_POLICY', patch: { staffCount: 4 } });
    expect(s1.staff).toHaveLength(4);
    expect(s1.staff).not.toBe(s0.staff);
  });

  it('does not rebuild staff when staffCount is unchanged', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, {
      type: 'SET_POLICY',
      patch: { staffCount: s0.policies.staffCount }
    });
    expect(s1.staff).toBe(s0.staff);
  });

  it('records a policy event', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'SET_POLICY', patch: { pricing: 'låg' } });
    expect(s1.events).toHaveLength(s0.events.length + 1);
    const last = s1.events[s1.events.length - 1];
    expect(last.kind).toBe('policy');
    expect(last.text).toContain('pris');
  });
});

describe('reducer TRIGGER_SCENARIO', () => {
  it('sets awaitingChoice and marks scenario active', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TRIGGER_SCENARIO' });
    expect(s1.scenario.active).toBe(true);
    expect(s1.scenario.awaitingChoice).toBe(true);
    expect(s1.scenario.choice).toBeNull();
  });

  it('appends a scenario event', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TRIGGER_SCENARIO' });
    const last = s1.events[s1.events.length - 1];
    expect(last.kind).toBe('scenario');
  });

  it('auto-triggers exactly once when simTime crosses 120 s', () => {
    let s = makeInitialState(1);
    // Advance to just before the threshold. AUTO_SCENARIO_AT = 120 s;
    // 599 ticks * 0.2 s = 119.8 s.
    s = tick(s, 599);
    expect(s.scenario.hasAutoTriggered).toBe(false);
    s = tick(s, 1);
    expect(s.scenario.hasAutoTriggered).toBe(true);
    expect(s.scenario.awaitingChoice).toBe(true);
    // Further ticks must not re-trigger.
    const eventsAfterTrigger = s.events.filter((e) => e.kind === 'scenario').length;
    s = tick(s, 5);
    const eventsAfterMore = s.events.filter((e) => e.kind === 'scenario').length;
    expect(eventsAfterMore).toBe(eventsAfterTrigger);
  });
});

describe('reducer RESOLVE_SCENARIO', () => {
  function triggered(seed = 1): SimulationState {
    return reducer(makeInitialState(seed), { type: 'TRIGGER_SCENARIO' });
  }

  it('choice A schedules 8 scenario guests', () => {
    const s = reducer(triggered(), { type: 'RESOLVE_SCENARIO', choice: 'A' });
    expect(s.scenario.awaitingChoice).toBe(false);
    expect(s.scenario.choice).toBe('A');
    expect(s.scenario.spawnedRemaining).toBe(8);
  });

  it('choice B schedules 8 scenario guests and flips welcomeDrink on', () => {
    const s = reducer(triggered(), { type: 'RESOLVE_SCENARIO', choice: 'B' });
    expect(s.scenario.spawnedRemaining).toBe(8);
    expect(s.policies.welcomeDrink).toBe(true);
  });

  it('choice C schedules 3 scenario guests and drops reputation', () => {
    const s0 = triggered();
    const s1 = reducer(s0, { type: 'RESOLVE_SCENARIO', choice: 'C' });
    expect(s1.scenario.spawnedRemaining).toBe(3);
    expect(s1.reputation).toBeCloseTo(s0.reputation - 0.03, 5);
  });

  it('records a scenario event with the chosen letter', () => {
    const s = reducer(triggered(), { type: 'RESOLVE_SCENARIO', choice: 'A' });
    const last = s.events[s.events.length - 1];
    expect(last.kind).toBe('scenario');
    expect(last.text).toContain('A');
  });
});

describe('regular arrivals suspended while awaitingChoice', () => {
  it('does not spawn regular arrivals while the scenario is awaiting the player', () => {
    let s = reducer(makeInitialState(1), { type: 'TRIGGER_SCENARIO' });
    const before = s.guests.length;
    s = tick(s, 300); // 60 s of ticks
    // No RESOLVE_SCENARIO yet — scenario spawns should also not fire
    // because spawnedRemaining is 0 until a choice is made.
    expect(s.guests.length).toBe(before);
  });
});

describe('reducer RESET', () => {
  it('returns a fresh initial state that preserves seed and policies', () => {
    const s0 = makeInitialState(42);
    const s1 = tick(s0, 50);
    const s2 = reducer(s1, { type: 'RESET' });
    expect(s2.tick).toBe(0);
    expect(s2.simTime).toBe(0);
    expect(s2.seed).toBe(42);
    expect(s2.policies).toEqual(s0.policies);
    expect(s2.guests).toHaveLength(0);
  });
});
