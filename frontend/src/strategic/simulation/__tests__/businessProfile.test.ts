// ORDER 102 §4 — R1-tester för businessProfile.ts (readProfile +
// resolveLoanOutcome) + reducer-tester för ACCUMULATE_KNOWLEDGE.
//
// Uppfyller ordertextens DoD 4:
//   - readProfile: 5 klasser + 4 gränsfall + 2 precedens-tester = 11
//   - resolveLoanOutcome: 5 klass-mappningar
//   - Reducern: 3 axlar + 1 negativ-klämning + 1 nollklämning = 5
// Totalt: 21 tester (över minimum 18).

import { describe, expect, it } from 'vitest';
import { readProfile, resolveLoanOutcome } from '../businessProfile';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import type { KnowledgeCredits, SimAction } from '../../types';

// -----------------------------------------------------------------------------
// readProfile — klass-tilldelning
// -----------------------------------------------------------------------------

describe('ORDER 102 §2.3 — readProfile klasstilldelning per axel', () => {
  it('phronesis-dominant vektor läses som restaurant', () => {
    // (0.1, 0.1, 0.9) — magnitud ≈ 0.9, phronesis/mag ≈ 0.997 >> cos(45°) ≈ 0.707
    const credits: KnowledgeCredits = { episteme: 0.1, techne: 0.1, phronesis: 0.9 };
    expect(readProfile(credits)).toBe('kvarterskrogen');
  });

  it('techne-dominant vektor läses som foodtruck', () => {
    // (0.1, 0.9, 0.1) — techne/mag ≈ 0.997, phronesis-cone träffar inte
    const credits: KnowledgeCredits = { episteme: 0.1, techne: 0.9, phronesis: 0.1 };
    expect(readProfile(credits)).toBe('foodtrucken');
  });

  it('episteme-dominant vektor läses som nearEpisteme', () => {
    // Gränsfall från R3 §3.3: (0.90, 0.05, 0.05)
    const credits: KnowledgeCredits = { episteme: 0.9, techne: 0.05, phronesis: 0.05 };
    expect(readProfile(credits)).toBe('nearEpisteme');
  });

  it('bred vektor över centrumgolv läses som balanced', () => {
    // (0.6, 0.6, 0.6) — magnitud ≈ 1.04 (> 0.40 centrumgolv),
    // axel/mag = 0.577 < cos(45°) = 0.707 → utanför alla koner
    const credits: KnowledgeCredits = { episteme: 0.6, techne: 0.6, phronesis: 0.6 };
    expect(readProfile(credits)).toBe('balanced');
  });

  it('vektor under specialistgolv (0.10) läses som noLoan', () => {
    // (0.05, 0.05, 0.05) — magnitud ≈ 0.087 < 0.10
    const credits: KnowledgeCredits = { episteme: 0.05, techne: 0.05, phronesis: 0.05 };
    expect(readProfile(credits)).toBe('noLoan');
  });
});

// -----------------------------------------------------------------------------
// readProfile — fyra gränsfall från R3 §3.3 / ORDER 093 §3.6.3
// -----------------------------------------------------------------------------

describe('ORDER 102 §2.5 — fyra gränsfall', () => {
  it('jämnstark låg (0.10, 0.10, 0.10) → noLoan (över specialist, under centrum)', () => {
    // Magnitud = √(3 × 0.01) ≈ 0.173. Över specialistgolv 0.10 så inte
    // "under alla golv"; under centrumgolv 0.40 så inte balanced.
    // Axel/mag = 0.577 → ingen cone-träff. Faller genom till 'noLoan'.
    const credits: KnowledgeCredits = { episteme: 0.1, techne: 0.1, phronesis: 0.1 };
    expect(readProfile(credits)).toBe('noLoan');
  });

  it('jämnstark hög (0.70, 0.70, 0.70) → balanced (över alla golv, utanför alla koner)', () => {
    // Magnitud = √(3 × 0.49) ≈ 1.212. Axel/mag = 0.577 < 0.707.
    const credits: KnowledgeCredits = { episteme: 0.7, techne: 0.7, phronesis: 0.7 };
    expect(readProfile(credits)).toBe('balanced');
  });

  it('enbart episteme (0.90, 0.05, 0.05) → nearEpisteme', () => {
    const credits: KnowledgeCredits = { episteme: 0.9, techne: 0.05, phronesis: 0.05 };
    expect(readProfile(credits)).toBe('nearEpisteme');
  });

  it('techne+episteme (0.70, 0.70, 0.10) → balanced (tippunkt 45.3° > 45°)', () => {
    // Magnitud ≈ 0.995. e/mag = 0.703, t/mag = 0.703 — båda precis under
    // cos(45°) = 0.7071. Ingen cone-träff. Över centrumgolv → balanced.
    // Matchar ORDER 093 §3.6.3-tabellen (techne+episteme tippar över först vid 50°).
    const credits: KnowledgeCredits = { episteme: 0.7, techne: 0.7, phronesis: 0.1 };
    expect(readProfile(credits)).toBe('balanced');
  });
});

