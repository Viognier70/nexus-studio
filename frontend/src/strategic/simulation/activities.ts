// ORDER 075 (M2) — activity model per
// documentation/architecture/M2_ACTIVITY_MODEL_REPORT_ORDER_075.md
// Replaces the abstract theme-wager retired in ORDER 050 §5 with
// named work carrying visible three-column effects.

import type { SustainabilityKey } from '../types';

export interface CapitalDelta {
  economic: number;    // SEK, positive = income, negative = cost, applied at end of day
  social: number;      // [-0.05, +0.05], capital-scale
  ecological: number;  // [-0.05, +0.05], capital-scale
}

export interface Activity {
  id: string;
  name: string;                // English per CLAUDE.md rule 7
  description: string;
  costSek: number;             // upfront cost paid when the activity is picked
  effect: CapitalDelta;        // applied at end-of-day, alongside wages
  availability: 'always' | 'weekly';
}

// Initial 6-activity catalogue. Numbers are the teaching — see
// report §7. Vision Owner override anytime.
export const ACTIVITY_CATALOGUE: readonly Activity[] = [
  {
    id: 'train-service',
    name: 'Train the service team',
    description: 'A half-hour walk-through of pass timing and table cadence.',
    costSek: 3000,
    effect: { economic: -3000, social: 0.04, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'runner-shift',
    name: 'Bring in a floor runner',
    description: 'One extra pair of hands moving plates and clearing tables.',
    costSek: 1800,
    effect: { economic: -1800, social: 0.03, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'local-sourcing',
    name: "Switch tonight's produce to local",
    description: 'Small farms nearby; higher unit cost, shorter supply chain.',
    costSek: 2500,
    effect: { economic: -2500, social: 0.02, ecological: 0.05 },
    availability: 'always'
  },
  {
    id: 'wine-tasting',
    name: 'Team wine tasting hour',
    description: 'The team knows the list; upsells arrive naturally.',
    costSek: 2000,
    effect: { economic: 1000, social: 0.02, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'guest-chef',
    name: 'Guest chef for the evening',
    description: 'A friend of the house cooks; the pass ships something worth talking about.',
    costSek: 8000,
    effect: { economic: 6000, social: 0.02, ecological: 0 },
    availability: 'weekly'
  },
  {
    id: 'compost-audit',
    name: 'Kitchen composting audit',
    description: 'Walk through the bins and prep flow; small changes stick if you look at them.',
    costSek: 4000,
    effect: { economic: -4000, social: 0.01, ecological: 0.04 },
    availability: 'weekly'
  }
];

export const MAX_ACTIVITIES_PER_DAY = 3;
export const WEEKLY_GATE_DAYS = 7;

export function activityById(id: string): Activity | undefined {
  return ACTIVITY_CATALOGUE.find((a) => a.id === id);
}

/** Which sustainability capital the activity has its largest
 *  effect on. Not surfaced to the player (ORDER 050 §4 constraint —
 *  the numbers are the teaching, not a category label); used only
 *  by the evening account paragraph selector for the "you also
 *  picked X" sentence order. Kept in this module rather than a
 *  content bank so a future re-tuning of the numbers automatically
 *  updates the ordering. */
export function dominantCapital(effect: CapitalDelta): SustainabilityKey {
  const absEcon = Math.abs(effect.economic) / 5000; // rough scale for comparison
  const absSoc = Math.abs(effect.social);
  const absEcolog = Math.abs(effect.ecological);
  if (absEcolog >= absSoc && absEcolog >= absEcon) return 'ecological';
  if (absSoc >= absEcon) return 'social';
  return 'economic';
}
