// Smoke tests — added 2026-08-09 after a runtime crash the whole test
// suite missed. The reducer ↔ eveningAccount ↔ themeSelection cycle
// meant eveningAccount.ts read WAGER_UNIT_STAKE at module-eval time
// while it was still in the temporal dead zone. Vitest's per-test-
// file import order happened to resolve the cycle safely (test file
// imported eveningAccount first, then reducer, so by the time
// eveningAccount's top-level constant read fired, reducer had
// finished defining WAGER_UNIT_STAKE). The browser bundle evaluated
// modules in a different order and threw ReferenceError on load.
//
// The lesson: 333 unit tests exercising the reducer proved nothing
// about the actual application, because none of them imported the
// application's entry graph in the entry order.
//
// These smoke tests import the top-level React components and pull
// the whole module graph in the same order the app bundle does.
// Any circular-init hazard, missing export, or module-eval throw
// surfaces immediately.
//
// **What this test cannot catch:** it does not mount the components
// into a DOM (no jsdom / @testing-library/react in the project as of
// 2026-08-09 — a full mount-and-render test would add three deps and
// requires Vision Owner approval per CLAUDE.md rule 5). What it does
// catch is the entire class of module-init bug that shipped: circular
// imports with top-level side effects, undefined imported values,
// missing exports.

import { describe, expect, it } from 'vitest';
import { build, type Rollup } from 'vite';

describe('module graph smoke — imports resolve without throwing', () => {
  it(
    'imports StrategicApp module (pulls the full entry graph)',
    { timeout: 30_000 },   // R3F + drei pull large chunks; cold transform takes several seconds
    async () => {
      // Dynamic import so a module-init throw becomes a rejected
      // promise rather than killing the test file at load time.
      // This is the SINGLE test that would have caught the TDZ crash
      // on the initial ORDER 046 push — StrategicApp transitively
      // pulls the whole simulation graph in the same order Vite does.
      const mod = await import('../StrategicApp');
      expect(mod.StrategicApp).toBeTypeOf('function');
    }
  );

  it('imports SimulationProvider + reducer directly', async () => {
    const mod = await import('../simulation/SimulationProvider');
    expect(mod.SimulationProvider).toBeTypeOf('function');
    expect(mod.useSimState).toBeTypeOf('function');
    expect(mod.useSimDispatch).toBeTypeOf('function');
  });

  it('constants module is a leaf (no cycles, all values defined)', async () => {
    const mod = await import('../simulation/constants');
    // Every exported value must be a number, not undefined. A TDZ
    // hit at module-init would surface as undefined here.
    for (const key of [
      'WAGER_UNIT_STAKE',
      'WAGER_WEAK_THRESHOLD',
      'WAGER_WEAK_WIN_MULTIPLIER',
      'CAPITAL_MIN',
      'CAPITAL_MAX',
      'THEME_HISTORY_LIMIT',
      'SCENARIO_CAPITAL_DELTA'
    ] as const) {
      expect(
        (mod as Record<string, unknown>)[key],
        `constants.${key} should be a number`
      ).toBeTypeOf('number');
    }
  });

  it('eveningAccount computes without throwing on a fresh state (top-level TDZ regression guard)', async () => {
    // The specific shape of the ORDER 046 crash: eveningAccount.ts
    // read WAGER_UNIT_STAKE at module top level, and it evaluated
    // to undefined. This test invokes the module in a way that
    // touches the constant, so a future regression to the same shape
    // (a top-level constant-reading import that ends up TDZ'd) trips
    // here rather than in the browser.
    const [{ computeEveningAccount, pickBranch }, { makeInitialState }] =
      await Promise.all([
        import('../simulation/eveningAccount'),
        import('../simulation/model')
      ]);
    const state = makeInitialState(1);
    // Both entry points exercised; missing binding surfaces as
    // undefined function or NaN in the paragraph.
    expect(pickBranch(state)).toBe('mediocre');
    const acc = computeEveningAccount(state);
    expect(acc.paragraph.length).toBeGreaterThan(20);
    expect(Number.isFinite(acc.presentedAt)).toBe(true);
  });

  it('collapse module resolves and its formula returns a finite number', async () => {
    const [{ collapseProbabilityPerTick, weakestAxis }, { makeInitialState }] =
      await Promise.all([
        import('../simulation/collapse'),
        import('../simulation/model')
      ]);
    const state = makeInitialState(1);
    const w = weakestAxis(state.team);
    expect(Number.isFinite(w.value)).toBe(true);
    const p = collapseProbabilityPerTick(state);
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it(
    'vite build emits no circular-dependency warnings among strategic/simulation modules',
    { timeout: 60_000 },
    async () => {
      // The exact bug that shipped in ORDER 046 was a cycle between
      // reducer.ts, eveningAccount.ts and themeSelection.ts. Vitest's
      // module loader hid it; Rollup detects it via its onwarn hook.
      //
      // Vite's CLI suppresses "CIRCULAR_DEPENDENCY" warnings by default,
      // so we invoke the programmatic build API and install our own
      // onwarn to capture them. Scope to sim modules — a spurious
      // cycle elsewhere (e.g. in a third-party package) shouldn't
      // fail this test. Runs once per suite, ~5–10 s.
      const cyclesInSim: string[] = [];
      await build({
        logLevel: 'silent',
        build: {
          write: false,           // don't write dist/ during the test
          rollupOptions: {
            onwarn(warning: Rollup.RollupLog) {
              if (warning.code !== 'CIRCULAR_DEPENDENCY') return;
              const msg = warning.message ?? '';
              if (msg.includes('strategic/simulation')) {
                cyclesInSim.push(msg);
              }
            }
          }
        }
      });
      expect(
        cyclesInSim,
        `Rollup reported ${cyclesInSim.length} circular dependency warning(s) among strategic/simulation modules:\n${cyclesInSim.join('\n')}`
      ).toEqual([]);
    }
  );

  it('top-level UI components import cleanly', async () => {
    // Each panel pulls its own slice of the graph. If any of them
    // acquires a circular top-level side effect in a future refactor,
    // one of these will throw.
    const modules = await Promise.all([
      import('../scenario/EveningAccountPanel'),
      import('../scenario/WagerPanel'),
      import('../scenario/OpeningPanel'),
      import('../scenario/AgencyOfferPanel'),
      import('../scenario/ScenarioOverlay'),
      import('../scenario/ServiceLengthPicker'),
      import('../business/TeamPanel'),
      import('../business/InvestmentPanel'),
      import('../ui/DevPanel'),
      import('../ui/EventStreamPanel')
    ]);
    for (const mod of modules) {
      const keys = Object.keys(mod);
      expect(keys.length).toBeGreaterThan(0);
    }
  });
});
