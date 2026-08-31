// ORDER 166 §DoD 3-5 — konkurrenter + shareFactor.
//
// Tre påståenden:
//   §DoD 3: spelare bättre än fältet ger fler ankomster (shareFactor > 1);
//           sämre ger färre (shareFactor < 1).
//   §DoD 4: bandet håller i båda ändar — extremt rykte ger inte
//           obegränsad effekt.
//   §DoD 5: klassnärhet mätbar — samma klass påverkar mer än olik.
//
// Alla tal här är författade indata till pure functions. Verifieringen
// av att spelaren KÄNNER konkurrensen (playtest-drift, §DoD 6-7) sker
// via `scripts/order166-share-factor.mjs` som skriver JSON per ORDER 160.

import { describe, expect, it } from 'vitest';
import {
  computeShareFactor,
  classSimilarity,
  COMPETITORS,
  SHARE_FACTOR_FLOOR,
  SHARE_FACTOR_CEIL,
  SHARE_FACTOR_NEUTRAL,
  type Competitor
} from '../competitors';

describe('ORDER 166 §DoD 3 — spelarens rykte mot fältet styr shareFactor', () => {
  it('spelare i mitten av fältet (rykte = fältgenomsnitt) ger ~1,0', () => {
    // COMPETITORS-fältets vägda genomsnitt beror på playerClass. För
    // kvarterskrogen med default-vikter blir det ca 0,58 (två
    // kvarterskrogar-vikt 1.0 rep 0,55 + 0,70; en ölkrog-vikt 0,6
    // rep 0,50; en vinbar-vikt 0,4 rep 0,65). Spelare med rykte 0,58
    // ligger då nära neutral.
    const s = computeShareFactor(0.58, 'kvarterskrogen');
    expect(s).toBeGreaterThan(0.9);
    expect(s).toBeLessThan(1.1);
  });

  it('spelare klart över fältet ger shareFactor > 1', () => {
    const s = computeShareFactor(0.9, 'kvarterskrogen');
    expect(s).toBeGreaterThan(SHARE_FACTOR_NEUTRAL);
  });

  it('spelare klart under fältet ger shareFactor < 1', () => {
    const s = computeShareFactor(0.2, 'kvarterskrogen');
    expect(s).toBeLessThan(SHARE_FACTOR_NEUTRAL);
  });
});

describe('ORDER 166 §DoD 4 — bandet håller i båda ändar', () => {
  it('rykte 1,0 mot ett fält av 0-rep klipps mot CEIL, inte obegränsat', () => {
    const flat: Competitor[] = COMPETITORS.map((c) => ({
      ...c,
      reputation: 0.0
    }));
    const s = computeShareFactor(1.0, 'kvarterskrogen', flat);
    expect(s).toBe(SHARE_FACTOR_CEIL);
  });

  it('rykte 0,0 mot ett fält av 1-rep klipps mot FLOOR, inte 0 eller spiral', () => {
    const flat: Competitor[] = COMPETITORS.map((c) => ({
      ...c,
      reputation: 1.0
    }));
    const s = computeShareFactor(0.0, 'kvarterskrogen', flat);
    expect(s).toBe(SHARE_FACTOR_FLOOR);
  });

  it('en dålig start har alltid väg tillbaka — återhämtning ur golvet är inte asymptotisk', () => {
    const flat: Competitor[] = COMPETITORS.map((c) => ({
      ...c,
      reputation: 1.0
    }));
    const atFloor = computeShareFactor(0.0, 'kvarterskrogen', flat);
    // Vid rykte 0,0 mot fält-rykte 1,0 är ratio (0+eps)/(1+eps) ≈ 0,048 —
    // klart under FLOOR (0,55), klipps. Vid rykte 0,7 blir ratio
    // (0,7+eps)/(1+eps) ≈ 0,714 — över FLOOR, ingen clamp. Skillnaden
    // mellan `atFloor` (klippt) och `atRecovered` (fri) bevisar att golvet
    // inte fångar spelaren: spelaren kan tjäna sig tillbaka.
    const atRecovered = computeShareFactor(0.7, 'kvarterskrogen', flat);
    expect(atRecovered).toBeGreaterThan(atFloor);
    expect(atRecovered).toBeGreaterThan(SHARE_FACTOR_FLOOR);
  });

  it('tomt fält (inga konkurrenter) returnerar neutralvärdet', () => {
    const s = computeShareFactor(0.5, 'kvarterskrogen', []);
    expect(s).toBe(SHARE_FACTOR_NEUTRAL);
  });
});

