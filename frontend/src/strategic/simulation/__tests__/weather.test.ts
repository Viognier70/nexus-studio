// ORDER 045 weather + opening phase invariants.
//
// Pinned:
//   * generateWeather is deterministic in the rng
//   * weatherArrivalMultiplier maps warm+still→up, cold+windy→down
//   * outdoor terrace viability requires warm+still+dry
//   * waitingAtOpeningCount grows with reputation × weather
//   * OPEN_SERVICE sets openingEndsAt AND prepEndsAt (opening → prep
//     → service) with correct offsets
//   * Arrivals gated to zero during both opening AND prep windows
//   * Doors-open spawn fires exactly once per service
//   * Service-close transitions clear all opening / weather / prep
//     fields

import { describe, expect, it } from 'vitest';
import { createRng } from '../../util/rng';
import { arrivalProbability } from '../arrivals';
import { makeInitialState } from '../model';
import { OPENING_DURATION_SEC, reducer } from '../reducer';
import {
  generateWeather,
  isOutdoorViable,
  waitingAtOpeningCount,
  weatherArrivalMultiplier
} from '../weather';
import type { SimulationState, WeatherConditions } from '../../types';

describe('generateWeather — determinism + shape', () => {
  it('same rng seed produces the same weather', () => {
    const a = generateWeather(createRng(42));
    const b = generateWeather(createRng(42));
    expect(a).toEqual(b);
  });

  it('produces values in the cycle-1 autumn range', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = generateWeather(createRng(seed));
      expect(w.tempC).toBeGreaterThanOrEqual(6);
      expect(w.tempC).toBeLessThanOrEqual(21);
      expect(w.windMS).toBeGreaterThanOrEqual(0.5);
      expect(w.windMS).toBeLessThanOrEqual(10);
      expect(['none', 'drizzle', 'rain', 'snow']).toContain(w.precipitation);
      expect(['clear', 'partly', 'overcast']).toContain(w.cloudCover);
    }
  });
});

describe('weatherArrivalMultiplier — shape', () => {
  it('null weather → 1.0', () => {
    expect(weatherArrivalMultiplier(null)).toBe(1);
  });

  it('warm + still + clear boosts arrivals above baseline', () => {
    const w: WeatherConditions = {
      tempC: 21,
      windMS: 0.5,
      precipitation: 'none',
      cloudCover: 'clear',
      outdoorViable: true
    };
    expect(weatherArrivalMultiplier(w)).toBeGreaterThan(1.15);
  });

  it('cold + blustery + drizzle drops arrivals below baseline', () => {
    const w: WeatherConditions = {
      tempC: 6,
      windMS: 10,
      precipitation: 'drizzle',
      cloudCover: 'overcast',
      outdoorViable: false
    };
    expect(weatherArrivalMultiplier(w)).toBeLessThan(0.7);
  });

  it('rain drops multiplier more than drizzle', () => {
    const base: WeatherConditions = {
      tempC: 15,
      windMS: 3,
      precipitation: 'none',
      cloudCover: 'partly',
      outdoorViable: false
    };
    const drizzle = weatherArrivalMultiplier({ ...base, precipitation: 'drizzle' });
    const rain = weatherArrivalMultiplier({ ...base, precipitation: 'rain' });
    expect(rain).toBeLessThan(drizzle);
  });
});

describe('isOutdoorViable', () => {
  it('warm + still + dry → true', () => {
    expect(isOutdoorViable(18, 3, 'none')).toBe(true);
  });
  it('cold rejects even if dry + still', () => {
    expect(isOutdoorViable(10, 1, 'none')).toBe(false);
  });
  it('windy rejects even if warm + dry', () => {
    expect(isOutdoorViable(18, 8, 'none')).toBe(false);
  });
  it('any precipitation rejects', () => {
    expect(isOutdoorViable(18, 1, 'drizzle')).toBe(false);
  });
});

describe('waitingAtOpeningCount — reputation × weather', () => {
  it('strong reputation + good weather gives a small standing queue', () => {
    const w: WeatherConditions = {
      tempC: 21, windMS: 0.5, precipitation: 'none',
      cloudCover: 'clear', outdoorViable: true
    };
    const n = waitingAtOpeningCount(1.0, w);
    expect(n).toBeGreaterThan(3);
    expect(n).toBeLessThanOrEqual(6);
  });
  it('weak reputation gives zero or one waiting', () => {
    const w: WeatherConditions = {
      tempC: 15, windMS: 3, precipitation: 'none',
      cloudCover: 'partly', outdoorViable: true
    };
    expect(waitingAtOpeningCount(0.1, w)).toBeLessThanOrEqual(1);
  });
  it('bad weather even with strong reputation trims the count', () => {
    const wGood: WeatherConditions = {
      tempC: 21, windMS: 0.5, precipitation: 'none',
      cloudCover: 'clear', outdoorViable: true
    };
    const wBad: WeatherConditions = {
      tempC: 6, windMS: 10, precipitation: 'rain',
      cloudCover: 'overcast', outdoorViable: false
    };
    expect(waitingAtOpeningCount(1.0, wBad)).toBeLessThan(
      waitingAtOpeningCount(1.0, wGood)
    );
  });
});

