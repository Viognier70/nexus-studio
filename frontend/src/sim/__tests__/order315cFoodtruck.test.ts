// ORDER 315c (Anders 2026-10-07) — foodtruckens situationer ur de godkända frågorna, de ⚖-märkta
// dolda tills de är granskade, och vinbarens krav: minst FOODTRUCK.offerMinSituations klarade
// situationer (halvt grepp 0,5) och minst FOODTRUCK.offerMinEvenings kvällar i foodtrucken.

import { describe, expect, it } from 'vitest';
import { FOODTRUCK_ALL, incidentBankFor, legallyCleared, validateIncidentBank } from '../incidentBank';
import { FOODTRUCK, LADDER } from '../balance';
import { countTruckSituation, missingFor, offerAtClose, truckEvenings, truckSituations } from '../ladder';
import { startInFoodtruck } from '../../strategic/testHarness/weekHarness';
import meta from '../../content/incidents/foodtruck.meta.json';
import textSv from '../../content/incidents/foodtruck.text.sv.draft.json';
import textEn from '../../content/incidents/foodtruck.text.en.json';
import type { SimulationState } from '../../strategic/types';

describe('ORDER 315c — foodtruckens situationer', () => {
  it('sju situationer, tre steg vardera, ur Anders frågor; banken håller valideringen på båda språken', () => {
    expect(FOODTRUCK_ALL).toHaveLength(7);
    expect(validateIncidentBank(meta as never, textSv as never)).toEqual([]);
    expect(validateIncidentBank(meta as never, textEn as never)).toEqual([]);
    expect(FOODTRUCK_ALL.map((i) => i.questions)).toEqual([[7, 8, 16], [5, 13, 18], [1, 12, 19], [6, 10, 17], [4, 11, 15], [2, 9, 20], [3, 14, 21]]);
  });

  it('de med ⚖-frågor (3, 4, 9, 10, 15, 20) är dolda tills de är granskade; tre är spelbara', () => {
    const hidden = FOODTRUCK_ALL.filter((i) => !legallyCleared(i)).map((i) => i.id);
    expect(hidden).toEqual(['ft04-leveransen', 'ft05-allergin', 'ft06-stangningen', 'ft07-ursprunget']);
    expect(incidentBankFor('foodtruck').map((i) => i.id)).toEqual(['ft01-rusningen', 'ft02-drycken', 'ft03-rullen']);
    const legal = FOODTRUCK_ALL.flatMap((i) => i.legal?.questions ?? []).sort((a, b) => a - b);
    expect(legal).toEqual([3, 4, 9, 10, 15, 20]);
  });

  it('Anders ändringar: fråga 4 nämner korvens egna allergener, fråga 9 tiden, och den nya fråga 21', () => {
    const step = (id: string, i: number) => FOODTRUCK_ALL.find((x) => x.id === id)!.steps[i].text;
    expect(step('ft05-allergin', 0).options.c.explanation).toMatch(/korven själv kan innehålla allergener/);
    expect(step('ft06-stangningen', 1).options.b.label).toMatch(/inte längre än några timmar/);
    expect(step('ft07-ursprunget', 2).question).toBe('En gäst frågar om korven är svensk. Förpackningen säger "Tillverkad i Sverige". Vad svarar du?');
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
