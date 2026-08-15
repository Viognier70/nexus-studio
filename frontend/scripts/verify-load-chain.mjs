#!/usr/bin/env node
// Trace the load chain from sim.guests to staff.workload and social,
// sampled per sim-second over a full service. Answers:
//   - When is staff.workload = 0 vs > 0?
//   - Does seated=16 imply workload > 0? Or is there a state where
//     the room is full but staff are idle?
//   - What drives capitals.values.social down?
//   - What's the actual peak queue length?

import { reducer } from '../src/strategic/simulation/reducer.ts';
import { makeInitialState } from '../src/strategic/simulation/model.ts';

const tickHz = 5;
const dt = 1 / tickHz;
const runUntilSec = 3600;   // 60 min so we see the whole arc

const SCRIPT = [
  { atSec: 3, action: { type: 'SKIP_LUNCH' } },
  { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 } }
].sort((a, b) => a.atSec - b.atSec);

let state = makeInitialState(3);
let scriptIdx = 0;

const samples = [];   // one per sim-second
let peakQueue = 0;
let peakGuests = 0;
let socMin = 1, socMax = 0;
const socFirst = state.capitals.values.social;

let ticks = 0;
let nextSampleAt = 0;
const maxTicks = Math.ceil(runUntilSec * tickHz) + 100;

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

  if (state.waitingIds.length > peakQueue) peakQueue = state.waitingIds.length;
  if (state.guests.length > peakGuests) peakGuests = state.guests.length;
  const soc = state.capitals.values.social;
  if (soc < socMin) socMin = soc;
  if (soc > socMax) socMax = soc;

  if (state.simTime >= nextSampleAt) {
    nextSampleAt += 30;   // sample every 30 sim-seconds
    const workloads = state.staff.map((s) => s.workload);
    const avgWork = workloads.length
      ? workloads.reduce((a, b) => a + b, 0) / workloads.length
      : 0;
    const guestStates = {};
    for (const g of state.guests) {
      guestStates[g.state] = (guestStates[g.state] ?? 0) + 1;
    }
    const activeGuests = state.guests.filter((g) =>
      ['arriving', 'waiting', 'seated', 'ordering', 'dining', 'paying'].includes(g.state)
    ).length;
    samples.push({
      t: Math.round(state.simTime),
      period: state.day.period,
      doors: state.day.doorsOpenedThisService ? 'Y' : 'N',
      guests: state.guests.length,
      active: activeGuests,
      seat: state.seatedIds.length,
      wait: state.waitingIds.length,
      workAvg: avgWork.toFixed(2),
      workEach: workloads.map((w) => w.toFixed(2)).join(','),
      soc: state.capitals.values.social.toFixed(3),
      ecoR: state.eco.social.value.toFixed(3),
      rhythm: state.day.serviceRhythm ?? '-',
      states: JSON.stringify(guestStates)
    });
  }
}

// Print every ~30-sec sample around the service window.
console.log('=== chain samples (every 30 sim-seconds) ===');
console.log('t   period    doors g active seat wait  workAvg  workEach            soc    ecoR   rhythm  states');
for (const s of samples) {
  if (s.period === 'lunch' || s.period === 'dinner' || Math.abs(s.t - 60) < 90) {
    console.log(
      `${String(s.t).padStart(4)}  ${s.period.padEnd(9)} ${s.doors}    ${String(s.guests).padStart(2)} ${String(s.active).padStart(6)}  ${String(s.seat).padStart(2)}  ${String(s.wait).padStart(2)}   ${s.workAvg}    ${s.workEach.padEnd(18)} ${s.soc}  ${s.ecoR}  ${s.rhythm.padEnd(5)}  ${s.states}`
    );
  }
}

console.log('=== summary ===');
console.log(`peak state.guests.length: ${peakGuests}`);
console.log(`peak state.waitingIds.length: ${peakQueue}`);
console.log(`capitals.values.social: initial=${socFirst.toFixed(3)}, min=${socMin.toFixed(3)}, max=${socMax.toFixed(3)}, final=${state.capitals.values.social.toFixed(3)}`);
console.log(`state.eco.social (rolling window read): final=${state.eco.social.value.toFixed(3)}`);
console.log(`ACTIVE_GUEST_CAP source: arrivals.ts line 80`);
console.log(`WAITING_QUEUE_CAP source: service.ts line 24`);
