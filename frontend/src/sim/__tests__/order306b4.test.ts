// ORDER 306b.4 (Anders 2026-10-09):
// 1. "Regeln gäller kunskapsformen, inte stegets nummer: phronesis-steget (upplevelsen) tar aldrig kassa eller ork,
//    i någon situation och i någon form. I den gamla formen får handlingen (techne) kosta som förut. Flytta kassa och
//    ork från phronesis-steget till techne-steget där det behövs, och utöka testet."
// 2. "Jämna ut så att det längsta svaret är fel ungefär så ofta som slumpen ger (inom ±0,1)."
// 3. "Jämna också ut längden i foodtruckens steg 1–2 och i de nyfikna gästernas frågor."
//
// 1: phronesis-stegets följd (stegets och varje svars egen) har ingen negativ kassa, ingen ork och ingen kostnad.
//    En kassa uppåt (vb08 a: sällskapet får bordet; vb10 b: gästen får ett glas till) tar ingenting och står kvar.
// 2–3: måttet i strategic/testHarness/longestAnswer.ts, i ord och tecken, på svenska och engelska.

import { describe, expect, it } from 'vitest';
import vinbarMeta from '../../content/incidents/vinbar.meta.json';
import menuMeta from '../../content/incidents/menu.meta.json';
import crisesMeta from '../../content/incidents/crises.meta.json';
import ftBasMeta from '../../content/incidents/foodtruck/bas.meta.json';
import ft320Meta from '../../content/incidents/foodtruck/situationer320.meta.json';
import { LENGTH_PARTS, longestWrong } from '../../strategic/testHarness/longestAnswer';

type Effects = { cash?: number; stamina?: number };
type Option = { id: string; quality: string; cost?: number; fail?: { effects: Effects } };
type Meta = { incidents: { id: string; form?: string; steps: { axis: string; fail: { effects: Effects }; options: Option[] }[] }[] };

const LONGEST_WRONG_TOLERANCE = 0.1;
const BANKS: [string, unknown][] = [['vinbar', vinbarMeta], ['menu', menuMeta], ['crises', crisesMeta], ['foodtruck/bas', ftBasMeta], ['foodtruck/situationer320', ft320Meta]];

describe('ORDER 306b.4 — phronesis-steget tar varken kassa eller ork', () => {
  const all = BANKS.flatMap(([bank, m]) => (m as Meta).incidents.map((inc) => ({ bank, inc })));

  it('i varje situation och form, i alla banker', () => {
    let checked = 0;
    for (const { bank, inc } of all) {
      const p = inc.steps.find((s) => s.axis === 'phronesis');
      if (!p) continue;
      checked++;
      for (const [who, e] of [['steget', p.fail.effects], ...p.options.flatMap((o) => (o.fail ? [[o.id, o.fail.effects] as const] : []))] as const) {
        expect([bank, inc.id, who, Math.min(0, e.cash ?? 0), e.stamina ?? 0]).toEqual([bank, inc.id, who, 0, 0]);
      }
      for (const o of p.options) expect([inc.id, o.id, o.cost ?? 0]).toEqual([inc.id, o.id, 0]);
    }
    // Vinbarens 40 (11 i den nya formen, 29 i den gamla) med de fyra varianterna av vb35, menyns 9, kriserna 9, foodtruckens 13.
    expect(checked).toBeGreaterThanOrEqual(40 + 9 + 9 + 13);
  });

  it('i den gamla formen bär techne-steget följden (vb25 efter stängning: flaskan och timmen extra)', () => {
    const vb25 = (vinbarMeta as unknown as Meta).incidents.find((i) => i.id === 'vb25-efter-stangning')!;
    const techne = vb25.steps.find((s) => s.axis === 'techne')!;
    expect(vb25.steps.map((s) => s.axis)).toEqual(['episteme', 'techne', 'phronesis']);
    expect(techne.fail.effects.cash).toBeLessThan(0);
    expect(techne.fail.effects.stamina).toBeLessThan(0);
  });
});

describe('ORDER 306b.4 — det längsta svaret är fel ungefär så ofta som slumpen ger', () => {
  for (const part of LENGTH_PARTS.filter((p) => p.checked)) {
    for (const lang of ['sv', 'en'] as const) for (const unit of ['words', 'chars'] as const) {
      it(`${part.name} (${lang}, ${unit === 'words' ? 'ord' : 'tecken'})`, () => {
        const r = longestWrong(part.steps(), lang, unit);
        expect(r.steps).toBeGreaterThan(0);
        expect(Math.abs(r.diff)).toBeLessThanOrEqual(LONGEST_WRONG_TOLERANCE);
      });
    }
  }
});
