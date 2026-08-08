// ORDER 043 Addendum A — sample stream probe.
//
// Per §A.7: "Report with a sample stream — twenty consecutive events
// at a weak team and at a strong one — before wiring it to the view."
//
// Runs a 15-minute dinner at each condition, captures the first 20
// consecutive ambient events that fire, and prints them with time
// offsets so the Vision Owner can judge whether the stream reads as
// an evening.
//
// Run with: npx tsx frontend/reports/event-stream.probe.ts
//
// Also prints the total event count over the full 15 min so the
// "≈ 2-3 vs ≈ 22" prediction from the model report can be verified
// against actual runs.

import { reducer } from '../src/strategic/simulation/reducer';
import { makeInitialState } from '../src/strategic/simulation/model';
import type { EventStreamEntry, SimulationState } from '../src/strategic/types';

const SERVICE_MINUTES = 15;
const TICKS = Math.floor((SERVICE_MINUTES * 60) / 0.2);

interface Condition {
  label: string;
  trainingLevel: 1 | 2 | 3;
  staffCount: 2 | 3 | 4;
}

// Two conditions per §A.7. Load will build naturally from the arrival
// pressure — dinner base 12/min × rep 0.6 × economic 0.55 gives ~4-5
// arrivals per sim-min, which stresses staffCount=2 (capacity 10) but
// not staffCount=4 (capacity 20). So condition also drives load
// indirectly.
const STRONG_TEAM: Condition = {
  label: 'STRONG (trainingLevel 3, staffCount 4)',
  trainingLevel: 3,
  staffCount: 4
};

const WEAK_TEAM: Condition = {
  label: 'WEAK   (trainingLevel 1, staffCount 2)',
  trainingLevel: 1,
  staffCount: 2
};

function runDinner(
  seed: number,
  condition: Condition
): { entries: EventStreamEntry[]; finalStreamLen: number; finalRep: number } {
  let s: SimulationState = reducer(makeInitialState(seed), {
    type: 'SKIP_LUNCH'
  });
  s = reducer(s, {
    type: 'SET_POLICY',
    patch: {
      trainingLevel: condition.trainingLevel,
      staffCount: condition.staffCount
    }
  });
  s = reducer(s, {
    type: 'OPEN_SERVICE',
    service: 'dinner',
    lengthMinutes: SERVICE_MINUTES
  });
  const openedAt = s.simTime;
  // Collect every event as it appears in state.eventStream. We track
  // stream length between ticks and copy the new tail. Auto-resolve
  // scenarios that reach 'subject' so outcomes sample too — a real
  // playthrough would resolve them via the UI; the probe stands in.
  const collected: EventStreamEntry[] = [];
  let seen = 0;
  const choices: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  let choiceIdx = 0;
  for (let i = 0; i < TICKS; i++) {
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    if (s.scenario.phase === 'subject') {
      s = reducer(s, { type: 'ADVANCE_SCENARIO_TO_DIFFICULTY' });
      s = reducer(s, { type: 'SET_SCENARIO_DIFFICULTY', difficulty: 2 });
      s = reducer(s, {
        type: 'RESOLVE_SCENARIO',
        choice: choices[choiceIdx % choices.length]
      });
      choiceIdx += 1;
    }
    if (s.eventStream.length > seen) {
      for (let j = seen; j < s.eventStream.length; j++) {
        collected.push(s.eventStream[j]);
      }
      seen = s.eventStream.length;
    }
  }
  return {
    entries: collected.map((e) => ({ ...e, at: e.at - openedAt })),
    finalStreamLen: s.eventStream.length,
    finalRep: s.reputation
  };
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function report(condition: Condition, seed: number) {
  const { entries, finalStreamLen, finalRep } = runDinner(seed, condition);
  const ambient = entries.filter((e) => e.category === 'ambient');
  const outcomes = entries.filter((e) => e.category === 'outcome');

  console.log(`\n=== ${condition.label}  (seed ${seed}) ===`);
  console.log(
    `  ambient over ${SERVICE_MINUTES} min: ${ambient.length}  |  outcomes: ${outcomes.length}  |  final reputation ${finalRep.toFixed(2)}`
  );
  console.log('  first 20 ambient events (time from service open, kind, text):');
  for (const e of ambient.slice(0, 20)) {
    const kind = e.kind.padEnd(18);
    console.log(`   [${fmtTime(e.at)}]  ${kind}  ${e.text}`);
  }
  if (outcomes.length > 0) {
    console.log('  outcome events (from scenarios that fired):');
    for (const e of outcomes) {
      console.log(`   [${fmtTime(e.at)}]  outcome           ${e.text}`);
    }
  }
  void finalStreamLen;
}

function main() {
  console.log(
    `ORDER 043 Addendum A — sample streams (dinner, ${SERVICE_MINUTES} min)`
  );
  console.log(
    'Both runs use the same seed so arrivals + capital drifts are identical;\nonly team competence + staffing differ.\n'
  );
  const SEED = 42;
  report(STRONG_TEAM, SEED);
  report(WEAK_TEAM, SEED);
  console.log('');
}

main();
