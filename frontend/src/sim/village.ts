// ORDER 288 — byn och konkurrensen. Rivalerna (krogarna och vagnarna) och
// det gemensamma gästflödet.
//
// Vision Owner 2026-10-01: "Rivaler som styrs av datorn … De drar gäster från
// samma gemensamma flöde som du." och "bygg rivalerna så att en rival senare
// kan vara en människa (flera spelare i version 2)."
//
// Modellen (logiken ur Designs Byn och gasterna.html, choose()):
//   - Dagens pool (MARKET.basePoolPerDay × kalenderns gästfaktor) delas på
//     gästtyperna (VILLAGE.poolMix).
//   - Varje typ väljer bland krogarna som har öppet i kväll med vikten
//       smak × stjärnvikt × prisvikt
//     där stjärnvikten är bas + per stjärna × stjärnor (inte för studenten)
//     och prisvikten (gränsen / notan)^exponent när notan är över typens
//     gräns i byn (VILLAGE.priceComfortSek).
//   - Spelarens andel är summan över typerna av spelarens vikt mot alla
//     vikter. Den har fortfarande kunskapens tak (marknadens andelstak,
//     sim/economy.ts marketShareCap): spelaren får aldrig mer än taket.
//   - Det spelaren inte tar går till rivalerna efter samma vikter, högst så
//     många som de har platser för (platser × sittningar, vagnarna
//     VILLAGE.truckGuestsPerEvening).
//
// Rivalen som gränssnitt: varje rival har en `control` ('computer' eller
// 'human') och en RivalController som ger kvällens plan (öppet, nota,
// plats) och tar emot kvällens utfall (ryktet). Datorns rival planerar ur
// fröet och veckodagen; en människas rival läser planen hon har satt
// (RivalState.plan, åtgärden SET_RIVAL_PLAN). Marknaden behandlar båda lika.
//
// Allt läses ur fröet och dagen (hashKey), så att byn kan spelas om och
// simuleringens slumpflöde inte flyttas.

import { BUSINESS_CLASSES, MARKET, RUSH, VILLAGE, type Weekday } from './balance';
import { calendarFor } from './calendar';
import { hashKey, signedKey } from '../strategic/util/hash';
import type { SimulationState } from '../strategic/types';

export type PoolType = 'student' | 'middle' | 'high';
export const POOL_TYPES: readonly PoolType[] = ['student', 'middle', 'high'];
export type RivalId = (typeof VILLAGE.rivals)[number]['id'];
export type TruckSpot = (typeof VILLAGE.truckSpots)[number];
export type RivalControl = 'computer' | 'human';
export const PLAYER_VENUE = 'player';

export type RivalDef = (typeof VILLAGE.rivals)[number];

// Kvällens plan för en rival: öppet, notan per gäst och (vagnarna) platsen.
export interface RivalPlan {
  open: boolean;
  billSek: number;
  spot: TruckSpot | null;
}

// Det som sparas per rival. Ryktet rör sig efter kvällarna; resten av
// rivalen (namn, mat, platser) står i VILLAGE.rivals.
export interface RivalState {
  id: string;
  control: RivalControl;
  reputation: number;
  // En människas plan för kvällen (control 'human'). Datorn läser den inte.
  plan?: RivalPlan | null;
}

export interface VillageState {
  rivals: RivalState[];
}

// En krogs kväll: gäster per typ, intäkten och vad den hade för plats.
export interface VenueEvening {
  id: string;
  open: boolean;
  guests: number;
  revenueSek: number;
  seats: number;
  stars: number;
  // Ryktet när kvällen började (för tidningens "steg mest").
  reputation?: number;
  typeGuests: Record<PoolType, number>;
  // Turisterna från bussen (ingår i guests).
  bus: number;
  spot: TruckSpot | null;
}

export interface RivalController {
  plan(def: RivalDef, rival: RivalState, ctx: { seed: number; dayNumber: number; weekday: Weekday }): RivalPlan;
  settle(def: RivalDef, rival: RivalState, evening: VenueEvening, ctx: { seed: number; dayNumber: number }): RivalState;
}

function rivalDef(id: string): RivalDef | undefined {
  return VILLAGE.rivals.find((r) => r.id === id);
}