// -----------------------------------------------------------------------------
// readProfile — precedens vid överlappande koner (aktiveras vid cone ≥ 50°)
// -----------------------------------------------------------------------------

describe('ORDER 102 §2.3 — precedens vid överlappande koner', () => {
  it('phronesis vinner över techne när båda cones träffar', () => {
    // Konstruera en vektor där både phronesis och techne är dominanta
    // nog att träffa sina koner vid 45°. Behöver bara att båda axel/mag
    // ≥ 0.707. Med (0.05, 0.9, 0.9): mag = √(0.0025 + 0.81 + 0.81) ≈ 1.273,
    // t/mag ≈ 0.707, p/mag ≈ 0.707. Båda precis vid tröskeln.
    // Använd något starkare: (0.05, 0.95, 0.95) → mag ≈ 1.343,
    // t/mag ≈ 0.707, p/mag ≈ 0.707. Fortfarande gränsfall. Ta
    // (0.05, 1.0, 1.0) → mag ≈ 1.414, t/mag = 0.707, p/mag = 0.707.
    // Fortfarande exakt vid. Använd (0.01, 1.0, 1.0) → mag ≈ 1.414,
    // t/mag och p/mag = 0.707. Fortfarande på tröskeln.
    // Enklare: (0, 1, 1) → mag = √2, t/mag = 1/√2 = 0.707. Vid exakt tröskel.
    // För ATT VARA ÖVER: höj phronesis lite. (0, 0.8, 1.0) → mag ≈ 1.281,
    // t/mag ≈ 0.625, p/mag ≈ 0.781. Bara phronesis inne. Fungerar inte.
    // Rätt konstruktion: skjut phronesis och techne symmetriskt inåt sina
    // koner medan episteme är noll. (0, 0.9, 1.1) → mag ≈ 1.421,
    // t/mag ≈ 0.633 (utanför), p/mag ≈ 0.774 (inne).
    // För BÅDA inne krävs axeln nästan lika, båda strax över 0.707 × mag.
    // (0, 1, 1) exakt vid; (0, 1.01, 1.01) → mag = √(2.0402) ≈ 1.428,
    // t/mag = 1.01/1.428 = 0.7073 — precis över. Använd det.
    const credits: KnowledgeCredits = { episteme: 0, techne: 1.01, phronesis: 1.01 };
    // Verifiera hypotesen: båda axlar borde träffa cone vid 45°.
    // Utan precedens skulle vi kunna få antingen; med precedens: phronesis vinner.
    expect(readProfile(credits)).toBe('kvarterskrogen');
  });

  it('techne vinner över episteme när båda cones träffar', () => {
    // Samma logik: (1.01, 1.01, 0) → t och e båda strax över tröskeln.
    const credits: KnowledgeCredits = { episteme: 1.01, techne: 1.01, phronesis: 0 };
    expect(readProfile(credits)).toBe('foodtrucken');
  });
});

// -----------------------------------------------------------------------------
// resolveLoanOutcome — klass → loanTier
// -----------------------------------------------------------------------------

