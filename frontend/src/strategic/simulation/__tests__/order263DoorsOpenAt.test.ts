// ORDER 263 (Nexus v1 etapp 1) — ORDER 171:s fel var kvar på main.
//
// Dörrarnas öppningstid räknades på tre ställen i openService: fältet
// tog hänsyn till mise en place, men scenarioschemat och morgonbeslutens
// utfall lade alltid till PREP_DURATION_SEC. För food trucken hamnade de
// därför 120 s efter att dörrarna öppnat. Testet hävdar att alla tre
// utgår från samma ögonblick, `day.doorsOpenAt`.

import { describe, expect, it } from 'vitest';
import { reducer, OPENING_DURATION_SEC } from '../reducer';
import { makeInitialState } from '../model';
import { PREP_DURATION_SEC } from '../constants';
import type { SimulationState } from '../../types';

function openDinnerFor(businessClass: SimulationState['businessClass']): SimulationState {
  let s = makeInitialState();
  s = {
    ...s,
    businessClass,
    day: { ...s.day, period: 'afternoon', morningPolicyChanges: ['Kortare meny i kväll'] }
  };
  return reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 15 });
}

describe('ORDER 263 — doorsOpenAt räknas en gång', () => {
  it('food trucken: dörrarna öppnar efter opening, utan prep', () => {
    const before = makeInitialState().simTime;
    const s = openDinnerFor('foodtrucken');
    expect(s.day.doorsOpenAt).toBe(before + OPENING_DURATION_SEC);
  });

  it('food trucken: scenarioschemat börjar inte före dörrarna och inte 120 s efter', () => {
    const s = openDinnerFor('foodtrucken');
    const doors = s.day.doorsOpenAt!;
    const policy = s.pendingOutcomes.find((o) => o.scenarioId === 'morning-policy');
    expect(policy?.dueAt).toBe(doors + 4);
    for (const t of s.day.scenarioTriggerTimes) expect(t).toBeGreaterThanOrEqual(doors);
  });

  it('klass med mise en place: dörrarna öppnar efter opening + prep', () => {
    const before = makeInitialState().simTime;
    const s = openDinnerFor('kvarterskrogen');
    expect(s.day.doorsOpenAt).toBe(before + OPENING_DURATION_SEC + PREP_DURATION_SEC);
    const policy = s.pendingOutcomes.find((o) => o.scenarioId === 'morning-policy');
    expect(policy?.dueAt).toBe(s.day.doorsOpenAt! + 4);
  });
});
