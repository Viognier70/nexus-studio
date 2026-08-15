// @vitest-environment jsdom
//
// Test för TEMPORÄR dockskåps-växel (Vision Owner-begäran 2026-08-15/16).
//
// Verifierar SD-003 §2 alt C-mekaniken:
//   (a) SVG-ramen har två öppningar i initial-fokus (mot kok + bar)
//   (b) Öppningarna har `pointer-events: auto` — klickytorna opta in
//       eftersom containern är `pointer-events: none` per §6
//   (c) Klick på en öppning byter fokusrum: det tidigare fokusrummet
//       blir öppning i det nya rummets bakvägg
//   (d) Öppningen har horisontell proportion (bredare än hög) — läses
//       som passluckan/bardisken, inte som dörr in i eget rum
//   (e) Scen-bredden räknas mot fönster minus MÄTTA panel-insets,
//       inte mot hela `window.innerWidth`, och inte via hårdkodade tal
//   (f) Verifiering vid 1280, 1920 och 2560 viewportbredder.
//
// **jsdom-not:** `getBoundingClientRect()` returnerar 0 i jsdom eftersom
// ingen layout körs. Vi mockar den per test för att simulera att en
// PanelColumn har en viss uppmätt bredd.

import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { DollhouseFrame } from '../DollhouseFrame';

function mockRectFor(el: Element, width: number) {
  el.getBoundingClientRect = () => ({
    x: 0, y: 0, width, height: 100, top: 0, left: 0, right: width, bottom: 100,
    toJSON: () => ({})
  }) as DOMRect;
}

beforeEach(() => {
  // Rensa alla panel-column-elementer före varje test.
  document.body.innerHTML = '';
});

