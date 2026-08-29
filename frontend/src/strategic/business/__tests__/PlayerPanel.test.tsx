// ORDER 120 — Rykte-trend på stängda pillen.
//
// ORDER 117 §5.2 lade trend-glyfen på Reading-raden inuti öppnad panel.
// ORDER 120 drar trend-glyfen till själva Cash-pillen så spelaren ser
// riktningen utan att klicka öppen panelen.
//
// Testerna täcker DoD 1 (grep + villkorlig rendering), DoD 2 (regression
// på §5.2:s Reading-rad), DoD 5 (aria-label), DoD 6 (DOM-struktur).
// DoD 7 (visuell verifikation i verklig layout) körs separat via
// scripts/order120-pill-trend-visibility.mjs — jsdom har ingen layout-motor
// så bounding-box-kontroll måste ligga i playwright.

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlayerPanel } from '../PlayerPanel';
import { SimStateCtx, SimDispatchCtx } from '../../simulation/SimulationProvider';
import { makeInitialState } from '../../simulation/model';
import type { SimulationState } from '../../types';

function withProvider(state: SimulationState): ReactNode {
  return (
    <SimStateCtx.Provider value={state}>
      <SimDispatchCtx.Provider value={() => {}}>
        <PlayerPanel />
      </SimDispatchCtx.Provider>
    </SimStateCtx.Provider>
  );
}

function stateWithTrend(effectiveValueQuota: number): SimulationState {
  const base = makeInitialState();
  return { ...base, effectiveValueQuota };
}

// TREND_UP_THRESHOLD = 1.10, TREND_DOWN_THRESHOLD = 0.90 per valueQuota.ts.
// Väljer värden en bra bit ovanför/nedanför tröskeln så testerna inte är
// tröskel-känsliga vid framtida justering av trösklarna.
const UP_STATE = stateWithTrend(1.5);
const DOWN_STATE = stateWithTrend(0.5);
const FLAT_STATE = stateWithTrend(1.0);

describe('ORDER 120 DoD 1 — pillen visar trend', () => {
  it('trend=up → pillen har [data-reputation-trend="up"]', () => {
    const { container } = render(withProvider(UP_STATE));
    const pill = container.querySelector('button[aria-label="Cash on hand"]');
    expect(pill).toBeTruthy();
    const glyph = pill!.querySelector('[data-reputation-trend="up"]');
    expect(glyph).toBeTruthy();
  });

  it('trend=down → pillen har [data-reputation-trend="down"]', () => {
    const { container } = render(withProvider(DOWN_STATE));
    const pill = container.querySelector('button[aria-label="Cash on hand"]');
    const glyph = pill!.querySelector('[data-reputation-trend="down"]');
    expect(glyph).toBeTruthy();
  });

  it('trend=flat → pillen har INGET [data-reputation-trend]-attribut', () => {
    const { container } = render(withProvider(FLAT_STATE));
    const pill = container.querySelector('button[aria-label="Cash on hand"]');
    expect(pill).toBeTruthy();
    // Vid flat ska pillen vara tyst — inget trend-attribut alls, inte ens tomt.
    expect(pill!.querySelector('[data-reputation-trend]')).toBeNull();
  });
});

describe('ORDER 120 DoD 2 — §5.2:s Reading-rad orörd (regression)', () => {
  it('öppnad panel → Rykte-Reading-raden har fortfarande [data-reputation-trend]', () => {
    const { container } = render(withProvider(UP_STATE));
    const pill = container.querySelector('button[aria-label="Cash on hand"]');
    fireEvent.click(pill!);

    // Efter öppning: två noder ska ha data-reputation-trend — pillen och
    // Reading-raden i öppnad panel. §5.2 rörs inte, den ska finnas kvar.
    const trendNodes = container.querySelectorAll('[data-reputation-trend]');
    expect(trendNodes.length).toBeGreaterThanOrEqual(2);

    // Verifiera att en av dem ligger inuti öppnad panel (region "Business account").
    const panel = container.querySelector('[aria-label="Business account"]');
    expect(panel).toBeTruthy();
    expect(panel!.querySelector('[data-reputation-trend]')).toBeTruthy();
  });
});