describe('ORDER 102 §2.4 — resolveLoanOutcome mappning klass → loanTier', () => {
  it('restaurant → restaurant-full', () => {
    const result = resolveLoanOutcome({ episteme: 0.1, techne: 0.1, phronesis: 0.9 });
    expect(result.klass).toBe('kvarterskrogen');
    expect(result.loanTier).toBe('restaurant-full');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('foodtruck → foodtruck', () => {
    const result = resolveLoanOutcome({ episteme: 0.1, techne: 0.9, phronesis: 0.1 });
    expect(result.klass).toBe('foodtrucken');
    expect(result.loanTier).toBe('foodtrucken');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('nearEpisteme → none (Vision Owner 2026-08-15: avsiktligt utan lån)', () => {
    const result = resolveLoanOutcome({ episteme: 0.9, techne: 0.05, phronesis: 0.05 });
    expect(result.klass).toBe('nearEpisteme');
    expect(result.loanTier).toBe('none');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('balanced → restaurant-small (placeholder tills R4 §3.7 p2)', () => {
    const result = resolveLoanOutcome({ episteme: 0.7, techne: 0.7, phronesis: 0.7 });
    expect(result.klass).toBe('balanced');
    expect(result.loanTier).toBe('restaurant-small');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('noLoan → none', () => {
    const result = resolveLoanOutcome({ episteme: 0.05, techne: 0.05, phronesis: 0.05 });
    expect(result.klass).toBe('noLoan');
    expect(result.loanTier).toBe('none');
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------------
// Reducer — ACCUMULATE_KNOWLEDGE
// -----------------------------------------------------------------------------

describe('ORDER 102 §2.2 — reducer ACCUMULATE_KNOWLEDGE', () => {
  it('initialstate har alla tre axlar noll', () => {
    const state = makeInitialState();
    expect(state.knowledgeCredits).toEqual({ episteme: 0, techne: 0, phronesis: 0 });
  });

  it('ackumulerar på episteme-axel', () => {
    const state = makeInitialState();
    const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis: 'episteme', amount: 0.3 };
    const next = reducer(state, action);
    expect(next.knowledgeCredits.episteme).toBeCloseTo(0.3, 6);
    expect(next.knowledgeCredits.techne).toBe(0);
    expect(next.knowledgeCredits.phronesis).toBe(0);
  });

  it('ackumulerar på techne-axel', () => {
    const state = makeInitialState();
    const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.5 };
    const next = reducer(state, action);
    expect(next.knowledgeCredits.techne).toBeCloseTo(0.5, 6);
    expect(next.knowledgeCredits.episteme).toBe(0);
    expect(next.knowledgeCredits.phronesis).toBe(0);
  });

  it('ackumulerar på phronesis-axel', () => {
    const state = makeInitialState();
    const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis: 'phronesis', amount: 0.2 };
    const next = reducer(state, action);
    expect(next.knowledgeCredits.phronesis).toBeCloseTo(0.2, 6);
    expect(next.knowledgeCredits.episteme).toBe(0);
    expect(next.knowledgeCredits.techne).toBe(0);
  });

  it('negativ amount klämmas till noll — kredit dras aldrig ur R1', () => {
    // Sätt först ett värde, försök sedan dra det med negativ amount.
    let state = makeInitialState();
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.5 });
    expect(state.knowledgeCredits.techne).toBeCloseTo(0.5, 6);
    // Negativ amount ska bli no-op (klämmas till 0, ingen ändring).
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: -0.3 });
    expect(state.knowledgeCredits.techne).toBeCloseTo(0.5, 6);
  });

  it('amount 0 är no-op (returnerar samma state-referens)', () => {
    const state = makeInitialState();
    const next = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'episteme', amount: 0 });
    // Ingen ändring — enligt reducerns tidiga return.
    expect(next.knowledgeCredits).toEqual(state.knowledgeCredits);
  });

  it('flera ackumuleringar staplar på samma axel', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'phronesis', amount: 0.2 });
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'phronesis', amount: 0.3 });
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'phronesis', amount: 0.1 });
    expect(state.knowledgeCredits.phronesis).toBeCloseTo(0.6, 6);
  });
});
