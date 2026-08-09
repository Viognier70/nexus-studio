// @vitest-environment jsdom
//
// Mount smoke test — actually renders <StrategicApp /> into a
// jsdom DOM, verifies it does not throw, and verifies the first
// player-facing surface (NameEntryOverlay) is present.
//
// Added 2026-08-09 after ORDER 046 shipped a TDZ crash the 333-test
// suite missed. The `smoke.test.ts` file catches the import graph
// class of bug (circular deps at module init); this file catches
// the class where the JSX tree assembles but throws at render time
// (bad prop shapes, missing context providers, hook-order violations
// after refactors, etc).
//
// **R3F caveat.** `<StrategicScene>` wraps a `<Canvas>` from
// @react-three/fiber which needs a real WebGL context — jsdom has
// none. We `vi.mock` @react-three/fiber (Canvas → null) so the
// Three.js subtree is skipped, but every React tree branch OUTSIDE
// the canvas (all the panels, overlays, providers, hooks) mounts
// for real. That is the branch where the ORDER 046 bug lived.

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// jsdom stubs. window.matchMedia is used by usePrefersReducedMotion;
// jsdom doesn't ship it. Return a no-match handle so components fall
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

// Mock @react-three/fiber before any import that pulls it in. Canvas
// returns null (drops its Three.js children entirely); the hooks are
// no-ops so components that call useFrame / useThree during their
// setup don't crash. drei ships bulky helpers we don't need at mount
// time — stub the whole module surface with a Proxy that returns null
// for any accessed export.
vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
  useThree: () => ({
    camera: { position: { set: () => {} } },
    gl: { domElement: document.createElement('canvas') },
    scene: {},
    size: { width: 800, height: 600 },
    viewport: { width: 8, height: 6 }
  }),
  extend: () => {}
}));

// drei ships bulky helpers we don't need at mount time. Return an
// object with the specific hooks + components StrategicApp's
// subgraph touches — stubbed to null / no-op. The list is small
// because the R3F Canvas mock above returns null, so drei's scene-
// side components never actually render.
vi.mock('@react-three/drei', () => ({
  Line: () => null,
  Text: () => null,
  Html: () => null,
  Instances: () => null,
  Instance: () => null,
  useTexture: () => null,
  shaderMaterial: () => null
}));

// WebGL detection sees no real GL context in jsdom — force success
// so the WebGLFallback branch doesn't preempt the real app render.
vi.mock('../../webgl/WebGLFallback', () => ({
  detectWebGL: () => true,
  WebGLFallback: () => null
}));

// Import AFTER the mocks so the mocked module is what StrategicApp sees.
import { StrategicApp } from '../StrategicApp';
import { strings } from '../../content/strings.sv';

afterEach(() => {
  cleanup();
});

describe('mount smoke — StrategicApp renders into a real DOM', () => {
  it('renders without throwing', () => {
    // If any component in the tree throws at render (bad prop shape,
    // missing provider, hook-order violation, TDZ on a shared const)
    // this call rejects. No exception ⇒ every constructor + first-
    // render pass succeeded.
    expect(() => render(<StrategicApp />)).not.toThrow();
  });

  it('shows the NameEntryOverlay heading on first mount', () => {
    // BusinessProvider starts with no name set, so NameEntryOverlay
    // is what the player sees first. The heading text comes from
    // strings.sv.ts (CLAUDE.md rule 7) — asserting against it also
    // pins the pass-through of the strings module through the
    // BusinessProvider layer.
    render(<StrategicApp />);
    // getByText throws if the element isn't present; the truthy
    // check is defensive — avoids the extra @testing-library/jest-dom
    // dep for `.toBeInTheDocument()`.
    expect(screen.getByText(strings.business.firstRunHeading)).toBeTruthy();
  });

  it('name entry form has a submit button', () => {
    // Not a full interaction test — just that the reachable player
    // surface is complete enough that a click could plausibly happen.
    render(<StrategicApp />);
    expect(
      screen.getByRole('button', { name: strings.business.firstRunSubmit })
    ).toBeTruthy();
  });
});
