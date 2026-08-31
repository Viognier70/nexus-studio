// ORDER 166 §2 — konkurrenter som data + shareFactor-beräkning.
//
// Fyra NPC-verksamheter i Grythyttan som drar från samma ankomstström
// som spelaren. Varje konkurrent bär namn, verksamhetsklass, rykte och
// en byggnad ur ORDER 164:s kandidatlistor. Inte fler än nödvändigt —
// varje monterad klass (kvarterskrogen, ölkrogen, vinbaren) ska ha
// någon att mäta sig mot per §2.1.
//
// Ingen simulering: `reputation` är författad data, inte något som
// körs (§3 explicit). Ingen personal, ingen meny, ingen kassa. Rendering
// skjuts till egen order — dessa nämns aldrig i vyn.
//
// **shareFactor** i `arrivals.ts` läser den här modulens
// `computeShareFactor(playerReputation, playerClass, competitors)` och
// multiplicerar in i `perMinute`-kedjan. Bandet är avgränsat per
// SHARE_FACTOR_FLOOR / SHARE_FACTOR_CEIL nedan — en dålig start ska
// inte bli en spiral utan väg tillbaka (§2.2 tredje punkten).

import type { BusinessClass } from '../business/businessClass';

export interface Competitor {
  id: string;
  name: string;
  businessClass: BusinessClass;
  /** Rykte 0..1, samma skala som spelarens `state.reputation`. */
  reputation: number;
  /** OSM way-id ur ORDER 164:s kandidatlistor — byggnaden som
      konkurrenten "bor" i, för framtida rendering. Inte konsumerad
      av sim-lagret; hålls som data för spårbarhet. */
  buildingId: string;
}

// ---------- bandet ----------

/**
 * Undre gräns för shareFactor. En spelare med rykte 0 mot ett fält av
 * NPC:er med rykte 1 kappas hit, inte längre — annars blir en dålig
 * start en spiral utan väg tillbaka (ORDER 166 §2.2). Motsvarar att
 * ~55 % av ankomstströmmen fortfarande når spelaren även i värsta
 * konkurrensläge. Kombinerat med reputationArrivalMultiplier-golvet
 * (0.6) betyder det att ett katastrofalt rykte drar en ankomstström
 * på ca 0.55 × 0.6 = 33 % av bas-nivån — märkbart, men inte tom.
 */
export const SHARE_FACTOR_FLOOR = 0.55;

/**
 * Övre gräns för shareFactor. En spelare med rykte 1 mot ett fält av
 * NPC:er med rykte 0 kappas hit. Motsvarar att spelaren drar 40 %
 * fler gäster än field-baseline när hen är klart bäst. Kombinerat
 * med reputationArrivalMultiplier-taket (1.4) blir absolut peak
 * ca 1.4 × 1.4 = ~2× baslinjen — signal utan att bli meningslöst
 * enkelt (peak innebär också att spelaren redan har rep=1, vilket
 * i sig är svårt).
 */
export const SHARE_FACTOR_CEIL = 1.4;

/** Neutralvärde — spelaren ligger i mitten av fältet. */
export const SHARE_FACTOR_NEUTRAL = 1.0;

// ---------- klass-närhet (§2.3) ----------

/**
 * En kvarterskrog konkurrerar hårdare med en annan kvarterskrog än
 * med ett gästgiveri (§2.3). Vikten är hur mycket den andra klassens
 * rykte påverkar spelarens shareFactor:
 *
 *   1.0 = samma klass — full konkurrens om samma gäster
 *   0.6 = närbesläktad (mat/dryck-tyngd i samma spann)
 *   0.4 = perifer överlappning
 *   0.2 = olika tempo / anledning att komma
 *
 * Matrisen är författad på Vision Owner-nivå per §2.3 —
 * "hur mycket avgörs av den som bygger". Tal-magnituden är kalibrerad
 * så att en spelare-kvarterskrog vs 2 kvarterskrogar + 1 vinbar
 * ger tydligt annat utfall än vs 3 gästgiverier. Testet i
 * `competitors.test.ts` bevisar det (§DoD 5).
 */
const CLASS_SIMILARITY: Record<BusinessClass, Record<BusinessClass, number>> = {
  kvarterskrogen: {
    kvarterskrogen: 1.0,
    ölkrogen:       0.6,
    vinbaren:       0.4,
    gästgiveriet:   0.5,
    foodtrucken:    0.4
  },
  ölkrogen: {
    kvarterskrogen: 0.6,
    ölkrogen:       1.0,
    vinbaren:       0.7,
    gästgiveriet:   0.4,
    foodtrucken:    0.3
  },
  vinbaren: {
    kvarterskrogen: 0.4,
    ölkrogen:       0.7,
    vinbaren:       1.0,
    gästgiveriet:   0.4,
    foodtrucken:    0.2
  },
  gästgiveriet: {
    kvarterskrogen: 0.5,
    ölkrogen:       0.4,
    vinbaren:       0.4,
    gästgiveriet:   1.0,
    foodtrucken:    0.3
  },
  foodtrucken: {
    kvarterskrogen: 0.4,
    ölkrogen:       0.3,
    vinbaren:       0.2,
    gästgiveriet:   0.3,
    foodtrucken:    1.0
  }
};

