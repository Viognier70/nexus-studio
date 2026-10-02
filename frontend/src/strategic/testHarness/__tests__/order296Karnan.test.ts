// ORDER 296 — kärnan (Vision Owner 2026-10-02): "Föreslå talen (startkapital,
// veckomål, mise en place-tid) och kör harness: en rimlig spelare ska klara
// säsongen, en slarvig ska riskera att stänga. Rapportera innan du bygger."
//
// Inget i spelet ändras. Säsongen (åtta veckor) spelas med dagens regler från
// vecka 1, vinbaren, brons i tre, med startkassan KARNAN_START (förslaget
// 25 000 kr; lånet finansierar lokalen som i dag). Varje veckoavräkning och
// varje morgon sparas, och förslagen prövas på samma data:
//   - veckomålet: veckans resultat (kassans förändring vecka till vecka, med
//     hyran, lönerna, räntan och amorteringen, utan golvets påfyllnad) mot
//     kandidaterna i TARGETS;
//   - stängningen: tre veckor i rad under golvet, två läsningar (intäkten
//     under golvet, eller kassan under noll vid avräkningen);
//   - mise en place: förberedelsen (portioner i lagret och bokade gäster) mot
//     vad personalen hinner före öppning, med kandidaterna i MISE.
//
// Spelarna: se PLANS.
//
//   WRITE_REPORTS=1 KARNAN_SEEDS=20 [KARNAN_START=25000] npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { playDay, playMorning, type MorningPlan } from '../weekHarness';
import { weakMorning } from '../scenarios';
import { PLAYERS } from '../randomness';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { floorSek } from '../../../sim/economy';
import { coverage } from '../../simulation/morningBuy';
import { bookingFor } from '../../simulation/guestTypes';
import type { SimulationState } from '../../types';

type PlayerId = 'mentorn' | 'rimlig' | 'halva' | 'halvbra' | 'slarvig';
// Den rimliga köper baspaketet bara när lagret inte räcker till bokningen
// (fyller på); den halvbra köper det varje morgon och svarar sämst; den
// slarviga köper för lite och svarar sämst (scenarios.ts weakMorning).
const TOP_UP_SHARE = 1.1;
const PLANS: Record<PlayerId, (s: SimulationState) => MorningPlan> = {
  rimlig: (s) => ({ stock: coverage(s).covers >= bookingFor(s).total * TOP_UP_SHARE ? 'none' : 'base' }),
  // Mentorn: baspaketet varje morgon och bästa svaret (som ORDER 291).
  mentorn: () => ({}),
  // Baspaketet varje morgon, rätt på hälften av raketerna (ORDER 296b:
  // varannan raket rätt hela vägen; 'half' växlade per steg och klarade
  // nästan ingen raket).
  halva: () => ({ scenarioAnswer: 'halfRocket' }),
  halvbra: () => ({ scenarioAnswer: 'worst' }),
  slarvig: () => weakMorning()
};

interface Week { week: number; opSek: number; amortisationSek: number; rentSek: number; wagesSek: number; revenueSek: number; floorSek: number; topUpSek: number; belowFloor: boolean }
interface Morning { week: number; weekday: string; bought: number; covers: number; booked: number; staff: number; rep: number }

// Kassan är så stor att dagens nedgradering aldrig slår till; veckornas
// flöden är oberoende av kassans nivå (harnessens inköp prövar inte kassan),
// och förslagen räknas på flödena nedan.
const BIG_CASH = 1_000_000;

