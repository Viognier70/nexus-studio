// ORDER 267 (Nexus v1 etapp 5) — slumpmålet mäts (testHarness/randomness.ts).
//
// Sviten kör ett litet urval veckor för att hålla mätningen körbar. Hela
// mätningen (RANDOMNESS.simulatedWeeks = 1 000 veckor) körs med
//   RANDOMNESS_WEEKS=1000 WRITE_REPORTS=1 npx vitest run order267Randomness
// och skriver reports/order267/randomness.json, som rapporten citerar.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureRandomness, MEASURED_WEEK, PLAYERS } from '../randomness';
import { RANDOMNESS } from '../../../sim/balance';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order267');
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
