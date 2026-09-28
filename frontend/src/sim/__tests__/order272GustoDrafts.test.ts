// ORDER 272 — utkasten ur gusto.science har spelets form.
//
// Utan nätverk: ett påhittat svar i skriptets JSON-schema byggs till
// utkast med skriptets egen funktion och prövas mot händelsebankens och
// frågebankens validering. Skriptet: scripts/order272-gusto-drafts.mjs.

import { describe, expect, it } from 'vitest';
import { validateIncidentBank } from '../incidentBank';
import { validateBank } from '../../strategic/knowledge/questionBank';
// @ts-expect-error — skriptet är JavaScript utan typer.
import { buildEntries, MODEL, trackFor, validate } from '../../../scripts/order272-gusto-drafts.mjs';

const step = (q: string, right: number) => ({
  question: q,
  options: [0, 1, 2, 3].map((i) => ({ label: `Alternativ ${i}`, explanation: `Förklaring ${i}.`, correct: i === right })),
  fail_outcome: 'Gästen väntar.'
});
const question = (right: number) => ({ prompt: 'Vad gäller?', options: ['A', 'B', 'C', 'D'], correct_index: right, explanation: 'Därför.' });
const OUT = {
  rocket: {
    title: 'Kylan',
    body: 'Ett par vid bord {bord} väntar.',
    steps: { episteme: step('Vad?', 0), techne: step('Hur?', 1), phronesis: step('När?', 2) },
    success_outcome: 'Bordet skålar.',
    staff_outcome: 'The staff take over: it takes time.'
  },
  questions: { episteme: question(0), techne: question(1), phronesis: question(3) }
};
const ARTICLE = {
  id: '0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0', title: 'A study', authors: 'A. Author', journal: 'J', year: 2025,
  topic: 'sensory_evaluation', url: 'https://doi.org/10.1000/xyz', doi: '10.1000/xyz',
  gustoUrl: 'https://gusto.science/?article=0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0', track: 'sommellerie',
  episteme: 'EN episteme', techne: 'EN techne', techneRole: 'sensory_pro', phronesis: 'EN phronesis', phronesisRole: 'hospitality_mgmt'
};

describe('ORDER 272 — utkasten ur gusto.science', () => {
  it('modellen står i en konstant', () => {
    expect(MODEL).toBe('claude-opus-5-5');
  });

  it('fördelningen: köksämnen till Metodköket, vin och sensorik till Stensöta', () => {
    expect(trackFor('culinary_science')).toBe('kok');
    expect(trackFor('flavor_science')).toBe('sommellerie');
    expect(trackFor('servicescape')).toBeNull();
  });

  it('skriptets egen kontroll godtar ett giltigt svar', () => {
    expect(validate(OUT)).toEqual([]);
  });

  it('raketen har bankens form och klarar händelsebankens validering', () => {
    const { rocket } = buildEntries(ARTICLE, OUT, { model: 'test', at: '2026-09-28' });
    expect(rocket.status).toBe('utkast');
    expect(rocket.meta.steps.map((s: { axis: string }) => s.axis)).toEqual(['episteme', 'techne', 'phronesis']);
    expect(rocket.meta.reference).toMatchObject({ title: 'A study', url: ARTICLE.gustoUrl, doi: '10.1000/xyz' });
    expect(rocket.source).toMatchObject({ language: 'en', episteme: 'EN episteme', techne: 'EN techne', phronesis: 'EN phronesis' });
    const errors = validateIncidentBank(
      { schemaVersion: 2, businessClass: 'vinbar', incidents: [rocket.meta] } as never,
      { language: 'sv', status: 'draft', texts: { [rocket.id]: rocket.text } } as never
    );
    expect(errors).toEqual([]);
    // Det rätta svaret följer med när alternativen blandas.
    for (const [i, s] of rocket.meta.steps.entries()) {
      const best = s.options.find((o: { quality: string }) => o.quality === 'best');
      const axis = ['episteme', 'techne', 'phronesis'][i] as 'episteme' | 'techne' | 'phronesis';
      const right = OUT.rocket.steps[axis].options.find((o) => o.correct)!.label;
      expect(rocket.text.steps[i].options[best.id].label).toBe(right);
    }
  });

  it('provfrågorna: en per paviljong, med frågebankens form', () => {
    const { questions } = buildEntries(ARTICLE, OUT, { model: 'test', at: '2026-09-28' });
    expect(questions.map((q: { meta: { pavilion: string } }) => q.meta.pavilion)).toEqual(['maltidbiblioteket', 'stensota', 'kalastorget']);
    const errors = validateBank(questions.map((q: { meta: unknown }) => q.meta), [
      { language: 'sv', texts: Object.fromEntries(questions.map((q: { id: string; text: unknown }) => [q.id, q.text])) } as never
    ]);
    expect(errors).toEqual([]);
    for (const q of questions) {
      const axis = q.meta.axis as 'episteme' | 'techne' | 'phronesis';
      const orig = OUT.questions[axis];
      expect(q.text.options[q.meta.correctIndex]).toBe(orig.options[orig.correct_index]);
      expect(q.status).toBe('utkast');
    }
  });
});
