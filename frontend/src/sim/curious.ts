// ORDER 319b (Anders 2026-10-07, ORDRAR_319_D9.md: "Det här blir foodtruckens grundloop mellan
// situationerna. Kunskapen omvandlas till gäster.") och Anders 2026-10-08: "klicket på en nyfiken gäst
// öppnar frågekortet, och svaret avgör utfallet (rätt: ställer sig i kön, ok: tvekar och står kvar,
// fel: går vidare). Frågorna tas ur foodtruckens bank, inte prototypens exempel."
//
// De nyfikna vid foodtruckens lucka (Designs D9 curiousMarker.ts och tilläggets curiousCard.ts):
//   1. En förbipasserande börjar gå mot vagnen (approach, spelsekunder; scenen låter figuren komma
//      gående utanför bild minst 40 m bort) och saktar in vid skylten (notice). Då tänds markeringen.
//   2. Gästen läser skylten, luktar och pekar, tittar på klockan och tvekar (CURIOUS.phaseSeconds).
//      Spelaren kan klicka så länge fönstret är öppet (CURIOUS.windowSeconds, verkliga sekunder).
//   3. Klicket öppnar kortet med en fråga ur foodtruckens bank (de granskade situationernas steg,
//      ingen fråga två gånger samma kväll). Fönstret står still medan kortet är öppet.
//   4. Svaret: rätt → en gäst ställer sig i kön (gästens id följer figuren), ibland kommer en vän;
//      nästan → gästen tvekar CURIOUS.okHoldSeconds och ställer sig i kön med okJoinChance;
//      fel, inget svar eller tiden ute → gästen går vidare. Full kö → gästen går vidare.
//   5. Krediterna är små (CURIOUS.creditRight på frågans axel), och varje svar bokförs i portfolion
//      (state.curiousLog, hela säsongen).
// Högst en nyfiken åt gången. Slumpen ur simtiden (hashKey), så att servicens slumpflöde inte flyttas.

import type { Guest, KnowledgeAxis, SimulationState } from '../strategic/types';
import { CURIOUS, QUEUE_CAP } from './balance';
import { incidentBankFor, optionQuality, type AnswerQuality } from './incidentBank';
import { makeGuest } from '../strategic/simulation/model';
import { effectiveSpeed } from '../strategic/simulation/consequence';
import { hashKey } from '../strategic/util/hash';

export type CuriousGrade = 'right' | 'ok' | 'wrong';
/** Vad gästen gör när spelaren klickar (Designs CURIOUS_QUESTIONS.pick): kortets rad om vad spelaren ser. */
export type CuriousMoment = 'sign' | 'smell' | 'cold';
export type CuriousPhase = 'approach' | 'slowDown' | 'toSign' | 'read' | 'smell' | 'watch' | 'hesitate';
export type CuriousOutcome = 'join' | 'walkOn';

export interface CuriousCardState {
  incidentId: string;
  step: number;
  question: number;
  axis: KnowledgeAxis;
  moment: CuriousMoment;
  left: number;
  total: number;
}

export interface CuriousGuest {
  seq: number;
  /** Från vilket håll på gångvägen gästen kommer. */
  side: 'west' | 'east';
  /** Spelsekunder kvar tills gästen saktar in vid skylten. */
  approachLeft: number;
  /** Verkliga sekunder sedan gästen saktade in (står still medan kortet är öppet). */
  real: number;
  card: CuriousCardState | null;
  /** Svaret, och verkliga sekunder kvar av tvekan efter nästan. */
  answer: { optionId: string | null; grade: CuriousGrade | null; question: number; incidentId: string } | null;
  okLeft: number | null;
}

export interface CuriousLast {
  seq: number;
  side: 'west' | 'east';
  outcome: CuriousOutcome;
  grade: CuriousGrade | null;
  /** Gästen i kön som figuren blir, när gästen ställde sig i kön. */
  guestId: string | null;
  friendId: string | null;
  at: number;
}

export interface CuriousTonight {
  passersBy: number;
  talked: number;
  right: number;
  ok: number;
  wrong: number;
  unanswered: number;
  joined: number;
  friends: number;
  queueFull: number;
}

export interface CuriousState {
  current: CuriousGuest | null;
  last: CuriousLast | null;
  /** Spelsekunder sedan den förra gick eller ställde sig i kön. */
  since: number;
  seq: number;
  /** Frågorna som redan kommit i kväll. */
  asked: number[];
  tonight: CuriousTonight;
}

/** Portfolion: varje svar till en nyfiken gäst, hela säsongen. */
export interface CuriousEntry {
  at: number;
  day: number;
  question: number;
  incidentId: string;
  optionId: string | null;
  grade: CuriousGrade | null;
  outcome: CuriousOutcome;
}

const EMPTY_TONIGHT: CuriousTonight = { passersBy: 0, talked: 0, right: 0, ok: 0, wrong: 0, unanswered: 0, joined: 0, friends: 0, queueFull: 0 };

