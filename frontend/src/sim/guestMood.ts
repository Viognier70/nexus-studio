// ORDER 299 (Vision Owner 2026-10-03, "Raketen och rummet", och Designs
// leverans D1 §7 "Till sim-lagret") — gästernas stämning.
//
// Stämningen är gästens nöjdhet 0..1 (Guest.satisfaction). Läget kommer ur
// gränserna i balance.ts MOOD_BALANCE; rummets värde är medelvärdet per
// sällskap av gästerna i rummet och i kön. Ett raketsvar flyttar de gäster som
// såg det (inom witnessRadiusM från bordet): uppåt vid rätt, nedåt vid fel.
// Bordet självt får svarets följd som förut (incidents.ts answerConsequence).
//
// Presentationen (symbolerna, ansiktena, mätaren och konsekvensögonblicket)
// står i strategic/scene/guestMood.ts, Designs fil.

import type { Guest, SimulationState } from '../strategic/types';
import { MOOD_BALANCE } from './balance';

export type MoodId = 'delighted' | 'content' | 'waiting' | 'impatient' | 'displeased';

/** Bäst först. Indexet är mätarens steg räknat uppifrån (0 = glad). */
export const MOODS: readonly MoodId[] = ['delighted', 'content', 'waiting', 'impatient', 'displeased'];

const IN_ROOM = new Set<Guest['state']>(['waiting', 'seated', 'ordering', 'dining', 'paying']);

export function moodOf(satisfaction: number): MoodId {
  const t = MOOD_BALANCE.threshold;
  if (satisfaction >= t.delighted) return 'delighted';
  if (satisfaction >= t.content) return 'content';
  if (satisfaction >= t.waiting) return 'waiting';
  if (satisfaction >= t.impatient) return 'impatient';
  return 'displeased';
}

export function guestsInRoom(state: Pick<SimulationState, 'guests'>): Guest[] {
  return state.guests.filter((g) => IN_ROOM.has(g.state) && !g.walkAwayOnArrival);
}

/** ORDER 299b — gästens stämning: nöjdheten, gästens lyft och rummets lyft, inom 0..1. */
export function guestMoodValue(g: Pick<Guest, 'satisfaction' | 'moodLift'>, roomLift = 0): number {
  return Math.max(0, Math.min(1, g.satisfaction + (g.moodLift ?? 0) + roomLift));
}

type MoodState = Pick<SimulationState, 'guests'> & { day?: Pick<SimulationState['day'], 'roomMoodLift'> };

/** Rummets stämning just nu: medelvärdet per sällskap (eller per gäst), null utan gäster. */
export function roomMoodValue(state: MoodState): number | null {
  const guests = guestsInRoom(state);
  if (guests.length === 0) return null;
  const room = state.day?.roomMoodLift ?? 0;
  if (MOOD_BALANCE.roomWeighting === 'perGuest') return guests.reduce((a, g) => a + guestMoodValue(g, room), 0) / guests.length;
  const parties = new Map<string, { sum: number; n: number }>();
  for (const g of guests) {
    const key = g.partyId ?? g.id;
    const p = parties.get(key) ?? { sum: 0, n: 0 };
    parties.set(key, { sum: p.sum + guestMoodValue(g, room), n: p.n + 1 });
  }
  const means = [...parties.values()].map((p) => p.sum / p.n);
  return means.reduce((a, b) => a + b, 0) / means.length;
}

export function roomMood(state: MoodState): MoodId | null {
  const v = roomMoodValue(state);
  return v === null ? null : moodOf(v);
}

/** Mätarens fyllning i steg: glad fyller alla, missnöjd ett. */
export function moodSteps(mood: MoodId): number {
  return MOODS.length - MOODS.indexOf(mood);
}

/** De gäster som såg svaret: i rummet, inte vid bordet, inom witnessRadiusM från bordets gäster. */
export function witnessesOf(state: Pick<SimulationState, 'guests'>, table: readonly Guest[]): Guest[] {
  if (table.length === 0) return [];
  const ids = new Set(table.map((g) => g.id));
  const cx = table.reduce((a, g) => a + g.position.x, 0) / table.length;
  const cz = table.reduce((a, g) => a + g.position.z, 0) / table.length;
  const r = MOOD_BALANCE.rocket.witnessRadiusM;
  return guestsInRoom(state).filter((g) => !ids.has(g.id) && Math.hypot(g.position.x - cx, g.position.z - cz) <= r);
}

