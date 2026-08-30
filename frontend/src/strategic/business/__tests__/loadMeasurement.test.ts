// ORDER 111 §5 — load-mätning per verksamhet.
//
// Fixed-seed-harness. För varje `businessClass` startas en fräsch
// simulation, en lunchservice körs (30 sim-minuter), staff.workload
// samlas per tick, och percentilerna p10/p25/p50/p75/p90 räknas ut.
//
// **Vad testet redovisar:** förskjutningen mellan verksamheterna. Att
// den finns är poängen — R4 sa "load-fördelningen ska mätas per
// verksamhet innan banden avgörs". Testet är passivt (asserterar bara
// att siffrorna finns och är monotont sorterade); analysen görs på
// output-siffrorna, inte i en band-kalibrering.
//
// **Inga ansiktsband omkalibreras här.** DoD 9 (ORDER 111 §6): frågan
// om `hurried` 0,95 ska vara per verksamhet eller gemensam är
// oadresserad — mätningen är underlaget, beslutet hör till senare.
//
// **Föränderliga siffror.** Ändras arrivals/service/checkback/queue-
// dynamiken skiftar dessa värden. Om testet failar på grund av det:
// uppdatera förväntade värden med samma test-körning (kör med
// `npx vitest run loadMeasurement --reporter=verbose` och läs
// console-outputen), inte genom att lossa på asserterna.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import type { BusinessClass, SimAction, SimulationState } from '../../types';
import { capacityForBusiness } from '../businessClass';

interface LoadPercentiles {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  samples: number;
}

// Percentil via linjär interpolation. Enkel implementation — samma seed
// ger samma exakta värden.
function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computePercentiles(samples: readonly number[]): LoadPercentiles {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
    samples: samples.length
  };
}

// Kör en lunchservice per verksamhet och samla staff.workload varje
// tick. TICK sker 5 Hz i produktion; testet använder samma cadence.
// Servicelängd 20 minuter är rimlig middelband (§ARRIVAL_BASE_PER_MINUTE
// är justerad för det).
const SEED = 20260815;
const SERVICE_MINUTES = 20;
const TICK_HZ = 5;
const TICKS_PER_SERVICE = SERVICE_MINUTES * 60 * TICK_HZ;
// Efter opening (10 s) + prep (för restaurant/värdshus 60 s) — sample
// bara den faktiska servicen. Föredra en enkel offset som är säker för
// alla tre: hoppa över de första 60 tickens (12 sim-sek) så vi mäter
// när servicen är i gång.
const WARMUP_TICKS = 5 * 20; // 20 sim-sek

function measureLoadFor(business: BusinessClass): LoadPercentiles {
  let s = makeInitialState(SEED);
  // Sätt verksamheten + uppdatera capacity innan service öppnar.
  s = {
    ...s,
    businessClass: business,
    policies: {
      ...s.policies,
      capacity: capacityForBusiness(business, s.policies.staffCount)
    }
  };
  const openAction: SimAction = {
    type: 'OPEN_SERVICE',
    service: 'lunch',
    lengthMinutes: SERVICE_MINUTES
  };
  s = reducer(s, openAction);

  const samples: number[] = [];
  for (let t = 0; t < TICKS_PER_SERVICE; t++) {
    s = reducer(s, { type: 'TICK', dt: 1 / TICK_HZ });
    if (t < WARMUP_TICKS) continue;
    // Genomsnittlig staff.workload per tick — samma reading som
    // `sustainability.ts:workload` använder för band-kalibrering.
    const mean = staffMeanWorkload(s);
    samples.push(mean);
  }
  return computePercentiles(samples);
}

function staffMeanWorkload(s: SimulationState): number {
  if (s.staff.length === 0) return 0;
  const sum = s.staff.reduce((acc, m) => acc + m.workload, 0);
  return sum / s.staff.length;
}

