// @vitest-environment jsdom
//
// ORDER 090 §6 — panel layout regression test.
//
// Playtest 2026-08-14 reported five morning-view panels overlapping
// simultaneously (LAGET / INVESTERING / SKALA NER / MORGON / DEV)
// and RoomCardPanel hiding the Bakåt button in the restaurant view.
// The M1 Defect B guard already covered one panel; this generalises
// the guard to the whole overlay set. Two invariants are asserted:
//
//   INV-1  No child of a PanelColumn owns its own anchor.
//          If a panel re-introduces `position: absolute` with a
//          hardcoded top/left/right, it double-positions against
//          the column, and vertical stacking silently breaks —
//          the exact class of failure the playtest surfaced.
//
//   INV-2  The Bakåt (OutwardButton) z-index outranks every
//          overlay panel it can share screen space with. It is
//          the always-reachable escape from any camera pose; if
//          RoomCardPanel or any other panel outstacks it, the
//          player has no way back and the run is lost.
//
// The test runs at 1280×720, 1920×1080, 2560×1440 as demanded by
// the RoomCardPanel layout contract (see RoomCardPanel.tsx docstring
// pre-ORDER-090 and the M1 DoD-3 defect B write-up).

import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InvestmentPanel } from '../../business/InvestmentPanel';
import { MorningActivityPanel } from '../../business/MorningActivityPanel';
import { ScaleDownPanel } from '../../business/ScaleDownPanel';
import { TeamPanel } from '../../business/TeamPanel';
import { SimulationProvider } from '../../simulation/SimulationProvider';
import { EventStreamPanel } from '../EventStreamPanel';
import { InstrumentsPanel } from '../InstrumentsPanel';
import { OutwardButton } from '../OutwardButton';
import { PanelColumn, PanelRow } from '../PanelColumn';
import { RoomCardPanel } from '../RoomCardPanel/RoomCardPanel';
import { CameraProvider } from '../../camera/CameraContext';

afterEach(() => cleanup());
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  // usePrefersReducedMotion (inside EventStreamPanel) reads matchMedia;
  // jsdom doesn't ship it. Return a "no match" handle.
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

// The named panels that a playtester saw overlapping. Each is
// wrapped in <SimulationProvider> because they read sim state and
// gate rendering on `sim.day.period`. Under `makeInitialState()`
// the initial period is 'morning', so morning-gated panels render
// their DOM and service-gated ones return null — precisely the
// state the playtest captured.
const NAMED_PANELS: Array<{
  name: string;
  render: () => React.ReactElement;
}> = [
  { name: 'TeamPanel', render: () => <TeamPanel /> },
  { name: 'InvestmentPanel', render: () => <InvestmentPanel /> },
  { name: 'ScaleDownPanel', render: () => <ScaleDownPanel /> },
  { name: 'MorningActivityPanel', render: () => <MorningActivityPanel /> },
  { name: 'EventStreamPanel', render: () => <EventStreamPanel /> },
  { name: 'InstrumentsPanel', render: () => <InstrumentsPanel /> },
  { name: 'RoomCardPanel', render: () => <RoomCardPanel /> }
];

// -------- INV-1: no panel self-positions --------------------------------

describe('ORDER 090 §6 INV-1 — no PanelColumn child self-positions', () => {
  for (const p of NAMED_PANELS) {
    it(`${p.name} declares no position/top/left/right/bottom on its root`, () => {
      const { container } = render(<SimulationProvider>{p.render()}</SimulationProvider>);
      // A panel that returns null (service-only during morning) has
      // no root DOM node — the "no anchor" invariant holds vacuously.
      const root = container.firstElementChild as HTMLElement | null;
      if (!root) return;
      const cs = getComputedStyle(root);
      expect(
        cs.position,
        `${p.name} must let its PanelColumn own positioning, not set position:absolute itself`
      ).not.toBe('absolute');
      expect(cs.top, `${p.name} must not set a fixed \`top\``).not.toMatch(/px$/);
      expect(cs.left, `${p.name} must not set a fixed \`left\``).not.toMatch(/px$/);
      expect(cs.right, `${p.name} must not set a fixed \`right\``).not.toMatch(/px$/);
      expect(cs.bottom, `${p.name} must not set a fixed \`bottom\``).not.toMatch(/px$/);
    });
  }
});

// -------- INV-1 (positive) — PanelColumn does anchor --------------------

