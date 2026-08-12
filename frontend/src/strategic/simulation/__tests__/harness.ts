// ORDER 063 INFRA-2 — headless simulation harness.
//
// Purpose: drive the pure reducer through a scripted sequence of
// actions across several sim-days, capture invariants + evening
// account text along the way, and assert whatever the calling test
// wants to prove. This is the "fixed-seed action scripter" that
// M1 / M4 / M6 / M7's autonomous DoDs depend on (see the milestone
// proposal §6.3).
//
// Design goals:
//   1. Deterministic — same seed + same script = byte-identical
//      final state. The reducer is pure; the harness is pure.
//   2. Hybrid scripting — the caller writes time-based actions
//      (SET_POLICY at t=5s, OPEN_SERVICE at t=10s, …) AND a
//      scenario-response strategy that fires reactively when the
//      sim populates a pending scenario. Scenarios fire at RNG-
//      chosen moments, so a purely time-based script can't handle
//      them cleanly.
//   3. Invariant capture — cash finite, capitals in [0, 1],
//      reputation in [0, 1], team member count ≥ 0. Anything the
//      caller wants extra can be checked on the returned state.
//   4. Evening-account capture — every time the sim publishes a
//      fresh eveningAccount paragraph, the harness appends it to
//      the returned list so multi-run divergence tests can compare
//      token sets.
//
// Explicitly NOT a test file — no `describe`/`it`. Utility module
// imported by tests. Lives under `__tests__/` so it can only be
// pulled in from other test files (Vitest picks it up as a test
// module but exports no tests of its own).

import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import type { ScenarioChoice, SimAction, SimulationState } from '../../types';

// ---------- public API -------------------------------------------------

export interface ScriptedAction {
  /** Sim-time (seconds) at which to dispatch. Fires on the first tick
   *  whose `simTime` has reached or passed this value. */
  atSec: number;
  action: SimAction;
  /** Optional debug label — surfaced in the returned `dispatchedLog`
   *  when things go wrong. */
  label?: string;
}

/** Called on every tick where the sim has a scenario awaiting a
 *  choice. Return the ScenarioChoice to resolve with, or null to
 *  let the scenario time itself out (rare in normal play). */
export type ScenarioStrategy = (state: SimulationState) => ScenarioChoice | null;

export interface HarnessConfig {
  /** Seed for `makeInitialState`. Defaults to 1 — deterministic. */
  seed?: number;
  script: ScriptedAction[];
  /** Sim-time (seconds) to run until. The harness stops at the first
   *  tick whose `simTime` ≥ this value. */
  runUntilSec: number;
  /** Reactive scenario handler. Defaults to "always A" — deterministic
   *  and simple; tests that want to probe divergence should supply a
   *  strategy that returns different choices per run. */
  scenarioStrategy?: ScenarioStrategy;
  /** Tick frequency in Hz. Defaults to 5 — matches the SimulationProvider's
   *  0.2 s tick rate. */
  tickHz?: number;
}

export interface HarnessResult {
  finalState: SimulationState;
  /** Every evening-account paragraph the sim published during the
   *  run, in the order they appeared. Duplicates (same paragraph
   *  text seen on adjacent captures) are collapsed. */
  eveningAccounts: string[];
  /** Non-fatal invariant failures. Empty on a clean run. */
  invariantErrors: string[];
  /** Total sim-actions dispatched (scripted + reactive + TICK). */
  actionsDispatched: number;
  scenariosResolved: number;
  /** Ordered labels of scripted actions that fired. Useful when a
   *  divergence check surfaces surprise ordering. */
  dispatchedLog: string[];
}

// ---------- runner -----------------------------------------------------

