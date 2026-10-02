// ORDER 296 (kärnan punkt 1, Vision Owner 2026-10-02): hovmästarens beslut
// under hela servicen. Designs leverans hovmästaren och butiken §2–3:
//   - nålarna: ett beslut som rummet säger till om, där det finns (dörren,
//     ett bord, baren). Två svar; när tiden går ut väljer Per det säkra
//     svaret, som aldrig går fel men sällan ger mest. Under en raket står
//     tiden still. Högst HOST.maxOpen nålar åt gången.
//   - handgreppen: allt som nålarna frågar om går också att göra direkt (ge
//     bord, bjuda, sälja in, flytta personal).
// Talen i balance.ts HOST.

import type { Guest, SimulationState } from '../strategic/types';
import { HOST, QUEUE_MOOD, SERVICE_STREAM } from './balance';
import { applyCashCost, applyCashRevenue, postLedger } from '../strategic/simulation/cashReading';
import { takeFromStock } from '../strategic/simulation/stockPackages';
import { isSeatedCapacity, seatGroupsFree, seatWaitingNow } from '../strategic/simulation/service';
import { zoneOfSeat, type HelpZone } from './hostZones';
import { t as tt } from '../content/nexusStrings';
import { getLanguage } from '../content/language';
import { hashKey } from '../strategic/util/hash';

export type PinKind = 'door' | 'wine' | 'bar' | 'waited';

export interface HostPinState {
  id: string;
  kind: PinKind;
  // Sällskapets nyckel (partyId eller gästens id), eller 'bar'.
  key: string;
  left: number;
  total: number;
  openedAt: number;
}

// Svaren är 0 (det första) och 1 (det andra), som tangenterna 1 och 2.
export type PinAnswer = 0 | 1;
export interface PinLogEntry { id: string; kind: PinKind; answer: PinAnswer; per: boolean; at: number }

export interface PinsState {
  open: HostPinState[];
  // Verklig tid sedan förra nya nålen (sekunder).
  sinceSpawn: number;
  seq: number;
  // Nycklarna som redan haft en nål i kväll (samma beslut kommer inte två gånger).
  seen: string[];
  log: PinLogEntry[];
}

// Svaret Per väljer: alltid det säkra (Designs perDefault).
export const PER_DEFAULT: Record<PinKind, PinAnswer> = { door: 1, wine: 1, bar: 1, waited: 1 };

const SEATED = new Set<Guest['state']>(['seated', 'ordering', 'dining']);

export function pinsOf(state: Pick<SimulationState, 'day'>): PinsState {
  return state.day.pins ?? { open: [], sinceSpawn: HOST.spawnGapSeconds, seq: 0, seen: [], log: [] };
}

const keyOf = (g: Guest) => g.partyId ?? g.id;

// Den lediga sitsgrupp där hela sällskapet får plats (Ge bord: Passar här).
export function tablesThatFit(state: SimulationState, size: number): readonly number[][] {
  return seatGroupsFree(state).filter((g) => g.free.length >= size).map((g) => g.free);
}

function partyOf(state: SimulationState, key: string): Guest[] {
  return state.guests.filter((g) => keyOf(g) === key);
}

// Mogna beslut just nu, i den ordning de kommer.
function candidates(state: SimulationState): { kind: PinKind; key: string }[] {
  const out: { kind: PinKind; key: string }[] = [];
  const waiting = state.guests.filter((g) => g.state === 'waiting');
  // En gäst i kön som väntat för länge.
  for (const g of waiting) if (g.satisfaction < QUEUE_MOOD.impatientBelow) out.push({ kind: 'waited', key: keyOf(g) });
  // Dörren: kön har minst doorMinQueue sällskap; beslutet gäller det som
  // väntat längst (ge bord nu, eller ett glas i baren medan de väntar).
  const parties = [...new Set(waiting.map(keyOf))];
  if (parties.length >= HOST.doorMinQueue) out.push({ kind: 'door', key: parties[0] });
  // Baren hinner inte med: flera vid baren väntar på sin beställning.
  const atBar = state.guests.filter((g) => (g.state === 'seated' || g.state === 'ordering') && zoneOfSeat(g.seatIndex) === 'bar').length;
  // Baren kan behöva hjälp igen efter en stund (nyckeln bär tidsfönstret).
  if (atBar >= HOST.barMinWaiting) out.push({ kind: 'bar', key: `bar@${Math.floor(state.simTime / HOST.barRepeatSimSeconds)}` });
  // Vinlistan: ett sällskap vid ett bord (inte vid baren) som inte har beställt än.
  for (const g of state.guests) {
    if ((g.state !== 'seated' && g.state !== 'ordering') || g.order || zoneOfSeat(g.seatIndex) === 'bar') continue;
    out.push({ kind: 'wine', key: keyOf(g) });
  }
  return out;
}

