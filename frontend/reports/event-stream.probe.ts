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
import { makeTeamMember } from '../src/strategic/simulation/team';
import type {
  EventStreamEntry,
  SimulationState,
  TeamMember
} from '../src/strategic/types';

const SERVICE_MINUTES = 15;
const TICKS = Math.floor((SERVICE_MINUTES * 60) / 0.2);

interface Condition {
  label: string;
  buildTeam: () => TeamMember[];
}

// Rewired at ORDER 043 v3 §10 step 5 — competence + capacity now
// come from state.team, not policies. Conditions build the team
// directly.
const STRONG_TEAM: Condition = {
  label: 'STRONG (4 competent members: värd + servitör + kock + lärling with upped competence)',
  buildTeam: () => {
    const members = [
      makeTeamMember('värd', 1),
      makeTeamMember('servitör', 1),
      makeTeamMember('kock', 1),
      makeTeamMember('lärling', 1)
    ];
    // Give the lärling higher-than-default competence for a "trained"
    // apprentice — reads as a well-drilled team.
    members[3].competence = { scientific: 0.55, cultural: 0.55, practical: 0.55 };
    return members;
  }
};

const WEAK_TEAM: Condition = {
  label: 'WEAK   (2 members: värd + lärling only, no kock)',
  buildTeam: () => [
    makeTeamMember('värd', 1),
    makeTeamMember('lärling', 1)
  ]
};

function runDinner(
  seed: number,
  condition: Condition
): { entries: EventStreamEntry[]; finalStreamLen: number; finalRep: number } {
  let s: SimulationState = reducer(makeInitialState(seed), {
    type: 'SKIP_LUNCH'
  });
  // Rebuild the team for this condition (probe-only shortcut — real
  // gameplay would hire/fire via UI, not swap wholesale).
  s = {
    ...s,
    team: {
      ...s.team,
      members: condition.buildTeam()
    }
  };
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
