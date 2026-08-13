// @vitest-environment jsdom
//
// ORDER 078 (M5) — DoD 4 verification.
//
// "Stream panel never renders taller than its contents." Two
// checks together satisfy the DoD:
//
//  1. Structural: PANEL_STYLE in EventStreamPanel.tsx must NOT set
//     `height`, `minHeight`, `maxHeight` or `overflow` — because any
//     of these fixes or crops the panel's size independent of its
//     contents. This is the mechanic. jsdom cannot compute layout
//     boxes (offsetHeight returns 0), so a structural style check is
//     the correct autonomous test.
//
//  2. Content: with N entries the panel emits exactly min(N, 4)
//     entry rows (VISIBLE_ENTRIES = 4 cap per ORDER 047 §3). Zero
//     entries → zero rows. This proves the DOM tree grows with
//     content, not up to a fixed reserve.

import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SimulationState } from '../../types';

// jsdom stubs — usePrefersReducedMotion calls window.matchMedia which
// jsdom does not ship. Return a no-match handle so components fall
// through to "motion allowed" defaults.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
});

// Read source file for the structural check — no rendering needed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const PANEL_SOURCE = readFileSync(resolve(THIS_DIR, '..', 'EventStreamPanel.tsx'), 'utf8');

// Mock the sim state hook so we control the eventStream contents
// without spinning up a whole SimulationProvider tree.
const mockState = vi.hoisted(() => ({ current: null as SimulationState | null }));
vi.mock('../../simulation/SimulationProvider', () => ({
  useSimState: () => mockState.current
}));

// Silence the arrival-cue audio side effect during render.
vi.mock('../streamArrivalCue', () => ({
  playStreamArrivalCue: () => {}
}));

import { EventStreamPanel } from '../EventStreamPanel';

function makeMinimalState(entryTexts: readonly string[]): SimulationState {
  return {
    eventStream: entryTexts.map((text, i) => ({
      at: 100 + i,
      text,
      category: 'ambient' as const,
      causeTag: null,
      causeChainId: null,
      sustainability: 'social' as const,
      kind: 'test',
      scenarioId: null
    })),
    speed: 1,
    // Panel only renders during 'lunch' | 'dinner'. Set day.period
    // so the gate opens. Other fields are `undefined` behind a cast.
    day: { period: 'dinner' as const },
    // Panel reads simTime for arrival animations; a stable number
    // is enough (jsdom won't run the transitions anyway).
    simTime: 500
  } as unknown as SimulationState;
}

afterEach(() => {
  cleanup();
  mockState.current = null;
});

describe('EventStreamPanel — M5 DoD 4: sizes to contents, never larger', () => {
  it('PANEL_STYLE does not set height, minHeight, maxHeight, or overflow', () => {
    // Structural check — the panel's outer style block must not fix
    // its box. Grep the source (fast, no false-positive from unrelated
    // ENTRY_BASE_STYLE / ARRIVAL_* blocks matching a substring).
    const panelBlock = PANEL_SOURCE.match(/const PANEL_STYLE:[^=]*=\s*{[\s\S]*?};/);
    expect(panelBlock, 'PANEL_STYLE block not found in EventStreamPanel.tsx').toBeTruthy();
    const src = panelBlock![0];
    for (const forbidden of ['height:', 'minHeight:', 'maxHeight:', 'overflow:']) {
      expect(src.includes(forbidden),
        `PANEL_STYLE contains '${forbidden}' — that fixes or crops the panel size ` +
        `independent of contents, violating M5 DoD 4.`
      ).toBe(false);
    }
  });

  it('emits zero entry rows when eventStream is empty', () => {
    mockState.current = makeMinimalState([]);
    const { container } = render(<EventStreamPanel />);
    // The panel component may render nothing at all (returns null)
    // when there are no entries. Either 0 elements in container, OR
    // a container with no elements bearing the entry style — both
    // count as "sized to contents = zero".
    const entryDivs = container.querySelectorAll('div > div');
    expect(entryDivs.length, `expected 0 nested entry divs with empty stream, got ${entryDivs.length}`)
      .toBe(0);
  });

  it('emits one entry row when eventStream has one entry', () => {
    mockState.current = makeMinimalState(['A line just landed.']);
    const { container } = render(<EventStreamPanel />);
    expect(container.textContent, 'expected the single entry text to appear in rendered output')
      .toContain('A line just landed.');
  });

  it('emits at most VISIBLE_ENTRIES (=4) rows even when eventStream has more', () => {
    mockState.current = makeMinimalState([
      'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'
    ]);
    const { container } = render(<EventStreamPanel />);
    // The visible slice is the most recent 4. Older lines drop off
    // per ORDER 047 §3.
    const text = container.textContent ?? '';
    // The last four (Five..Eight) must appear; the first four
    // (One..Four) must NOT.
    for (const shown of ['Five', 'Six', 'Seven', 'Eight']) {
      expect(text, `expected '${shown}' to render (last 4)`).toContain(shown);
    }
    for (const hidden of ['One', 'Two', 'Three', 'Four']) {
      expect(text, `expected '${hidden}' to be off-screen (VISIBLE_ENTRIES cap)`).not.toContain(hidden);
    }
  });
});
