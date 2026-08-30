import type { Rng } from '../util/rng';
import type { DayPeriod, Guest, SimulationState } from '../types';
import { makeGuest } from './model';
import { economicReadingNormalised } from './cashReading';
import { PRICE_ARRIVAL_MULT, SERVICE_ARRIVAL_MULT } from './economics';
import { currentRhythmMultiplier } from './rhythm';
import { weatherArrivalMultiplier } from './weather';
import { worldFactorArrivalMultiplier } from './worldFactors';
import { valueQuotaArrivalMultiplier } from './valueQuota';

// ORDER 111 §3 — food truck-specifika viktningar.
//
// **Konkurrens.** Food trucken konkurrerar med befintliga restauranger.
// Enkel form (per ordertext §3 sista mening): en konstant faktor som drar
// efterfrågan. 0.85 = 15 % lägre bas än restaurangens, motiverar att
// spelaren själv måste dra folk till luckan.
const FOODTRUCK_COMPETITION_MULTIPLIER = 0.85;

// **Väder viktar efterfrågan skarpare.** Restaurangen har halvskyddad
// entré; food trucken är gatuläge. `weatherArrivalMultiplier` returnerar
// redan ett band ~0.55–1.28 för restaurang; för food truck sträcks det
// ut. Regn/snö drar hårdare, klart/varmt lyfter mer. Enkelt: linjär
// justering från 1.0 (multiplikatorn är 1.0 = neutralt) mot ytterlägena.
function foodtruckWeatherAmplify(baseMultiplier: number): number {
  // 1.0 mappar till 1.0 (neutralt förblir neutralt); avvikelser fördubblas.
  return 1 + 2 * (baseMultiplier - 1);
}

// ORDER 043 §6 phenomena constants.
//
// ECONOMIC_ARRIVAL_FLOOR — at economic = 0, arrivals still fire at this
// fraction of the policy-only baseline. Never zero: people still eat,
// even in a weak establishment. Reading: at capital=0 the arrival rate
// is 40% of what it would be at capital=1; the room is visibly quieter
// but not empty.
const ECONOMIC_ARRIVAL_FLOOR = 0.4;

// ECONOMIC_WALKAWAY_CEIL — maximum probability that an arriving guest
// walks to the entrance and turns back (as opposed to entering and
// sitting). Multiplied by (1 − economic) so at capital=1 nobody walks
// away, at capital=0 20% of arrivals refuse entry. Halved from 0.4 at
// the room-flow retune (Vision Owner: "femton per lunch är en ström,
// inte ett undantag") — the previous ceiling flooded lunch with
// vändare at moderate economic. Cycle-1 tuning; revisit from playtest.
const ECONOMIC_WALKAWAY_CEIL = 0.2;

// ORDER 043 v3 §2 period gate. Ambient arrivals only fire during a
// running service; morning / afternoon / evening are closed windows
// (no guests, no queue, no walk-aways). A future order can widen this
// (e.g. a "late-morning stragglers" bonus) but the base rule is: the
// room fills when the doors are open, and only then.
const PERIOD_ARRIVAL_MULTIPLIER: Record<DayPeriod, number> = {
  morning: 0,
  // ORDER 111 §4 — frukost är ett värdshus-pass med egen liten ström
  // (övernattande gäster är redan där, inga ambient-arrivals utifrån).
  // 0 gör breakfast till en stängd period för spawn-vägen; övernattande
  // gäster serveras via värdshusets egen breakfast-hantering.
  breakfast: 0,
  lunch: 0.6,
  afternoon: 0,
  dinner: 1.0,
  evening: 0
};

export function periodArrivalMultiplier(period: DayPeriod): number {
  return PERIOD_ARRIVAL_MULTIPLIER[period];
}

// Base arrival rate in guests per sim-minute, before any of the
// modulators (period gate, service concept, pricing tier, economic
// capital, reputation). Tuned at the ORDER 043 v3 room-flow retune
// from the old 3.2/min baseline: at the previous rate a full 30-min
// dinner service averaged ~5 seated at the peak, well under the
// 16-cover room. 12/min combined with period gates (lunch 0.6, dinner
// 1.0) yields a lunch of ~7 covers and a dinner that reliably fills
// the room, so the queue carries a signal.
const ARRIVAL_BASE_PER_MINUTE = 12;

// ORDER 043 v3 §4 reputation loop — reputation raises demand. Linear
// mapping so a weak reputation still pulls in some guests (the
// restaurant is not empty on day one) and a strong reputation
// amplifies pressure. At the default reputation 0.6 the multiplier is
// 0.98, so day-one arrival pressure closely matches the pre-loop
// tuning — the loop only bites once reputation drifts.
//
//   reputation = 0.0 → 0.6× arrivals (a bad name loses guests)
//   reputation = 0.5 → 0.9× arrivals
//   reputation = 1.0 → 1.4× arrivals (word-of-mouth full house)
const REPUTATION_ARRIVAL_FLOOR = 0.6;
const REPUTATION_ARRIVAL_CEIL = 1.4;

export function reputationArrivalMultiplier(reputation: number): number {
  const clamped = Math.max(0, Math.min(1, reputation));
  return (
    REPUTATION_ARRIVAL_FLOOR +
    (REPUTATION_ARRIVAL_CEIL - REPUTATION_ARRIVAL_FLOOR) * clamped
  );
}