export function runHarness(cfg: HarnessConfig): HarnessResult {
  const tickHz = cfg.tickHz ?? 5;
  const dt = 1 / tickHz;
  const strategy = cfg.scenarioStrategy ?? (() => 'A');

  const script = [...cfg.script].sort((a, b) => a.atSec - b.atSec);

  let state = makeInitialState(cfg.seed ?? 1);
  let scriptIdx = 0;
  let actionsDispatched = 0;
  let scenariosResolved = 0;
  const eveningAccounts: string[] = [];
  const invariantErrors: string[] = [];
  const dispatchedLog: string[] = [];

  const recordInvariant = (msg: string) => {
    invariantErrors.push(`t=${state.simTime.toFixed(2)}s tick=${state.tick} ${msg}`);
  };

  const dispatch = (action: SimAction, label: string) => {
    state = reducer(state, action);
    actionsDispatched += 1;
    if (label !== 'TICK') dispatchedLog.push(`t=${state.simTime.toFixed(2)}s ${label}`);
  };

  const captureEveningAccount = () => {
    const paragraph = state.eveningAccount?.paragraph;
    if (!paragraph) return;
    if (eveningAccounts[eveningAccounts.length - 1] === paragraph) return;
    eveningAccounts.push(paragraph);
  };

  const checkInvariants = () => {
    const s = state;
    if (!Number.isFinite(s.cash)) recordInvariant(`cash not finite: ${s.cash}`);
    if (!Number.isFinite(s.reputation) || s.reputation < 0 || s.reputation > 1) {
      recordInvariant(`reputation out of [0,1]: ${s.reputation}`);
    }
    for (const [k, v] of Object.entries(s.capitals.values)) {
      if (!Number.isFinite(v) || v < 0 || v > 1) {
        recordInvariant(`capital ${k} out of [0,1]: ${v}`);
      }
    }
    if (s.team.members.length < 0) {
      recordInvariant(`negative team member count: ${s.team.members.length}`);
    }
  };

  // Main loop — advance in tick-sized steps until runUntilSec is
  // reached. Between ticks: (a) fire any scripted actions whose
  // scheduled sim-time has arrived; (b) fire the reactive scenario
  // resolver if a scenario is awaiting a choice.
  const guardTickBudget = Math.ceil(cfg.runUntilSec * tickHz) + 100;
  let ticksRun = 0;
  while (state.simTime < cfg.runUntilSec) {
    ticksRun += 1;
    if (ticksRun > guardTickBudget) {
      recordInvariant(`tick budget exceeded (${guardTickBudget}); harness aborting`);
      break;
    }
    // (a) scripted actions whose atSec ≤ current simTime
    while (scriptIdx < script.length && script[scriptIdx].atSec <= state.simTime) {
      const s = script[scriptIdx];
      dispatch(s.action, s.label ?? s.action.type);
      scriptIdx += 1;
    }
    // (b) reactive scenario resolver
    if (state.scenario.awaitingChoice) {
      const choice = strategy(state);
      if (choice !== null) {
        dispatch({ type: 'RESOLVE_SCENARIO', choice }, `RESOLVE_SCENARIO(${choice})`);
        scenariosResolved += 1;
      }
    }
    // (c) advance one tick
    dispatch({ type: 'TICK', dt }, 'TICK');
    captureEveningAccount();
    checkInvariants();
  }
  // Drain remaining scripted actions that were scheduled past runUntilSec —
  // usually zero; only relevant if the caller wanted a final teardown action.

  return {
    finalState: state,
    eveningAccounts,
    invariantErrors,
    actionsDispatched,
    scenariosResolved,
    dispatchedLog
  };
}

// ---------- Jaccard token distance -------------------------------------

/** Token-set Jaccard distance between two strings. Lowercased,
 *  punctuation stripped. Returns a value in [0, 1] where 0 = identical
 *  token sets, 1 = disjoint. */
export function jaccardTokenDistance(a: string, b: string): number {
  const toTokens = (s: string) =>
    new Set(
      s.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 0)
    );
  const setA = toTokens(a);
  const setB = toTokens(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : 1 - intersection / union;
}
