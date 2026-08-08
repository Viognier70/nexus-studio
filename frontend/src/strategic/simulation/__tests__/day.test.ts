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
    // Density = 0.15 per minute — long service should average roughly
    // 4.5 scenarios (±60 % variance).
    expect(long).toBeGreaterThan(3);
    expect(long).toBeLessThan(7);
  });

  it('always fires at least one scenario for any positive length', () => {
    // Cycle-1 floor (v3 §10 step 3 retune): every service the player
    // opens must be a decision surface — a 3-minute service that closes
    // with zero scenarios is a no-op window that reads to the player
    // as "why did I bother." Assert the floor across every seed.
    for (let seed = 1; seed <= 40; seed++) {
      for (const mins of [1, 3, 5, 7, 15, 30]) {
        expect(
          planScenariosForService(mins, createRng(seed))
        ).toBeGreaterThanOrEqual(1);
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

// ORDER 043 v3 §5.1 — the invariant that keeps dinner's queue a
// reading and not noise: peak queue length must grow monotonically as
// social capital falls. Vision Owner (2026-08-08): "det är den enda
// invariant som gör kön till en avläsning i stället för brus, och den
// ska inte kunna glida bort i en framtida omställning."
//
// Method: simulate a full 10-min dinner service at five social values
// [1.0, 0.7, 0.5, 0.3, 0.0] across N seeds. Track max waitingIds.length
// per run, average across seeds per social value, assert the averaged
// series is non-decreasing as social drops. Ties are allowed (small
// samples land close together at adjacent points) but strict decreases
// are not — a downtick means the retune has broken the reading.
describe('dinner queue grows monotonically as social falls (regression)', () => {
  function simulateDinnerPeakQueue(seed: number, socialValue: number): number {
    let s = reducer(makeInitialState(seed), { type: 'SKIP_LUNCH' });
    s = reducer(s, { type: 'SET_CAPITAL', capital: 'social', value: socialValue });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    let peak = 0;
    // 10 min = 600 sim-sec = 3000 ticks; stop just short of close.
    for (let i = 0; i < 2900; i++) {
      s = reducer(s, { type: 'TICK', dt: 1 / 5 });
      if (s.waitingIds.length > peak) peak = s.waitingIds.length;
    }
    return peak;
  }

  it('peak queue grows as social drops (1.0 → 0.7 → 0.5 → 0.3 → 0.0)', () => {
    const socials = [1.0, 0.7, 0.5, 0.3, 0.0];
    const seeds = [11, 22, 33, 44, 55, 66, 77, 88];
    const meanPeak = socials.map((sv) => {
      const total = seeds.reduce(
        (sum, seed) => sum + simulateDinnerPeakQueue(seed, sv),
        0
      );
      return total / seeds.length;
    });

    // Assert monotonic non-decreasing across the social series.
    for (let i = 1; i < meanPeak.length; i++) {
      expect(
        meanPeak[i],
        `peak queue at social=${socials[i]} (${meanPeak[i]}) should be >= peak at social=${socials[i - 1]} (${meanPeak[i - 1]})`
      ).toBeGreaterThanOrEqual(meanPeak[i - 1]);
    }
    // Endpoint sanity: high-social dinner should have a small peak,
    // low-social dinner should have a visibly larger peak. Guards
    // against a degenerate all-equal series (which would pass the
    // monotonic check but tell us nothing).
    expect(meanPeak[meanPeak.length - 1]).toBeGreaterThan(meanPeak[0]);
  });
});
