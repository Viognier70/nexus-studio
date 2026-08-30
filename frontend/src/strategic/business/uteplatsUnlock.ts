// ORDER 115 rev 2 — auto-unlock av foodtruck-uteplatsen.
//
// VO 2026-08-16 §3: "B — egen investering, permanent, synlig först när
// villkoret nåtts." Uteplatsen är ingen köpvara i pengarna — den är en
// verksamhetstillväxt inom foodtruck-klassen (jfr "Verksamhetsklasser
// växer inom sig", ORDER 115 §5). När villkoret nås en enda gång sätts
// policies.hasUteplats = true permanent. Ingen manuell trigger, ingen
// UI-knapp, ingen kostnad.
//
// Tre tröskel-kandidater exponeras här; ORDER 115 rev 2 §4 valde EN som
// aktiv default. De andra två bibehålls i modulen för framtida balans-
// arbete (kalibrering mot spelekonomin) och för att §4-rapportens siffror
// ska motsvara implementerad kod, inte separat brainstorm.
//
// **Kandidater:**
//   A  REPUTATION      — reputation ≥ 0.72
//   B  CLEAN_SERVICES  — consecutiveCleanServices ≥ 4
//   C  HAPPY_TOTAL     — happyDeparturesTotal ≥ 40
//
// **Aktiv default (2026-08-16 VO-val):** C (HAPPY_TOTAL, 40).
//
// **Val-motivering (VO 2026-08-16):** Kandidat C är permanent
// ackumulerande och kan inte nollställas av en enda dålig service, vilket
// matchar ordens "permanent"-intentionen bäst — en spelare som spelat sig
// dit i 3-4 pass av god service ska inte tappa framsteget till ett enskilt
// misstag. Kandidat A är kort men känslig för dagens variation; kandidat
// B är stram men nollställs vid varje give-up.

import type { SimulationState } from '../types';

// ------------------------------------------------------------------
// Typdefinitioner
// ------------------------------------------------------------------

export type UteplatsCandidate = 'REPUTATION' | 'CLEAN_SERVICES' | 'HAPPY_TOTAL';

export interface UteplatsThreshold {
  candidate: UteplatsCandidate;
  // Läs-vänlig beskrivning av villkoret — används i debug-loggar och
  // ORDER-rapporten. Inte spelartext (uteplats-upplåsning är dev-only
  // struktur i cykel 1).
  description: string;
  // Villkorets numeriska tröskel — 0.72 för A, 4 för B, 40 för C.
  value: number;
  // Predikatet som läses per tick. Rent på state; ingen randomness,
  // ingen klocka.
  check: (state: SimulationState) => boolean;
}

// ------------------------------------------------------------------
// De tre kandidaterna
// ------------------------------------------------------------------

// Kandidat A — reputation ≥ 0.72.
// Motivering: 0.72 ligger drygt över REP_CEILING_BASE (0.55) och
// under episteme-lyftets tak (0.55 + 0.20 = 0.75). Kräver aktivt
// kunskapsarbete OCH att servicen levererar; ren investering räcker inte,
// ren clean service räcker inte.
export const CANDIDATE_A_REPUTATION: UteplatsThreshold = {
  candidate: 'REPUTATION',
  description: 'reputation ≥ 0.72',
  value: 0.72,
  check: (state) => state.reputation >= 0.72
};

// Kandidat B — fyra services i rad utan give-up.
// Motivering: en (lunch,middag)-dag är 2 services; 4 i rad = 2 dagar utan
// missnöjda avhopp. Räknaren nollställs vid varje give-up (se
// reputation.ts:reputationEventGiveUp + reducer.ts service-close).
export const CANDIDATE_B_CLEAN_SERVICES: UteplatsThreshold = {
  candidate: 'CLEAN_SERVICES',
  description: 'consecutiveCleanServices ≥ 4',
  value: 4,
  check: (state) => state.metrics.consecutiveCleanServices >= 4
};

// Kandidat C — 40 kumulativt nöjda avfärder.
// Motivering: HAPPY_GAIN=0.006 per nöjd; 40 st = 0.24 rep om alla
// träffade samtidigt utan mottryck. I praktiken tar det 3-4 dagars
// hyfsad service att nå 40 (se §4-rapportens beräkning).
// Räknaren nollställs ALDRIG — permanent ackumulator för spelets livstid.
export const CANDIDATE_C_HAPPY_TOTAL: UteplatsThreshold = {
  candidate: 'HAPPY_TOTAL',
  description: 'happyDeparturesTotal ≥ 40',
  value: 40,
  check: (state) => state.metrics.happyDeparturesTotal >= 40
};

// Tabell över alla kandidater — för test-iteration och rapport-generering.
export const ALL_UTEPLATS_CANDIDATES: readonly UteplatsThreshold[] = [
  CANDIDATE_A_REPUTATION,
  CANDIDATE_B_CLEAN_SERVICES,
  CANDIDATE_C_HAPPY_TOTAL
];

// ------------------------------------------------------------------
// Aktiv default + auto-unlock-check
// ------------------------------------------------------------------

// Aktiv tröskel — läses av reducer.ts TICK-handlern per tick. Ändras
// här om VO väljer om; ingen annan plats i koden ska ha en
// verksamhets-specifik tröskel-siffra.
export const DEFAULT_UTEPLATS_THRESHOLD: UteplatsThreshold = CANDIDATE_C_HAPPY_TOTAL;

// Auto-unlock-checken. Ren funktion.
//
//   * Endast foodtruck-klassen kan låsa upp uteplats (den är inte en
//     restaurang-utökning; restaurangen har redan matsal).
//   * Om uteplats redan låst upp: no-op (permanent-egenskapen).
//   * Annars: läs aktiv default-tröskel.
//
// Returnerar true om upplåsning ska ske denna tick. Inga sidoeffekter —
// reducer.ts skriver flaggan.
export function shouldUnlockUteplats(state: SimulationState): boolean {
  if (state.businessClass !== 'foodtrucken') return false;
  if (state.policies.hasUteplats === true) return false;
  return DEFAULT_UTEPLATS_THRESHOLD.check(state);
}
