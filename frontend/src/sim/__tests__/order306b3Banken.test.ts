// ORDER 306b.3 (Anders 2026-10-08):
// 1. "skriv om de 29 situationerna i vinbarens gamla form på samma sätt (bara längd …). Mål: det längsta svaret är
//    rätt i högst en fjärdedel plus marginal … Lägg till ett test för hela banken."
// 2. "steg 2 tar aldrig något ur kassan eller av orken, i någon situation … Lägg till ett test för det."
//
// Banken är vinbarens: dess situationer och menyns (incidentBankFor('vinbar')), på svenska och engelska.
// Det längsta svaret räknas i ord och i tecken; lika långt som det längsta räknas som längst. Marginalen är
// LONGEST_SHARE_MAX: slumpens väntevärde är andelen rätta svar per steg, ungefär 0,30 i banken.

import { describe, expect, it } from 'vitest';
import vinbarMeta from '../../content/incidents/vinbar.meta.json';
import vinbarSv from '../../content/incidents/vinbar.text.sv.draft.json';
import vinbarEn from '../../content/incidents/vinbar.text.en.json';
import menuMeta from '../../content/incidents/menu.meta.json';
import menuSv from '../../content/incidents/menu.text.sv.draft.json';
import menuEn from '../../content/incidents/menu.text.en.json';
import ftBasMeta from '../../content/incidents/foodtruck/bas.meta.json';
import ft320Meta from '../../content/incidents/foodtruck/situationer320.meta.json';

type Effects = { cash?: number; stamina?: number };
type Meta = { incidents: { id: string; form?: string; steps: { form?: string; fail: { effects: Effects }; options: { id: string; quality: string; fail?: { effects: Effects } }[] }[] }[] };
type Texts = { texts: Record<string, { steps: { options: Record<string, { label: string }> }[] }> };

const LONGEST_SHARE_MAX = 0.35;

function longestIsRight(meta: Meta, texts: Texts, unit: 'words' | 'chars') {
  let steps = 0, hits = 0;
  for (const inc of meta.incidents) {
    inc.steps.forEach((st, k) => {
      if (st.form === 'sequence') return;
      const len = (id: string) => { const l = texts.texts[inc.id].steps[k].options[id].label.trim(); return unit === 'words' ? l.split(/\s+/).length : l.length; };
      const max = Math.max(...st.options.map((o) => len(o.id)));
      steps++;
      if (st.options.some((o) => o.quality === 'best' && len(o.id) === max)) hits++;
    });
  }
  return { steps, hits };
}

describe('ORDER 306b.3 — det längsta svaret i vinbarens bank', () => {
  for (const lang of ['sv', 'en'] as const) for (const unit of ['words', 'chars'] as const) {
    it(`är rätt i högst ${LONGEST_SHARE_MAX} av stegen (${lang}, ${unit === 'words' ? 'ord' : 'tecken'})`, () => {
      const a = longestIsRight(vinbarMeta as unknown as Meta, (lang === 'sv' ? vinbarSv : vinbarEn) as unknown as Texts, unit);
      const b = longestIsRight(menuMeta as unknown as Meta, (lang === 'sv' ? menuSv : menuEn) as unknown as Texts, unit);
      expect(a.steps + b.steps).toBeGreaterThan(140);
      expect((a.hits + b.hits) / (a.steps + b.steps)).toBeLessThanOrEqual(LONGEST_SHARE_MAX);
    });
  }
});

describe('ORDER 306b.3 — steg 2 tar varken kassa eller ork', () => {
  it('i formen analys → upplevelse → handling, i vinbaren och foodtrucken', () => {
    const all = [vinbarMeta, ftBasMeta, ft320Meta].flatMap((m) => (m as unknown as Meta).incidents.filter((i) => i.form === 'triad'));
    expect(all.length).toBe(11 + 13);
    for (const inc of all) {
      const s2 = inc.steps[1];
      for (const e of [s2.fail.effects, ...s2.options.flatMap((o) => (o.fail ? [o.fail.effects] : []))]) {
        expect([inc.id, e.cash ?? 0, e.stamina ?? 0]).toEqual([inc.id, 0, 0]);
      }
    }
  });
});
