// ORDER 105 §5 — tester för yrkesspår-märkning.
//
// - DoD 2: ORDER 102s 23 tester ska passera oförändrat (verifieras
//   genom att businessProfile.test.ts inte rörs; körningen är i
//   samma svit).
// - DoD 3: ACCUMULATE_KNOWLEDGE tar track, spårlöst är giltigt.
// - DoD 4: readSpar finns som ren funktion med test.
// - DoD 5: två profiler med identiska axelvärden men olika spår går
//   att skilja åt.

import { describe, expect, it } from 'vitest';
import { readSpar, readProfile } from '../businessProfile';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import type { KnowledgeCredits, KnowledgeTracks, SimAction } from '../../types';

// Testhjälpare: konstruera `{credits, tracks}` par utifrån per-axel-spår.
// Håller invarianten axis-total = summa av tracks per axis automatiskt.
function makeTracked(
  axes: Partial<{
    episteme: Partial<{ untagged: number; sommellerie: number; kok: number }>;
    techne: Partial<{ untagged: number; sommellerie: number; kok: number }>;
    phronesis: Partial<{ untagged: number; sommellerie: number; kok: number }>;
  }> = {}
): { credits: KnowledgeCredits; tracks: KnowledgeTracks } {
  const track = (t: Partial<{ untagged: number; sommellerie: number; kok: number }> = {}) => ({
    untagged: t.untagged ?? 0,
    sommellerie: t.sommellerie ?? 0,
    kok: t.kok ?? 0
  });
  const eTracks = track(axes.episteme);
  const tTracks = track(axes.techne);
  const pTracks = track(axes.phronesis);
  return {
    credits: {
      episteme: eTracks.untagged + eTracks.sommellerie + eTracks.kok,
      techne: tTracks.untagged + tTracks.sommellerie + tTracks.kok,
      phronesis: pTracks.untagged + pTracks.sommellerie + pTracks.kok
    },
    tracks: { episteme: eTracks, techne: tTracks, phronesis: pTracks }
  };
}

// -----------------------------------------------------------------------------
// ACCUMULATE_KNOWLEDGE med track-parameter
// -----------------------------------------------------------------------------

describe('ORDER 105 §4.2 — ACCUMULATE_KNOWLEDGE med spårparameter', () => {
  it('spårlös ackumulering (utan track) uppdaterar knowledgeTracks[axis].untagged', () => {
    const state = makeInitialState();
    const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis: 'episteme', amount: 0.4 };
    const next = reducer(state, action);
    expect(next.knowledgeTracks.episteme.untagged).toBeCloseTo(0.4, 6);
    expect(next.knowledgeTracks.episteme.sommellerie).toBe(0);
    expect(next.knowledgeTracks.episteme.kok).toBe(0);
    expect(next.knowledgeCredits.episteme).toBeCloseTo(0.4, 6);
  });

  it('spårat ackumulering (track=sommellerie) uppdaterar knowledgeTracks[axis].sommellerie', () => {
    const state = makeInitialState();
    const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.3, track: 'sommellerie' };
    const next = reducer(state, action);
    expect(next.knowledgeTracks.techne.sommellerie).toBeCloseTo(0.3, 6);
    expect(next.knowledgeTracks.techne.kok).toBe(0);
    expect(next.knowledgeTracks.techne.untagged).toBe(0);
    expect(next.knowledgeCredits.techne).toBeCloseTo(0.3, 6);
  });

  it('spårat ackumulering (track=kok) uppdaterar knowledgeTracks[axis].kok', () => {
    const state = makeInitialState();
    const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.5, track: 'kok' };
    const next = reducer(state, action);
    expect(next.knowledgeTracks.techne.kok).toBeCloseTo(0.5, 6);
    expect(next.knowledgeTracks.techne.sommellerie).toBe(0);
    expect(next.knowledgeCredits.techne).toBeCloseTo(0.5, 6);
  });

  it('invariant: knowledgeCredits[axis] = untagged + sommellerie + kok (efter flera skrivningar)', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.2 });
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.3, track: 'sommellerie' });
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.1, track: 'kok' });
    const t = state.knowledgeTracks.techne;
    expect(state.knowledgeCredits.techne).toBeCloseTo(t.untagged + t.sommellerie + t.kok, 6);
    expect(state.knowledgeCredits.techne).toBeCloseTo(0.6, 6);
  });

  it('negativ amount klämmas (samma regel som ORDER 102) — track-agnostisk', () => {
    let state = makeInitialState();
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: 0.5, track: 'sommellerie' });
    state = reducer(state, { type: 'ACCUMULATE_KNOWLEDGE', axis: 'techne', amount: -0.2, track: 'sommellerie' });
    expect(state.knowledgeTracks.techne.sommellerie).toBeCloseTo(0.5, 6);
  });
});

// -----------------------------------------------------------------------------
// readSpar — spårklasstilldelning
// -----------------------------------------------------------------------------