// Fullheten (gäster mot vad krogen kan ta) flyttar ryktet; marknaden dömer
// datorn och människan lika.
function settleReputation(def: RivalDef, rival: RivalState, evening: VenueEvening, ctx: { seed: number; dayNumber: number }): RivalState {
  if (!evening.open) return rival;
  const capacity = capacityOf(def);
  const fullness = capacity > 0 ? evening.guests / capacity : 0;
  const noise = signedKey(ctx.seed, `village|${def.id}|rep|${ctx.dayNumber}`) * VILLAGE.reputationNoise;
  const [lo, hi] = VILLAGE.reputationRange;
  const next = rival.reputation + VILLAGE.reputationStep * (fullness - VILLAGE.reputationTargetFullness) + noise;
  return { ...rival, reputation: Math.max(lo, Math.min(hi, next)) };
}

const computer: RivalController = {
  plan(def, _rival, ctx) {
    const open = def.openDays.includes(ctx.weekday);
    const spread = signedKey(ctx.seed, `village|${def.id}|price|${ctx.dayNumber}`) * VILLAGE.priceSpread;
    const spot = def.kind === 'truck' ? VILLAGE.truckSchedule[ctx.weekday]?.[def.id] ?? null : null;
    return { open, billSek: Math.round(def.billSek * (1 + spread)), spot };
  },
  settle: settleReputation
};

const human: RivalController = {
  plan(def, rival) {
    return rival.plan ?? { open: false, billSek: def.billSek, spot: null };
  },
  settle: settleReputation
};

export const RIVAL_CONTROLLERS: Record<RivalControl, RivalController> = { computer, human };

export function initialVillage(): VillageState {
  return { rivals: VILLAGE.rivals.map((r) => ({ id: r.id, control: 'computer' as const, reputation: r.reputation })) };
}

export function villageOf(state: Pick<SimulationState, 'competition'>): VillageState {
  return state.competition ?? initialVillage();
}

export function starsFor(reputation: number): number {
  const { min, max } = VILLAGE.stars;
  return Math.max(min, Math.min(max, Math.round(min + reputation * (max - min))));
}

function capacityOf(def: RivalDef): number {
  return def.kind === 'truck' ? VILLAGE.truckGuestsPerEvening : Math.round(def.seats * def.turns);
}

function starWeight(type: PoolType, stars: number): number {
  if (VILLAGE.starWeight.ignoredBy.includes(type)) return 1;
  return VILLAGE.starWeight.base + VILLAGE.starWeight.perStar * stars;
}

function priceWeight(type: PoolType, billSek: number): number {
  const comfort = VILLAGE.priceComfortSek[type];
  return billSek <= comfort ? 1 : Math.pow(comfort / billSek, VILLAGE.priceExponent);
}

export function venueWeight(type: PoolType, taste: { student: number; middle: number; high: number }, stars: number, billSek: number): number {
  return taste[type] * starWeight(type, stars) * priceWeight(type, billSek);
}

// Spelarens nota: veckans intäkt per gäst hittills, annars klassens.
export function playerBillSek(state: SimulationState): number {
  const ev = state.economy?.weekEvenings ?? [];
  const guests = ev.reduce((a, e) => a + e.guests, 0);
  const revenue = ev.reduce((a, e) => a + e.revenueSek, 0);
  return guests > 0 ? revenue / guests : VILLAGE.playerBillSek;
}

export function playerTaste(state: Pick<SimulationState, 'businessClass'>) {
  return VILLAGE.playerTaste[state.businessClass] ?? VILLAGE.playerTaste.default;
}

export interface VenueTonight {
  id: string;
  kind: 'player' | 'restaurant' | 'truck';
  control: RivalControl | null;
  open: boolean;
  billSek: number;
  stars: number;
  reputation: number;
  spot: TruckSpot | null;
  seats: number;
}

// Kvällens krogar: spelarens och rivalernas planer.
export function venuesTonight(state: SimulationState, dayNumber = state.day.dayNumber): VenueTonight[] {
  const cal = calendarFor(dayNumber);
  const seed = state.seed ?? 0;
  const village = villageOf(state);
  // Ryktet när dagen började: kvällens val står still under servicen.
  const rep = state.day.reputationAtDayStart ?? state.reputation;
  const player: VenueTonight = {
    id: PLAYER_VENUE, kind: 'player', control: null, open: cal.isServiceDay && !!state.economy?.businessClass,
    billSek: playerBillSek(state), stars: starsFor(rep), reputation: rep, spot: null,
    seats: BUSINESS_CLASSES.list.find((c) => c.id === state.economy?.businessClass)?.seats ?? 0
  };
  const rivals = village.rivals.flatMap((r): VenueTonight[] => {
    const def = rivalDef(r.id);
    if (!def) return [];
    const plan = RIVAL_CONTROLLERS[r.control].plan(def, r, { seed, dayNumber, weekday: cal.weekday });
    return [{
      id: r.id, kind: def.kind, control: r.control, open: cal.isServiceDay && plan.open, billSek: plan.billSek,
      stars: starsFor(r.reputation), reputation: r.reputation, spot: plan.spot, seats: def.seats
    }];
  });
  return [player, ...rivals];
}

