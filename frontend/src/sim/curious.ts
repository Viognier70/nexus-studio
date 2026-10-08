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
//   3. Klicket öppnar kortet med en fråga i gästens egen röst (sim/curiousBank.ts, ORDER 319b del 2;
//      förut stegen i foodtruckens situationer), efter vad gästen gör. Fönstret står still medan kortet
//      är öppet.
//   4. Svaret: rätt → en gäst ställer sig i kön (gästens id följer figuren), ibland kommer en vän;
//      nästan → gästen tvekar CURIOUS.okHoldSeconds och ställer sig i kön med okJoinChance;
//      fel, inget svar eller tiden ute → gästen går vidare. Full kö → gästen går vidare.
//   5. Krediterna är små (CURIOUS.creditRight på frågans axel), och varje svar bokförs i portfolion
//      (state.curiousLog, hela säsongen).
// ORDER 319b del 2 (Anders 2026-10-08: "Vagnens kapacitet: öka den inte … Kunskapen ska i stället synas
// på tre sätt"): efter ett rätt svar blir köpet större (CURIOUS.rightBillBonus), gästen kommer tillbaka en
// senare kväll som stamgäst (returnChance, state.curiousRegulars) och ryktet stiger (reputationRight).
// Högst en nyfiken åt gången. Slumpen ur simtiden (hashKey), så att servicens slumpflöde inte flyttas.

import type { Guest, KnowledgeAxis, SimulationState } from '../strategic/types';
import { CURIOUS, QUEUE_CAP, REPUTATION } from './balance';
import { CURIOUS_QUESTIONS, curiousQuestion, type CuriousTrigger } from './curiousBank';
import { makeGuest } from '../strategic/simulation/model';
import { clampReputation } from '../strategic/simulation/reputation';
import { calendarFor } from './calendar';
import { effectiveSpeed } from '../strategic/simulation/consequence';
import { hashKey } from '../strategic/util/hash';

export type CuriousGrade = 'right' | 'ok' | 'wrong';
/** Vad gästen gör när spelaren klickar: kortets rad om vad spelaren ser, och vilka frågor som kan komma
 *  (sim/curiousBank.ts: läser skylten, luktar på röken, fryser, ser på priset, kommer med barn). */
export type CuriousMoment = CuriousTrigger;
export type CuriousPhase = 'approach' | 'slowDown' | 'toSign' | 'read' | 'smell' | 'watch' | 'hesitate';
export type CuriousOutcome = 'join' | 'walkOn';

export interface CuriousCardState {
  /** Frågan ur de nyfiknas bank (n01–n20). */
  questionId: string;
  axis: KnowledgeAxis;
  moment: CuriousMoment;
  /** Svarens ordning på kortet (blandas varje gång). */
  order: string[];
  left: number;
  total: number;
}

export interface CuriousGuest {
  seq: number;
  /** Från vilket håll på gångvägen gästen kommer. */
  side: 'west' | 'east';
  /** Kommer med ett barn i handen; tittar på priset när hen läser skylten. */
  child: boolean;
  price: boolean;
  /** Spelsekunder kvar tills gästen saktar in vid skylten. */
  approachLeft: number;
  /** Verkliga sekunder sedan gästen saktade in (står still medan kortet är öppet). */
  real: number;
  card: CuriousCardState | null;
  /** Svaret, och verkliga sekunder kvar av tvekan efter nästan. */
  answer: { optionId: string | null; grade: CuriousGrade | null; questionId: string } | null;
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
  /** Stamgäster som kom tillbaka i kväll. */
  regulars: number;
}

/** En gäst som fått ett rätt svar och kommer tillbaka en senare kväll. */
export interface CuriousRegular {
  id: string;
  fromDay: number;
  /** Servicedagen hen kommer (eller en senare, om kön var full eller kvällen slutade). */
  dueDay: number;
  /** När på kvällen, som andel av servicens fönster. */
  frac: number;
}

export interface CuriousState {
  current: CuriousGuest | null;
  last: CuriousLast | null;
  /** Spelsekunder sedan den förra gick eller ställde sig i kön. */
  since: number;
  seq: number;
  /** Frågorna som redan kommit i kväll. */
  asked: string[];
  tonight: CuriousTonight;
}

/** Portfolion: varje svar till en nyfiken gäst, hela säsongen. */
export interface CuriousEntry {
  at: number;
  day: number;
  questionId: string;
  optionId: string | null;
  grade: CuriousGrade | null;
  outcome: CuriousOutcome;
}

const EMPTY_TONIGHT: CuriousTonight = { passersBy: 0, talked: 0, right: 0, ok: 0, wrong: 0, unanswered: 0, joined: 0, friends: 0, queueFull: 0, regulars: 0 };