// Ett tick: nålarnas tid (verklig tid, står still under en raket), Pers val
// när tiden gått ut, och en ny nål när ett beslut är moget.
export function tickPins(draft: SimulationState, dt: number): void {
  if (draft.day.period !== 'dinner' || !draft.day.doorsOpenedThisService) return;
  if (draft.incidents?.active) return;
  const real = dt / Math.max(1, draft.speed);
  let pins = pinsOf(draft);
  // Pinnar vars sällskap har gått eller fått bord stängs utan svar.
  const alive = pins.open.filter((p) => p.kind === 'bar' || partyOf(draft, p.key).some((g) => g.state !== 'leaving' && g.state !== 'declined'));
  pins = { ...pins, open: alive.map((p) => ({ ...p, left: p.left - real })), sinceSpawn: pins.sinceSpawn + real };
  draft.day = { ...draft.day, pins };
  for (const p of pins.open.filter((x) => x.left <= 0)) answerPin(draft, p.id, PER_DEFAULT[p.kind], true);
  pins = pinsOf(draft);
  // När det är fullt kommer ett beslut med några sekunders mellanrum; en
  // lugn kväll glesare.
  const full = draft.seatedIds.length >= isSeatedCapacity(draft) * HOST.fullShare;
  const gap = full ? HOST.spawnGapSeconds : HOST.spawnGapSeconds * HOST.quietGapFactor;
  if (pins.open.length >= HOST.maxOpen || pins.sinceSpawn < gap) return;
  const next = candidates(draft).find((c) => !pins.seen.includes(`${c.kind}:${c.key}`) && !pins.open.some((p) => p.kind === c.kind && p.key === c.key));
  if (!next) return;
  const id = `pin${pins.seq + 1}`;
  draft.day = {
    ...draft.day,
    pins: {
      ...pins,
      seq: pins.seq + 1,
      sinceSpawn: 0,
      seen: [...pins.seen, `${next.kind}:${next.key}`],
      open: [...pins.open, { id, kind: next.kind, key: next.key, left: HOST.pinSeconds, total: HOST.pinSeconds, openedAt: draft.simTime }]
    }
  };
}

// Sälj något extra ur lagret till listans pris.
function sell(draft: SimulationState, dishId: string): number {
  const item = draft.menu.find((m) => m.dishId === dishId);
  if (!item || (draft.day.platesRemaining[dishId] ?? 0) <= 0) return 0;
  takeFromStock(draft, dishId, draft.simTime);
  applyCashRevenue(draft, item.price);
  draft.serviceRevenueToday = { ...draft.serviceRevenueToday, dinner: draft.serviceRevenueToday.dinner + item.price / SERVICE_STREAM.sekPerKsek };
  return item.price;
}

function lift(guests: Guest[], by: number): void {
  for (const g of guests) g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + by));
}

// Hovmästarens slump: deterministisk ur simtiden och nyckeln, utan att flytta
// simuleringens slumpflöde (tiden först i nyckeln, så att FNV sprider).
function roll(draft: SimulationState, key: string): number {
  return hashKey(draft.seed ?? 0, `${Math.round(draft.simTime)}|${key}`);
}

// ---------- Handgreppen (och nålarnas utfall) ----------

// Ge bord: sällskapet sätts vid bordet (eller de bord som räcker) nu.
export function seatPartyNow(draft: SimulationState, key: string, seats?: readonly number[]): number {
  const waiting = partyOf(draft, key).filter((g) => g.state === 'waiting');
  const free = seats && seats.length > 0 ? [...seats] : seatGroupsFree(draft).flatMap((g) => g.free);
  let n = 0;
  for (const g of waiting) {
    const seat = free.shift();
    if (seat === undefined) break;
    seatWaitingNow(draft, g, seat);
    n++;
  }
  lift(partyOf(draft, key), n > 0 ? HOST.seatSatisfaction : 0);
  draft.day = { ...draft.day, seatHint: null };
  return n;
}

