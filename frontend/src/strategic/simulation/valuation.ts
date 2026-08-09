// ORDER 049 §5.2 — business valuation.
//
// value = tangible + goodwill − debt
//
// Vision Owner gate answers 2026-08-09:
//   gate 1 (base_multiplier = 3.0): approved.
//   gate 2 (weakest-link, not mean, for quality_factor): approved,
//     punitive by design. A restaurant with excellent food and
//     undermarked service is not an average restaurant — it has a
//     problem a buyer will price.
//   gate 3 (reputation_factor 0.5 + reputation): approved.
//   gate 4 (fitout % per tier): approved.
//   gate 5 (premises_baseline = ceiling × 0.70): approved.
//   gate 6 (monthly_net floored at 0): approved. No goodwill on a
//     loss-making venture — no-one pays to lose money.
//   gate 7 (interest ON): approved. Without it the loan is free
//     money and the financing choice in the bank meeting means less.
//     Also what makes higher capital requirements after bankruptcy
//     palpable.
//   gate 9 (14-day rolling window): approved.
//
// Cycle-1 uses a placeholder tier ('T2') until §5.1 bank meeting is
// built and stamps the venture with a real tier at creation. Tier
// data lives here so the panel can compute value even in the
// grandfathered case.

import type { SimulationState } from '../types';
import { TOTAL_SEATS } from '../business/interiorLayout';

// -------- tier constants ------------------------------------------------

export type LoanTier = 'T0' | 'T1' | 'T2' | 'T3';

interface TierData {
  ceiling: number;         // kSEK — bank ceiling (also used as premises baseline anchor)
  fitoutPct: number;       // fitout as fraction of premises baseline
  label: string;           // player-facing (foodtruck / bistro / restaurang / historisk sittning)
}

export const TIER_DATA: Record<LoanTier, TierData> = {
  T0: { ceiling:  200, fitoutPct: 0.40, label: 'Foodtruck (Grythyttan)' },
  T1: { ceiling:  900, fitoutPct: 0.30, label: 'Café / bistro'          },
  T2: { ceiling: 2400, fitoutPct: 0.30, label: 'Restaurang'             },
  T3: { ceiling: 5500, fitoutPct: 0.25, label: 'Historisk sittning'     }
};

const PREMISES_BASELINE_FRACTION = 0.70;
const INVENTORY_KSEK = { grund: 5, utvald: 12, premium: 25 } as const;

const BASE_MULTIPLIER = 3.0;
const ROLLING_WINDOW_DAYS = 14;

// -------- pieces -------------------------------------------------------

function premisesBaseline(tier: LoanTier): number {
  return TIER_DATA[tier].ceiling * PREMISES_BASELINE_FRACTION;
}

function fitoutValue(tier: LoanTier): number {
  return premisesBaseline(tier) * TIER_DATA[tier].fitoutPct;
}

// Sum of remaining-contract buyout across non-agency team members.
// Same math as reducer.fireTeamMember pays out — a buyer inherits
// these contracts and prices them in as liability.
function teamBuyoutLiability(state: SimulationState): number {
  let sum = 0;
  const today = state.day.dayNumber;
  for (const m of state.team.members) {
    if (m.isAgency) continue;
    const remaining = Math.max(0, m.contractEndsDay - today);
    sum += remaining * m.dailyCost;
  }
  // Convert from raw kr to kSEK-scale to match the tier ceilings.
  return sum / 1000;
}

// Monthly net run rate = mean daily net over the rolling window × 30.
// Uses the lunch + dinner rolling arrays as the revenue signal; cost
// comes from state.cost delta. When fewer than N days accumulated,
// uses whatever is there — early ventures are tangible-heavy, as they
// should be.
function monthlyNetRunRate(state: SimulationState): number {
  const lunches = state.serviceRevenueRolling.lunch;
  const dinners = state.serviceRevenueRolling.dinner;
  const days = Math.max(lunches.length, dinners.length);
  if (days === 0) return 0;
  // Sum of (lunch + dinner) revenues per day.
  let revSum = 0;
  for (let i = 0; i < days; i++) {
    revSum += (lunches[i] ?? 0) + (dinners[i] ?? 0);
  }
  // Cost per day approximation: state.cost / state.day.dayNumber.
  // Not perfect but robust to the current sim's lack of per-day cost
  // arrays. Interest is included in state.cost via the reducer tick.
  const costPerDay = state.day.dayNumber > 0 ? state.cost / state.day.dayNumber : 0;
  const meanRev = revSum / days;
  const dailyNet = meanRev - costPerDay;
  return Math.max(0, dailyNet * 30);   // gate 6: floored at 0
}