describe('ORDER 120 DoD 5 — skärmläsare + tooltip', () => {
  it('trend=up → aria-label "rykte trend uppåt"', () => {
    const { container } = render(withProvider(UP_STATE));
    const glyph = container.querySelector('button[aria-label="Cash on hand"] [data-reputation-trend="up"]');
    expect(glyph!.getAttribute('aria-label')).toBe('rykte trend uppåt');
    expect(glyph!.getAttribute('title')).toBe('Rykte-trend uppåt');
  });

  it('trend=down → aria-label "rykte trend nedåt"', () => {
    const { container } = render(withProvider(DOWN_STATE));
    const glyph = container.querySelector('button[aria-label="Cash on hand"] [data-reputation-trend="down"]');
    expect(glyph!.getAttribute('aria-label')).toBe('rykte trend nedåt');
    expect(glyph!.getAttribute('title')).toBe('Rykte-trend nedåt');
  });
});

describe('ORDER 120 DoD 6 — DOM-struktur', () => {
  it('trend-glyfen är direkt barn till <button> (inte nästad i Cash-value-spannen)', () => {
    const { container } = render(withProvider(UP_STATE));
    const pill = container.querySelector('button[aria-label="Cash on hand"]');
    const glyph = pill!.querySelector('[data-reputation-trend="up"]');
    // parentElement ska vara själva button-noden, inte en inre span.
    expect(glyph!.parentElement).toBe(pill);
  });

  it('trend-glyfen kommer efter Cash-value-spannen och före ▾-toggleln', () => {
    const { container } = render(withProvider(UP_STATE));
    const pill = container.querySelector('button[aria-label="Cash on hand"]');
    const children = Array.from(pill!.children);

    const cashLabelIdx = children.findIndex((c) => c.textContent === 'Cash');
    const cashValueIdx = children.findIndex((c) => /kSEK$/.test(c.textContent ?? ''));
    const glyphIdx = children.findIndex((c) => c.hasAttribute('data-reputation-trend'));
    const toggleIdx = children.findIndex((c) => c.textContent === '▾' || c.textContent === '▴');

    expect(cashLabelIdx).toBeGreaterThanOrEqual(0);
    expect(cashValueIdx).toBeGreaterThan(cashLabelIdx);
    expect(glyphIdx).toBeGreaterThan(cashValueIdx);
    expect(toggleIdx).toBeGreaterThan(glyphIdx);
  });

  it('trend-glyfen har textContent = ▲ (up) eller ▼ (down), aldrig · (flat)', () => {
    const { container: cUp } = render(withProvider(UP_STATE));
    const glyphUp = cUp.querySelector('button[aria-label="Cash on hand"] [data-reputation-trend]');
    expect(glyphUp!.textContent).toBe('▲');

    const { container: cDown } = render(withProvider(DOWN_STATE));
    const glyphDown = cDown.querySelector('button[aria-label="Cash on hand"] [data-reputation-trend]');
    expect(glyphDown!.textContent).toBe('▼');
  });

  it('trend-glyfen har inline fontSize > 0 (nödvändigt villkor för synlighet — visuell verifikation via scripts/order120)', () => {
    const { container } = render(withProvider(UP_STATE));
    const glyph = container.querySelector('button[aria-label="Cash on hand"] [data-reputation-trend]') as HTMLElement;
    // Jsdom sätter inte layout men läser inline styles.
    const fontSize = glyph.style.fontSize;
    expect(fontSize).not.toBe('');
    // "12px" eller "12" beroende på jsdom-version — kolla numerisk parsning.
    const px = parseFloat(fontSize);
    expect(px).toBeGreaterThan(0);
  });
});
