// ORDER 108 — tester för källhänvisning + APA-format + coverage-varning.
//
// DoD-kartläggning:
//   DoD 1: sources-fält är strukturerad (inte fritext) — verifieras
//          via typkontroll av QuestionSource + APA-format på fixed data.
//   DoD 2: APA-formatering är ren funktion — samma indata, samma sträng.
//   DoD 3: episteme utan källa varnas i coverageReport (inte fel).
//   DoD 4: techne/phronesis utan källa varnas INTE (designavsikt).
//   DoD 5: befintliga frågor bär källa där axeln är episteme.
//   DoD 6: coverageErrors (gate) påverkas INTE — bygget faller inte
//          på episteme utan källa; det är en varning.

import { describe, expect, it } from 'vitest';
import type {
  FlervalQuestion,
  Question,
  QuestionSource
} from '../questionFormats';
import { formatSourceAPA, formatSourcesAPA } from '../sources';
import { coverageErrors, coverageReport } from '../questionCoverage';
import {
  FLERVAL_EXAMPLE,
  GESTALTNING_EXAMPLE,
  MALTIDBIBLIOTEKET_SEED,
  PARNING_EXAMPLE,
  R2_SEED_QUESTIONS,
  SITUATION_EXAMPLE
} from '../questionTemplates';

// -----------------------------------------------------------------------------
// APA-formatering — DoD 1 (strukturerad) och DoD 2 (ren funktion)
// -----------------------------------------------------------------------------

describe('ORDER 108 §APA — formatSourceAPA', () => {
  it('journal-artikel med DOI: författare (år). Titel. Publikation. https://doi.org/...', () => {
    const s: QuestionSource = {
      author: 'Gustafsson, I.-B.',
      year: 2006,
      title: 'FAMM-modellen',
      publication: 'Journal of Foodservice',
      doi: '10.1111/j.1745-4506.2006.00023.x'
    };
    expect(formatSourceAPA(s)).toBe(
      'Gustafsson, I.-B. (2006). FAMM-modellen. Journal of Foodservice. https://doi.org/10.1111/j.1745-4506.2006.00023.x'
    );
  });

  it('multi-author med publikation men utan DOI eller URL', () => {
    const s: QuestionSource = {
      author: 'Gustafsson, I.-B., & Öström, Å.',
      year: 2010,
      title: 'Måltiden som helhet',
      publication: 'Måltidskunskap'
    };
    expect(formatSourceAPA(s)).toBe(
      'Gustafsson, I.-B., & Öström, Å. (2010). Måltiden som helhet. Måltidskunskap.'
    );
  });

  it('URL används när DOI saknas', () => {
    const s: QuestionSource = {
      author: 'Livsmedelsverket',
      year: 2023,
      title: 'Näringsrekommendationer',
      url: 'https://www.livsmedelsverket.se/nnr'
    };
    expect(formatSourceAPA(s)).toBe(
      'Livsmedelsverket (2023). Näringsrekommendationer. https://www.livsmedelsverket.se/nnr'
    );
  });

  it('DOI vinner över URL när båda finns', () => {
    const s: QuestionSource = {
      author: 'Öström, Å.',
      year: 2015,
      title: 'Sensorik i rummet',
      doi: '10.1234/abcd',
      url: 'https://example.org/paper'
    };
    expect(formatSourceAPA(s)).toContain('https://doi.org/10.1234/abcd');
    expect(formatSourceAPA(s)).not.toContain('example.org');
  });

  it('titel med avslutande punkt dubblas inte', () => {
    const s: QuestionSource = {
      author: 'X',
      year: 2020,
      title: 'En titel med punkt.'
    };
    // Ska bli "X (2020). En titel med punkt." — inte "punkt.."
    expect(formatSourceAPA(s)).toBe('X (2020). En titel med punkt.');
  });

  it('samma indata → samma sträng (DoD 2 determinism)', () => {
    const s: QuestionSource = {
      author: 'A',
      year: 2000,
      title: 'T',
      publication: 'P',
      doi: '10.0/x'
    };
    expect(formatSourceAPA(s)).toBe(formatSourceAPA(s));
    expect(formatSourceAPA(s)).toBe(formatSourceAPA({ ...s }));
  });
});

describe('ORDER 108 §APA — formatSourcesAPA (lista)', () => {
  it('flera källor separeras med radbrytning i angiven ordning', () => {
    const list: QuestionSource[] = [
      { author: 'A', year: 2001, title: 'Först' },
      { author: 'B', year: 2002, title: 'Sedan' }
    ];
    expect(formatSourcesAPA(list)).toBe('A (2001). Först.\nB (2002). Sedan.');
  });

  it('tom lista → tom sträng', () => {
    expect(formatSourcesAPA([])).toBe('');
  });
});

// -----------------------------------------------------------------------------
// Coverage-varning — DoD 3, DoD 4, DoD 6
// -----------------------------------------------------------------------------

