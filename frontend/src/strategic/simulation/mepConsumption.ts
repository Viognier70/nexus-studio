// ORDER 117 §4 — mise en place-konsumtion och synlig konsekvens i
// överlämningen.
//
// VO-beslut 2026-08-18 §4: "Kombination med ordning: servett saknas är
// mild och vanlig, garnityr är allvarligare, utebliven mat är sista
// utvägen och sällsynt. En brist som alltid stoppar servicen blir en
// spärr, inte en avvägning."
//
// Ordning från mild → svår:
//   1. `napkins`  — servett, mild, drar tomt snabbt (0.03 per gäst)
//   2. `cutlery`  — bestick, mild (0.025 per gäst)
//   3. `garnish`  — garnityr, allvarligare (0.04 per gäst)
//   4. `stations` — utebliven mat, sista utvägen (0.01 per gäst — sällsynt)
//   5. `ice`      — is/bar (0.02 per gäst)
//
// Rate-siffror kalibrerade så att typisk lunch (~15 gäster) drar
// napkins till ~55% och garnish till ~40% om starta vid 100%. Ingen
// enskild service tömmer stations helt — det tar 100 gäster att nå 0
// (osannolikt inom en service).
//
// **Ingen post STOPPAR servicen** — även vid readiness 0 fortsätter
// gästen gå igenom order → serving. VO: en spärr är inte en avvägning.
// Istället tar gästen en satisfaction-hit vid överlämningen skalad efter
// vilken post som saknas.

import type { SimulationState } from '../types';

// Consumption per served guest, per item.
export const MEP_CONSUMPTION_PER_GUEST = {
  napkins: 0.03,
  cutlery: 0.025,
  garnish: 0.04,
  stations: 0.01,   // rare — hard to run to zero within one service
  ice: 0.02
} as const;

// Satisfaction-hit när readiness < tröskel vid överlämning. Skalad så
// mild brist ger mild missnöje, allvarlig ger mer, utebliven mat ger
// mest — men inget stoppar servicen.
//
// Tröskeln är 0.2 för alla — under det räknas det som "saknar
// nämnvärt". Mellan 0.2 och 1.0 ingen synlig hit.
export const MEP_HIT_THRESHOLD = 0.2;

export const MEP_MISSING_HIT = {
  napkins: -0.04,     // mild: servett fattas — noteras men accepteras
  cutlery: -0.05,     // mild: bestick fattas
  garnish: -0.12,     // allvarligare: garnityr saknas — tallriken ser tom ut
  stations: -0.25,    // sista utvägen: matens grund brister
  ice: -0.06          // mild-medel: iskubb/dryck kall nog
} as const;

// Applicerad vid ordering→serving-övergången (foodtruck) eller vid
// dining-entry (restaurang). Muterar guest.satisfaction med den summa
// av alla brister som är aktiva just nu. Return: sum av hits (för
// tester att inspektera).
export function applyMissingMepHit(
  state: SimulationState,
  guest: { satisfaction: number }
): number {
  const readiness = state.day.prepReadiness;
  if (!readiness) return 0;
  let totalHit = 0;
  for (const [key, threshold] of Object.entries(MEP_HIT_THRESHOLD_MAP)) {
    const r = readiness[key] ?? 1;
    if (r < threshold) {
      totalHit += MEP_MISSING_HIT[key as keyof typeof MEP_MISSING_HIT] ?? 0;
    }
  }
  if (totalHit !== 0) {
    guest.satisfaction = Math.max(0, Math.min(1, guest.satisfaction + totalHit));
  }
  return totalHit;
}

// Per-item threshold; alla är samma nu men separerat för framtida
// finjustering.
const MEP_HIT_THRESHOLD_MAP: Record<string, number> = {
  napkins: MEP_HIT_THRESHOLD,
  cutlery: MEP_HIT_THRESHOLD,
  garnish: MEP_HIT_THRESHOLD,
  stations: MEP_HIT_THRESHOLD,
  ice: MEP_HIT_THRESHOLD
};

// Konsumtion vid en överlämning. Muterar draft.day.prepReadiness i
// place. Kallas EN GÅNG per gäst som når serving/dining.
export function consumeMepForOneGuest(state: SimulationState): void {
  const readiness = state.day.prepReadiness;
  if (!readiness) return;
  const next: Record<string, number> = { ...readiness };
  for (const [key, rate] of Object.entries(MEP_CONSUMPTION_PER_GUEST)) {
    const r = next[key] ?? 0;
    next[key] = Math.max(0, r - rate);
  }
  state.day = { ...state.day, prepReadiness: next };
}

// Läs vilken post som saknas MEST just nu — används av renderaren för
// att välja prop-variant (garnityr-lös, servett-lös, tom kartong).
// Returnerar första post under tröskeln enligt allvarlighetsordning
// (utebliven mat först — mest synlig visuellt).
export function mostMissingMepItem(
  readiness: Record<string, number> | undefined
): 'stations' | 'garnish' | 'napkins' | 'cutlery' | 'ice' | null {
  if (!readiness) return null;
  // Ordning: mest allvarlig först (stations = utebliven mat).
  const order: readonly ('stations' | 'garnish' | 'napkins' | 'cutlery' | 'ice')[] = [
    'stations', 'garnish', 'napkins', 'cutlery', 'ice'
  ];
  for (const key of order) {
    const r = readiness[key] ?? 1;
    if (r < MEP_HIT_THRESHOLD) return key;
  }
  return null;
}
