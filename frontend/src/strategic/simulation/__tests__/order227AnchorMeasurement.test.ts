// ORDER 227 — ankarmätning under ett fullständigt pass.
//
// VO 2026-09-20: "Ankarsystemet från ORDER 225 syns inte i provspel.
// Ingen fråga kom i samband med kockens arbete vid karen."
//
// Triage-frågor från VO:
//   1. Ankaret aktiveras aldrig — cookDish-steget nås inte
//   2. Ankaret aktiveras men inget scenario matchar taggen
//   3. Scenariot väljs men presenteras vid fel tidpunkt
//
// Kartläggning kring de tre frågorna:
//   Fråga 2 är svarad *innan* mätningen: ORDER 225 (Fas 1) byggde bara
//   observabiliteten av de fem ankaren; inget scenario har någon
//   anchor-tag idag. `pickScenarioSpecFiltered` läser inte anchor-info.
//   Kopplingen scenario ↔ anchor är Fas 2 (event-lager, egen order per
//   händelse). Den här mätningen svarar på fråga 1 (fyras ankaren över
//   huvud taget under ett riktigt pass?) med data.
//
// Metod: kör en scriptad 15-min dinner via reducer-driven tick-loop,
// samla `deriveActiveAnchors(state)` per tick, skriv tidsserie +
// aggregat till `reports/order227-anchor-measurement/anchors-timeline.
// json`. Ingen skiljelinje mellan gäster som deterministiskt spawnar
// från arrivals-mekaniken och gäster som fyras via scenario-spawn.
//
// Bara mätning. Ingen sim-kod ändras.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import {
  ANCHOR_IDS,
  countActiveAnchors,
  deriveActiveAnchors
} from '../anchors';
import type { AnchorId } from '../anchors';
import type { SimulationState } from '../../types';

// Reports-katalog ligger relativt frontend-roten. `__dirname`
// finns inte i ESM-läge; härledd via `fileURLToPath(import.meta.url)`.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(
  HERE,
  '../../../../reports/order227-anchor-measurement'
);
const REPORT_JSON = resolve(REPORT_DIR, 'anchors-timeline.json');

