// ORDER 287a — gästerna med kapital (Vision Owner 2026-09-29 och
// 2026-09-30). Speldesign > Servicen > Gästerna.
//
// "Varje gästtyp har eget ekonomiskt och socialt kapital, och det ska
// märkas i spelet": studenten med lite pengar och billig öl som tar
// platsen en lång stund, medelinkomsttagaren med normal nota,
// höginkomsttagaren som beställer dyrare och förväntar sig mer, gästen
// med socialt kapital som sprider ryktet, och miljardären i guld som
// ibland väljer en krog, köper det dyraste och kan bjuda hela salen.
//
// Bokningsboken (Designs skärm 1) räknas ur marknadens tak för kvällen
// och typernas andelar i balance.ts, och låses när dörrarna öppnar. Varje
// gäst som kommer får en typ ur det som ännu inte kommit av bokningen, från
// den tid typen brukar komma. Valet läses ur fröet och gästens id, så att
// simuleringens slumpflöde inte flyttas. Gäster utan bokning, och de som
// kommer när boken är slut, får en typ efter andelarna.

import type { Guest, GuestBooking, GuestType, SimulationState } from '../types';
import { BILLIONAIRE, GAME_MINUTES_PER_SIM_SECOND, GUEST_TYPES, SOCIAL_GUEST } from '../../sim/balance';
import { dailyGuestCap } from '../../sim/economy';
import { answerBookingsFor } from '../../sim/nextDay';
import { calendarFor } from '../../sim/calendar';
import { strings } from '../../content/strings';
import { findDish } from './m4Catalogue';
import { takeFromStock } from './stockPackages';
import { hash01 } from './guestOrders';
import { makeGuest } from './model';

type BookedType = 'student' | 'middle' | 'high';
const BOOKED: readonly BookedType[] = ['student', 'middle', 'high'];

export function typeShares(state: Pick<SimulationState, 'businessClass'>): Record<BookedType, number> {
  return GUEST_TYPES.share[state.businessClass] ?? GUEST_TYPES.share.default;
}

// Kvällens bokningsbok ur tillståndet just nu. Låst i day.booking när
// dörrarna öppnar (reducer.ts startService); morgonen läser den här.
export function bookingFor(state: SimulationState): GuestBooking {
  const day = state.day.dayNumber;
  const seed = state.seed ?? 0;
  const cal = calendarFor(day);
  const capRaw = cal.isServiceDay ? dailyGuestCap(state) : 0;
  const capAll = Number.isFinite(capRaw) ? capRaw : 0;
  // ORDER 292 — gårdagens svar står som egna rader; typerna delar resten.
  const answerNet = answerBookingsFor(state);
  const cap = Math.max(0, capAll - answerNet);
  const socialComing = cap > 0 && hash01(seed, `day${day}|social`) < SOCIAL_GUEST.chancePerEvening;
  const booked = Math.round(cap * (1 - GUEST_TYPES.walkInShare));
  const shares = typeShares(state);
  const student = Math.round(booked * shares.student);
  const high = Math.round(booked * shares.high);
  const middle = Math.max(0, booked - student - high - (socialComing ? 1 : 0));
  const inTown = cap > 0 && BILLIONAIRE.inTown.includes(cal.weekday);
  const chance = BILLIONAIRE.chooseBase + BILLIONAIRE.chooseByReputation * state.reputation;
  const names = strings.guestTypes.socialNames.length;
  return {
    dayNumber: day,
    counts: { student, middle, high },
    social: socialComing ? { nameIndex: Math.floor(hash01(seed, `day${day}|name`) * names) } : null,
    walkIns: Math.max(0, cap - booked),
    total: capAll,
    billionaireInTown: inTown,
    billionaire: inTown && hash01(seed, `day${day}|billionaire`) < chance,
    answers: state.answerBookings && state.answerBookings.forDay === day ? state.answerBookings.items : []
  };
}

export function currentBooking(state: SimulationState): GuestBooking {
  const b = state.day.booking;
  return b && b.dayNumber === state.day.dayNumber ? b : bookingFor(state);
}

// Spelminuter sedan servicen började (18.00).
function minutesIntoService(state: SimulationState): number {
  return Math.max(0, Math.floor((state.simTime - state.day.periodStartAt) * GAME_MINUTES_PER_SIM_SECOND));
}

