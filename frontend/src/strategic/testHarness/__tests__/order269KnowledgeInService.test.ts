// ORDER 269 — kunskapen in i servicen.
//
// Vision Owner 2026-09-26: "Metodköket sänker köksmisstag och
// kollapsrisk, Stensöta höjer intäkt per gäst via dryck, Kalastorget gör
// att klagande gäster oftare stannar, huvudpaviljongen styr personalens
// tempo. Fyll på krediterna enligt speldesignen. [...] med medaljer i
// Kalastorget ger det bästa svaret mer. DoD: slumpmålet mellan 70 och
// 80 %, där A och B bara skiljer sig i medaljer."
//
// Slumpmålet läses ur mätningens utdata, reports/order269/randomness.json
// (1 000 veckor, skriven av order267Randomness.test.ts med
// REPORT_ORDER=order269 RANDOMNESS_WEEKS=1000 WRITE_REPORTS=1), enligt
// ORDER 160: talet kommer ur skriptets fil, inte ur rapporten.
//
// Med WRITE_REPORTS=1 skrivs reports/order269/week-harness.json
// (veckoharnessen efter ordern, ordern §1.2).

import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeNewGameState } from '../../simulation/model';
import { changeClass } from '../../../sim/economy';
import {
  bestAnswerFactor,
  collapseRiskFactor,
  drinkRevenueFactor,
  enablersWithCredits,
  giveUpSatisfaction,
  kitchenMistakeFactor,
  queuePatienceSeconds,
  staffTempoFactor
} from '../../../sim/knowledgeInService';
import { QUEUE, RANDOMNESS } from '../../../sim/balance';
import { PLAYERS } from '../randomness';
import { daySummary, SCENARIOS } from '../scenarios';
import type { SimulationState } from '../../types';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order269');

function withMedals(medals: SimulationState['medals']): SimulationState {
  const s = makeNewGameState(42);
  return { ...s, medals };
}

describe('ORDER 269 — kunskapen i servicen', () => {
  const none = withMedals({});
  const silver = withMedals({ metodkoket: 'silver', stensota: 'silver', kalastorget: 'silver' });

  it('Metodköket sänker köksmissarna och kollapsrisken', () => {
    expect(kitchenMistakeFactor(none)).toBe(1);
    expect(kitchenMistakeFactor(silver)).toBeLessThan(1);
    expect(collapseRiskFactor(silver)).toBeLessThan(collapseRiskFactor(none));
  });

  it('Stensöta höjer intäkten per gäst via dryck', () => {
    expect(drinkRevenueFactor(none)).toBe(1);
    expect(drinkRevenueFactor(silver)).toBeGreaterThan(1);
  });

  it('Kalastorget: den klagande gästen stannar oftare, och det bästa svaret ger mer', () => {
    expect(giveUpSatisfaction(none)).toBe(QUEUE.giveUpSatisfaction);
    expect(giveUpSatisfaction(silver)).toBeLessThan(QUEUE.giveUpSatisfaction);
    expect(queuePatienceSeconds(silver)).toBeGreaterThan(QUEUE.patienceSimSeconds);
    expect(bestAnswerFactor(silver)).toBeGreaterThan(bestAnswerFactor(none));
  });

  it('huvudpaviljongen styr personalens tempo (vinbaren: Stensöta)', () => {
    expect(staffTempoFactor(none)).toBe(1);
    expect(staffTempoFactor(withMedals({ stensota: 'guld' }))).toBeLessThan(staffTempoFactor(withMedals({ stensota: 'brons' })));
    // Metodköket är inte vinbarens huvudpaviljong.
    expect(staffTempoFactor(withMedals({ metodkoket: 'guld' }))).toBe(1);
    // Ölkrogens huvudpaviljong är Metodköket.
    const olkrog = changeClass(withMedals({ metodkoket: 'guld' }), 'olkrog', false);
    expect(staffTempoFactor(olkrog)).toBeLessThan(1);
  });

  it('krediterna fyller enablers och sänker dem aldrig', () => {
    const s = { ...none, knowledgeCredits: { episteme: 10, techne: 0, phronesis: 3 } };
    const e = enablersWithCredits(s);
    expect(e.scientific.episteme).toBeGreaterThan(0);
    expect(e.cultural.phronesis).toBeGreaterThan(0);
    const lower = enablersWithCredits({ ...s, enablers: e, knowledgeCredits: { episteme: 0, techne: 0, phronesis: 0 } });
    expect(lower.scientific.episteme).toBe(e.scientific.episteme);
  });

  it('A och B skiljer sig bara i medaljer', () => {
    expect(Object.keys(PLAYERS)).toEqual(['baseline', 'better']);
  });

  it('slumpmålet: den bättre förberedda spelaren vinner mellan 70 och 80 % av 1 000 veckor', () => {
    const file = resolve(OUT, 'randomness.json');
    expect(existsSync(file)).toBe(true);
    const m = JSON.parse(readFileSync(file, 'utf8')) as { weeks: number; winShare: number; pairs: { better: { worstEveningSek: number } }[] };
    expect(m.weeks).toBe(RANDOMNESS.simulatedWeeks);
    expect(m.winShare).toBeGreaterThanOrEqual(0.7);
    expect(m.winShare).toBeLessThanOrEqual(0.8);
    // "En enskild kväll får gå riktigt illa även för en duktig spelare."
    expect(m.pairs.some((p) => p.better.worstEveningSek <= 0)).toBe(true);
  });

  it.runIf(process.env.WRITE_REPORTS === '1')('veckoharnessen skrivs', () => {
    mkdirSync(OUT, { recursive: true });
    const all: Record<string, unknown> = {};
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      const r = scenario();
      all[name] = { seed: r.run.seed, settlements: r.settlements, days: daySummary(r.run) };
    }
    writeFileSync(resolve(OUT, 'week-harness.json'), JSON.stringify({ scenarios: all }, null, 2) + '\n');
    expect(Object.keys(all)).toHaveLength(3);
  });
});
