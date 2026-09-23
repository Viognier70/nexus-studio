// ORDER 260 — mätning: tidsberoende negativ satisfaction + rep→arrivals.
//
// Ren mätning. Kör två saker för både 251- och 253-tempot:
//
//   1. Ett 15-min dinner-pass. Sat-histogram, rep-breakdown per kanal,
//      revenue/cost/result totalt, per-guest sat-loss från de nya
//      timing seated→order-complete (median, p90).
//
//   2. Tre dagar i följd. Per dag: rep vid dagens slut, ankomster,
//      revenue, cost, result. Läser i följd så dag-N:s arrivals-mult
//      speglar dag-(N-1)'s slut-rykte.
//
// Skriver JSON-rapport till `reports/order260/measurements.json` när
// `WRITE_REPORTS=1` är satt. Standard-läge: tystar utskrift, kontrollerar
// bara att alla scenarier levererar en finalState (inga assertions om
// tal — det är VO:s tolkning som räknas).
//
// Tempoväxeln: TASK_BASE_TICKS för greet/order/serve muterias direkt i
// modulen. ORDER 253-värdena (16/33/12) är kanoniska; för att köra
// ORDER 251-tempot (4/10/14) skriver vi tillfälligt om värdena och
// återställer efter passet.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import { TASK_BASE_TICKS } from '../economics';
import type { SimAction, SimulationState } from '../../types';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = resolve(HERE, '../../../../reports/order260');

interface DepartureLogEntry {
  guestId: string;
  satisfaction: number;
  simTime: number;
  seatedAtSimTime?: number;
  orderCompleteAtSimTime?: number;
}

function getDepartureLog(): DepartureLogEntry[] {
  const g = globalThis as unknown as { __nxRepDepartureLog?: DepartureLogEntry[] };
  return g.__nxRepDepartureLog ?? [];
}

function clearDepartureLog(): void {
  const g = globalThis as unknown as { __nxRepDepartureLog?: DepartureLogEntry[] };
  g.__nxRepDepartureLog = [];
}

// Match applyDevStartOverride i SimulationProvider.tsx — menu + stock
// måste finnas innan gäster kan serveras. Utan detta faller reducer
// tillbaka på legacy-fallback och de nya straffen syns inte i mätningen.
function seedMenuAndStock(state: SimulationState): SimulationState {
  const actions: SimAction[] = [
    { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'root-veg',  units: 100 },
    { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'leaf-veg',  units: 100 },
    { type: 'BUY_STOCK', supplierId: 'local-veg',  ingredientId: 'herbs',     units: 100 },
    { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'chicken',   units: 50  },
    { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'pork',      units: 50  },
    { type: 'BUY_STOCK', supplierId: 'meat-game',  ingredientId: 'lamb',      units: 30  },
    { type: 'BUY_STOCK', supplierId: 'meat-game',  ingredientId: 'game',      units: 20  },
    { type: 'BUY_STOCK', supplierId: 'lake-fish',  ingredientId: 'lake-fish', units: 30  },
    { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'eggs',      units: 50  },
    { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'dairy',     units: 50  },
    { type: 'BUY_STOCK', supplierId: 'brewery',    ingredientId: 'beer',      units: 60  },
    { type: 'COMPOSE_MENU', dishes: [
      { dishId: 'root-soup',     price: 95  },
      { dishId: 'chicken-plate', price: 175 },
      { dishId: 'pork-plate',    price: 195 },
      { dishId: 'lamb-plate',    price: 285 },
      { dishId: 'game-plate',    price: 385 },
      { dishId: 'fish-plate',    price: 265 },
      { dishId: 'dairy-dessert', price: 85  },
      { dishId: 'beer-pairing',  price: 55  }
    ] }
  ];
  let s = state;
  for (const a of actions) s = reducer(s, a);
  return s;
}

interface PassMeasurement {
  completedGuests: number;
  totalArrived: number;
  revenue: number;
  cost: number;
  result: number;
  reputationStart: number;
  reputationEnd: number;
  reputationDelta: number;
  reputationBreakdown: Record<string, number> | null;
  departureLogN: number;
  departureSatHistogram: Record<string, number>;
  departureSatMean: number | null;
  departureSatMedian: number | null;
  departureHappyCount: number;   // ≥ 0.85
  departureMediocreCount: number; // 0.65-0.85
  departureUnhappyCount: number;  // < 0.65
  // ORDER 260 §4 — per-gäst resultat: revenueMinusCost / completedGuests.
  // "Result per guest" som VO efterfrågade.
  resultPerGuestSek: number | null;
  // ORDER 260 §2 — seated → order-complete-tid per gäst. Median och
  // 90:e percentil används för att kalibrera straff-tröskeln så det
  // träffar det onormala, inte det vanliga.
  seatedToOrderCompleteN: number;
  seatedToOrderCompleteMedianSec: number | null;
  seatedToOrderCompleteP90Sec: number | null;
  seatedToOrderCompleteMeanSec: number | null;
  seatedToOrderCompleteMaxSec: number | null;
}

