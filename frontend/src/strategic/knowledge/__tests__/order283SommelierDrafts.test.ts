// ORDER 283 — innehållet ur Vision Owners tidigare spel Sommelier
// Championship: frågorna som utkast i frågebanken, kriskorten som
// raketutkast, och introduktionen till de tre kunskapsformerna i Måltidens
// hus. Utkasten används inte i spelet förrän Vision Owner granskat dem.

import { describe, expect, it } from 'vitest';
import { DRAFT_META, DRAFT_TEXT_FILES, authoredQuestions, validateBank } from '../questionBank';
import { CRISIS_DRAFTS, CRISIS_DRAFT_FILES, incidentBankFor, validateIncidentBank } from '../../../sim/incidentBank';
import { reducer } from '../../simulation/reducer';
import { makeNewGameState } from '../../simulation/model';
import { strings } from '../../../content/strings';

describe('ORDER 283 — frågorna som utkast', () => {
  it('37 frågor, giltiga på engelska och svenska, alla med status utkast', () => {
    expect(DRAFT_META).toHaveLength(37);
    expect(validateBank(DRAFT_META, DRAFT_TEXT_FILES)).toEqual([]);
    for (const q of DRAFT_META) expect(q.status).toBe('utkast');
  });

  it('domänen ger paviljong och axel: vetenskap, hantverk, estetisk gestaltning', () => {
    const want: Record<string, [string, string]> = {
      maltidbiblioteket: ['episteme', 'null'],
      stensota: ['techne', 'sommellerie'],
      kalastorget: ['phronesis', 'null']
    };
    for (const q of DRAFT_META) expect([q.axis, String(q.track)]).toEqual(want[q.pavilion]);
    expect(new Set(DRAFT_META.map((q) => q.pavilion))).toEqual(new Set(Object.keys(want)));
  });

  it('forskningen står i fältet reference, utan påhittade länkar', () => {
    const withRef = DRAFT_META.filter((q) => q.reference);
    expect(withRef.length).toBeGreaterThan(30);
    for (const q of withRef) expect(q.reference!.url).toBeNull();
    expect(DRAFT_META.find((q) => q.id === 'somm-dg1')!.reference!.title).toContain('Crichton-Fock & Spence (2024)');
  });

  it('rätt svar står inte oftast på samma plats', () => {
    const at = [0, 1, 2, 3].map((i) => DRAFT_META.filter((q) => q.correctIndex === i).length);
    expect(Math.max(...at) / DRAFT_META.length).toBeLessThan(0.4);
  });

  it('utkasten används inte i spelet', () => {
    expect(authoredQuestions().some((q) => q.id.startsWith('somm-'))).toBe(false);
  });
});

describe('ORDER 283 — kriskorten som raketutkast', () => {
  it('nio raketer med tre steg, giltiga, med status utkast och originalets steg markerat', () => {
    expect(CRISIS_DRAFTS).toHaveLength(9);
    expect(validateIncidentBank(CRISIS_DRAFT_FILES.meta, CRISIS_DRAFT_FILES.text)).toEqual([]);
    for (const meta of CRISIS_DRAFT_FILES.meta.incidents as unknown as { status: string; originalStep: number; reach: string }[]) {
      expect(meta.status).toBe('utkast');
      expect([0, 1, 2]).toContain(meta.originalStep);
      expect(['self', 'zone', 'village']).toContain(meta.reach);
    }
  });

  it('utkasten är inte med i vinbarens bank', () => {
    expect(incidentBankFor('vinbar').some((i) => i.id.startsWith('somm-'))).toBe(false);
  });
});

describe('ORDER 283 — introduktionen i Måltidens hus', () => {
  it('tre kunskapsformer, och den visas en gång', () => {
    // ORDER 301 — ordningen i kunskapsgrunden: att veta, att bedöma, att göra.
    expect(strings.houseIntro.forms.map((f) => f.name)).toEqual(['Episteme', 'Phronesis', 'Techne']);
    const s = makeNewGameState(1);
    expect(s.houseIntroSeen ?? false).toBe(false);
    const seen = reducer(s, { type: 'SEE_HOUSE_INTRO' });
    expect(seen.houseIntroSeen).toBe(true);
    expect(reducer(seen, { type: 'SEE_HOUSE_INTRO' })).toBe(seen);
  });
});
