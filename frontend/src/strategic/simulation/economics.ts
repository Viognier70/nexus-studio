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
  checkback: 6
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

export function taskDurationTicks(
  policies: Policies,
  taskType: string,
  social = 1
): number {
  const base = TASK_BASE_TICKS[taskType] ?? 8;
  const training = 1.6 - 0.3 * policies.trainingLevel;
  const concept = SERVICE_DURATION_MULT[policies.service];
  const socialMult = socialThroughputMultiplier(social);
  return Math.max(2, Math.round(base * training * concept * socialMult));
}