// Bjud: ett glas ur lagret (ingen intäkt) eller kaffe (en liten kostnad).
export function comp(draft: SimulationState, key: string, what: 'glass' | 'coffee'): void {
  const party = partyOf(draft, key).filter((g) => g.state !== 'leaving' && g.state !== 'declined');
  if (party.length === 0) return;
  if (what === 'glass') {
    for (const g of party) if ((draft.day.platesRemaining[HOST.glassDishId] ?? 0) > 0) { takeFromStock(draft, HOST.glassDishId, draft.simTime); lift([g], HOST.compGlassSatisfaction); }
  } else {
    const cost = HOST.compCoffeeCostSek * party.length;
    applyCashCost(draft, cost);
    postLedger(draft, { category: 'other', amount: -cost, cause: tt(getLanguage(), 'host.coffeeLedger') });
    lift(party, HOST.compCoffeeSatisfaction);
  }
}

// Sälj in: dessert eller ett glas till; inte alla säger ja.
export function upsell(draft: SimulationState, key: string, what: 'dessert' | 'wine'): number {
  const party = partyOf(draft, key).filter((g) => SEATED.has(g.state));
  let sek = 0;
  party.forEach((g, i) => {
    if (roll(draft, `${key}|${what}|${i}`) >= HOST.upsellChance) { lift([g], HOST.upsellDeclineSatisfaction); return; }
    const ids = what === 'dessert' ? HOST.dessertDishIds : [HOST.glassDishId];
    for (const id of ids) { const got = sell(draft, id); if (got > 0) { sek += got; break; } }
  });
  return sek;
}

// Flytta personal dit det brinner: uppgifterna i zonen går fortare en stund,
// de andra lite långsammare.
export function moveHelp(draft: SimulationState, zone: HelpZone): void {
  draft.day = { ...draft.day, helpZone: { zone, until: draft.simTime + HOST.helpSimSeconds } };
}

// ---------- Nålarnas svar ----------

export function answerPin(draft: SimulationState, pinId: string, answer: PinAnswer, per = false): void {
  const pins = pinsOf(draft);
  const pin = pins.open.find((p) => p.id === pinId);
  if (!pin) return;
  draft.day = { ...draft.day, pins: { ...pins, open: pins.open.filter((p) => p.id !== pinId), log: [...pins.log, { id: pinId, kind: pin.kind, answer, per, at: draft.simTime }] } };
  const party = partyOf(draft, pin.key);
  switch (pin.kind) {
    case 'door':
      // Första: ställ ihop borden och sätt sällskapet nu; andra (säkert): de väntar i baren med ett glas.
      if (answer === 0) seatPartyNow(draft, pin.key);
      else for (const g of party.filter((x) => x.state === 'waiting')) { sell(draft, HOST.glassDishId); lift([g], HOST.barDrinkSatisfaction); }
      break;
    case 'wine':
      // Första: sommeliern föreslår en flaska (fler säger ja än nej); andra (säkert): husets vin, ett glas var.
      // Beslutet styr vad gästen beställer (guestOrders.ts hostDrink), inte ett glas extra.
      if (answer === 0) {
        const yes = roll(draft, `${pin.key}|bottle`) < HOST.bottleChance;
        for (const g of party) if (yes) g.hostDrink = 'bottle';
        lift(party, HOST.wineSatisfaction);
      } else for (const g of party) g.hostDrink = 'house';
      break;
    case 'bar':
      // Första: flytta servitören till baren; andra (säkert): baren tar det i sin takt.
      if (answer === 0) moveHelp(draft, 'bar');
      break;
    case 'waited':
      // Första: bjud på ett glas; andra (säkert): Per ber om ursäkt.
      if (answer === 0) comp(draft, pin.key, 'glass');
      else lift(party.filter((g) => g.state === 'waiting'), HOST.apologySatisfaction);
      break;
  }
}
