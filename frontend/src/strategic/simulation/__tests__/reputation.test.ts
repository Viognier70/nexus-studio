// ORDER 043 v3 §4 reputation loop — invariants pinned:
//   * reputationArrivalMultiplier maps [0, 1] → [0.6, 1.4] linearly
//   * arrivalProbability strictly increases with reputation
//   * queue-strain drift is off during closed periods, on during service
//   * give-up event costs GIVE_UP_COST
//   * happy departure gains, unhappy departure loses, mediocre is neutral
//   * a bad service (low social + long queue) visibly moves reputation
//     down; a good service (high social + no queue + happy departures)
//     does not decay it

import { describe, expect, it } from 'vitest';
import {
  arrivalProbability,
  reputationArrivalMultiplier
} from '../arrivals';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import {
  GIVE_UP_COST,
  HAPPY_GAIN,
  QUEUE_STRAIN_THRESHOLD,
  UNHAPPY_COST,
  applyReputationDelta,
  reputationEventDeparture,
  reputationEventGiveUp,
  tickReputationDrift
} from '../reputation';
import type { DayPeriod, SimulationState } from '../../types';

function stateWithPeriod(seed: number, period: DayPeriod): SimulationState {
  const s = makeInitialState(seed);
  s.day = { ...s.day, period };
  return s;
}

describe('reputationArrivalMultiplier', () => {
  it('is 0.6 at reputation = 0', () => {
    expect(reputationArrivalMultiplier(0)).toBeCloseTo(0.6, 10);
  });

  it('is 1.4 at reputation = 1', () => {
    expect(reputationArrivalMultiplier(1)).toBeCloseTo(1.4, 10);
  });

  it('is monotonically increasing across [0, 1]', () => {
    let last = -Infinity;
    for (let v = 0; v <= 1; v += 0.05) {
      const m = reputationArrivalMultiplier(v);
      expect(m).toBeGreaterThanOrEqual(last);
      last = m;
    }
  });

  it('clamps out-of-range inputs', () => {
    expect(reputationArrivalMultiplier(-1)).toBeCloseTo(0.6, 10);
    expect(reputationArrivalMultiplier(2)).toBeCloseTo(1.4, 10);
  });
});

describe('arrivalProbability responds to reputation', () => {
  it('strong reputation attracts more arrivals than weak', () => {
    const strong = stateWithPeriod(1, 'dinner');
    strong.reputation = 1.0;
    const weak = stateWithPeriod(1, 'dinner');
    weak.reputation = 0.0;
    expect(arrivalProbability(strong)).toBeGreaterThan(arrivalProbability(weak));
    // Ratio should be 1.4 / 0.6 ≈ 2.33
    expect(arrivalProbability(strong) / arrivalProbability(weak)).toBeCloseTo(
      1.4 / 0.6,
      3
    );
  });
});

describe('applyReputationDelta clamps into [0, 1]', () => {
  it('does not exceed 1', () => {
    const s = makeInitialState(1);
    s.reputation = 0.98;
    applyReputationDelta(s, 0.5);
    expect(s.reputation).toBe(1);
  });

  it('does not fall below 0', () => {
    const s = makeInitialState(1);
    s.reputation = 0.02;
    applyReputationDelta(s, -0.5);
    expect(s.reputation).toBe(0);
  });
});

describe('tickReputationDrift', () => {
  it('is a no-op during morning / afternoon / evening (closed windows)', () => {
    for (const period of ['morning', 'afternoon', 'evening'] as const) {
      const s = stateWithPeriod(1, period);
      s.reputation = 0.6;
      // Even with a saturated waiting queue, drift should not fire when
      // the doors are closed.
      s.waitingIds = ['g1', 'g2', 'g3', 'g4', 'g5'];
      tickReputationDrift(s);
      expect(s.reputation).toBe(0.6);
    }
  });

  it('drifts reputation down during service when queue exceeds threshold', () => {
    const s = stateWithPeriod(1, 'dinner');
    s.reputation = 0.6;
    // Queue length above threshold.
    s.waitingIds = Array.from(
      { length: QUEUE_STRAIN_THRESHOLD + 2 },
      (_, i) => `g${i}`
    );
    tickReputationDrift(s);
    expect(s.reputation).toBeLessThan(0.6);
  });

  it('does not drift when queue is at or below threshold', () => {
    const s = stateWithPeriod(1, 'dinner');
    s.reputation = 0.6;
    s.waitingIds = Array.from(
      { length: QUEUE_STRAIN_THRESHOLD },
      (_, i) => `g${i}`
    );
    // No team strain either (no active guests).
    tickReputationDrift(s);
    expect(s.reputation).toBe(0.6);
  });
});

describe('per-event reputation changes', () => {
  it('reputationEventGiveUp subtracts GIVE_UP_COST', () => {
    const s = makeInitialState(1);
    s.reputation = 0.6;
    reputationEventGiveUp(s);
    expect(s.reputation).toBeCloseTo(0.6 - GIVE_UP_COST, 10);
  });

  it('happy departure (satisfaction >= 0.75) adds HAPPY_GAIN', () => {
    const s = makeInitialState(1);
    s.reputation = 0.6;
    reputationEventDeparture(s, 0.9);
    expect(s.reputation).toBeCloseTo(0.6 + HAPPY_GAIN, 10);
  });

  it('unhappy departure (satisfaction <= 0.35) subtracts UNHAPPY_COST', () => {
    const s = makeInitialState(1);
    s.reputation = 0.6;
    reputationEventDeparture(s, 0.2);
    expect(s.reputation).toBeCloseTo(0.6 - UNHAPPY_COST, 10);
  });

  it('mediocre departure (satisfaction in [0.35, 0.75]) is neutral', () => {
    const s = makeInitialState(1);
    s.reputation = 0.6;
    reputationEventDeparture(s, 0.5);
    expect(s.reputation).toBe(0.6);
  });
});

describe('loop integration — a bad service visibly moves reputation', () => {
  // A weak-social dinner produces long queues and unhappy departures;
  // both channels should push reputation down. This is the smallest
  // end-to-end shape check of the loop the order specifies.
  it('social=0 dinner drops reputation more than social=1 dinner', () => {
    const runService = (socialValue: number): number => {
      let s = reducer(makeInitialState(7), { type: 'SKIP_LUNCH' });
      s = reducer(s, {
        type: 'SET_CAPITAL',
        capital: 'social',
        value: socialValue
      });
      const repBefore = s.reputation;
      s = reducer(s, {
        type: 'OPEN_SERVICE',
        service: 'dinner',
        lengthMinutes: 10
      });
      // 10 min × 60 sec × 5 ticks/sec = 3000 ticks.
      for (let i = 0; i < 3000; i++) {
        s = reducer(s, { type: 'TICK', dt: 0.2 });
      }
      return s.reputation - repBefore;
    };

    const weak = runService(0);
    const strong = runService(1);
    // Strong-social service should end with reputation as high or
    // higher than a weak-social service. Not asserting a specific
    // magnitude — the invariant is directional.
    expect(strong).toBeGreaterThan(weak);
  });
});
