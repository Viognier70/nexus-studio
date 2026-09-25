// ORDER 267 (Nexus v1 etapp 5) — veckoharnessen efter etappen, i vinbarens rum.
//
// Ordern §1.2: harnessen körs efter varje etapp. Etapp 4 DoD:
// "Veckoharnessen visar att ryktet aldrig går under 10." Samma tre
// scenarier som etapp 3 (testHarness/scenarios.ts); rapporten per dag
// skrivs till reports/order267/week-harness.json, och testet hävdar ur
// samma körning att ryktet aldrig gick under golvet, en enda dag.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { daySummary, SCENARIOS } from '../scenarios';
import { REPUTATION } from '../../../sim/balance';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order267');

describe('ORDER 267 — veckoharnessen', () => {
  it('ryktet går aldrig under 10 av 100, i något scenario, någon dag', () => {
    const report: Record<string, unknown> = {};
    let lowest = 1;
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      const r = scenario();
      const days = daySummary(r.run);
      for (const d of days) lowest = Math.min(lowest, d.reputation);
      report[name] = { seed: r.run.seed, settlements: r.settlements, lowestReputation: Math.min(...days.map((d) => d.reputation)), days };
    }
    // Rapporten skrivs bara med WRITE_REPORTS=1, så att sviten inte ändrar
    // en committad rapport vid varje körning.
    if (process.env.WRITE_REPORTS === '1') mkdirSync(OUT, { recursive: true });
    if (process.env.WRITE_REPORTS === '1') writeFileSync(resolve(OUT, 'week-harness.json'), JSON.stringify({ reputationFloor: REPUTATION.floor / REPUTATION.scale, lowestReputation: lowest, scenarios: report }, null, 2) + '\n');
    expect(lowest).toBeGreaterThanOrEqual(REPUTATION.floor / REPUTATION.scale);
  });
});
