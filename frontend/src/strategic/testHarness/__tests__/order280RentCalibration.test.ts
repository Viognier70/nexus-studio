// ORDER 280 — kalibreringen av veckohyran (Vision Owner 2026-09-29):
// "Kalibrera hyran så att den rimliga spelaren går plus med ungefär 5–10 %
// av veckointäkten, och den svaga spelaren nedgraderas inom två till tre
// veckor."
//
// Mätningarna:
//   - rimlig: vecka 2, vinbaren, brons i tre, baspaketet varje morgon och
//     bästa svaret (randomness.ts playMeasuredWeek). Resultatet är
//     kassans förändring utan avräkningens påfyllnad och amortering
//     (slumpmålets definition; amorteringen är återbetalning av lån, inte
//     en kostnad), som andel av veckans intäkt ur avräkningen.
//   - svag: från vecka 1, vinbaren, brons i tre, sämsta svaret och för
//     lite i lagret (scenarios.ts weakMorning), normal startkassa. Veckan då
//     avräkningen nedgraderar (economy.lastSettlement.downgradedTo).
//
// Med CALIBRATE=1 prövas flera hyror och WRITE_REPORTS=1 skriver
// reports/order280/rent-calibration.json. Utan dem prövas det valda talet
// i balance.ts RENT.

import { describe, expect, it } from 'vitest';
import { playMeasuredWeek, PLAYERS } from '../randomness';
import { runWeeks } from '../weekHarness';
import { weakMorning } from '../scenarios';
import { RENT } from '../../../sim/balance';
import { firstDayOfWeek } from '../../../sim/calendar';

function reasonableShare(seeds: number[]): { meanShare: number; meanResultSek: number; meanRevenueSek: number } {
  let share = 0;
  let result = 0;
  let revenue = 0;
  for (const seed of seeds) {
    const w = playMeasuredWeek(seed, PLAYERS.baseline);
    share += w.resultSek / Math.max(1, w.revenueSek);
    result += w.resultSek;
    revenue += w.revenueSek;
  }
  return { meanShare: share / seeds.length, meanResultSek: result / seeds.length, meanRevenueSek: revenue / seeds.length };
}

function weakDowngradeWeek(seed: number, maxWeeks = 5): number | null {
  const run = runWeeks({
    seed,
    weeks: maxWeeks,
    setup: (s) => ({ ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } }),
    plan: () => weakMorning()
  });
  const d = run.days.find((x) => x.businessClass !== 'vinbar');
  return d ? d.week - 1 : null;
}

function measure(share: number, seeds: number[]) {
  (RENT as { shareOfNormalWeeklyRevenue: number }).shareOfNormalWeeklyRevenue = share;
  const r = reasonableShare(seeds);
  const weeks = seeds.map((seed) => weakDowngradeWeek(seed));
  return { share, reasonable: r, weakDowngradeWeeks: weeks };
}

describe('ORDER 280 — veckohyran', () => {
  it('den rimliga spelaren går plus med 5–10 % och den svaga nedgraderas inom två till tre veckor', async () => {
    const chosen = RENT.shareOfNormalWeeklyRevenue;
    // Vision Owner 2026-09-29: mät hyran med fler frön (minst 20) innan den
    // rörs. RENT_SEEDS väljer antalet; tio som förut.
    const seeds = Array.from({ length: Number(process.env.RENT_SEEDS ?? 10) }, (_, i) => i + 1);
    const shares = process.env.CALIBRATE === '1' ? [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35] : [chosen];
    const rows = shares.map((sh) => measure(sh, seeds));
    (RENT as { shareOfNormalWeeklyRevenue: number }).shareOfNormalWeeklyRevenue = chosen;
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order280');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.CALIBRATE === '1' ? 'rent-calibration.json' : 'rent-check.json'), JSON.stringify({
        definition: 'rimlig: vecka 2, vinbaren, brons i tre, baspaketet och bästa svaret; andel = resultat (kassans förändring utan påfyllnad och amortering) / veckans intäkt ur avräkningen, medel över fröna. svag: från vecka 1, vinbaren, brons i tre, weakMorning, normal startkassa; veckan då avräkningen nedgraderar (null = inte inom fem veckor).',
        chosenShare: chosen,
        seeds,
        rows
      }, null, 2) + '\n');
    }
    const at = rows.find((r) => r.share === chosen)!;
    expect(at.reasonable.meanShare).toBeGreaterThanOrEqual(RENT.reasonableResultShare[0]);
    expect(at.reasonable.meanShare).toBeLessThanOrEqual(RENT.reasonableResultShare[1]);
    for (const w of at.weakDowngradeWeeks) {
      expect(w).not.toBeNull();
      expect(w!).toBeLessThanOrEqual(RENT.weakDowngradeWeeks[1]);
    }
  }, 1800000);
});