describe('ORDER 108 §coverage — episteme utan källa varnas', () => {
  it('episteme-fråga utan sources → listad i epistemeWithoutSource', () => {
    const q: FlervalQuestion = {
      id: 'test-episteme-utan-källa',
      format: 'flerval',
      axis: 'episteme',
      spar: null,
      pavilion: 'maltidbiblioteket',
      prompt: 'test',
      options: ['a', 'b'],
      correctIndex: 0
      // sources: undefined
    };
    const report = coverageReport([q], ['maltidbiblioteket']);
    expect(report.epistemeWithoutSource).toHaveLength(1);
    expect(report.epistemeWithoutSource[0]).toEqual({
      questionId: 'test-episteme-utan-källa',
      pavilion: 'maltidbiblioteket'
    });
  });

  it('episteme-fråga med tom sources-lista → varnas som utan källa', () => {
    const q: FlervalQuestion = {
      ...MALTIDBIBLIOTEKET_SEED,
      id: 'test-episteme-tom-lista',
      sources: []
    };
    const report = coverageReport([q], ['maltidbiblioteket']);
    expect(report.epistemeWithoutSource).toHaveLength(1);
    expect(report.epistemeWithoutSource[0].questionId).toBe('test-episteme-tom-lista');
  });

  it('episteme-fråga med minst en källa → varnas INTE', () => {
    const report = coverageReport([MALTIDBIBLIOTEKET_SEED], ['maltidbiblioteket']);
    expect(report.epistemeWithoutSource).toEqual([]);
  });

  it('föräldralös episteme-fråga utan källa → varnas med pavilion=null', () => {
    const q: FlervalQuestion = {
      id: 'test-orphan-episteme',
      format: 'flerval',
      axis: 'episteme',
      spar: null,
      // pavilion: undefined
      prompt: 'test',
      options: ['a', 'b'],
      correctIndex: 0
    };
    const report = coverageReport([q], []);
    expect(report.epistemeWithoutSource).toHaveLength(1);
    expect(report.epistemeWithoutSource[0]).toEqual({
      questionId: 'test-orphan-episteme',
      pavilion: null
    });
  });
});

describe('ORDER 108 §coverage — techne/phronesis kräver INTE källa', () => {
  it('techne utan källa → varnas INTE (designavsikt: hantverkstradition)', () => {
    // FLERVAL_EXAMPLE och GESTALTNING_EXAMPLE är techne utan sources.
    const report = coverageReport(
      [FLERVAL_EXAMPLE, GESTALTNING_EXAMPLE],
      ['metodkoket', 'stensota']
    );
    expect(report.epistemeWithoutSource).toEqual([]);
  });

  it('phronesis utan källa → varnas INTE (designavsikt: omdöme, inte fakta)', () => {
    // SITUATION_EXAMPLE och PARNING_EXAMPLE är phronesis utan sources.
    const report = coverageReport(
      [SITUATION_EXAMPLE, PARNING_EXAMPLE],
      ['kalastorget']
    );
    expect(report.epistemeWithoutSource).toEqual([]);
  });

  it('techne får ha källor utan att någon regel bryts', () => {
    const techneMedKälla: Question = {
      ...FLERVAL_EXAMPLE,
      id: 'techne-med-källa',
      sources: [{ author: 'X', year: 2020, title: 'Sous vide-praxis' }]
    };
    const report = coverageReport([techneMedKälla], ['metodkoket']);
    expect(report.epistemeWithoutSource).toEqual([]);
  });
});

describe('ORDER 108 §gate — episteme utan källa faller INTE bygget', () => {
  it('coverageErrors påverkas inte av episteme utan källa (varning, inte fel)', () => {
    const q: FlervalQuestion = {
      id: 'episteme-utan-källa',
      format: 'flerval',
      axis: 'episteme',
      spar: null,
      pavilion: 'maltidbiblioteket',
      prompt: 'test',
      options: ['a', 'b'],
      correctIndex: 0
    };
    // Paviljongen har en fråga (inte tom); episteme-varningen är
    // separat från emptyPavilions. coverageErrors ska vara tom.
    expect(coverageErrors([q], ['maltidbiblioteket'])).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// DoD 5 — befintliga episteme-frågor i R2_SEED_QUESTIONS bär källa
// -----------------------------------------------------------------------------

describe('ORDER 108 §DoD5 — R2 seed-episteme-frågor har källhänvisning', () => {
  it('varje episteme-fråga i R2_SEED_QUESTIONS har minst en källa', () => {
    const epistemeSeed = R2_SEED_QUESTIONS.filter((q) => q.axis === 'episteme');
    expect(epistemeSeed.length).toBeGreaterThan(0);
    for (const q of epistemeSeed) {
      expect(q.sources, `fråga ${q.id} saknar sources`).toBeDefined();
      expect(q.sources!.length, `fråga ${q.id} har tom sources-lista`).toBeGreaterThan(0);
    }
  });

  it('MALTIDBIBLIOTEKET_SEED bär FAMM-källan (Gustafsson m.fl. 2006)', () => {
    expect(MALTIDBIBLIOTEKET_SEED.sources).toBeDefined();
    expect(MALTIDBIBLIOTEKET_SEED.sources![0].year).toBe(2006);
    expect(MALTIDBIBLIOTEKET_SEED.sources![0].author).toContain('Gustafsson');
  });
});
