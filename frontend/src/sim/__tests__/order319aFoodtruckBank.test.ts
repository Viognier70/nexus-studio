// ORDER 319a.3 (Anders 2026-10-07) — foodtruckens bank: ett ⚖-märke döljer aldrig frågor utan
// ⚖, alla 15 frågor utan ⚖ är med i spelet i formen episteme → phronesis → techne, och en ny
// leverans är bara filer (content/incidents/foodtruck/).

import { describe, expect, it } from 'vitest';
import { FOODTRUCK_ALL, FOODTRUCK_FILES, incidentBankFor, legallyCleared, mergeDeliveries, validateIncidentBank } from '../incidentBank';
import { INCIDENTS } from '../balance';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe('ORDER 319a.3 — ⚖ döljer aldrig frågor utan ⚖', () => {
  it('varje dold situation består bara av ⚖-frågor, och varje ⚖-fråga ligger i en dold situation', () => {
    for (const i of FOODTRUCK_ALL) {
      const legal = i.steps.map((s) => !!s.legal);
      if (!legallyCleared(i)) expect(legal.every(Boolean)).toBe(true);
      else expect(legal.some(Boolean)).toBe(false);
    }
  });

  it('alla 15 frågor utan ⚖ (1–21 utom 3, 4, 9, 10, 15, 20) är med i spelet', () => {
    const shown = incidentBankFor('foodtruck').flatMap((i) => i.steps.map((s) => s.question!)).sort((a, b) => a - b);
    // ORDER 320 — och de sex nya situationernas frågor 22–39 (leveransen situationer320).
    expect(shown.filter((q) => q <= 21)).toEqual([1, 2, 5, 6, 7, 8, 11, 12, 13, 14, 16, 17, 18, 19, 21]);
    expect(shown.filter((q) => q > 21)).toEqual(Array.from({ length: 18 }, (_, i) => 22 + i));
  });

  it('valideringen stoppar en situation som blandar ⚖ och frågor utan ⚖', () => {
    const meta = clone(FOODTRUCK_FILES.meta);
    const mixed = meta.incidents.find((i) => i.legal)!;
    delete mixed.steps[1].legal;
    expect(validateIncidentBank(meta, FOODTRUCK_FILES.sv)).toContain(`${mixed.id}: ⚖ döljer frågor utan ⚖`);
    const open = meta.incidents.find((i) => !i.legal)!;
    open.steps[0].legal = true;
    expect(validateIncidentBank(meta, FOODTRUCK_FILES.sv)).toContain(`${open.id}: ⚖-frågor utan granskningsstatus (legal)`);
  });
});

describe('ORDER 319a.3 — formen och leveranserna', () => {
  it('alla foodtruckens situationer går episteme → phronesis → techne', () => {
    for (const i of FOODTRUCK_ALL) {
      expect(i.form).toBe('triad');
      expect(i.steps.map((s) => s.axis)).toEqual([...INCIDENTS.stepAxesTriad]);
    }
  });

  it('en ny leverans läggs in som filer: banken samlar dem, och dubbla frågenummer stoppas', () => {
    const extra = clone(FOODTRUCK_FILES.meta.incidents[0]);
    extra.id = 'ft90-test';
    extra.steps.forEach((s, k) => { s.question = 90 + k; });
    const metas = {
      'foodtruck/bas.meta.json': { default: FOODTRUCK_FILES.meta },
      'foodtruck/x.meta.json': { default: { schemaVersion: 1, businessClass: 'foodtruck', delivery: 'x', incidents: [extra] } }
    };
    const texts = {
      'foodtruck/bas.text.sv.draft.json': { default: FOODTRUCK_FILES.sv },
      'foodtruck/x.text.sv.draft.json': { default: { language: 'sv', status: 'utkast', texts: { 'ft90-test': FOODTRUCK_FILES.sv.texts[FOODTRUCK_FILES.meta.incidents[0].id] } } }
    };
    const merged = mergeDeliveries(metas, texts, '.text.sv.draft.json');
    expect(merged.meta.incidents.map((i) => i.id)).toContain('ft90-test');
    expect(validateIncidentBank(merged.meta, merged.text)).toEqual([]);
    extra.steps[0].question = 7;
    expect(() => mergeDeliveries(metas, texts, '.text.sv.draft.json')).toThrow(/frågorna 7 finns i två situationer/);
  });
});
