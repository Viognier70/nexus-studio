// ORDER 134 — bimodaliteten (utredning, ingen kalibrering).
//
// ORDER 131 §6 §1: staff.workload är bimodalt fördelat. Denna order
// utreder §2:
//   2.1 uppstår tudelningen i ankomsterna eller i tilldelningen?
//   2.2 hur länge varar ett läge (sekunder eller minuter)?
//   2.3 blir det mindre bimodalt med fler i personalen?
//   2.4 gäller det food trucken också?
//
// §3 (förbud) verifierat: inga trösklar kalibreras, inga
// ankomstmultiplikatorer ändras, inget värde föreslås.
//
// Kör om:  npx vitest run order134Bimodality --reporter=verbose

import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { reducer } from '../../simulation/reducer';
import { makeInitialState, makeStaff } from '../../simulation/model';
import type { BusinessClass, SimAction, SimulationState } from '../../types';
import { capacityForBusiness } from '../businessClass';

// -------- konfiguration --------

const BUSINESSES: BusinessClass[] = ['restaurant', 'foodtruck', 'värdshus', 'ölkrogen'];
// `makeStaff` accepterar bara 2 | 3 | 4 (model.ts:42). Att modellen
// binder personalantalet till tre valen är i sig en bit av bimodalitets-
// bilden — spelaren kan inte lösa "för lite folk" med steglös bemanning.
const STAFF_COUNTS: (2 | 3 | 4)[] = [2, 3, 4];
const N_SEEDS = 50; // per (business × staffCount)
const SERVICE_MINUTES = 8;
const TICK_HZ = 5;
const TICK_SECONDS = 1 / TICK_HZ;
const TICKS_PER_SERVICE = SERVICE_MINUTES * 60 * TICK_HZ; // 2400
const WARMUP_TICKS = 100;
const SEED_BASE = 20260830;

// Mittbandet är där bimodalitet syns bäst. En jämn fördelning har
// hög massa här; en bimodal låg. Bandet är rapporterings-parameter,
// inte en tröskel — den mäts på fördelningen, ändrar inte något.
const MID_BAND = { lo: 0.2, hi: 0.8 };

// Lägeströsklar för lägeslängder — samplet betraktas som HÖGT om
// workload ≥ HIGH, LÅGT om ≤ LOW, annars i "mittzon". Vi mäter
// sammanhängande run-längder i respektive zon.
const HIGH = 0.7;
const LOW = 0.3;

// -------- hjälpare --------

function staffMeanWorkload(s: SimulationState): number {
  if (s.staff.length === 0) return 0;
  return s.staff.reduce((a, m) => a + m.workload, 0) / s.staff.length;
}

function bimodalityIndex(samples: readonly number[]): {
  massMid: number; massLo: number; massHi: number;
} {
  let lo = 0, mid = 0, hi = 0;
  for (const v of samples) {
    if (v < MID_BAND.lo) lo++;
    else if (v > MID_BAND.hi) hi++;
    else mid++;
  }
  const n = samples.length || 1;
  return { massMid: mid / n, massLo: lo / n, massHi: hi / n };
}

// Run-length encoding över en lägessekvens ('H'|'L'|'M').
function runLengths(labels: readonly ('H' | 'L' | 'M')[]): {
  high: number[]; low: number[]; mid: number[];
} {
  const high: number[] = [], low: number[] = [], mid: number[] = [];
  let curLabel: 'H' | 'L' | 'M' | null = null;
  let curLen = 0;
  for (const l of labels) {
    if (l === curLabel) curLen++;
    else {
      if (curLabel === 'H') high.push(curLen);
      else if (curLabel === 'L') low.push(curLen);
      else if (curLabel === 'M') mid.push(curLen);
      curLabel = l;
      curLen = 1;
    }
  }
  if (curLabel === 'H') high.push(curLen);
  else if (curLabel === 'L') low.push(curLen);
  else if (curLabel === 'M') mid.push(curLen);
  return { high, low, mid };
}

