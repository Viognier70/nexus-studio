// ORDER 303 punkt A (Anders 2026-10-04, provspel: "Trots fel svar gjorde
// krogen vinst och blev bäst i byn") — rapporten före kod. Vinbaren, vecka
// 1–3, mentorns morgon (baspaketet och den extra handen vid behov, som
// order296Karnan.test.ts), spelartypen FOLJD_PLAYER:
//   fel     — alltid fel svar (trappans "halvbra");
//   halva   — varannan raket rätt hela vägen (trappans "halva");
//   skill   — ROCKET_SKILL rätt per steg (0,85 eller 0,5).
// Per kväll, ur samma källor som spelet visar:
//   - kvällskassan (eveningEconomy.ts tillSek, sista ticken under servicen)
//     minus insatsen (day.stake.total, HUD:ens "Insatsen");
//   - ryktet före morgonen, när servicen börjar, efter kvällen och nästa morgon
//     (state.reputation; ryktet följer med till nästa dag);
//   - placeringen i byn som bandet visar nästa morgon (economy.weekEvenings
//     village, CompareScreen.ts rankedVillage);
//   - varje raketsvar: kvalitet och ryktets ändring (incidents.log deltas.reputation);
//   - ryktets uppdelning (metrics.reputationBreakdown, reputation.ts logRepDelta).
//
//   FOLJD=1 FOLJD_PLAYER=fel WRITE_REPORTS=1 REPORT_ORDER=order303 npx vitest run src/strategic/testHarness/__tests__/order303Foljderna.test.ts

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playDay, playMorning, tickUntil, type MorningPlan, type ScenarioAnswer } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { calendarFor, firstDayOfWeek } from '../../../sim/calendar';
import { tillSek } from '../../simulation/eveningEconomy';
import { misePlan } from '../../../sim/miseEnPlace';
import { rankedVillage } from '../../scenario/CompareScreen';
import { PLAYER_VENUE } from '../../../sim/village';
import { PLAYERS } from '../randomness';
import { REPUTATION } from '../../../sim/balance';
import type { SimulationState } from '../../types';

const PLAYER = process.env.FOLJD_PLAYER ?? 'fel';
const ANSWER: ScenarioAnswer = PLAYER === 'fel' ? 'worst' : PLAYER === 'halva' ? 'halfRocket' : 'skill';
const hand = (s: SimulationState) => (misePlan(s).backlogMin > 0 ? [{ type: 'HIRE_PREP_HAND' as const }] : []);
const PLAN: MorningPlan = { actions: hand, scenarioAnswer: ANSWER };
const P = REPUTATION.scale;
const r1 = (x: number) => Math.round(x * P * 10) / 10;

interface EveningRow {
  week: number; weekday: string; seed: number;
  tillSek: number; stakeSek: number; tillMinusStakeSek: number; revenueSek: number;
  repMorning: number; repServiceStart: number; repEvening: number; repNextMorning: number;
  rank: number | null; venues: number; guests: number; gaveUp: number;
  rockets: number; cleared: number;
  answers: { quality: string; step: number | null; rep: number; cashSek: number }[];
  breakdown: Record<string, number> | null;
}

function season(seed: number, weeks: number): EveningRow[] {
  let s = makeNewGameState(seed);
  s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
  const rows: EveningRow[] = [];
  for (let d = 0; d < weeks * 7; d++) {
    const cal = calendarFor(s.day.dayNumber);
    if (!cal.isServiceDay || !s.economy.businessClass) { s = playDay(s, PLAN).state; continue; }
    const day = s.day.dayNumber;
    const repMorning = s.reputation;
    s = playMorning(s, PLAN);
    mountRoomLikeScene(s.businessClass);
    s = reducer(s, { type: 'START_SERVICE' });
    const repServiceStart = s.reputation;
    let till = 0;
    let stake = 0;
    s = tickUntil(s, (x) => {
      if (x.day.period === 'dinner') { till = tillSek(x); stake = x.day.stake?.total ?? stake; }
      return x.day.period === 'evening' || x.day.period === 'morning';
    }, ANSWER);
    const repEvening = s.reputation;
    const breakdown = s.metrics.reputationBreakdown ? Object.fromEntries(Object.entries(s.metrics.reputationBreakdown).map(([k, v]) => [k, r1(v as number)])) : null;
    const log = (s.incidents?.log ?? []).filter((r) => (r.kind ?? 'planned') === 'planned');
    if (s.day.period === 'evening') s = reducer(s, { type: 'END_EVENING' });
    s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
    const rec = [...(s.economy.weekEvenings ?? []), ...(s.economy.lastSettlement?.evenings ?? [])].find((e) => e.dayNumber === day);
    const village = rec?.village ? rankedVillage(rec.village) : [];
    const ours = village.find((v) => v.id === PLAYER_VENUE);
    rows.push({
      week: cal.week, weekday: cal.weekday, seed,
      tillSek: Math.round(till), stakeSek: Math.round(stake), tillMinusStakeSek: Math.round(till - stake), revenueSek: rec?.revenueSek ?? 0,
      repMorning: r1(repMorning), repServiceStart: r1(repServiceStart), repEvening: r1(repEvening), repNextMorning: r1(s.reputation),
      rank: ours && ours.guests > 0 ? village.indexOf(ours) + 1 : null, venues: village.length, guests: rec?.guests ?? 0, gaveUp: rec?.gaveUp ?? 0,
      rockets: rec?.rockets?.fired ?? 0, cleared: rec?.rockets?.cleared ?? 0,
      answers: log.map((r) => ({ quality: r.quality, step: r.step, rep: r1(r.deltas?.reputation ?? 0), cashSek: Math.round(r.deltas?.cashSek ?? 0) })),
      breakdown
    });
    if (s.economy.risk?.closedWeek) break;
  }
  return rows;
}

