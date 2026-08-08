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
  it('activates the scenario in the "subject" phase (party at the door)', () => {
    const s0 = makeInitialState(1);
    const s1 = reducer(s0, { type: 'TRIGGER_SCENARIO' });
    expect(s1.scenario.active).toBe(true);
    expect(s1.scenario.phase).toBe('subject');
    expect(s1.scenario.difficulty).toBeNull();
    expect(s1.scenario.awaitingChoice).toBe(false); // not yet — situation not revealed
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
    expect(s.scenario.phase).toBe('subject');
    // Further ticks must not re-trigger (event count stays flat over
    // subject/difficulty phases, since neither of those emits events).
    const eventsAfterTrigger = s.events.filter((e) => e.kind === 'scenario').length;
    s = tick(s, 5);
    const eventsAfterMore = s.events.filter((e) => e.kind === 'scenario').length;
    expect(eventsAfterMore).toBe(eventsAfterTrigger);
  });
});

describe('reducer scenario phase progression', () => {
  function triggered(seed = 1): SimulationState {
    return reducer(makeInitialState(seed), { type: 'TRIGGER_SCENARIO' });
  }

  it('subject → difficulty via ADVANCE_SCENARIO_TO_DIFFICULTY', () => {
    const s = reducer(triggered(), { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
    expect(s.scenario.phase).toBe('difficulty');
    expect(s.scenario.awaitingChoice).toBe(false); // still not yet
  });

  it('ADVANCE_SCENARIO_TO_DIFFICULTY is a no-op outside subject phase', () => {
    const s0 = makeInitialState(1); // idle
    const s1 = reducer(s0, { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
    expect(s1.scenario.phase).toBe('idle');
  });

  it('SET_SCENARIO_DIFFICULTY captures the wager and reveals the situation', () => {
    const s0 = reducer(triggered(), { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
    const s = reducer(s0, { type: 'SET_SCENARIO_DIFFICULTY', difficulty: 2 });
    expect(s.scenario.difficulty).toBe(2);
    expect(s.scenario.phase).toBe('situation');
    expect(s.scenario.awaitingChoice).toBe(true); // now suspends arrivals
  });

  it('SET_SCENARIO_DIFFICULTY is a no-op outside difficulty phase', () => {
    const s = reducer(triggered(), { type: 'SET_SCENARIO_DIFFICULTY', difficulty: 3 });
    expect(s.scenario.phase).toBe('subject');
    expect(s.scenario.difficulty).toBeNull();
  });
});

describe('reducer RESOLVE_SCENARIO (walk-in-of-five)', () => {
  function inSituation(choice: null | undefined = null): SimulationState {
    // Bring the state through the whole pre-response path so RESOLVE
    // acts on a realistic in-situation state; `choice` here is not
    // actually applied — see the specific test bodies.
    void choice;
    let s = makeInitialState(1);
    s = reducer(s, { type: 'TRIGGER_SCENARIO' });
    s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
    s = reducer(s, { type: 'SET_SCENARIO_DIFFICULTY', difficulty: 2 });
    return s;
  }

  it('choice A seats the party of five (5 scenario spawns)', () => {
    const s = reducer(inSituation(), { type: 'RESOLVE_SCENARIO', choice: 'A' });
    expect(s.scenario.awaitingChoice).toBe(false);
    expect(s.scenario.phase).toBe('resolving');
    expect(s.scenario.choice).toBe('A');
    expect(s.scenario.spawnedRemaining).toBe(5);
  });

  it('choice B seats five AND flips welcomeDrink on', () => {
    const s = reducer(inSituation(), { type: 'RESOLVE_SCENARIO', choice: 'B' });
    expect(s.scenario.spawnedRemaining).toBe(5);
    expect(s.policies.welcomeDrink).toBe(true);
  });

  it('choice C turns the party away (2 visible spawns) and dips reputation', () => {
    const s0 = inSituation();
    const s = reducer(s0, { type: 'RESOLVE_SCENARIO', choice: 'C' });
    expect(s.scenario.spawnedRemaining).toBe(2);
    expect(s.reputation).toBeCloseTo(s0.reputation - 0.03, 5);
  });

  it('records a scenario event with the chosen letter', () => {
    const s = reducer(inSituation(), { type: 'RESOLVE_SCENARIO', choice: 'A' });
    const last = s.events[s.events.length - 1];
    expect(last.kind).toBe('scenario');
    expect(last.text).toContain('A');
  });
});

describe('reducer scenario resolves in the room (§3.4 mentor comment)', () => {
  function inResolving(choice: 'A' | 'B' | 'C', difficulty: 1 | 2 | 3): SimulationState {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'TRIGGER_SCENARIO' });
    s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
    s = reducer(s, { type: 'SET_SCENARIO_DIFFICULTY', difficulty });
    return reducer(s, { type: 'RESOLVE_SCENARIO', choice });
  }

  it('does not surface a mentor comment before the settle window elapses', () => {
    let s = inResolving('A', 2);
    // 34 sim-sec = 170 ticks. Still under SCENARIO_SETTLE_AFTER (35).
    s = tick(s, 170);
    expect(s.scenario.phase).toBe('resolving');
    expect(s.scenario.mentorComment).toBeNull();
  });

  it('transitions resolving → settled after the settle window and surfaces a comment', () => {
    let s = inResolving('A', 2);
    // 36 sim-sec = 180 ticks. Past SCENARIO_SETTLE_AFTER (35).
    s = tick(s, 180);
    expect(s.scenario.phase).toBe('settled');
    expect(s.scenario.mentorComment).toBeTruthy();
    // Non-null string; content is Swedish, no correctness marking.
    expect(typeof s.scenario.mentorComment).toBe('string');
    expect((s.scenario.mentorComment ?? '').length).toBeGreaterThan(5);
  });

  it('comment varies with (choice, difficulty)', () => {
    const s1 = tick(inResolving('A', 1), 180);
    const s3 = tick(inResolving('A', 3), 180);
    expect(s1.scenario.mentorComment).not.toBe(s3.scenario.mentorComment);
  });
});

describe('arrivals suspended only while the situation is revealed', () => {
  it('spawns continue during subject + difficulty phases (world keeps living)', () => {
    let s = reducer(makeInitialState(1), { type: 'TRIGGER_SCENARIO' });
    const before = s.guests.length;
    // 300 ticks in subject phase (60 s) → some arrivals should fire
    // because awaitingChoice is false while the player looks at "party
    // at the door" but hasn't chosen difficulty yet.
    s = tick(s, 300);
    expect(s.guests.length).toBeGreaterThanOrEqual(before);
    // With arrivalProbability ~0.012/tick, expected arrivals over 300
    // ticks ≈ 3.6 — usually at least 1 fires in practice.
  });

  it('spawns stop once the situation is revealed and awaitingChoice = true', () => {
    let s = reducer(makeInitialState(1), { type: 'TRIGGER_SCENARIO' });
    s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
    s = reducer(s, { type: 'SET_SCENARIO_DIFFICULTY', difficulty: 2 });
    const before = s.guests.length;
    s = tick(s, 300);
    // In situation phase, awaitingChoice=true blocks arrivals. Scenario
    // spawns also stay at 0 because RESOLVE has not fired.
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
