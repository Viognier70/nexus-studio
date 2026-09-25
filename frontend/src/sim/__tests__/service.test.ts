// ORDER 266 (Nexus v1 etapp 4) — servicen: action-knappen, ryktet,
// händelserna och lagret.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeGuest, makeInitialState } from '../../strategic/simulation/model';
import { REPUTATION_FLOOR } from '../../strategic/simulation/reputation';
import { isSeatedCapacity, seatSlot } from '../../strategic/simulation/service';
import { ACTION_BUTTON, EVENTS, QUEUE, REPUTATION } from '../balance';
import { actionQueue, interventionSeconds, isBlind } from '../actionButton';
import { stockForecast } from '../stockForecast';
import { createRng } from '../../strategic/util/rng';
import type { SimAction, SimulationState } from '../../strategic/types';

function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
  return s;
}

// Middag med dörrarna öppna, inga lediga platser, och en gäst i kön som
// har väntat länge (nöjdheten strax under gränsen för att ge upp).
function queueAtRisk(): { s: SimulationState; guestId: string } {
  let s = makeInitialState(3);
  s = { ...s, policies: { ...s.policies, marketCapEnabled: false } };
  s = reducer(s, { type: 'START_SERVICE' });
  s = tick(s, 700); // förbi opening och mise en place
  // Fullt rum: varje plats upptagen av en gäst som äter, så att gästen
  // i kön inte kan få plats.
  const diners = Array.from({ length: isSeatedCapacity(s) }, (_, i) => {
    const at = seatSlot(s, i);
    return { ...makeGuest(s.simTime), state: 'dining' as const, seatIndex: i, stateTime: s.simTime, position: { ...at }, targetPosition: { ...at }, moveProgress: 1 };
  });
  s = { ...s, guests: [...s.guests.filter((g) => g.state !== 'waiting'), ...diners], seatedIds: diners.map((d) => d.id), waitingIds: [] };
  const g = makeGuest(s.simTime);
  const guest = { ...g, state: 'waiting' as const, hasBeenGreeted: true, satisfaction: QUEUE.giveUpSatisfaction + 0.04, stateTime: s.simTime - QUEUE.patienceSimSeconds + 3 };
  s = { ...s, guests: [...s.guests, guest], waitingIds: [...s.waitingIds, guest.id] };
  return { s, guestId: guest.id };
}

const present = (s: SimulationState, id: string) => {
  const g = s.guests.find((x) => x.id === id);
  return g !== undefined && g.state !== 'leaving' && g.state !== 'declined';
};

describe('ORDER 266 — action-knappen', () => {
  it('kontrafaktiskt: gästen ger upp utan insats, och stannar med den', () => {
    const without = queueAtRisk();
    const a = tick(without.s, 150);
    expect(present(a, without.guestId), 'utan insats ska gästen ha gått').toBe(false);

    const withIt = queueAtRisk();
    let b = reducer(withIt.s, { type: 'INTERVENE', kind: 'calm', guestId: withIt.guestId });
    expect(b.actionButton.active?.guestId).toBe(withIt.guestId);
    b = tick(b, 150);
    expect(present(b, withIt.guestId), 'med insats ska gästen stanna').toBe(true);
    expect(b.actionButton.lastResult).toMatchObject({ success: true, guestId: withIt.guestId });
    expect(b.eventStream.some((e) => e.kind === 'v1_intervention' && e.category === 'positive')).toBe(true);
  });

  it('en lyckad insats ger en techne-kredit', () => {
    const { s, guestId } = queueAtRisk();
    const before = s.knowledgeCredits.techne;
    const after = tick(reducer(s, { type: 'INTERVENE', kind: 'calm', guestId }), 150);
    expect(after.knowledgeCredits.techne - before).toBe(ACTION_BUTTON.techneCreditOnSuccess);
  });

  it('rummet är skymt i tjugo spelsekunder', () => {
    const { s, guestId } = queueAtRisk();
    let b = reducer(s, { type: 'INTERVENE', kind: 'calm', guestId });
    expect(isBlind(b)).toBe(true);
    b = tick(b, ACTION_BUTTON.blindSimSeconds * 5 - 2);
    expect(isBlind(b)).toBe(true);
    b = tick(b, 4);
    expect(isBlind(b)).toBe(false);
  });

  it('högst tre insatser per kväll, och bara under servicen', () => {
    let { s } = queueAtRisk();
    for (let i = 0; i < 5; i++) {
      const extra = { ...makeGuest(s.simTime), state: 'waiting' as const, hasBeenGreeted: true };
      s = { ...s, guests: [...s.guests, extra], waitingIds: [...s.waitingIds, extra.id] };
      const target = actionQueue(s).find((t) => t.kind === 'calm')!;
      s = reducer(s, { type: 'INTERVENE', kind: 'calm', guestId: target.guestId });
      s = tick(s, ACTION_BUTTON.blindSimSeconds * 5 + 5);
    }
    expect(s.actionButton.usedThisService).toBe(ACTION_BUTTON.maxPerEvening);
    const morning = makeInitialState(1);
    expect(reducer(morning, { type: 'INTERVENE', kind: 'calm', guestId: 'x' })).toBe(morning);
  });

  it('insatsen går snabbare med fler techne-krediter', () => {
    expect(interventionSeconds(0)).toBe(ACTION_BUTTON.baseSimSeconds);
    expect(interventionSeconds(10)).toBeLessThan(interventionSeconds(0));
    expect(interventionSeconds(10_000)).toBe(ACTION_BUTTON.minSimSeconds);
  });
});

