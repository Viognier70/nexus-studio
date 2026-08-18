// ORDER 117 §5.1 DoD 8 — strömmen nämner sambandet mellan pris/råvara
// och gästbeteendet. Grep-verifiering i meningsbankerna + end-to-end-
// bevis att postValueQuotaLine faktiskt skjuter en mening i strömmen
// när kvoten är extrem.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import { capacityForBusiness } from '../../business/businessClass';
import { VALUE_HIGH_TEXTS, VALUE_LOW_TEXTS } from '../../../content/eventStream.sv';
import type { SimulationState } from '../../types';

function foodtruckWithPolicies(overrides: Partial<SimulationState['policies']>): SimulationState {
  const s = makeInitialState();
  return {
    ...s,
    businessClass: 'foodtruck',
    policies: {
      ...s.policies,
      capacity: capacityForBusiness('foodtruck', s.policies.staffCount),
      ...overrides
    },
    cash: 240_000
  };
}

// -----------------------------------------------------------------------------
// DoD 8 — grep i meningsbankerna
// -----------------------------------------------------------------------------

describe('ORDER 117 §5.1 DoD 8 — strömmen bär sambandet', () => {
  it('VALUE_LOW_TEXTS finns med minst 5 meningar', () => {
    expect(VALUE_LOW_TEXTS.length).toBeGreaterThanOrEqual(5);
  });

  it('VALUE_HIGH_TEXTS finns med minst 5 meningar', () => {
    expect(VALUE_HIGH_TEXTS.length).toBeGreaterThanOrEqual(5);
  });

  it('minst en LOW-mening nämner "priset" som konkret orsak', () => {
    const hits = VALUE_LOW_TEXTS.filter((t) => t.toLowerCase().includes('pris'));
    expect(hits.length, `ingen LOW-mening nämner priset — bank: ${VALUE_LOW_TEXTS.join(' | ')}`)
      .toBeGreaterThan(0);
  });

  it('minst en LOW-mening nämner en råvara ("lamm" per orderns exempel eller motsvarande)', () => {
    const foodWords = ['lamm', 'grädde', 'råvara', 'lax', 'menyn'];
    const hits = VALUE_LOW_TEXTS.filter((t) =>
      foodWords.some((w) => t.toLowerCase().includes(w))
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it('minst en HIGH-mening nämner leverantör eller ursprung', () => {
    const sourceWords = ['leverantör', 'lokalt', 'gården', 'ekologiskt'];
    const hits = VALUE_HIGH_TEXTS.filter((t) =>
      sourceWords.some((w) => t.toLowerCase().includes(w))
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  // Grep-verifiering på filnivå så en framtida commit som råkar
  // rename:a nyckeln fångas.
  it('eventStream.sv.ts fil-grep: VALUE_LOW_TEXTS + VALUE_HIGH_TEXTS existerar', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      resolve(here, '..', '..', '..', 'content', 'eventStream.sv.ts'),
      'utf8'
    );
    expect(src).toContain('VALUE_LOW_TEXTS');
    expect(src).toContain('VALUE_HIGH_TEXTS');
    // Motiveringsblocket ska referera till §5.1 så det inte tyst
    // tas bort.
    expect(src).toContain('§5.1');
  });
});

// -----------------------------------------------------------------------------
// End-to-end: postValueQuotaLine skjuter mening vid service-close
// -----------------------------------------------------------------------------

describe('ORDER 117 §5.1 — postValueQuotaLine emitterar vid service-close', () => {
  it('låg kvot (grund + hög, ingen eco) → LOW-mening i strömmen efter lunch-close', () => {
    let s = foodtruckWithPolicies({
      ingredientTier: 'grund',
      pricing: 'hög',
      localSourcing: false
    });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    // Rensa scenario-schema så tickDayTransitions kör (jfr ORDER 116-testerna).
    s = { ...s, day: { ...s.day, scenarioTriggerTimes: [], scenariosPlanned: 0 } };
    // Fast-forward till lunch endsAt och tick.
    s = { ...s, simTime: s.day.periodStartAt + 1800 };
    const streamBefore = s.eventStream.length;
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('afternoon');
    expect(s.eventStream.length).toBeGreaterThan(streamBefore);
    const newEntries = s.eventStream.slice(streamBefore);
    const valueLowEntry = newEntries.find((e) => e.kind === 'value_low');
    expect(valueLowEntry, `hittade inga value_low-events; nya kinds: ${newEntries.map((e) => e.kind).join(',')}`)
      .toBeDefined();
  });

  it('hög kvot (premium + låg + eco) → HIGH-mening i strömmen efter lunch-close', () => {
    let s = foodtruckWithPolicies({
      ingredientTier: 'premium',
      pricing: 'låg',
      localSourcing: true
    });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    s = { ...s, day: { ...s.day, scenarioTriggerTimes: [], scenariosPlanned: 0 } };
    s = { ...s, simTime: s.day.periodStartAt + 1800 };
    const streamBefore = s.eventStream.length;
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('afternoon');
    const newEntries = s.eventStream.slice(streamBefore);
    const valueHighEntry = newEntries.find((e) => e.kind === 'value_high');
    expect(valueHighEntry).toBeDefined();
  });

  it('neutral kvot (grund + medel + eco = 1.15) → INGEN value-mening emitteras', () => {
    let s = foodtruckWithPolicies({
      ingredientTier: 'grund',
      pricing: 'medel',
      localSourcing: true
    });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    s = { ...s, day: { ...s.day, scenarioTriggerTimes: [], scenariosPlanned: 0 } };
    s = { ...s, simTime: s.day.periodStartAt + 1800 };
    const streamBefore = s.eventStream.length;
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    const newEntries = s.eventStream.slice(streamBefore);
    const anyValue = newEntries.find((e) => e.kind === 'value_low' || e.kind === 'value_high');
    expect(anyValue, `värdemening emitterades vid neutralt kvot: ${anyValue?.text}`)
      .toBeUndefined();
  });
});