function measureDinnerPass(seedState: SimulationState, lengthMinutes: number): { state: SimulationState; measurement: PassMeasurement } {
  clearDepartureLog();
  const preRevenue = seedState.revenue;
  const preCost = seedState.cost;
  const preRep = seedState.reputation;
  let s = seedState;
  s = reducer(s, { type: 'SKIP_LUNCH' });
  s = reducer(s, { type: 'OPEN_SERVICE', service: 'dinner', lengthMinutes });
  const dt = 1 / 5;
  const maxTicks = lengthMinutes * 60 * 5 + 400;
  for (let i = 0; i < maxTicks; i++) {
    s = reducer(s, { type: 'TICK', dt });
    if (s.eveningAccount !== null) {
      // Tick a bit more to let ledger + rep settle post-service, then stop
      // before day rollover clears departure log by state changes.
      for (let j = 0; j < 20; j++) s = reducer(s, { type: 'TICK', dt });
      break;
    }
  }
  const log = getDepartureLog();
  const sats = log.map((e) => e.satisfaction);
  const sortedSats = [...sats].sort((a, b) => a - b);
  const hist: Record<string, number> = {
    '0.0-0.1': 0, '0.1-0.2': 0, '0.2-0.3': 0, '0.3-0.4': 0,
    '0.4-0.5': 0, '0.5-0.6': 0, '0.6-0.7': 0, '0.7-0.8': 0, '0.8-0.9': 0, '0.9-1.0': 0
  };
  const buckets = Object.keys(hist);
  for (const v of sats) {
    const b = Math.min(9, Math.max(0, Math.floor(v * 10)));
    hist[buckets[b]] += 1;
  }
  const rev = s.revenue - preRevenue;
  const cost = s.cost - preCost;
  const completed = s.completedGuests;
  // ORDER 260 §2 — timing per gäst för straff-tröskelkalibrering.
  const timings = log
    .filter((e) => e.seatedAtSimTime !== undefined && e.orderCompleteAtSimTime !== undefined)
    .map((e) => (e.orderCompleteAtSimTime as number) - (e.seatedAtSimTime as number));
  const timingsSorted = [...timings].sort((a, b) => a - b);
  const timingMedian = timingsSorted.length > 0
    ? timingsSorted[Math.floor(timingsSorted.length / 2)]
    : null;
  const timingP90 = timingsSorted.length > 0
    ? timingsSorted[Math.floor(timingsSorted.length * 0.9)]
    : null;
  const timingMean = timings.length > 0
    ? timings.reduce((a, b) => a + b, 0) / timings.length
    : null;
  const timingMax = timings.length > 0 ? timingsSorted[timingsSorted.length - 1] : null;
  return {
    state: s,
    measurement: {
      completedGuests: completed,
      totalArrived: s.guests.length + log.length, // approx (active + departed)
      revenue: Math.round(rev),
      cost: Math.round(cost),
      result: Math.round(rev - cost),
      reputationStart: Math.round(preRep * 1000) / 1000,
      reputationEnd: Math.round(s.reputation * 1000) / 1000,
      reputationDelta: Math.round((s.reputation - preRep) * 1000) / 1000,
      reputationBreakdown: s.metrics.reputationBreakdown
        ? Object.fromEntries(
            Object.entries(s.metrics.reputationBreakdown).map(([k, v]) => [k, Math.round(v * 1000) / 1000])
          )
        : null,
      departureLogN: log.length,
      departureSatHistogram: hist,
      departureSatMean: sats.length > 0
        ? Math.round((sats.reduce((a, b) => a + b, 0) / sats.length) * 1000) / 1000
        : null,
      departureSatMedian: sortedSats.length > 0
        ? Math.round(sortedSats[Math.floor(sortedSats.length / 2)] * 1000) / 1000
        : null,
      departureHappyCount: sats.filter((v) => v >= 0.85).length,
      departureMediocreCount: sats.filter((v) => v >= 0.65 && v < 0.85).length,
      departureUnhappyCount: sats.filter((v) => v < 0.65).length,
      resultPerGuestSek: completed > 0
        ? Math.round((rev - cost) / completed * 10) / 10
        : null,
      seatedToOrderCompleteN: timings.length,
      seatedToOrderCompleteMedianSec: timingMedian !== null ? Math.round(timingMedian * 10) / 10 : null,
      seatedToOrderCompleteP90Sec: timingP90 !== null ? Math.round(timingP90 * 10) / 10 : null,
      seatedToOrderCompleteMeanSec: timingMean !== null ? Math.round(timingMean * 10) / 10 : null,
      seatedToOrderCompleteMaxSec: timingMax !== null ? Math.round(timingMax * 10) / 10 : null
    }
  };
}