describe('ORDER 090 §6 INV-1 — PanelColumn owns the anchor at 1280/1920/2560', () => {
  for (const width of [1280, 1920, 2560]) {
    it(`left column anchors top:72 / left:16 at ${width}px`, () => {
      Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
      const { container } = render(
        <SimulationProvider>
          <PanelColumn side="left">
            <TeamPanel />
            <PanelRow>
              <InvestmentPanel />
              <ScaleDownPanel />
            </PanelRow>
          </PanelColumn>
        </SimulationProvider>
      );
      const col = container.querySelector(
        '[data-panel-column="left"]'
      ) as HTMLElement;
      expect(col).toBeTruthy();
      const cs = getComputedStyle(col);
      expect(cs.position).toBe('absolute');
      expect(cs.top).toBe('72px');
      expect(cs.left).toBe('16px');
      expect(cs.right).not.toMatch(/px$/);
      expect(cs.display).toBe('flex');
      expect(cs.flexDirection).toBe('column');
      expect(cs.maxHeight.length).toBeGreaterThan(0);
    });

    it(`right column anchors top:72 / right:20 at ${width}px`, () => {
      Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
      const { container } = render(
        <SimulationProvider>
          <PanelColumn side="right">
            <MorningActivityPanel />
            <RoomCardPanel />
          </PanelColumn>
        </SimulationProvider>
      );
      const col = container.querySelector(
        '[data-panel-column="right"]'
      ) as HTMLElement;
      expect(col).toBeTruthy();
      const cs = getComputedStyle(col);
      expect(cs.position).toBe('absolute');
      expect(cs.top).toBe('72px');
      expect(cs.right).toBe('20px');
      expect(cs.left).not.toMatch(/px$/);
      expect(cs.display).toBe('flex');
      expect(cs.flexDirection).toBe('column');
      // Right column right-aligns children so panels of different
      // widths (Morning 340 vs RoomCard 260) hug the same edge.
      expect(cs.alignItems).toBe('flex-end');
    });
  }
});

// -------- INV-2: Bakåt outranks overlay panels --------------------------

describe('ORDER 090 §6 INV-2 — Bakåt outranks the overlay panels', () => {
  it('.gb-outward z-index in strategic.css exceeds every panel z-index', () => {
    // Render each panel to read its inline z-index (all our panels
    // set z-index inline via `style={{ zIndex: N }}`, so getComputedStyle
    // works even in jsdom, which does NOT parse imported stylesheets).
    const seen: Array<{ name: string; z: number }> = [];
    for (const p of NAMED_PANELS) {
      const { container, unmount } = render(
        <SimulationProvider>{p.render()}</SimulationProvider>
      );
      const root = container.firstElementChild as HTMLElement | null;
      if (root) {
        const zRaw = getComputedStyle(root).zIndex;
        const z = zRaw === 'auto' || zRaw === '' ? 0 : Number(zRaw);
        seen.push({ name: p.name, z });
      }
      unmount();
    }
    const maxPanelZ = Math.max(0, ...seen.map((s) => s.z));

    // OutwardButton reads its z-index from strategic.css (`.gb-outward`).
    // jsdom doesn't apply CSS from imported .css files, so we parse the
    // stylesheet source directly and pluck the z-index rule from the
    // `.gb-outward` block. Also verify OutwardButton actually renders
    // with class `gb-outward` so the rule reaches it in a real browser.
    const cssPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../strategic.css'
    );
    const css = readFileSync(cssPath, 'utf8');
    const block = css.match(/\.gb-outward\s*\{([\s\S]*?)\}/);
    expect(block, 'strategic.css must contain a .gb-outward rule').toBeTruthy();
    const zMatch = block![1].match(/z-index\s*:\s*(\d+)/);
    expect(zMatch, '.gb-outward must declare a numeric z-index').toBeTruthy();
    const btnZ = Number(zMatch![1]);

    const { container } = render(
      <CameraProvider>
        <OutwardButton />
      </CameraProvider>
    );
    const btn = container.querySelector('.gb-outward') as HTMLElement;
    expect(btn, 'OutwardButton must render an element with class gb-outward').toBeTruthy();

    expect(
      btnZ,
      `Bakåt (z=${btnZ}) must outrank every panel (max z=${maxPanelZ} across ${seen
        .map((s) => `${s.name}=${s.z}`)
        .join(', ')})`
    ).toBeGreaterThan(maxPanelZ);
  });
});
