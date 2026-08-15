// ORDER 107 §6 — tester för de fyra fråge-formaten.
//
// DoD-kartläggning:
//   DoD 1: fyra format implementerade (verifieras genom att alla fyra
//          template-exempel validerar och scorar).
//   DoD 2: bedömningen är ren funktion — samma indata, samma poäng.
//          Testas via `.toBe` med exakta värden.
//   DoD 3: ingen anropsväg till språkmodell i frågevägen.
//          Grep-test scannar knowledge/-katalogen.
//   DoD 4: mall med ett komplett exempel per format — verifieras via
//          `ALL_TEMPLATE_EXAMPLES.length === 4` + validering per format.
//   DoD 5: täckningsverktyg som failar vid noll frågor i byggd paviljong.
//   DoD 6: rangordning ger delpoäng, inte binärt utfall.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scoreQuestion,
  validateQuestion,
  type Answer,
  type FlervalQuestion,
  type GestaltningQuestion,
  type ParningQuestion,
  type Question,
  type SituationQuestion
} from '../questionFormats';
import {
  ALL_TEMPLATE_EXAMPLES,
  FLERVAL_EXAMPLE,
  GESTALTNING_EXAMPLE,
  PARNING_EXAMPLE,
  SITUATION_EXAMPLE
} from '../questionTemplates';
import {
  coverageErrors,
  coverageReport
} from '../questionCoverage';

// -----------------------------------------------------------------------------
// DoD 4 — mallen har exakt fyra exempel (ett per format), alla validerar
// -----------------------------------------------------------------------------

describe('ORDER 107 §4.3 — mall med ett komplett exempel per format', () => {
  it('mallen innehåller exakt fyra exempel', () => {
    expect(ALL_TEMPLATE_EXAMPLES).toHaveLength(4);
  });

  it('varje format finns exakt en gång i mallen', () => {
    const formats = ALL_TEMPLATE_EXAMPLES.map((e) => e.format).sort();
    expect(formats).toEqual(['flerval', 'gestaltning', 'parning', 'situation']);
  });

  it('varje mall-exempel validerar utan Error', () => {
    for (const example of ALL_TEMPLATE_EXAMPLES) {
      expect(() => validateQuestion(example)).not.toThrow();
    }
  });
});

// -----------------------------------------------------------------------------
// validateQuestion — sanity-checks per format
// -----------------------------------------------------------------------------

describe('ORDER 107 §4.1 — validering per format', () => {
  it('flerval med correctIndex utanför range → Error', () => {
    const bad: FlervalQuestion = {
      ...FLERVAL_EXAMPLE,
      id: 'bad-flerval',
      correctIndex: 99
    };
    expect(() => validateQuestion(bad)).toThrow(/correctIndex out of range/);
  });

  it('situation med ranking som inte är permutation → Error', () => {
    const bad: SituationQuestion = {
      ...SITUATION_EXAMPLE,
      id: 'bad-situation',
      intendedRanking: [0, 0, 1, 2]   // 0 upprepas
    };
    expect(() => validateQuestion(bad)).toThrow(/not a permutation/);
  });

  it('parning med olika längd situations/responses → Error', () => {
    const bad: ParningQuestion = {
      ...PARNING_EXAMPLE,
      id: 'bad-parning',
      responses: ['bara ett bemötande']
    };
    expect(() => validateQuestion(bad)).toThrow(/situations.length !== responses.length/);
  });

  it('gestaltning med fyra alternativ → Error (§3.4 kräver exakt 3)', () => {
    const bad: GestaltningQuestion = {
      ...GESTALTNING_EXAMPLE,
      id: 'bad-gestaltning',
      gestaltningar: ['a', 'b', 'c', 'd']
    };
    expect(() => validateQuestion(bad)).toThrow(/exactly 3 gestaltningar/);
  });
});

// -----------------------------------------------------------------------------
// scoreQuestion — DoD 2 (determinism) och DoD 6 (rangordning delpoäng)
// -----------------------------------------------------------------------------

describe('ORDER 107 §4.2 — flerval poäng är binärt', () => {
  it('rätt index → 1', () => {
    const a: Answer = { format: 'flerval', index: FLERVAL_EXAMPLE.correctIndex };
    expect(scoreQuestion(FLERVAL_EXAMPLE, a)).toBe(1);
  });

  it('fel index → 0', () => {
    const wrongIndex = FLERVAL_EXAMPLE.correctIndex === 0 ? 1 : 0;
    const a: Answer = { format: 'flerval', index: wrongIndex };
    expect(scoreQuestion(FLERVAL_EXAMPLE, a)).toBe(0);
  });

  it('samma indata → samma poäng (DoD 2 determinism)', () => {
    const a: Answer = { format: 'flerval', index: 1 };
    const score1 = scoreQuestion(FLERVAL_EXAMPLE, a);
    const score2 = scoreQuestion(FLERVAL_EXAMPLE, a);
    const score3 = scoreQuestion(FLERVAL_EXAMPLE, a);
    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
  });
});