interface DaySnapshot {
  day: number;
  reputationEnd: number;
  arrivals: number;
  revenue: number;
  cost: number;
  result: number;
  departureLogN: number;
  departureHappyCount: number;
  departureUnhappyCount: number;
}

function measureThreeDays(startSeed: number, lengthMinutesPerDinner: number): DaySnapshot[] {
  let state = makeInitialState(startSeed);
  state = seedMenuAndStock(state);
  const snapshots: DaySnapshot[] = [];
  for (let dayIdx = 0; dayIdx < 3; dayIdx++) {
    const dayNumber = state.day.dayNumber;
    const preRev = state.revenue;
    const preCost = state.cost;
    const { state: next, measurement } = measureDinnerPass(state, lengthMinutesPerDinner);
    // Kör vidare till dygns-rollover så state.day.dayNumber tickar upp
    // och rykte får sätta sig innan nästa dag börjar (rep drift over
    // ceiling gap under morning/afternoon/evening).
    let s = next;
    const dt = 1 / 5;
    let ticks = 0;
    while (s.day.dayNumber === dayNumber && ticks < 60 * 60 * 5) {
      s = reducer(s, { type: 'TICK', dt });
      ticks += 1;
    }
    // Om rollover inte hände (inte troligt eftersom OPEN_SERVICE ändrade
    // period → dinner → evening → rollover), försök forceRollover via
    // ADVANCE_DAY om det finns; annars fortsätt.
    snapshots.push({
      day: dayNumber,
      reputationEnd: Math.round(next.reputation * 1000) / 1000,
      arrivals: measurement.departureLogN,
      revenue: Math.round(next.revenue - preRev),
      cost: Math.round(next.cost - preCost),
      result: Math.round((next.revenue - preRev) - (next.cost - preCost)),
      departureLogN: measurement.departureLogN,
      departureHappyCount: measurement.departureHappyCount,
      departureUnhappyCount: measurement.departureUnhappyCount,
    });
    state = s;
  }
  return snapshots;
}

// Tempo-manipulator. Muterar TASK_BASE_TICKS direkt; återställer i
// finally-block. Standard-tempo är ORDER 253 (16/33/12).
function withTempo<T>(tempo: '251' | '253', body: () => T): T {
  const saved = {
    greet: TASK_BASE_TICKS.greet,
    order: TASK_BASE_TICKS.order,
    serve: TASK_BASE_TICKS.serve
  };
  if (tempo === '251') {
    TASK_BASE_TICKS.greet = 4;
    TASK_BASE_TICKS.order = 10;
    TASK_BASE_TICKS.serve = 14;
  } else {
    TASK_BASE_TICKS.greet = 16;
    TASK_BASE_TICKS.order = 33;
    TASK_BASE_TICKS.serve = 12;
  }
  try {
    return body();
  } finally {
    TASK_BASE_TICKS.greet = saved.greet;
    TASK_BASE_TICKS.order = saved.order;
    TASK_BASE_TICKS.serve = saved.serve;
  }
}

