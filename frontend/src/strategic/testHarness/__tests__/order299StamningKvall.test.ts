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

function evening(seed: number, offset: number) {
  let s = makeNewGameState(seed);
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) + offset } };
  s = playMorning(s, { actions: (x) => (misePlan(x).backlogMin > 0 ? [{ type: 'HIRE_PREP_HAND' as const }] : []) });
  mountRoomLikeScene(s.businessClass);
  s = reducer(s, { type: 'START_SERVICE' });
  let mood: MoodId | null = null;
  const changes: { clock: string; from: MoodId; to: MoodId; dir: 'up' | 'down'; afterAnswer: boolean }[] = [];
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
      changes.push({ clock: formatClock(clockMinutes(x)), from: mood, to: next, dir: moodSteps(next) > moodSteps(mood) ? 'up' : 'down', afterAnswer });
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
  }, 'skill');
  const ticks = Object.values(time).reduce((a, b) => a + b, 0);
  return {
    seed, weekday: calendarFor(s.day.dayNumber).weekday, answers,
    up: changes.filter((c) => c.dir === 'up').length,
    down: changes.filter((c) => c.dir === 'down').length,
    afterAnswer: changes.filter((c) => c.afterAnswer).length,
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
    const runs = [0, 2, 4].flatMap((offset) => [1, 2, 3].map((seed) => evening(seed, offset)));
    const mean = (f: (r: (typeof runs)[number]) => number) => +(runs.reduce((a, r) => a + f(r), 0) / runs.length).toFixed(1);
    const summary = { evenings: runs.length, meanUp: mean((r) => r.up), meanDown: mean((r) => r.down), meanAfterAnswer: mean((r) => r.afterAnswer), meanAnswers: mean((r) => r.answers), meanMeterUp: mean((r) => r.meterUp), meanMeterDown: mean((r) => r.meterDown), meanMeterAfterAnswer: mean((r) => r.meterAfterAnswer),
      meanTimeShare: Object.fromEntries(MOODS.map((m) => [m, mean((r) => r.timeShare[m] * 100) / 100])) };
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order299');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.STAMNING_OUT ?? 'stamning.json'), JSON.stringify({ definition: 'Vinbaren vecka 2 (mån, ons, fre), frö 1–3, mentorns morgon, raketerna med 0,75 rätt per steg. Rummets läge som mätaren läser det (sim/guestMood.ts roomMoodValue, stableRoomMood) varje tick efter öppning; up/down = byten uppåt/nedåt, afterAnswer = byten inom konsekvensögonblicket efter ett raketsvar, timeShare = andel av kvällen i varje läge. meterUp/meterDown = mätarens synliga rörelser (fyllningen flyttad minst MOOD_BALANCE.meterVisibleSteps steg, meterFill/meterMove), meterAfterAnswer = de inom konsekvensögonblicket (där räcker MOOD_BALANCE.meterVisibleStepsAfterAnswer).', summary, runs }, null, 2) + '\n');
    }
    expect(runs.length).toBe(9);
  }, 1200000);
});
