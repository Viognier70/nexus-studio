// ORDER 296b — satsningarna som lönar sig när de används klokt (Vision Owner
// 2026-10-02): "DJ en fullbokad fredag eller lördag, springare vid stor
// bokning, men inte när de används varje kväll". Talen står i balance.ts
// EVENING_ECONOMY.
//
// DJ:n: när musiken börjar (djFromMinute) beställer varje gäst som sitter ett
// (efter veckans två första DJ-kvällar en andel av dem,
// djLaterRoundShare)
// glas till ur lagret, till listans pris (den sena rundan): det första i
// djRoundDishIds som finns kvar. En gång per kväll.
// Springaren läses av service.ts (runnerTableTaskTime).

import type { SimulationState } from '../strategic/types';
import { applyCashRevenue } from '../strategic/simulation/cashReading';
import { takeFromStock } from '../strategic/simulation/stockPackages';
import { clockMinutes } from './clock';
import { calendarFor } from './calendar';
import { EVENING_ECONOMY, SERVICE_STREAM } from './balance';
import { DJ_ACTIVITY_ID } from '../strategic/simulation/eveningEconomy';

const SEATED = new Set(['seated', 'ordering', 'dining']);

export function djPlaying(state: SimulationState): boolean {
  return (state.day.pickedActivityIds ?? []).includes(DJ_ACTIVITY_ID) && state.day.period === 'dinner' && clockMinutes(state) >= EVENING_ECONOMY.djFromMinute;
}

export function tickDjRound(draft: SimulationState): void {
  if (draft.day.djRoundAt != null || !djPlaying(draft)) return;
  const menu = EVENING_ECONOMY.djRoundDishIds.map((id) => draft.menu.find((m) => m.dishId === id)).filter((m): m is NonNullable<typeof m> => !!m);
  // Musiken drar mest när den är något särskilt (djFullRoundsPerWeek).
  const week = calendarFor(draft.day.dayNumber).week;
  const before = draft.djWeek && draft.djWeek.week === week ? draft.djWeek.evenings : 0;
  draft.djWeek = { week, evenings: before + 1 };
  const seated = draft.guests.filter((g) => SEATED.has(g.state));
  const share = before < EVENING_ECONOMY.djFullRoundsPerWeek ? 1 : EVENING_ECONOMY.djLaterRoundShare;
  const ordering = Math.round(seated.length * share);
  let glasses = 0;
  let sek = 0;
  for (let n = 0; n < ordering; n++) {
    for (let i = 0; i < EVENING_ECONOMY.djRoundGlassesPerGuest; i++) {
      const item = menu.find((m) => (draft.day.platesRemaining[m.dishId] ?? 0) > 0);
      if (!item) break;
      takeFromStock(draft, item.dishId, draft.simTime);
      glasses++;
      sek += item.price;
    }
  }
  if (sek > 0) {
    applyCashRevenue(draft, sek);
    draft.serviceRevenueToday = { ...draft.serviceRevenueToday, dinner: draft.serviceRevenueToday.dinner + sek / SERVICE_STREAM.sekPerKsek };
  }
  draft.day = { ...draft.day, djRoundAt: draft.simTime, djRoundGlasses: glasses, djRoundSek: Math.round(sek) };
}
