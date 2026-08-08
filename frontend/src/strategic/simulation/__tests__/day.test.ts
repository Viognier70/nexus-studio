// ORDER 043 v3 step 1 — the round. Tests pin:
//   - initial day state
//   - OPEN_SERVICE guarded by expected phase (lunch from morning,
//     dinner from afternoon)
//   - SKIP_LUNCH advances morning → afternoon
//   - service length clamped to [3, 30] minutes
//   - scenario count is planned + weighted by service length
//   - auto-transitions in the tick loop:
//       lunch → afternoon at end of chosen length
//       dinner → evening at end of chosen length
//       evening → next-day morning after the close-pause
//   - scenariosPlanned cleared on transition
//   - dayNumber advances on evening → morning wrap
//
// All tests dispatch through the reducer — no direct state mutation.
// tick() below advances via TICK actions so tickDayTransitions runs.

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import { reducer, tickDayTransitions } from '../reducer';
import { planScenariosForService } from '../day';
import { createRng } from '../../util/rng';
import {
  SERVICE_LENGTH_MAX_MINUTES,
  SERVICE_LENGTH_MIN_MINUTES,
  type SimulationState
} from '../../types';

function tick(state: SimulationState, times = 1): SimulationState {
  let next = state;
  for (let i = 0; i < times; i++) {
    next = reducer(next, { type: 'TICK', dt: 1 / 5 });
  }
  return next;
}

describe('ORDER 043 v3 initial day state', () => {
  it('begins day 1 in the morning with no service length + no plan', () => {
    const s = makeInitialState(1);
    expect(s.day.dayNumber).toBe(1);
    expect(s.day.period).toBe('morning');
    expect(s.day.periodStartAt).toBe(0);
    expect(s.day.currentServiceLengthMinutes).toBeNull();
    expect(s.day.scenariosPlanned).toBe(0);
    expect(s.day.scenariosFiredThisService).toBe(0);
  });
});

describe('planScenariosForService (weighted by length)', () => {
  it('returns 0 for a zero-length service', () => {
    const rng = createRng(1);
    expect(planScenariosForService(0, rng)).toBe(0);
  });

  it('produces a mean count that scales with length across seeds', () => {
    const count = (mins: number) => {
      const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
      const total = seeds.reduce((sum, seed) => {
        return sum + planScenariosForService(mins, createRng(seed));
      }, 0);
      return total / seeds.length;
    };
    const short = count(3);
    const medium = count(10);
    const long = count(30);
    expect(medium).toBeGreaterThan(short);
    expect(long).toBeGreaterThan(medium);
    // Density = 0.1 per minute — long service should average roughly
    // 3 scenarios (±60 % variance).
    expect(long).toBeGreaterThan(2);
    expect(long).toBeLessThan(6);
  });

  it('never returns a negative count', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const mins of [1, 3, 7, 15, 30]) {
        expect(planScenariosForService(mins, createRng(seed))).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('OPEN_SERVICE — lunch from morning, dinner from afternoon', () => {
  it('opens lunch from morning: period, periodStartAt, length, plan', () => {
    let s = makeInitialState(1);
    s = tick(s, 10); // advance simTime a little
    const openedAt = s.simTime;
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 10 });
    expect(s.day.period).toBe('lunch');
    expect(s.day.periodStartAt).toBe(openedAt);
    expect(s.day.currentServiceLengthMinutes).toBe(10);
    expect(s.day.scenariosPlanned).toBeGreaterThanOrEqual(0);
    expect(s.day.scenariosFiredThisService).toBe(0);
  });

  it('OPEN_SERVICE lunch is a no-op from any phase other than morning', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 5 });
    // Now in lunch. Attempting to re-open lunch is a no-op.
    const before = s.day;
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
    expect(s.day).toBe(before);
  });

  it('OPEN_SERVICE dinner is a no-op from morning', () => {
    const s0 = makeInitialState(1);
    const s = reducer(s0, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 10 });
    expect(s.day).toBe(s0.day);
  });

  it('clamps service length to [3, 30] minutes', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 1 });
    expect(s.day.currentServiceLengthMinutes).toBe(SERVICE_LENGTH_MIN_MINUTES);
    // fresh morning for the second clamp
    s = makeInitialState(2);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 100 });
    expect(s.day.currentServiceLengthMinutes).toBe(SERVICE_LENGTH_MAX_MINUTES);
  });
});

