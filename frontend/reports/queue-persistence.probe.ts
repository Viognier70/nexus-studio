// Queue persistence probe (ORDER 043 v3 §5.1 follow-up).
//
// Vision Owner: "Ingen kö syns i vyn trots soc=0.00 och fullt rum.
// Tabellen visade toppkö 7 men medelkö 0.11 — kön existerar alltså i
// enstaka ögonblick och töms direkt. Består den under två sekunder är
// fenomenet inte byggbart som avläsning."
//
// This probe measures four things per social level, averaged across
// seeds, over a full dinner service:
//
//   peakQueue         — max waitingIds.length observed
//   meanQueueAll      — time-integrated mean (∫ q dt / T)
//   meanQueueWhenOn   — time-integrated mean over the moments the
//                       queue was non-empty (∫ q dt where q>0 / T_on)
//   dutyCycle         — fraction of service duration with queue > 0
//   meanDwellSeconds  — per guest that ever queued: sim-seconds spent
//                       in the 'waiting' state before being seated or
//                       leaving. Answers "does a queue member sit
//                       there long enough to be seen?"
//
// Run with: npx tsx frontend/reports/queue-persistence.probe.ts

import { reducer } from '../src/strategic/simulation/reducer';
import { makeInitialState } from '../src/strategic/simulation/model';
import type { SimulationState } from '../src/strategic/types';

const TICK_SECONDS = 0.2;
const SERVICE_MINUTES = 10;
const TICKS = Math.floor((SERVICE_MINUTES * 60) / TICK_SECONDS);

interface RunResult {
  peakQueue: number;
  meanQueueAll: number;
  meanQueueWhenOn: number;
  dutyCycle: number;
  meanDwellSeconds: number;
  guestsThatQueued: number;
}

function simulateDinner(seed: number, socialValue: number): RunResult {
  let s: SimulationState = reducer(makeInitialState(seed), {
    type: 'SKIP_LUNCH'
  });
  s = reducer(s, { type: 'SET_CAPITAL', capital: 'social', value: socialValue });
  s = reducer(s, {
    type: 'OPEN_SERVICE',
    service: 'dinner',
    lengthMinutes: SERVICE_MINUTES
  });

  let peak = 0;
  let queueTimeSum = 0;         // ∫ q dt
  let queueTimeSumWhenOn = 0;   // ∫ q dt where q > 0
  let timeOn = 0;               // duration q > 0

  // Per-guest dwell tracking: when a guest first enters 'waiting',
  // record simTime. When they leave 'waiting' (become seated or leaving),
  // record the delta. Guests still waiting at end-of-service also count
  // (dwell = simTime - enteredAt), so we don't undercount a saturated
  // room where the queue never drains.
  const enteredWaitAt = new Map<string, number>();
  const dwellSeconds: number[] = [];

  for (let i = 0; i < TICKS; i++) {
    s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
    const q = s.waitingIds.length;
    if (q > peak) peak = q;
    queueTimeSum += q * TICK_SECONDS;
    if (q > 0) {
      queueTimeSumWhenOn += q * TICK_SECONDS;
      timeOn += TICK_SECONDS;
    }
    // Track dwell: any guest currently in 'waiting' — record entry.
    // Any guest that had an entry but no longer in 'waiting' — record exit.
    const currentlyWaiting = new Set<string>();
    for (const g of s.guests) {
      if (g.state === 'waiting') {
        currentlyWaiting.add(g.id);
        if (!enteredWaitAt.has(g.id)) enteredWaitAt.set(g.id, s.simTime);
      }
    }
    // Exit events: anyone in enteredWaitAt but not currently waiting.
    for (const [gid, at] of enteredWaitAt) {
      if (!currentlyWaiting.has(gid)) {
        dwellSeconds.push(s.simTime - at);
        enteredWaitAt.delete(gid);
      }
    }
  }
  // Any still-waiting guests at end of run: dwell = final simTime - entered.
  for (const [, at] of enteredWaitAt) {
    dwellSeconds.push(s.simTime - at);
  }

  const totalTime = TICKS * TICK_SECONDS;
  return {
    peakQueue: peak,
    meanQueueAll: queueTimeSum / totalTime,
    meanQueueWhenOn: timeOn > 0 ? queueTimeSumWhenOn / timeOn : 0,
    dutyCycle: timeOn / totalTime,
    meanDwellSeconds:
      dwellSeconds.length > 0
        ? dwellSeconds.reduce((a, b) => a + b, 0) / dwellSeconds.length
        : 0,
    guestsThatQueued: dwellSeconds.length
  };
}

function main() {
  const socials = [1.0, 0.7, 0.5, 0.3, 0.0];
  const seeds = [11, 22, 33, 44, 55, 66, 77, 88];
  console.log(
    `\nDINNER queue persistence — ${SERVICE_MINUTES}-min service × ${seeds.length} seeds\n`
  );
  console.log(
    'social  peak  meanAll  meanOn  duty%  dwell(s)  queuedN'
  );
  console.log(
    '------  ----  -------  ------  -----  --------  -------'
  );
  for (const sv of socials) {
    const runs = seeds.map((seed) => simulateDinner(seed, sv));
    const avg = (pick: (r: RunResult) => number) =>
      runs.reduce((sum, r) => sum + pick(r), 0) / runs.length;
    const peak = Math.max(...runs.map((r) => r.peakQueue));
    const meanAll = avg((r) => r.meanQueueAll);
    const meanOn = avg((r) => r.meanQueueWhenOn);
    const duty = avg((r) => r.dutyCycle);
    const dwell = avg((r) => r.meanDwellSeconds);
    const queuedN = avg((r) => r.guestsThatQueued);
    console.log(
      `${sv.toFixed(2).padStart(6)}  ${peak.toString().padStart(4)}  ${meanAll.toFixed(2).padStart(7)}  ${meanOn.toFixed(2).padStart(6)}  ${(duty * 100).toFixed(1).padStart(5)}  ${dwell.toFixed(1).padStart(8)}  ${queuedN.toFixed(1).padStart(7)}`
    );
  }
  console.log(
    '\nReading: dwell < 2 s means the queue drains before a player can see it — unbuildable as a phenomenon.\n'
  );
}

main();
