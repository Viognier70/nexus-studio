// Satsningarna DJ och springaren (Vision Owner 2026-10-01: "Satsningarna ska
// löna sig när de används klokt: en DJ när det är fullt en fredag eller
// lördag, en springare när bokningen är stor. I dag ger de förlust varje
// gång. Föreslå en balans och kör harness, men ändra inget innan jag har
// sett förslaget.").
//
// Mätningen är parad: varje kväll i vecka 2 (vinbaren, brons i tre, bästa
// svaret, baspaketet efter bokningen) spelas från samma morgon två gånger,
// utan och med satsningen. Skillnaden i kvällens resultat
// (day.transfer.resultSek, samma tal som T2 och R1) är vad satsningen gav den
// kvällen. Satsningens pris ingår i resultatet (eveningEconomy.ts
// activityNetCost). Gästerna: bokningen (day.booking.total), notorna
// (day.billsTonight) och de som gick utan att få plats (day.walkedCount).
//
// Dagarna fram till kvällen spelas utan satsningar, så att morgonen är
// densamma för båda grenarna.
//
//   WRITE_REPORTS=1 SATS_SEEDS=20 npx vitest run src/strategic/testHarness/__tests__/satsningarBalans.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playDay, playMorning, tickUntil, type MorningPlan } from '../weekHarness';
import { bookingFor } from '../../simulation/guestTypes';
import { mountRoomLikeScene } from '../roomParity';
import { PLAYERS } from '../randomness';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { EVENING_ECONOMY, WEEK } from '../../../sim/balance';
import type { SimulationState } from '../../types';

interface Evening { resultSek: number; booked: number; bills: number; walked: number; reputationDelta: number; unhappy: number }

// ORDER 296b — DJ-kvällen planeras med vin: tillägget med husets vin köps
// samma morgon (EVENING_ECONOMY.djWinePackageId), som den kloka spelaren gör.
function djWine(activities: readonly string[]) {
  return activities.includes('book-dj') ? [{ type: 'BUY_PACKAGE' as const, packageId: EVENING_ECONOMY.djWinePackageId }] : [];
}

function evening(s: SimulationState, activities: string[]): Evening {
  s = playMorning(s, { activities, actions: djWine(activities) });
  mountRoomLikeScene(s.businessClass);
  const booked = s.day.booking?.total ?? 0;
  const rep0 = s.reputation;
  s = tickUntil(reducer(s, { type: 'START_SERVICE' }), (x) => x.day.period === 'evening' || x.day.period === 'morning');
  return {
    resultSek: s.day.transfer?.resultSek ?? 0,
    booked: s.day.booking?.total ?? booked,
    bills: s.day.billsTonight ?? 0,
    walked: s.day.walkedCount ?? 0,
    // Ryktet: kvällens förändring, och de missnöjda gästernas del
    // (metrics.reputationBreakdown.unhappy, ORDER 256).
    reputationDelta: Math.round((s.reputation - rep0) * 1000) / 1000,
    unhappy: Math.round((s.metrics.reputationBreakdown?.unhappy ?? 0) * 1000) / 1000
  };
}

const ACTIVITIES = { dj: 'book-dj', springare: 'runner-shift' } as const;

