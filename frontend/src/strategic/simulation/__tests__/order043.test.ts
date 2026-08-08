// ORDER 043 Phase A tests — state model + reducer wiring for the
// two-layer capital model. Written to the report gate in §10:
// state model + reducer wiring, before scenarios, wager UI, or
// consequence-event integration.
//
// The `serialisability` block below is the concrete pinning of the
// LEARNING_AND_SCENARIO_ARCHITECTURE.md §11.1 constraint 5 handling
// documented in the Phase A report — every new field must survive a
// JSON round-trip without loss, so the portfolio format doesn't need
// a special serialiser later.

import { describe, expect, it } from 'vitest';
import {
  INITIAL_CAPITAL_VALUE,
  initialCapitals,
  initialEnablerRecord,
  initialEnablers,
  makeInitialState
} from '../model';
import { WAGER_UNIT_STAKE, reducer } from '../reducer';
import type { EnablerKey, SustainabilityKey } from '../../types';

const SUSTAINABILITIES: readonly SustainabilityKey[] = [
  'economic',
  'social',
  'ecological'
];
const ENABLERS: readonly EnablerKey[] = ['scientific', 'cultural'];

describe('ORDER 043 initial state', () => {
  const s = makeInitialState(1);

  it('has all three sustainabilities at INITIAL_CAPITAL_VALUE', () => {
    for (const k of SUSTAINABILITIES) {
      expect(s.capitals.values[k]).toBe(INITIAL_CAPITAL_VALUE);
    }
  });

  it('has both enablers zeroed with empty history', () => {
    for (const k of ENABLERS) {
      const r = s.enablers[k];
      expect(r.episteme).toBe(0);
      expect(r.techne).toBe(0);
      expect(r.phronesis).toBe(0);
      expect(r.history).toEqual([]);
    }
  });

  it('has no standing wager', () => {
    expect(s.wager).toBeNull();
  });

  it('has no consequence events yet', () => {
    expect(s.consequenceEvents).toEqual([]);
  });

  it('has empty wager and theme histories', () => {
    expect(s.capitals.wagerHistory).toEqual([]);
    expect(s.capitals.themeHistory).toEqual([]);
  });

  it('initialCapitals() and initialEnablers() return fresh objects', () => {
    // Prevents accidental shared-reference bugs across sessions.
    const a = initialCapitals();
    const b = initialCapitals();
    expect(a).not.toBe(b);
    expect(a.values).not.toBe(b.values);
    expect(a.wagerHistory).not.toBe(b.wagerHistory);
    expect(a.themeHistory).not.toBe(b.themeHistory);

    const ea = initialEnablers();
    const eb = initialEnablers();
    expect(ea).not.toBe(eb);
    expect(ea.scientific).not.toBe(eb.scientific);
    expect(ea.scientific.history).not.toBe(eb.scientific.history);
  });
});

describe('ORDER 043 PLACE_WAGER + CLEAR_WAGER', () => {
  it('PLACE_WAGER stores the capital, simTime, and the fixed unit stake', () => {
    const s0 = makeInitialState(1);
    const s = reducer(s0, { type: 'PLACE_WAGER', capital: 'social' });
    expect(s.wager).not.toBeNull();
    expect(s.wager?.capital).toBe('social');
    expect(s.wager?.amount).toBe(WAGER_UNIT_STAKE);
    expect(s.wager?.placedAt).toBe(s0.simTime);
  });

  it('PLACE_WAGER replaces a prior standing wager rather than stacking', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'PLACE_WAGER', capital: 'social' });
    s = reducer(s, { type: 'PLACE_WAGER', capital: 'ecological' });
    expect(s.wager?.capital).toBe('ecological');
  });

  it('CLEAR_WAGER returns to no standing wager', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'PLACE_WAGER', capital: 'economic' });
    s = reducer(s, { type: 'CLEAR_WAGER' });
    expect(s.wager).toBeNull();
  });

  it('PLACE_WAGER on all three capitals in turn all succeed', () => {
    let s = makeInitialState(1);
    for (const k of SUSTAINABILITIES) {
      s = reducer(s, { type: 'PLACE_WAGER', capital: k });
      expect(s.wager?.capital).toBe(k);
    }
  });
});

