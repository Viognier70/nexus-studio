// @vitest-environment jsdom
//
// Test för TEMPORÄR dockskåps-växel (Vision Owner-begäran 2026-08-15).
//
// Verifierar (a) att komponenten renderar en igenkännlig SVG-ram med
// bakvägg + två öppningar, (b) att dess `pointer-events: none`-regel
// står — ORDER 096 §4 + SD-003 §6 säger att figurlagret aldrig får
// blockera klick, och även om ramen ännu är tom sätter vi regeln så
// tillägget i följdordern inte råkar avvika.

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DollhouseFrame } from '../DollhouseFrame';

describe('DollhouseFrame — temporär rekognosering', () => {
  it('renderar en SVG-ram med bakvägg + två öppningar', () => {
    const { container } = render(<DollhouseFrame />);
    // Två öppningar med data-attribut, en per sida.
    const openings = container.querySelectorAll('[data-opening]');
    expect(openings.length).toBe(2);
    const openingKeys = Array.from(openings)
      .map((el) => el.getAttribute('data-opening'))
      .sort();
    expect(openingKeys).toEqual(['bar', 'kok']);
  });

  it('figurlagret har pointer-events: none (SD-003 §6)', () => {
    const { container } = render(<DollhouseFrame />);
    const root = container.querySelector('[data-dollhouse-frame]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.pointerEvents).toBe('none');
  });

  it('rekognoseringstexten markerar formen som temporär', () => {
    const { container } = render(<DollhouseFrame />);
    const text = container.querySelector('text');
    expect(text?.textContent).toContain('temporär rekognosering');
  });
});
