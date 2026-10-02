// ORDER 296 — kärnan (Vision Owner 2026-10-02): "Föreslå talen (startkapital,
// veckomål, mise en place-tid) och kör harness: en rimlig spelare ska klara
// säsongen, en slarvig ska riskera att stänga." ORDER 296b: "Kör harness med
// fem spelare … och rapportera innan talen låses."
//
// Säsongen (åtta veckor) spelas med spelets egna regler från vecka 1:
// vinbaren, brons i tre, startkassan ur balance.ts RISK (KARNAN_START skriver
// över den), veckomålet, omförhandlingen och stängningen som simuleringen
// räknar dem (sim/economy.ts settleWeek, economy.risk). Ingenting räknas vid
// sidan av spelet: kassan styr också det ekonomiska kapitalet, som får gäster
// att vända vid dörren (cashReading.ts economicReadingNormalised).
//
// Spelarna: se PLANS. Morgnarna sparas för mise en place (sim/miseEnPlace.ts,
// samma plan som morgonens skärm) och ryktet.
//
//   WRITE_REPORTS=1 KARNAN_SEEDS=20 [KARNAN_START=25000] [KARNAN_VARIANT='{"RISK":{...}}'] npx vitest run src/strategic/testHarness/__tests__/order296Karnan.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { playDay, playMorning, type MorningPlan } from '../weekHarness';
import { weakMorning } from '../scenarios';
import { PLAYERS } from '../randomness';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { coverage } from '../../simulation/morningBuy';
import { bookingFor } from '../../simulation/guestTypes';
import type { SimulationState } from '../../types';
import { misePlan } from '../../../sim/miseEnPlace';

type PlayerId = 'mentorn' | 'rimlig' | 'halva' | 'halvbra' | 'slarvig';
// Den rimliga köper baspaketet bara när lagret inte räcker till bokningen
// (fyller på); mentorn köper det varje morgon och svarar bäst; den halva
// svarar rätt på varannan raket hela vägen; den halvbra svarar alltid fel;
// den slarviga köper för lite och svarar fel (scenarios.ts weakMorning).
const TOP_UP_SHARE = 1.1;
// Den extra handen (kärnan punkt 5): de som planerar tar in den när
// förberedelsen inte hinns (sim/miseEnPlace.ts misePlan, samma som morgonens
// skärm visar); den slarviga gör det aldrig.
const hand = (s: SimulationState) => (misePlan(s).backlogMin > 0 ? [{ type: 'HIRE_PREP_HAND' as const }] : []);
const PLANS: Record<PlayerId, (s: SimulationState) => MorningPlan> = {
  mentorn: () => ({ actions: hand }),
  rimlig: (s) => ({ stock: coverage(s).covers >= bookingFor(s).total * TOP_UP_SHARE ? 'none' : 'base', actions: hand }),
  // ORDER 296b: varannan raket rätt hela vägen ('half' växlade per steg och
  // klarade nästan ingen raket).
  halva: () => ({ scenarioAnswer: 'halfRocket', actions: hand }),
  halvbra: () => ({ scenarioAnswer: 'worst', actions: hand }),
  slarvig: () => weakMorning()
};

interface Week { week: number; credits: number; resultSek: number; revenueSek: number; rentSek: number; wagesSek: number; cashEnd: number; targetSek: number; targetHit: boolean; renegotiatedNow: boolean; closedNow: boolean }
interface Morning { week: number; weekday: string; needMin: number; capacityMin: number; backlogMin: number; hand: boolean; booked: number; rep: number }

function season(seed: number, player: PlayerId, weeks: number, start: number | null) {
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, ...(start !== null ? { cash: start } : {}), medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
  const startCash = s.cash;
  const out: Week[] = [];
  const mornings: Morning[] = [];
  let weekStartCash = s.cash;
  let lastWeek = -1;
  for (let d = 0; d < weeks * 7; d++) {
    const cal = calendarFor(s.day.dayNumber);
    const plan = PLANS[player](s);
    if (cal.isServiceDay && s.economy.businessClass) {
      const m = playMorning(s, plan);
      const mp = misePlan(m);
      mornings.push({ week: cal.week, weekday: cal.weekday, needMin: mp.needMin, capacityMin: mp.capacityMin, backlogMin: mp.backlogMin, hand: mp.extraHand, booked: mp.booked, rep: s.reputation });
    }
    s = playDay(s, plan).state;
    const st = s.economy.lastSettlement;
    if (st && st.week !== lastWeek) {
      lastWeek = st.week;
      out.push({
        week: st.week,
        credits: s.knowledgeCredits.episteme + s.knowledgeCredits.techne + s.knowledgeCredits.phronesis,
        resultSek: Math.round(s.cash - weekStartCash),
        revenueSek: st.revenueSek,
        rentSek: st.rentSek ?? 0,
        wagesSek: st.wagesSek ?? 0,
        cashEnd: Math.round(s.cash),
        targetSek: st.targetSek ?? 0,
        targetHit: !!st.targetHit,
        renegotiatedNow: !!st.renegotiatedNow,
        closedNow: !!st.closedNow
      });
      weekStartCash = s.cash;
      if (st.closedNow) break;
    }
  }
  return { startCash, weeks: out, mornings, closedWeek: s.economy.risk?.closedWeek ?? null, renegotiated: !!s.economy.risk?.renegotiated };
}

