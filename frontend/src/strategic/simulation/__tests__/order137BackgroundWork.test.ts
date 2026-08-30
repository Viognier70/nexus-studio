// ORDER 137 — bakgrundsarbete: preemption + idle-workload + jämförelse
// mot ORDER 134-baseline.
//
// §2.2: en väntande gäst avbryter pågående bakgrundsuppgift samma tick.
// §5.3: personal utan direkta uppgifter OCH utan kö har ändå belastning.
// §4-5: kör om ORDER 134:s svep, restaurant midMass ska stiga, foodtruck
//       inte försämras.

import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import type { BusinessClass, SimAction, SimulationState } from '../../types';
import { capacityForBusiness } from '../../business/businessClass';

const BUSINESSES: BusinessClass[] = ['kvarterskrogen', 'foodtrucken', 'gästgiveriet', 'ölkrogen'];
const STAFF_COUNTS: (2 | 3 | 4)[] = [2, 3, 4];
const N_SEEDS = 50;
const SERVICE_MINUTES = 8;
const TICK_HZ = 5;
const TICK_SECONDS = 1 / TICK_HZ;
const TICKS_PER_SERVICE = SERVICE_MINUTES * 60 * TICK_HZ;
const WARMUP_TICKS = 100;
const SEED_BASE = 20260830;

const BACKGROUND_TASK_TYPES = new Set(['misEnPlace', 'dish', 'restock', 'clean']);

function staffMeanWorkload(s: SimulationState): number {
  if (s.staff.length === 0) return 0;
  return s.staff.reduce((a, m) => a + m.workload, 0) / s.staff.length;
}

// §2.2 — Preemption som invariant över hela servicen.
describe('ORDER 137 §2.2 — direkt uppgift blockerar aldrig av bakgrundsarbete', () => {
  it('under en full lunchservice: ingen tick har både väntande gäst OCH staff i bakgrundsuppgift ≥ 2 ticks', () => {
    // Kör en normal lunchservice och samla efter varje tick: fanns
    // det en väntande gäst (arriving med moveProgress>=1, eller i
    // waitingIds), OCH var någon staff i bg-task? Preemption ska
    // avbryta bg-task inom en tick, så tolerans = 1 tick (grow-loopen
    // hinner räkna workload, men taskType-övergången sker samma tick
    // via completeStaffTask + task-selection). Två ticks = ~0.4 s
    // svarstid maximum är rimligt.
    let s = makeInitialState(SEED_BASE);
    s = {
      ...s,
      businessClass: 'kvarterskrogen',
      policies: { ...s.policies, capacity: capacityForBusiness('kvarterskrogen', s.policies.staffCount) }
    };
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: SERVICE_MINUTES });

    // Räkna sammanhängande ticks där invariant är brutet.
    let consecutiveViolationTicks = 0;
    let maxViolationRun = 0;
    let totalWaitingTicks = 0;
    let totalBgTicksDuringWaiting = 0;
    for (let t = 0; t < TICKS_PER_SERVICE; t++) {
      s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
      const waiting =
        s.waitingIds.length > 0 ||
        s.guests.some((g) => g.state === 'arriving' && g.moveProgress >= 1);
      const anyBg = s.staff.some(
        (m) => m.taskType && BACKGROUND_TASK_TYPES.has(m.taskType)
      );
      if (waiting) totalWaitingTicks++;
      if (waiting && anyBg) {
        totalBgTicksDuringWaiting++;
        consecutiveViolationTicks++;
        if (consecutiveViolationTicks > maxViolationRun) maxViolationRun = consecutiveViolationTicks;
      } else {
        consecutiveViolationTicks = 0;
      }
    }
    // Rapport i case fail.
    // eslint-disable-next-line no-console
    console.log(
      `ORDER 137 §2.2 preempt-invariant: ` +
      `${totalBgTicksDuringWaiting}/${totalWaitingTicks} waiting-ticks hade också bg-task (` +
      `${((totalBgTicksDuringWaiting / Math.max(1, totalWaitingTicks)) * 100).toFixed(2)}%), ` +
      `max sammanhängande brott = ${maxViolationRun} ticks`
    );
    // Max 2 sammanhängande ticks (preempt + task-selection måste hända
    // inom en tick i normal drift; en ren race kan tillåta 1 extra).
    expect(
      maxViolationRun,
      `max sammanhängande brott ${maxViolationRun} ticks — bg-task blockerar väntande gäst`
    ).toBeLessThanOrEqual(2);
  });
});

