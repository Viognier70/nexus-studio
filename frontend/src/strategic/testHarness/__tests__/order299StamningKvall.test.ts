// ORDER 299 — stämningen en vanlig kväll (Vision Owner 2026-10-03: "Kör
// harness och rapportera hur ofta stämningen stiger och sjunker en vanlig
// kväll"). Vinbaren vecka 2, mentorns morgon, raketerna besvaras med 0,75
// rätt per steg ('skill'). Rummets läge läses som mätaren läser det
// (sim/guestMood.ts roomMoodValue + stableRoomMood) vid varje tick; varje byte
// räknas som stiger eller sjunker, med klockslag och om det låg i ett
// konsekvensögonblick (day.consequence, CONSEQUENCE.durationS).
//
//   STAMNING=1 WRITE_REPORTS=1 REPORT_ORDER=order299 npx vitest run src/strategic/testHarness/__tests__/order299StamningKvall.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { firstDayOfWeek, calendarFor } from '../../../sim/calendar';
import { clockMinutes, formatClock } from '../../../sim/clock';
import { MOODS, meterFill, meterMove, moodSteps, roomMoodValue, stableRoomMood, type MoodId } from '../../../sim/guestMood';
import { CONSEQUENCE } from '../../scene/guestMood';
import { misePlan } from '../../../sim/miseEnPlace';
import { weakMorning } from '../scenarios';
import { GAME_MINUTES_PER_SIM_SECOND, SITTING } from '../../../sim/balance';
const LAST_ORDERS_MINUTE = SITTING.serviceEndHour * 60 - SITTING.lastOrdersMinutes;
import type { MorningPlan, ScenarioAnswer } from '../weekHarness';

// ORDER 299b — spelartyperna: STAMNING_PLAYER=skill (ROCKET_SKILL rätt per steg,
// mentorns morgon), slarvig (scenarios.ts weakMorning: köper för lite och
// svarar fel) eller fel (mentorns morgon, alltid fel svar).
const PLAYER = process.env.STAMNING_PLAYER ?? 'skill';
// fel = mentorns morgon och alltid fel svar (trappans "alltid fel").
const PLAN: MorningPlan = PLAYER === 'slarvig' ? weakMorning() : { actions: (x) => (misePlan(x).backlogMin > 0 ? [{ type: 'HIRE_PREP_HAND' as const }] : []) };
const ANSWER: ScenarioAnswer = PLAYER === 'slarvig' || PLAYER === 'fel' ? 'worst' : 'skill';
// Ett rum som är otåligt eller missnöjt minst så här många spelminuter en kväll räknas.
const RESTLESS_GAME_MINUTES = 15;

function evening(seed: number, offset: number) {
  let s = makeNewGameState(seed);
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) + offset } };
  s = playMorning(s, PLAN);
  mountRoomLikeScene(s.businessClass);
  s = reducer(s, { type: 'START_SERVICE' });
  let mood: MoodId | null = null;
  const changes: { clock: string; minute: number; from: MoodId; to: MoodId; dir: 'up' | 'down'; afterAnswer: boolean }[] = [];
  const time: Record<string, number> = {};
  let answers = 0;
  let lastAnswer = -1;
  // Mätarens fyllning som den visas: flyttas när den gått ett synligt steg (meterMove).
  let shownFill: number | null = null;
  const moves: { clock: string; dir: 'up' | 'down'; from: number; to: number; afterAnswer: boolean }[] = [];
  s = tickUntil(s, (x) => {
    if (x.day.period !== 'dinner' || !x.day.doorsOpenedThisService) return x.day.period === 'evening' || x.day.period === 'morning';
    const c = x.day.consequence;
    if (c && c.at !== lastAnswer) { lastAnswer = c.at; answers++; }
    const next = stableRoomMood(mood, roomMoodValue(x));
    if (next) time[next] = (time[next] ?? 0) + 1;
    if (mood && next && next !== mood) {
      const afterAnswer = !!c && x.simTime - c.at >= 0 && x.simTime - c.at < CONSEQUENCE.durationS;
      changes.push({ clock: formatClock(clockMinutes(x)), minute: clockMinutes(x), from: mood, to: next, dir: moodSteps(next) > moodSteps(mood) ? 'up' : 'down', afterAnswer });
    }
    if (next) mood = next;
    const value = roomMoodValue(x);
    if (value !== null) {
      const fill = meterFill(value);
      if (shownFill === null) shownFill = fill;
      const afterAnswer = !!c && x.simTime - c.at >= 0 && x.simTime - c.at < CONSEQUENCE.durationS;
      const dir = meterMove(shownFill, fill, afterAnswer);
      if (dir) {
        moves.push({ clock: formatClock(clockMinutes(x)), dir, from: +shownFill.toFixed(2), to: +fill.toFixed(2), afterAnswer });
        shownFill = fill;
      }
    }
    return false;
  }, ANSWER);
  const ticks = Object.values(time).reduce((a, b) => a + b, 0);
  const tickGameMinutes = 0.2 * GAME_MINUTES_PER_SIM_SECOND;
  const restlessMinutes = ((time.impatient ?? 0) + (time.displeased ?? 0)) * tickGameMinutes;
  return {
    seed, weekday: calendarFor(s.day.dayNumber).weekday, answers,
    up: changes.filter((c) => c.dir === 'up').length,
    down: changes.filter((c) => c.dir === 'down').length,
    afterAnswer: changes.filter((c) => c.afterAnswer).length,
    // Fram till sista beställningen (SITTING.lastOrdersMinutes före stängning): när
    // rummet töms mot slutet drar de sista gästerna medelvärdet.
    upBeforeLastOrders: changes.filter((c) => c.dir === 'up' && c.minute < LAST_ORDERS_MINUTE).length,
    downBeforeLastOrders: changes.filter((c) => c.dir === 'down' && c.minute < LAST_ORDERS_MINUTE).length,
    restlessMinutes: Math.round(restlessMinutes),
    restless: restlessMinutes >= RESTLESS_GAME_MINUTES,
    meterUp: moves.filter((m) => m.dir === 'up').length,
    meterDown: moves.filter((m) => m.dir === 'down').length,
    meterAfterAnswer: moves.filter((m) => m.afterAnswer).length,
    moves,
    timeShare: Object.fromEntries(MOODS.map((m) => [m, +((time[m] ?? 0) / Math.max(1, ticks)).toFixed(2)])),
    changes
  };
}

