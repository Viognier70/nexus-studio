// @vitest-environment jsdom
//
// Test för TEMPORÄR dockskåps-växel (Vision Owner-begäran 2026-08-15,
// rev. 2 med fokusrum-swap 2026-08-16).
//
// Verifierar:
//   (a) SVG-ramen har två öppningar i initial-fokus (mot kok + bar)
//   (b) Öppningarna har `pointer-events: auto` — klickytorna måste opta
//       in eftersom containern är pointer-events: none per SD-003 §6
//   (c) Klick på en öppning byter fokusrum: det tidigare fokusrummet
//       blir öppning i det nya rummets bakvägg
//   (d) Scen-bredden räknas mot fönster minus panel-reserv, inte mot
//       hela `window.innerWidth`

import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { DollhouseFrame } from '../DollhouseFrame';

describe('DollhouseFrame — temporär rekognosering (rev. 2)', () => {
  it('initial fokus = fokusrum: öppningarna leder mot kok + bar', () => {
    const { container } = render(<DollhouseFrame />);
    const openings = Array.from(container.querySelectorAll('[data-opening]'))
      .map((el) => el.getAttribute('data-opening'))
      .sort();
    expect(openings).toEqual(['bar', 'kok']);
  });

  it('öppningarnas klickytor har pointer-events: auto (opt-in mot §6)', () => {
    const { container } = render(<DollhouseFrame />);
    // Klickytan är den TRANSPARENTA rect som ligger ovanpå [data-opening]-
    // fyllningen. Den har pointer-events: auto explicit.
    const clickables = container.querySelectorAll('rect[fill="transparent"]');
    expect(clickables.length).toBe(2);
    for (const el of Array.from(clickables)) {
      expect((el as HTMLElement).style.pointerEvents).toBe('auto');
      expect((el as HTMLElement).style.cursor).toBe('pointer');
    }
  });

  it('klick på kok-öppning byter fokus → nya öppningar mot fokusrum + bar', () => {
    const { container } = render(<DollhouseFrame />);
    const kokOpening = container.querySelector('[data-opening="kok"]')!;
    // Klick på klickytan (transparent rect direkt efter öppningen)
    const clickTarget = kokOpening.nextSibling as SVGElement;
    fireEvent.click(clickTarget);
    // Efter klicket: fokus = 'kok'. De nya öppningarna leder mot
    // fokusrum + bar (det tidigare fokusrummet blir öppning per §2).
    const openings = Array.from(container.querySelectorAll('[data-opening]'))
      .map((el) => el.getAttribute('data-opening'))
      .sort();
    expect(openings).toEqual(['bar', 'fokusrum']);
  });

  it('rums-etiketten uppdateras vid fokus-byte', () => {
    const { container } = render(<DollhouseFrame />);
    // Initialt: Matsalen (fokusrum)
    const initialLabel = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent === 'Matsalen');
    expect(initialLabel).toBeTruthy();
    // Klicka på bar-öppningen
    const barOpening = container.querySelector('[data-opening="bar"]')!;
    fireEvent.click(barOpening.nextSibling as SVGElement);
    // Nu ska etiketten vara Baren
    const barLabel = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent === 'Baren');
    expect(barLabel).toBeTruthy();
  });

  it('scenbredden räknas mot fönstret minus panel-reserv', () => {
    // Simulera 2560 px viewport → sceneWidth = 2560 − 360 − 340 = 1860 px
    Object.defineProperty(window, 'innerWidth', { value: 2560, configurable: true });
    const { container } = render(<DollhouseFrame />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    // width sätts som inline style på SVG:n (siffra, inte procent)
    expect(svg.style.width).toBe('1860px');
  });

  it('panorering-varning visas när scenen är smalare än 2240 px', () => {
    // 1920 px viewport → sceneWidth = 1920 − 700 = 1220 → panorering krävs
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    const { container } = render(<DollhouseFrame />);
    const metaText = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent?.includes('panorering krävs'));
    expect(metaText).toBeTruthy();
  });

  it('rot-elementet har pointer-events: none (SD-003 §6)', () => {
    const { container } = render(<DollhouseFrame />);
    const root = container.querySelector('[data-dollhouse-frame]') as HTMLElement;
    expect(root.style.pointerEvents).toBe('none');
  });
});
