// ORDER 117 §3.1 DoD 6.1 — kölängden varierar med värdekvoten, men
// FÖRDRÖJT: högre pris idag ger färre ankomster NÄSTA service, inte
// samma. VO-beslut 2026-08-18: ned 2 dagar (4 services), upp 3 dagar
// (6 services). Rykte tappas snabbare än det byggs.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import { capacityForBusiness } from '../../business/businessClass';
import {
  updateEffectiveValueQuota,
  valueQuota,
  valueQuotaArrivalMultiplier,
  reputationTrend
} from '../valueQuota';
import type { SimulationState } from '../../types';

function foodtruckWithPolicies(overrides: Partial<SimulationState['policies']>): SimulationState {
  const s = makeInitialState();
  return {
    ...s,
    businessClass: 'foodtrucken',
    policies: {
      ...s.policies,
      capacity: capacityForBusiness('foodtrucken', s.policies.staffCount),
      ...overrides
    },
    cash: 240_000
  };
}

// -----------------------------------------------------------------------------
// Asymmetrisk låg-pass — down snabbare än up
// -----------------------------------------------------------------------------

describe('ORDER 117 §3.1 — effektiv V uppdateras asymmetriskt vid service-close', () => {
  it('nystart: effektiv V = 1.0', () => {
    const s = foodtruckWithPolicies({});
    expect(s.effectiveValueQuota).toBe(1.0);
  });

  it('DOWN steg (dåligt värde): effektiv rör sig ~1/4 av gapet per close', () => {
    const s = foodtruckWithPolicies({
      ingredientTier: 'grund', pricing: 'hög', localSourcing: false
    });
    // Aktuell V = 1.0 / 1.3 = 0.77.
    // Effektiv start = 1.0. Gap = 0.77 - 1.0 = -0.23.
    // Efter 1 close: 1.0 + (-0.23)/4 = 1.0 - 0.0575 = 0.9425
    const draft = { ...s };
    updateEffectiveValueQuota(draft);
    expect(draft.effectiveValueQuota).toBeCloseTo(1.0 + (valueQuota(s) - 1.0) / 4, 3);
  });

  it('UP steg (bra värde): effektiv rör sig ~1/6 av gapet per close (LÅNGSAMMARE)', () => {
    const s = foodtruckWithPolicies({
      ingredientTier: 'premium', pricing: 'medel', localSourcing: true
    });
    // Aktuell V = 1.65 / 1.0 = 1.65.
    // Gap = 1.65 - 1.0 = 0.65.
    // Efter 1 close: 1.0 + 0.65/6 = 1.108
    const draft = { ...s };
    updateEffectiveValueQuota(draft);
    expect(draft.effectiveValueQuota).toBeCloseTo(1.0 + (valueQuota(s) - 1.0) / 6, 3);
  });

  it('down snabbare än up: samma absoluta gap tar färre closes ner än upp', () => {
    // Gap ner: -0.23 (grund + hög + noEco → V = 0.77)
    // Med DOWN_STEP=1/4: 4 closes → nästan hela vägen ner
    // Med UP_STEP=1/6: skulle ta 6 closes samma sträcka
    let sDown = foodtruckWithPolicies({
      ingredientTier: 'grund', pricing: 'hög', localSourcing: false
    });
    let sUp = foodtruckWithPolicies({
      ingredientTier: 'premium', pricing: 'medel', localSourcing: true
    });
    // Justera så absoluta gap är samma (använd olika target-V).
    // Enklaste: kolla att efter samma antal closes rör sig ner-fallet
    // längre än up-fallet i procent av gapet.
    const targetDown = valueQuota(sDown);
    const targetUp = valueQuota(sUp);
    for (let i = 0; i < 3; i++) {
      updateEffectiveValueQuota(sDown);
      updateEffectiveValueQuota(sUp);
    }
    const progressDown = Math.abs(sDown.effectiveValueQuota - 1.0) / Math.abs(targetDown - 1.0);
    const progressUp = Math.abs(sUp.effectiveValueQuota - 1.0) / Math.abs(targetUp - 1.0);
    expect(progressDown).toBeGreaterThan(progressUp);
  });
});

// -----------------------------------------------------------------------------
// Ankomst-multiplikator följer effektiv V
// -----------------------------------------------------------------------------

describe('ORDER 117 §3.1 — valueQuotaArrivalMultiplier läser effektiv V', () => {
  it('effektiv V = 1.0 → multiplikator 1.0 (neutral)', () => {
    const s = foodtruckWithPolicies({});
    expect(valueQuotaArrivalMultiplier(s)).toBeCloseTo(1.0, 3);
  });

  it('effektiv V < 1 → multiplikator < 1 (färre ankomster)', () => {
    const s = { ...foodtruckWithPolicies({}), effectiveValueQuota: 0.5 };
    expect(valueQuotaArrivalMultiplier(s)).toBeLessThan(1.0);
  });

  it('effektiv V > 1 → multiplikator > 1 (fler ankomster)', () => {
    const s = { ...foodtruckWithPolicies({}), effectiveValueQuota: 1.5 };
    expect(valueQuotaArrivalMultiplier(s)).toBeGreaterThan(1.0);
  });

  it('extremer klämpta till [0.7, 1.3]', () => {
    const sLow = { ...foodtruckWithPolicies({}), effectiveValueQuota: 0 };
    const sHigh = { ...foodtruckWithPolicies({}), effectiveValueQuota: 2 };
    expect(valueQuotaArrivalMultiplier(sLow)).toBeGreaterThanOrEqual(0.7);
    expect(valueQuotaArrivalMultiplier(sHigh)).toBeLessThanOrEqual(1.3);
  });
});