function tasteOf(state: SimulationState, v: VenueTonight) {
  return v.kind === 'player' ? playerTaste(state) : rivalDef(v.id)?.taste ?? { student: 0, middle: 0, high: 0 };
}

// Varje typs vikter över kvällens öppna krogar.
function weightsByType(state: SimulationState, venues: VenueTonight[]): Record<PoolType, number[]> {
  const out = {} as Record<PoolType, number[]>;
  for (const t of POOL_TYPES) out[t] = venues.map((v) => (v.open ? venueWeight(t, tasteOf(state, v), v.stars, v.billSek) : 0));
  return out;
}

// Spelarens andel av byns gäster i kväll efter rykte, pris och smak (före
// kunskapens tak).
export function playerChoiceShare(state: SimulationState): number {
  const venues = venuesTonight(state);
  const w = weightsByType(state, venues);
  let share = 0;
  for (const t of POOL_TYPES) {
    const total = w[t].reduce((a, b) => a + b, 0);
    if (total > 0) share += VILLAGE.poolMix[t] * (w[t][0] / total);
  }
  return share;
}

// Kvällens ankomster ur byns pool: alla utom bussens turister.
export function poolArrivals(day: Pick<SimulationState['day'], 'arrivalsToday' | 'touristsToday'>): number {
  return Math.max(0, (day.arrivalsToday ?? 0) - (day.touristsToday ?? 0));
}

export function villagePool(dayNumber: number): number {
  return MARKET.basePoolPerDay * calendarFor(dayNumber).guestFactor;
}

// Bussen i kväll: om den kommer, och vilken krog turisterna väljer (efter
// stjärnorna, bland krogarna med öppet, inte vagnarna). Läses ur fröet.
export interface BusTonight {
  tourists: number;
  venueId: string;
}

export function busTonight(state: SimulationState, dayNumber = state.day.dayNumber): BusTonight | null {
  const cal = calendarFor(dayNumber);
  if (!cal.isServiceDay || !VILLAGE.bus.weekdays.includes(cal.weekday)) return null;
  // Turisterna går till en krog med matsal: spelaren bara i klasserna med
  // rusningar (RUSH.classes), där kön tar emot sällskapen.
  const venues = venuesTonight(state, dayNumber).filter((v) => v.open && v.kind !== 'truck' && (v.kind !== 'player' || RUSH.classes.includes(state.businessClass)));
  if (venues.length === 0) return null;
  const weights = venues.map((v) => Math.pow(v.stars, VILLAGE.bus.starsExponent));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = hashKey(state.seed ?? 0, `village|bus|${dayNumber}`) * total;
  for (let i = 0; i < venues.length; i++) {
    x -= weights[i];
    if (x < 0) return { tourists: VILLAGE.bus.tourists, venueId: venues[i].id };
  }
  return { tourists: VILLAGE.bus.tourists, venueId: venues[venues.length - 1].id };
}