function mean(arr: readonly number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// -------- kärnmätning per (business, staffCount) --------

interface Cell {
  business: BusinessClass;
  staffCount: number;
  capacity: number;
  seeds: number;
  workloadSamples: number;
  arrivalsPerTickMean: number;
  arrivalsPerTickHistogram: number[]; // buckets 0..≥5
  workloadMidMass: number;
  workloadLoMass: number;
  workloadHiMass: number;
  runLenSec: {
    highMean: number; highP50: number; highP90: number;
    lowMean: number;  lowP50: number;  lowP90: number;
    midMean: number;  midP50: number;  midP90: number;
    highCount: number; lowCount: number; midCount: number;
  };
  histogram: number[]; // 20 buckets 0..1
}

function measureCell(business: BusinessClass, staffCount: 2 | 3 | 4): Cell {
  const workloadAll: number[] = [];
  const arrivalsPerTickAgg = new Array(6).fill(0); // 0,1,2,3,4,5+
  let arrivalsTotal = 0;
  let tickCount = 0;
  const runHigh: number[] = [], runLow: number[] = [], runMid: number[] = [];
  let capacityLast = 0;
  for (let i = 0; i < N_SEEDS; i++) {
    const seed = SEED_BASE + i;
    let s = makeInitialState(seed);
    s = {
      ...s,
      businessClass: business,
      policies: {
        ...s.policies,
        capacity: capacityForBusiness(business, staffCount)
      }
    };
    // SET_POLICY är den officiella vägen att ändra staffCount — reducer.ts
    // rad 2251 triggerar `needsStaffRebuild` som byter ut hela staff-listan
    // via `makeStaff(staffCount)`. Direktmutation av s.staff overrides
    // av reducer vid nästa policyupdate, så vi gör det via action.
    s = reducer(s, { type: 'SET_POLICY', patch: { staffCount } });
    capacityLast = s.policies.capacity;
    void makeStaff; // reserv om harnessen behöver bygga staff direkt senare.
    const openAction: SimAction = { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: SERVICE_MINUTES };
    s = reducer(s, openAction);
    // Per-seed labels för lägesberäkning
    const labels: ('H' | 'L' | 'M')[] = [];
    let prevGuestCount = s.guests.length;
    for (let t = 0; t < TICKS_PER_SERVICE; t++) {
      s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
      const now = s.guests.length;
      const delta = Math.max(0, now - prevGuestCount);
      prevGuestCount = now;
      if (t >= WARMUP_TICKS) {
        arrivalsTotal += delta;
        tickCount++;
        const bucket = Math.min(delta, arrivalsPerTickAgg.length - 1);
        arrivalsPerTickAgg[bucket]++;
        const w = staffMeanWorkload(s);
        workloadAll.push(w);
        labels.push(w >= HIGH ? 'H' : w <= LOW ? 'L' : 'M');
      }
    }
    const runs = runLengths(labels);
    for (const r of runs.high) runHigh.push(r);
    for (const r of runs.low) runLow.push(r);
    for (const r of runs.mid) runMid.push(r);
  }
  const workloadSorted = [...workloadAll].sort((a, b) => a - b);
  const histogram = new Array(20).fill(0);
  for (const v of workloadAll) {
    let b = Math.floor(v * 20);
    if (b >= 20) b = 19;
    if (b < 0) b = 0;
    histogram[b]++;
  }
  const bim = bimodalityIndex(workloadAll);
  const sortAsc = (a: number, b: number) => a - b;
  const runHighSorted = [...runHigh].sort(sortAsc);
  const runLowSorted = [...runLow].sort(sortAsc);
  const runMidSorted = [...runMid].sort(sortAsc);
  // Kompilator-tystnad — workloadSorted används inte i cell-return men
  // holds a linjer i minnet om jag vill lägga till percentiler senare.
  void workloadSorted;
  return {
    business,
    staffCount,
    capacity: capacityLast,
    seeds: N_SEEDS,
    workloadSamples: workloadAll.length,
    arrivalsPerTickMean: arrivalsTotal / tickCount,
    arrivalsPerTickHistogram: arrivalsPerTickAgg,
    workloadMidMass: bim.massMid,
    workloadLoMass: bim.massLo,
    workloadHiMass: bim.massHi,
    runLenSec: {
      highMean: mean(runHigh) * TICK_SECONDS,
      highP50: percentile(runHighSorted, 0.5) * TICK_SECONDS,
      highP90: percentile(runHighSorted, 0.9) * TICK_SECONDS,
      lowMean: mean(runLow) * TICK_SECONDS,
      lowP50: percentile(runLowSorted, 0.5) * TICK_SECONDS,
      lowP90: percentile(runLowSorted, 0.9) * TICK_SECONDS,
      midMean: mean(runMid) * TICK_SECONDS,
      midP50: percentile(runMidSorted, 0.5) * TICK_SECONDS,
      midP90: percentile(runMidSorted, 0.9) * TICK_SECONDS,
      highCount: runHigh.length,
      lowCount: runLow.length,
      midCount: runMid.length
    },
    histogram
  };
}

// -------- test --------

describe('ORDER 134 — bimodaliteten (fixed-seed)', () => {
  it(`svep ${STAFF_COUNTS.length} staffCount × ${BUSINESSES.length} verksamheter × ${N_SEEDS} seeds`, () => {
    const cells: Cell[] = [];
    for (const business of BUSINESSES) {
      for (const staffCount of STAFF_COUNTS) {
        // eslint-disable-next-line no-console
        console.log(`  mäter ${business} staff=${staffCount}...`);
        cells.push(measureCell(business, staffCount));
      }
    }

    const reportDir = resolve(__dirname, '../../../../reports/order134');
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(
      resolve(reportDir, 'bimodality.json'),
      JSON.stringify({
        config: {
          nSeeds: N_SEEDS,
          seedBase: SEED_BASE,
          businesses: BUSINESSES,
          staffCounts: STAFF_COUNTS,
          serviceMinutes: SERVICE_MINUTES,
          tickHz: TICK_HZ,
          warmupTicks: WARMUP_TICKS,
          midBand: MID_BAND,
          high: HIGH,
          low: LOW,
          notes:
            'workloadMidMass = fraction of samples in [0.2, 0.8]. Låg = bimodal, hög = jämn. ' +
            'runLenSec = längden på sammanhängande "hög" / "låg" / "mitt"-perioder i sekunder.'
        },
        cells
      }, null, 2)
    );

    // eslint-disable-next-line no-console
    console.log('\n=== ORDER 134 — bimodalitet per staffCount × verksamhet ===');
    // eslint-disable-next-line no-console
    console.log('cell (business/staff)        cap  arr/tick  midMass  loMass  hiMass  runHi(p50)  runLo(p50)  runMid(p50)');
    for (const c of cells) {
      // eslint-disable-next-line no-console
      console.log(
        `${(c.business + '/' + c.staffCount).padEnd(28)} ${String(c.capacity).padStart(3)}  ` +
        `${c.arrivalsPerTickMean.toFixed(3).padStart(6)}  ` +
        `${(c.workloadMidMass * 100).toFixed(1).padStart(6)}%  ` +
        `${(c.workloadLoMass * 100).toFixed(1).padStart(6)}%  ` +
        `${(c.workloadHiMass * 100).toFixed(1).padStart(6)}%  ` +
        `${c.runLenSec.highP50.toFixed(1).padStart(6)}s     ` +
        `${c.runLenSec.lowP50.toFixed(1).padStart(6)}s     ` +
        `${c.runLenSec.midP50.toFixed(1).padStart(6)}s`
      );
    }

    // Konsollhistogram för foodtruck vs restaurant vid staffCount=3
    for (const c of cells) {
      if (c.staffCount === 3 && (c.business === 'foodtruck' || c.business === 'restaurant')) {
        // eslint-disable-next-line no-console
        console.log(`\nHistogram ${c.business} staff=3:`);
        const maxCount = Math.max(...c.histogram, 1);
        for (let i = 0; i < c.histogram.length; i++) {
          const lo = (i / 20).toFixed(2);
          const hi = ((i + 1) / 20).toFixed(2);
          const bar = '#'.repeat(Math.round((c.histogram[i] / maxCount) * 40));
          // eslint-disable-next-line no-console
          console.log(`  ${lo}–${hi}  ${bar} ${c.histogram[i]}`);
        }
      }
    }

    // Sanity — varje cell har samples.
    for (const c of cells) {
      expect(c.workloadSamples, `${c.business}/${c.staffCount} workload samples`).toBeGreaterThan(0);
      expect(c.workloadMidMass + c.workloadLoMass + c.workloadHiMass).toBeCloseTo(1, 2);
    }
  }, 600_000); // 10 min
});