describe.skipIf(!process.env.KARNAN_SEEDS)('ORDER 296 — kärnans tal', () => {
  it('säsongen för fem spelare med spelets regler', async () => {
    const seeds = Array.from({ length: Number(process.env.KARNAN_SEEDS ?? 4) }, (_, i) => i + 1);
    const start = process.env.KARNAN_START ? Number(process.env.KARNAN_START) : null;
    const weeks = Number(process.env.KARNAN_WEEKS ?? 8);
    // Prövning av tal i minnet: KARNAN_VARIANT='{"INCIDENTS":{"wrongCashShare":1}}'.
    const balance = await import('../../../sim/balance');
    for (const [k, v] of Object.entries(JSON.parse(process.env.KARNAN_VARIANT ?? '{}') as Record<string, Record<string, unknown>>)) Object.assign((balance as unknown as Record<string, Record<string, unknown>>)[k], v);
    const players: PlayerId[] = ['mentorn', 'rimlig', 'halva', 'halvbra', 'slarvig'];
    const result: Record<string, unknown> = {};
    for (const p of players) {
      const runs = seeds.map((seed) => ({ seed, ...season(seed, p, weeks, start) }));
      const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
      const byWeek = Array.from({ length: weeks }, (_, i) => {
        const ws = runs.map((r) => r.weeks[i]).filter(Boolean);
        return { week: i + 1, n: ws.length, meanResultSek: mean(ws.map((w) => w.resultSek)), meanRevenueSek: mean(ws.map((w) => w.revenueSek)), meanCashEnd: mean(ws.map((w) => w.cashEnd)), meanCredits: mean(ws.map((w) => w.credits)), targetHit: ws.filter((w) => w.targetHit).length, rentSek: ws[0]?.rentSek ?? 0 };
      });
      const allMornings = runs.flatMap((r) => r.mornings);
      const repByWeek = Array.from({ length: weeks }, (_, i) => {
        const ms = allMornings.filter((x) => x.week === i + 1);
        const at = (wd: string) => +(ms.filter((x) => x.weekday === wd).reduce((a, x) => a + x.rep, 0) / Math.max(1, ms.filter((x) => x.weekday === wd).length)).toFixed(3);
        return { week: i + 1, mon: at('mon'), sat: at('sat') };
      });
      // Mise en place per veckodag, ur spelets plan (sim/miseEnPlace.ts).
      const mise = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((wd) => {
        const r = allMornings.filter((x) => x.weekday === wd);
        return [wd, { meanNeedMin: mean(r.map((x) => x.needMin)), meanCapacityMin: mean(r.map((x) => x.capacityMin)), handShare: Math.round((r.filter((x) => x.hand).length / Math.max(1, r.length)) * 100) / 100, meanBacklogMin: mean(r.map((x) => x.backlogMin)) }];
      }));
      result[p] = {
        closed: runs.filter((r) => r.closedWeek !== null).length,
        closedWeeks: runs.map((r) => r.closedWeek).filter((w): w is number => w !== null),
        renegotiated: runs.filter((r) => r.renegotiated).length,
        lowestCash: Math.min(...runs.flatMap((r) => r.weeks.map((w) => w.cashEnd))),
        meanCashEnd: mean(runs.map((r) => r.weeks[r.weeks.length - 1]?.cashEnd ?? r.startCash)),
        targetHitShare: Math.round((runs.flatMap((r) => r.weeks).filter((w) => w.targetHit).length / Math.max(1, runs.flatMap((r) => r.weeks).length)) * 100) / 100,
        byWeek, repByWeek, mise, runs
      };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.KARNAN_OUT ?? 'karnan.json'), JSON.stringify({ definition: 'Säsongen med spelets regler (balance.ts RISK): startkassan, veckomålet på intäkten, omförhandlingen och stängningen räknas av simuleringen (sim/economy.ts settleWeek). resultSek = kassans förändring vecka till vecka. Mise en place ur sim/miseEnPlace.ts misePlan (behov, hinns, eftersläp i spelminuter, och den extra handen).', start, variant: process.env.KARNAN_VARIANT ?? null, seeds, weeks, players: result }, null, 2) + '\n');
    }
    expect(Object.keys(result).length).toBe(5);
  }, 3600000);
});
