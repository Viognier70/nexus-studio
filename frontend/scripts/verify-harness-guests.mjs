#!/usr/bin/env node
// One-off: does the ORDER 087 §6.5 / ORDER 088 §2.1 / ORDER 089 §2
// harness actually populate state.guests, or was it running on an
// empty room the whole time?
//
// If guests are empty, staff.workload stays ~0 (workload decays when
// idle) and p50=0.916 could not have come from that harness.
// Conversely, if guests exist, the p50=0.916 measurement is valid
// and the face-band retune stands.

// Re-implement the loop with the same script as ORDER 087 §6.5
// harness, but track guest.length + seated + waiting over time.
// Do not import the .test.ts (it initialises vitest suite scaffolding
// which explodes outside a vitest run).

import { reducer } from '../src/strategic/simulation/reducer.ts';
import { makeInitialState } from '../src/strategic/simulation/model.ts';

const tickHz = 5;
const dt = 1 / tickHz;
const runUntilSec = 2400;
const maxTicks = Math.ceil(runUntilSec * tickHz) + 100;

const SCRIPT = [
  { atSec: 1, action: { type: 'SET_POLICY', patch: { pricing: 'medel', capacity: 12 } } },
  { atSec: 3, action: { type: 'SKIP_LUNCH' } },
  { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 } }
].sort((a, b) => a.atSec - b.atSec);

let state = makeInitialState(3);
let scriptIdx = 0;

const guestSizes = [];
const seatedSizes = [];
const waitingSizes = [];
const workloadStats = [];
let inServiceTicks = 0;
let peakGuests = 0;

let ticks = 0;
while (state.simTime < runUntilSec && ticks < maxTicks) {
  ticks += 1;
  while (scriptIdx < SCRIPT.length && SCRIPT[scriptIdx].atSec <= state.simTime) {
    state = reducer(state, SCRIPT[scriptIdx].action);
    scriptIdx += 1;
  }
  if (state.scenario.awaitingChoice) {
    state = reducer(state, { type: 'RESOLVE_SCENARIO', choice: 'A' });
  }
  state = reducer(state, { type: 'TICK', dt });
  const inService =
    (state.day.period === 'dinner' || state.day.period === 'lunch') &&
    state.day.doorsOpenedThisService;
  if (inService) {
    inServiceTicks += 1;
    guestSizes.push(state.guests.length);
    seatedSizes.push(state.seatedIds.length);
    waitingSizes.push(state.waitingIds.length);
    if (state.guests.length > peakGuests) peakGuests = state.guests.length;
    for (const s of state.staff) workloadStats.push(s.workload);
  }
}

function stats(arr) {
  if (!arr.length) return { n: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.floor(sorted.length * p)];
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    n: arr.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: (sum / arr.length).toFixed(3),
    p25: pct(0.25),
    p50: pct(0.5),
    p75: pct(0.75),
    p95: pct(0.95),
    zeroFrac: (arr.filter((v) => v === 0).length / arr.length).toFixed(3)
  };
}

console.log('seed:', 3);
console.log('in-service ticks:', inServiceTicks);
console.log('workload samples:', workloadStats.length, '(3 staff × ticks)');
console.log('peak state.guests.length during service:', peakGuests);
console.log('guests.length stats:', stats(guestSizes));
console.log('seatedIds.length stats:', stats(seatedSizes));
console.log('waitingIds.length stats:', stats(waitingSizes));
console.log('workload stats:', stats(workloadStats));
console.log('final state.period:', state.day.period);
console.log('final doorsOpenedThisService:', state.day.doorsOpenedThisService);