// Körs bara när mätningen begärs (SATS_SEEDS satt), så att sviten inte
// förlängs av en mätning för ett förslag.
describe.skipIf(!process.env.SATS_SEEDS)('Satsningarna — lönar de sig?', () => {
  it('parad mätning per veckodag, vecka 2', async () => {
    // PROTOTYP: SATS_VARIANT='{"runnerExtraHand":true}' skriver över talen i minnet.
    const variant = JSON.parse(process.env.SATS_VARIANT ?? '{}');
    Object.assign(EVENING_ECONOMY as unknown as Record<string, unknown>, variant);
    const seeds = Array.from({ length: Number(process.env.SATS_SEEDS ?? 4) }, (_, i) => i + 1);
    const rows: Array<{ seed: number; weekday: string; activity: string; without: Evening; with: Evening; gainSek: number }> = [];
    for (const seed of seeds) {
      let s = makeNewGameState(seed);
      s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
      for (let d = 0; d < WEEK.daysPerWeek - 1; d++) {
        const weekday = calendarFor(s.day.dayNumber).weekday;
        const base = evening(s, []);
        for (const [name, id] of Object.entries(ACTIVITIES)) {
          const w = evening(s, [id]);
          rows.push({ seed, weekday, activity: name, without: base, with: w, gainSek: w.resultSek - base.resultSek });
        }
        s = playDay(s, {}).state;
      }
    }
    const summary: Record<string, Record<string, { meanGainSek: number; paidOff: number; n: number; meanBooked: number; meanBillsWithout: number; meanBillsWith: number; meanWalkedWithout: number; meanWalkedWith: number; meanRepWithout: number; meanRepWith: number; meanUnhappyWithout: number; meanUnhappyWith: number }>> = {};
    for (const name of Object.keys(ACTIVITIES)) {
      summary[name] = {};
      for (const wd of WEEK.weekdays.filter((x) => x !== WEEK.closedDay)) {
        const r = rows.filter((x) => x.activity === name && x.weekday === wd);
        if (r.length === 0) continue;
        const mean = (f: (x: (typeof r)[number]) => number) => Math.round((r.reduce((a, x) => a + f(x), 0) / r.length) * 10) / 10;
        summary[name][wd] = {
          meanGainSek: mean((x) => x.gainSek),
          paidOff: r.filter((x) => x.gainSek > 0).length,
          n: r.length,
          meanBooked: mean((x) => x.without.booked),
          meanBillsWithout: mean((x) => x.without.bills),
          meanBillsWith: mean((x) => x.with.bills),
          meanWalkedWithout: mean((x) => x.without.walked),
          meanWalkedWith: mean((x) => x.with.walked),
          meanRepWithout: Math.round(r.reduce((a, x) => a + x.without.reputationDelta, 0) / r.length * 1000) / 1000,
          meanRepWith: Math.round(r.reduce((a, x) => a + x.with.reputationDelta, 0) / r.length * 1000) / 1000,
          meanUnhappyWithout: Math.round(r.reduce((a, x) => a + x.without.unhappy, 0) / r.length * 1000) / 1000,
          meanUnhappyWith: Math.round(r.reduce((a, x) => a + x.with.unhappy, 0) / r.length * 1000) / 1000
        };
      }
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'satsningar-2026-10-01');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, `${process.env.SATS_LABEL ?? 'idag'}.json`), JSON.stringify({
        variant,
        definition: 'Parad mätning: varje kväll i vecka 2 från samma morgon utan och med satsningen. gainSek = resultSek med − utan (day.transfer.resultSek, priset ingår). paidOff = kvällar där satsningen gav mer än den kostade. Vinbaren, brons i tre, bästa svaret, baspaketet efter bokningen.',
        seeds,
        summary,
        rows
      }, null, 2) + '\n');
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 900000);

  // Veckan med satsningarna använda klokt (Vision Owner: "en DJ när det är
  // fullt en fredag eller lördag, en springare när bokningen är stor"):
  // DJ:n fredag och lördag, springaren när morgonens bokning (bookingFor,
  // samma som bokningsboken) är minst SATS_RUNNER_BOOKING gäster.
  it('veckan: utan satsningar, klokt och varje kväll', async () => {
    const variant = JSON.parse(process.env.SATS_VARIANT ?? '{}');
    Object.assign(EVENING_ECONOMY as unknown as Record<string, unknown>, variant);
    const seeds = Array.from({ length: Number(process.env.SATS_SEEDS ?? 4) }, (_, i) => i + 1);
    const bigBooking = Number(process.env.SATS_RUNNER_BOOKING ?? 45);
    const plans: Record<string, (s: SimulationState) => MorningPlan> = {
      utan: () => ({}),
      klokt: (s) => {
        const wd = calendarFor(s.day.dayNumber).weekday;
        const a: string[] = [];
        if (wd === 'fri' || wd === 'sat') a.push('book-dj');
        if (bookingFor(s).total >= bigBooking) a.push('runner-shift');
        return { activities: a, actions: djWine(a) };
      },
      varjeKvall: () => ({ activities: ['book-dj', 'runner-shift'], actions: djWine(['book-dj']) })
    };
    const result: Record<string, unknown> = {};
    for (const [name, plan] of Object.entries(plans)) {
      const weeks = seeds.map((seed) => {
        let s = makeNewGameState(seed);
        s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
        const cash0 = s.cash;
        const evenings: number[] = [];
        let weekendBills = 0;
        let repSat = 0;
        for (let d = 0; d < WEEK.daysPerWeek; d++) {
          const wd = calendarFor(s.day.dayNumber).weekday;
          if (wd === WEEK.closedDay) { s = playDay(s, {}).state; continue; }
          const ev = evening(s, plan(s).activities ?? []);
          evenings.push(ev.resultSek);
          if (wd === 'fri' || wd === 'sat') weekendBills += ev.bills;
          s = playDay(s, plan(s)).state;
          if (wd === 'sat') repSat = s.reputation;
        }
        const st = s.economy.lastSettlement;
        return { seed, weekResultSek: Math.round(s.cash - cash0 - (st?.topUpSek ?? 0) + (st?.amortisationSek ?? 0)), eveningsSek: evenings.reduce((a, b) => a + b, 0), weekendBills, reputationSaturday: Math.round(repSat * 1000) / 1000 };
      });
      const mean = (f: (w: (typeof weeks)[number]) => number) => Math.round(weeks.reduce((a, w) => a + f(w), 0) / weeks.length * 100) / 100;
      result[name] = { meanWeekResultSek: mean((w) => w.weekResultSek), meanEveningsSek: mean((w) => w.eveningsSek), meanWeekendBills: mean((w) => w.weekendBills), meanReputationSaturday: mean((w) => w.reputationSaturday), weeksWithLoss: weeks.filter((w) => w.weekResultSek < 0).length, weeks };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'satsningar-2026-10-01');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, `vecka-${process.env.SATS_LABEL ?? 'idag'}.json`), JSON.stringify({
        variant,
        definition: 'Vecka 2, vinbaren, brons i tre, bästa svaret, baspaketet efter bokningen. utan = inga satsningar; klokt = DJ fredag och lördag, springaren när bokningen (bookingFor) är minst bigBooking; varjeKvall = båda varje kväll. weekResultSek = kassans förändring måndag till måndag utan golvets påfyllnad, med amorteringen återlagd. weekendBills = notorna fredag och lördag. Kvällens resultat räknas i en parad gren från samma morgon (samma som evening()).',
        seeds, bigBooking, plans: result
      }, null, 2) + '\n');
    }
    expect(Object.keys(result).length).toBe(3);
  }, 1800000);
});
