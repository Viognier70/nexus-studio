// ORDER 131 §2 — load-svep per verksamhet.
//
// ORDER 111 §5 gav p50 = 0.72 / 0.79 / 0.98 för restaurant / foodtruck /
// värdshus från ett fåtal seeds. Denna svep utökar samma harness till
// 200 seeds × 2 services × 4 verksamheter för att svara på ORDER 111:s
// öppna fråga: **beskriver ett band alla verksamheter, eller inte?**
//
// Ordern kalibrerar INGET. Läser bara `staff.workload` — samma signal
// `deriveFaces` läser för att välja `hurried`/`strained`/etc. §4-
// förbud: inga tröskelvärden ändras, ingen produktionskod utanför
// denna testfil rörs.
//
// Rapportfiler skrivs till `frontend/reports/order131/`:
//   loadSweep.json  — alla samples aggregerade per (verksamhet, service)
//   report.md       — analysrapport med histogram + slutsats
//
// Kör om:  npx vitest run order131LoadSweep --reporter=verbose

import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import type { BusinessClass, SimAction, SimulationState } from '../../types';
import { capacityForBusiness } from '../businessClass';

// -------- konfiguration --------

const BUSINESSES: BusinessClass[] = ['restaurant', 'foodtruck', 'värdshus', 'ölkrogen'];
const SERVICES = ['lunch', 'dinner'] as const;
const N_SEEDS = 200;
const SERVICE_MINUTES = 8;
const TICK_HZ = 5;
const TICKS_PER_SERVICE = SERVICE_MINUTES * 60 * TICK_HZ; // 2400
const WARMUP_TICKS = 5 * 20; // 20 sim-sek — matchar ORDER 111
const SEED_BASE = 20260828;

// -------- ansiktsband (samma tröskelvärden som deriveFaces.ts) --------
// §4-förbudet gäller: dessa värden LÄSES här för att beräkna andel
// över, de ÄNDRAS inte. Om de ändras i deriveFaces måste också denna
// tabell uppdateras — men det är en manuell, medveten handling.

const FACE_BANDS = [
  { name: 'hurried', threshold: 0.95, note: 'staff.workload >= 0.95 → hurried' },
  { name: 'strained', threshold: 0.7, note: 'staff.workload >= 0.7 + rhythm=red → strained' }
] as const;

// -------- histogram --------

const HISTOGRAM_BUCKETS = 20; // 0.00–0.05, 0.05–0.10, …, 0.95–1.00

function histogram(samples: readonly number[]): number[] {
  const buckets = new Array(HISTOGRAM_BUCKETS).fill(0);
  for (const v of samples) {
    let b = Math.floor(v * HISTOGRAM_BUCKETS);
    if (b >= HISTOGRAM_BUCKETS) b = HISTOGRAM_BUCKETS - 1;
    if (b < 0) b = 0;
    buckets[b]++;
  }
  return buckets;
}

function asciiHistogram(buckets: readonly number[], maxWidth = 40): string {
  const maxCount = Math.max(...buckets, 1);
  return buckets.map((c, i) => {
    const lo = (i / HISTOGRAM_BUCKETS).toFixed(2);
    const hi = ((i + 1) / HISTOGRAM_BUCKETS).toFixed(2);
    const bar = '#'.repeat(Math.round((c / maxCount) * maxWidth));
    return `  ${lo}–${hi}  ${bar} ${c}`;
  }).join('\n');
}

// -------- percentiler --------

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

interface Percentiles {
  p10: number; p25: number; p50: number; p75: number; p90: number; p99: number;
}

function computePercentiles(samples: readonly number[]): Percentiles {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p10: percentile(sorted, 0.10),
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.50),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.90),
    p99: percentile(sorted, 0.99)
  };
}

// -------- svep --------

function staffMeanWorkload(s: SimulationState): number {
  if (s.staff.length === 0) return 0;
  const sum = s.staff.reduce((acc, m) => acc + m.workload, 0);
  return sum / s.staff.length;
}

// `openService` refuserar dinner om `state.day.period !== 'afternoon'`
// (reducer.ts:992). För att komma åt dinner måste sim först ticka
// igenom en lunch + closing. Här: kort primär-lunch (2 min) för att
// avancera perioden — den räknas INTE mot dinner-samples.
function advanceToAfternoon(s: SimulationState): SimulationState {
  const prep: SimAction = { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 2 };
  s = reducer(s, prep);
  // Ticka tills perioden når afternoon (max 20 sim-min = 6000 ticks
  // som säkerhetsgräns; typiskt < 3 min service + closing).
  const deadline = 20 * 60 * TICK_HZ;
  for (let t = 0; t < deadline; t++) {
    s = reducer(s, { type: 'TICK', dt: 1 / TICK_HZ });
    if (s.day.period === 'afternoon' || s.day.period === 'dinner' || s.day.period === 'evening') break;
  }
  return s;
}

interface Cell {
  business: BusinessClass;
  service: 'lunch' | 'dinner';
  capacity: number;
  seeds: number;
  totalSamples: number;
  percentiles: Percentiles;
  shareOver: Record<string, number>; // face band → fraction over threshold
  meanQueueMax: number;
  meanStaffCount: number;
  histogram: number[];
}

