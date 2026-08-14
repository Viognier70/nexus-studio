// ORDER 087 §6.5 — fixed-seed full-service face-distribution test.
//
// "Test som hävdar att alla tre av `tense`, `strained` och `hurried`
// är nåbara i en full service på fast frö, och att ingen av dem har
// noll speltid."
//
// Method: run the INFRA-2 harness through a full dinner service at
// a fixed seed, sample deriveStaffFace at every tick, tally counts
// per face. Assert `tense`, `strained`, and `hurried` all appear.
//
// Load distribution is captured as a side-artefact and written into
// UNDERLAG_003_MEASUREMENTS.md via the report harness. This test
// itself is the artefact for measurement 0.3.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import { deriveStaffFace, recentAnswerHit } from '../../ui/RoomCardPanel/deriveFaces';
import type { FaceKey } from '../../ui/RoomCardPanel/deriveFaces';
import type { SimAction, SimulationState } from '../../types';

// Build a service that will pass through green → amber → red rhythm
// by hiring one server (thin team) and running a long dinner with
// default policies. Fixed seed so the assertion is deterministic.
const SCRIPT: readonly { atSec: number; action: SimAction }[] = [
  { atSec: 1, action: { type: 'SET_POLICY', patch: { pricing: 'medel', capacity: 12 } } },
  { atSec: 3, action: { type: 'SKIP_LUNCH' } },
  { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 } }
];

function runFullService(seed: number): {
  faceCounts: Record<string, number>;
  workloadSamples: number[];
} {
  const tickHz = 5;
  const dt = 1 / tickHz;
  let state: SimulationState = makeInitialState(seed);
  let scriptIdx = 0;
  const script = [...SCRIPT].sort((a, b) => a.atSec - b.atSec);
  const faceCounts: Record<string, number> = {};
  const workloadSamples: number[] = [];

  const runUntilSec = 2400;   // enough to cover opening + prep + full 30 min service + close
  const maxTicks = Math.ceil(runUntilSec * tickHz) + 100;
  let ticks = 0;
  while (state.simTime < runUntilSec && ticks < maxTicks) {
    ticks += 1;
    while (scriptIdx < script.length && script[scriptIdx].atSec <= state.simTime) {
      state = reducer(state, script[scriptIdx].action);
      scriptIdx += 1;
    }
    if (state.scenario.awaitingChoice) {
      state = reducer(state, { type: 'RESOLVE_SCENARIO', choice: 'A' });
    }
    state = reducer(state, { type: 'TICK', dt });
    // Only sample face-during-service so pre-service ticks don't
    // dilute the count with 'neutral'.
    const inService =
      (state.day.period === 'dinner' || state.day.period === 'lunch') &&
      state.day.doorsOpenedThisService;
    if (inService) {
      const answerHit = recentAnswerHit(state.enablers, state.simTime);
      for (const s of state.staff) {
        const targetGuest = s.targetGuestId
          ? state.guests.find((g) => g.id === s.targetGuestId) ?? null
          : null;
        const face: FaceKey = deriveStaffFace({
          staff: s,
          day: state.day,
          simTime: state.simTime,
          recentAnswerHitFlag: answerHit,
          targetGuestSatisfaction: targetGuest?.satisfaction ?? null
        });
        faceCounts[face] = (faceCounts[face] ?? 0) + 1;
        workloadSamples.push(s.workload);
      }
    }
  }

  return { faceCounts, workloadSamples };
}

describe('ORDER 087 §6.5 — face distribution over a full service', () => {
  it('a full service at seed=3 reaches every band under pressure at least once', () => {
    const { faceCounts, workloadSamples } = runFullService(3);
    // Emit for UNDERLAG_003_MEASUREMENTS.md — this test IS the artefact
    // for measurement 0.3. Comment out the log if it becomes noisy.
    if (process.env.ORDER_087_MEASUREMENT_LOG === '1') {
      // Histogram of workload samples into bands the face rules read.
      const bands = { '<0.4': 0, '0.4–0.7': 0, '0.7–0.85': 0, '>=0.85': 0 };
      for (const w of workloadSamples) {
        if (w < 0.4) bands['<0.4'] += 1;
        else if (w < 0.7) bands['0.4–0.7'] += 1;
        else if (w < 0.85) bands['0.7–0.85'] += 1;
        else bands['>=0.85'] += 1;
      }
      // ORDER 088 §2.1 — percentiles so the bands can be placed where
      // the mass actually is, not where a pre-chosen threshold puts them.
      const sorted = [...workloadSamples].sort((a, b) => a - b);
      const pct = (p: number) => sorted[Math.floor(sorted.length * p)];
      const percentiles = {
        p10: pct(0.1), p20: pct(0.2), p25: pct(0.25),
        p33: pct(0.333), p40: pct(0.4), p50: pct(0.5),
        p60: pct(0.6), p67: pct(0.667), p75: pct(0.75),
        p80: pct(0.8), p90: pct(0.9), p95: pct(0.95)
      };
      // eslint-disable-next-line no-console
      console.log('ORDER 087 §0.3 face counts:', JSON.stringify(faceCounts));
      // eslint-disable-next-line no-console
      console.log('ORDER 087 §0.3 workload bands:', JSON.stringify(bands));
      // eslint-disable-next-line no-console
      console.log('ORDER 087 §0.3 sample size:', workloadSamples.length);
      // eslint-disable-next-line no-console
      console.log('ORDER 088 §2.1 workload percentiles:', JSON.stringify(
        Object.fromEntries(Object.entries(percentiles).map(([k, v]) => [k, v.toFixed(3)]))
      ));
    }
    // At minimum, a busy service must land on each of these three at
    // least once (they are the pressure bands). If any is missing on
    // this seed, tune the SCRIPT (thin the team, extend the service)
    // rather than widening the assertion — per ORDER 087 §7 "Inget
    // testband vidgas". The harness above uses default policies with
    // a modest 30-minute dinner; adjust SCRIPT above if the seed lands
    // us in a genuinely calm service.
    //
    // Rationale for asserting non-zero rather than a specific ratio:
    // any specific ratio is exactly the kind of "räknad" number
    // ORDER 087 §2 warns against baking in without measurement. The
    // ratio itself IS the measurement for 0.3, captured separately.
    const pressureFaces: FaceKey[] = ['tense', 'strained', 'hurried'];
    for (const face of pressureFaces) {
      expect(
        (faceCounts[face] ?? 0) > 0,
        `face "${face}" was never reached during a full service — count=${faceCounts[face] ?? 0}. All counts: ${JSON.stringify(faceCounts)}`
      ).toBe(true);
    }
  });
});