describe('ORDER 105 §4.3 — readSpar aggregerar och avgör spår-dominans', () => {
  it('inga spårade krediter → neither', () => {
    const { tracks } = makeTracked({});
    expect(readSpar(tracks)).toBe('neither');
  });

  it('bara spårlösa krediter (Bibliotek + Kalastorget) → neither', () => {
    const { tracks } = makeTracked({
      episteme: { untagged: 0.5 },
      phronesis: { untagged: 0.5 }
    });
    expect(readSpar(tracks)).toBe('neither');
  });

  it('övningar bara i Stensöta (techne+sommellerie) → sommellerie', () => {
    const { tracks } = makeTracked({ techne: { sommellerie: 0.6 } });
    expect(readSpar(tracks)).toBe('sommellerie');
  });

  it('övningar bara i Metodköket (techne+kok) → kok', () => {
    const { tracks } = makeTracked({ techne: { kok: 0.6 } });
    expect(readSpar(tracks)).toBe('kok');
  });

  it('övningar i Gastronomiska Teatern (alla tre axlar, båda spåren) → both', () => {
    const { tracks } = makeTracked({
      episteme: { sommellerie: 0.2, kok: 0.2 },
      techne: { sommellerie: 0.2, kok: 0.2 },
      phronesis: { sommellerie: 0.2, kok: 0.2 }
    });
    expect(readSpar(tracks)).toBe('both');
  });

  it('sommellerie 2× kok → sommellerie (dominans-tröskel)', () => {
    const { tracks } = makeTracked({ techne: { sommellerie: 0.4, kok: 0.2 } });
    expect(readSpar(tracks)).toBe('sommellerie');
  });

  it('kok bara 1.5× sommellerie → both (under dominans-tröskel)', () => {
    const { tracks } = makeTracked({ techne: { kok: 0.3, sommellerie: 0.2 } });
    expect(readSpar(tracks)).toBe('both');
  });

  it('totalspårat under golv 0.10 → neither även om asymmetriskt', () => {
    const { tracks } = makeTracked({ techne: { sommellerie: 0.05, kok: 0.02 } });
    expect(readSpar(tracks)).toBe('neither');
  });
});

// -----------------------------------------------------------------------------
// DoD 5 — två profiler med samma axelvärden men olika spår
// -----------------------------------------------------------------------------

describe('ORDER 105 §5 DoD 5 — samma axel-profil, olika spår', () => {
  it('två spelare, båda techne-dominant, ena Stensöta ena Metodköket → olika readSpar', () => {
    // Båda får readProfile = 'foodtruck' (techne-dominant per ORDER 102).
    const stensötaPlayer = makeTracked({ techne: { sommellerie: 0.9 } });
    const metodköketPlayer = makeTracked({ techne: { kok: 0.9 } });

    // ORDER 102-läsning identisk (samma axel-profil).
    expect(readProfile(stensötaPlayer.credits)).toBe('foodtruck');
    expect(readProfile(metodköketPlayer.credits)).toBe('foodtruck');

    // ORDER 105-läsning skiljer dem — R4 kan använda detta för att
    // välja mellan verksamheter med samma profil.
    expect(readSpar(stensötaPlayer.tracks)).toBe('sommellerie');
    expect(readSpar(metodköketPlayer.tracks)).toBe('kok');
  });
});

// -----------------------------------------------------------------------------
// DoD 2 — readProfile beteende oförändrat för spårlös indata
// -----------------------------------------------------------------------------

describe('ORDER 105 §5 DoD 2 — readProfile oförändrad för spårlös indata', () => {
  it('spårlösa krediter ger samma readProfile-resultat som en plain KnowledgeCredits', () => {
    // Konstruera samma vektor på båda former och jämför.
    const plain: KnowledgeCredits = { episteme: 0.7, techne: 0.7, phronesis: 0.7 };
    const { credits } = makeTracked({
      episteme: { untagged: 0.7 },
      techne: { untagged: 0.7 },
      phronesis: { untagged: 0.7 }
    });
    expect(readProfile(plain)).toBe('balanced');
    expect(readProfile(credits)).toBe('balanced');
  });

  it('phronesis-dominant med spårlöst innehåll läses som restaurant (oförändrat från ORDER 102)', () => {
    const { credits } = makeTracked({
      episteme: { untagged: 0.1 },
      techne: { untagged: 0.1 },
      phronesis: { untagged: 0.9 }
    });
    expect(readProfile(credits)).toBe('restaurant');
  });

  it('techne-dominant med bara sommellerie ger fortfarande foodtruck (spår rör inte readProfile)', () => {
    // Motiv: ORDER 105 §2 — "profilavläsningen över sfären är oförändrad.
    // Spåret avgör mellan verksamheter med samma profil, inte vilken profil."
    const { credits, tracks } = makeTracked({
      episteme: { untagged: 0.1 },
      techne: { sommellerie: 0.9 },
      phronesis: { untagged: 0.1 }
    });
    expect(readProfile(credits)).toBe('foodtruck');
    expect(readSpar(tracks)).toBe('sommellerie');
  });
});
