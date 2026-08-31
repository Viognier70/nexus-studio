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
  evolveCompetitors,
  AI_COMPETITORS,
  SHARE_FACTOR_FLOOR,
  SHARE_FACTOR_CEIL,
  SHARE_FACTOR_NEUTRAL,
  MOTION_REP_FLOOR,
  MOTION_REP_CEIL,
  type Competitor
} from '../competitors';

describe('ORDER 166 §DoD 3 — spelarens rykte mot fältet styr shareFactor', () => {
  it('spelare i mitten av fältet (rykte = fältgenomsnitt) ger ~1,0', () => {
    // AI_COMPETITORS-fältets vägda genomsnitt beror på playerClass. För
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
    const flat: Competitor[] = AI_COMPETITORS.map((c) => ({
      ...c,
      reputation: 0.0
    }));
    const s = computeShareFactor(1.0, 'kvarterskrogen', flat);
    expect(s).toBe(SHARE_FACTOR_CEIL);
  });

  it('rykte 0,0 mot ett fält av 1-rep klipps mot FLOOR, inte 0 eller spiral', () => {
    const flat: Competitor[] = AI_COMPETITORS.map((c) => ({
      ...c,
      reputation: 1.0
    }));
    const s = computeShareFactor(0.0, 'kvarterskrogen', flat);
    expect(s).toBe(SHARE_FACTOR_FLOOR);
  });

  it('en dålig start har alltid väg tillbaka — återhämtning ur golvet är inte asymptotisk', () => {
    const flat: Competitor[] = AI_COMPETITORS.map((c) => ({
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
    // ORDER 167 lade till motion-fält på Competitor; testet behöver
    // stubb-värden men shareFactor bryr sig inte om dem.
    const stubMotion = { baseline: 0.5, adaptSensitivity: 0.5, learnRate: 0.05 };
    const blandat: Competitor[] = [
      // NPC-kvarterskrog med lågt rykte (vikt 1.0) — drar ner fältrep
      { id: 'k1', name: '-', businessClass: 'kvarterskrogen', reputation: 0.2, buildingId: '-', motion: stubMotion },
      // NPC-gästgiveri med högt rykte (vikt 0.5) — drar upp fältrep mindre
      { id: 'g1', name: '-', businessClass: 'gästgiveriet', reputation: 1.0, buildingId: '-', motion: stubMotion }
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
    const classes = new Set(AI_COMPETITORS.map((c) => c.businessClass));
    expect(classes.has('kvarterskrogen')).toBe(true);
    expect(classes.has('ölkrogen')).toBe(true);
    expect(classes.has('vinbaren')).toBe(true);
  });

  it('alla konkurrenter har giltig data (namn, klass, rykte 0..1, buildingId)', () => {
    for (const c of AI_COMPETITORS) {
      expect(c.id).toMatch(/^npc-/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.reputation).toBeGreaterThanOrEqual(0);
      expect(c.reputation).toBeLessThanOrEqual(1);
      expect(c.buildingId.length).toBeGreaterThan(0);
    }
  });
});

// ---------- ORDER 167 §2 — rörligt rykte ----------

describe('ORDER 167 §DoD 2 — trög och känslig konkurrent skiljer sig mätbart', () => {
  it('efter 20 dagar med rising player skiljer sig snabb från trög i rykte', () => {
    // Konstruera två konkurrenter identiska förutom motion:
    // en trög (learnRate 0.02, adaptSensitivity 0.20) och en känslig
    // (learnRate 0.12, adaptSensitivity 0.85). Båda startar vid rykte
    // 0.55. Spelaren höjs 0.02/dag från 0.40 till 0.80.
    const trög: Competitor = {
      id: 't', name: '-', businessClass: 'kvarterskrogen',
      reputation: 0.55, buildingId: '-',
      motion: { baseline: 0.55, adaptSensitivity: 0.20, learnRate: 0.02 }
    };
    const känslig: Competitor = {
      id: 'k', name: '-', businessClass: 'kvarterskrogen',
      reputation: 0.55, buildingId: '-',
      motion: { baseline: 0.55, adaptSensitivity: 0.85, learnRate: 0.12 }
    };
    let field: Competitor[] = [trög, känslig];
    for (let day = 0; day < 20; day++) {
      const playerRep = 0.40 + day * 0.02;
      field = evolveCompetitors(field, playerRep);
    }
    const [trögEfter, känsligEfter] = field;
    // Efter 20 dagar mot stigande spelare ska den känsliga ha rört sig
    // klart mer än den tröga. Den mätbara skillnaden ska vara minst
    // 0.05 rykte-enheter — annars är motion-parametrarnas skillnad
    // inte visuellt urskiljbar.
    expect(känsligEfter.reputation - trögEfter.reputation).toBeGreaterThan(0.05);
  });
});

describe('ORDER 167 §DoD 3 — konkurrenternas rykte håller sig i bandet', () => {
  it('en konkurrent med extrem adaptSensitivity når inte MOTION_REP_CEIL på 100 dagar mot playerRep=1.0', () => {
    // Testar att clamp:et håller: även den mest känsliga NPC:n mot
    // maximal spelare kommer inte förbi taket.
    const extremKänslig: Competitor = {
      id: 'e', name: '-', businessClass: 'kvarterskrogen',
      reputation: 0.70, buildingId: '-',
      motion: { baseline: 0.70, adaptSensitivity: 1.0, learnRate: 0.20 }
    };
    let field: Competitor[] = [extremKänslig];
    for (let day = 0; day < 100; day++) {
      field = evolveCompetitors(field, 1.0);
    }
    expect(field[0].reputation).toBeLessThanOrEqual(MOTION_REP_CEIL);
    // Ska också vara nära taket (annars gör motion inget vettigt vid
    // extrem indata) — inom 0.01 av CEIL.
    expect(MOTION_REP_CEIL - field[0].reputation).toBeLessThan(0.01);
  });

  it('en konkurrent med extrem drift mot noll klipps vid MOTION_REP_FLOOR', () => {
    // Extremfall: NPC med hög adaptSensitivity mot en spelare med
    // rykte 0.0. Målet blir baseline − adaptSensitivity × baseline
    // = baseline × (1 − adaptSensitivity). Med adaptSensitivity=1.0
    // blir målet 0 — clamp:et ska hålla emot.
    const drarNedåt: Competitor = {
      id: 'd', name: '-', businessClass: 'kvarterskrogen',
      reputation: 0.55, buildingId: '-',
      motion: { baseline: 0.55, adaptSensitivity: 1.0, learnRate: 0.20 }
    };
    let field: Competitor[] = [drarNedåt];
    for (let day = 0; day < 100; day++) {
      field = evolveCompetitors(field, 0.0);
    }
    expect(field[0].reputation).toBeGreaterThanOrEqual(MOTION_REP_FLOOR);
    // Nära golvet — inom 0.01.
    expect(field[0].reputation - MOTION_REP_FLOOR).toBeLessThan(0.01);
  });

  it('AI_COMPETITORS driver aldrig utanför bandet över 60 dagar mot en normal spelare-bana', () => {
    // Sanity-check på fältets faktiska motion-parametrar. Spelaren
    // startar 0.40, höjs 0.02/dag i 25 dagar till 0.90, sen håller
    // sig där. Ingen NPC ska hamna utanför bandet.
    let field: Competitor[] = AI_COMPETITORS.map((c) => ({ ...c }));
    for (let day = 0; day < 60; day++) {
      const playerRep = Math.min(0.90, 0.40 + day * 0.02);
      field = evolveCompetitors(field, playerRep);
      for (const c of field) {
        expect(c.reputation).toBeGreaterThanOrEqual(MOTION_REP_FLOOR);
        expect(c.reputation).toBeLessThanOrEqual(MOTION_REP_CEIL);
      }
    }
  });
});

describe('ORDER 167 §2.1 — motion är begriplig', () => {
  it('en NPC med adaptSensitivity=0 driver bara mot sin egen baseline (ignorerar spelaren)', () => {
    const ignorant: Competitor = {
      id: 'i', name: '-', businessClass: 'kvarterskrogen',
      reputation: 0.55, buildingId: '-',
      motion: { baseline: 0.60, adaptSensitivity: 0.0, learnRate: 0.10 }
    };
    let field: Competitor[] = [ignorant];
    for (let day = 0; day < 40; day++) {
      // Spelaren skenar; NPC:n bör inte bry sig — mål = baseline.
      field = evolveCompetitors(field, 1.0);
    }
    // Efter 40 dagar ska NPC:n vara nära sin baseline, inte spelarens
    // rykte. Inom 0.02 av baseline.
    expect(Math.abs(field[0].reputation - 0.60)).toBeLessThan(0.02);
  });

  it('en NPC med learnRate=0 rör sig aldrig (fryst rykte)', () => {
    const fryst: Competitor = {
      id: 'f', name: '-', businessClass: 'kvarterskrogen',
      reputation: 0.55, buildingId: '-',
      motion: { baseline: 0.90, adaptSensitivity: 1.0, learnRate: 0.0 }
    };
    let field: Competitor[] = [fryst];
    for (let day = 0; day < 30; day++) {
      field = evolveCompetitors(field, 0.9);
    }
    // learnRate=0 → ingen drift, oavsett mål eller spelare.
    expect(field[0].reputation).toBeCloseTo(0.55, 6);
  });

  it('AI_COMPETITORS har både en trög (learnRate ≤ 0,03) och en känslig (adaptSensitivity ≥ 0,80) — §2.3', () => {
    const trögaste = Math.min(...AI_COMPETITORS.map((c) => c.motion.learnRate));
    const känsligaste = Math.max(...AI_COMPETITORS.map((c) => c.motion.adaptSensitivity));
    expect(trögaste).toBeLessThanOrEqual(0.03);
    expect(känsligaste).toBeGreaterThanOrEqual(0.80);
  });
});