export function curiousOf(state: Pick<SimulationState, 'day'>): CuriousState {
  return state.day.curious ?? { current: null, last: null, since: CURIOUS.gapSimSeconds, seq: 0, asked: [], tonight: EMPTY_TONIGHT };
}


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

function newGuest(draft: SimulationState, billBonus = 0): Guest {
  const g = makeGuest(draft.simTime, false, false);
  g.fromCurious = true;
  if (billBonus > 0) g.billBonus = (g.billBonus ?? 0) + billBonus;
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
    const right = cur.answer?.grade === 'right';
    guestId = newGuest(draft, right ? CURIOUS.rightBillBonus : 0).id;
    c = bump(c, 'joined');
    // Efter ett rätt svar kommer gästen kanske tillbaka en senare kväll, som stamgäst.
    if (right && roll(draft, `curious${cur.seq}|return`) < CURIOUS.returnChance) planReturn(draft, guestId, cur.seq);
    if (friend && !queueFull(draft)) { friendId = newGuest(draft).id; c = bump(c, 'friends'); }
  }
  const a = cur.answer;
  if (a) draft.curiousLog = [...(draft.curiousLog ?? []), { at: draft.simTime, day: draft.day.dayNumber, questionId: a.questionId, optionId: a.optionId, grade: a.grade, outcome }];
  write(draft, { ...c, current: null, since: 0, last: { seq: cur.seq, side: cur.side, outcome, grade: a?.grade ?? null, guestId, friendId, at: draft.simTime } });
}

/** Den k:te servicedagen efter i dag (kalendern: vagnen står inte på torget alla dagar). */
function serviceDayAfter(day: number, k: number): number {
  let d = day;
  for (let n = 0; n < k; ) { d++; if (calendarFor(d).isServiceDay) n++; }
  return d;
}

function planReturn(draft: SimulationState, guestId: string, seq: number): void {
  const k = 1 + Math.floor(roll(draft, `curious${seq}|day`) * CURIOUS.returnWithinServiceDays) % CURIOUS.returnWithinServiceDays;
  const r: CuriousRegular = { id: guestId, fromDay: draft.day.dayNumber, dueDay: serviceDayAfter(draft.day.dayNumber, k), frac: roll(draft, `curious${seq}|frac`) * CURIOUS.regularLatestShare };
  draft.curiousRegulars = [...(draft.curiousRegulars ?? []), r];
}

/** Stamgästerna vars kväll är kommen kommer när deras tid på kvällen är inne och det finns plats i kön. */
function tickRegulars(draft: SimulationState): void {
  const list = draft.curiousRegulars ?? [];
  if (list.length === 0) return;
  const inc = draft.incidents;
  const from = inc?.doorsOpenAt ?? draft.day.doorsOpenAt ?? draft.simTime;
  const until = inc?.serviceEndsAt ?? draft.simTime;
  const frac = (draft.simTime - from) / Math.max(1, until - from);
  const due = list.filter((r) => r.dueDay <= draft.day.dayNumber && r.frac <= frac);
  if (due.length === 0) return;
  let c = curiousOf(draft);
  const came: string[] = [];
  for (const r of due) {
    if (queueFull(draft)) break;
    const g = newGuest(draft, CURIOUS.rightBillBonus);
    g.curiousRegular = true;
    came.push(r.id);
    c = bump(c, 'regulars');
  }
  if (came.length === 0) return;
  draft.curiousRegulars = list.filter((r) => !came.includes(r.id));
  write(draft, c);
}

/** Ett tick: gästen går fram, fönstret och kortets tid räknas ned, och en ny nyfiken kommer när det är dags. */
export function tickCurious(draft: SimulationState, dt: number): void {
  if (!inService(draft)) {
    // Kvällen är slut (eller föll ihop): den som tvekar går vidare.
    if (draft.day.curious?.current) settle(draft, false, false);
    return;
  }
  tickRegulars(draft);
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
      write(draft, bump({ ...c, current: { ...cur, card: null, answer: { optionId: null, grade: null, questionId: cur.card.questionId } } }, 'unanswered'));
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
  write(draft, bump({ ...c, seq, since: 0, current: { seq, side, child: roll(draft, `child${seq}`) < CURIOUS.childShare, price: roll(draft, `price${seq}`) < CURIOUS.priceShare, approachLeft: CURIOUS.approachSimSeconds, real: 0, card: null, answer: null, okLeft: null } }, 'passersBy'));
}

/** Vad gästen gör när spelaren klickar: fryser (en sval kväll), kommer med barn, luktar på röken, ser på
 *  priset eller läser skylten. */
