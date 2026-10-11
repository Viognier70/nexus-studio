// ORDER 329 C — fikat per 21 dagar i vagnen: 40 frön, den rimliga spelaren i foodtrucken (weekHarness playDay,
// ladder never), samma mätning som ORDER 328 F (scripts/order328-fika-matning.test.ts.txt). Räknar dilemmana
// (fika.log), det vanliga fikat (fika.plain, ORDER 329 B, räknat kväll för kväll), lagets medeltrivsel och ryktet dag
// 21. Skriver reports/<REPORT_DIR>/fika.json (WRITE_REPORTS=1; REPORT_DIR förvalt order329).

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { playDay, startInFoodtruck } from '../weekHarness';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

describe('ORDER 329 C — fikat i vagnen per 21 dagar', () => {
  it.skipIf(!process.env.WRITE_REPORTS)('40 frön, den rimliga spelaren', () => {
    const seeds: { seed: number; days: number; fikas: number; plain: number; dilemmas: string[]; wellbeingEnd: number; reputation: number }[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      let s = startInFoodtruck(seed);
      const start = s.day.dayNumber;
      let plain = 0;
      for (let d = 0; d < 21 && s.economy.businessClass === 'foodtruck'; d++) {
        const day = s.day.dayNumber;
        s = playDay(s, { ladder: 'never' }).state;
        if ((s.fika as { plain?: { day: number } | null } | undefined)?.plain?.day === day) plain++;
      }
      const log = (s.fika?.log ?? []) as Array<{ dilemmaId: string }>;
      seeds.push({ seed, days: s.day.dayNumber - start, fikas: log.length, plain, dilemmas: log.map((e) => e.dilemmaId), wellbeingEnd: mean(s.staff.map((m) => m.wellbeing ?? 0.75)), reputation: s.reputation });
    }
    const out = {
      definition: '40 frön, foodtrucken i 21 dagar med den rimliga spelaren (weekHarness playDay, ladder never). fikas = dilemman (fika.log), plain = kvällar med vanligt fika (ORDER 329 B), wellbeingEnd = lagets medeltrivsel dag 21, reputation = ryktet dag 21.',
      fikasMean: +mean(seeds.map((x) => x.fikas)).toFixed(2), fikasMin: Math.min(...seeds.map((x) => x.fikas)), fikasMax: Math.max(...seeds.map((x) => x.fikas)),
      plainMean: +mean(seeds.map((x) => x.plain)).toFixed(2),
      wellbeingEndMean: +mean(seeds.map((x) => x.wellbeingEnd)).toFixed(3),
      reputationMean: +mean(seeds.map((x) => x.reputation)).toFixed(3),
      reputationAtLeast05: seeds.filter((x) => x.reputation >= 0.5).length,
      seeds
    };
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_DIR ?? 'order329');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, process.env.FIKA_FILE ?? 'fika.json'), JSON.stringify(out, null, 1));
    expect(seeds.every((x) => x.days === 21)).toBe(true);
  }, 3600000);
});
