// ORDER 296c — hur många raketer rummet utlöser per kväll (Vision Owner
// 2026-10-02: "oftare när det är fullt och utan tak på tre per kväll").
// Kvällen spelas med baspaketet och bästa svaret; kvällens raketer räknas ur
// incidents.log (inte egna raketer). Trycket = (de som sitter + kön) mot
// rummets platser, i snitt över kvällen (sim/incidents.ts roomPressure).
//
//   ROCKET_SEEDS=6 WRITE_REPORTS=1 REPORT_ORDER=order296c npx vitest run src/strategic/testHarness/__tests__/order296cRockets.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { PLAYERS } from '../randomness';
import { firstDayOfWeek } from '../../../sim/calendar';
import { roomPressure } from '../../../sim/incidents';

describe.skipIf(!process.env.ROCKET_SEEDS)('ORDER 296c — raketerna per kväll', () => {
  it('räknar kvällens raketer per veckodag', async () => {
    const seeds = Array.from({ length: Number(process.env.ROCKET_SEEDS ?? 4) }, (_, i) => i + 1);
    const rows: { weekday: string; seed: number; rockets: number; pressure: number }[] = [];
    for (const [weekday, offset] of [['mon', 0], ['tue', 1], ['wed', 2], ['thu', 3], ['fri', 4], ['sat', 5]] as const) {
      for (const seed of seeds) {
        let s = makeNewGameState(seed);
        s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + offset } };
        s = playMorning(s, {});
        mountRoomLikeScene(s.businessClass);
        let sum = 0;
        let ticks = 0;
        s = tickUntil(reducer(s, { type: 'START_SERVICE' }), (x) => {
          if (x.day.period === 'dinner') { sum += roomPressure(x); ticks++; }
          return x.day.period === 'evening' || x.day.period === 'morning';
        });
        rows.push({ weekday, seed, rockets: (s.incidents?.log ?? []).filter((r) => (r.kind ?? 'planned') === 'planned').length, pressure: +(sum / Math.max(1, ticks)).toFixed(2) });
      }
    }
    const byDay = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => {
      const r = rows.filter((x) => x.weekday === d);
      return [d, { meanRockets: +(r.reduce((a, x) => a + x.rockets, 0) / r.length).toFixed(1), min: Math.min(...r.map((x) => x.rockets)), max: Math.max(...r.map((x) => x.rockets)), meanPressure: +(r.reduce((a, x) => a + x.pressure, 0) / r.length).toFixed(2) }];
    }));
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296c');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.ROCKET_OUT ?? 'rockets.json'), JSON.stringify({ definition: 'Kvällens raketer (inte egna) per veckodag, vecka 2, vinbaren, baspaketet, bästa svaret. Trycket = (sittande + kön) / rummets platser i snitt (sim/incidents.ts roomPressure).', seeds, byDay, rows }, null, 2) + '\n');
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 1800000);
});