export function curiousOf(state: Pick<SimulationState, 'day'>): CuriousState {
  return state.day.curious ?? { current: null, last: null, since: CURIOUS.gapSimSeconds, seq: 0, asked: [], tonight: EMPTY_TONIGHT };
}

const GRADE: Record<AnswerQuality, CuriousGrade> = { best: 'right', ok: 'ok', wrong: 'wrong' };

/** Var i tidslinjen gästen är (verkliga sekunder sedan gästen saktade in). */
export function curiousPhase(c: Pick<CuriousGuest, 'approachLeft' | 'real'>): CuriousPhase {
  if (c.approachLeft > 0) return 'approach';
  const p = CURIOUS.phaseSeconds;
  let t = c.real;
  for (const [k, s] of [['slowDown', p.slowDown], ['toSign', p.toSign], ['read', p.read], ['smell', p.smell], ['watch', p.watch]] as const) {
    if (t < s) return k;
    t -= s;
  }
  return 'hesitate';
}

/** Går det att prata med gästen nu (markeringen är tänd och fönstret är öppet)? */
export function curiousTalkable(state: SimulationState): boolean {
  const c = curiousOf(state).current;
  return !!c && c.approachLeft <= 0 && !c.card && !c.answer && c.real < CURIOUS.windowSeconds && !state.incidents?.active;
}

function roll(state: SimulationState, key: string): number {
  return hashKey(state.seed ?? 0, `${Math.round(state.simTime)}|${key}`);
}

function inService(state: SimulationState): boolean {
  return state.economy.businessClass === 'foodtruck' && state.day.period === 'dinner' && !!state.day.doorsOpenedThisService && !state.day.serviceCollapsed;
}

function write(draft: SimulationState, c: CuriousState): void {
  draft.day = { ...draft.day, curious: c };
}

function bump(c: CuriousState, k: keyof CuriousTonight, n = 1): CuriousState {
  return { ...c, tonight: { ...c.tonight, [k]: c.tonight[k] + n } };
}

function queueParties(draft: SimulationState): number {
  return new Set(draft.guests.filter((g) => g.state === 'waiting' || g.state === 'arriving').map((g) => g.partyId ?? g.id)).size;
}

/** Kön är full: lika många sällskap som QUEUE_CAP, eller vagnens kö per person i laget. */
function queueFull(draft: SimulationState): boolean {
  return queueParties(draft) >= QUEUE_CAP.maxParties || draft.waitingIds.length >= draft.policies.capacity;
}

function newGuest(draft: SimulationState): Guest {
  const g = makeGuest(draft.simTime, false, false);
  g.fromCurious = true;
  draft.guests = [...draft.guests, g];
  return g;
}

/** Gästen bestämmer sig: ställer sig i kön (om det finns plats) eller går vidare. */
function settle(draft: SimulationState, join: boolean, friend: boolean): void {
  let c = curiousOf(draft);
  const cur = c.current;
  if (!cur) return;
  let outcome: CuriousOutcome = 'walkOn';
  let guestId: string | null = null;
  let friendId: string | null = null;
  if (join && queueFull(draft)) c = bump(c, 'queueFull');
  else if (join) {
    outcome = 'join';
    guestId = newGuest(draft).id;
    c = bump(c, 'joined');
    if (friend && !queueFull(draft)) { friendId = newGuest(draft).id; c = bump(c, 'friends'); }
  }
  const a = cur.answer;
  if (a) draft.curiousLog = [...(draft.curiousLog ?? []), { at: draft.simTime, day: draft.day.dayNumber, question: a.question, incidentId: a.incidentId, optionId: a.optionId, grade: a.grade, outcome }];
  write(draft, { ...c, current: null, since: 0, last: { seq: cur.seq, side: cur.side, outcome, grade: a?.grade ?? null, guestId, friendId, at: draft.simTime } });
}

