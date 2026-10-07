// ORDER 316 — fikats utlösare i vinbaren: hur ofta varje dilemma kommer och
// vad personalens ork och trivsel når vid stängning (balance.ts FIKA, trösklarna).
//
//   ORDER316_OUT=1 npx vitest run src/strategic/testHarness/__tests__/order316Utlosare.test.ts
//   → reports/order316/utlosare.json
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../../simulation/reducer';
import { makeNewGameState } from '../../simulation/model';
import { playMorning, tickUntil, answerFika } from '../weekHarness';
import { PLAYERS } from '../randomness';
import { firstDayOfWeek, calendarFor } from '../../../sim/calendar';
import { eligibleDilemmas } from '../../../sim/fika';
const SEEDS = [1, 2, 3];
const WEEKS = 4;
describe.skipIf(!process.env.ORDER316_OUT)('ORDER 316 — fikats utlösare i vinbaren', () => it('fyra veckor, tre frön', () => {
  const counts: Record<string, number> = {}; const elig: Record<string, number> = {};
  const mins: number[] = []; const means: number[] = []; const wb: number[] = [];
  let evenings = 0, none = 0;
  for (const seed of SEEDS) {
    let s = makeNewGameState(seed);
    s = { ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
    for (let d = 0; d < WEEKS * 7; d++) {
      const day = s.day.dayNumber;
      if (calendarFor(day).isServiceDay) {
        s = playMorning(s, {});
        const o = reducer(s, { type: 'START_SERVICE' });
        if (o !== s) {
          s = tickUntil(o, (x) => x.day.period === 'evening' || x.day.period === 'morning');
          if (s.day.period === 'evening') {
            evenings++;
            const st = s.staff.map((x) => x.stamina ?? 1);
            mins.push(Math.min(...st)); means.push(st.reduce((a, b) => a + b, 0) / st.length);
            wb.push(Math.min(...s.staff.map((x) => x.wellbeing ?? 0.75)));
            for (const e of eligibleDilemmas(s)) elig[e.id] = (elig[e.id] ?? 0) + 1;
            const t = s.fika?.tonight; if (t && t.day === day) counts[t.dilemmaId] = (counts[t.dilemmaId] ?? 0) + 1; else none++;
            s = answerFika(s, 'best');
            s = reducer(s, { type: 'END_EVENING' });
          }
        } else s = reducer(s, { type: 'CLOSE_DAY' });
      } else s = reducer(s, { type: 'CLOSE_DAY' });
      s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
    }
  }
  const q = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return [a[0], a[Math.floor(a.length * 0.1)], a[Math.floor(a.length * 0.5)], a[a.length - 1]].map((v) => +v.toFixed(3)); };
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order316/utlosare.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({
    definition: 'Den bästa spelaren i vinbaren (brons i tre), fyra veckor per frö. evenings: kvällar med service; none: kvällar utan dilemma; counts: kvällens dilemma; elig: dilemman vars utlösare höll (sim/fika.ts eligibleDilemmas); staminaMin/staminaMean/wellbeingMin: personalens lägsta ork, lagets snittork och lägsta trivsel vid stängning, som [min, 10 %, median, max].',
    seeds: SEEDS, weeks: WEEKS, evenings, none, counts, elig, staminaMin: q(mins), staminaMean: q(means), wellbeingMin: q(wb)
  }, null, 2) + '\n');
}, 3600000));
