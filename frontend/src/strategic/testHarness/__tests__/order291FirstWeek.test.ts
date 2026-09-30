// ORDER 291 — den första veckan (Vision Owner 2026-09-30, tillägg 2: "Kör
// harnessen med och utan satsningar och kurser, och rapportera hur ofta en
// rimlig spelare går back första veckan. En enskild kväll får gå back, men
// första veckan ska gå att överleva. En ny spelare som går 12 000 kr back
// första kvällen, efter att ha gjort det mentorn sa, slutar spela.").
//
// Mätningen: vinbaren från vecka 1 (den lugnare första veckan), brons i
// tre paviljonger, normal startkassa (constants.ts INITIAL_CASH_SEK), bästa
// svaret på raketerna, baspaketet varje morgon (efter bokningen). Kvällens
// resultat läses ur day.transfer.resultSek, samma tal som skärmen efter
// servicen och kvällens resultat visar (eveningEconomy.ts eveningTransfer).
// Veckans resultat är kassans förändring från måndag morgon till måndag
// morgon veckan efter, efter avräkningen (hyra, löner, amortering); golvets
// påfyllnad räknas bort, så att talet är vad spelaren själv tjänade.
//
// Avvikelse mot spelarens flöde: introduktionen (övningen, provet och
// banken) spelas inte; kassan är startkassan, inte kassan efter startlånet.
// Veckan från bussen i produktionsbygget (scripts/order271-dod-from-start.mjs)
// mäter spelarens flöde.
//
// Spelarna:
//   mentorn      — det mentorn säger: baspaketet, inga satsningar.
//   förstaKvallen — som provspelet: utbildningen av salen och DJ:n första
//                   kvällen, sedan som mentorn.
//   satsningar   — DJ och springaren varje kväll.
//   kurser       — utbildningen av salen och vinprovningen varje kväll.
//
//   WRITE_REPORTS=1 REPORT_ORDER=order291 FIRST_WEEK_SEEDS=20 npx vitest run src/strategic/testHarness/__tests__/order291FirstWeek.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil, type MorningPlan } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { PLAYERS } from '../randomness';
import { firstDayOfWeek } from '../../../sim/calendar';
import { WEEK } from '../../../sim/balance';
import type { SimulationState } from '../../types';

type PlayerId = 'mentorn' | 'forstaKvallen' | 'satsningar' | 'kurser';
const PLANS: Record<PlayerId, (day: number) => MorningPlan> = {
  mentorn: () => ({}),
  forstaKvallen: (day) => (day === 0 ? { activities: ['train-service', 'book-dj'] } : {}),
  satsningar: () => ({ activities: ['book-dj', 'runner-shift'] }),
  kurser: () => ({ activities: ['train-service', 'wine-tasting'] })
};

interface WeekRow { seed: number; evenings: (number | null)[]; weekResultSek: number; cashEnd: number; downgraded: boolean; minCash: number }

function playWeek(seed: number, player: PlayerId): WeekRow {
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
  const cashStart = s.cash;
  let minCash = s.cash;
  const evenings: (number | null)[] = [];
  let topUp = 0;
  let amortisation = 0;
  for (let d = 0; d < WEEK.daysPerWeek; d++) {
    const day = s.day.dayNumber;
    s = playMorning(s, PLANS[player](d));
    mountRoomLikeScene(s.businessClass);
    const opened = reducer(s, { type: 'START_SERVICE' });
    if (opened !== s) s = tickUntil(opened, (x) => x.day.period === 'evening' || x.day.period === 'morning');
    else s = reducer(s, { type: 'CLOSE_DAY' });
    evenings.push(s.day.period === 'evening' ? s.day.transfer?.resultSek ?? null : null);
    if (s.day.period === 'evening') s = reducer(s, { type: 'END_EVENING' });
    s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
    minCash = Math.min(minCash, s.cash);
    const st = s.economy.lastSettlement;
    if (st && st.week === 1) { topUp = st.topUpSek; amortisation = st.amortisationSek; }
  }
  return {
    seed,
    evenings,
    weekResultSek: Math.round(s.cash - cashStart - topUp + amortisation),
    cashEnd: Math.round(s.cash),
    downgraded: s.economy.businessClass !== 'vinbar' || Boolean(s.economy.downgradePending),
    minCash: Math.round(minCash)
  };
}

function summarise(rows: WeekRow[]) {
  const first = rows.map((r) => r.evenings[0]).filter((x): x is number => x !== null);
  const all = rows.flatMap((r) => r.evenings).filter((x): x is number => x !== null);
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
  return {
    weeks: rows.length,
    weeksWithLoss: rows.filter((r) => r.weekResultSek < 0).length,
    shareWeeksWithLoss: rows.filter((r) => r.weekResultSek < 0).length / rows.length,
    downgradedOrPending: rows.filter((r) => r.downgraded).length,
    meanWeekResultSek: mean(rows.map((r) => r.weekResultSek)),
    worstWeekResultSek: Math.min(...rows.map((r) => r.weekResultSek)),
    firstEvening: { mean: mean(first), worst: Math.min(...first), best: Math.max(...first), losses: first.filter((x) => x < 0).length },
    evenings: { mean: mean(all), worst: Math.min(...all), losses: all.filter((x) => x < 0).length, count: all.length },
    lowestCashSek: Math.min(...rows.map((r) => r.minCash))
  };
}

describe('ORDER 291 — första veckan', () => {
  it('den rimliga spelaren överlever första veckan, med och utan satsningar och kurser', async () => {
    const seeds = Array.from({ length: Number(process.env.FIRST_WEEK_SEEDS ?? 6) }, (_, i) => i + 1);
    const players: PlayerId[] = ['mentorn', 'forstaKvallen', 'satsningar', 'kurser'];
    const result: Record<string, ReturnType<typeof summarise> & { rows: WeekRow[] }> = {};
    for (const p of players) {
      const rows = seeds.map((seed) => playWeek(seed, p));
      result[p] = { ...summarise(rows), rows };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order291');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, 'first-week.json'), JSON.stringify({
        definition: 'vinbaren från vecka 1, brons i tre, startkassan, bästa svaret, baspaketet efter bokningen. Kvällens resultat = day.transfer.resultSek. Veckans resultat = kassans förändring måndag till måndag efter avräkningen, utan golvets påfyllnad och med amorteringen återlagd. Introduktionen och startlånet spelas inte.',
        seeds,
        players: result
      }, null, 2) + '\n');
    }
    // Första veckan ska gå att överleva för den som gör som mentorn säger.
    expect(result.mentorn.downgradedOrPending).toBe(0);
    expect(result.mentorn.lowestCashSek).toBeGreaterThan(0);
  }, 600000);
});