describe('SKIP_LUNCH', () => {
  it('advances morning → afternoon without a service', () => {
    let s = makeInitialState(1);
    s = tick(s, 5);
    const skippedAt = s.simTime;
    s = reducer(s, { type: 'SKIP_LUNCH' });
    expect(s.day.period).toBe('afternoon');
    expect(s.day.periodStartAt).toBe(skippedAt);
    expect(s.day.currentServiceLengthMinutes).toBeNull();
    expect(s.day.scenariosPlanned).toBe(0);
  });

  it('is a no-op outside morning', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 5 });
    const before = s.day;
    s = reducer(s, { type: 'SKIP_LUNCH' });
    expect(s.day).toBe(before);
  });

  it('afternoon → dinner picks up via OPEN_SERVICE dinner', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    expect(s.day.period).toBe('afternoon');
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 });
    expect(s.day.period).toBe('dinner');
    expect(s.day.currentServiceLengthMinutes).toBe(15);
  });
});

describe('automatic tick transitions', () => {
  it('lunch → afternoon when chosen length elapses', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 3 });
    // 3 min = 180 sim-sec = 900 ticks. Advance ~1 sim-sec short.
    s = tick(s, 895);
    expect(s.day.period).toBe('lunch');
    // Cross the boundary — a handful more ticks to absorb float drift.
    s = tick(s, 20);
    expect(s.day.period).toBe('afternoon');
    expect(s.day.currentServiceLengthMinutes).toBeNull();
    expect(s.day.scenariosPlanned).toBe(0);
  });

  it('dinner → evening when chosen length elapses', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 3 });
    s = tick(s, 920); // ~184 sim-sec, past 180
    expect(s.day.period).toBe('evening');
    expect(s.day.currentServiceLengthMinutes).toBeNull();
  });

  it('evening → next day morning after the close pause', () => {
    let s = makeInitialState(1);
    s = reducer(s, { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 3 });
    s = tick(s, 920);
    expect(s.day.period).toBe('evening');
    const eveningDayNumber = s.day.dayNumber;
    // 15-sec close pause = 75 ticks. Add a few for slack.
    s = tick(s, 90);
    expect(s.day.period).toBe('morning');
    expect(s.day.dayNumber).toBe(eveningDayNumber + 1);
    expect(s.day.currentServiceLengthMinutes).toBeNull();
    expect(s.day.scenariosPlanned).toBe(0);
  });

  it('morning does NOT auto-advance without a player action', () => {
    let s = makeInitialState(1);
    // Sit in morning for an hour of sim-time.
    s = tick(s, 18000); // 3600 sim-sec
    expect(s.day.period).toBe('morning');
    expect(s.day.dayNumber).toBe(1);
  });

  it('afternoon does NOT auto-advance without a player action', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    s = tick(s, 18000);
    expect(s.day.period).toBe('afternoon');
  });
});

describe('scenario planning determinism', () => {
  it('same seed + same length → same scenariosPlanned', () => {
    const s1 = reducer(makeInitialState(42), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 20
    });
    const s2 = reducer(makeInitialState(42), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 20
    });
    expect(s1.day.scenariosPlanned).toBe(s2.day.scenariosPlanned);
  });
});

describe('tickDayTransitions helper is idle in resting phases', () => {
  it('returns the same state reference when nothing needs to change', () => {
    const s = makeInitialState(1);
    expect(tickDayTransitions(s)).toBe(s);
  });
});

describe('period gate — arrivals only fire during a running service', () => {
  // ORDER 043 v3 §2 period gate: morning / afternoon / evening are
  // closed windows. The tick loop keeps running (staff / timers / day
  // transitions), but no ambient guest may spawn. Enforced here at the
  // integration level: run the sim through a period for a long time
  // and assert no guests appeared.
  it('morning produces no arrivals over an hour of sim-time', () => {
    let s = makeInitialState(7);
    // 3600 sim-sec = 18000 ticks. Morning does not auto-advance.
    s = tick(s, 18000);
    expect(s.day.period).toBe('morning');
    expect(s.guests.length).toBe(0);
  });

  it('afternoon produces no arrivals over an hour of sim-time', () => {
    let s = reducer(makeInitialState(7), { type: 'SKIP_LUNCH' });
    expect(s.day.period).toBe('afternoon');
    s = tick(s, 18000);
    expect(s.day.period).toBe('afternoon');
    expect(s.guests.length).toBe(0);
  });

  it('lunch produces arrivals during the service window', () => {
    let s = reducer(makeInitialState(7), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 5
    });
    // 5 min = 300 sim-sec = 1500 ticks. Stop just short of the close.
    s = tick(s, 1400);
    expect(s.day.period).toBe('lunch');
    expect(s.guests.length).toBeGreaterThan(0);
  });

  it('dinner produces arrivals during the service window', () => {
    let s = reducer(makeInitialState(7), { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 5
    });
    s = tick(s, 1400);
    expect(s.day.period).toBe('dinner');
    expect(s.guests.length).toBeGreaterThan(0);
  });
});
