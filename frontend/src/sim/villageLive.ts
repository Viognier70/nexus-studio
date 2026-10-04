// ORDER 296 (kärnan punkt 4, Vision Owner 2026-10-02): "ett band i HUD:en med
// kvällens gäster per krog, uppdaterat när en grupp väljer". Designs leverans
// hovmästaren och butiken §4: food trucks räknas som rivaler, med mindre
// lyktor; ställningen mäter kvällens gäster.
//
// Kvällens plan för byn är densamma som byns figurer går efter (VillageLife):
// villageEvening med spelarens tak. Rivalernas gäster hittills är planen
// gånger andelen som har kommit vid klockslaget (triangelfördelningen över
// VILLAGE.arriveFromMinute–arriveUntilMinute, samma som figurerna). Spelarens
// gäster är de som har suttit vid ett bord (day.seatedTonight, ORDER 298).

import type { SimulationState } from '../strategic/types';
import { GUEST_TYPES, VILLAGE } from './balance';
import { dailyGuestCap } from './economy';
import { clockMinutes } from './clock';
import { PLAYER_VENUE, rivalContentShare, venuesTonight, villageEvening, type VenueEvening } from './village';

// Kvällens plan för byn, med spelarens tak som spelarens rad.
export function plannedVillage(state: SimulationState): VenueEvening[] {
  const capRaw = dailyGuestCap(state);
  const cap = Number.isFinite(capRaw) ? capRaw : 0;
  const shares = GUEST_TYPES.share[state.businessClass] ?? GUEST_TYPES.share.default;
  const playerTypes = { student: cap * shares.student, middle: cap * shares.middle, high: cap * shares.high };
  return villageEvening(state, { guests: cap, revenueSek: 0, typeGuests: playerTypes });
}

// Andelen av kvällens gäster som har kommit vid klockslaget
// (triangelfördelningens fördelningsfunktion, toppen VILLAGE.arrivePeakShare).
export function arrivedShare(minute: number): number {
  const a = VILLAGE.arriveFromMinute;
  const b = VILLAGE.arriveUntilMinute;
  if (minute <= a) return 0;
  if (minute >= b) return 1;
  const x = (minute - a) / (b - a);
  const m = VILLAGE.arrivePeakShare;
  return x <= m ? (x * x) / m : 1 - ((1 - x) * (1 - x)) / (1 - m);
}

export interface VenueLive {
  id: string;
  kind: 'player' | 'restaurant' | 'truck';
  guests: number;
  // ORDER 303 B — nöjda gäster vid bord: placeringen (utan värde: gästerna).
  content?: number;
}

export function villageLive(state: SimulationState): VenueLive[] {
  const venues = venuesTonight(state);
  const plan = plannedVillage(state);
  const share = arrivedShare(clockMinutes(state));
  // ORDER 298 — våra gäster är de som har suttit vid ett bord i kväll.
  const ours = state.day.seatedTonight ?? 0;
  return venues
    .filter((v) => v.open)
    .map((v) => ({
      id: v.id,
      kind: v.kind,
      guests: v.id === PLAYER_VENUE ? ours : Math.floor((plan.find((r) => r.id === v.id)?.guests ?? 0) * share),
      content: v.id === PLAYER_VENUE ? state.day.contentTonight ?? 0 : Math.floor((plan.find((r) => r.id === v.id)?.guests ?? 0) * share * rivalContentShare(v.reputation))
    }));
}

// Platsen i byn just nu efter kvällens gäster (1 = flest), som bandet visar.
// ORDER 298 — utan gäster finns ingen plats (null): det går inte att vara 1:a
// med 0 gäster. Vid lika antal står vi efter rivalerna.
// ORDER 303 B — efter kvällens nöjda gäster vid bord.
export function villageRank(rows: VenueLive[]): number | null {
  const score = (r: VenueLive) => r.content ?? r.guests;
  const row = rows.find((r) => r.id === PLAYER_VENUE);
  const ours = row ? score(row) : 0;
  if (ours <= 0) return null;
  return 1 + rows.filter((r) => r.id !== PLAYER_VENUE && score(r) >= ours).length;
}