// Maximum concurrent guests (seated + waiting + arriving + declined
// pending removal). Raised from 12 → 24 alongside the base-rate lift so
// the arrival stream can actually reach 16 covers + 4 waiting at peak
// without the cap short-circuiting spawns.
const ACTIVE_GUEST_CAP = 24;

// Very small arrival model. Expected guests per sim-minute is derived from
// pricing and service concept, then modulated by the current economic
// capital and reputation so a weak-economy period visibly thins the
// room and a strong-reputation restaurant pulls guests in.
//
// ORDER 043 Addendum A prep gate: while day.prepEndsAt is set and
// simTime hasn't crossed it, the doors haven't opened yet — no
// arrivals, no queue. The prep event stream carries the reading
// during this window.
export function arrivalProbability(state: SimulationState): number {
  // ORDER 045 opening image — no arrivals during the 10-s opening
  // panel either (doors haven't opened yet).
  if (
    state.day.openingEndsAt !== null &&
    state.simTime < state.day.openingEndsAt
  ) {
    return 0;
  }
  if (
    state.day.prepEndsAt !== null &&
    state.simTime < state.day.prepEndsAt
  ) {
    return 0;
  }
  // ORDER 043 Addendum A rhythm + ORDER 045 weather. Weather is a
  // reading: warm + still + clear lifts to ~1.28×; cold + windy +
  // drizzle drops to ~0.55×. The reading shows up in the room by
  // shaping how full it gets.
  //
  // ORDER 111 §3 — food truck-specifika modifierare:
  //   * kö-gate: när kön är full slutar nya gäster ställa sig
  //     (behandlas i maybeSpawnGuest via ACTIVE_GUEST_CAP-liknande check
  //     mot policies.capacity — capacity varierar per verksamhet).
  //   * väder-amplifiering: gatuläget dubblerar väderpåverkan.
  //   * konkurrens: konstant nedjustering för att spegla att food trucken
  //     tävlar med befintliga restauranger.
  const isFoodtruck = state.businessClass === 'foodtrucken';
  const weatherBase = weatherArrivalMultiplier(state.day.weather);
  const weatherMult = isFoodtruck ? foodtruckWeatherAmplify(weatherBase) : weatherBase;
  const competitionMult = isFoodtruck ? FOODTRUCK_COMPETITION_MULTIPLIER : 1;
  // ORDER 117 §3.1 — värdekvotens fördröjda multiplikator på ankomster.
  // Läser state.effectiveValueQuota (asymmetriskt smoothad vid service-
  // close) och mappar till [0.7, 1.3]. VO-beslut 2026-08-18: rykte
  // tappas snabbare än det byggs (down 2 dagar, up 3 dagar).
  const valueMult = valueQuotaArrivalMultiplier(state);
  const perMinute =
    ARRIVAL_BASE_PER_MINUTE *
    periodArrivalMultiplier(state.day.period) *
    SERVICE_ARRIVAL_MULT[state.policies.service] *
    PRICE_ARRIVAL_MULT[state.policies.pricing] *
    economicArrivalMultiplier(state) *
    reputationArrivalMultiplier(state.reputation) *
    weatherMult *
    worldFactorArrivalMultiplier(state.day.worldFactors) *
    currentRhythmMultiplier(state) *
    competitionMult *
    valueMult;
  return perMinute / (60 * 5); // 5 Hz tick.
}

// ORDER 050 §3 (2026-08-10) — reads the derived economic [0,1] view
// off state.cash rather than the retired capitals.values.economic
// scalar. The curve shape is unchanged.
export function economicArrivalMultiplier(state: SimulationState): number {
  const normalised = economicReadingNormalised(state);
  return ECONOMIC_ARRIVAL_FLOOR + (1 - ECONOMIC_ARRIVAL_FLOOR) * normalised;
}

// ORDER 043 §6 walk-away probability at spawn time. Guest's fate to
// refuse entry is decided when they appear, not on arrival — so the
// same-guest outcome is deterministic (a guest whose reading-at-spawn
// said "walk away" walks away, no re-roll on the way).
export function walkAwayProbability(state: SimulationState): number {
  const normalised = economicReadingNormalised(state);
  return ECONOMIC_WALKAWAY_CEIL * (1 - normalised);
}

export function maybeSpawnGuest(state: SimulationState, rng: Rng): Guest | null {
  const active = state.guests.length;
  if (active >= ACTIVE_GUEST_CAP) return null;
  // ORDER 111 §3 — kögate för food truck: kön (waitingIds) är
  // verksamheten. När kön nått verksamhetens capacity slutar nya
  // gäster ställa sig — förbipasserande går vidare. Skiljer sig från
  // ACTIVE_GUEST_CAP: den är en absolut sim-gräns; queue-gate är
  // gatans läsning ("för lång kö = jag går").
  if (state.businessClass === 'foodtrucken') {
    if (state.waitingIds.length >= state.policies.capacity) return null;
  }
  if (!rng.chance(arrivalProbability(state))) return null;
  const walkAway = rng.chance(walkAwayProbability(state));
  return makeGuest(state.simTime, false, walkAway);
}

// Scenario spawn: independent of the arrival model. Emits `count` guests at a
// steady cadence starting from the trigger tick. Scenario guests never
// walk away — they're the specific arrival the player is responding to.
export function scenarioSpawnStep(state: SimulationState): Guest | null {
  if (state.scenario.spawnedRemaining <= 0) return null;
  if (state.simTime < state.scenario.nextSpawnAt) return null;
  return makeGuest(state.simTime, true, false);
}