function weightedPick<T extends string>(keys: readonly T[], weights: number[], r: number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < keys.length; i++) {
    x -= weights[i];
    if (x < 0) return keys[i];
  }
  return keys[keys.length - 1];
}

function pickType(state: SimulationState, book: GuestBooking, arrived: Partial<Record<GuestType, number>>, guest: Guest): GuestType {
  const at = GUEST_TYPES.arrivesAfterMinutes;
  const min = minutesIntoService(state);
  // En gäst som vänder vid dörren är aldrig miljardären eller den med
  // socialt kapital: de kommer för att stanna.
  if (!guest.walkAwayOnArrival && !guest.scenarioSource) {
    if (book.social && !arrived.social && min >= at.social) return 'social';
  }
  const r = hash01(state.seed ?? 0, `${guest.id}|type`);
  const left = BOOKED.map((t) => (min >= at[t] ? Math.max(0, book.counts[t] - (arrived[t] ?? 0)) : 0));
  if (left.some((w) => w > 0)) return weightedPick(BOOKED, left, r);
  const shares = typeShares(state);
  return weightedPick(BOOKED, BOOKED.map((t) => shares[t]), r);
}

// Miljardären kommer när han har valt krogen, på sin tid, också när
// marknadens tak för kvällen redan är nått: han är ingen del av poolen.
// Anropas av reducern efter kvällens vanliga ankomster.
export function maybeBillionaireArrives(draft: SimulationState): void {
  if (draft.day.period !== 'dinner' || (draft.day.doorsOpenAt !== null && draft.simTime < draft.day.doorsOpenAt)) return;
  if (draft.day.billionaireVisit) return;
  const book = draft.day.booking;
  if (!book || book.dayNumber !== draft.day.dayNumber || !book.billionaire) return;
  if (minutesIntoService(draft) < GUEST_TYPES.arrivesAfterMinutes.billionaire) return;
  const g = makeGuest(draft.simTime, false, false);
  g.guestType = 'billionaire';
  g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + GUEST_TYPES.satisfactionOffset.billionaire));
  draft.guests.push(g);
  const arrived = { ...(draft.day.guestTypeArrivals ?? {}) };
  arrived.billionaire = (arrived.billionaire ?? 0) + 1;
  draft.day = { ...draft.day, guestTypeArrivals: arrived, billionaireVisit: { guestId: g.id, billSek: 0, treated: false, glasses: 0 } };
  streamGuestLine(draft, strings.guestTypes.stream.billionaireArrives, 'guest_billionaire_arrives');
}

// Ger varje gäst utan typ en typ (en gång per gäst, i den ordning de kom).
// Ett sällskap har samma typ, utom att den med socialt kapital och
// miljardären har medelinkomsttagare med sig.
export function assignGuestTypes(draft: SimulationState): void {
  const untyped = draft.guests.filter((g) => !g.guestType);
  if (untyped.length === 0) return;
  if (!draft.day.booking || draft.day.booking.dayNumber !== draft.day.dayNumber) {
    draft.day = { ...draft.day, booking: bookingFor(draft) };
  }
  const book = draft.day.booking!;
  const arrived: Partial<Record<GuestType, number>> = { ...(draft.day.guestTypeArrivals ?? {}) };
  const byParty = new Map<string, GuestType>();
  for (const g of draft.guests) if (g.guestType && g.partyId) byParty.set(g.partyId, g.guestType);
  for (const g of untyped) {
    const partyType = g.partyId ? byParty.get(g.partyId) : undefined;
    const t: GuestType = partyType
      ? (partyType === 'social' || partyType === 'billionaire' ? 'middle' : partyType)
      : pickType(draft, book, arrived, g);
    g.guestType = t;
    g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + GUEST_TYPES.satisfactionOffset[t]));
    arrived[t] = (arrived[t] ?? 0) + 1;
    if (g.partyId && !partyType) byParty.set(g.partyId, t);
    if (t === 'social') {
      draft.day = { ...draft.day, socialGuest: { guestId: g.id, outcome: null } };
      streamGuestLine(draft, strings.guestTypes.stream.socialArrives(socialName(book.social?.nameIndex ?? 0)), 'guest_social_arrives');
    }
  }
  draft.day = { ...draft.day, guestTypeArrivals: arrived };
}

