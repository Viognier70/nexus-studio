// ORDER 266 (Nexus v1 etapp 4) — servicen: ryktet,
// händelserna och lagret.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeInitialState } from '../../strategic/simulation/model';
import { REPUTATION_FLOOR } from '../../strategic/simulation/reputation';
import { EVENTS, REPUTATION } from '../balance';
import { stockForecast } from '../stockForecast';
import { createRng } from '../../strategic/util/rng';
import type { SimAction, SimulationState } from '../../strategic/types';
import { stocked } from '../../strategic/testHarness/stocked';
import { useLegacyEconomy } from '../../strategic/testHarness/legacyEconomy';

// ORDER 296 — filen prövar de äldre ekonomireglerna (nedgradering, golvets
// påfyllnad, amortering och den förra startkassan); kärnans risk stänger av
// dem i spelet.
useLegacyEconomy();

function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
  return s;
}

// ORDER 270 — action-knappens tester är borttagna med knappen; händelserna
// prövas i order270Incidents.test.ts.

describe('ORDER 266 — ryktet', () => {
  it('golvet: ryktet går aldrig under 10 av 100, oavsett åtgärder', () => {
    const rng = createRng(4242);
    let s = { ...makeInitialState(9), reputation: 0.2 };
    const actions: SimAction[] = [{ type: 'START_SERVICE' }, { type: 'FORCE_COLLAPSE' }, { type: 'END_EVENING' }, { type: 'CLOSE_DAY' }];
    let min = s.reputation;
    for (let i = 0; i < 6000; i++) {
      s = rng.chance(0.03) ? reducer(s, rng.pick(actions)) : reducer(s, { type: 'TICK', dt: 0.2 });
      min = Math.min(min, s.reputation);
    }
    expect(min).toBeGreaterThanOrEqual(REPUTATION_FLOOR);
    expect(REPUTATION_FLOOR).toBeCloseTo(REPUTATION.floor / REPUTATION.scale, 9);
  });

  it('självläkning mot 50 av 100 varje ny morgon, och en rad i strömmen', () => {
    let s = { ...makeInitialState(1), reputation: 0.2 };
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    for (let i = 0; i < 20000 && s.day.dayNumber === 1; i++) {
      if (s.day.period === 'evening') s = reducer(s, { type: 'END_EVENING' });
      s = reducer(s, { type: 'TICK', dt: 0.2 });
    }
    expect(s.eventStream.some((e) => e.kind === 'v1_recovery_slow')).toBe(true);
  });
});

describe('ORDER 266 — händelser med orsak', () => {
  it('ostädade stationer ger inspektion nästa morgon: avgift, rykte, orsak i strömmen', () => {
    let s = makeInitialState(1);
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    s = tick(s, 700);
    s = { ...s, day: { ...s.day, prepReadiness: { ...s.day.prepReadiness, stations: EVENTS.inspectionStationsBelow / 2 } } };
    for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.serviceEvents.inspectionDue).toBe(true);
    const repBefore = s.reputation;
    s = reducer(s, { type: 'END_EVENING' });
    s = tick(s, 2);
    const e = s.eventStream.find((x) => x.kind === 'v1_inspection');
    expect(e?.text).toMatch(/The stations/);
    expect(s.ledger.some((l) => l.amount === -EVENTS.inspectionFineSek)).toBe(true);
    expect(s.reputation).toBeLessThan(repBefore + 0.05);
  });

  it('gott rykte ger en recensent som bokar bord', () => {
    let s = { ...makeInitialState(1), reputation: EVENTS.reviewerReputationAtLeast / REPUTATION.scale + 0.01 };
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    expect(s.serviceEvents.reviewerTonight).toBe(true);
    expect(s.eventStream.some((x) => x.kind === 'v1_reviewer_booked')).toBe(true);
  });

  it('svag kassa ger ett samtal från banken nästa morgon', () => {
    let s = { ...makeInitialState(1), cash: -20000 };
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.economy.warning).not.toBeNull();
    s = tick(reducer(s, { type: 'END_EVENING' }), 2);
    expect(s.eventStream.some((x) => x.kind === 'v1_bank_call')).toBe(true);
  });
});

describe('ORDER 266 — kvällsberättelsen börjar med det som gick bra', () => {
  it('nöjda gäster nämns före kvällens omdöme', () => {
    let s = makeInitialState(5);
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const p = s.eveningAccount!.paragraph;
    expect(p).toMatch(/^(One guest left happy|[A-Z][a-z]+ guests left happy)/);
  });
});

describe('ORDER 266 — lagret', () => {
  it('prognos i kuvert; rätterna delar råvaror', () => {
    expect(stockForecast({ menu: [], stock: {} })).toEqual({ kind: 'noMenu' });
    const s = makeInitialState(1);
    const menu = [{ dishId: 'root-soup', price: 95 }] as SimulationState['menu'];
    expect(stockForecast({ menu, stock: {} })).toEqual({ kind: 'covers', covers: 0 });
    const f = stockForecast({ menu, stock: { ...s.stock, 'root-veg': 1000, herbs: 1000, dairy: 1000 } });
    expect(f.kind === 'covers' && f.covers > 0).toBe(true);
  });

  it('öppning blockeras inte av tomt lager', () => {
    const s = makeInitialState(1);
    expect(reducer(stocked(s), { type: 'START_SERVICE' }).day.period).toBe('dinner');
  });
});