// ORDER 043 v3-densitet: 0.22 scenarier/min ⇒ ~3 scenarier per 15-min
// pass. Vi driver ticks direkt i stället för att använda `runHarness`
// eftersom vi behöver per-tick-sampling av anchors — harness returnerar
// bara finalState.
function runDinnerWithSampling(seed: number, lengthMinutes: number) {
  let state = makeInitialState(seed);
  // Rutinboot: SET_POLICY (default = 'medel' pricing + 'grund'
  // ingredientTier) → SKIP_LUNCH så sim går ur morgonläget → OPEN_SERVICE
  // dinner. Samma pattern som m6.test.ts / m7a.test.ts.
  state = reducer(state, {
    type: 'SET_POLICY',
    patch: { pricing: 'medel', ingredientTier: 'grund' }
  });
  state = reducer(state, { type: 'SKIP_LUNCH' });
  state = reducer(state, {
    type: 'OPEN_SERVICE',
    service: 'dinner',
    lengthMinutes
  });

  const tickHz = 5;
  const dt = 1 / tickHz;
  const runUntilSec = state.simTime + lengthMinutes * 60;

  interface Sample {
    readonly simTime: number;
    readonly tick: number;
    readonly period: string;
    readonly guestsInRoom: number;
    readonly staffTargeting: number;
    readonly counts: Readonly<Record<AnchorId, number>>;
    // Bara icke-tomma listor; håller filen kompakt.
    readonly activeIds?: readonly string[];
    // Scenario-state: hjälper triage om 0 scenarios fyrar under passet.
    readonly scenario: {
      phase: string;
      scenarioId: string | null;
      drawnTheme: string | null;
      remainingScheduled: number;
      firedThisService: number;
      firedIds: readonly string[];
    };
  }

  interface StateChange {
    simTime: number;
    kind: string;
    detail: string;
  }
  const stateChanges: StateChange[] = [];
  let lastScenarioPhase: string = state.scenario.phase;
  let lastRemainingScheduled = state.day.scenarioTriggerTimes.length;

  const timeline: Sample[] = [];
  const totals: Record<AnchorId, number> = {
    greet: 0,
    order: 0,
    setDown: 0,
    requestCheck: 0,
    pay: 0
  };
  // Räknar tick-frames där något ankare var aktivt (INTE per-guest-fires
  // — en ihållande greet spänner över många ticks och räknas då som
  // många frames men få distinkta fires).
  const framesWithAnyAnchor = { count: 0 };
  // Diskreta övergångar: (guestId, anchor)-tuple från null/annat →
  // detta ankare. Räknar "hur många gånger fyrades ett ankare i den
  // meningen ett scenario/fråga skulle koppla på" — det är detta tal
  // som svarar på VO:s fråga "hur många dök upp under ett pass".
  const firePerAnchor: Record<AnchorId, number> = {
    greet: 0,
    order: 0,
    setDown: 0,
    requestCheck: 0,
    pay: 0
  };
  const previousAnchorPerGuest = new Map<string, AnchorId | null>();

  const SCENE_RELEVANT: readonly SimulationState['guests'][number]['state'][] = [
    'arriving',
    'waiting',
    'seated',
    'ordering',
    'serving',
    'dining',
    'paying'
  ];

  while (state.simTime < runUntilSec) {
    // Auto-resolver för scenarier: simulerar en engagerad spelare.
    // Utan resolvern fastnar scenariot i 'subject'/'question' och
    // auto-firen blockeras (scenarioIdle=false), vilket sänker
    // antalet scenarier per pass till 1.
    if (state.scenario.phase === 'subject') {
      state = reducer(state, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
    } else if (state.scenario.awaitingChoice) {
      state = reducer(state, { type: 'RESOLVE_SCENARIO', choice: 'A' });
    } else if (state.scenario.phase === 'question' && state.scenario.pendingQuestion) {
      state = reducer(state, { type: 'ANSWER_QUESTION', index: 0 });
    }

    state = reducer(state, { type: 'TICK', dt });

    // Spåra scenariotillstånds-övergångar.
    if (state.scenario.phase !== lastScenarioPhase) {
      stateChanges.push({
        simTime: Math.round(state.simTime * 100) / 100,
        kind: 'scenario.phase',
        detail: `${lastScenarioPhase} → ${state.scenario.phase} (id=${state.scenario.scenarioId ?? 'null'})`
      });
      lastScenarioPhase = state.scenario.phase;
    }
    if (state.day.scenarioTriggerTimes.length !== lastRemainingScheduled) {
      stateChanges.push({
        simTime: Math.round(state.simTime * 100) / 100,
        kind: 'scheduled.consumed',
        detail: `${lastRemainingScheduled} → ${state.day.scenarioTriggerTimes.length} (fired=${state.day.scenariosFiredThisService})`
      });
      lastRemainingScheduled = state.day.scenarioTriggerTimes.length;
    }

    const active = deriveActiveAnchors(state);
    const counts = countActiveAnchors(state);
    const anyActive = ANCHOR_IDS.some((id) => counts[id] > 0);
    if (anyActive) framesWithAnyAnchor.count += 1;
    for (const id of ANCHOR_IDS) totals[id] += counts[id];

    // Räkna distinkta fires: en guests övergång från "utan ankare eller
    // annat ankare" → "detta ankare" räknas som en fire.
    const seenGuests = new Set<string>();
    for (const a of active) {
      seenGuests.add(a.guestId);
      const prev = previousAnchorPerGuest.get(a.guestId) ?? null;
      if (prev !== a.anchor) firePerAnchor[a.anchor] += 1;
      previousAnchorPerGuest.set(a.guestId, a.anchor);
    }
    // Gäster som inte har något ankare denna tick nollställs så nästa
    // aktivering räknas som en ny fire.
    for (const guestId of previousAnchorPerGuest.keys()) {
      if (!seenGuests.has(guestId)) previousAnchorPerGuest.set(guestId, null);
    }

    const guestsInRoom = state.guests.filter((g) =>
      (SCENE_RELEVANT as readonly string[]).includes(g.state)
    ).length;
    const staffTargeting = state.staff.filter((s) => s.targetGuestId !== null).length;

    // Timeline: bara log fire-events (transitioner) + heartbeats var 60 s.
    // Full tick-för-tick-serie är 3-4 MB och redundant — summary + fires
    // + heartbeats räcker för att rekonstruera passet. Full data kan
    // genereras genom att ändra `HEARTBEAT_EVERY_TICKS` till t.ex. 1.
    const HEARTBEAT_EVERY_TICKS = 300; // 60 s @ 5 Hz
    if (state.tick % HEARTBEAT_EVERY_TICKS === 0) {
      timeline.push({
        simTime: Math.round(state.simTime * 100) / 100,
        tick: state.tick,
        period: state.day.period,
        guestsInRoom,
        staffTargeting,
        counts,
        scenario: {
          phase: state.scenario.phase,
          scenarioId: state.scenario.scenarioId,
          drawnTheme: state.scenario.drawnTheme,
          remainingScheduled: state.day.scenarioTriggerTimes.length,
          firedThisService: state.day.scenariosFiredThisService,
          firedIds: state.firedScenarioIds
        }
      });
    }
  }

  return {
    finalState: state,
    timeline,
    totals,
    firePerAnchor,
    framesWithAnyAnchor: framesWithAnyAnchor.count,
    stateChanges,
    ticksRun: Math.round((runUntilSec - (state.simTime - runUntilSec)) / dt)
  };
}

describe('ORDER 227 — ankarmätning under ett dinner-pass', () => {
  it('kör en 15-min dinner och samlar anchor-aktivering per tick', () => {
    const seed = 42;
    const lengthMinutes = 15;
    const result = runDinnerWithSampling(seed, lengthMinutes);

    const totalTicks = lengthMinutes * 60 * 5; // 15 min * 60 s * 5 Hz = 4500 ticks
    const summary = {
      order: 227,
      seed,
      lengthMinutes,
      totalTicks,
      framesWithAnyAnchor: result.framesWithAnyAnchor,
      framesWithAnchorPercent:
        Math.round((result.framesWithAnyAnchor / totalTicks) * 10000) / 100,
      // Totala framekvivalenter per ankare (summa över alla ticks; delas
      // med 5 för att få tidsekvivalenter i sim-sekunder).
      cumulativeFramesPerAnchor: result.totals,
      cumulativeSecondsPerAnchor: Object.fromEntries(
        (Object.entries(result.totals) as [AnchorId, number][]).map(([id, n]) => [
          id,
          Math.round((n / 5) * 100) / 100
        ])
      ),
      // Diskreta fires: hur många distinkta ankar-aktiveringar
      // (guest × anchor) inträffade under passet. Detta är svaret på
      // "hur många dök upp under passet".
      firePerAnchor: result.firePerAnchor,
      totalFires: (Object.values(result.firePerAnchor) as number[]).reduce(
        (a, b) => a + b,
        0
      ),
      guestsSpawned: result.finalState.guests.length,
      guestsSeated: result.finalState.seatedIds.length,
      completedGuests: result.finalState.completedGuests,
      scenariosFired: result.finalState.day.scenariosFiredThisService,
      scenariosPlanned: result.finalState.day.scenarioTriggerTimes.length + result.finalState.day.scenariosFiredThisService
    };

    // ORDER 239 uppföljning — rapport skrivs bara när WRITE_REPORTS=1.
    if (process.env.WRITE_REPORTS === '1') {
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(
        REPORT_JSON,
        JSON.stringify(
          {
            summary,
            stateChanges: result.stateChanges,
            // Full timeline: alla ticks där något ankare var aktivt + heartbeats var 10 s.
            timeline: result.timeline
          },
          null,
          2
        )
      );
    }

    const scenarioChanges = result.stateChanges.filter((c) => c.kind === 'scenario.phase');
    const scheduleChanges = result.stateChanges.filter((c) => c.kind === 'scheduled.consumed');
    // eslint-disable-next-line no-console
    console.info(
      `\n[ORDER 227] anchor measurement — seed=${seed}, ${lengthMinutes}-min dinner\n` +
        `  frames-with-any-anchor: ${summary.framesWithAnyAnchor} / ${totalTicks} ` +
        `(${summary.framesWithAnchorPercent}%)\n` +
        `  fires per anchor: greet=${result.firePerAnchor.greet} order=${result.firePerAnchor.order} ` +
        `setDown=${result.firePerAnchor.setDown} requestCheck=${result.firePerAnchor.requestCheck} ` +
        `pay=${result.firePerAnchor.pay}  (total=${summary.totalFires})\n` +
        `  guests: ${summary.completedGuests} completed  (${summary.guestsSpawned} still in state at end)\n` +
        `  scenarios: fired=${summary.scenariosFired} plannedRemaining=${result.finalState.day.scenarioTriggerTimes.length} ` +
        `firedIds=${JSON.stringify(result.finalState.firedScenarioIds)}\n` +
        `  scenario.phase-transitions: ${scenarioChanges.length}, schedule-consumptions: ${scheduleChanges.length}\n` +
        `  first scenario.phase-transitions: ${scenarioChanges.slice(0, 5).map((c) => `${c.simTime}s:${c.detail}`).join(' | ') || '(none)'}\n` +
        `  first schedule-consumptions: ${scheduleChanges.slice(0, 3).map((c) => `${c.simTime}s:${c.detail}`).join(' | ') || '(none)'}\n` +
        `  report written: reports/order227-anchor-measurement/anchors-timeline.json\n`
    );

    // Assertions: bara mätningen får misslyckas om setup-scriptet gjort
    // fel — ingen guardar mot noll fires (det är exakt det VO frågar
    // efter). Verifiera att sim faktiskt körde ett pass.
    expect(result.finalState.simTime).toBeGreaterThan(lengthMinutes * 60);
    expect(result.finalState.day.period).toBeDefined();
    expect(summary.totalFires).toBeGreaterThanOrEqual(0);
  });
});