export function socialName(index: number): string {
  const names = strings.guestTypes.socialNames;
  return names[((index % names.length) + names.length) % names.length];
}

function streamGuestLine(draft: SimulationState, text: string, kind: string): void {
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: 'positive', causeTag: null, causeChainId: null,
    sustainability: 'social', kind, scenarioId: null
  }];
}

// Sittiden gånger typens faktor (service.ts diningDuration).
export function stayFactor(guest: Pick<Guest, 'guestType'>): number {
  return guest.guestType ? GUEST_TYPES.stayFactor[guest.guestType] : 1;
}

// Kvällens intäkt per typ (reducer.ts, när gästen betalar).
export function recordTypeRevenue(draft: SimulationState, guest: Guest, sek: number): void {
  if (!guest.guestType || sek <= 0) return;
  const rev = { ...(draft.day.guestTypeRevenue ?? {}) };
  rev[guest.guestType] = (rev[guest.guestType] ?? 0) + sek;
  const bills = { ...(draft.day.guestTypeBills ?? {}) };
  bills[guest.guestType] = (bills[guest.guestType] ?? 0) + 1;
  draft.day = { ...draft.day, guestTypeRevenue: rev, guestTypeBills: bills };
  const v = draft.day.billionaireVisit;
  if (guest.guestType === 'billionaire' && v && v.guestId === guest.id) {
    draft.day = { ...draft.day, billionaireVisit: { ...v, billSek: v.billSek + sek } };
  }
}

// ---------------------------------------------------------------------
// Gästen med socialt kapital
// ---------------------------------------------------------------------

export type SocialOutcome = 'good' | 'bad' | 'neutral';

export function socialOutcomeFor(satisfaction: number): SocialOutcome {
  if (satisfaction >= SOCIAL_GUEST.goodFrom) return 'good';
  if (satisfaction < SOCIAL_GUEST.badBelow) return 'bad';
  return 'neutral';
}

// De närmaste servicekvällarna efter i dag.
function nextServiceDays(day: number, n: number): { from: number; until: number } {
  let d = day;
  let from = 0;
  for (let found = 0; found < n; ) {
    d += 1;
    if (!calendarFor(d).isServiceDay) continue;
    if (found === 0) from = d;
    found += 1;
  }
  return { from, until: d };
}

// När gästen med socialt kapital går (betalat, gett upp eller gått utan
// mat) sprider hen det hen tyckte de närmaste kvällarna: marknadens tak
// växer eller krymper (sim/economy.ts dailyGuestCap).
export function settleSocialGuest(state: SimulationState, guest: Guest, gaveUp: boolean): void {
  const sg = state.day.socialGuest;
  if (!sg || sg.guestId !== guest.id || sg.outcome !== null) return;
  const outcome: SocialOutcome = gaveUp ? 'bad' : socialOutcomeFor(guest.satisfaction);
  state.day = { ...state.day, socialGuest: { ...sg, outcome } };
  const nameIndex = currentBooking(state).social?.nameIndex ?? 0;
  const name = socialName(nameIndex);
  if (outcome === 'neutral') {
    streamGuestLine(state, strings.guestTypes.stream.socialNeutral(name), 'guest_social_neutral');
    return;
  }
  const { from, until } = nextServiceDays(state.day.dayNumber, SOCIAL_GUEST.buzzEvenings);
  const factor = outcome === 'good' ? SOCIAL_GUEST.buzzGood : SOCIAL_GUEST.buzzBad;
  state.guestBuzz = [...(state.guestBuzz ?? []).filter((b) => b.untilDay >= state.day.dayNumber), { fromDay: from, untilDay: until, factor, nameIndex }];
  const line = outcome === 'good' ? strings.guestTypes.stream.socialGood(name) : strings.guestTypes.stream.socialBad(name);
  state.eventStream = [...state.eventStream, {
    at: state.simTime, text: line, category: outcome === 'good' ? 'positive' : 'ambient', causeTag: null, causeChainId: null,
    sustainability: 'social', kind: `guest_social_${outcome}`, scenarioId: null
  }];
}

// Servicen stänger medan gästen med socialt kapital sitter kvar.
export function settleSocialGuestAtClose(state: SimulationState): void {
  const sg = state.day.socialGuest;
  if (!sg || sg.outcome !== null) return;
  const g = state.guests.find((x) => x.id === sg.guestId);
  if (g) settleSocialGuest(state, g, false);
}

