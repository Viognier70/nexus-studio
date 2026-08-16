// @vitest-environment jsdom
//
// ORDER 113 §3 DoD 5 + 6 — food truckens skepnad, grep-verifierbara
// tester.
//
// **DoD 5:** antalet renderade kö-figurer ändras när `queue` i state
// ändras. Utan mock av rendering — vi renderar den riktiga
// FoodtruckScene med en riktig SimStateCtx som bara har olika värden.
//
// **DoD 6:** en figurs lemvinkel skiljer sig mellan två tidpunkter.
// Vi läser `data-figure-leg-near`-attributet (som Figure.tsx skriver
// ut per render) vid två olika rAF-tick och verifierar att värdet
// ändras.

import { describe, expect, it, vi } from 'vitest';
import { render, act, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FoodtruckScene } from '../FoodtruckScene';
import { SimStateCtx } from '../../../simulation/SimulationProvider';
import { makeInitialState } from '../../../simulation/model';
import { capacityForBusiness } from '../../../business/businessClass';
import type { Guest, SimulationState } from '../../../types';
import { idlePose, walkPose } from '../rig';

function makeGuestFixture(id: string): Guest {
  return {
    id,
    state: 'waiting',
    satisfaction: 0.7,
    seatIndex: null,
    arrivalTime: 0,
    stateTime: 0,
    scenarioSource: false,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 1,
    hadWelcomeDrink: false,
    lastCheckbackAt: null,
    walkAwayOnArrival: false,
    stayingOvernight: false
  };
}

function stateWithQueue(guestIds: string[]): SimulationState {
  const base = makeInitialState();
  return {
    ...base,
    businessClass: 'foodtruck',
    policies: {
      ...base.policies,
      capacity: capacityForBusiness('foodtruck', base.policies.staffCount)
    },
    guests: guestIds.map(makeGuestFixture),
    waitingIds: guestIds
  };
}

function renderScene(state: SimulationState, children?: ReactNode): RenderResult {
  return render(
    <SimStateCtx.Provider value={state}>
      {children ?? (
        <FoodtruckScene widthPx={2432} leftInset={360} rightInset={340} />
      )}
    </SimStateCtx.Provider>
  );
}

describe('ORDER 113 §3 DoD 5 — antalet kö-figurer följer state.waitingIds', () => {
  it('tom kö → bara personalen (1 figur totalt)', () => {
    const { container } = renderScene(stateWithQueue([]));
    const figures = container.querySelectorAll('[data-figure]');
    // Bara personalens ansikte i luckan.
    expect(figures.length).toBe(1);
    expect(figures[0].getAttribute('data-figure')).toBe('staff-hatch');
  });

  it('tre gäster i kö → 3 kö-figurer + 1 personal = 4 totalt', () => {
    const { container } = renderScene(
      stateWithQueue(['gst-1', 'gst-2', 'gst-3'])
    );
    const figures = container.querySelectorAll('[data-figure]');
    expect(figures.length).toBe(4);
    // Verifiera att specifika gäst-ids renderats
    const ids = Array.from(figures).map((el) => el.getAttribute('data-figure'));
    expect(ids).toContain('gst-1');
    expect(ids).toContain('gst-2');
    expect(ids).toContain('gst-3');
  });

  it('sex gäster i kö → 6 kö-figurer + 1 personal = 7 totalt', () => {
    const { container } = renderScene(
      stateWithQueue(['gst-a', 'gst-b', 'gst-c', 'gst-d', 'gst-e', 'gst-f'])
    );
    const figures = container.querySelectorAll('[data-figure]');
    expect(figures.length).toBe(7);
  });

  it('kartan visar kö-räknaren', () => {
    const { container } = renderScene(
      stateWithQueue(['gst-1', 'gst-2', 'gst-3'])
    );
    const mapText = Array.from(container.querySelectorAll('text'))
      .find((el) => el.textContent?.includes('kö 3'));
    expect(mapText).toBeTruthy();
  });
});

