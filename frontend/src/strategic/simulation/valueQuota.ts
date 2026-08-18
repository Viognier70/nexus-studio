// ORDER 117 §3 — värdekvoten.
//
// Kvot mellan VAD gästen betalar och VAD hen får. Läses som:
//   V = perceivedValue / pricePenalty
//
// V > 1 → gott värde: kön blir längre, gästerna nöjda.
// V ~ 1 → normalt värde.
// V < 1 → dåligt värde: kön blir kortare, gästerna missnöjda.
//
// **Klämpat till [0, 2]** så en absurd V inte bryter linjära förskjutare
// nedströms. Praktiska värden ligger i [0.5, 1.6].
//
// Denna funktion är REN — inga tick-effekter, ingen randomness, ingen
// clock. Läses av arrivals.ts (delayed via rolling-window) och
// service.ts (immediate per-guest satisfaction-modulering).
//
// **Design-not:** kvoten baseras på tre synliga axlar spelaren aktivt
// styr:
//   * `policies.pricing` (låg/medel/hög) — vad gästen betalar
//   * `policies.ingredientTier` (grund/utvald/premium) — råvaru-kvalitet
//   * `policies.localSourcing` (bool) — eko-lyft (§3.3 aktivitet i M2)
//
// Ytterligare axlar (t.ex. `enablers.cultural.episteme` för kock-
// kunskap, `staff.trainingLevel` för hantverk) läses ENDAST via
// `perceivedValueForBusiness` för uppsvingningen; själva pris-straffet
// är rakt av `pricing`-styrning.

import type { SimulationState, PricingTier, IngredientTier } from '../types';

// -----------------------------------------------------------------------------
// Ingång 1: pris-straff
// -----------------------------------------------------------------------------

// Vad gästen upplever betala. Skalan [0.7, 1.3] speglar SERVICE_ARRIVAL_MULT/
// PRICE_ARRIVAL_MULT-familjen men med snävare band eftersom kvoten sedan
// dividerar. 0.7 = låga priser upplevs som "billigt", 1.3 = höga upplevs
// dyrt. Neutralt (1.0) = medel.
const PRICE_PENALTY: Record<PricingTier, number> = {
  låg: 0.7,
  medel: 1.0,
  hög: 1.3
};

// -----------------------------------------------------------------------------
// Ingång 2: upplevt värde
// -----------------------------------------------------------------------------

// Bas-värde per råvarunivå. Grund = medel-referens (1.0), utvald/premium
// lyfter. Räknat mot ingredientCostPerGuest-familjen (basic=4, utvald=7,
// premium=12): premium betalar 3× för råvara jämfört med basic; den
// kostnaden fångas här som ~1.5× perceived-value (INTE 3× — verkligt
// upplevt värde växer långsammare än matkostnad).
const INGREDIENT_VALUE: Record<IngredientTier, number> = {
  grund: 1.0,
  utvald: 1.2,
  premium: 1.5
};

// Eko-lyftet: när `localSourcing = true` lyfts perceived value med 0.15
// ovanpå råvarunivån. Motivering: aktiviteten "Switch tonight's produce
// to local" (M2, ECO +0.05) redan finns; §3.3 säger att spelaren kan
// höja priset utan att kvoten faller när eko är på. 0.15 lyft matcher
// ungefär pris-mellanband-steget (0.3) hälften — så eko-läget öppnar en
// nivås pris utan straff.
const ECO_VALUE_LIFT = 0.15;

// Perceived value från policies + verksamhet. Ren funktion.
export function perceivedValueForBusiness(state: SimulationState): number {
  const base = INGREDIENT_VALUE[state.policies.ingredientTier];
  const eco = state.policies.localSourcing ? ECO_VALUE_LIFT : 0;
  return base + eco;
}

// -----------------------------------------------------------------------------
// Sammansatt kvot
// -----------------------------------------------------------------------------

// V = perceivedValue / pricePenalty, klämpat [0, 2].
//
// Exempel (default localSourcing=true, som model.ts sätter):
//   grund + medel:   1.0+0.15 / 1.0 = 1.15  (net-neutral med lite lyft)
//   grund + hög:     1.15 / 1.3   = 0.88  (dåligt värde)
//   utvald + medel:  1.35 / 1.0   = 1.35  (bra värde)
//   premium + hög:   1.65 / 1.3   = 1.27  (bra värde, dyrt-men-värt-det)
//   premium + låg:   1.65 / 0.7   = 2.00 (klämpat) → förstklassigt värde
//   grund + låg:     1.15 / 0.7   = 1.64  (skalpott — låga marginaler)
//
// **Två strategier ska vara gångbara** (DoD §6.4):
//   * "utvald + hög" → V=1.04, hög marginal, medel-nöjdhet
//   * "utvald + låg" → V=1.93, låg marginal, hög nöjdhet
export function valueQuota(state: SimulationState): number {
  const value = perceivedValueForBusiness(state);
  const price = PRICE_PENALTY[state.policies.pricing];
  const raw = value / price;
  return Math.max(0, Math.min(2, raw));
}

// -----------------------------------------------------------------------------
// Satisfaction-modulering (immediate per gäst)
// -----------------------------------------------------------------------------

// Läses av service.ts när en foodtruck-gäst går ordering → serving.
// Applicerad EN GÅNG per gäst — det första intrycket av vad de får för
// vad de betalar. Efter-tick-uppdateringar (checkback, welcome drink,
// etc.) fortsätter modulera separat.
//
// Returnerar en signed delta att applicera på gäst.satisfaction.
//   V=1.0 → 0     (neutralt intryck)
//   V=1.35 → +0.14 (bra värde ger nöjdhet)
//   V=0.88 → -0.10 (dåligt värde ger missnöje)
//
// Skalfaktorn (0.4) är kalibrerad så att extremvärden (V=0 eller V=2)
// ger ±0.4 satisfaction-delta — betydligt men inte förkrossande.
const VALUE_SATISFACTION_SCALE = 0.4;

export function valueQuotaSatisfactionDelta(state: SimulationState): number {
  const v = valueQuota(state);
  // Normalisera V mot 1.0 (=neutral).
  return (v - 1.0) * VALUE_SATISFACTION_SCALE;
}
