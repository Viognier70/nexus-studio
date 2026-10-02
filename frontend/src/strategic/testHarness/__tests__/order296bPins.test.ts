// ORDER 296b — hur ofta hovmästarens nålar kommer (Vision Owner 2026-10-02:
// "när det är fullt kommer ett beslut med några sekunders mellanrum").
// Kvällen spelas utan svar (Per väljer); nålarna räknas ur pins.log. Verklig
// tid = simtid / farten (som nålarnas klocka, sim/hostPins.ts).
//
//   PINS_SEEDS=3 WRITE_REPORTS=1 REPORT_ORDER=order296b npx vitest run src/strategic/testHarness/__tests__/order296bPins.test.ts

import { describe, expect, it } from 'vitest';
import { reducer } from '../../simulation/reducer';
import { makeNewGameState } from '../../simulation/model';
import { mountRoomLikeScene } from '../roomParity';
import { playMorning } from '../weekHarness';
import { PLAYERS } from '../randomness';
import { firstDayOfWeek } from '../../../sim/calendar';
import { pinsOf } from '../../../sim/hostPins';

describe.skipIf(!process.env.PINS_SEEDS)('ORDER 296b — nålarna per kväll', () => {
  it('räknar nålarna per veckodag', async () => {
    const seeds = Array.from({ length: Number(process.env.PINS_SEEDS ?? 3) }, (_, i) => i + 1);
    const rows: { weekday: string; seed: number; pins: number; realMinutes: number; kinds: Record<string, number> }[] = [];
    for (const [weekday, offset] of [['mon', 0], ['wed', 2], ['fri', 4], ['sat', 5]] as const) {
      for (const seed of seeds) {
        let s = makeNewGameState(seed);
        s = { ...s, cash: 60000, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + offset } };
        s = playMorning(s, {});
        mountRoomLikeScene(s.businessClass);
        s = reducer(s, { type: 'START_SERVICE' });
        let real = 0;
        for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
          if (s.incidents?.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: null as never, confidence: 0 });
          s = reducer(s, { type: 'TICK', dt: 0.2 });
          real += 0.2 / Math.max(1, s.speed);
        }
        const kinds: Record<string, number> = {};
        for (const e of pinsOf(s).log) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
        rows.push({ weekday, seed, pins: pinsOf(s).log.length, realMinutes: +(real / 60).toFixed(2), kinds });
      }
    }
    const byDay = Object.fromEntries(['mon', 'wed', 'fri', 'sat'].map((d) => {
      const r = rows.filter((x) => x.weekday === d);
      const pins = r.reduce((a, x) => a + x.pins, 0) / r.length;
      const minutes = r.reduce((a, x) => a + x.realMinutes, 0) / r.length;
      return [d, { meanPins: +pins.toFixed(1), meanRealMinutes: +minutes.toFixed(2), secondsBetween: pins > 0 ? Math.round((minutes * 60) / pins) : null }];
    }));
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296b');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'pins.json'), JSON.stringify({ definition: 'Nålarna per kväll i vecka 2 (vinbaren, brons i tre, baspaketet), utan svar: Per väljer. secondsBetween = verkliga sekunder per nål.', seeds, byDay, rows }, null, 2) + '\n');
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 1800000);
});