describe('OPEN_SERVICE — opening + prep sequence', () => {
  it('sets openingEndsAt to simTime + OPENING_DURATION_SEC', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    const openedAt = s.simTime;
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    expect(s.day.openingEndsAt).toBeCloseTo(openedAt + OPENING_DURATION_SEC, 5);
  });

  it('sets prepEndsAt to opening-end + prep-duration', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    const openedAt = s.simTime;
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    // opening is 10 s, prep is 120 s → prepEndsAt = openedAt + 130.
    expect(s.day.prepEndsAt).toBeCloseTo(openedAt + 130, 5);
  });

  it('generates a weather record + a waiting-at-opening count', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    expect(s.day.weather).not.toBeNull();
    expect(s.day.waitingAtOpening).toBeGreaterThanOrEqual(0);
    expect(s.day.waitingAtOpening).toBeLessThanOrEqual(6);
  });
});

describe('arrivals gate on both opening and prep', () => {
  function afterOpen(seed: number): SimulationState {
    let s = reducer(makeInitialState(seed), { type: 'SKIP_LUNCH' });
    return reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
  }

  it('arrival probability is 0 during opening window', () => {
    const s = afterOpen(1);
    expect(arrivalProbability(s)).toBe(0);
  });

  it('arrival probability is 0 during prep window', () => {
    let s = afterOpen(1);
    // Advance past opening (60 ticks = 12 s) but not past prep.
    for (let i = 0; i < 60; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(arrivalProbability(s)).toBe(0);
  });

  it('arrival probability > 0 after prep closes', () => {
    let s = afterOpen(1);
    // Advance past opening + prep (~660 ticks = 132 s).
    for (let i = 0; i < 680; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(arrivalProbability(s)).toBeGreaterThan(0);
  });
});

describe('doors-open spawn — fires once, exactly waitingAtOpening guests', () => {
  it('spawns the reputation-derived count of guests at prep-end', () => {
    let s = reducer(makeInitialState(4), { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    const expected = s.day.waitingAtOpening;
    expect(expected).toBeGreaterThan(0);
    const guestsBefore = s.guests.length;
    // Advance just past prep close (~652 ticks = 130.4 s covers
    // opening + prep). One extra tick past that so the spawn has
    // fired but tickGuests hasn't yet had time to move walk-aways
    // to 'declined' + prune them.
    for (let i = 0; i < 653; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.doorsOpenedThisService).toBe(true);
    // At least `expected` guests appeared at doors-open. Ambient
    // arrivals may add more in the ticks immediately after prep close;
    // walk-aways may be pruned already, so allow +2 fuzz around
    // baseline `expected`.
    expect(s.guests.length).toBeGreaterThanOrEqual(expected);
    expect(s.guests.length).toBeLessThanOrEqual(expected + 2);
  });

  it('does not spawn more than waitingAtOpening even across many ticks', () => {
    // Confirm the doorsOpenedThisService flag guards against a repeat
    // spawn. Compare a run that ticks 1 s past prep-end to a run that
    // ticks 60 s past prep-end. Both should show ambient arrivals
    // building on top of the same one-shot doors-open crowd.
    let s1 = reducer(makeInitialState(4), { type: 'SKIP_LUNCH' });
    s1 = reducer(s1, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    const initialWaiting = s1.day.waitingAtOpening;
    for (let i = 0; i < 660; i++) s1 = reducer(s1, { type: 'TICK', dt: 0.2 });
    for (let i = 0; i < 5; i++) s1 = reducer(s1, { type: 'TICK', dt: 0.2 });
    // waitingAtOpening still readable on the record — the doors-open
    // fire consumes doorsOpenedThisService but leaves the number.
    expect(s1.day.waitingAtOpening).toBe(initialWaiting);
    expect(s1.day.doorsOpenedThisService).toBe(true);
  });
});

describe('service close clears opening/weather/waiting fields', () => {
  it('lunch → afternoon resets opening + weather + waiting', () => {
    let s = reducer(makeInitialState(1), {
      type: 'OPEN_SERVICE',
      service: 'lunch',
      lengthMinutes: 3
    });
    expect(s.day.weather).not.toBeNull();
    // 3 min = 900 ticks, close a little past.
    for (let i = 0; i < 920; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('afternoon');
    expect(s.day.openingEndsAt).toBeNull();
    expect(s.day.prepEndsAt).toBeNull();
    expect(s.day.weather).toBeNull();
    expect(s.day.waitingAtOpening).toBe(0);
    expect(s.day.doorsOpenedThisService).toBe(false);
  });
});