function season(seed: number, player: PlayerId, weeks: number) {
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, cash: BIG_CASH, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
  const out: Week[] = [];
  const mornings: Morning[] = [];
  let weekStartCash = s.cash;
  let lastWeek = -1;
  for (let d = 0; d < weeks * 7; d++) {
    const cal = calendarFor(s.day.dayNumber);
    const plan = PLANS[player](s);
    if (cal.isServiceDay && s.economy.businessClass) {
      // Morgonen som spelaren skulle se den: efter inköpen, före öppning.
      const before = coverage(s).covers;
      const m = playMorning(s, plan);
      const after = coverage(m).covers;
      mornings.push({ week: cal.week, weekday: cal.weekday, bought: Math.max(0, after - before), covers: after, booked: bookingFor(m).total, staff: m.team.members.length, rep: s.reputation });
    }
    s = playDay(s, plan).state;
    const st = s.economy.lastSettlement;
    if (st && st.week !== lastWeek) {
      lastWeek = st.week;
      // Veckans resultat före amorteringen och utan golvets påfyllnad: det
      // spelaren själv tjänade efter hyra, löner, ränta och inköp.
      out.push({
        week: st.week,
        opSek: Math.round(s.cash - weekStartCash - st.topUpSek + st.amortisationSek),
        amortisationSek: st.amortisationSek,
        rentSek: st.rentSek ?? 0,
        wagesSek: st.wagesSek ?? 0,
        revenueSek: st.revenueSek,
        floorSek: st.floorSek,
        topUpSek: st.topUpSek,
        belowFloor: st.revenueSek < st.floorSek
      });
      weekStartCash = s.cash;
    }
  }
  return { weeks: out, mornings };
}

// Förslagen, räknade på veckornas flöden.
const STARTS = [25000];
// Amorteringen: lånet (startLoanSek) över 8 veckor (i dag), 16 veckor
// (halva under säsongen) eller ingen under säsongen (bara räntan).
const AMORT_WEEKS = [0];
// Veckomålet: veckans resultat före amorteringen (kr).
const TARGETS = [0];
// Mise en place: minuter per inköpt portion och per bokad gäst; vad en
// anställd hinner före öppning (spelminuter).
const MISE = [
  { perCover: 1, perGuest: 0.5, minutesPerStaff: 20 },
  { perCover: 1.5, perGuest: 0.5, minutesPerStaff: 25 },
  { perCover: 1, perGuest: 1, minutesPerStaff: 25 }
];

function streak(xs: boolean[]): number { let best = 0; let cur = 0; for (const x of xs) { cur = x ? cur + 1 : 0; best = Math.max(best, cur); } return best; }

// Kassan vecka för vecka med startkassan och amorteringen; stängningen = tre
// avräkningar i rad med kassan under noll (golvet), omförhandlingen = två
// missade veckomål i rad.
function walk(ws: Week[], start: number, amortWeeks: number, target: number) {
  const perWeek = ws[0] ? (ws[0].amortisationSek * 8) / Math.max(1, amortWeeks) : 0;
  let cash = start;
  const cashes: number[] = [];
  for (const w of ws) { cash += w.opSek - (amortWeeks > 0 ? perWeek : 0); cashes.push(cash); }
  const below = cashes.map((c) => c < 0);
  const closedAt = (() => { let cur = 0; for (let i = 0; i < below.length; i++) { cur = below[i] ? cur + 1 : 0; if (cur >= 3) return i + 1; } return null; })();
  const missed = ws.map((w) => w.opSek < target);
  return { cashes: cashes.map(Math.round), lowest: Math.round(Math.min(...cashes)), closedAt, renegotiated: streak(missed) >= 2, missedShare: missed.filter(Boolean).length / Math.max(1, missed.length) };
}

