// ORDER 292b — insatsen mot kvällskassan den första kvällen (Vision Owner
// 2026-10-01: "klockan 21.11 första kvällen var kassan 1 754 kr mot en insats
// på 12 079 kr … Rapportera hur insatsen är sammansatt den kvällen, och om en
// vardag utan satsningar kan nå break-even").
//
// Den första kvällen: vinbaren, vecka 1, måndag, brons i Stensöta och
// Kalastorget (som efter introduktionen, scripts/order271-dod-from-start.mjs),
// bästa svaret. Insatsen läses ur day.stake när dörrarna öppnar (reducer.ts,
// eveningEconomy.ts eveningStake), kvällskassan ur tillSek klockan 21.11 och
// vid stängningen. Fyra morgnar: inga satsningar; utbildningen och DJ:n;
// DJ:n och springaren; baspaketet och två tillköp. Sedan alla vardagar
// (måndag–torsdag) vecka 1 och 2 utan satsningar: hur ofta kvällskassan
// passerar insatsen.
//
//   WRITE_REPORTS=1 STAKE_SEEDS=20 npx vitest run src/strategic/testHarness/__tests__/order292bStake.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, playDay, type MorningPlan } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { tillSek } from '../../simulation/eveningEconomy';
import { clockMinutes } from '../../../sim/clock';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { packagesFor } from '../../simulation/packages';
import type { SimulationState } from '../../types';

const AT_2111 = 21 * 60 + 11;

function evening(s: SimulationState, plan: MorningPlan) {
  s = playMorning(s, plan);
  mountRoomLikeScene(s.businessClass);
  s = reducer(s, { type: 'START_SERVICE' });
  let stake: SimulationState['day']['stake'] | null = null;
  let till2111: number | null = null;
  for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    if (!stake && s.day.stake) stake = s.day.stake;
    if (till2111 === null && clockMinutes(s) >= AT_2111) till2111 = Math.round(tillSek(s));
  }
  return { stake, till2111, tillAtClose: Math.round(s.day.tillAtClose ?? 0), result: s.day.transfer?.resultSek ?? null, state: s };
}

function firstEvening(seed: number): SimulationState {
  const s = makeNewGameState(seed);
  return { ...s, medals: { ...s.medals, stensota: 'brons', kalastorget: 'brons' }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
}

describe.skipIf(!process.env.STAKE_SEEDS)('ORDER 292b — insatsen den första kvällen', () => {
  it('sammansättningen och break-even', async () => {
    const seeds = Array.from({ length: Number(process.env.STAKE_SEEDS ?? 4) }, (_, i) => i + 1);
    const addOns = (s: SimulationState) => (packagesFor(s.economy.businessClass)?.addOns ?? []).slice(0, 2).map((p) => ({ type: 'BUY_PACKAGE' as const, packageId: p.id }));
    const plans: Record<string, (s: SimulationState) => MorningPlan> = {
      ingaSatsningar: () => ({}),
      utbildningOchDj: () => ({ activities: ['train-service', 'book-dj'] }),
      djOchSpringare: () => ({ activities: ['book-dj', 'runner-shift'] }),
      tvaTillkop: (s) => ({ actions: addOns(s) })
    };
    const first: Record<string, unknown> = {};
    for (const [name, plan] of Object.entries(plans)) {
      const rows = seeds.map((seed) => {
        const s = firstEvening(seed);
        const e = evening(s, plan(s));
        return { seed, stake: e.stake, till2111: e.till2111, tillAtClose: e.tillAtClose, passed: e.stake ? e.tillAtClose >= e.stake.total : null, result: e.result };
      });
      const mean = (f: (r: (typeof rows)[number]) => number) => Math.round(rows.reduce((a, r) => a + f(r), 0) / rows.length);
      const lineMean = (key: string) => mean((r) => r.stake?.lines.find((l) => l.key === key)?.sek ?? 0);
      first[name] = {
        stakeMean: mean((r) => r.stake?.total ?? 0),
        lines: { ingredients: lineMean('ingredients'), staff: lineMean('staff'), dj: lineMean('dj'), investments: lineMean('investments') },
        till2111Mean: mean((r) => r.till2111 ?? 0),
        tillAtCloseMean: mean((r) => r.tillAtClose),
        passedStake: rows.filter((r) => r.passed).length,
        n: rows.length,
        rows
      };
    }
    // Vardagarna (måndag–torsdag) vecka 1 och 2 utan satsningar.
    const weekdays: Array<{ seed: number; week: number; weekday: string; stake: number; till: number; passed: boolean }> = [];
    for (const seed of seeds) {
      let s = firstEvening(seed);
      for (let d = 0; d < 14; d++) {
        const cal = calendarFor(s.day.dayNumber);
        if (['mon', 'tue', 'wed', 'thu'].includes(cal.weekday)) {
          const e = evening(s, {});
          if (e.stake) weekdays.push({ seed, week: cal.absoluteWeek, weekday: cal.weekday, stake: e.stake.total, till: e.tillAtClose, passed: e.tillAtClose >= e.stake.total });
        }
        s = playDay(s, {}).state;
      }
    }
    const byWeek = (w: number) => {
      const r = weekdays.filter((x) => x.week === w);
      return { evenings: r.length, passed: r.filter((x) => x.passed).length, stakeMean: Math.round(r.reduce((a, x) => a + x.stake, 0) / Math.max(1, r.length)), tillMean: Math.round(r.reduce((a, x) => a + x.till, 0) / Math.max(1, r.length)) };
    };
    const out = { first, weekdaysWithoutActivities: { week1: byWeek(1), week2: byWeek(2), rows: weekdays } };
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order292b');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'stake.json'), JSON.stringify({ definition: 'Första kvällen: vinbaren vecka 1 måndag, brons i Stensöta och Kalastorget, bästa svaret. stake = day.stake när dörrarna öppnar (eveningStake). till2111 = tillSek klockan 21.11 (sim/clock.ts clockMinutes). tillAtClose = day.tillAtClose. passed = kvällskassan vid stängningen minst insatsen (break-even). Vardagarna: måndag–torsdag vecka 1 och 2 utan satsningar.', seeds, ...out }, null, 2) + '\n');
    }
    expect(Object.keys(first).length).toBe(4);
  }, 1800000);
});