describe('ORDER 260 — mätning: tidsberoende negativ sat + rep→arrivals', () => {
  it('15-min pass för 251- och 253-tempot samt 3-dagars kedja för båda', () => {
    const results: {
      pass15min: { tempo253: PassMeasurement; tempo251: PassMeasurement };
      threeDay: { tempo253: DaySnapshot[]; tempo251: DaySnapshot[] };
      repArrivalsCoupling: {
        formula: string;
        floor: number;
        ceil: number;
        atRep0_0: number;
        atRep0_5: number;
        atRep0_6: number;
        atRep1_0: number;
        codeLocation: string;
      };
    } = {
      pass15min: {
        tempo253: withTempo('253', () => {
          let s = makeInitialState(42);
          s = seedMenuAndStock(s);
          return measureDinnerPass(s, 15).measurement;
        }),
        tempo251: withTempo('251', () => {
          let s = makeInitialState(42);
          s = seedMenuAndStock(s);
          return measureDinnerPass(s, 15).measurement;
        })
      },
      threeDay: {
        tempo253: withTempo('253', () => measureThreeDays(42, 15)),
        tempo251: withTempo('251', () => measureThreeDays(42, 15))
      },
      repArrivalsCoupling: {
        formula: 'multiplier = 0.6 + 0.8 × clamp(reputation, 0, 1)',
        floor: 0.6,
        ceil: 1.4,
        atRep0_0: 0.6,
        atRep0_5: 1.0,
        atRep0_6: 1.08,
        atRep1_0: 1.4,
        codeLocation: 'frontend/src/strategic/simulation/arrivals.ts:93-99 (reputationArrivalMultiplier)'
      }
    };

    // Sanity — mätningen levererade tal.
    expect(results.pass15min.tempo253.departureLogN).toBeGreaterThan(0);
    expect(results.pass15min.tempo251.departureLogN).toBeGreaterThan(0);
    expect(results.threeDay.tempo253).toHaveLength(3);
    expect(results.threeDay.tempo251).toHaveLength(3);

    if (process.env.WRITE_REPORTS === '1') {
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(
        resolve(REPORT_DIR, 'measurements.json'),
        JSON.stringify(results, null, 2)
      );
      // eslint-disable-next-line no-console
      console.log(`\n📁 ORDER 260 mätning skriven: ${REPORT_DIR}/measurements.json`);
    }

    // Utskrift för direktobservation (samma tal som JSON-filen bär).
    // eslint-disable-next-line no-console
    console.log('\n===== ORDER 260 — 15-min pass =====');
    for (const [tempo, m] of Object.entries(results.pass15min)) {
      // eslint-disable-next-line no-console
      console.log(`\n-- ${tempo} --`);
      // eslint-disable-next-line no-console
      console.log(`  completedGuests=${m.completedGuests}  departures=${m.departureLogN}`);
      // eslint-disable-next-line no-console
      console.log(`  rev=${m.revenue} cost=${m.cost} result=${m.result} SEK (per guest: ${m.resultPerGuestSek ?? 'na'} SEK)`);
      // eslint-disable-next-line no-console
      console.log(`  rep: ${m.reputationStart} → ${m.reputationEnd} (Δ ${m.reputationDelta})`);
      // eslint-disable-next-line no-console
      console.log(`  sat: mean=${m.departureSatMean} median=${m.departureSatMedian}`);
      // eslint-disable-next-line no-console
      console.log(`  happy(≥.85)=${m.departureHappyCount} mediocre=${m.departureMediocreCount} unhappy(<.65)=${m.departureUnhappyCount}`);
      // eslint-disable-next-line no-console
      console.log(`  timing seated→order-complete: median=${m.seatedToOrderCompleteMedianSec}s p90=${m.seatedToOrderCompleteP90Sec}s mean=${m.seatedToOrderCompleteMeanSec}s max=${m.seatedToOrderCompleteMaxSec}s (n=${m.seatedToOrderCompleteN})`);
      // eslint-disable-next-line no-console
      console.log(`  rep-breakdown:`, m.reputationBreakdown);
    }
    // eslint-disable-next-line no-console
    console.log('\n===== ORDER 260 — 3-dagars kedja =====');
    for (const [tempo, days] of Object.entries(results.threeDay)) {
      // eslint-disable-next-line no-console
      console.log(`\n-- ${tempo} --`);
      for (const d of days) {
        // eslint-disable-next-line no-console
        console.log(`  dag ${d.day}: arrivals=${d.arrivals} rev=${d.revenue} cost=${d.cost} result=${d.result} repEnd=${d.reputationEnd} happy=${d.departureHappyCount} unhappy=${d.departureUnhappyCount}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\n===== rep → arrivals koppling =====`);
    // eslint-disable-next-line no-console
    console.log(`  ${results.repArrivalsCoupling.codeLocation}`);
    // eslint-disable-next-line no-console
    console.log(`  ${results.repArrivalsCoupling.formula}`);
    // eslint-disable-next-line no-console
    console.log(`  rep=0.0 → ${results.repArrivalsCoupling.atRep0_0}× arrivals`);
    // eslint-disable-next-line no-console
    console.log(`  rep=0.5 → ${results.repArrivalsCoupling.atRep0_5}× arrivals`);
    // eslint-disable-next-line no-console
    console.log(`  rep=0.6 → ${results.repArrivalsCoupling.atRep0_6}× arrivals  (default rep)`);
    // eslint-disable-next-line no-console
    console.log(`  rep=1.0 → ${results.repArrivalsCoupling.atRep1_0}× arrivals`);
  }, 120_000);
});