describe('ORDER 166 §DoD 5 — klassnärhet är mätbar', () => {
  it('samma klass har vikt 1,0 mot sig själv', () => {
    expect(classSimilarity('kvarterskrogen', 'kvarterskrogen')).toBe(1.0);
    expect(classSimilarity('ölkrogen', 'ölkrogen')).toBe(1.0);
    expect(classSimilarity('vinbaren', 'vinbaren')).toBe(1.0);
  });

  it('olika klasser har vikt < 1,0', () => {
    expect(classSimilarity('kvarterskrogen', 'gästgiveriet')).toBeLessThan(1.0);
    expect(classSimilarity('vinbaren', 'foodtrucken')).toBeLessThan(1.0);
  });

  it('samma klass påverkar mer än olik klass — konstruerar blandat fält och jämför', () => {
    // Ett homogent fält (alla samma klass, alla samma rykte) räcker
    // INTE för att bevisa klassnärhetens effekt: både täljare och
    // nämnare blir samma tal oavsett spelarens klass, kvoten blir
    // identisk. Vikterna dividerar bort sig när ryktesnivån är
    // konstant över hela fältet.
    //
    // Rätt test: blanda klasser MED olika rykten så vikterna slår
    // igenom i weightedFieldRep. Spelaren mäter samma fält från två
    // olika klasspositioner och shareFactor ska skilja sig.
    const spelareRykte = 0.7;
    // Ett gästgiveri (vikt 0,5) med rykte 0,2 vs ett kvarterskrog (vikt 1,0)
    // med rykte 0,2 — vägningen räknar kvarterskrogen dubbelt så tungt,
    // så fältets weightedFieldRep = 0,2 i båda fall. Kvoten identisk.
    // Skillnaden syns när ryktesnivåerna SPRIDS mellan klasserna:
    const blandat: Competitor[] = [
      // NPC-kvarterskrog med lågt rykte (vikt 1.0) — drar ner fältrep
      { id: 'k1', name: '-', businessClass: 'kvarterskrogen', reputation: 0.2, buildingId: '-' },
      // NPC-gästgiveri med högt rykte (vikt 0.5) — drar upp fältrep mindre
      { id: 'g1', name: '-', businessClass: 'gästgiveriet', reputation: 1.0, buildingId: '-' }
    ];
    // weightedFieldRep = (0.2×1.0 + 1.0×0.5)/(1.0 + 0.5) = 0.7/1.5 = 0.467
    // Om vi flippar vikterna (som om spelaren vore gästgivare):
    const somGästgivare = computeShareFactor(spelareRykte, 'gästgiveriet', blandat);
    // För gästgivare: kvarterskrog-vikt 0.5, gästgiveri-vikt 1.0
    // weightedFieldRep = (0.2×0.5 + 1.0×1.0)/(0.5 + 1.0) = 1.1/1.5 = 0.733
    const somKvarterskrog = computeShareFactor(spelareRykte, 'kvarterskrogen', blandat);
    // Kvarterskrogen ser LÄGRE field-rep (0.467) → HÖGRE shareFactor
    // Gästgivaren ser HÖGRE field-rep (0.733) → LÄGRE shareFactor
    // Beviset på att klassnärheten SPELAR ROLL:
    expect(somKvarterskrog).toBeGreaterThan(somGästgivare);
  });
});

describe('ORDER 166 §2.1 — konkurrent-data', () => {
  it('varje monterad klass har minst en konkurrent i fältet', () => {
    const classes = new Set(COMPETITORS.map((c) => c.businessClass));
    expect(classes.has('kvarterskrogen')).toBe(true);
    expect(classes.has('ölkrogen')).toBe(true);
    expect(classes.has('vinbaren')).toBe(true);
  });

  it('alla konkurrenter har giltig data (namn, klass, rykte 0..1, buildingId)', () => {
    for (const c of COMPETITORS) {
      expect(c.id).toMatch(/^npc-/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.reputation).toBeGreaterThanOrEqual(0);
      expect(c.reputation).toBeLessThanOrEqual(1);
      expect(c.buildingId.length).toBeGreaterThan(0);
    }
  });
});
