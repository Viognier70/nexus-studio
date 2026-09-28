// ORDER 045 — outer-world factors.
//
// Rare per-service events that modulate arrivals, waiting count,
// revenue, or delivery cadence. Rolled at OPEN_SERVICE after
// weather; each factor rolls independently with its own low fire
// rate. Vision Owner (2026-08-08): "Tre faktorer före varje service
// blir tapet." The rates are chosen so most evenings have no factor
// (~63 %), one factor happens ~31 % of the time, two together ~5 %,
// and three or more <0.5 %.
//
// State stores only the `kind` (see types.ts). Everything else —
// player-facing labels, multipliers — lives in this file's static
// tables so state round-trips through JSON without loss per §11.1.
//
// Multipliers compose multiplicatively with weather / reputation /
// economic capital / rhythm.

import type {
  ActiveWorldFactor,
  WorldFactorKind
} from '../types';
import type { Rng } from '../util/rng';

// -------- fire rates ------------------------------------------------------

// Per-service Bernoulli rolls, per factor kind. Reported to and
// approved by Vision Owner 2026-08-08 (Option A):
export const FACTOR_FIRE_RATES = {
  konjunktur: 0.08,   // ~1 in 12 services — quarterly-news feel
  vagarbeten: 0.10,   // ~1 in 10 — occasional traffic disruption
  sasong:     0.12,   // ~1 in 8 — visible seasonal shift
  evenemang:  0.17    // ~1 in 6 — festival / match / market
} as const;

// Realisation splits within a fired category.
const KONJUNKTUR_UPPGANG_FRAC = 0.50;
const SASONG_TURISM_FRAC = 0.55;
const EVENEMANG_FESTIVAL_FRAC = 0.60; // festivals more common in Grythyttan

// -------- multipliers -----------------------------------------------------
//
// Every knob is a scalar >= 0 that composes into an existing
// computation. Missing knob → 1.0 (no effect).
export interface FactorMultipliers {
  arrival: number;    // × arrivalProbability
  waiting: number;    // × waitingAtOpeningCount (post-reputation × weather)
  revenue: number;    // × revenuePerGuest at payment
  delivery: number;   // × delivery cooldown base (larger = slower rhythm)
}

const IDENTITY: FactorMultipliers = {
  arrival: 1, waiting: 1, revenue: 1, delivery: 1
};

export const FACTOR_MULTIPLIERS: Record<WorldFactorKind, FactorMultipliers> = {
  konjunktur_uppgang: { arrival: 1.10, waiting: 1.15, revenue: 1.10, delivery: 1.00 },
  konjunktur_nedgang: { arrival: 0.85, waiting: 0.70, revenue: 0.85, delivery: 1.00 },
  vagarbeten:         { arrival: 0.75, waiting: 0.50, revenue: 1.00, delivery: 1.40 },
  sasong_turism:      { arrival: 1.15, waiting: 1.20, revenue: 1.00, delivery: 1.00 },
  sasong_semester:    { arrival: 0.70, waiting: 0.50, revenue: 1.00, delivery: 1.00 },
  evenemang_festival: { arrival: 1.15, waiting: 1.60, revenue: 1.05, delivery: 1.00 },
  evenemang_hockey:   { arrival: 1.05, waiting: 1.30, revenue: 0.90, delivery: 1.00 }
};

// -------- generation ------------------------------------------------------

