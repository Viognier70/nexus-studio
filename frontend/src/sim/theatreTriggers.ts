// ORDER 286a — raketens utlösare i rummet (Designs leverans 2, LEVERANSNOT §8:
// "Varje raket behöver veta vem som gör något och vilket klipp som spelas
// först. Därefter kommer frågan."). Vision Owner 2026-09-29: "figuren spelar
// sitt raketklipp först (rocket.cutHand, smellWine, askPointMenu,
// walkToKitchen), och först därefter öppnas raketkortet."
//
// Leveransen har fyra raketklipp. Raketerna knyts till dem efter vad de
// handlar om; en raket vid bordet utan eget klipp blir gästen som frågar och
// pekar i menyn. Raketer som gäller hela rummet (kylen, DJ:n, dubbelbokningen
// med flera) har inget klipp förrän leverans 3 (händelsernas manus): de öppnas
// direkt, som förut.

import type { Incident } from './incidentBank';
import type { IncidentContext } from './incidents';
import type { SimulationState } from '../strategic/types';
import { THEATRE } from './balance';

export type RocketClip = keyof typeof THEATRE.rocketIntroSeconds;

const BY_ID: Record<string, RocketClip> = {
  'vb21-skuren-hand': 'cutHand',
  'vb01-korken': 'smellWine',
  'vb30-korkgasten': 'smellWine',
  'vb12-varmt-rott': 'smellWine',
  'vb03-notallergi': 'walkToKitchen',
  'vb14-surdegen': 'walkToKitchen',
  'vb15-fisken': 'walkToKitchen',
  'vb10-berusad': 'walkToKitchen'
};

export function rocketClipFor(incident: Incident): RocketClip | null {
  if (BY_ID[incident.id]) return BY_ID[incident.id];
  const target = incident.staff?.target ?? incident.success?.target;
  return target === 'table' ? 'askPointMenu' : null;
}

export interface RocketFigure {
  kind: 'staff' | 'guest';
  /** Personalens plats i rummet (regissörens StaffKey) eller gästens id. */
  staffKey?: 'bartender';
  guestId?: string;
  clip: RocketClip;
}

// Figuren: bartendern skär sig; annars en gäst i bordets sällskap, helst en
// som sitter (sittregeln gäller alla sitsar). Ingen slump, så att kvällens förlopp
// inte flyttas.
export function rocketFigure(state: SimulationState, clip: RocketClip | null, ctx: IncidentContext): RocketFigure | null {
  if (!clip) return null;
  if (clip === 'cutHand') return { kind: 'staff', staffKey: 'bartender', clip };
  const party = state.guests.filter((g) => ctx.guestIds.includes(g.id));
  const seated = party.find((g) => g.seatIndex !== null);
  const g = seated ?? party[0];
  return g ? { kind: 'guest', guestId: g.id, clip } : null;
}
