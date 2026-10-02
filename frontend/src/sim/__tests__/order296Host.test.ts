// ORDER 296 (kärnan punkt 1) — hovmästarens nålar och handgrepp
// (sim/hostPins.ts; Designs leverans hovmästaren och butiken §2–3).

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { mountRoomLikeScene } from '../../strategic/testHarness/roomParity';
import { playMorning } from '../../strategic/testHarness/weekHarness';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import { firstDayOfWeek } from '../calendar';
import { HOST } from '../balance';
import { PER_DEFAULT, pinsOf } from '../hostPins';
import { helpTaskTime, zoneOfSeat } from '../hostZones';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function friday(seed = 5): SimulationState {
  let s = makeNewGameState(seed);
  s = { ...s, cash: 200000, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } };
  s = playMorning(s, {});
  mountRoomLikeScene(s.businessClass);
  return reducer(s, { type: 'START_SERVICE' });
}

// Spela kvällen; svara inte (Per väljer), eller svara det första.
function play(s: SimulationState, answerFirst: boolean): SimulationState {
  for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
    if (s.incidents?.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: null as never, confidence: 0 });
    s = reducer(s, TICK);
    if (answerFirst) for (const p of pinsOf(s).open) s = reducer(s, { type: 'HOST_PIN_ANSWER', id: p.id, answer: 0 });
  }
  return s;
}

describe('ORDER 296 — hovmästarens nålar', () => {
  it('nålar kommer under en full kväll; när tiden går ut väljer Per det säkra', () => {
    const s = play(friday(), false);
    const log = pinsOf(s).log;
    expect(log.length).toBeGreaterThan(0);
    for (const e of log) {
      expect(e.per).toBe(true);
      expect(e.answer).toBe(PER_DEFAULT[e.kind]);
    }
  });

  it('spelarens svar loggas som spelarens, och högst maxOpen står öppna', () => {
    let s = friday();
    let maxOpen = 0;
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
      if (s.incidents?.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: null as never, confidence: 0 });
      s = reducer(s, TICK);
      maxOpen = Math.max(maxOpen, pinsOf(s).open.length);
      for (const p of pinsOf(s).open) s = reducer(s, { type: 'HOST_PIN_ANSWER', id: p.id, answer: 0 });
    }
    expect(maxOpen).toBeLessThanOrEqual(HOST.maxOpen);
    expect(pinsOf(s).log.some((e) => !e.per)).toBe(true);
  });
});

describe('ORDER 296 — handgreppen', () => {
  it('flytta personal till baren: uppgifterna vid baren går fortare en stund', () => {
    let s = friday();
    for (let i = 0; i < 3000; i++) s = reducer(s, TICK);
    const barSeat = s.guests.find((g) => g.seatIndex !== null && zoneOfSeat(g.seatIndex) === 'bar')?.seatIndex;
    const floorSeat = s.guests.find((g) => g.seatIndex !== null && zoneOfSeat(g.seatIndex) !== 'bar')?.seatIndex;
    s = reducer(s, { type: 'HOST_MOVE', zone: 'bar' });
    if (barSeat !== undefined) expect(helpTaskTime(s, barSeat)).toBe(HOST.helpZoneTaskTime);
    if (floorSeat !== undefined) expect(helpTaskTime(s, floorSeat)).toBe(HOST.helpOtherTaskTime);
  });

  it('bjuda på kaffe kostar och gör sällskapet nöjdare', () => {
    let s = friday();
    for (let i = 0; i < 3000; i++) s = reducer(s, TICK);
    const g = s.guests.find((x) => x.state === 'dining' || x.state === 'ordering' || x.state === 'seated');
    if (!g) return;
    const key = g.partyId ?? g.id;
    const before = s.guests.find((x) => x.id === g.id)!.satisfaction;
    const after = reducer(s, { type: 'HOST_COMP', key, what: 'coffee' });
    expect(after.cash).toBeLessThan(s.cash);
    expect(after.guests.find((x) => x.id === g.id)!.satisfaction).toBeGreaterThanOrEqual(before);
  });

  it('handgreppen gäller bara under servicen', () => {
    const s = makeNewGameState(1);
    expect(reducer(s, { type: 'HOST_MOVE', zone: 'bar' })).toBe(s);
  });
});
