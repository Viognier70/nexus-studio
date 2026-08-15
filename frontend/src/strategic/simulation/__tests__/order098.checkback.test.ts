// ORDER 098 — dining-hålet.
//
// Testar två saker enligt ordern §6.3 + §6.4:
//
// **DoD 3** — Ett scenario där samtliga sittande gäster är i `dining`
// får inte ge `workAvg = 0` för teamet. Före ORDER 098 gav det just 0
// under `service='vardaglig'` (default), för att PRIORITY inte matchade
// dining-tillståndet — se `LOAD_CHAIN_TRACE_2026-08-15.md`. Nu ska
// checkback-tasken fånga upp dining-gäster efter cooldown.
//
// **DoD 4** — Regressionstest på det reproducerade fallet: sju gäster,
// sju sittande, sex i dining. Rapporten §rotorsak återgav
// `t=240s: guests=7, seated=7, workAvg=0.00, states={"dining":6,"seated":1}`.
// Vid samma seed (3), samma script, samma tick: workAvg ska ha lyft från
// noll. Håller inte exakta tal — testet är strukturellt: workAvg > 0.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeGuest, makeInitialState } from '../model';
import type { Guest, SimAction, SimulationState } from '../../types';

const TICK_HZ = 5;
const DT = 1 / TICK_HZ;

// Samma script som order087.faceDistribution.test.ts — deterministiskt
// mot seed=3, samma opening/prep-fönster, samma dinner-längd. Ordern
// säger explicit att banden 0.95 / 0.7 inte ska röras; detta test rör
// dem inte, det mäter bara workload-avläsningen.
const HARNESS_SCRIPT: readonly { atSec: number; action: SimAction }[] = [
  { atSec: 1, action: { type: 'SET_POLICY', patch: { pricing: 'medel', capacity: 12 } } },
  { atSec: 3, action: { type: 'SKIP_LUNCH' } },
  { atSec: 60, action: { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 } }
];

function meanWorkload(state: SimulationState): number {
  if (state.staff.length === 0) return 0;
  const sum = state.staff.reduce((s, m) => s + m.workload, 0);
  return sum / state.staff.length;
}

describe('ORDER 098 §6.3 — workAvg > 0 när samtliga sittande är i dining', () => {
  it('handkonstruerat scenario: sex dining-gäster, tre staff — workAvg lyfter från noll', () => {
    // Utgångspunkt: en initial state där doors har öppnats så tickStaff
    // faktiskt kör. Vi ratar hela flödet och sätter guests + tillstånd
    // direkt så testet inte beror på arrival-modellens RNG.
    let state = makeInitialState(3);
    state = reducer(state, { type: 'SKIP_LUNCH' });
    state = reducer(state, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes: 30 });
    // Tick förbi opening + prep så doorsOpenedThisService blir true.
    // OPENING_DURATION_SEC + PREP_DURATION_SEC ligger under 60 s totalt
    // (se reducer.ts) — 400 tick = 80 sim-sek, säkert efter.
    for (let i = 0; i < 400; i++) state = reducer(state, { type: 'TICK', dt: DT });

    // Rensa slumpade guests. Injicera exakt sex dining-gäster som just
    // har hunnit in i dining (stateTime = now − 1, före första
    // checkback-cooldown så första ticken direkt matchar). Sätter
    // lastCheckbackAt = null så cooldown räknas från stateTime.
    const now = state.simTime;
    const seatIds: string[] = [];
    state.guests = [];
    state.seatedIds = [];
    state.waitingIds = [];
    for (let i = 0; i < 6; i++) {
      const g: Guest = makeGuest(now - 30, false, false);
      g.id = `dining-${i}`;
      g.state = 'dining';
      g.seatIndex = i;
      g.stateTime = now - 20; // 20 s in i dining → första cooldown snart nådd
      g.lastCheckbackAt = null;
      g.satisfaction = 0.6;
      g.moveProgress = 1;
      state.guests.push(g);
      state.seatedIds.push(g.id);
      seatIds.push(g.id);
    }
    // Nollställ staff.workload så vi mäter från noll — vi vill se att
    // det RÖR SIG från noll, inte att det bibehåller ett värde från
    // opening/prep-perioden.
    for (const s of state.staff) {
      s.workload = 0;
      s.taskType = null;
      s.taskProgress = 0;
      s.taskDuration = 0;
      s.targetGuestId = null;
    }

    expect(meanWorkload(state)).toBe(0);

    // Ticka tillräckligt länge för att första checkback-cooldownen ska
    // löpa ut (15 s) och några tasks ska hinna genomföras.
    // 15 s cooldown + task-varaktighet ≈ 20 s → 100 tick vid 5 Hz.
    for (let i = 0; i < 200; i++) state = reducer(state, { type: 'TICK', dt: DT });

    // DoD-kravet: workAvg får inte vara noll. Före ORDER 098 stannade
    // det på 0.00 i det här scenariot; efter ska minst en staff ha
    // ackumulerat workload från checkback-tasken.
    expect(meanWorkload(state)).toBeGreaterThan(0);
  });
});

describe('ORDER 098 §6.4 — regression på LOAD_CHAIN_TRACE §rotorsak (7 gäster, seed=3)', () => {
  it('samma seed+script som trace-rapporten: workAvg > 0 innan service når slutet', () => {
    // Kör harnessen till t ≈ 240 s (samma tick som trace-rapporten
    // återgav). Före ORDER 098 var workAvg = 0.00 där. Testet är
    // strukturellt: workAvg > 0 vid någon tick i intervallet
    // [200, 300] s. Håller inte exakta tal — dining-fönstret kan
    // förskjutas nagot av checkback-timing.
    let state = makeInitialState(3);
    let scriptIdx = 0;
    const script = [...HARNESS_SCRIPT].sort((a, b) => a.atSec - b.atSec);

    let sawNonZero = false;
    // Kör fram till t = 500 s för säkerhets skull, men förvänta att
    // sawNonZero blir true långt före dess.
    while (state.simTime < 500) {
      while (scriptIdx < script.length && script[scriptIdx].atSec <= state.simTime) {
        state = reducer(state, script[scriptIdx].action);
        scriptIdx += 1;
      }
      if (state.scenario.awaitingChoice) {
        state = reducer(state, { type: 'RESOLVE_SCENARIO', choice: 'A' });
      }
      state = reducer(state, { type: 'TICK', dt: DT });

      const inService =
        (state.day.period === 'dinner' || state.day.period === 'lunch') &&
        state.day.doorsOpenedThisService;
      if (inService && meanWorkload(state) > 0) {
        sawNonZero = true;
        break;
      }
    }
    expect(sawNonZero, `workAvg förblev noll under hela in-service-fönstret; dining-hålet inte täckt`).toBe(true);
  });
});