// §5.3 — idle workload > 0.
describe('ORDER 137 §5.3 — personal utan direktuppgifter och utan kö har workload > 0', () => {
  it('restaurang: efter 60 s utan gäster har staff mean workload > 0', () => {
    let s = makeInitialState(SEED_BASE);
    s = {
      ...s,
      businessClass: 'kvarterskrogen',
      policies: { ...s.policies, capacity: capacityForBusiness('kvarterskrogen', s.policies.staffCount) }
    };
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: SERVICE_MINUTES });

    // Ticka 60 s utan gäster (rensas varje tick). Utan bg-arbete skulle
    // workload decayat till 0.
    for (let t = 0; t < 300; t++) {
      s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
      s = { ...s, guests: [], waitingIds: [], seatedIds: [] };
    }
    const w = staffMeanWorkload(s);
    // Bakgrundsarbete målsöker 0,4; efter 60 s ska minst någon staff
    // vara aktiv. Kravet är > 0 (per §5.3), rimlig marginal 0,15.
    expect(w, `restaurant idle workload ${w.toFixed(3)}, väntat > 0.15`).toBeGreaterThan(0.15);
  });

  it('foodtruck: efter 60 s utan gäster har staff mean workload ~0 (inga bg-tasks konfigurerade)', () => {
    let s = makeInitialState(SEED_BASE);
    s = {
      ...s,
      businessClass: 'foodtrucken',
      policies: { ...s.policies, capacity: capacityForBusiness('foodtrucken', s.policies.staffCount) }
    };
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: SERVICE_MINUTES });
    for (let t = 0; t < 300; t++) {
      s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
      s = { ...s, guests: [], waitingIds: [], seatedIds: [] };
    }
    const w = staffMeanWorkload(s);
    // Foodtruck saknar bg-tasks per §2.3 (utanför scope). Workload ska
    // decaya till ~0.
    expect(w, `foodtruck idle workload ${w.toFixed(3)}, väntat < 0.05`).toBeLessThan(0.05);
  });
});