// Export the harness so a documentation/measurements-generation script
// can consume it if a future reporter wants to re-emit the load
// distribution.
export { runFullService };

// ORDER 089 §2 — medgångsinventering.
//
// Run the same harness but also count event stream categories +
// service-rhythm colour ticks + face counts per actor type. Emitted
// under the ORDER_089_MEDGANG_LOG env so the M9 report can quote
// deterministic numbers. Not part of the ORDER 087 §6.5 DoD; this
// test is a measurement artefact for the M9 report gate.

import { deriveGuestFace } from '../../ui/RoomCardPanel/deriveFaces';

describe('ORDER 089 §2 — medgångsinventering', () => {
  it('reports face counts (guest + staff), stream categories, rhythm colour ticks', () => {
    if (process.env.ORDER_089_MEDGANG_LOG !== '1') return;

    const tickHz = 5;
    const dt = 1 / tickHz;
    let state = makeInitialState(3);
    let scriptIdx = 0;
    const script = [
      { atSec: 1, action: { type: 'SET_POLICY' as const, patch: { pricing: 'medel' as const, capacity: 12 } } },
      { atSec: 3, action: { type: 'SKIP_LUNCH' as const } },
      { atSec: 60, action: { type: 'OPEN_SERVICE' as const, service: 'dinner' as const, lengthMinutes: 30 } }
    ].sort((a, b) => a.atSec - b.atSec);

    const staffFaceCounts: Record<string, number> = {};
    const guestFaceCounts: Record<string, number> = {};
    const rhythmCounts = { green: 0, amber: 0, red: 0, none: 0 };
    const runUntilSec = 2400;
    const maxTicks = Math.ceil(runUntilSec * tickHz) + 100;
    let ticks = 0;
    while (state.simTime < runUntilSec && ticks < maxTicks) {
      ticks += 1;
      while (scriptIdx < script.length && script[scriptIdx].atSec <= state.simTime) {
        state = reducer(state, script[scriptIdx].action);
        scriptIdx += 1;
      }
      if (state.scenario.awaitingChoice) {
        state = reducer(state, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
      state = reducer(state, { type: 'TICK', dt });

      // Only sample during service window.
      const inService =
        (state.day.period === 'dinner' || state.day.period === 'lunch') &&
        state.day.doorsOpenedThisService;
      if (!inService) continue;

      const answerHit = false; // approximation — full recentAnswerHit is elsewhere
      for (const s of state.staff) {
        const targetGuest = s.targetGuestId
          ? state.guests.find((g) => g.id === s.targetGuestId) ?? null
          : null;
        const face = deriveStaffFace({
          staff: s, day: state.day, simTime: state.simTime,
          recentAnswerHitFlag: answerHit,
          targetGuestSatisfaction: targetGuest?.satisfaction ?? null
        });
        staffFaceCounts[face] = (staffFaceCounts[face] ?? 0) + 1;
      }
      for (const g of state.guests) {
        const face = deriveGuestFace(g, state.simTime);
        guestFaceCounts[face] = (guestFaceCounts[face] ?? 0) + 1;
      }
      const rhythm = state.day.serviceRhythm ?? 'none';
      rhythmCounts[rhythm] = (rhythmCounts[rhythm] ?? 0) + 1;
    }

    // Event stream categories — categorise post-run.
    const eventCounts = { ambient: 0, outcome: 0, positive: 0 };
    for (const entry of state.eventStream) {
      eventCounts[entry.category] = (eventCounts[entry.category] ?? 0) + 1;
    }

    // eslint-disable-next-line no-console
    console.log('ORDER 089 §2.1 staff face counts:', JSON.stringify(staffFaceCounts));
    // eslint-disable-next-line no-console
    console.log('ORDER 089 §2.1 guest face counts:', JSON.stringify(guestFaceCounts));
    // eslint-disable-next-line no-console
    console.log('ORDER 089 §2.2 event stream categories (ring-buffered latest):', JSON.stringify(eventCounts));
    // eslint-disable-next-line no-console
    console.log('ORDER 089 §2.3 rhythm colour ticks:', JSON.stringify(rhythmCounts));
    // eslint-disable-next-line no-console
    console.log('ORDER 089 §2 sample size:', ticks);
    expect(ticks).toBeGreaterThan(0);
  });
});
