// ORDER 267 (Nexus v1 etapp 5) — trycket i vinbarens rum.
//
// Vision Owner 2026-09-25: efterfrågan från marknaden utan tyst tak,
// sittiden 60–90 min i speltid, och vecka 2 med vinbarens 20 platser:
// fredag och lördag ger kö och några gäster som går, måndag och tisdag
// inte. Testet kör de fyra kvällarna i samma rum som scenen monterar
// (roomParity.ts), med brons i tre (vinbarens krav) och standardfröet,
// och hävdar målen ur samma körning som skriver
// reports/order267/pressure.json (med WRITE_REPORTS=1).
//
// Mått:
//   sittid     — från att gästen satt sig tills hon lämnar platsen, i
//                spelminuter (balance.ts GAME_MINUTES_PER_SIM_SECOND, F31)
//   maxkö      — längsta waitingIds under kvällen
//   gavUpp     — ökningarna i metrics.giveUpsThisService under kvällen
//                (kön, balance.ts QUEUE; fältet nollas när servicen stänger)
//   vändeVidDörren — gäster som gick direkt från 'arriving' till 'declined'
//                (walk-away vid ankomst, ORDER 043 §6 — finns alla kvällar
//                och hör inte till kön; redovisas men hävdas inte)

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../../simulation/reducer';
import { DEFAULT_SEED, makeInitialState } from '../../simulation/model';
import { mountRoomLikeScene } from '../roomParity';
import { isSeatedCapacity } from '../../simulation/service';
import { dailyGuestCap, V1_CLASS_TO_ROOM } from '../../../sim/economy';
import { GAME_MINUTES_PER_SIM_SECOND } from '../../../sim/balance';
import type { SimulationState } from '../../types';
import { stocked } from '../stocked';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order267');
// Rummet som spelarens vinbar spelar i (sim/economy.ts V1_CLASS_TO_ROOM).
const ROOM: SimulationState['businessClass'] = V1_CLASS_TO_ROOM.vinbar;
const TICK = 0.2;
const MAX_TICKS = 20000;
// Vecka 2: dag 8 = måndag … dag 13 = lördag.
const EVENINGS = [
  { day: 8, name: 'mån' },
  { day: 9, name: 'tis' },
  { day: 12, name: 'fre' },
  { day: 13, name: 'lör' }
] as const;
const SITTING_RANGE_GAME_MIN = [60, 90] as const;

function evening(dayNumber: number) {
  mountRoomLikeScene(ROOM);
  let s = makeInitialState(DEFAULT_SEED);
  s = {
    ...s,
    businessClass: ROOM,
    day: { ...s.day, dayNumber },
    medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }
  };
  s = reducer(stocked(s), { type: 'START_SERVICE' });
  const seatedAt: Record<string, number> = {};
  const sitting: number[] = [];
  const studentSitting: number[] = [];
  let prev: Record<string, string> = {};
  let maxQueue = 0;
  let declined = 0;
  let gaveUp = 0;
  let queueLeft = 0;
  for (let i = 0; i < MAX_TICKS && s.day.period === 'dinner'; i++) {
    const before = s.metrics.giveUpsThisService;
    s = reducer(s, { type: 'TICK', dt: TICK });
    gaveUp += Math.max(0, s.metrics.giveUpsThisService - before);
    maxQueue = Math.max(maxQueue, s.waitingIds.length);
    for (const g of s.guests) {
      const p = prev[g.id];
      if (p === g.state) continue;
      if (g.state === 'seated') seatedAt[g.id] = s.simTime;
      if (g.state === 'declined' && p === 'arriving') declined++;
      // ORDER 290 — ett fel svar (här: raketen som ingen svarar på) låter en
      // gäst i kön gå (ANSWER_EFFECTS.wrongGuestsLeave); de räknas som gäster
      // som går ur kön, bredvid dem som ger upp.
      if (g.state === 'leaving' && p === 'waiting') queueLeft++;
      // ORDER 287a — studenten tar platsen längre (GUEST_TYPES.stayFactor);
      // sittiden 60–90 min (F31) gäller övriga gäster, studenten redovisas för sig.
      if (g.state === 'leaving' && seatedAt[g.id] !== undefined) (g.guestType === 'student' ? studentSitting : sitting).push(s.simTime - seatedAt[g.id]);
    }
    prev = Object.fromEntries(s.guests.map((g) => [g.id, g.state]));
  }
  const meanSimSec = sitting.reduce((a, b) => a + b, 0) / Math.max(1, sitting.length);
  const studentMeanSimSec = studentSitting.reduce((a, b) => a + b, 0) / Math.max(1, studentSitting.length);
  return {
    seats: isSeatedCapacity(s),
    marketCap: dailyGuestCap(s),
    arrivals: s.day.arrivalsToday ?? 0,
    maxQueue,
    gaveUp,
    queueLeft,
    turnedAway: s.day.turnedAwayFull ?? 0,
    declinedAtDoor: declined,
    departures: sitting.length,
    sittingGameMinutes: Math.round(meanSimSec * GAME_MINUTES_PER_SIM_SECOND),
    studentSittingGameMinutes: Math.round(studentMeanSimSec * GAME_MINUTES_PER_SIM_SECOND)
  };
}

describe('ORDER 267 — trycket i vinbarens rum, vecka 2', () => {
  it('fredag och lördag ger kö och gäster som går, måndag och tisdag inte; sittiden 60–90 min', () => {
    const report = Object.fromEntries(EVENINGS.map((e) => [e.name, evening(e.day)]));
    if (process.env.WRITE_REPORTS === '1') mkdirSync(OUT, { recursive: true });
    if (process.env.WRITE_REPORTS === '1') writeFileSync(resolve(OUT, 'pressure.json'), JSON.stringify({ seed: DEFAULT_SEED, room: ROOM, evenings: report }, null, 2) + '\n');

    for (const name of ['mån', 'tis'] as const) {
      expect(report[name].maxQueue, `${name}: kö`).toBe(0);
      expect(report[name].gaveUp, `${name}: gav upp`).toBe(0);
    }
    // ORDER 296b — kön har ett tak (balance.ts QUEUE_CAP): de som kommer när
    // den är full väljer en annan krog (day.turnedAwayFull) i stället för att
    // ge upp i kön. Båda räknas som gäster som går.
    for (const name of ['fre', 'lör'] as const) {
      expect(report[name].maxQueue, `${name}: kö`).toBeGreaterThan(0);
      expect(report[name].queueLeft + report[name].turnedAway, `${name}: gäster som går ur kön eller vid full kö`).toBeGreaterThan(0);
    }
    for (const e of EVENINGS) {
      expect(report[e.name].seats).toBe(20);
      expect(report[e.name].sittingGameMinutes, `${e.name}: sittid`).toBeGreaterThanOrEqual(SITTING_RANGE_GAME_MIN[0]);
      expect(report[e.name].sittingGameMinutes, `${e.name}: sittid`).toBeLessThanOrEqual(SITTING_RANGE_GAME_MIN[1]);
    }
  });
});