// Hur ofta ett fel svar skickar gäster ur rummet (fail.room.leave i raketernas data).
function leaveShare(): { outcomes: number; withLeave: number; withLeaveAll: number } {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../content/incidents');
  const meta = JSON.parse(readFileSync(resolve(dir, 'vinbar.meta.json'), 'utf8')) as { incidents: { steps: { fail?: { room?: { leave?: number } }; options: { quality: string; fail?: { room?: { leave?: number } } }[] }[] }[] };
  let outcomes = 0, withLeave = 0, withLeaveAll = 0;
  for (const inc of meta.incidents) for (const st of inc.steps) for (const o of st.options) {
    if (o.quality === 'best') continue;
    const f = o.fail ?? st.fail;
    outcomes++;
    const leave = f?.room?.leave ?? 0;
    if (leave > 0) withLeave++;
    if (leave >= 1) withLeaveAll++;
  }
  return { outcomes, withLeave, withLeaveAll };
}

describe.skipIf(!process.env.FOLJD)('ORDER 303 A — följderna i dag', () => {
  it('kvällarna vecka 1–3 för en spelartyp', async () => {
    const seeds = (process.env.FOLJD_SEEDS ?? '1,2,3,4').split(',').map(Number);
    const weeks = Number(process.env.FOLJD_WEEKS ?? 3);
    const rows = seeds.flatMap((seed) => season(seed, weeks));
    const byWeek = [1, 2, 3].map((w) => {
      const r = rows.filter((x) => x.week === w);
      const n = Math.max(1, r.length);
      return {
        week: w, evenings: r.length,
        meanTillMinusStakeSek: Math.round(r.reduce((a, x) => a + x.tillMinusStakeSek, 0) / n),
        eveningsWithLoss: r.filter((x) => x.tillMinusStakeSek < 0).length,
        meanRepChangeEvening: +(r.reduce((a, x) => a + (x.repEvening - x.repServiceStart), 0) / n).toFixed(1),
        meanRepChangeOvernight: +(r.reduce((a, x) => a + (x.repNextMorning - x.repEvening), 0) / n).toFixed(1),
        rankFirst: r.filter((x) => x.rank === 1).length,
        meanRank: +(r.filter((x) => x.rank !== null).reduce((a, x) => a + (x.rank ?? 0), 0) / Math.max(1, r.filter((x) => x.rank !== null).length)).toFixed(1)
      };
    });
    const answers = rows.flatMap((r) => r.answers);
    const perAnswer = (q: string) => { const a = answers.filter((x) => x.quality === q); return { n: a.length, meanRep: +(a.reduce((s, x) => s + x.rep, 0) / Math.max(1, a.length)).toFixed(2), meanCashSek: Math.round(a.reduce((s, x) => s + x.cashSek, 0) / Math.max(1, a.length)) }; };
    const summary = { player: PLAYER, skill: PLAYER === 'skill' ? Number(process.env.ROCKET_SKILL ?? 0.75) : null, seeds, byWeek, answers: { best: perAnswer('best'), wrong: perAnswer('wrong'), staff: perAnswer('staff') }, wrongDataLeave: leaveShare() };
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order303');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.FOLJD_OUT ?? `kvallar-${PLAYER}${PLAYER === 'skill' ? '-' + (process.env.ROCKET_SKILL ?? '0.75') : ''}.json`), JSON.stringify({ definition: 'Vinbaren vecka 1–3, mentorns morgon (baspaketet, extra hand vid behov), brons i tre (PLAYERS.baseline). tillMinusStakeSek = kvällskassan (tillSek, sista ticken under servicen) minus insatsen (day.stake.total). rep* på skalan 0–100: före morgonen, när servicen börjar, efter kvällen och nästa morgon. rank = placeringen i byn efter gäster (economy.weekEvenings village, rankedVillage), som bandet visar nästa morgon. answers = kvällens raketsvar (incidents.log, planerade): kvalitet, steg där det föll, ryktets ändring (deltas.reputation, 0–100) och kassan. breakdown = metrics.reputationBreakdown (0–100). wrongDataLeave = fel svar i vinbar.meta.json vars följd skickar gäster ur rummet (fail.room.leave > 0).', summary, rows }, null, 2) + '\n');
    }
    expect(rows.length).toBeGreaterThan(0);
  }, 3600000);
});
