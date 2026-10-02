// ORDER 075 (M2) — activity model per
// documentation/architecture/M2_ACTIVITY_MODEL_REPORT_ORDER_075.md
// Replaces the abstract theme-wager retired in ORDER 050 §5 with
// named work carrying visible three-column effects.

import { calendarFor } from '../../sim/calendar';
import { EVENING_ECONOMY, WEEK } from '../../sim/balance';
import type { SustainabilityKey } from '../types';
import { strings } from '../../content/strings';

export interface CapitalDelta {
  // SEK, positive = income, negative = cost, applied at end of day.
  // ORDER 291 (provspel av 4795192): satsningarna hade en negativ följd lika
  // stor som priset, så att priset drogs två gånger (när den valdes och vid
  // dygnsskiftet). Priset dras nu en gång; följden är bara en intäkt.
  economic: number;
  social: number;      // [-0.05, +0.05], capital-scale
  ecological: number;  // [-0.05, +0.05], capital-scale
}

export interface Activity {
  id: string;
  name: string;                // engelsk reserv; spelartexten i strings.activityText
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
    name: 'Train the floor staff',
    description: 'A half-hour run-through of the pace at the pass and the rhythm at the tables.',
    costSek: 3000,
    effect: { economic: 0, social: 0.04, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'runner-shift',
    name: 'Bring in a runner',
    description: 'An extra pair of hands to carry out plates and clear tables.',
    // ORDER 296b — priset i balance.ts.
    costSek: EVENING_ECONOMY.runnerCostSek,
    effect: { economic: 0, social: 0.03, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'local-sourcing',
    name: 'Local ingredients tonight',
    description: 'Small farms nearby: a higher unit price, a shorter supply chain.',
    costSek: 2500,
    effect: { economic: 0, social: 0.02, ecological: 0.05 },
    availability: 'always'
  },
  {
    id: 'wine-tasting',
    name: 'Wine tasting with the team',
    description: 'The team knows the wine list, and the extra sales come on their own.',
    costSek: 2000,
    effect: { economic: 1000, social: 0.02, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'guest-chef',
    name: 'Guest chef for the evening',
    description: 'A friend of the house cooks, and the pass sends out something the guests talk about.',
    costSek: 8000,
    effect: { economic: 6000, social: 0.02, ecological: 0 },
    availability: 'weekly'
  },
  // ORDER 290 — DJ som satsning i kvällens insats (balance.ts EVENING_ECONOMY).
  // ORDER 296b: den sena rundan när musiken börjar (sim/satsningar.ts), i
  // stället för fler gäster. Texten i strängtabellen.
  {
    id: 'book-dj',
    name: 'A DJ tonight',
    description: 'Music from nine o’clock, and everyone seated orders another glass. Buy wine for it. It pays on a full evening, and most when it isn’t every evening.',
    costSek: EVENING_ECONOMY.djCostSek,
    effect: { economic: 0, social: 0.01, ecological: 0 },
    availability: 'always'
  },
  {
    id: 'compost-audit',
    name: 'Review of the kitchen compost',
    description: 'Go through the bins and the flow in the prep. Small changes hold when someone keeps an eye on them.',
    costSek: 4000,
    effect: { economic: 0, social: 0.01, ecological: 0.04 },
    availability: 'weekly'
  }
];

// ORDER 263 — morgonens schemaplatser kommer från kalendern: två på
// vardagar, fyra på söndag (speldesign > Tiden, balance.ts DAY). Ersätter
// MAX_ACTIVITIES_PER_DAY = 3. Paviljongsbesök tar också en plats från
// etapp 2 (ORDER 264).
export function scheduleSlotsFor(dayNumber: number): number {
  return calendarFor(dayNumber).scheduleSlots;
}
// Veckospärren: en veckoaktivitet kan väljas en gång per sju dagar.
export const WEEKLY_GATE_DAYS = WEEK.daysPerWeek;

// ORDER 291 — namnet och beskrivningen på spelarens språk ur
// strängtabellen; fälten ovan är den engelska reserven.
export function activityName(a: Activity): string {
  const t = (strings.activityText as Record<string, { name: string; description: string } | undefined>)[a.id];
  return t?.name ?? a.name;
}
export function activityDescription(a: Activity): string {
  const t = (strings.activityText as Record<string, { name: string; description: string } | undefined>)[a.id];
  return t?.description ?? a.description;
}

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
