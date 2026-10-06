// @vitest-environment jsdom
// ORDER 309c (Anders 2026-10-06) — Recensioner i morse visar både konceptets
// och krogens ryktesändring, t.ex. "Ryktet som bistro +3 · Krogens rykte +1"
// (och på engelska). Klasserna utan koncept visar bara krogens.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import type { SimulationState } from '../../strategic/types';
import { makeNewGameState } from '../../strategic/simulation/model';
import { buildMorningReview, reviewChanges, type MorningReview } from '../morningReview';
import { setLanguage } from '../../content/language';
import { stringsFor } from '../../content/strings';

let simForCard: SimulationState;
vi.mock('../../strategic/simulation/SimulationProvider', () => ({ useSimState: () => simForCard }));
vi.mock('../../hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => true }));
const { MorningReviewCard } = await import('../../strategic/ui/MorningReviewLine');

function evening(concept: 'bistro' | null, conceptStart: number | null): SimulationState {
  const s = makeNewGameState(1);
  const booking = concept
    ? { dayNumber: s.day.dayNumber, counts: { student: 1, middle: 1, high: 1 }, social: null, walkIns: 0, total: 3, billionaireInTown: false, billionaire: false, concept }
    : undefined;
  return {
    ...s,
    reputation: 0.6,
    reputationByTier: { enkel: 0.5, bistro: 0.4, soigne: 0.3 },
    day: { ...s.day, reputationAtServiceStart: 0.6, conceptReputationAtServiceStart: conceptStart, seatedTonight: 10, booking, answerReviews: [] }
  };
}

/** Bistron +3 (40 → 43), krogen +1 (60 → 61). */
const bistro = () => {
  const ev = evening('bistro', 0.4);
  return buildMorningReview(ev, { ...ev, reputation: 0.61, reputationByTier: { enkel: 0.5, bistro: 0.43, soigne: 0.3 } })!;
};
/** Ingen koncept: krogen −2 (60 → 58). */
const plain = () => {
  const ev = evening(null, null);
  return buildMorningReview(ev, { ...ev, reputation: 0.58 })!;
};

function cardText(review: MorningReview): HTMLElement | null {
  const s = makeNewGameState(1);
  simForCard = { ...s, day: { ...s.day, period: 'morning', morningReview: review } };
  const { container } = render(createElement(MorningReviewCard));
  return container.querySelector('[data-testid=morning-review-changes]');
}

describe('ORDER 309c — 1. talen', () => {
  it('med koncept: konceptets ändring och krogens, var för sig', () => {
    const r = bistro();
    expect(r.scope).toBe('concept');
    expect(r.change).toBe(3);
    expect(r.restaurant).toEqual({ from: 60, to: 61, change: 1 });
    expect(reviewChanges(r)).toEqual({ concept: 3, restaurant: 1 });
  });

  it('utan koncept: bara krogens, samma som kortets ändring', () => {
    const r = plain();
    expect(r.scope).toBe('restaurant');
    expect(r.restaurant).toEqual({ from: 60, to: 58, change: -2 });
    expect(reviewChanges(r)).toEqual({ concept: null, restaurant: -2 });
  });

  it('ett äldre kort utan krogens tal: utan koncept kortets ändring, med koncept bara konceptets', () => {
    const { restaurant: _a, ...oldPlain } = plain();
    expect(reviewChanges(oldPlain)).toEqual({ concept: null, restaurant: -2 });
    const { restaurant: _b, ...oldBistro } = bistro();
    expect(reviewChanges(oldBistro)).toEqual({ concept: 3, restaurant: null });
  });
});

describe('ORDER 309c — 2. kortet', () => {
  afterEach(() => { cleanup(); act(() => setLanguage('en')); });

  it('svenska: "Ryktet som bistro +3 · Krogens rykte +1"', () => {
    act(() => setLanguage('sv'));
    const el = cardText(bistro());
    expect(el?.textContent).toBe('Ryktet som bistro +3 · Krogens rykte +1');
    expect(el?.getAttribute('data-concept-change')).toBe('3');
    expect(el?.getAttribute('data-restaurant-change')).toBe('1');
  });

  it('engelska: "Reputation as a bistro +3 · Your venue’s reputation +1"', () => {
    act(() => setLanguage('en'));
    expect(cardText(bistro())?.textContent).toBe('Reputation as a bistro +3 · Your venue’s reputation +1');
  });

  it('klassen utan koncept: bara krogens rykte, med minustecken', () => {
    act(() => setLanguage('sv'));
    const el = cardText(plain());
    expect(el?.textContent).toBe('Krogens rykte −2');
    expect(el?.getAttribute('data-concept-change')).toBe('');
    act(() => setLanguage('en'));
    cleanup();
    expect(cardText(plain())?.textContent).toBe('Your venue’s reputation −2');
  });

  it('strängarna finns på svenska och engelska, ±0 utan ändring', () => {
    const sv = stringsFor('sv').foljder.review;
    const en = stringsFor('en').foljder.review;
    expect(sv.venueChange(0)).toBe('Krogens rykte ±0');
    expect(en.classChange('Bistro', -4)).toBe('Reputation as a bistro −4');
  });
});
