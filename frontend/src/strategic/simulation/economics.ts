import type { IngredientTier, PricingTier, Policies, ServiceConcept } from '../types';

// All formulas here are transparent placeholders. They are not tuned for
// balance — they exist so player decisions have visible, layered effects.

export const REVENUE_BASE: Record<PricingTier, number> = {
  låg: 220,
  medel: 340,
  hög: 520
};

export const INGREDIENT_MULT: Record<IngredientTier, number> = {
  grund: 0.9,
  utvald: 1.05,
  premium: 1.22
};

export const INGREDIENT_COST_PER_MIN: Record<IngredientTier, number> = {
  grund: 4,
  utvald: 7,
  premium: 12
};

export const STAFF_COST_PER_MIN = 9;

export const SERVICE_ARRIVAL_MULT: Record<ServiceConcept, number> = {
  vardaglig: 1.15,
  formell: 0.8
};

export const PRICE_ARRIVAL_MULT: Record<PricingTier, number> = {
  låg: 1.2,
  medel: 1,
  hög: 0.72
};

export const SERVICE_DURATION_MULT: Record<ServiceConcept, number> = {
  vardaglig: 0.9,
  formell: 1.25
};

// Duration in ticks for each task type at training level 2. Level 1 slows
// down; level 3 speeds up.
export const TASK_BASE_TICKS: Record<string, number> = {
  greet: 4,
  seat: 6,
  order: 10,
  serve: 14,
  decant: 18,
  flambe: 20,
  clear: 8,
  welcomeDrink: 12,
  // ORDER 098 — checkback är avsiktligt kort. Ett verkligt "hur går det?
  // behöver ni mer vatten?" tar sekunder, inte en full servering. 6 ticks
  // vid 5 Hz + training/concept-skalning ger ~1.5–2 s slutlig varaktighet
  // vid default policies. Frekvensen (cooldown 15 s per gäst) sätter den
  // faktiska work-belastningen, inte varaktigheten per tillfälle.
  checkback: 6,
  // ORDER 137 — bakgrundsarbete. Varje uppgift håller ~1-2 sim-sekunder
  // så preemption efter avslutad uppgift sker snabbt (§2.2: direkt gäst-
  // uppgift går alltid före). Explicit preemption i tickStaff avbryter
  // pågående bakgrundsuppgift när en direkt uppgift dyker upp — se
  // service.ts. Rimliga varaktigheter för en avstamp mise-en-place,
  // en glas- eller tallrikvända, en flaskpåfyllning, en yttorkning.
  misEnPlace: 8,
  dish: 6,
  restock: 5,
  clean: 7
};

export function revenuePerGuest(policies: Policies): number {
  return REVENUE_BASE[policies.pricing] * INGREDIENT_MULT[policies.ingredientTier];
}

export function costPerSimMinute(policies: Policies, waste: number): number {
  return (
    STAFF_COST_PER_MIN * policies.staffCount +
    INGREDIENT_COST_PER_MIN[policies.ingredientTier] +
    waste * 0.6
  );
}

// ORDER 043 §6 social phenomenon: task durations stretch when the
// social capital is low. High social = staff moves in sync, tasks
// complete briskly; low social = strained, hesitant, slow. Applied
// multiplicatively as socialMultiplier ∈ [1.0, 2.0], so at social = 1
// tasks match their pre-ORDER-043 durations exactly (no regression),
// and at social = 0 they take twice as long. The resulting slower
// seat clearance is what causes the waiting queue to grow — the queue
// itself is emergent.
export function socialThroughputMultiplier(social: number): number {
  const clamped = Math.max(0, Math.min(1, social));
  return 2 - clamped;
}

// ORDER 214 (C2 §4) — kompetens-multiplikator för duration. Praktisk-
// kompetens 0..1 mappas linjärt till 1.15..0.85. Symmetrisk kring 0.5
// så en default-competence (som `taskDurationTicks(p, type)` utan
// competence-arg får som 0.5-fallback) ger multiplikator 1.0 —
// bakåtkompatibelt med kod som ännu inte skickar per-roll-kompetens.
//   lärling (practical 0.30) → 1.06 (~6 % längre tid)
//   värd    (practical 0.50) → 1.00 (baseline)
//   servitör/kock (0.60)     → 0.97 (~3 % kortare)
//   spec.   (practical 0.75) → 0.925 (~7 % kortare)
// Effekten är avsiktligt måttlig — modellen ska säga "skicklig kock är
// snabbare", inte "lärling är oanvändbar". Lutningen 0.3 (i st f 0.5)
// valdes så det inte skulle skifta chain-detekteringens 20-sek-fönster
// för ORDER 076 M6-testet (som blev känsligt vid 5 %-skift). Passeras
// från beginStaffTask/beginBackgroundTask, som slår upp roll-genomsnitt
// från team via `roleCompetence(team, staff.role)` (team.ts).
export function competenceDurationMultiplier(practical: number): number {
  const clamped = Math.max(0, Math.min(1, practical));
  return 1.15 - 0.3 * clamped;
}

export function taskDurationTicks(
  policies: Policies,
  taskType: string,
  social = 1,
  competencePractical = 0.5
): number {
  const base = TASK_BASE_TICKS[taskType] ?? 8;
  const training = 1.6 - 0.3 * policies.trainingLevel;
  const concept = SERVICE_DURATION_MULT[policies.service];
  const socialMult = socialThroughputMultiplier(social);
  const competenceMult = competenceDurationMultiplier(competencePractical);
  return Math.max(2, Math.round(base * training * concept * socialMult * competenceMult));
}