export function generateWorldFactors(rng: Rng): ActiveWorldFactor[] {
  const factors: ActiveWorldFactor[] = [];

  // Konjunktur roll — uppgång or nedgång.
  if (rng.next() < FACTOR_FIRE_RATES.konjunktur) {
    factors.push({
      kind: rng.next() < KONJUNKTUR_UPPGANG_FRAC
        ? 'konjunktur_uppgang'
        : 'konjunktur_nedgang'
    });
  }
  // Vägarbeten — one realisation.
  if (rng.next() < FACTOR_FIRE_RATES.vagarbeten) {
    factors.push({ kind: 'vagarbeten' });
  }
  // Säsong — turism or semestervecka.
  if (rng.next() < FACTOR_FIRE_RATES.sasong) {
    factors.push({
      kind: rng.next() < SASONG_TURISM_FRAC
        ? 'sasong_turism'
        : 'sasong_semester'
    });
  }
  // Evenemang — festival or hockey.
  if (rng.next() < FACTOR_FIRE_RATES.evenemang) {
    factors.push({
      kind: rng.next() < EVENEMANG_FESTIVAL_FRAC
        ? 'evenemang_festival'
        : 'evenemang_hockey'
    });
  }
  return factors;
}

// -------- compositional multipliers ---------------------------------------

// Compose active factors into a single multiplier per knob. Missing
// factor kind falls back to identity.
export function composeFactorMultipliers(
  factors: readonly ActiveWorldFactor[]
): FactorMultipliers {
  let out: FactorMultipliers = { ...IDENTITY };
  for (const f of factors) {
    const m = FACTOR_MULTIPLIERS[f.kind] ?? IDENTITY;
    out = {
      arrival: out.arrival * m.arrival,
      waiting: out.waiting * m.waiting,
      revenue: out.revenue * m.revenue,
      delivery: out.delivery * m.delivery
    };
  }
  return out;
}

// Convenience — read a single knob from a factor list (used by the
// arrival probability / waiting count / revenue paths without
// paying the object churn of composeFactorMultipliers).
export function worldFactorArrivalMultiplier(
  factors: readonly ActiveWorldFactor[]
): number {
  let mult = 1;
  for (const f of factors) mult *= (FACTOR_MULTIPLIERS[f.kind] ?? IDENTITY).arrival;
  return mult;
}

export function worldFactorWaitingMultiplier(
  factors: readonly ActiveWorldFactor[]
): number {
  let mult = 1;
  for (const f of factors) mult *= (FACTOR_MULTIPLIERS[f.kind] ?? IDENTITY).waiting;
  return mult;
}

export function worldFactorRevenueMultiplier(
  factors: readonly ActiveWorldFactor[]
): number {
  let mult = 1;
  for (const f of factors) mult *= (FACTOR_MULTIPLIERS[f.kind] ?? IDENTITY).revenue;
  return mult;
}

export function worldFactorDeliveryMultiplier(
  factors: readonly ActiveWorldFactor[]
): number {
  let mult = 1;
  for (const f of factors) mult *= (FACTOR_MULTIPLIERS[f.kind] ?? IDENTITY).delivery;
  return mult;
}

// -------- player-facing labels (Swedish) ---------------------------------
//
// One line per realisation. The opening panel lists these under the
// weather; ambient stream may echo one 30-60 s into service so the
// player sees the reason the room is doing what it's doing.

export const FACTOR_LABEL: Record<WorldFactorKind, string> = {
  konjunktur_uppgang: 'Upturn in the region',
  konjunktur_nedgang: 'Business barometer: falling',
  vagarbeten:         'Roadworks on Kyrkogatan',
  sasong_turism:      'Autumn leaves draw visitors to the area',
  sasong_semester:    'The area is empty — holiday week',
  evenemang_festival: 'Autumn market on Torget',
  evenemang_hockey:   'Hockey match at seven'
};

export const FACTOR_BODY: Record<WorldFactorKind, string> = {
  konjunktur_uppgang:
    'Business is good. More bookings, bigger bills.',
  konjunktur_nedgang:
    'Local business is tightening its belt. Fewer guests, less spending.',
  vagarbeten:
    'The road in from the east is closed — fewer out-of-town guests find their way here, and suppliers are late.',
  sasong_turism:
    'Lots of visitors in the area. The room draws people even without bookings.',
  sasong_semester:
    'The village has gone away. The evening will be quiet.',
  evenemang_festival:
    'The market on Torget drops guests off all evening.',
  evenemang_hockey:
    'The match dominates — a crowd that comes afterwards, quick and price-conscious.'
};
