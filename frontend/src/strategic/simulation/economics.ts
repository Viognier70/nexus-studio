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
  welcomeDrink: 12
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

export function taskDurationTicks(policies: Policies, taskType: string): number {
  const base = TASK_BASE_TICKS[taskType] ?? 8;
  const training = 1.6 - 0.3 * policies.trainingLevel;
  const concept = SERVICE_DURATION_MULT[policies.service];
  return Math.max(2, Math.round(base * training * concept));
}
