// ORDER 303 E (Anders 2026-10-04): "Varje i personalen får orken (0–1) och
// trivseln (0–1) … Effekter av låg ork eller trivsel: personalen går saktare,
// tar längre tid vid borden och hanterar händelser sämre, så att ett rätt svar
// ger mindre effekt. Kunskapen i personalen: varje i personalen har
// kunskapsområden … Om spelaren inte har tagit in eller utbildat rätt
// kompetens tvekar personalen i de händelserna. Det syns, och följden av ett
// fel svar blir större." Talen står i balance.ts STAFF_CONDITION.

import type { StaffMember, SimulationState } from '../strategic/types';
import { GAME_MINUTES_PER_SIM_SECOND, STAFF_CONDITION as C } from './balance';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const staminaOf = (s: Pick<StaffMember, 'stamina'>) => s.stamina ?? C.stamina.start;
export const wellbeingOf = (s: Pick<StaffMember, 'wellbeing'>) => s.wellbeing ?? C.wellbeing.start;
export const skillsOf = (s: Pick<StaffMember, 'skills' | 'role'>): readonly string[] => s.skills ?? C.skillsByRole[s.role] ?? [];

/** Hur mycket långsammare en i personalen arbetar (uppgiftens tid gånger detta, ≥ 1). */
export function slowFactor(s: Pick<StaffMember, 'stamina' | 'wellbeing'>): number {
  const low = Math.min(staminaOf(s), wellbeingOf(s));
  if (low >= C.slowBelow) return 1;
  return 1 + C.slowAtZero * (C.slowBelow - low) / C.slowBelow;
}

/** Personalens verkan i en händelse: rätt svars effekt gånger detta (≤ 1). */
export function staffEffect(state: Pick<SimulationState, 'staff'>): number {
  if (state.staff.length === 0) return 1;
  const mean = state.staff.reduce((a, s) => a + Math.min(staminaOf(s), wellbeingOf(s)), 0) / state.staff.length;
  return C.effectAtZero + (1 - C.effectAtZero) * mean;
}

/** Händelsens kunskapsområde (raketens spår; annars service). */
export function incidentArea(track: string | null | undefined): string {
  return (track && C.areaByTrack[track]) || 'service';
}

/** Har någon i personalen området? Annars tvekar de. */
export function staffKnows(state: Pick<SimulationState, 'staff'>, area: string): boolean {
  return state.staff.some((s) => skillsOf(s).includes(area));
}

/** Orken under kvällen: sjunker per spelminut med öppna dörrar. */
export function drainStamina(draft: SimulationState, simSeconds: number): void {
  const d = C.stamina.drainPerGameMinute * simSeconds * GAME_MINUTES_PER_SIM_SECOND;
  for (const s of draft.staff) s.stamina = clamp01(staminaOf(s) - d);
}

/** En gäst klagar: personalen lägger tid på att lugna, orken sjunker. */
export function complaintStamina(draft: SimulationState): void {
  for (const s of draft.staff) s.stamina = clamp01(staminaOf(s) + C.stamina.complaint);
}

/** God dricks lyfter orken hos dem som arbetar. */
export function tipStamina(draft: SimulationState, tipSek: number): void {
  if (tipSek <= 0) return;
  for (const s of draft.staff) s.stamina = clamp01(staminaOf(s) + C.stamina.perTipSek * tipSek);
}

/** Tvekan i en händelse personalen saknar kunskap för: trivseln sjunker. */
export function hesitationWellbeing(draft: SimulationState): void {
  for (const s of draft.staff) s.wellbeing = clamp01(wellbeingOf(s) + C.wellbeing.perHesitation);
}

/**
 * Natten: orken vilar upp sig; trivseln följer kvällens dricks och morgonens
 * kurser, och drar mot sitt vilovärde. Kurserna lär personalen sitt område.
 */
export function staffNight(prev: SimulationState, next: SimulationState): StaffMember[] {
  const tips = prev.day.tipsSek ?? 0;
  const trained = (prev.day.pickedActivityIds ?? []).map((id) => C.trainingActivities[id]).filter((a): a is string => !!a);
  return next.staff.map((s) => {
    let w = wellbeingOf(s);
    w += (C.wellbeing.restingValue - w) * C.wellbeing.driftPerDay;
    w += C.wellbeing.perTipSekEvening * tips / Math.max(1, next.staff.length);
    w += C.wellbeing.perTraining * trained.length;
    const skills = [...new Set([...skillsOf(s), ...(s.role === 'kock' ? trained.filter((a) => a === 'mat') : trained.filter((a) => a !== 'mat'))])];
    return { ...s, stamina: C.stamina.afterNight, wellbeing: clamp01(w), skills };
  });
}

/** Veckans sociala hållbarhet: personalens trivsel och kvällarnas ork. */
export function staffSnapshot(state: Pick<SimulationState, 'staff'>): { stamina: number; wellbeing: number } {
  const n = Math.max(1, state.staff.length);
  return {
    stamina: state.staff.reduce((a, s) => a + staminaOf(s), 0) / n,
    wellbeing: state.staff.reduce((a, s) => a + wellbeingOf(s), 0) / n
  };
}