export function curiousMoment(cur: CuriousGuest, cold: boolean): CuriousMoment {
  const phase = curiousPhase(cur);
  if (cold) return 'cold';
  if (cur.child) return 'child';
  if (phase === 'smell') return 'smell';
  return cur.price ? 'price' : 'sign';
}

/** Kvällen då spelaren senast pratade med en nyfiken, före i kväll (portfolion). */
function previousEvening(state: SimulationState): number | null {
  let best: number | null = null;
  for (const e of state.curiousLog ?? []) if (e.day < state.day.dayNumber && (best === null || e.day > best)) best = e.day;
  return best;
}

/** Frågan till gästen: efter vad gästen gör, inte en som kommit i kväll och inte en som kom förra kvällen
 *  (NYFIKNA_FRAGOR_319.md "Till Code" 3). Finns ingen sådan för det gästen gör tas en annan. */
function pickQuestion(state: SimulationState, seq: number, moment: CuriousMoment): string | null {
  const tonight = curiousOf(state).asked;
  const prev = previousEvening(state);
  const yesterday = new Set((state.curiousLog ?? []).filter((e) => e.day === prev).map((e) => e.questionId));
  const tiers = [
    CURIOUS_QUESTIONS.filter((q) => q.trigger === moment && !tonight.includes(q.id) && !yesterday.has(q.id)),
    CURIOUS_QUESTIONS.filter((q) => q.trigger === moment && !tonight.includes(q.id)),
    CURIOUS_QUESTIONS.filter((q) => !tonight.includes(q.id) && !yesterday.has(q.id)),
    CURIOUS_QUESTIONS.filter((q) => !tonight.includes(q.id)),
    [...CURIOUS_QUESTIONS]
  ];
  const pool = tiers.find((t) => t.length > 0) ?? [];
  if (pool.length === 0) return null;
  return pool[Math.floor(roll(state, `q${seq}`) * pool.length) % pool.length].id;
}

/** Svarens ordning: blandade ur simtiden och gästen (Fisher–Yates). */
function shuffled(state: SimulationState, seq: number, ids: readonly string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(roll(state, `order${seq}|${i}`) * (i + 1)) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Klicket på gästen: kortet öppnas med en fråga, och kvällen står i 1× medan det är öppet. */
export function openCurious(draft: SimulationState, cold = false): void {
  if (!curiousTalkable(draft)) return;
  const c = curiousOf(draft);
  const cur = c.current!;
  const moment = curiousMoment(cur, cold);
  const id = pickQuestion(draft, cur.seq, moment);
  const q = id ? curiousQuestion(id) : undefined;
  if (!q) return;
  const card: CuriousCardState = { questionId: q.id, axis: q.axis, moment, order: shuffled(draft, cur.seq, q.options.map((o) => o.id)), left: CURIOUS.card.seconds, total: CURIOUS.card.seconds };
  write(draft, bump({ ...c, asked: [...c.asked, q.id], current: { ...cur, card } }, 'talked'));
}

/** Svaret på kortet. Returnerar krediten (rätt svar) så att reducern kan bokföra den. */
export function answerCurious(draft: SimulationState, optionId: string): { axis: KnowledgeAxis; amount: number } | null {
  const c = curiousOf(draft);
  const cur = c.current;
  if (!cur?.card) return null;
  const option = curiousQuestion(cur.card.questionId)?.options.find((o) => o.id === optionId);
  if (!option) return null;
  const grade: CuriousGrade = option.quality;
  const card = cur.card;
  const answered: CuriousGuest = { ...cur, card: null, answer: { optionId, grade, questionId: card.questionId }, okLeft: grade === 'ok' ? CURIOUS.okHoldSeconds : null };
  write(draft, bump({ ...c, current: answered }, grade));
  // Ryktet stiger av ett rätt svar.
  if (grade === 'right' && CURIOUS.reputationRight > 0) draft.reputation = clampReputation(draft.reputation + CURIOUS.reputationRight / REPUTATION.scale);
  if (grade === 'right') settle(draft, true, roll(draft, `curious${cur.seq}|friend`) < CURIOUS.friendChance);
  else if (grade === 'wrong') settle(draft, false, false);
  return grade === 'right' && CURIOUS.creditRight > 0 ? { axis: card.axis, amount: CURIOUS.creditRight } : null;
}

/** Notan från en gäst som kom via en nyfiken (reducern, när gästen betalar). */
export function recordCuriousRevenue(draft: SimulationState, guest: Guest, sek: number): void {
  if (!guest.fromCurious || sek <= 0) return;
  draft.day = { ...draft.day, curiousRevenueSek: (draft.day.curiousRevenueSek ?? 0) + sek };
  if (guest.curiousRegular) draft.day = { ...draft.day, curiousRegularRevenueSek: (draft.day.curiousRegularRevenueSek ?? 0) + sek };
}
