// ORDER 320 (Anders 2026-10-08, ORDER_320_FOODTRUCK_SITUATIONER.md "Utlösaren först: varje situation har en
// utlösare som syns innan kortet kommer") — när de sex nya situationerna vid vagnen kan komma, efter det som
// syns i bild (förvarningen, IncidentCue; scenen ritar den i TruckLife.tsx och PlayerTruckCrew.tsx):
//   - rainStarts: det har just börjat regna (sim/truckLife.ts truckRaining), de första rainWindowE av kvällens
//     gång efter att regnet började;
//   - wasps: getingar vid såsflaskorna en solig kväll, när någon äter vid ett ståbord (en öppen burk);
//   - cardReader: kortläsaren slutar fungera i rusningen, när minst cardAtHatch väntar eller beställer;
//   - stockLow: lådan med korv är nästan tom, när högst SAUSAGE.lowAt korvar är kvar och minst
//     SAUSAGE.queueAtLow står vid luckan;
//   - dog: en gäst med hund vid uteserveringen, när någon äter vid ett ståbord (inte i regnet);
//   - rivalSign: en ny skylt hos Grillvagnen, när Grillvagnen står på torget i kväll.

import type { SimulationState } from '../strategic/types';
import type { IncidentCue } from './incidentBank';
import { SAUSAGE, TRUCK_SITUATIONS } from './balance';
import { eveningProgress } from './clock';
import { tableOfSpot, truckOf, truckRaining } from './truckLife';
import { venuesTonight } from './village';

/** Rivalen vars skylt syns vid torget (balance.ts VILLAGE.rivals). */
export const GRILL_TRUCK_ID = 'grillvagnen';

function atHatch(state: SimulationState): number {
  return state.guests.filter((g) => g.state === 'waiting' || g.state === 'ordering').length;
}

/** Någon äter vid ett ståbord (inte på bänken, vid värmaren eller vid hyllan). */
export function eaterAtTable(state: SimulationState): SimulationState['guests'][number] | null {
  return state.guests.find((g) => g.state === 'eating' && !!g.truckSpot && tableOfSpot(g.truckSpot) !== null) ?? null;
}

/** Grillvagnen står på torget i kväll. */
export function grillTruckAtTorget(state: SimulationState): boolean {
  return venuesTonight(state).some((v) => v.id === GRILL_TRUCK_ID && v.open && v.spot === 'torget');
}

/** Syns förvarningen nu? guestAtHatch och delivery avgörs i sim/incidents.ts. */
export function truckCueReady(state: SimulationState, cue: IncidentCue): boolean {
  if (state.economy.businessClass !== 'foodtruck') return cue === 'guestAtHatch' || cue === 'delivery';
  const t = truckOf(state);
  switch (cue) {
    case 'rainStarts': {
      const e = eveningProgress(state);
      return truckRaining(state) && e !== null && t.rainFromE !== null && e - t.rainFromE <= TRUCK_SITUATIONS.rainWindowE;
    }
    case 'wasps': return t.weather === 'sun' && eaterAtTable(state) !== null;
    case 'cardReader': return atHatch(state) >= TRUCK_SITUATIONS.cardAtHatch;
    case 'stockLow': return t.sausagesLeft !== undefined && t.sausagesLeft <= SAUSAGE.lowAt && atHatch(state) >= SAUSAGE.queueAtLow;
    case 'dog': return !truckRaining(state) && eaterAtTable(state) !== null;
    case 'rivalSign': return grillTruckAtTorget(state);
    default: return true;
  }
}

/** ORDER 320 — var en situation är i kväll, för scenen: inte kommen, förvarningen, kortet, eller avgjord (med
 *  utfallet och när). */
export type SituationPhase =
  | { phase: 'none' }
  | { phase: 'cue' | 'active'; step: number; openedAt: number }
  | { phase: 'done'; at: number; quality: string; optionId: string | null; halfGrip: 'analysis' | 'experience' | null };

export function situationTonight(state: SimulationState, id: string): SituationPhase {
  const inc = state.incidents;
  const a = inc?.active;
  if (a?.id === id) return { phase: (a.introLeft ?? 0) > 0 ? 'cue' : 'active', step: a.step, openedAt: a.openedAt };
  const r = inc?.log.find((x) => x.id === id);
  if (r) return { phase: 'done', at: r.at, quality: r.quality, optionId: r.optionId, halfGrip: r.halfGrip ?? null };
  return { phase: 'none' };
}