// -----------------------------------------------------------------------------
// DoD 6.1 — höjt pris idag ger färre ankomster NÄSTA service, inte samma
// -----------------------------------------------------------------------------

describe('ORDER 117 §3.1 DoD 6.1 — fördröjd effekt: nästa service, inte samma', () => {
  it('inom SAMMA service: prishöjning påverkar INTE effectiveValueQuota', () => {
    // Öppna lunch med bra kvot. Ändra sedan pricing till hög MIDSERVICE.
    // Assertera att effectiveValueQuota inte hunnit reagera — den
    // uppdateras bara vid service-close.
    let s = foodtruckWithPolicies({
      ingredientTier: 'utvald', pricing: 'medel', localSourcing: true
    });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    s = { ...s, day: { ...s.day, scenarioTriggerTimes: [], scenariosPlanned: 0 } };
    const effBefore = s.effectiveValueQuota;
    // Kör 100 tick med bra kvot i drift.
    for (let i = 0; i < 100; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
    }
    // Ändra pricing MIDSERVICE (inte via UI-action, direkt spread).
    s = { ...s, policies: { ...s.policies, pricing: 'hög' } };
    // Kör 100 tick till.
    for (let i = 0; i < 100; i++) {
      s = reducer(s, { type: 'TICK', dt: 0.2 });
    }
    // Effektiv V ska INTE ha uppdaterats under service — den är kvar
    // vid startvärdet.
    expect(s.effectiveValueQuota).toBe(effBefore);
  });

  it('efter service-close: effectiveValueQuota har uppdaterats mot momentan V', () => {
    let s = foodtruckWithPolicies({
      ingredientTier: 'utvald', pricing: 'medel', localSourcing: true
    });
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    s = { ...s, day: { ...s.day, scenarioTriggerTimes: [], scenariosPlanned: 0 } };
    const effBefore = s.effectiveValueQuota;
    // Snabbspola till lunch-close.
    s = { ...s, simTime: s.day.periodStartAt + 1800 };
    // Läs V EFTER simTime-hoppet men FÖRE close-tick — det är vad
    // updateEffectiveValueQuota kommer att läsa (den kallas efter
    // close-transitionen som spread:ar day-state).
    const vAtClose = valueQuota(s);
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('afternoon');
    // Effektiv ska nu ha rört sig mot momentan V (upp-riktning, 1/6 steg).
    expect(s.effectiveValueQuota).not.toBe(effBefore);
    expect(s.effectiveValueQuota).toBeGreaterThan(effBefore);
    // Konkret steg: effBefore + (V - effBefore)/6. Använd 2 decimalers
    // precision eftersom V kan glida marginellt över TICK-loopens
    // interna prep-uppdateringar.
    const expected = effBefore + (vAtClose - effBefore) / 6;
    expect(Math.abs(s.effectiveValueQuota - expected)).toBeLessThan(0.02);
  });

  it('EFTER close: nästa service har annan ankomst-multiplikator än denna hade', () => {
    let s = foodtruckWithPolicies({
      ingredientTier: 'utvald', pricing: 'medel', localSourcing: true
    });
    const multBefore = valueQuotaArrivalMultiplier(s);
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 30 });
    s = { ...s, day: { ...s.day, scenarioTriggerTimes: [], scenariosPlanned: 0 } };
    s = { ...s, simTime: s.day.periodStartAt + 1800 };
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    const multAfter = valueQuotaArrivalMultiplier(s);
    // Multiplikatorn har rört sig upp för bra värdekvot (delayed).
    expect(multAfter).toBeGreaterThan(multBefore);
  });
});

// -----------------------------------------------------------------------------
// §5.2 rykte-trend-indikator
// -----------------------------------------------------------------------------

describe('ORDER 117 §5.2 — reputationTrend läser effektiv V', () => {
  it('effektiv V > 1.10 → "up"', () => {
    const s = { ...foodtruckWithPolicies({}), effectiveValueQuota: 1.2 };
    expect(reputationTrend(s)).toBe('up');
  });

  it('effektiv V < 0.90 → "down"', () => {
    const s = { ...foodtruckWithPolicies({}), effectiveValueQuota: 0.7 };
    expect(reputationTrend(s)).toBe('down');
  });

  it('effektiv V mellan 0.90-1.10 → "flat" (inget larm på små rörelser)', () => {
    const s1 = { ...foodtruckWithPolicies({}), effectiveValueQuota: 1.0 };
    const s2 = { ...foodtruckWithPolicies({}), effectiveValueQuota: 1.05 };
    const s3 = { ...foodtruckWithPolicies({}), effectiveValueQuota: 0.95 };
    expect(reputationTrend(s1)).toBe('flat');
    expect(reputationTrend(s2)).toBe('flat');
    expect(reputationTrend(s3)).toBe('flat');
  });
});
