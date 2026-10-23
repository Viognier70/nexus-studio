// ORDER 339 (Anders 2026-10-22: "storleken har följder") — lokalens storlek i ekonomin, ett ställe för talen:
//   A. kvällens tak för gäster växer med lokalens platser (MARKET.premisesSeatExponent); efterfrågan (kvarteret,
//      ryktet, vädret) bestämmer fortfarande hur många av dem som kommer (sim/economy.ts dailyGuestCap);
//   B. hyran följer ytan (PREMISES_SCALE.areaM2) och laget följer platserna: lönerna (sim/economy.ts dailyWagesSek)
//      och tempot (strategic/simulation/service.ts, uppgifternas tid), så att väntan inte växer med rummet.
// Allt mäts mot klassens rum vid Torget (vinbaren 20 platser, bistron 31, 145 m²), så Torget räknas som förut.
import { MARKET, PREMISES_SCALE } from './balance';
import { ladderStep } from './ladderStep';
import { playerPremisesOf, type PremisesId } from './districts';
import { planForPremises } from '../strategic/scene/tablePlans';
import { BISTRO_CAPACITY } from '../strategic/scene/bistroHouse';
import type { SimulationState } from '../strategic/types';

type ScaleState = Pick<SimulationState, 'ladder' | 'economy'>;

/** Platserna vid Torget för krogens steg (vinbaren 20, bistron 31); null för klasserna utan lokaler. */
function torgetSeats(state: ScaleState): number | null {
  const cls = state.economy?.businessClass;
  if (cls !== 'vinbar') return null;
  return ladderStep(state) === 'bistro' ? BISTRO_CAPACITY : PREMISES_SCALE.vinbarSeats;
}

/** Platserna i krogens rum: lokalens plan (tablePlans.ts), annars Torgets. */
export function premisesSeatsNow(state: ScaleState): number | null {
  const base = torgetSeats(state);
  if (base === null) return null;
  const plan = planForPremises(playerPremisesOf(state), ladderStep(state) === 'bistro');
  return plan ? plan.seats.length : base;
}

/** Platserna mot Torgets (1 vid Torget och för klasserna utan lokaler). */
export function seatRatio(state: ScaleState): number {
  const base = torgetSeats(state), seats = premisesSeatsNow(state);
  return base && seats ? seats / base : 1;
}

/** A. Kvällens tak gånger det här (1 vid Torget). ORDER 340 B (Anders 2026-10-23: "Bistrosteget får aldrig sänka
 *  resultatet för den starka spelaren") — bistrons tak är aldrig lägre än vinbarens i samma lokal. */
export function premisesCapK(state: ScaleState): number {
  const own = Math.pow(seatRatio(state), MARKET.premisesSeatExponent);
  if (state.economy?.businessClass !== 'vinbar' || ladderStep(state) !== 'bistro') return own;
  const plan = planForPremises(playerPremisesOf(state), false);
  const vinbar = Math.pow((plan ? plan.seats.length : PREMISES_SCALE.vinbarSeats) / PREMISES_SCALE.vinbarSeats, MARKET.premisesSeatExponent);
  return Math.max(own, vinbar);
}

/** B. Laget mot Torgets: uppgifternas tid och köket (mise en place) delat med det (1 vid Torget). */
export function premisesTeamK(state: ScaleState): number {
  return Math.pow(seatRatio(state), PREMISES_SCALE.teamExponent);
}

/** B. Lönerna mot Torgets (PREMISES_SCALE.wageExponent; 1 vid Torget). */
export function premisesWageK(state: ScaleState): number {
  return Math.pow(seatRatio(state), PREMISES_SCALE.wageExponent);
}

/** ORDER 340 C — servitörerna i rummet utöver Torgets: en för var PREMISES_SCALE.seatsPerExtraServer platser över
 *  Torgets för steget, högst maxExtraServers (0 vid Torget och för klasserna utan lokaler). */
export function premisesExtraServers(state: ScaleState): number {
  const base = torgetSeats(state), seats = premisesSeatsNow(state);
  if (!base || !seats) return 0;
  return Math.min(PREMISES_SCALE.maxExtraServers, Math.max(0, Math.round((seats - base) / PREMISES_SCALE.seatsPerExtraServer)));
}

/** B. Hyran efter ytan mot Torgets 145 m² (PREMISES_SCALE.areaExponent; 1 vid Torget). */
export function premisesAreaK(premises: PremisesId): number {
  return Math.pow(PREMISES_SCALE.areaM2[premises] / PREMISES_SCALE.areaM2.torget, PREMISES_SCALE.areaExponent);
}
