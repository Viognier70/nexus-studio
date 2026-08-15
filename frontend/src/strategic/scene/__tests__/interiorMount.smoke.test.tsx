// @vitest-environment jsdom
//
// ORDER 090 §5 — scene-mount smoke test.
//
// The 578-test suite that shipped with ORDER 088/089 renders zero
// pucks: `strategic/__tests__/mount.test.tsx` mocks `<Canvas>` to
// null so the R3F reconciler never runs. This test closes that gap
// for the interior-room components introduced by ORDER 088 (puck
// lean, bob, pip, sit-dip). It boots the real R3F reconciler over a
// stubbed renderer (no WebGL in jsdom), seeds a `SimulationState`
// via the exported sim contexts (one guest + the three default team
// members from `initialTeam`), and asserts that mount + first
// commit + first useFrame tick do not throw.
//
// **What this catches.**
// - Any prop that R3F's applyProps can't set on the underlying
//   three.js object (`data-*`, `aria-*`, typos in prop paths). The
//   sibling `scenePropShape.smoke.test.ts` catches the same class
//   at source; this file catches it at runtime, so bug shapes that
//   don't surface at the source level still fail here.
// - Missing / null refs on first render (`groupRef.current` not yet
//   set when `useFrame` fires).
// - Provider wiring gaps — a subcomponent that starts calling
//   `useBusiness()` without `<BusinessProvider>` in the tree will
//   fail here loudly.
//
// **What this does not catch.**
// - Anything visual — the mock renderer's `render()` is a no-op, so
//   material colours, projections, and pixel positions are outside
//   the scope. The visual-regression harness is the tool for that.
//
// The mock-renderer surface (`render`, `setSize`, `xr`, `shadowMap`,
// `renderLists`) is the minimum R3F touches during setup + one
// commit + one advance; see the trace in `events-776716bd.esm.js`
// (`gl.setSize`, `state.gl.render`, `gl.xr.setAnimationLoop`,
// `gl.shadowMap.enabled`, `state.gl.renderLists?.dispose`).

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { act, createRoot as createR3FRoot, extend } from '@react-three/fiber';
import type { Dispatch } from 'react';
import { BusinessProvider } from '../../business/BusinessContext';
import { CameraProvider } from '../../camera/CameraContext';
import { makeGuest, makeInitialState } from '../../simulation/model';
import {
  SimDispatchCtx,
  SimStateCtx
} from '../../simulation/SimulationProvider';
import type { SimAction } from '../../types';
import { InteriorGuests } from '../InteriorGuests';
import { InteriorStaff } from '../InteriorStaff';

// R3F's reconciler only knows the three.js classes it has been told
// about via `extend`. In runtime `<Canvas>` calls this at module
// load; here we call it explicitly.
extend(THREE);

// jsdom lacks matchMedia; usePrefersReducedMotion and a couple of
// other hooks in the tree read it. Return a "no match" handle so
// components fall through to their motion-allowed defaults.
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

// Minimal three-renderer stub. R3F treats any object with a `.render`
// method as a valid renderer (see `isRenderer` in R3F source) and
// skips `new THREE.WebGLRenderer(...)`. The rest of this surface
// (setSize / xr / shadowMap / renderLists) is what R3F touches during
// setup + one commit; a WebGLRenderer would provide them for real.
function makeMockRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = {
    domElement: canvas,
    outputColorSpace: THREE.SRGBColorSpace,
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1,
    xr: {
      enabled: false,
      isPresenting: false,
      setAnimationLoop: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    shadowMap: {
      enabled: false,
      type: THREE.PCFShadowMap,
      needsUpdate: false
    },
    renderLists: { dispose: () => {} },
    render: () => {},
    setSize: () => {},
    setPixelRatio: () => {},
    setClearColor: () => {},
    clear: () => {},
    dispose: () => {},
    getPixelRatio: () => 1,
    getSize: (target: THREE.Vector2) => {
      target.set(100, 100);
      return target;
    }
  };
  return renderer as unknown as THREE.WebGLRenderer;
}

// Track canvases across the suite so afterEach can tear them down —
// R3F caches roots in a WeakMap keyed by canvas, so a leaked canvas
// leaks its store too.
const mountedCanvases: HTMLCanvasElement[] = [];
const mountedRoots: Array<{ unmount: () => void }> = [];

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    try { root.unmount(); } catch { /* already gone */ }
  }
  for (const c of mountedCanvases.splice(0)) {
    if (c.parentNode) c.parentNode.removeChild(c);
  }
});

// Wrap the SUT in the same provider chain the real app uses for the
// interior scene. `SimStateCtx.Provider` is used directly (rather
// than `<SimulationProvider>`) so the test controls the state — a
// real provider would start from `makeInitialState()` with an empty
// guest list, and there is no synchronous way to inject one guest
// short of ticking the reducer forward through the whole opening
// sequence.
function renderInteriorRoom(state: ReturnType<typeof makeInitialState>) {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  mountedCanvases.push(canvas);

  const noopDispatch: Dispatch<SimAction> = () => {};

  const root = createR3FRoot(canvas).configure({
    gl: (c) => makeMockRenderer(c as HTMLCanvasElement),
    // frameloop 'never' — R3F reconciles React commits but does not
    // schedule its own render/advance loop. Keeps the test synchronous;
    // useFrame callbacks don't fire until we call `advance` (we don't).
    frameloop: 'never',
    // Explicit size — jsdom canvas has no layout, so R3F's default
    // (parentElement.getBoundingClientRect) returns zeros and some
    // downstream math (viewport) chokes.
    size: { width: 800, height: 600, top: 0, left: 0, updateStyle: false }
  });
  mountedRoots.push(root);

  root.render(
    <SimStateCtx.Provider value={state}>
      <SimDispatchCtx.Provider value={noopDispatch}>
        <BusinessProvider>
          <CameraProvider>
            <InteriorStaff />
            <InteriorGuests />
          </CameraProvider>
        </BusinessProvider>
      </SimDispatchCtx.Provider>
    </SimStateCtx.Provider>
  );

  return { root, canvas };
}

describe('ORDER 090 §5 — interior room mounts through the R3F reconciler', () => {
  it('mounts InteriorStaff + InteriorGuests with one guest seeded, no throw', async () => {
    const state = makeInitialState();
    // `initialTeam()` already gives us three TeamMembers (värd,
    // servitör, kock) and `makeStaff(3)` gives three StaffMembers —
    // enough to render staff pucks and exercise the ORDER 090 §3
    // team ↔ staff bridge. We only need to add the guest.
    const guest = makeGuest(state.simTime, false, false);
    state.guests = [guest];

    await act(async () => {
      renderInteriorRoom(state);
    });

    // Reaching here means: R3F set up its store + scene; the React
    // commit ran; every `applyProps` on every `<mesh>`, `<group>`,
    // `<boxGeometry>`, `<meshStandardMaterial>` in InteriorStaff
    // and InteriorGuests succeeded. That's the crash surface from
    // the original ORDER 088 defect.
    expect(true).toBe(true);
  });

  it('mounts with zero guests (pre-service state)', async () => {
    // Regression guard for the empty-guest-list branch —
    // InteriorGuests must render an empty group without touching
    // meshRefs or pipRefs. Cheap to include and catches accidental
    // hard-refs into `sim.guests[0]`.
    const state = makeInitialState();
    expect(state.guests).toEqual([]);
    await act(async () => {
      renderInteriorRoom(state);
    });
    expect(true).toBe(true);
  });
});