// Ryktets faktor på marknadens tak i dag (1 = inget rykte).
export function buzzFactor(state: Pick<SimulationState, 'guestBuzz' | 'day'>): number {
  const d = state.day.dayNumber;
  const sum = (state.guestBuzz ?? []).reduce((f, b) => (b.fromDay <= d && d <= b.untilDay ? f + b.factor : f), 0);
  return Math.max(0, 1 + sum);
}

// ---------------------------------------------------------------------
// Miljardären
// ---------------------------------------------------------------------

const IN_ROOM = new Set<Guest['state']>(['seated', 'ordering', 'dining', 'serving', 'paying']);

function glassesIn(dishId: string): number {
  const d = findDish(dishId);
  return d?.drink === 'wine-bottle' ? d.glassesPerBottle ?? 1 : 1;
}

// När miljardären har beställt kan han bjuda hela salen på champagne: ett
// glas per gäst i rummet, hällt ur det dyraste vinet i lagret (per glas).
// Notan växer med det som hälls. Returnerar det som läggs på hans nota.
export function billionaireTreat(draft: SimulationState, guest: Guest): number {
  const v = draft.day.billionaireVisit;
  if (!v || v.guestId !== guest.id || v.treated) return 0;
  if (hash01(draft.seed ?? 0, `day${draft.day.dayNumber}|treat`) >= BILLIONAIRE.treatChance) return 0;
  const room = draft.guests.filter((g) => g.id !== guest.id && IN_ROOM.has(g.state));
  const wines = draft.menu
    .filter((m) => { const k = findDish(m.dishId)?.drink; return k === 'wine-bottle' || k === 'wine-glass'; })
    .sort((a, b) => b.price / glassesIn(b.dishId) - a.price / glassesIn(a.dishId));
  let need = room.length;
  let glasses = 0;
  let extra = 0;
  for (const w of wines) {
    while (need > 0 && (draft.day.platesRemaining[w.dishId] ?? 0) > 0) {
      takeFromStock(draft, w.dishId, draft.simTime);
      const per = glassesIn(w.dishId);
      glasses += per;
      need -= per;
      extra += w.price;
    }
  }
  if (glasses === 0) return 0;
  for (const g of room) g.satisfaction = Math.min(1, g.satisfaction + BILLIONAIRE.treatSatisfaction);
  draft.day = { ...draft.day, billionaireVisit: { ...v, treated: true, glasses: Math.min(glasses, room.length) } };
  streamGuestLine(draft, strings.guestTypes.stream.billionaireTreats(Math.min(glasses, room.length)), 'guest_billionaire_treats');
  return extra;
}

// ---------------------------------------------------------------------
// Kvällens gäster, till kvällens resultat (R1)
// ---------------------------------------------------------------------

export interface EveningGuests {
  rows: { type: GuestType; guests: number; revenueSek: number }[];
  social: { name: string; outcome: SocialOutcome | 'away' | null } | null;
  billionaire: { billSek: number; treated: boolean; glasses: number } | 'elsewhere' | 'left' | null;
}

export function eveningGuests(state: SimulationState): EveningGuests {
  const d = state.day;
  const arrived = d.guestTypeArrivals ?? {};
  const revenue = d.guestTypeRevenue ?? {};
  const types: readonly GuestType[] = ['student', 'middle', 'high', 'social', 'billionaire'];
  const rows = types
    .filter((t) => (arrived[t] ?? 0) > 0)
    .map((t) => ({ type: t, guests: arrived[t] ?? 0, revenueSek: Math.round(revenue[t] ?? 0) }));
  const book = d.booking && d.booking.dayNumber === d.dayNumber ? d.booking : null;
  const social = book?.social
    ? { name: socialName(book.social.nameIndex), outcome: d.socialGuest ? d.socialGuest.outcome : 'away' as const }
    : null;
  const v = d.billionaireVisit;
  const billionaire = v ? (v.billSek > 0 ? { billSek: Math.round(v.billSek), treated: v.treated, glasses: v.glasses } : 'left' as const)
    : book?.billionaireInTown ? 'elsewhere' as const : null;
  return { rows, social, billionaire };
}