// Kvällens utfall för alla krogar, när servicen stänger. Spelarens rad är
// det som hände i rummet (gäster per typ och intäkten); rivalerna delar
// resten av poolen efter vikterna, högst sin kapacitet, och bussen går
// till den krog den valde.
export function villageEvening(
  state: SimulationState,
  player: { guests: number; revenueSek: number; typeGuests: Partial<Record<string, number>>; tourists?: number }
): VenueEvening[] {
  const day = state.day.dayNumber;
  const seed = state.seed ?? 0;
  const venues = venuesTonight(state, day);
  const w = weightsByType(state, venues);
  const pool = villagePool(day);
  const bus = busTonight(state, day);
  const rows: VenueEvening[] = venues.map((v) => ({
    id: v.id, open: v.open, guests: 0, revenueSek: 0, seats: v.seats, stars: v.stars, reputation: v.reputation,
    typeGuests: { student: 0, middle: 0, high: 0 }, bus: 0, spot: v.spot
  }));
  const playerRow = rows[0];
  playerRow.guests = player.guests;
  playerRow.revenueSek = Math.round(player.revenueSek);
  for (const t of POOL_TYPES) playerRow.typeGuests[t] = player.typeGuests[t] ?? 0;
  for (const t of POOL_TYPES) {
    // Bussens turister är inte byns gäster: de dras inte från poolen.
    const fromPool = playerRow.typeGuests[t] - (t === VILLAGE.bus.type ? player.tourists ?? 0 : 0);
    const rest = Math.max(0, pool * VILLAGE.poolMix[t] - fromPool);
    const rivalTotal = w[t].slice(1).reduce((a, b) => a + b, 0);
    if (rivalTotal <= 0) continue;
    for (let i = 1; i < rows.length; i++) rows[i].typeGuests[t] = (rest * w[t][i]) / rivalTotal;
  }
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const def = rivalDef(r.id);
    if (!def || !r.open) {
      r.typeGuests = { student: 0, middle: 0, high: 0 };
      continue;
    }
    const want = POOL_TYPES.reduce((a, t) => a + r.typeGuests[t], 0);
    const room = capacityOf(def);
    const scale = want > room && want > 0 ? room / want : 1;
    for (const t of POOL_TYPES) r.typeGuests[t] = Math.round(r.typeGuests[t] * scale);
    r.guests = POOL_TYPES.reduce((a, t) => a + r.typeGuests[t], 0);
    if (bus && bus.venueId === r.id) {
      r.bus = bus.tourists;
      r.guests += bus.tourists;
    }
    const spread = signedKey(seed, `village|${r.id}|bill|${day}`) * VILLAGE.billSpread;
    r.revenueSek = Math.round(r.guests * venues[i].billSek * (1 + spread));
  }
  if (bus && bus.venueId === PLAYER_VENUE) playerRow.bus = bus.tourists;
  return rows;
}

// Rivalernas rykte efter kvällen (varje rival efter sin controller).
export function settleVillage(state: SimulationState, evening: VenueEvening[]): VillageState {
  const village = villageOf(state);
  const ctx = { seed: state.seed ?? 0, dayNumber: state.day.dayNumber };
  return {
    rivals: village.rivals.map((r) => {
      const def = rivalDef(r.id);
      const row = evening.find((e) => e.id === r.id);
      return def && row ? RIVAL_CONTROLLERS[r.control].settle(def, r, row, ctx) : r;
    })
  };
}

// Intäkt per stol: intäkten delad på platserna (vagnarna har inga stolar).
export function revenuePerSeat(row: Pick<VenueEvening, 'revenueSek' | 'seats'>): number | null {
  return row.seats > 0 ? row.revenueSek / row.seats : null;
}

export function revenuePerGuest(row: Pick<VenueEvening, 'revenueSek' | 'guests'>): number | null {
  return row.guests > 0 ? row.revenueSek / row.guests : null;
}

// ORDER 288 — tidningens rankning: veckans gäster och intäkt per krog, och
// vem som steg och föll mest i ryktet (första mot sista kvällen).
export interface WeekRank {
  id: string;
  guests: number;
  revenueSek: number;
  reputationChange: number;
}

export function weekRanking(evenings: ReadonlyArray<{ village?: VenueEvening[] }>): WeekRank[] {
  const by = new Map<string, { guests: number; revenueSek: number; first: number | null; last: number | null; open: boolean }>();
  for (const e of evenings) {
    for (const r of e.village ?? []) {
      const cur = by.get(r.id) ?? { guests: 0, revenueSek: 0, first: null, last: null, open: false };
      cur.guests += r.guests;
      cur.revenueSek += r.revenueSek;
      cur.open = cur.open || r.open;
      if (r.reputation !== undefined) {
        if (cur.first === null) cur.first = r.reputation;
        cur.last = r.reputation;
      }
      by.set(r.id, cur);
    }
  }
  return [...by.entries()]
    .filter(([, v]) => v.open)
    .map(([id, v]) => ({ id, guests: v.guests, revenueSek: v.revenueSek, reputationChange: v.first !== null && v.last !== null ? v.last - v.first : 0 }))
    .sort((a, b) => b.guests - a.guests || b.revenueSek - a.revenueSek);
}