describe.skipIf(!process.env.STAMNING)('ORDER 299 — stämningen en vanlig kväll', () => {
  it('räknar hur ofta rummets stämning stiger och sjunker', async () => {
    // ORDER 299b — prövning av värden i minnet: MOOD_VARIANT='{"rocket":{"room":{"right":0.05}}}'.
    const balance = await import('../../../sim/balance');
    const merge = (into: Record<string, unknown>, from: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(from)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) merge(into[k] as Record<string, unknown>, v as Record<string, unknown>);
        else into[k] = v;
      }
    };
    merge(balance.MOOD_BALANCE as unknown as Record<string, unknown>, JSON.parse(process.env.MOOD_VARIANT || '{}'));
    const offsets = (process.env.STAMNING_DAYS ?? '0,2,4').split(',').map(Number);
    const seeds = (process.env.STAMNING_SEEDS ?? '1,2,3').split(',').map(Number);
    const runs = offsets.flatMap((offset) => seeds.map((seed) => evening(seed, offset)));
    const mean = (f: (r: (typeof runs)[number]) => number) => +(runs.reduce((a, r) => a + f(r), 0) / runs.length).toFixed(1);
    const summary = { player: PLAYER, skill: PLAYER === 'skill' ? Number(process.env.ROCKET_SKILL ?? 0.75) : null, restlessEvenings: runs.filter((r) => r.restless).length, upMinusDown: mean((r) => r.up - r.down), meanUpBeforeLastOrders: mean((r) => r.upBeforeLastOrders), meanDownBeforeLastOrders: mean((r) => r.downBeforeLastOrders), evenings: runs.length, meanUp: mean((r) => r.up), meanDown: mean((r) => r.down), meanAfterAnswer: mean((r) => r.afterAnswer), meanAnswers: mean((r) => r.answers), meanMeterUp: mean((r) => r.meterUp), meanMeterDown: mean((r) => r.meterDown), meanMeterAfterAnswer: mean((r) => r.meterAfterAnswer),
      meanTimeShare: Object.fromEntries(MOODS.map((m) => [m, mean((r) => r.timeShare[m] * 100) / 100])) };
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order299');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.STAMNING_OUT ?? 'stamning.json'), JSON.stringify({ variant: process.env.MOOD_VARIANT || null, moodBalance: balance.MOOD_BALANCE, definition: 'Vinbaren vecka 2 (STAMNING_DAYS, förvalt mån, ons, fre), fröna STAMNING_SEEDS (förvalt 1–3). Spelaren: skill = mentorns morgon och ROCKET_SKILL rätt per steg; slarvig = weakMorning och fel svar. restless = rummet otåligt eller missnöjt minst 15 spelminuter. Rummets läge som mätaren läser det (sim/guestMood.ts roomMoodValue, stableRoomMood) varje tick efter öppning; up/down = byten uppåt/nedåt, afterAnswer = byten inom konsekvensögonblicket efter ett raketsvar, timeShare = andel av kvällen i varje läge. meterUp/meterDown = mätarens synliga rörelser (fyllningen flyttad minst MOOD_BALANCE.meterVisibleSteps steg, meterFill/meterMove), meterAfterAnswer = de inom konsekvensögonblicket (där räcker MOOD_BALANCE.meterVisibleStepsAfterAnswer).', summary, runs }, null, 2) + '\n');
    }
    expect(runs.length).toBe(offsets.length * seeds.length);
  }, 1200000);
});