describe('ORDER 043 RECORD_ENABLER_EVENT', () => {
  it('appends an event to the history and bumps the derived tally', () => {
    const s0 = makeInitialState(1);
    const s = reducer(s0, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'scientific',
      register: 'techne',
      amount: 0.05,
      scenarioId: 'walk-in-of-five'
    });
    expect(s.enablers.scientific.techne).toBe(0.05);
    expect(s.enablers.scientific.history).toHaveLength(1);
    const evt = s.enablers.scientific.history[0];
    expect(evt.register).toBe('techne');
    expect(evt.amount).toBe(0.05);
    expect(evt.scenarioId).toBe('walk-in-of-five');
    expect(evt.at).toBe(s0.simTime);
  });

  it('only touches the enabler + register named in the action', () => {
    let s = makeInitialState(1);
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'scientific',
      register: 'phronesis',
      amount: 0.1,
      scenarioId: null
    });
    expect(s.enablers.scientific.phronesis).toBe(0.1);
    expect(s.enablers.scientific.techne).toBe(0);
    expect(s.enablers.scientific.episteme).toBe(0);
    expect(s.enablers.cultural).toEqual(initialEnablerRecord());
  });

  it('clamps amount to [0, 1] — no negative writes, no runaway positives', () => {
    let s = makeInitialState(1);
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'cultural',
      register: 'episteme',
      amount: -0.5,
      scenarioId: null
    });
    // Negative amount is a no-op; nothing changes.
    expect(s.enablers.cultural.episteme).toBe(0);
    expect(s.enablers.cultural.history).toEqual([]);
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'cultural',
      register: 'episteme',
      amount: 5,
      scenarioId: null
    });
    // Amount clamped to 1.0; single event recorded at the clamped value.
    expect(s.enablers.cultural.episteme).toBe(1);
    expect(s.enablers.cultural.history).toHaveLength(1);
    expect(s.enablers.cultural.history[0].amount).toBe(1);
  });

  it('successive writes accumulate on the tally and the history', () => {
    let s = makeInitialState(1);
    for (let i = 0; i < 4; i++) {
      s = reducer(s, {
        type: 'RECORD_ENABLER_EVENT',
        enabler: 'scientific',
        register: 'techne',
        amount: 0.05,
        scenarioId: `scenario-${i}`
      });
    }
    expect(s.enablers.scientific.techne).toBeCloseTo(0.20, 5);
    expect(s.enablers.scientific.history).toHaveLength(4);
    // History entries preserve their scenarioId — the portfolio primary.
    const scenarioIds = s.enablers.scientific.history.map((h) => h.scenarioId);
    expect(scenarioIds).toEqual(['scenario-0', 'scenario-1', 'scenario-2', 'scenario-3']);
  });

  it('derived tally always equals the sum of history amounts for its register', () => {
    // Invariant per §8: the tally is derived; the log is authoritative.
    // If they diverge, the portfolio and the on-screen state disagree.
    let s = makeInitialState(1);
    const writes: Array<{ register: 'episteme' | 'techne' | 'phronesis'; amount: number }> = [
      { register: 'episteme', amount: 0.03 },
      { register: 'techne', amount: 0.07 },
      { register: 'phronesis', amount: 0.11 },
      { register: 'techne', amount: 0.02 },
      { register: 'phronesis', amount: 0.05 }
    ];
    for (const w of writes) {
      s = reducer(s, {
        type: 'RECORD_ENABLER_EVENT',
        enabler: 'cultural',
        register: w.register,
        amount: w.amount,
        scenarioId: null
      });
    }
    for (const register of ['episteme', 'techne', 'phronesis'] as const) {
      const sumFromHistory = s.enablers.cultural.history
        .filter((h) => h.register === register)
        .reduce((n, h) => n + h.amount, 0);
      expect(s.enablers.cultural[register]).toBeCloseTo(sumFromHistory, 10);
    }
  });
});

describe('ORDER 043 §11.1 portability contract', () => {
  it('the whole state round-trips through JSON without loss', () => {
    // §11.1 constraint 5 (portfolio portable): no field may use a type
    // that doesn't survive JSON.stringify + JSON.parse. If a Map, a
    // Set, a function, or a ref cycle sneaks in, this fails.
    let s = makeInitialState(1);
    s = reducer(s, { type: 'PLACE_WAGER', capital: 'social' });
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'scientific',
      register: 'techne',
      amount: 0.08,
      scenarioId: 'test-scenario'
    });
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'cultural',
      register: 'phronesis',
      amount: 0.12,
      scenarioId: 'test-scenario'
    });
    const json = JSON.stringify(s);
    const restored = JSON.parse(json);
    // Deep-equal on the round trip catches any lost type.
    expect(restored.capitals).toEqual(s.capitals);
    expect(restored.enablers).toEqual(s.enablers);
    expect(restored.wager).toEqual(s.wager);
    expect(restored.consequenceEvents).toEqual(s.consequenceEvents);
  });

  it('all wager and enabler-event timestamps use simTime, not Date.now', () => {
    // §11.1 constraint 4 (time-independent of player logged-in state):
    // real-world timestamps in state would foreclose that. simTime is a
    // seed-reconstructible sim-seconds counter; it survives session
    // resume. Guard by asserting that placedAt / at match simTime.
    const s0 = makeInitialState(1);
    // Advance simTime a few ticks so 0 vs Date.now can't accidentally match.
    let s = s0;
    for (let i = 0; i < 5; i++) s = reducer(s, { type: 'TICK', dt: 1 / 5 });
    const simTimeThen = s.simTime;
    s = reducer(s, { type: 'PLACE_WAGER', capital: 'ecological' });
    expect(s.wager?.placedAt).toBe(simTimeThen);
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'scientific',
      register: 'episteme',
      amount: 0.01,
      scenarioId: null
    });
    const evt = s.enablers.scientific.history[0];
    expect(evt.at).toBe(simTimeThen);
  });
});

describe('ORDER 043 RESET behaviour', () => {
  it('RESET returns capitals, enablers, wager, consequence events to initial', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'PLACE_WAGER', capital: 'social' });
    s = reducer(s, {
      type: 'RECORD_ENABLER_EVENT',
      enabler: 'scientific',
      register: 'techne',
      amount: 0.4,
      scenarioId: 'x'
    });
    s = reducer(s, { type: 'RESET' });
    expect(s.wager).toBeNull();
    expect(s.capitals).toEqual(initialCapitals());
    expect(s.enablers).toEqual(initialEnablers());
    expect(s.consequenceEvents).toEqual([]);
  });
});