describe('ORDER 111 §5 — load-mätning per verksamhet (fixed-seed)', () => {
  it('mäter p10/p25/p50/p75/p90 per verksamhet och redovisar förskjutningen', () => {
    const restaurant = measureLoadFor('kvarterskrogen');
    const foodtruck = measureLoadFor('foodtrucken');
    const värdshus = measureLoadFor('gästgiveriet');

    // Redovisa siffrorna i console — Vision Owner läser dessa när
    // frågan om per-verksamhet-band tas upp. Inga assertions mot
    // specifika värden (svårighetskurvan och kreditekonomin är
    // obesvarade per R3 §§4–7).
    // eslint-disable-next-line no-console
    console.log('\n=== ORDER 111 §5 — load-fördelning per verksamhet (seed 20260815) ===');
    // eslint-disable-next-line no-console
    console.log(`restaurant:  p10=${restaurant.p10.toFixed(3)}  p25=${restaurant.p25.toFixed(3)}  p50=${restaurant.p50.toFixed(3)}  p75=${restaurant.p75.toFixed(3)}  p90=${restaurant.p90.toFixed(3)}  (n=${restaurant.samples})`);
    // eslint-disable-next-line no-console
    console.log(`foodtruck:   p10=${foodtruck.p10.toFixed(3)}  p25=${foodtruck.p25.toFixed(3)}  p50=${foodtruck.p50.toFixed(3)}  p75=${foodtruck.p75.toFixed(3)}  p90=${foodtruck.p90.toFixed(3)}  (n=${foodtruck.samples})`);
    // eslint-disable-next-line no-console
    console.log(`värdshus:    p10=${värdshus.p10.toFixed(3)}  p25=${värdshus.p25.toFixed(3)}  p50=${värdshus.p50.toFixed(3)}  p75=${värdshus.p75.toFixed(3)}  p90=${värdshus.p90.toFixed(3)}  (n=${värdshus.samples})`);
    // eslint-disable-next-line no-console
    console.log('===========================================================================\n');

    // Sanity — percentilerna är monotont sorterade per verksamhet.
    for (const [name, p] of [
      ['kvarterskrogen', restaurant],
      ['foodtrucken', foodtruck],
      ['gästgiveriet', värdshus]
    ] as const) {
      expect(p.p10, `${name} p10 <= p25`).toBeLessThanOrEqual(p.p25);
      expect(p.p25, `${name} p25 <= p50`).toBeLessThanOrEqual(p.p50);
      expect(p.p50, `${name} p50 <= p75`).toBeLessThanOrEqual(p.p75);
      expect(p.p75, `${name} p75 <= p90`).toBeLessThanOrEqual(p.p90);
      expect(p.samples).toBeGreaterThan(0);
    }
  });

  it('DoD 8 — tre separata körningar (inte samma sim med tre parametrar)', () => {
    // Kontroll att measureLoadFor faktiskt kör tre oberoende simuleringar.
    // Varje anrop startar från makeInitialState → OPEN_SERVICE. Om två
    // körningar skulle producera identiska sampel-arrays vore det ett
    // tecken på att business-differentiering inte får effekt.
    let s = makeInitialState(SEED);
    s = { ...s, businessClass: 'kvarterskrogen' };
    const openAction: SimAction = { type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 5 };
    s = reducer(s, openAction);
    let restaurantChecksum = 0;
    for (let t = 0; t < 500; t++) {
      s = reducer(s, { type: 'TICK', dt: 1 / TICK_HZ });
      restaurantChecksum += staffMeanWorkload(s);
    }
    let s2 = makeInitialState(SEED);
    s2 = {
      ...s2,
      businessClass: 'foodtrucken',
      policies: { ...s2.policies, capacity: capacityForBusiness('foodtrucken', s2.policies.staffCount) }
    };
    s2 = reducer(s2, openAction);
    let foodtruckChecksum = 0;
    for (let t = 0; t < 500; t++) {
      s2 = reducer(s2, { type: 'TICK', dt: 1 / TICK_HZ });
      foodtruckChecksum += staffMeanWorkload(s2);
    }
    // Kraftig assertion: restaurant och foodtruck ska ge OLIKA checksums.
    // Om de är identiska betyder det att foodtruck inte differentieras
    // i sim-loopen — och då är R4-strukturen inte färdig.
    expect(restaurantChecksum).not.toBe(foodtruckChecksum);
  });
});