/** Ett tick: gästen går fram, fönstret och kortets tid räknas ned, och en ny nyfiken kommer när det är dags. */
export function tickCurious(draft: SimulationState, dt: number): void {
  if (!inService(draft)) {
    // Kvällen är slut (eller föll ihop): den som tvekar går vidare.
    if (draft.day.curious?.current) settle(draft, false, false);
    return;
  }
  const real = dt / Math.max(1, effectiveSpeed(draft));
  let c = curiousOf(draft);
  const cur = c.current;
  if (cur) {
    if (cur.approachLeft > 0) {
      const approachLeft = Math.max(0, cur.approachLeft - dt);
      write(draft, { ...c, current: { ...cur, approachLeft } });
      return;
    }
    if (cur.card) {
      const left = cur.card.left - real;
      if (left > 0) { write(draft, { ...c, current: { ...cur, card: { ...cur.card, left } } }); return; }
      // Tiden ute utan svar: som utan klick, gästen går vidare.
      write(draft, bump({ ...c, current: { ...cur, card: null, answer: { optionId: null, grade: null, question: cur.card.question, incidentId: cur.card.incidentId } } }, 'unanswered'));
      settle(draft, false, false);
      return;
    }
    if (cur.okLeft !== null) {
      const okLeft = cur.okLeft - real;
      if (okLeft > 0) { write(draft, { ...c, current: { ...cur, okLeft } }); return; }
      settle(draft, roll(draft, `curious${cur.seq}|ok`) < CURIOUS.okJoinChance, false);
      return;
    }
    // Situationen vid luckan har förtur: fönstret står still medan den pågår.
    const next = draft.incidents?.active ? cur.real : cur.real + real;
    if (next < CURIOUS.windowSeconds) { write(draft, { ...c, current: { ...cur, real: next } }); return; }
    write(draft, bump(c, 'unanswered'));
    settle(draft, false, false);
    return;
  }
  c = { ...c, since: c.since + dt };
  const ends = draft.incidents?.serviceEndsAt ?? null;
  const gap = CURIOUS.gapSimSeconds * (1 - CURIOUS.gapJitter + (CURIOUS.gapJitter + CURIOUS.gapJitter) * roll(draft, `gap${c.seq}`));
  if (c.since < gap || (ends !== null && ends - draft.simTime < CURIOUS.minServiceLeftSimSeconds)) { write(draft, c); return; }
  const seq = c.seq + 1;
  const side = roll(draft, `side${seq}`) < CURIOUS.westShare ? 'west' : 'east';
  write(draft, bump({ ...c, seq, since: 0, current: { seq, side, approachLeft: CURIOUS.approachSimSeconds, real: 0, card: null, answer: null, okLeft: null } }, 'passersBy'));
}

/** Frågan till gästen: ett steg ur foodtruckens granskade situationer, inte redan i kväll. */
function pickQuestion(state: SimulationState, seq: number): { incidentId: string; step: number; question: number; axis: KnowledgeAxis } | null {
  const all = incidentBankFor('foodtruck').flatMap((i) => i.steps.flatMap((s, k) => (s.question === undefined ? [] : [{ incidentId: i.id, step: k, question: s.question, axis: s.axis }])));
  const asked = curiousOf(state).asked;
  const fresh = all.filter((s) => !asked.includes(s.question));
  const pool = fresh.length > 0 ? fresh : all;
  if (pool.length === 0) return null;
  return pool[Math.floor(roll(state, `q${seq}`) * pool.length) % pool.length];
}

/** Klicket på gästen: kortet öppnas med en fråga, och kvällen står i 1× medan det är öppet. */
export function openCurious(draft: SimulationState, cold = false): void {
  if (!curiousTalkable(draft)) return;
  const c = curiousOf(draft);
  const cur = c.current!;
  const q = pickQuestion(draft, cur.seq);
  if (!q) return;
  const moment: CuriousMoment = cold ? 'cold' : curiousPhase(cur) === 'smell' ? 'smell' : 'sign';
  write(draft, bump({ ...c, asked: [...c.asked, q.question], current: { ...cur, card: { ...q, moment, left: CURIOUS.card.seconds, total: CURIOUS.card.seconds } } }, 'talked'));
}

/** Svaret på kortet. Returnerar krediten (rätt svar) så att reducern kan bokföra den. */
export function answerCurious(draft: SimulationState, optionId: string): { axis: KnowledgeAxis; amount: number } | null {
  const c = curiousOf(draft);
  const cur = c.current;
  if (!cur?.card) return null;
  const incident = incidentBankFor('foodtruck').find((i) => i.id === cur.card!.incidentId);
  const option = incident?.steps[cur.card.step]?.options.find((o) => o.id === optionId);
  if (!option) return null;
  const grade = GRADE[optionQuality(option, null)];
  const card = cur.card;
  const answered: CuriousGuest = { ...cur, card: null, answer: { optionId, grade, question: card.question, incidentId: card.incidentId }, okLeft: grade === 'ok' ? CURIOUS.okHoldSeconds : null };
  write(draft, bump({ ...c, current: answered }, grade));
  if (grade === 'right') settle(draft, true, roll(draft, `curious${cur.seq}|friend`) < CURIOUS.friendChance);
  else if (grade === 'wrong') settle(draft, false, false);
  return grade === 'right' && CURIOUS.creditRight > 0 ? { axis: card.axis, amount: CURIOUS.creditRight } : null;
}

/** Notan från en gäst som kom via en nyfiken (reducern, när gästen betalar). */
export function recordCuriousRevenue(draft: SimulationState, guest: Guest, sek: number): void {
  if (!guest.fromCurious || sek <= 0) return;
  draft.day = { ...draft.day, curiousRevenueSek: (draft.day.curiousRevenueSek ?? 0) + sek };
}