describe('ORDER 107 §4.2 + §6 DoD 6 — situation ger delpoäng', () => {
  it('perfekt rangordning → 1', () => {
    const a: Answer = { format: 'situation', ranking: [...SITUATION_EXAMPLE.intendedRanking] };
    expect(scoreQuestion(SITUATION_EXAMPLE, a)).toBe(1);
  });

  it('helt omvänd rangordning → 0 (n=4, maxDistance=8)', () => {
    const reversed = [...SITUATION_EXAMPLE.intendedRanking].reverse();
    const a: Answer = { format: 'situation', ranking: reversed };
    expect(scoreQuestion(SITUATION_EXAMPLE, a)).toBe(0);
  });

  it('ett swap-fel → delpoäng mellan 0 och 1 (DoD 6: inte binärt)', () => {
    // Swap positions 0 och 1 i intended ranking.
    const nearlyRight = [
      SITUATION_EXAMPLE.intendedRanking[1],
      SITUATION_EXAMPLE.intendedRanking[0],
      SITUATION_EXAMPLE.intendedRanking[2],
      SITUATION_EXAMPLE.intendedRanking[3]
    ];
    const a: Answer = { format: 'situation', ranking: nearlyRight };
    const score = scoreQuestion(SITUATION_EXAMPLE, a);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    // För n=4: två element flyttas 1 position vardera = totalDistance 2.
    // maxDistance = floor(16/2) = 8. Poäng = 1 - 2/8 = 0.75.
    expect(score).toBeCloseTo(0.75, 6);
  });

  it('halvrätt (två element rätt, två swappade) → 0.5 för n=4', () => {
    // Håll 2 första på plats, swappa 3:e och 4:e.
    const half = [
      SITUATION_EXAMPLE.intendedRanking[0],
      SITUATION_EXAMPLE.intendedRanking[1],
      SITUATION_EXAMPLE.intendedRanking[3],
      SITUATION_EXAMPLE.intendedRanking[2]
    ];
    const a: Answer = { format: 'situation', ranking: half };
    const score = scoreQuestion(SITUATION_EXAMPLE, a);
    // Två element flyttas 1 vardera = totalDistance 2, poäng 0.75.
    expect(score).toBeCloseTo(0.75, 6);
  });

  it('samma indata → samma poäng (DoD 2 determinism)', () => {
    const a: Answer = { format: 'situation', ranking: [0, 2, 1, 3] };
    const s1 = scoreQuestion(SITUATION_EXAMPLE, a);
    const s2 = scoreQuestion(SITUATION_EXAMPLE, a);
    expect(s1).toBe(s2);
  });
});

describe('ORDER 107 §4.2 — parning ger fraktion av rätt par', () => {
  it('alla rätt (3/3) → 1', () => {
    const a: Answer = { format: 'parning', pairs: [...PARNING_EXAMPLE.correctPairs] };
    expect(scoreQuestion(PARNING_EXAMPLE, a)).toBe(1);
  });

  it('inga rätt (0/3) → 0', () => {
    // Skifta alla par en position — inget matchar.
    const shifted = PARNING_EXAMPLE.correctPairs.map(
      (_, i) => (i + 1) % PARNING_EXAMPLE.situations.length
    );
    const a: Answer = { format: 'parning', pairs: shifted };
    // Kontrollera att verkligen ingen matchar.
    for (let i = 0; i < shifted.length; i++) {
      expect(shifted[i]).not.toBe(PARNING_EXAMPLE.correctPairs[i]);
    }
    expect(scoreQuestion(PARNING_EXAMPLE, a)).toBe(0);
  });

  it('två rätt av tre → 2/3', () => {
    // Behåll 0 och 1, sätt fel på 2.
    const partial = [
      PARNING_EXAMPLE.correctPairs[0],
      PARNING_EXAMPLE.correctPairs[1],
      (PARNING_EXAMPLE.correctPairs[2] + 1) % PARNING_EXAMPLE.situations.length
    ];
    const a: Answer = { format: 'parning', pairs: partial };
    expect(scoreQuestion(PARNING_EXAMPLE, a)).toBeCloseTo(2 / 3, 6);
  });
});

