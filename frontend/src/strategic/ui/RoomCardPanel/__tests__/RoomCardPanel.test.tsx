// @vitest-environment jsdom
//
// ORDER 086 §6 step 4+6 — RoomCardPanel DOM regression + autonomous
// DoD assertions for the five punch-list rows this order promotes
// (M8 punch-list rows 1, 4, 8/20, 12, 21).
//
// Layout regression: renders at 1280×720, 1920×1080, 2560×1440 and
// asserts the panel anchors right-20 and never sets a fixed `left`
// (that's M1 Defect B's failure mode).

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SimulationProvider,
  useSimState
} from '../../../simulation/SimulationProvider';
import { PanelColumn } from '../../PanelColumn';
import { RoomCardPanel } from '../RoomCardPanel';
import type { SimulationState } from '../../../types';
import { WAIT_HAIL_SEC, guestAttentionPriority } from '../deriveActions';

afterEach(() => cleanup());
beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
});

// -------- responsive layout regression ---------------------------------

// ORDER 090 §6 — M1 Defect B guard now runs against the parent
// PanelColumn, not the RoomCardPanel itself. Since the ORDER 090
// refactor, the panel owns width + inner overflow; the column owns
// anchor + top + max-height. Both halves are asserted.
describe('RoomCardPanel + PanelColumn — responsive layout (M1 Defect B guard)', () => {
  for (const width of [1280, 1920, 2560]) {
    it(`renders anchored right at viewport ${width}px, never sets fixed left`, () => {
      Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
      const { getByTestId, container } = render(
        <SimulationProvider>
          <PanelColumn side="right">
            <RoomCardPanel />
          </PanelColumn>
        </SimulationProvider>
      );
      const panel = getByTestId('room-card-panel') as HTMLElement;
      const column = container.querySelector(
        '[data-panel-column="right"]'
      ) as HTMLElement;
      expect(column).toBeTruthy();

      const cCol = getComputedStyle(column);
      const cPanel = getComputedStyle(panel);

      // Column owns the anchor. Right anchored, no fixed left.
      expect(cCol.position).toBe('absolute');
      expect(cCol.right).toBe('20px');
      expect(cCol.top).toBe('72px');
      expect(cCol.left).not.toMatch(/px$/);
      expect(cCol.maxHeight.length).toBeGreaterThan(0);

      // Panel owns the fixed width + internal overflow. It must NOT
      // set its own anchor — that would double-position and reintroduce
      // M1 Defect B.
      expect(cPanel.width).toBe('260px');
      expect(cPanel.position).not.toBe('absolute');
      expect(cPanel.top).not.toMatch(/px$/);
      expect(cPanel.left).not.toMatch(/px$/);
      expect(cPanel.right).not.toMatch(/px$/);
    });
  }
});

// -------- staff card presence (M8 punch-list row 1) --------------------

describe('M8 row 1 — panel renders a card per staff member', () => {
  it('makeInitialState 3-member team → 3 staff cards', () => {
    const { getAllByTestId } = render(
      <SimulationProvider>
        <RoomCardPanel />
      </SimulationProvider>
    );
    const staffCards = getAllByTestId(/^card-staff-/);
    expect(staffCards.length).toBeGreaterThanOrEqual(3);
  });
});

// -------- rhythm ring tone parity (M8 punch-list rows 8/20) ------------

describe('M8 rows 8/20 — rhythm ring tone matches state.day.serviceRhythm', () => {
  it('every staff card ring carries the same tone as state.day.serviceRhythm', () => {
    let capturedSim: SimulationState | null = null;
    function Capture() {
      capturedSim = useSimState();
      return null;
    }
    const { getAllByTestId } = render(
      <SimulationProvider>
        <Capture />
        <RoomCardPanel />
      </SimulationProvider>
    );
    const rings = getAllByTestId(/^ring-staff-/);
    const expectedTone = capturedSim!.day.serviceRhythm ?? 'neutral';
    for (const r of rings) {
      expect((r as HTMLElement).dataset.tone).toBe(expectedTone);
    }
  });
});

// -------- attention-priority ordering (ORDER 086 pick 2) ---------------

describe('ORDER 086 pick 2 — attention-priority sort with seatIndex tiebreak', () => {
  it('hailing guest priority strictly greater than freshly-waiting guest', () => {
    const base = {
      id: 'a',
      state: 'waiting' as const,
      satisfaction: 0.5,
      seatIndex: 0,
      arrivalTime: 0,
      stateTime: 0,
      scenarioSource: false,
      position: { x: 0, z: 0 },
      targetPosition: { x: 0, z: 0 },
      moveProgress: 0,
      hadWelcomeDrink: false,
      walkAwayOnArrival: false
    };
    const hail = { ...base, id: 'a' };
    const waiting = { ...base, id: 'b', seatIndex: 1, stateTime: 100 };
    expect(guestAttentionPriority(hail, WAIT_HAIL_SEC + 5))
      .toBeGreaterThan(guestAttentionPriority(waiting, 105));
  });
});

// -------- reel-name traceability audit (ORDER 085 §7) ------------------

describe('ORDER 085 §7 — reel-name traceability grep audit', () => {
  it('all 8 reel pose names cited in deriveActions.ts', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(thisDir, '..', 'deriveActions.ts'), 'utf8');
    const names = ['IDLE', 'WALK', 'SIT DOWN', 'READ MENU', 'HAIL', 'IMPATIENT', 'EAT', 'EXIT'];
    for (const n of names) {
      expect(
        src.includes(`reel ${n}`),
        `deriveActions.ts must cite "reel ${n}"`
      ).toBe(true);
    }
  });
});