function measureSweep(business: BusinessClass, service: 'lunch' | 'dinner'): Cell {
  const allSamples: number[] = [];
  let queueMaxSum = 0;
  let staffCountSum = 0;
  let capacityLast = 0;
  for (let i = 0; i < N_SEEDS; i++) {
    const seed = SEED_BASE + i;
    let s = makeInitialState(seed);
    s = {
      ...s,
      businessClass: business,
      policies: { ...s.policies, capacity: capacityForBusiness(business, s.policies.staffCount) }
    };
    capacityLast = s.policies.capacity;
    staffCountSum += s.staff.length;
    if (service === 'dinner') {
      s = advanceToAfternoon(s);
    }
    const openAction: SimAction = { type: 'OPEN_SERVICE', service, lengthMinutes: SERVICE_MINUTES };
    s = reducer(s, openAction);
    let queueMax = 0;
    for (let t = 0; t < TICKS_PER_SERVICE; t++) {
      s = reducer(s, { type: 'TICK', dt: 1 / TICK_HZ });
      const q = s.guests.filter((g) => g.state === 'waiting').length;
      if (q > queueMax) queueMax = q;
      if (t < WARMUP_TICKS) continue;
      allSamples.push(staffMeanWorkload(s));
    }
    queueMaxSum += queueMax;
  }
  const percentiles = computePercentiles(allSamples);
  const shareOver: Record<string, number> = {};
  for (const band of FACE_BANDS) {
    const n = allSamples.filter((v) => v >= band.threshold).length;
    shareOver[band.name] = n / allSamples.length;
  }
  return {
    business,
    service,
    capacity: capacityLast,
    seeds: N_SEEDS,
    totalSamples: allSamples.length,
    percentiles,
    shareOver,
    meanQueueMax: queueMaxSum / N_SEEDS,
    meanStaffCount: staffCountSum / N_SEEDS,
    histogram: histogram(allSamples)
  };
}

// -------- test --------

describe('ORDER 131 §2 — load-svep per verksamhet (fixed-seed)', () => {
  it(`svep ${N_SEEDS} seeds × ${SERVICES.length} services × ${BUSINESSES.length} verksamheter → percentiler + histogram + andel över band`, () => {
    const cells: Cell[] = [];
    for (const business of BUSINESSES) {
      for (const service of SERVICES) {
        // eslint-disable-next-line no-console
        console.log(`  mäter ${business}/${service}...`);
        cells.push(measureSweep(business, service));
      }
    }

    // Skriv rapportfiler.
    const reportDir = resolve(__dirname, '../../../../reports/order131');
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(
      resolve(reportDir, 'loadSweep.json'),
      JSON.stringify(
        {
          config: {
            nSeeds: N_SEEDS,
            seedBase: SEED_BASE,
            services: SERVICES,
            businesses: BUSINESSES,
            serviceMinutes: SERVICE_MINUTES,
            tickHz: TICK_HZ,
            ticksPerService: TICKS_PER_SERVICE,
            warmupTicks: WARMUP_TICKS,
            faceBands: FACE_BANDS
          },
          cells
        },
        null,
        2
      )
    );

    // eslint-disable-next-line no-console
    console.log('\n=== ORDER 131 §2 — load-svep ===');
    for (const c of cells) {
      const p = c.percentiles;
      // eslint-disable-next-line no-console
      console.log(
        `${c.business.padEnd(11)}/${c.service.padEnd(7)}  ` +
        `p10=${p.p10.toFixed(3)}  p25=${p.p25.toFixed(3)}  p50=${p.p50.toFixed(3)}  ` +
        `p75=${p.p75.toFixed(3)}  p90=${p.p90.toFixed(3)}  p99=${p.p99.toFixed(3)}  ` +
        `>0.95=${(c.shareOver.hurried * 100).toFixed(1)}%  ` +
        `>0.70=${(c.shareOver.strained * 100).toFixed(1)}%  ` +
        `cap=${c.capacity} qMax=${c.meanQueueMax.toFixed(1)} staff=${c.meanStaffCount.toFixed(1)}`
      );
    }

    // Histogram i console för de fyra lunch-cellerna (verifierbart under
    // testkörning; fullständiga histogram i loadSweep.json).
    for (const c of cells) {
      if (c.service === 'lunch') {
        // eslint-disable-next-line no-console
        console.log(`\nHistogram ${c.business}/${c.service}:`);
        // eslint-disable-next-line no-console
        console.log(asciiHistogram(c.histogram));
      }
    }

    // Sanity — percentiler monotont sorterade i alla celler.
    for (const c of cells) {
      const p = c.percentiles;
      const label = `${c.business}/${c.service}`;
      expect(p.p10, `${label} p10<=p25`).toBeLessThanOrEqual(p.p25);
      expect(p.p25, `${label} p25<=p50`).toBeLessThanOrEqual(p.p50);
      expect(p.p50, `${label} p50<=p75`).toBeLessThanOrEqual(p.p75);
      expect(p.p75, `${label} p75<=p90`).toBeLessThanOrEqual(p.p90);
      expect(p.p90, `${label} p90<=p99`).toBeLessThanOrEqual(p.p99);
      expect(c.totalSamples).toBeGreaterThanOrEqual(N_SEEDS * (TICKS_PER_SERVICE - WARMUP_TICKS));
      expect(c.seeds).toBe(N_SEEDS);
    }

    // Sanity — histogrammet summerar till totalSamples.
    for (const c of cells) {
      const sum = c.histogram.reduce((a, b) => a + b, 0);
      expect(sum, `${c.business}/${c.service} histogram sum`).toBe(c.totalSamples);
    }
  }, 300_000); // 5 min timeout — svep över 4×2×200 kan ta över default 5s
});
