// ORDER 319a.3 (Anders 2026-10-07) — hur många situationer foodtrucken får per kväll, och varför
// några kvällar får färre. Spelaren svarar rätt och stannar i foodtrucken (ladder 'never').
// Målet är SITUATIONS.minPerEvening–maxPerEvening (4–6) per kväll som inte föll ihop.
//
//   WRITE_REPORTS=1 SITUATION_SEEDS=8 SITUATION_WEEKS=2 npx vitest run src/strategic/testHarness/__tests__/order319aSituationer.test.ts
// skriver reports/order319a/situationer.json.

import { describe, expect, it } from 'vitest';
import { playDay, playMorning, startInFoodtruck, tickUntil, type MorningPlan } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../randomness';
import { SITUATIONS } from '../../../sim/balance';

interface Evening { seed: number; day: number; situations: number; planned: number; collapsed: string | null; endedAt: number }

function evenings(seeds: number, weeks: number): Evening[] {
  const out: Evening[] = [];
  const plan: MorningPlan = { scenarioAnswer: 'best', ladder: 'never' };
  for (let seed = 1; seed <= seeds; seed++) {
    let s = startInFoodtruck(seed, firstDayOfWeek(1));
    s = { ...s, medals: { ...PLAYERS.baseline } };
    for (let d = 0; d < weeks * 7; d++) {
      if (calendarFor(s.day.dayNumber).isServiceDay && s.economy.businessClass === 'foodtruck') {
        const open = reducer(playMorning(s, plan), { type: 'START_SERVICE' });
        let endedAt = 1;
        const eve = tickUntil(open, (x) => {
          const done = x.day.period === 'evening' || x.day.period === 'morning';
          const inc = x.incidents;
          if (done && inc?.doorsOpenAt != null && inc.serviceEndsAt != null) endedAt = (x.simTime - inc.doorsOpenAt) / Math.max(1, inc.serviceEndsAt - inc.doorsOpenAt);
          return done;
        });
        out.push({ seed, day: s.day.dayNumber, situations: eve.incidents?.log.length ?? 0, planned: eve.incidents?.plannedCount ?? 0, collapsed: eve.day.serviceCollapsed ? (eve.day.collapseAxis ?? 'okänd') : null, endedAt: +Math.min(1, endedAt).toFixed(2) });
      }
      s = playDay(s, plan).state;
    }
  }
  return out;
}

describe('ORDER 319a.3 — foodtruckens situationer per kväll', () => {
  it('varje kväll som inte föll ihop får minst minPerEvening situationer; färre bara när kvällen föll ihop', async () => {
    const seeds = Number(process.env.SITUATION_SEEDS ?? 2);
    const weeks = Number(process.env.SITUATION_WEEKS ?? 1);
    const ev = evenings(seeds, weeks);
    const whole = ev.filter((e) => !e.collapsed);
    if (process.env.WRITE_REPORTS) {
      const hist = (xs: Evening[]) => xs.reduce<Record<number, number>>((h, e) => ({ ...h, [e.situations]: (h[e.situations] ?? 0) + 1 }), {});
      const mean = (xs: Evening[]) => +(xs.reduce((a, e) => a + e.situations, 0) / Math.max(1, xs.length)).toFixed(2);
      const collapsed = ev.filter((e) => e.collapsed);
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order319a');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'situationer.json'), JSON.stringify({
        definition: 'Foodtruckens kvällar (startInFoodtruck, ladder never, rätt svar). situations = incidents.log.length när servicen slutar; collapsed = day.collapseAxis när kvällen föll ihop (strategic/simulation/collapse.ts); endedAt = andelen av fönstret doorsOpenAt–serviceEndsAt när servicen slutade.',
        seeds, weeks, evenings: ev.length,
        all: { mean: mean(ev), histogram: hist(ev) },
        whole: { evenings: whole.length, mean: mean(whole), histogram: hist(whole) },
        collapsed: { evenings: collapsed.length, mean: mean(collapsed), histogram: hist(collapsed), axes: collapsed.reduce<Record<string, number>>((h, e) => ({ ...h, [e.collapsed!]: (h[e.collapsed!] ?? 0) + 1 }), {}), endedAt: collapsed.map((e) => e.endedAt) },
        rows: ev
      }, null, 2) + '\n');
    }
    for (const e of whole) expect(e.situations).toBeGreaterThanOrEqual(SITUATIONS.minPerEvening);
    for (const e of ev) expect(e.situations).toBeLessThanOrEqual(SITUATIONS.maxPerEvening);
  }, 600000);
});
