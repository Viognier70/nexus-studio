// ORDER 296b — varför kostar hälften rätt lika mycket som allt fel?
// (Vision Owner 2026-10-02: "Ta först reda på varför hälften rätt kostar lika
// mycket som allt fel, och rapportera orsaken.")
//
// Varje kväll delas upp: intäkten och notorna, ankomsterna, raketerna (antal,
// klarade, kassa och rykte ur raketernas logg), ryktet morgon och kväll med
// rykteskanalerna (metrics.reputationBreakdown), slutsålt, de som gick, och
// kvällens resultat (day.transfer.resultSek). Samma morgon (baspaketet) för
// alla spelare; bara svaren skiljer.
//
//   DIAG_SEEDS=10 WRITE_REPORTS=1 REPORT_ORDER=order296b npx vitest run src/strategic/testHarness/__tests__/order296bDiagnos.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil, type ScenarioAnswer } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { PLAYERS } from '../randomness';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import type { SimulationState } from '../../types';
import { incidentById } from '../../../sim/incidentBank';

const ANSWERS: Record<string, ScenarioAnswer> = { mentorn: 'best', halvaSteg: 'half', halvaRaketer: 'halfRocket', allaFel: 'worst' };

interface Evening {
  seed: number; week: number; wd: string;
  revenue: number; bills: number; arrivals: number; result: number;
  rockets: number; cleared: number; rocketCash: number; rocketRep: number; rocketGuestsIn: number; steps: number; wrongSteps: number;
  rep0: number; rep1: number; br: Record<string, number>;
  soldOut: number; walked: number; turnedAway: number;
  readyOpen: Record<string, number>; readyEnd: Record<string, number>;
}

function season(seed: number, answer: ScenarioAnswer, weeks: number): Evening[] {
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, cash: 1_000_000, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
  const out: Evening[] = [];
  for (let d = 0; d < weeks * 7; d++) {
    const day = s.day.dayNumber;
    const cal = calendarFor(day);
    s = playMorning(s, { scenarioAnswer: answer });
    mountRoomLikeScene(s.businessClass);
    const rep0 = s.reputation;
    const logBefore = s.incidents?.log.length ?? 0;
    const opened = reducer(s, { type: 'START_SERVICE' });
    if (opened !== s) {
      let readyOpen: Record<string, number> | null = null;
      s = tickUntil(opened, (x) => {
        if (!readyOpen && x.day.doorsOpenedThisService) readyOpen = { ...(x.day.prepReadiness ?? {}) };
        return x.day.period === 'evening' || x.day.period === 'morning';
      }, answer);
      const log = (s.incidents?.log ?? []).slice(logBefore);
      out.push({
        seed, week: cal.week, wd: cal.weekday,
        revenue: s.day.transfer?.revenueSek ?? 0,
        bills: s.day.billsTonight ?? 0,
        arrivals: s.day.arrivalsToday ?? 0,
        result: s.day.transfer?.resultSek ?? 0,
        rockets: log.length,
        cleared: log.filter((r) => r.quality === 'best').length,
        rocketCash: Math.round(log.reduce((a, r) => a + (r.deltas?.cashSek ?? 0), 0)),
        rocketGuestsIn: log.reduce((a, r) => a + (r.deltas?.guestsIn ?? 0), 0),
        // Besvarade steg: klarade raketer alla sina steg, felen fram till felet.
        steps: log.reduce((a, r) => a + (r.quality === 'best' ? (incidentById(s.economy.businessClass, r.id)?.steps.length ?? 1) : (r.step ?? 0) + 1), 0),
        wrongSteps: log.filter((r) => r.quality !== 'best').length,
        rocketRep: +log.reduce((a, r) => a + (r.deltas?.reputation ?? 0), 0).toFixed(3),
        rep0: +rep0.toFixed(3), rep1: +s.reputation.toFixed(3),
        br: Object.fromEntries(Object.entries(s.metrics.reputationBreakdown ?? {}).map(([k, v]) => [k, +(+v).toFixed(3)])),
        soldOut: s.day.soldOutGuests ?? 0,
        walked: s.day.walkedCount ?? 0,
        turnedAway: s.day.turnedAwayFull ?? 0,
        readyOpen: readyOpen ?? {},
        readyEnd: { ...(s.day.prepReadiness ?? {}) }
      });
    } else {
      s = reducer(s, { type: 'CLOSE_DAY' });
    }
    if (s.day.period === 'evening') s = reducer(s, { type: 'END_EVENING' });
    s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
  }
  return out;
}

describe.skipIf(!process.env.DIAG_SEEDS)('ORDER 296b — felens kostnad', () => {
  it('kvällarna uppdelade per spelare', async () => {
    const seeds = Array.from({ length: Number(process.env.DIAG_SEEDS ?? 4) }, (_, i) => i + 1);
    const weeks = Number(process.env.DIAG_WEEKS ?? 3);
    const result: Record<string, unknown> = {};
    for (const [name, answer] of Object.entries(ANSWERS)) {
      const ev = seeds.flatMap((seed) => season(seed, answer, weeks));
      const mean = (f: (e: Evening) => number) => +(ev.reduce((a, e) => a + f(e), 0) / Math.max(1, ev.length)).toFixed(3);
      const chan = Object.keys(ev[0]?.br ?? {});
      result[name] = {
        evenings: ev.length,
        mean: {
          revenue: mean((e) => e.revenue), bills: mean((e) => e.bills), arrivals: mean((e) => e.arrivals), result: mean((e) => e.result),
          rockets: mean((e) => e.rockets), cleared: mean((e) => e.cleared), rocketCash: mean((e) => e.rocketCash), rocketGuestsIn: mean((e) => e.rocketGuestsIn), stepsRightShare: +(ev.reduce((a, e) => a + e.steps - e.wrongSteps, 0) / Math.max(1, ev.reduce((a, e) => a + e.steps, 0))).toFixed(3), rocketRep: mean((e) => e.rocketRep),
          repChange: mean((e) => e.rep1 - e.rep0), soldOut: mean((e) => e.soldOut), turnedAway: mean((e) => e.turnedAway), walked: mean((e) => e.walked),
          readyOpen: Object.fromEntries(Object.keys(ev[0]?.readyOpen ?? {}).map((k) => [k, mean((e) => e.readyOpen[k] ?? 0)])),
          readyEnd: Object.fromEntries(Object.keys(ev[0]?.readyEnd ?? {}).map((k) => [k, mean((e) => e.readyEnd[k] ?? 0)])),
          channels: Object.fromEntries(chan.map((k) => [k, mean((e) => e.br[k] ?? 0)]))
        },
        repByDay: Array.from({ length: weeks * 6 }, (_, i) => {
          const xs = seeds.map((seed) => ev.filter((e) => e.seed === seed)[i]?.rep0).filter((x): x is number => x !== undefined);
          return +(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(3);
        }),
        evenings_: ev
      };
    }
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296b');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.DIAG_OUT ?? 'diagnos.json'), JSON.stringify({ definition: 'Kvällarna vecka 1–DIAG_WEEKS, baspaketet varje morgon, svaren enligt ANSWERS. rocketCash/rocketRep ur incidents.log deltas; channels ur metrics.reputationBreakdown; repByDay = ryktet på morgonen per servicedag.', seeds, weeks, players: result }, null, 2) + '\n');
    }
    expect(Object.keys(result).length).toBe(4);
  }, 3600000);
});
