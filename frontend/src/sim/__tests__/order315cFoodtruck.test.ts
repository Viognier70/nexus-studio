// ORDER 315c (Anders 2026-10-07) — foodtruckens situationer ur de godkända frågorna, de ⚖-märkta
// dolda tills de är granskade, och vinbarens krav: minst FOODTRUCK.offerMinSituations klarade
// situationer (halvt grepp 0,5) och minst FOODTRUCK.offerMinEvenings kvällar i foodtrucken.

import { describe, expect, it } from 'vitest';
import { FOODTRUCK_ALL, FOODTRUCK_FILES, incidentBankFor, legallyCleared, validateIncidentBank } from '../incidentBank';
import { FOODTRUCK, LADDER } from '../balance';
import { countTruckSituation, missingFor, offerAtClose, truckEvenings, truckSituations } from '../ladder';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import type { SimulationState } from '../../strategic/types';

describe('ORDER 315c — foodtruckens situationer', () => {
  // ORDER 319a.3 (Anders 2026-10-07) — omgrupperade: fem situationer utan ⚖ och två med bara ⚖.
  it('sju situationer, tre steg vardera, ur Anders frågor; banken håller valideringen på båda språken', () => {
    // ORDER 320 — leveransen bas; de sex nya står i situationer320 (order320Situationer.test.ts).
    const BAS = FOODTRUCK_ALL.filter((i) => Number(i.id.slice(2, 4)) <= 7);
    expect(BAS).toHaveLength(7);
    expect(validateIncidentBank(FOODTRUCK_FILES.meta, FOODTRUCK_FILES.sv)).toEqual([]);
    expect(validateIncidentBank(FOODTRUCK_FILES.meta, FOODTRUCK_FILES.en)).toEqual([]);
    expect(BAS.map((i) => i.steps.map((s) => s.question))).toEqual([[7, 16, 8], [5, 18, 13], [1, 19, 12], [6, 17, 14], [2, 21, 11], [4, 15, 10], [3, 20, 9]]);
  });

  it('de med ⚖-frågor (3, 4, 9, 10, 15, 20) är dolda tills de är granskade; fem är spelbara', () => {
    const hidden = FOODTRUCK_ALL.filter((i) => !legallyCleared(i)).map((i) => i.id);
    expect(hidden).toEqual(['ft05-allergin', 'ft06-stangningen']);
    expect(incidentBankFor('foodtruck').map((i) => i.id).filter((id) => Number(id.slice(2, 4)) <= 7)).toEqual(['ft01-rusningen', 'ft02-drycken', 'ft03-rullen', 'ft04-leveransen', 'ft07-ursprunget']);
    const legal = FOODTRUCK_ALL.flatMap((i) => i.steps.filter((s) => s.legal).map((s) => s.question!)).sort((a, b) => a - b);
    expect(legal).toEqual([3, 4, 9, 10, 15, 20]);
  });

  it('Anders ändringar: fråga 4 nämner korvens egna allergener, fråga 9 tiden, och den nya fråga 21', () => {
    const step = (id: string, i: number) => FOODTRUCK_ALL.find((x) => x.id === id)!.steps[i].text;
    expect(step('ft05-allergin', 0).options.c.explanation).toMatch(/korven själv kan innehålla allergener/);
    expect(step('ft06-stangningen', 2).options.b.label).toMatch(/inte längre än några timmar/);
    expect(step('ft07-ursprunget', 1).question).toBe('En gäst frågar om korven är svensk. Förpackningen säger "Tillverkad i Sverige". Vad svarar du?');
  });
});

describe('ORDER 315c — vinbarens krav i foodtrucken', () => {
  const ready = (s: SimulationState): SimulationState => ({ ...s, cash: LADDER.requirements.vinbar.cashSek, reputation: LADDER.requirements.vinbar.reputationAtLeast, medals: { stensota: 'brons' } });

  it('utan klarade situationer och kvällar kommer inget erbjudande', () => {
    const s = ready(startInFoodtruck(4));
    expect(missingFor(s, 'vinbar')).toEqual(['situations', 'evenings']);
  });

  it('halvt grepp räknas som 0,5; personalens klarade situationer räknas inte', () => {
    const s = startInFoodtruck(4);
    countTruckSituation(s, true, false);
    countTruckSituation(s, true, true);
    countTruckSituation(s, false, false);
    expect(truckSituations(s)).toBe(1 + FOODTRUCK.halfGripCounts);
  });

  it('golvet i tid: kvällarna räknas vid stängningen, och erbjudandet kommer efter offerMinEvenings', () => {
    let s = ready(startInFoodtruck(4));
    s = { ...s, ladder: { ...s.ladder!, truckSituations: FOODTRUCK.offerMinSituations } };
    for (let i = 1; i < FOODTRUCK.offerMinEvenings; i++) {
      expect(offerAtClose(s)).toBe(false);
      expect(truckEvenings(s)).toBe(i);
    }
    expect(offerAtClose(s)).toBe(true);
    expect(s.ladder!.offer!.to).toBe('vinbar');
  });
});
