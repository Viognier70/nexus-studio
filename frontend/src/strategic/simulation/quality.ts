// ORDER 049 §5.2 — three quality readings, slow rolling.
//
// Vision Owner (gate 8 answer 2026-08-09): "Nytt tillstånd. Kvalitets-
// värdena ska vara tröga och rulla; härledda på läsning blir de
// nervösa och kan inte visa att en dålig kväll skadar men inte sänker."
//
// Three scalars in [0, 1] — food, drink, service — each drifts toward
// a target derived from policies + team competence + morale + (§5.3)
// scale-down flags. Half-life ~15 sim-minutes: a bad night dents the
// reading but doesn't sink it; a good week visibly climbs. The point
// is a smoothed reading a buyer would pay for, not a live health bar.
//
// Written to the panel as word bands via valuation.ts helpers.
// Consumed by computeValuation via the WEAKEST-LINK rule (Vision Owner
// gate 2 answer): the quality_factor uses `min(food, drink, service)`,
// not the mean, so a restaurant with excellent food and undermarked
// service is not an average restaurant — it has a problem a buyer
// will price. Punitive by design.

import type { SimulationState } from '../types';
import { moraleCompetenceMultiplier } from './morale';
import { epistemeLiftForAxis, techneDriftMultiplier } from './reputation';
import { teamCompetence } from './team';

// Drift constant. rate = 1 − exp(-ln(2) · dt / halfLife). For a
// 15-sim-minute half-life at 5 Hz (dt = 0.2 s): rate per tick
// ≈ 1 − exp(-0.693 · 0.2 / 900) ≈ 0.000154. Kept as an approximate
// constant here — a bad night's few dozen event nudges plus the
// per-tick drift reads correctly at that scale.
const DRIFT_RATE_PER_TICK = 0.00015;

// Ingredient tier → base quality weight for food, and a smaller
// weight for drink (the same tier grades both).
const INGREDIENT_FOOD_WEIGHT = {
  grund:   0.35,
  utvald:  0.65,
  premium: 0.90
} as const;

const INGREDIENT_DRINK_WEIGHT = {
  grund:   0.30,
  utvald:  0.55,
  premium: 0.80
} as const;

// Scale-down penalties applied to the TARGET (not the current value)
// so the reading drifts down over time as the shortcut runs. Instant
// application would spike a nervous drop the Vision Owner rejected.
const MENU_SHORTENED_TARGET_PENALTY = 0.10;
const WINE_LIST_REDUCED_TARGET_PENALTY = 0.20;

// -------- target functions ---------------------------------------------

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function targetQualityFood(state: SimulationState): number {
  const ingredient = INGREDIENT_FOOD_WEIGHT[state.policies.ingredientTier];
  const kitchenSci = teamCompetence(state.team, 'scientific');
  const morale = moraleCompetenceMultiplier(state.morale);
  const menuPenalty = state.scaleDown.menuShortenedFrom ? MENU_SHORTENED_TARGET_PENALTY : 0;
  // Ingredient carries 55 % weight; kitchen technique carries 45 %.
  // Morale scales the whole thing (a bad-morale team's food IS worse).
  const base = ingredient * 0.55 + kitchenSci * 0.45;
  // ORDER 049 §2.1: scientific episteme lifts the ceiling — knowing
  // the chemistry lets the same ingredient/team reach a higher target
  // (the actual reading drifts toward it; the reading doesn't jump).
  const epistemeLift = epistemeLiftForAxis(state, 'scientific');
  return clamp01(base * morale + epistemeLift - menuPenalty);
}

export function targetQualityDrink(state: SimulationState): number {
  const ingredient = INGREDIENT_DRINK_WEIGHT[state.policies.ingredientTier];
  const cultural = teamCompetence(state.team, 'cultural');
  const morale = moraleCompetenceMultiplier(state.morale);
  const welcomeLift = state.policies.welcomeDrink ? 0.10 : 0;
  const winePenalty = state.scaleDown.wineListReduced ? WINE_LIST_REDUCED_TARGET_PENALTY : 0;
  // Cultural competence carries more weight for drink than food
  // (sommelier knowledge lives here). Ingredient tier still counts.
  const base = ingredient * 0.30 + cultural * 0.55 + welcomeLift;
  const epistemeLift = epistemeLiftForAxis(state, 'cultural');
  return clamp01(base * morale + epistemeLift - winePenalty);
}

export function targetQualityService(state: SimulationState): number {
  const practical = teamCompetence(state.team, 'practical');
  const cultural = teamCompetence(state.team, 'cultural');
  const morale = moraleCompetenceMultiplier(state.morale);
  // Service quality reads through team's practical + cultural
  // competence; morale scales. Recent strain events would ideally
  // trim this further — a future rolling-events reader can layer on
  // top, but the drift + morale-scaling captures the shape for now.
  const base = practical * 0.60 + cultural * 0.30;
  // No `practical` enabler exists; service knowledge lives in
  // cultural episteme (guest psychology, service theory).
  const epistemeLift = epistemeLiftForAxis(state, 'cultural') * 0.6;
  return clamp01(base * morale + epistemeLift);
}

// -------- per-tick drift -----------------------------------------------

// Called from advanceTick every tick. Pulls each quality reading
// toward its current target by DRIFT_RATE_PER_TICK. Runs in all
// periods — morning readings drift slowly toward morning targets
// (no active service to move them), evening the same. This makes
// the reading a smoothed view of state over ~15 min windows, not
// a live report of the current tick.
export function tickQualityDrift(draft: SimulationState): void {
  const tF = targetQualityFood(draft);
  const tD = targetQualityDrink(draft);
  const tS = targetQualityService(draft);
  // ORDER 049 §2.1: techne enablers speed the drift toward target —
  // hantverk gör vägen till taket kortare, not the ceiling itself.
  // Each quality reads its own axis's techne (food: scientific,
  // drink+service: cultural).
  const rateFood = DRIFT_RATE_PER_TICK * techneDriftMultiplier(draft, 'scientific');
  const rateDrink = DRIFT_RATE_PER_TICK * techneDriftMultiplier(draft, 'cultural');
  const rateService = DRIFT_RATE_PER_TICK * techneDriftMultiplier(draft, 'cultural');
  draft.qualityFood += (tF - draft.qualityFood) * rateFood;
  draft.qualityDrink += (tD - draft.qualityDrink) * rateDrink;
  draft.qualityService += (tS - draft.qualityService) * rateService;
  draft.qualityFood = clamp01(draft.qualityFood);
  draft.qualityDrink = clamp01(draft.qualityDrink);
  draft.qualityService = clamp01(draft.qualityService);
}

// -------- word-band readouts (panel-side) ------------------------------

// Same style as morale bands. No numbers.
export function qualityBand(v: number): string {
  if (v >= 0.85) return 'Utmärkt';
  if (v >= 0.65) return 'God';
  if (v >= 0.45) return 'Godtagbar';
  if (v >= 0.25) return 'Bristfällig';
  return 'Under acceptabel';
}