describe('ORDER 113 §3 DoD 6 — lemvinkel skiljer mellan två tidpunkter', () => {
  it('idlePose ger olika lemvinklar vid t=0 och t=1.5 sek', () => {
    // Direktverifikation på rig-funktionen: t=0 vs t=1.5s ger olika
    // hipDrop/head/lean eftersom prototypen använder sinus-baserad
    // andning över tid.
    const p0 = idlePose(0);
    const p1 = idlePose(1.5);
    // Minst en pose-parameter måste skilja sig — annars är
    // tid-parametern inte ansluten till pose-output.
    const diff =
      Math.abs(p0.hipDrop - p1.hipDrop) +
      Math.abs(p0.head - p1.head) +
      Math.abs(p0.lean - p1.lean);
    expect(diff).toBeGreaterThan(0.1);
  });

  it('walkPose ger olika legNear-vinkel vid två faser', () => {
    // walkPose:s legNear[0] är 26 * amp * sin(2π*ph) — skiljer mellan
    // ph=0 (sin=0) och ph=0.25 (sin=1).
    const p0 = walkPose(0, 1);
    const p1 = walkPose(0.25, 1);
    expect(Math.abs(p0.legNear[0] - p1.legNear[0])).toBeGreaterThan(20);
  });

  it('renderad figur skriver ut lemvinkel som data-attribut', () => {
    // Sanity: Figure.tsx skriver `data-figure-leg-near` = pose.legNear[0]
    // — grep-artefakt för DoD 4.
    const { container } = renderScene(stateWithQueue(['gst-1', 'gst-2', 'gst-3']));
    // Kö-figur nr 3 (walkPose) — verifiera att attributet finns och
    // har ett numeriskt värde.
    const g3 = container.querySelector('[data-figure="gst-3"]');
    expect(g3).toBeTruthy();
    const leg = g3?.getAttribute('data-figure-leg-near');
    expect(leg).toBeTruthy();
    expect(Number.isFinite(Number(leg))).toBe(true);
  });

  it('rAF-loop uppdaterar figurernas pose över tid', async () => {
    // Mocka requestAnimationFrame så vi kan pumpa tick manuellt.
    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1 as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    try {
      // Använd 3 gäster så gst-3 hamnar på position 2 (i ≥ 2 = walkPose,
      // som animerar legNear över tid). Position 0-1 använder idlePose
      // som bara animerar lean/head/hipDrop — inte legNear.
      const { container } = renderScene(
        stateWithQueue(['gst-1', 'gst-2', 'gst-3'])
      );
      const readLegOfWalker = () =>
        container.querySelector('[data-figure="gst-3"]')?.getAttribute('data-figure-leg-near');
      const readLeanOfIdler = () =>
        container.querySelector('[data-figure="gst-1"]')?.getAttribute('data-figure-lean');

      // Trigger första frame (mount call) — sätter startRef och T=0
      act(() => {
        rafCallback?.(0);
      });
      const leg0 = readLegOfWalker();
      const lean0 = readLeanOfIdler();

      // Pumpa framåt 2 sek (2000ms high-res timestamp) — tidsvariabeln
      // T = (2000-0)/1000 = 2, vilket ger olika sinus-värden
      act(() => {
        rafCallback?.(2000);
      });
      const leg1 = readLegOfWalker();
      const lean1 = readLeanOfIdler();

      expect(leg0).toBeTruthy();
      expect(leg1).toBeTruthy();
      // Både walker:s ben och idler:s lutning ska skilja sig mellan
      // tidpunkterna — bevisar att rAF-loopen driver pose-värden.
      expect(leg0).not.toBe(leg1);
      expect(lean0).not.toBe(lean1);
    } finally {
      rafSpy.mockRestore();
    }
  });
});

describe('ORDER 113 §3 DoD 9 — karta visar gata + kö, 180 px-golv', () => {
  it('kartan finns i scenen', () => {
    const { container } = renderScene(stateWithQueue(['gst-1']));
    const map = container.querySelector('[data-foodtruck-map]');
    expect(map).toBeTruthy();
  });

  it('MAP_MIN_HEIGHT_PX-konstanten är 180 (ORDER 096 §5.3 golv)', async () => {
    const { MAP_MIN_HEIGHT_PX } = await import('../FoodtruckScene');
    expect(MAP_MIN_HEIGHT_PX).toBe(180);
  });
});

describe('ORDER 113 §3 DoD 1 — SKEPNAD EJ BYGGD läcker inte i foodtruck-vägen', () => {
  it('renderad scen innehåller inte strängen "SKEPNAD EJ BYGGD"', () => {
    const { container } = renderScene(stateWithQueue(['gst-1', 'gst-2']));
    expect(container.textContent).not.toContain('SKEPNAD EJ BYGGD');
    expect(container.textContent).not.toContain('Skepnad ej byggd');
  });

  it('data-foodtruck-scene finns (bevisar att FoodtruckScene renderats)', () => {
    const { container } = renderScene(stateWithQueue([]));
    expect(container.querySelector('[data-foodtruck-scene]')).toBeTruthy();
  });
});

describe('ORDER 113 §3 DoD 2 — grep-verifierbara rig-funktioner', () => {
  it('rig.ts exporterar walkPose, idlePose, blend, IDLE', async () => {
    const rig = await import('../rig');
    expect(typeof rig.walkPose).toBe('function');
    expect(typeof rig.idlePose).toBe('function');
    expect(typeof rig.blend).toBe('function');
    expect(rig.IDLE).toBeDefined();
    expect(rig.IDLE.armFar).toEqual([5, -9]);
  });
});
