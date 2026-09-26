// ORDER 267 (Nexus v1 etapp 5) — slumpmålet mäts (testHarness/randomness.ts).
//
// Sviten kör ett litet urval veckor för att hålla mätningen körbar. Hela
// mätningen (RANDOMNESS.simulatedWeeks = 1 000 veckor) körs med
//   RANDOMNESS_WEEKS=1000 WRITE_REPORTS=1 npx vitest run order267Randomness
// och skriver reports/order267/randomness.json, som rapporten citerar.
// ORDER 268 — REPORT_ORDER=order268 skriver mätningen under en senare
// orders katalog (ordern §1.2: slumpmålet mäts efter varje etapp).

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureRandomness, MEASURED_WEEK, PLAYERS } from '../randomness';
import { RANDOMNESS } from '../../../sim/balance';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order267');
const SAMPLE_WEEKS = 4;
const weeks = Number(process.env.RANDOMNESS_WEEKS ?? SAMPLE_WEEKS);
const TIMEOUT_MS_PER_WEEK = 5000;

describe('ORDER 267 — slumpmålet', () => {
  it(`den bättre förberedda spelaren mot grundspelaren, ${weeks} veckor`, () => {
    const m = measureRandomness(weeks);
    const summary = {
      target: RANDOMNESS.betterPreparedWinShare,
      week: MEASURED_WEEK,
      players: PLAYERS,
      weeks: m.weeks,
      betterWins: m.betterWins,
      ties: m.ties,
      winShare: m.winShare,
      // ORDER 269 — andelen veckor där spelaren hade en kväll utan intäkt
      // (kvällen föll ihop): "En enskild kväll får gå riktigt illa".
      weeksWithEmptyEvening: {
        better: m.pairs.filter((p) => p.better.worstEveningSek <= 0).length / m.weeks,
        baseline: m.pairs.filter((p) => p.baseline.worstEveningSek <= 0).length / m.weeks
      },
      meanResultSek: {
        better: Math.round(m.pairs.reduce((a, p) => a + p.better.resultSek, 0) / m.weeks),
        baseline: Math.round(m.pairs.reduce((a, p) => a + p.baseline.resultSek, 0) / m.weeks)
      }
    };
    if (process.env.WRITE_REPORTS === '1') {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(resolve(OUT, 'randomness.json'), JSON.stringify({ ...summary, pairs: m.pairs }, null, 2) + '\n');
    }
    console.log(JSON.stringify(summary));
    expect(m.weeks).toBe(weeks);
    expect(m.winShare).toBeGreaterThanOrEqual(0);
    expect(m.winShare).toBeLessThanOrEqual(1);
  }, Math.max(60000, weeks * TIMEOUT_MS_PER_WEEK));
});