function qualityFactor(state: SimulationState): number {
  // Gate 2: WEAKEST LINK, not mean. A single weak area caps goodwill.
  const weakest = Math.min(state.qualityFood, state.qualityDrink, state.qualityService);
  return 0.5 + 0.5 * weakest;   // range [0.5, 1.0]
}

function reputationFactor(state: SimulationState): number {
  return 0.5 + state.reputation;   // range [0.5, 1.5]
}

// -------- composite ---------------------------------------------------

export interface Valuation {
  value: number;         // final kSEK — the sell price
  tangible: number;      // premises + fitout + inventory − team buyout
  goodwill: number;      // monthly net × multiplier
  debt: number;          // outstanding loan principal
  multiplier: number;    // reported so the panel can show what drove the goodwill
  weakestQuality: number;// reported so the panel can attribute a cap
  weakestArea: 'mat' | 'dryck' | 'service';
  cash: number;          // state.revenue − state.cost, reported for context
}

export function computeValuation(state: SimulationState, tier: LoanTier = 'T2'): Valuation {
  const base = premisesBaseline(tier);
  const fitout = fitoutValue(tier);
  const inventory = INVENTORY_KSEK[state.policies.ingredientTier];
  const buyout = teamBuyoutLiability(state);
  const tangible = base + fitout + inventory - buyout;

  const runRate = monthlyNetRunRate(state);
  const qFactor = qualityFactor(state);
  const rFactor = reputationFactor(state);
  const multiplier = BASE_MULTIPLIER * qFactor * rFactor;
  const goodwill = runRate * multiplier;

  const debt = state.loan.principal;
  const value = tangible + goodwill - debt;

  const q = { mat: state.qualityFood, dryck: state.qualityDrink, service: state.qualityService };
  let weakestArea: 'mat' | 'dryck' | 'service' = 'mat';
  let weakestQuality = q.mat;
  if (q.dryck < weakestQuality) { weakestQuality = q.dryck; weakestArea = 'dryck'; }
  if (q.service < weakestQuality) { weakestQuality = q.service; weakestArea = 'service'; }

  return {
    value,
    tangible,
    goodwill,
    debt,
    multiplier,
    weakestQuality,
    weakestArea,
    cash: state.revenue - state.cost
  };
}

// -------- revenue-per-seat + lunch/dinner split for the panel ---------

export interface PanelRevenueReading {
  perSeatPerDay: number;      // kSEK per seat per day, over rolling window
  lunchShare: number;         // 0..1 fraction of rolling revenue from lunch
  dinnerShare: number;
}

export function revenueReading(state: SimulationState): PanelRevenueReading {
  const lunches = state.serviceRevenueRolling.lunch;
  const dinners = state.serviceRevenueRolling.dinner;
  const days = Math.max(lunches.length, dinners.length);
  if (days === 0) {
    return { perSeatPerDay: 0, lunchShare: 0, dinnerShare: 0 };
  }
  let lunchSum = 0, dinnerSum = 0;
  for (let i = 0; i < days; i++) {
    lunchSum += lunches[i] ?? 0;
    dinnerSum += dinners[i] ?? 0;
  }
  const total = lunchSum + dinnerSum;
  const perSeatPerDay = total / days / Math.max(1, TOTAL_SEATS);
  const lunchShare = total > 0 ? lunchSum / total : 0;
  const dinnerShare = total > 0 ? dinnerSum / total : 0;
  return { perSeatPerDay, lunchShare, dinnerShare };
}

export const ROLLING_WINDOW = ROLLING_WINDOW_DAYS;
