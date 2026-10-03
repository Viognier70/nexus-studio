// ORDER 298b — kvällarna med och utan provsmakningen på torget: väntade gäster
// ur marknaden (arrivals.ts expectedMarketGuests), om raden Lugn kväll står
// (reputationHoldsGuests), sällskapen, notorna och kvällskassan.
//
//   KVALLARNA=1 WRITE_REPORTS=1 REPORT_ORDER=order298b npx vitest run src/strategic/testHarness/__tests__/order298bKvallarna.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { firstDayOfWeek } from '../../../sim/calendar';
import { tillSek, stockSpentToday } from '../../simulation/eveningEconomy';
import { expectedMarketGuests, reputationHoldsGuests, tastingPartiesFor } from '../../simulation/arrivals';
import { PLAYERS } from '../randomness';
import { TASTING } from '../../../sim/balance';
import type { MedalLevelId } from '../../types';

function evening(seed: number, week: number, offset: number, reputation: number, tasting: boolean, stensota: MedalLevelId) {
  let s = makeNewGameState(seed);
  s = { ...s, reputation, medals: { ...PLAYERS.baseline, stensota }, day: { ...s.day, dayNumber: firstDayOfWeek(week) + offset } };
  s = playMorning(s, { activities: tasting ? [TASTING.activityId] : [] });
  const morning = { expected: +expectedMarketGuests(s).toFixed(1), calm: reputationHoldsGuests(s), tastingParties: tastingPartiesFor(s), stockSek: Math.round(stockSpentToday(s)) };
  mountRoomLikeScene(s.businessClass);
  s = reducer(s, { type: 'START_SERVICE' });
  let till = 0;
  s = tickUntil(s, (x) => { if (x.day.period === 'dinner') till = tillSek(x); return x.day.period === 'evening' || x.day.period === 'morning'; });
  return { ...morning, parties: s.day.partiesTonight ?? 0, tasting: s.day.tastingPartiesTonight ?? 0, seated: s.day.seatedTonight ?? 0, bills: s.day.billsTonight ?? 0, tillSek: Math.round(till) };
}

describe.skipIf(!process.env.KVALLARNA)('ORDER 298b — kvällarna med provsmakningen', () => {
  it('jämför kvällar med och utan', async () => {
    type Row = { stensota: MedalLevelId; week: number; offset: number; reputation: number; seed: number; expected: number; calm: boolean; tastingParties: number; without: ReturnType<typeof evening>; with: ReturnType<typeof evening>; gainSek: number };
    const rows: Row[] = [];
    for (const stensota of ['brons', 'silver'] as MedalLevelId[])
      for (const week of [1, 2, 4]) for (const offset of [0, 2, 4]) for (const reputation of [0.15, 0.3, 0.5]) for (const seed of [1, 2, 3]) {
        const without = evening(seed, week, offset, reputation, false, stensota);
        const withT = evening(seed, week, offset, reputation, true, stensota);
        rows.push({ stensota, week, offset, reputation, seed, expected: without.expected, calm: without.calm, tastingParties: withT.tastingParties, without, with: withT, gainSek: withT.tillSek - without.tillSek });
      }
    const sum = (f: (r: Row) => boolean) => { const r = rows.filter(f); return { evenings: r.length, meanGainSek: Math.round(r.reduce((a, x) => a + x.gainSek, 0) / Math.max(1, r.length)) }; };
    const summary = {
      costSek: TASTING.costSek,
      calm: { brons: sum((r) => r.calm && r.stensota === 'brons'), silver: sum((r) => r.calm && r.stensota === 'silver') },
      notCalm: { brons: sum((r) => !r.calm && r.stensota === 'brons'), silver: sum((r) => !r.calm && r.stensota === 'silver') }
    };
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order298b');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.KVALLARNA_OUT ?? 'kvallarna.json'), JSON.stringify({ definition: 'Samma kväll med och utan provsmakningen (vinbaren, brons i tre, Stensöta brons eller silver). expected = marknadens väntade gäster (arrivals.ts expectedMarketGuests), calm = raden Lugn kväll (reputationHoldsGuests), gainSek = kvällskassans skillnad (tillSek). Kostnaden för provsmakningen ingår inte i gainSek.', summary, rows }, null, 2) + '\n');
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 3600000);
});