describe.skipIf(!process.env.KARNAN_SEEDS)('ORDER 296 — kärnans tal', () => {
  it('säsongen för tre spelare med förslagets startkassa', async () => {
    const seeds = Array.from({ length: Number(process.env.KARNAN_SEEDS ?? 4) }, (_, i) => i + 1);
    const weeks = Number(process.env.KARNAN_WEEKS ?? 8);
    // Prövning av tal i minnet: KARNAN_VARIANT='{"INCIDENTS":{"wrongCashShare":1}}'.
    const balance = await import('../../../sim/balance');
    for (const [k, v] of Object.entries(JSON.parse(process.env.KARNAN_VARIANT ?? '{}') as Record<string, Record<string, unknown>>)) Object.assign((balance as unknown as Record<string, Record<string, unknown>>)[k], v);
    const players: PlayerId[] = ['mentorn', 'rimlig', 'halva', 'halvbra', 'slarvig'];
    const result: Record<string, unknown> = {};
    for (const p of players) {
      const runs = seeds.map((seed) => ({ seed, ...season(seed, p, weeks) }));
      const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
      const byWeek = Array.from({ length: weeks }, (_, i) => {
        const ws = runs.map((r) => r.weeks[i]).filter(Boolean);
        return { week: i + 1, meanOpSek: mean(ws.map((w) => w.opSek)), worstOpSek: Math.min(...ws.map((w) => w.opSek)), meanRevenueSek: mean(ws.map((w) => w.revenueSek)), rentSek: ws[0]?.rentSek, meanWagesSek: mean(ws.map((w) => w.wagesSek)), amortisationSek: ws[0]?.amortisationSek, belowFloor: ws.filter((w) => w.belowFloor).length };
      });
      const proposals: Record<string, unknown> = {};
      for (const start of STARTS) for (const aw of AMORT_WEEKS) for (const T of TARGETS) {
        const ws = runs.map((r) => walk(r.weeks, start, aw, T));
        proposals[`start${start}-amort${aw}-target${T}`] = { closed: ws.filter((w) => w.closedAt !== null).length, meanClosedWeek: mean(ws.filter((w) => w.closedAt !== null).map((w) => w.closedAt as number)), renegotiated: ws.filter((w) => w.renegotiated).length, missedShare: Math.round(mean(ws.map((w) => w.missedShare * 100))) / 100, lowestCash: Math.min(...ws.map((w) => w.lowest)), meanCashEnd: mean(ws.map((w) => w.cashes[w.cashes.length - 1])) };
      }
      const allMornings = runs.flatMap((r) => r.mornings);
      const mise = MISE.map((m) => {
        const rows = allMornings.map((x) => ({ wd: x.weekday, need: x.bought * m.perCover + x.booked * m.perGuest, cap: x.staff * m.minutesPerStaff }));
        const byDay: Record<string, { meanNeed: number; meanCap: number; overShare: number; meanOver: number }> = {};
        for (const wd of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
          const r = rows.filter((x) => x.wd === wd);
          if (r.length === 0) continue;
          byDay[wd] = { meanNeed: mean(r.map((x) => x.need)), meanCap: mean(r.map((x) => x.cap)), overShare: Math.round((r.filter((x) => x.need > x.cap).length / r.length) * 100) / 100, meanOver: mean(r.map((x) => Math.max(0, x.need - x.cap))) };
        }
        return { ...m, byDay };
      });
      const mornings = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((wd) => {
        const r = allMornings.filter((x) => x.weekday === wd);
        return [wd, { bought: mean(r.map((x) => x.bought)), covers: mean(r.map((x) => x.covers)), booked: mean(r.map((x) => x.booked)), staff: mean(r.map((x) => x.staff)) }];
      }));
      // Ryktet på morgonen per veckodag (Vision Owner: "ryktet ska hålla över
      // veckan för en rimlig spelare"): måndag mot lördag, v1–v8.
      const repByWeekday = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((wd) => [wd, +(allMornings.filter((x) => x.weekday === wd).reduce((a, x) => a + x.rep, 0) / Math.max(1, allMornings.filter((x) => x.weekday === wd).length)).toFixed(3)]));
      const repByWeek = Array.from({ length: weeks }, (_, i) => {
        const ms = allMornings.filter((x) => x.week === i + 1);
        const at = (wd: string) => +(ms.filter((x) => x.weekday === wd).reduce((a, x) => a + x.rep, 0) / Math.max(1, ms.filter((x) => x.weekday === wd).length)).toFixed(3);
        return { week: i + 1, mon: at('mon'), sat: at('sat') };
      });
      result[p] = { repByWeekday, repByWeek, byWeek, proposals, mise, mornings, floor: floorSek('vinbar', PLAYERS.baseline), runs };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.KARNAN_OUT ?? 'karnan.json'), JSON.stringify({ definition: 'Säsongen med dagens regler och stor kassa (ingen nedgradering). opSek = veckans resultat före amorteringen och utan golvets påfyllnad. Förslagen räknas på flödena: kassan = startkassan + opSek − amorteringen; stängning = kassan under noll tre avräkningar i rad; omförhandling = veckomålet missat två veckor i rad. Mise en place = inköpta portioner × perCover + bokade × perGuest mot personal × minutesPerStaff (spelminuter).', seeds, weeks, players: result }, null, 2) + '\n');
    }
    expect(Object.keys(result).length).toBe(5);
  }, 3600000);
});