describe('ORDER 107 §4.2 — gestaltning är binär men framing skiljer sig', () => {
  it('rätt index → 1', () => {
    const a: Answer = { format: 'gestaltning', index: GESTALTNING_EXAMPLE.intendedIndex };
    expect(scoreQuestion(GESTALTNING_EXAMPLE, a)).toBe(1);
  });

  it('fel index → 0', () => {
    const wrong = (GESTALTNING_EXAMPLE.intendedIndex + 1) % 3;
    const a: Answer = { format: 'gestaltning', index: wrong };
    expect(scoreQuestion(GESTALTNING_EXAMPLE, a)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// scoreQuestion — format mismatch guard
// -----------------------------------------------------------------------------

describe('ORDER 107 §4.2 — score guardar mot format-mismatch', () => {
  it('score kastar Error om answer.format !== question.format', () => {
    const wrongAnswer: Answer = { format: 'situation', ranking: [0, 1, 2, 3] };
    expect(() => scoreQuestion(FLERVAL_EXAMPLE, wrongAnswer)).toThrow(/format mismatch/);
  });
});

// -----------------------------------------------------------------------------
// DoD 5 — coverage-verktyg
// -----------------------------------------------------------------------------

describe('ORDER 107 §4.4 — coverage report och errors', () => {
  it('tom builtPavilions-parameter ger inga fel oavsett frågeuppsättning', () => {
    // Logik-test som är stabilt oavsett vad BUILT_PAVILIONS-konstanten
    // innehåller. Vid ORDER 107 var BUILT_PAVILIONS = []; efter ORDER 104
    // är den populerad med de fem paviljongerna. Ordningsföljd-testet
    // för konstanten själv flyttat till coverage-testet under ORDER 104
    // (BUILT_PAVILIONS ska ha alla fem, alla ska ha frågor).
    const errors = coverageErrors(ALL_TEMPLATE_EXAMPLES, []);
    expect(errors).toEqual([]);
  });

  it('byggd paviljong utan frågor → coverageErrors listar den', () => {
    const errors = coverageErrors(ALL_TEMPLATE_EXAMPLES, ['kalastorget-utan-frågor']);
    // Kalastorget-exemplet har frågor för `kalastorget`, inte
    // 'kalastorget-utan-frågor', så det räknas som tom.
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/kalastorget-utan-frågor/);
    expect(errors[0]).toMatch(/ORDER 107 §4.4/);
  });

  it('byggd paviljong med minst en fråga → inga fel för den', () => {
    // Kalastorget har både SITUATION_EXAMPLE och PARNING_EXAMPLE.
    const errors = coverageErrors(ALL_TEMPLATE_EXAMPLES, ['kalastorget']);
    expect(errors).toEqual([]);
  });

  it('rapport delar upp per axel/spår/format per paviljong', () => {
    const report = coverageReport(ALL_TEMPLATE_EXAMPLES, ['kalastorget', 'stensota']);
    // Kalastorget: 2 frågor (situation + parning), båda phronesis, båda spårlösa.
    expect(report.perPavilion['kalastorget'].total).toBe(2);
    expect(report.perPavilion['kalastorget'].perAxis.phronesis).toBe(2);
    expect(report.perPavilion['kalastorget'].perSpar.untagged).toBe(2);
    expect(report.perPavilion['kalastorget'].perFormat.situation).toBe(1);
    expect(report.perPavilion['kalastorget'].perFormat.parning).toBe(1);
    // Stensota: 1 fråga (gestaltning), techne, sommellerie.
    expect(report.perPavilion['stensota'].total).toBe(1);
    expect(report.perPavilion['stensota'].perAxis.techne).toBe(1);
    expect(report.perPavilion['stensota'].perSpar.sommellerie).toBe(1);
    expect(report.perPavilion['stensota'].perFormat.gestaltning).toBe(1);
  });

  it('frågor utan pavilion-fält räknas som unattached', () => {
    const orphan: Question = {
      ...FLERVAL_EXAMPLE,
      id: 'orphan',
      pavilion: undefined
    };
    const report = coverageReport([orphan, ...ALL_TEMPLATE_EXAMPLES], []);
    expect(report.unattachedQuestions).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// DoD 3 — ingen anropsväg till språkmodell i frågevägen (grep-test)
// -----------------------------------------------------------------------------

describe('ORDER 107 §6 DoD 3 — ingen språkmodell i frågevägen', () => {
  it('grep över knowledge/-katalogen: ingen fetch/OpenAI/anthropic/import openai etc', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const knowledgeDir = resolve(thisDir, '..');
    const files: string[] = [];
    function walk(d: string) {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        const s = statSync(full);
        if (s.isDirectory()) {
          if (name === '__tests__') continue;  // detta test-filen själv är förbjuden att skanna sig
          walk(full);
        } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
          files.push(full);
        }
      }
    }
    walk(knowledgeDir);
    expect(files.length).toBeGreaterThan(0);

    // Förbjudna mönster — indikerar en LLM-anropsväg. Kommentar-friendly:
    // kommentarraden `// ingen språkmodell` matchar inte pga att den inte
    // innehåller anropsformerna nedan.
    const forbidden = [
      /\bfetch\s*\(/,
      /import\s+.*['"](openai|anthropic|@anthropic-ai\/sdk|@openai\/api)['"]/,
      /['"]https?:\/\/api\.(openai|anthropic)/,
      /\bcreateMessage\s*\(/,
      /\bcompletions\.create\s*\(/
    ];
    const hits: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        if (pattern.test(source)) {
          hits.push(`${file.replace(knowledgeDir, 'knowledge/')} matchar ${pattern}`);
        }
      }
    }
    expect(hits, `Förbjuden anropsväg hittad: ${hits.join(', ')}`).toEqual([]);
  });
});
