// ORDER 215 §6.3 — kö-tillväxts-gate.
//
// Med ORDER 214 togs QUEUE_CAPACITY-taket bort i schemaläggaren: kön kan
// växa obegränsat i teorin. Testet finns för att verifiera att den INTE gör
// det i praktiken under normal bemanning. Om kön exploderar (peak > 20)
// är det ett fynd om durationerna, inte något att lösa med ett tak (VO
// 2026-09-14 §6.3). Detta test rapporterar peak per cell och FAILAR om
// någon cell överskrider tröskeln — då ska ordern stanna och rapportera
// innan ett tak återinförs.

import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import type { BusinessClass } from '../../types';
import { capacityForBusiness } from '../../business/businessClass';

const BUSINESSES: BusinessClass[] = ['kvarterskrogen', 'foodtrucken', 'gästgiveriet', 'ölkrogen'];
const STAFF_COUNTS: (2 | 3 | 4)[] = [2, 3, 4];
const SERVICE_MINUTES = 8;
const TICK_HZ = 5;
const TICK_SECONDS = 1 / TICK_HZ;
const TICKS_PER_SERVICE = SERVICE_MINUTES * 60 * TICK_HZ;
const SEED_BASE = 20260914;
const N_SEEDS = 10;

// Tröskel: peak queue-djup över 20 per staff = obegränsad tillväxt.
// Rationale: QUEUE_CAPACITY=4 är workload-saturationspunkten. 4× det
// (16 tasks pending per staff) är redan över-belastning; 20 markerar
// tydligt "något är fel med durationerna eller schemaläggningen".
const QUEUE_EXPLOSION_THRESHOLD = 20;

// Andra läsning: växer kön MELLAN mid-service och slutet? Om peak-i-slutet
// > peak-i-mitten är det en trend som skulle fortsätta obegränsat om
// servicen förlängdes. Rapporteras men fail:ar inte — trend-läsning är
// diagnostik, absolutnivån är gate-punkten.
const MID_SERVICE_TICK = Math.floor(TICKS_PER_SERVICE / 2);

interface CellResult {
  business: BusinessClass;
  staffCount: 2 | 3 | 4;
  peakQueueMax: number;      // max across all seeds, all staff, all ticks
  peakQueueMean: number;     // mean of per-seed peaks
  midServicePeak: number;    // peak during first half
  lateServicePeak: number;   // peak during second half
  trendGrowing: boolean;     // lateServicePeak > midServicePeak
}

function runCell(business: BusinessClass, staffCount: 2 | 3 | 4): CellResult {
  let peakOverall = 0;
  let sumPeaks = 0;
  let midPeaks = 0;
  let latePeaks = 0;

  for (let seed = 0; seed < N_SEEDS; seed++) {
    let s = makeInitialState(SEED_BASE + seed);
    s = {
      ...s,
      businessClass: business,
      policies: {
        ...s.policies,
        staffCount,
        capacity: capacityForBusiness(business, staffCount)
      }
    };
    s = reducer(s, { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: SERVICE_MINUTES });

    let seedPeak = 0;
    let seedMidPeak = 0;
    let seedLatePeak = 0;

    for (let t = 0; t < TICKS_PER_SERVICE; t++) {
      s = reducer(s, { type: 'TICK', dt: TICK_SECONDS });
      const maxQueueThisTick = s.staff.reduce(
        (m, staff) => Math.max(m, staff.taskQueue.length),
        0
      );
      if (maxQueueThisTick > seedPeak) seedPeak = maxQueueThisTick;
      if (t < MID_SERVICE_TICK) {
        if (maxQueueThisTick > seedMidPeak) seedMidPeak = maxQueueThisTick;
      } else {
        if (maxQueueThisTick > seedLatePeak) seedLatePeak = maxQueueThisTick;
      }
    }

    sumPeaks += seedPeak;
    if (seedPeak > peakOverall) peakOverall = seedPeak;
    if (seedMidPeak > midPeaks) midPeaks = seedMidPeak;
    if (seedLatePeak > latePeaks) latePeaks = seedLatePeak;
  }

  return {
    business,
    staffCount,
    peakQueueMax: peakOverall,
    peakQueueMean: sumPeaks / N_SEEDS,
    midServicePeak: midPeaks,
    lateServicePeak: latePeaks,
    trendGrowing: latePeaks > midPeaks
  };
}

describe('ORDER 215 §6.3 — kö-tillväxts-gate', () => {
  it('under normal bemanning växer ingen staffs kö obegränsat (peak < 20)', () => {
    const cells: CellResult[] = [];
    for (const business of BUSINESSES) {
      for (const staffCount of STAFF_COUNTS) {
        cells.push(runCell(business, staffCount));
      }
    }

    // Rapport — synlig oavsett pass/fail.
    // eslint-disable-next-line no-console
    console.log('\n=== ORDER 215 §6.3 — max kö-djup per cell (10 seeds × 8 min lunch) ===');
    // eslint-disable-next-line no-console
    console.log(
      'cell (business/staff)    peakMax  peakMean  midPeak  latePeak  trend'
    );
    for (const c of cells) {
      const trend = c.trendGrowing ? '↑ VÄXER' : '  stabil';
      // eslint-disable-next-line no-console
      console.log(
        `${(c.business + '/' + c.staffCount).padEnd(24)} ` +
        `${String(c.peakQueueMax).padStart(6)}  ` +
        `${c.peakQueueMean.toFixed(1).padStart(7)}  ` +
        `${String(c.midServicePeak).padStart(6)}  ` +
        `${String(c.lateServicePeak).padStart(7)}  ` +
        trend
      );
    }

    // Gate: ingen cell får peak > tröskel.
    const explosive = cells.filter((c) => c.peakQueueMax > QUEUE_EXPLOSION_THRESHOLD);
    if (explosive.length > 0) {
      const lines = explosive
        .map(
          (c) =>
            `  ${c.business}/${c.staffCount}: peak=${c.peakQueueMax} (mean ${c.peakQueueMean.toFixed(1)})`
        )
        .join('\n');
      // eslint-disable-next-line no-console
      console.log(
        `\nORDER 215 §6.3 GATE FAIL — kön växer obegränsat vid följande celler:\n${lines}\n` +
        `Detta ska INTE lösas med ett tak. Undersök durationerna först (VO 2026-09-14).`
      );
    }
    expect(
      explosive.length,
      `kön växer över threshold ${QUEUE_EXPLOSION_THRESHOLD} vid ${explosive.length} celler; ` +
      `stanna och rapportera per VO §6.3 innan tak införs`
    ).toBe(0);
  });
});