describe('ORDER 266 — ryktet', () => {
  it('golvet: ryktet går aldrig under 10 av 100, oavsett åtgärder', () => {
    const rng = createRng(4242);
    let s = { ...makeInitialState(9), reputation: 0.2 };
    const actions: SimAction[] = [{ type: 'START_SERVICE' }, { type: 'FORCE_COLLAPSE' }, { type: 'END_EVENING' }, { type: 'CLOSE_DAY' }, { type: 'SKIP_QUIZ' }];
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
    s = reducer(s, { type: 'START_SERVICE' });
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
    s = reducer(s, { type: 'START_SERVICE' });
    s = tick(s, 700);
    s = { ...s, day: { ...s.day, prepReadiness: { ...s.day.prepReadiness, stations: EVENTS.inspectionStationsBelow / 2 } } };
    for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.serviceEvents.inspectionDue).toBe(true);
    const repBefore = s.reputation;
    s = reducer(s, { type: 'END_EVENING' });
    s = tick(s, 2);
    const e = s.eventStream.find((x) => x.kind === 'v1_inspection');
    expect(e?.text).toMatch(/Stationerna/);
    expect(s.ledger.some((l) => l.amount === -EVENTS.inspectionFineSek)).toBe(true);
    expect(s.reputation).toBeLessThan(repBefore + 0.05);
  });

  it('gott rykte ger en recensent som bokar bord', () => {
    let s = { ...makeInitialState(1), reputation: EVENTS.reviewerReputationAtLeast / REPUTATION.scale + 0.01 };
    s = reducer(s, { type: 'START_SERVICE' });
    expect(s.serviceEvents.reviewerTonight).toBe(true);
    expect(s.eventStream.some((x) => x.kind === 'v1_reviewer_booked')).toBe(true);
  });

  it('svag kassa ger ett samtal från banken nästa morgon', () => {
    let s = { ...makeInitialState(1), cash: -20000 };
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.economy.warning).not.toBeNull();
    s = tick(reducer(s, { type: 'END_EVENING' }), 2);
    expect(s.eventStream.some((x) => x.kind === 'v1_bank_call')).toBe(true);
  });
});

describe('ORDER 266 — kvällsberättelsen börjar med det som gick bra', () => {
  it('nöjda gäster nämns före kvällens omdöme', () => {
    let s = makeInitialState(5);
    s = reducer(s, { type: 'START_SERVICE' });
    for (let i = 0; i < 20000 && s.day.period !== 'evening'; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    const p = s.eveningAccount!.paragraph;
    expect(p).toMatch(/^(En gäst gick härifrån nöjd|[A-ZÅÄÖ][a-zåäö]+ gick härifrån nöjda)/);
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
    expect(reducer(s, { type: 'START_SERVICE' }).day.period).toBe('dinner');
  });
});
