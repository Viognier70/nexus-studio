// ORDER 309b (Anders 2026-10-05) — Recensioner i morse visar konceptets rykte
// ("Ryktet som bistro +3", Designs D5), sparat när servicen öppnar
// (day.conceptReputationAtServiceStart). Klasserna utan koncept behåller
// krogens rykte.

import { describe, expect, it } from 'vitest';
import type { SimulationState } from '../../strategic/types';
import { makeNewGameState } from '../../strategic/simulation/model';
import { reducer } from '../../strategic/simulation/reducer';
import { playMorning, tickUntil } from '../../strategic/testHarness/weekHarness';
import { mountRoomLikeScene } from '../../strategic/testHarness/roomParity';
import { firstDayOfWeek } from '../calendar';
import { buildMorningReview, reviewLines } from '../morningReview';
import { reputationByTier } from '../goods';
import { CONSEQUENCES, GUEST_TYPES, REPUTATION } from '../balance';

type Rev = { incidentId: string; right: boolean; severity: 'mild' | 'medium' | 'grave' | null; reputation: number; guestType?: 'gourmet' | 'student' | 'middle' | 'business' | null; conceptReputation?: number | null };

function evening(reviews: Rev[], concept: 'bistro' | 'enkel' | 'soigne' | null, conceptStart: number | null): SimulationState {
  const s = makeNewGameState(1);
  const booking = concept
    ? { dayNumber: s.day.dayNumber, counts: { student: 1, middle: 1, high: 1 }, social: null, walkIns: 0, total: 3, billionaireInTown: false, billionaire: false, concept }
    : undefined;
  return {
    ...s,
    reputation: 0.6,
    reputationByTier: { enkel: 0.5, bistro: 0.4, soigne: 0.3 },
    day: {
      ...s.day,
      reputationAtServiceStart: 0.6,
      conceptReputationAtServiceStart: conceptStart,
      seatedTonight: 10,
      booking,
      answerReviews: reviews.map((r, i) => ({ ...r, table: i + 1 }))
    }
  };
}

const W = CONSEQUENCES.wrong;

describe('ORDER 309b — Recensioner i morse i kvällens koncept', () => {
  it('kortet visar konceptets rykte från servicens öppning till morgonen', () => {
    const ev = evening([], 'bistro', 0.4);
    const r = buildMorningReview(ev, { ...ev, reputation: 0.55, reputationByTier: { enkel: 0.5, bistro: 0.43, soigne: 0.3 } })!;
    expect(r.scope).toBe('concept');
    expect(r.tier).toBe('bistro');
    expect(r.from).toBe(40);
    expect(r.to).toBe(43);
    expect(r.change).toBe(3);
    // Inte krogens tal (60 → 55).
    expect(r.lines!.reduce((a, l) => a + l.delta, 0)).toBe(3);
  });

  it('raderna räknar felen gånger förlåtelsen, och summan är konceptets ändring', () => {
    const graveConcept = W.grave.reputation * GUEST_TYPES.forgiveness.gourmet;
    const mildConcept = W.mild.reputation * GUEST_TYPES.forgiveness.student;
    const ev = evening([
      { incidentId: 'vb01-korken', right: false, severity: 'grave', reputation: W.grave.reputation, guestType: 'gourmet', conceptReputation: graveConcept },
      { incidentId: 'vb01-korken', right: false, severity: 'mild', reputation: W.mild.reputation, guestType: 'student', conceptReputation: mildConcept }
    ], 'bistro', 0.4);
    const end = 0.4 + (graveConcept + mildConcept) / REPUTATION.scale + 0.005;
    const r = buildMorningReview(ev, { ...ev, reputationByTier: { enkel: 0.5, bistro: end, soigne: 0.3 } })!;
    expect(r.scope).toBe('concept');
    const grave = r.lines!.find((l) => l.kind === 'grave')!;
    expect(grave.delta).toBe(Math.round(graveConcept));
    expect(r.lines!.find((l) => l.kind === 'wrong')!.delta).toBe(Math.round(mildConcept));
    expect(r.lines!.reduce((a, l) => a + l.delta, 0)).toBe(r.change);
    expect(r.fromAnswers).toBe(Math.round(graveConcept + mildConcept));
  });

  it('ett äldre svar utan konceptets poäng räknas om med förlåtelsen', () => {
    const ev = evening([{ incidentId: 'vb01-korken', right: false, severity: 'grave', reputation: W.grave.reputation, guestType: 'gourmet' }], 'bistro', 0.4);
    const lines = reviewLines(ev, -20, 3, 'concept');
    expect(lines.find((l) => l.kind === 'grave')!.delta).toBe(Math.round(W.grave.reputation * GUEST_TYPES.forgiveness.gourmet));
    // Krogens rykte: svarets egen poäng.
    expect(reviewLines(ev, -20, 3).find((l) => l.kind === 'grave')!.delta).toBe(Math.round(W.grave.reputation));
  });

  it('klassen utan koncept behåller krogens rykte', () => {
    const ev = evening([], null, null);
    const r = buildMorningReview(ev, { ...ev, reputation: 0.56 })!;
    expect(r.scope).toBe('restaurant');
    expect(r.tier).toBeNull();
    expect(r.from).toBe(60);
    expect(r.to).toBe(56);
  });

  it('ett koncept utan sparat startvärde (äldre sparfil) visar krogens rykte', () => {
    const ev = evening([], 'bistro', null);
    const r = buildMorningReview(ev, { ...ev, reputation: 0.56 })!;
    expect(r.scope).toBe('restaurant');
    expect(r.from).toBe(60);
  });

  it('servicen sparar konceptets rykte när dörrarna öppnar, och morgonen läser det', () => {
    let s = makeNewGameState(4);
    s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
    s = playMorning(s, {});
    s = { ...s, reputationByTier: { enkel: 0.21, bistro: 0.37, soigne: 0.12 } };
    mountRoomLikeScene(s.businessClass);
    s = reducer(s, { type: 'START_SERVICE' });
    const concept = s.day.booking?.concept;
    expect(concept).toBeTruthy();
    const startValue = s.day.conceptReputationAtServiceStart;
    expect(startValue).toBe({ enkel: 0.21, bistro: 0.37, soigne: 0.12 }[concept!]);
    const day = s.day.dayNumber;
    s = tickUntil(s, (x) => x.day.dayNumber !== day);
    const r = s.day.morningReview!;
    expect(r).toBeTruthy();
    expect(r.scope).toBe('concept');
    expect(r.tier).toBe(concept);
    expect(r.from).toBe(Math.round(startValue! * REPUTATION.scale));
    expect(r.to).toBe(Math.round(reputationByTier(s)[concept!] * REPUTATION.scale));
    expect(r.lines!.reduce((a, l) => a + l.delta, 0)).toBe(r.change);
    // Den nya dagen börjar utan startvärde.
    expect(s.day.conceptReputationAtServiceStart ?? null).toBeNull();
  });
});
