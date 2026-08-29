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

// ORDER 117 §3 VO-beslut (2026-08-18): "råvara + eko höjer tak + mise
// en place sänker." Låg readiness på svagaste prep-item drar av
// perceived value — en gäst som får mat utan garnityr eller servett
// upplever mindre för samma pris. Använder MIN(readiness) så systemet
// bryter där det är svagast, samma matte-form som collapse-formeln.
// Max avdrag 0.3 vid readiness=0 (jämförbart med ett steg av
// ingredient-tier), 0 avdrag vid readiness ≥ 0.7 (tröskeln där MeP
// räknas som "hel" per PREP_PANEL).
const MEP_THRESHOLD_FULL = 0.7;   // över denna nivå: inget avdrag
const MEP_MAX_DEDUCT = 0.30;      // vid readiness 0: max avdrag

function mepDeductionFromReadiness(readiness: Record<string, number> | undefined): number {
  if (!readiness) return 0;
  const vals = Object.values(readiness);
  if (vals.length === 0) return 0;
  let min = 1;
  for (const v of vals) if (v < min) min = v;
  if (min >= MEP_THRESHOLD_FULL) return 0;
  // Linjärt från 0 avdrag vid MEP_THRESHOLD_FULL ner till max vid 0.
  const frac = 1 - (min / MEP_THRESHOLD_FULL);
  return MEP_MAX_DEDUCT * frac;
}

// Perceived value från policies + verksamhet + MeP. Ren funktion.
// MeP-avdraget är bara aktivt under service (då prepReadiness existerar).
// Utanför service (morning/evening) är avdraget 0 — kvoten läses från
// råvara + eko bara.
export function perceivedValueForBusiness(state: SimulationState): number {
  const base = INGREDIENT_VALUE[state.policies.ingredientTier];
  const eco = state.policies.localSourcing ? ECO_VALUE_LIFT : 0;
  const mepDeduct = mepDeductionFromReadiness(state.day.prepReadiness);
  return Math.max(0, base + eco - mepDeduct);
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

// -----------------------------------------------------------------------------
// §3.1 — Asymmetrisk fördröjd effekt på ankomster (VO-beslut 2026-08-18)
// -----------------------------------------------------------------------------

// Down = rykte tappas snabbare. Up = byggs långsammare.
// 4 services = 2 speldagar. 6 services = 3 speldagar.
// Vid varje service-close skjuts effektiv V mot momentan V med olika
// steg beroende på riktning. Low-pass-filter, inte hårt genombrott.
const DOWN_STEP = 1 / 4;    // rykte-tapp: 2 dagar tidkonstant
const UP_STEP = 1 / 6;      // rykte-bygg: 3 dagar tidkonstant

// Kallas vid service-close (efter uppdaterade metrics). Muterar draft.
export function updateEffectiveValueQuota(state: SimulationState): void {
  const current = valueQuota(state);
  const eff = state.effectiveValueQuota;
  const step = current < eff ? DOWN_STEP : UP_STEP;
  const next = eff + (current - eff) * step;
  state.effectiveValueQuota = Math.max(0, Math.min(2, next));
}

// Läses av arrivals.ts. Returnerar en multiplikator [0.7, 1.3] baserat
// på effektiv V mot neutral 1.0. Skala vald så en extrem effektiv V
// ger max ±30% på ankomsttakten — betydande men inte förkrossande;
// väder-multiplikatorn (0.55×..1.28×) är också i samma band.
const ARRIVAL_QUOTA_SCALE = 0.3;

export function valueQuotaArrivalMultiplier(state: SimulationState): number {
  const eff = state.effectiveValueQuota;
  // (eff - 1.0) i [-1, 1] → mult i [1 - 0.3, 1 + 0.3] = [0.7, 1.3]
  const delta = Math.max(-1, Math.min(1, eff - 1.0));
  return 1.0 + delta * ARRIVAL_QUOTA_SCALE;
}

// -----------------------------------------------------------------------------
// §5.2 — Rykte-trend-indikator (utan siffra)
// -----------------------------------------------------------------------------

// Läses av PlayerPanel:s Reading-komponent. Returnerar 'up' | 'down' |
// 'flat' baserat på om effektiv V ligger tydligt över/under neutralt.
// Ingen exakt siffra visas — bara riktningen på det som kommer att
// märkas i kön nästa dag.
//
// Trösklarna är brett satta så en marginellt positiv/negativ kvot inte
// får spelaren att jaga småförändringar. Endast tydliga bra/dåliga val
// syns i indikatorn.
const TREND_UP_THRESHOLD = 1.10;    // effektiv V > 1.10 → ▲
const TREND_DOWN_THRESHOLD = 0.90;  // effektiv V < 0.90 → ▼

export type ReputationTrend = 'up' | 'down' | 'flat';

export function reputationTrend(state: SimulationState): ReputationTrend {
  const eff = state.effectiveValueQuota;
  if (eff > TREND_UP_THRESHOLD) return 'up';
  if (eff < TREND_DOWN_THRESHOLD) return 'down';
  return 'flat';
}