function liftRoom(draft: SimulationState, delta: number): void {
  const max = MOOD_BALANCE.liftMax;
  draft.day = { ...draft.day, roomMoodLift: Math.max(-max, Math.min(max, (draft.day.roomMoodLift ?? 0) + delta)) };
}

function lift(g: Guest, delta: number): void {
  const max = MOOD_BALANCE.liftMax;
  g.moodLift = Math.max(-max, Math.min(max, (g.moodLift ?? 0) + delta));
}

/**
 * ORDER 299b — svaret lyfter eller sänker stämningen (inte nöjdheten): bordet,
 * de som såg det inom witnessRadiusM och, svagare, alla i rummet. Returnerar
 * de som såg det (för konsekvensögonblicket).
 */
export function applyAnswerMood(draft: SimulationState, table: readonly Guest[], right: boolean): string[] {
  const r = MOOD_BALANCE.rocket;
  const pick = (e: { right: number; wrong: number }) => (right ? e.right : e.wrong);
  const seen = witnessesOf(draft, table);
  const tableIds = new Set(table.map((g) => g.id));
  const seenIds = new Set(seen.map((g) => g.id));
  for (const g of guestsInRoom(draft)) {
    if (tableIds.has(g.id)) lift(g, pick(r.table));
    else if (seenIds.has(g.id)) lift(g, pick(r.witness));
  }
  liftRoom(draft, pick(r.room));
  return seen.map((g) => g.id);
}

/** ORDER 299b — en gäst som går missnöjd syns: de nära och rummet sänks. */
export function spreadDeparture(draft: SimulationState, leaver: Guest): void {
  const d = MOOD_BALANCE.departure;
  const near = new Set(witnessesOf(draft, [leaver]).map((g) => g.id));
  for (const g of guestsInRoom(draft)) {
    if (g.id !== leaver.id && near.has(g.id)) lift(g, d.witness);
  }
  liftRoom(draft, d.room);
}

/** Lyftet klingar av mot noll (anropas varje tick med spelminuterna). */
export function decayMoodLift(draft: SimulationState, gameMinutes: number): void {
  const room = draft.day.roomMoodLift ?? 0;
  if (room) {
    const r = MOOD_BALANCE.roomLiftDecayPerGameMinute * gameMinutes;
    draft.day = { ...draft.day, roomMoodLift: Math.abs(room) <= r ? 0 : room - Math.sign(room) * r };
  }
  const step = MOOD_BALANCE.liftDecayPerGameMinute * gameMinutes;
  for (const g of draft.guests) {
    const l = g.moodLift;
    if (!l) continue;
    g.moodLift = Math.abs(l) <= step ? 0 : l - Math.sign(l) * step;
  }
}

/**
 * Rummets läge med en dödzon: läget byter först när värdet gått
 * MOOD_BALANCE.roomHysteresis förbi gränsen mot nästa läge. Mätaren och
 * mätningen av en kväll (order299StamningKvall.test.ts) läser samma funktion.
 */
export function stableRoomMood(previous: MoodId | null, value: number | null): MoodId | null {
  if (value === null) return null;
  const next = moodOf(value);
  if (previous === null || next === previous) return next;
  const h = MOOD_BALANCE.roomHysteresis;
  const better = MOODS.indexOf(next) < MOODS.indexOf(previous);
  return moodOf(better ? value - h : value + h) === previous ? previous : next;
}

/**
 * Mätarens fyllning i steg (0 … antalet lägen): värdet läggs linjärt mellan
 * gränserna, så att missnöjd är steg 0–1 och glad det översta steget.
 */
export function meterFill(value: number | null): number {
  if (value === null) return 0;
  const t = MOOD_BALANCE.threshold;
  const edges = [0, t.impatient, t.waiting, t.content, t.delighted, 1];
  const segments = edges.length - 1;
  for (let i = 0; i < segments; i++) {
    if (value < edges[i + 1] || i + 1 === segments) {
      const share = (value - edges[i]) / (edges[i + 1] - edges[i]);
      return i + Math.max(0, Math.min(1, share));
    }
  }
  return MOODS.length;
}

/** Ändringen mätaren visar: null om fyllningen inte flyttat ett synligt steg. */
export function meterMove(shown: number, fill: number, afterAnswer = false): 'up' | 'down' | null {
  const visible = afterAnswer ? MOOD_BALANCE.meterVisibleStepsAfterAnswer : MOOD_BALANCE.meterVisibleSteps;
  if (Math.abs(fill - shown) < visible) return null;
  return fill > shown ? 'up' : 'down';
}
