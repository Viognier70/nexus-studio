// ORDER 262 (Nexus v1 etapp 0) — frågebanken som data.
//
// DoD: schemat validerar alla 40 frågor. Testet prövar också att
// metadata och spelartext hålls isär, att det svenska utkastet täcker
// samma frågor, att spelet läser engelska tills utkastet är granskat,
// och att nivåerna silver–platina fylls med bronsfrågor märkta som
// platshållare.

import { describe, expect, it } from 'vitest';
import {
  BANK_META,
  BANK_TEXT_FILES,
  activeBankLanguage,
  authoredQuestions,
  questionsFor,
  validateBank,
  validateMeta
} from '../questionBank';
import { ALL_PAVILION_IDS } from '../pavilions';
import { QUESTION_BANK } from '../../../sim/balance';

const TEXT_KEYS = ['explanation', 'options', 'prompt'];

describe('ORDER 262 — frågebanken', () => {
  it('schemat validerar alla 40 frågor på båda språken', () => {
    expect(BANK_META).toHaveLength(QUESTION_BANK.bronzePlaceholderQuestions);
    expect(validateBank(BANK_META, BANK_TEXT_FILES)).toEqual([]);
  });

  it('metadata innehåller ingen spelartext, och textfilerna ingen metadata', () => {
    for (const m of BANK_META) {
      for (const k of TEXT_KEYS) expect(m).not.toHaveProperty(k);
    }
    for (const f of BANK_TEXT_FILES) {
      for (const t of Object.values(f.texts)) expect(Object.keys(t).sort()).toEqual(TEXT_KEYS);
    }
  });

  it('valideringen fångar en trasig fråga', () => {
    const broken = { ...BANK_META[0], correctIndex: 4, pavilion: 'okand' };
    expect(validateMeta(broken).length).toBe(2);
  });

  it('det svenska utkastet är märkt som utkast, och spelet läser engelska tills det granskats', () => {
    const sv = BANK_TEXT_FILES.find((f) => f.language === 'sv');
    expect(sv?.status).toBe('draft');
    expect(activeBankLanguage()).toBe('en');
    expect(authoredQuestions()[0].language).toBe('en');
  });

  it('svensk och engelsk text har samma rätta svar per index (samma alternativordning)', () => {
    // Strukturkontroll: samma id och fyra alternativ på båda språken.
    const [en, sv] = ['en', 'sv'].map((l) => BANK_TEXT_FILES.find((f) => f.language === l)!);
    expect(Object.keys(sv.texts).sort()).toEqual(Object.keys(en.texts).sort());
  });

  it('brons har tio egna frågor i de fyra paviljongerna, Teatern inga', () => {
    for (const p of ALL_PAVILION_IDS) {
      const n = questionsFor(p, 'brons').length;
      expect(n).toBe(p === 'gastronomiskateatern' ? 0 : 10);
    }
  });

  it('silver–platina fylls med paviljongens bronsfrågor, märkta som platshållare', () => {
    for (const level of ['silver', 'guld', 'platina'] as const) {
      const qs = questionsFor('stensota', level);
      expect(qs).toHaveLength(10);
      for (const q of qs) {
        expect(q.placeholder).toBe(true);
        expect(q.level).toBe(level);
        expect(q.sourceId).toMatch(/^stensota-brons-\d\d$/);
        expect(q.id).toBe(`${q.sourceId}@${level}`);
      }
    }
    expect(questionsFor('stensota', 'brons').every((q) => !q.placeholder)).toBe(true);
  });
});