describe('DollhouseFrame — SD-003 §2 alt C (rev. 2, 2026-08-16)', () => {
  // ---------------------------------------------------------------------------
  // (a) + (c) fokusrum-swap-mekaniken
  // ---------------------------------------------------------------------------

  it('initial fokus = fokusrum: öppningarna leder mot kok + bar', () => {
    const { container } = render(<DollhouseFrame />);
    const openings = Array.from(container.querySelectorAll('[data-opening]'))
      .map((el) => el.getAttribute('data-opening'))
      .sort();
    expect(openings).toEqual(['bar', 'kok']);
  });

  it('klick på kok-öppning byter fokus → nya öppningar mot fokusrum + bar', () => {
    const { container } = render(<DollhouseFrame />);
    const kokOpening = container.querySelector('[data-opening="kok"]')!;
    // Klickytan är den transparenta rect som ligger efter counter-linjen
    // (data-opening = fill rect, sedan line, sedan transparent click rect).
    const clickTarget = container.querySelectorAll('rect[fill="transparent"]')[0] as SVGElement;
    // Klickytan för kok kommer först i DOM (kok = vänster öppning i initial-fokus).
    void kokOpening;
    fireEvent.click(clickTarget);
    const openings = Array.from(container.querySelectorAll('[data-opening]'))
      .map((el) => el.getAttribute('data-opening'))
      .sort();
    expect(openings).toEqual(['bar', 'fokusrum']);
  });

  it('rums-etiketten uppdateras vid fokus-byte', () => {
    const { container } = render(<DollhouseFrame />);
    // Klicka på bar-öppningen (höger, dvs andra klickytan)
    const clickTargets = container.querySelectorAll('rect[fill="transparent"]');
    fireEvent.click(clickTargets[1] as SVGElement);
    const barLabel = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent === 'Baren');
    expect(barLabel).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // (b) pointer-events: auto på klickytorna
  // ---------------------------------------------------------------------------

  it('öppningarnas klickytor har pointer-events: auto (opt-in mot §6)', () => {
    const { container } = render(<DollhouseFrame />);
    const clickables = container.querySelectorAll('rect[fill="transparent"]');
    expect(clickables.length).toBe(2);
    for (const el of Array.from(clickables)) {
      expect((el as HTMLElement).style.pointerEvents).toBe('auto');
      expect((el as HTMLElement).style.cursor).toBe('pointer');
    }
  });

  it('rot-elementet har pointer-events: none (SD-003 §6)', () => {
    const { container } = render(<DollhouseFrame />);
    const root = container.querySelector('[data-dollhouse-frame]') as HTMLElement;
    expect(root.style.pointerEvents).toBe('none');
  });

  // ---------------------------------------------------------------------------
  // (d) öppningens form är passluckan/bardisken (horisontell), inte dörr
  // ---------------------------------------------------------------------------

  it('öppningens form är horisontell (bredare än hög) — passluckan/bardisken, inte dörr', () => {
    const { container } = render(<DollhouseFrame />);
    const opening = container.querySelector('[data-opening="kok"]') as SVGRectElement;
    const w = Number(opening.getAttribute('width'));
    const h = Number(opening.getAttribute('height'));
    expect(w).toBeGreaterThan(h);
    // Bredd/höjd ratio ≥ 1.5 = tydligt horisontell (vs ~0.4 för en dörr).
    expect(w / h).toBeGreaterThanOrEqual(1.5);
  });

  it('öppning-etiketten namnger sorten (passluckan / bardisken)', () => {
    const { container } = render(<DollhouseFrame />);
    const texts = Array.from(container.querySelectorAll('text')).map((el) => el.textContent);
    // Etiketterna "passluckan · Köket" och "bardisken · Baren" ska finnas.
    expect(texts.some((t) => t?.includes('passluckan') && t?.includes('Köket'))).toBe(true);
    expect(texts.some((t) => t?.includes('bardisken') && t?.includes('Baren'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // (e) + (f) MÄTT scenbredd vid 1280 / 1920 / 2560
  // ---------------------------------------------------------------------------

  it('utan panel-kolumner i DOM: sceneWidth = viewport − default-reserv (2560)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 2560, configurable: true });
    const { container } = render(<DollhouseFrame />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    // 2560 − 360 (default left) − 340 (default right) = 1860
    expect(svg.style.width).toBe('1860px');
  });

  it('med mätta panel-kolumner: sceneWidth = viewport − uppmätt-bredder', () => {
    // Rendera fake panel-kolumner i DOM:en först.
    const leftCol = document.createElement('div');
    leftCol.setAttribute('data-panel-column', 'left');
    const rightCol = document.createElement('div');
    rightCol.setAttribute('data-panel-column', 'right');
    document.body.appendChild(leftCol);
    document.body.appendChild(rightCol);
    // Mocka getBoundingClientRect så mätningen returnerar 300/280 px.
    mockRectFor(leftCol, 300);
    mockRectFor(rightCol, 280);

    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    const { container } = render(<DollhouseFrame />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    // 1920 − (300 + 24 margin) − (280 + 24 margin) = 1920 − 324 − 304 = 1292
    expect(svg.style.width).toBe('1292px');
  });

  it('viewport 2560 med mätta paneler: full-bredd (över 2240 gräns)', () => {
    const leftCol = document.createElement('div');
    leftCol.setAttribute('data-panel-column', 'left');
    const rightCol = document.createElement('div');
    rightCol.setAttribute('data-panel-column', 'right');
    document.body.appendChild(leftCol);
    document.body.appendChild(rightCol);
    mockRectFor(leftCol, 320);
    mockRectFor(rightCol, 260);

    Object.defineProperty(window, 'innerWidth', { value: 2560, configurable: true });
    const { container } = render(<DollhouseFrame />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    // 2560 − 344 − 284 = 1932. Under 2240 → panorering krävs.
    expect(svg.style.width).toBe('1932px');
    const metaText = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent?.includes('panorering krävs'));
    expect(metaText, 'panorering-varning ska visas när 1932 < 2240').toBeTruthy();
  });

  it('viewport 1280 med mätta paneler: kritiskt smalt (panorering krävs)', () => {
    const leftCol = document.createElement('div');
    leftCol.setAttribute('data-panel-column', 'left');
    const rightCol = document.createElement('div');
    rightCol.setAttribute('data-panel-column', 'right');
    document.body.appendChild(leftCol);
    document.body.appendChild(rightCol);
    mockRectFor(leftCol, 280);
    mockRectFor(rightCol, 240);

    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    const { container } = render(<DollhouseFrame />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    // 1280 − 304 − 264 = 712
    expect(svg.style.width).toBe('712px');
    const metaText = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent?.includes('panorering krävs'));
    expect(metaText).toBeTruthy();
  });

  it('sceneWidth-formeln inkluderar metadata-raden med båda insets', () => {
    const leftCol = document.createElement('div');
    leftCol.setAttribute('data-panel-column', 'left');
    const rightCol = document.createElement('div');
    rightCol.setAttribute('data-panel-column', 'right');
    document.body.appendChild(leftCol);
    document.body.appendChild(rightCol);
    mockRectFor(leftCol, 300);
    mockRectFor(rightCol, 260);
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    const { container } = render(<DollhouseFrame />);
    // Metadata-text ska nämna både vä och hö insets så det är läsbart
    // vad scenbredden räknades mot.
    const meta = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent?.includes('viewport'));
    expect(meta?.textContent).toMatch(/vä.*hö/);
  });
});