export function classSimilarity(
  playerClass: BusinessClass,
  competitorClass: BusinessClass
): number {
  return CLASS_SIMILARITY[playerClass][competitorClass];
}

// ---------- fältet ----------

/**
 * NPC-verksamheterna. Byggnads-id:na är valda ur ORDER 164:s
 * kandidatlistor (byggnader vars OBB rymmer respektive rums
 * MIN_WIDTH_M × MIN_DEPTH_M). Renderas inte — id:t hålls för att
 * en framtida order som lägger till NPC-rendering vet var husen står.
 *
 * Antal och fördelning per §2.1: minst en per monterad klass, "inte
 * fler än nödvändigt". Fyra räcker för att kvarterskrogen har två
 * rivaler (spelet börjar oftast där), ölkrogen och vinbaren en var.
 * Ryktena är författade — inget som körs — spridda mellan 0,45 och
 * 0,75 så field-genomsnittet ligger nära default-rep (0,6) och
 * shareFactor för en genomsnittsspelare blir nära 1,0.
 */
export const COMPETITORS: readonly Competitor[] = [
  {
    id: 'npc-kvarnkrogen',
    name: 'Kvarnkrogen',
    businessClass: 'kvarterskrogen',
    reputation: 0.55,
    buildingId: 'w611766162'
  },
  {
    id: 'npc-prästgatans-krog',
    name: 'Prästgatans krog',
    businessClass: 'kvarterskrogen',
    reputation: 0.70,
    buildingId: 'w611624852'
  },
  {
    id: 'npc-bergsmansöl',
    name: 'Bergsmansöl',
    businessClass: 'ölkrogen',
    reputation: 0.50,
    buildingId: 'w870510857'
  },
  {
    id: 'npc-torgets-vinkällare',
    name: 'Torgets vinkällare',
    businessClass: 'vinbaren',
    reputation: 0.65,
    buildingId: 'w870510863'
  }
] as const;

// ---------- shareFactor ----------

/**
 * Ryktes-golv för divisionen så en NPC med rykte 0 inte ger en
 * oändlig kvot. Väljs lågt (0,05) — vid rykte under detta räknas
 * konkurrenten praktiskt taget som frånvarande. Motsvarar att en
 * verksamhet ingen känner till inte drar gäster ens från sitt eget
 * kvarter.
 */
const REPUTATION_EPS = 0.05;

/**
 * Formen: **ratio mot vägd fältgenomsnitt**, klippt mot bandet.
 *
 *   shareFactor = clamp(
 *     (playerRep + eps) / (weightedFieldRep + eps),
 *     FLOOR, CEIL
 *   )
 *
 * `weightedFieldRep` = sum(competitor.reputation × classSimilarity) /
 *                       sum(classSimilarity). En kvarterskrog i
 *                       spelaren mäts alltså tyngre mot en annan
 *                       kvarterskrog än mot ett gästgiveri.
 *
 * Vid tomt fält (inga konkurrenter) returneras SHARE_FACTOR_NEUTRAL —
 * ingen jämförelse går att göra, spelaren står ensam.
 *
 * Vid identiskt fält (alla NPC:er har samma rykte som spelaren)
 * returneras 1,0 — spelaren ligger i mitten och drar sin egen
 * andel av ankomstströmmen som förut.
 *
 * Vid extremer klipps mot FLOOR / CEIL. En återhämtning ur golvet
 * behöver bara komma över den nedre klipp-tröskeln för att
 * shareFactor ska börja stiga igen — spiralen är därför inte
 * asymptotisk.
 */
export function computeShareFactor(
  playerReputation: number,
  playerClass: BusinessClass,
  competitors: readonly Competitor[] = COMPETITORS
): number {
  if (competitors.length === 0) return SHARE_FACTOR_NEUTRAL;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of competitors) {
    const w = classSimilarity(playerClass, c.businessClass);
    weightedSum += c.reputation * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return SHARE_FACTOR_NEUTRAL;

  const weightedFieldRep = weightedSum / totalWeight;
  const ratio =
    (playerReputation + REPUTATION_EPS) /
    (weightedFieldRep + REPUTATION_EPS);

  return Math.max(
    SHARE_FACTOR_FLOOR,
    Math.min(SHARE_FACTOR_CEIL, ratio)
  );
}

/**
 * Diagnos-helpers för DevPanel: läs bandsträffar utan att räkna om
 * hela shareFactor i renderaren.
 */
export function shareFactorAtFloor(f: number): boolean {
  return f <= SHARE_FACTOR_FLOOR + 1e-6;
}
export function shareFactorAtCeiling(f: number): boolean {
  return f >= SHARE_FACTOR_CEIL - 1e-6;
}
