// ORDER 297 — krogarnas fyra lägen i kvällsljuset (Designs leverans Byn i
// kvällsljus, LIGHTS.venue): köket lyser innan krogen öppnar (mise en place),
// allt lyser när den har öppet, köket lyser en stund efter stängning
// (städningen) och sedan är krogen släckt. `open` tänder matsalen, dörren,
// skylten och skenet; `busy` tänder köket.
//   - Vår krog följer simuleringen: förberedelserna tills dörrarna öppnar,
//     öppet tills servicen slutar, städningen fram till att de sista gått
//     (CLOCK.pickupAfterCloseMinutes).
//   - Byns krogar har öppet från att byns gäster börjar komma
//     (VILLAGE.arriveFromMinute) tills servicen slutar, de kvällar de har öppet.

import type { SimulationState } from '../../types';
import { CLOCK, SITTING, VILLAGE } from '../../../sim/balance';
import { clockMinutes } from '../../../sim/clock';
import { PLAYER_VENUE } from '../../../sim/village';

export interface VenueLight { open: number; busy: number }

export function venueLightTargets(sim: SimulationState, venueId: string, openTonight: boolean): VenueLight {
  if (!openTonight || sim.day.period !== 'dinner') return { open: 0, busy: 0 };
  const now = clockMinutes(sim);
  const close = SITTING.serviceEndHour * 60;
  if (now >= close) return { open: 0, busy: now < close + CLOCK.pickupAfterCloseMinutes ? 1 : 0 };
  const opened = venueId === PLAYER_VENUE ? !!sim.day.doorsOpenedThisService : now >= VILLAGE.arriveFromMinute;
  return opened ? { open: 1, busy: 1 } : { open: 0, busy: 1 };
}