// §4/5 — jämförelse mot ORDER 134-baseline.
describe('ORDER 137 §4 — jämförelse mot ORDER 134-baseline', () => {
  it('restaurant midMass ska stiga mätbart; foodtruck ska inte försämras', () => {
    // Kör samma svep som order134Bimodality (samma seeds, samma metod).
    interface CellSummary {
      business: BusinessClass;
      staffCount: number;
      midMass: number;
      loMass: number;
      hiMass: number;
    }
    const cells: CellSummary[] = [];
    for (const business of BUSINESSES) {
      for (const staffCount of STAFF_COUNTS) {
        const all: number[] = [];
        for (let i = 0; i < N_SEEDS; i++) {
          const seed = SEED_BASE + i;
          let s = makeInitialState(seed);
          s = {
            ...s,
            businessClass: business,
            policies: { ...s.policies, capacity: capacityForBusiness(business, staffCount) }
          };
          s = reducer(s, { type: 'SET_POLICY', patch: { staffCount } });
          s = reducer(s, {
            type: 'OPEN_SERVICE',
            service: 'lunch',
            lengthMinutes: SERVICE_MINUTES
          } as SimAction);
          for (let t = 0; t < TICKS_PER_SERVICE; t++) {
            s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
            if (t < WARMUP_TICKS) continue;
            all.push(staffMeanWorkload(s));
          }
        }
        let lo = 0, mid = 0, hi = 0;
        for (const v of all) {
          if (v < 0.2) lo++;
          else if (v > 0.8) hi++;
          else mid++;
        }
        const n = all.length;
        cells.push({ business, staffCount, midMass: mid / n, loMass: lo / n, hiMass: hi / n });
      }
    }

    // Läs ORDER 134-baseline. En committerad kopia ligger i
    // reports/order137/bimodality-baseline.json — snapshot från main
    // vid ORDER 134-mergen. Kan INTE läsa reports/order134/bimodality.json
    // direkt eftersom order134-testet skriver dit vid varje körning
    // och skulle radera baseline.
    const baselinePath = resolve(__dirname, '../../../../reports/order137/bimodality-baseline.json');
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as {
      cells: Array<{ business: string; staffCount: number; workloadMidMass: number; workloadLoMass: number; workloadHiMass: number }>;
    };

    const comparison = cells.map((after) => {
      const before = baseline.cells.find(
        (c) => c.business === after.business && c.staffCount === after.staffCount
      );
      if (!before) throw new Error(`baseline saknar cell ${after.business}/${after.staffCount}`);
      return {
        business: after.business,
        staffCount: after.staffCount,
        beforeMid: before.workloadMidMass,
        afterMid: after.midMass,
        deltaMid: after.midMass - before.workloadMidMass,
        beforeLo: before.workloadLoMass,
        afterLo: after.loMass,
        beforeHi: before.workloadHiMass,
        afterHi: after.hiMass
      };
    });

    // Skriv rapport.
    const reportDir = resolve(__dirname, '../../../../reports/order137');
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(
      resolve(reportDir, 'bimodalityComparison.json'),
      JSON.stringify({ afterCells: cells, comparison }, null, 2)
    );

    // eslint-disable-next-line no-console
    console.log('\n=== ORDER 137 — bimodalitets-jämförelse (mid = 0.2-0.8) ===');
    // eslint-disable-next-line no-console
    console.log('cell (business/staff)   before mid  after mid   Δ mid    before lo → after lo   before hi → after hi');
    for (const c of comparison) {
      // eslint-disable-next-line no-console
      console.log(
        `${(c.business + '/' + c.staffCount).padEnd(24)} ${(c.beforeMid * 100).toFixed(1).padStart(6)}%    ${(c.afterMid * 100).toFixed(1).padStart(6)}%    ${((c.deltaMid >= 0 ? '+' : '') + (c.deltaMid * 100).toFixed(1)).padStart(6)}pp    ${(c.beforeLo * 100).toFixed(1).padStart(5)}% → ${(c.afterLo * 100).toFixed(1).padStart(5)}%     ${(c.beforeHi * 100).toFixed(1).padStart(5)}% → ${(c.afterHi * 100).toFixed(1).padStart(5)}%`
      );
    }

    // Restaurant och värdshus (bg-arbete konfigurerat): midMass ska
    // stiga mätbart (≥ 5 procentenheter).
    for (const c of comparison.filter((c) => c.business === 'kvarterskrogen' || c.business === 'gästgiveriet')) {
      expect(
        c.deltaMid,
        `${c.business}/${c.staffCount} midMass steg bara ${(c.deltaMid * 100).toFixed(1)}pp (${(c.beforeMid * 100).toFixed(1)}% → ${(c.afterMid * 100).toFixed(1)}%). Krav ≥ 5pp.`
      ).toBeGreaterThanOrEqual(0.05);
    }

    // Foodtruck (inga bg-tasks): midMass ska INTE ha försämrats
    // meningsfullt. Toleransen 2 pp — normal seed-variation.
    for (const c of comparison.filter((c) => c.business === 'foodtrucken')) {
      expect(
        c.deltaMid,
        `${c.business}/${c.staffCount} midMass sjönk för mycket: ${(c.deltaMid * 100).toFixed(1)}pp (${(c.beforeMid * 100).toFixed(1)}% → ${(c.afterMid * 100).toFixed(1)}%). Tolerans ≥ -2pp.`
      ).toBeGreaterThanOrEqual(-0.02);
    }

    // Ölkrogen är utanför scope per §2.3 — ingen bg-work — så midMass
    // ska vara oförändrad inom seed-variation.
    for (const c of comparison.filter((c) => c.business === 'ölkrogen')) {
      expect(
        Math.abs(c.deltaMid),
        `ölkrogen/${c.staffCount} midMass ändrades: ${(c.deltaMid * 100).toFixed(1)}pp. §2.3 säger ölkrogen är utanför scope.`
      ).toBeLessThanOrEqual(0.02);
    }
  }, 300_000);
});
