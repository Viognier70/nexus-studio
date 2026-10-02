// ORDER 296b — vad gör gästerna missnöjda? (Vision Owner 2026-10-02: "ryktet
// ska hålla över veckan för en rimlig spelare".)
//
// Varje gästs nöjdhet följs tick för tick (tickUntil:s done-anrop ser varje
// tillstånd). En ändring hänförs till sin källa efter gästens läge och vad
// som hände samma tick:
//   kö       — gästen väntade (waiting/arriving) före och efter
//   maten    — gästen gick in i dining (värdekvoten och mise en place)
//   raketen  — raketernas logg växte eller en följd pågår
//   slumpen  — alla närvarande ändrades lika mycket (serviceChance)
//   plus     — höjningar (service, kontroll, välkomstdrink m.m.)
//   övrigt:<läge> — resten, efter läge
// Utdata: summan per källa för gästerna som gick missnöjda (≤ 0,65), nöjda
// (≥ 0,85) och mitt emellan, och startnöjdheten.
//
//   SAT_SEEDS=6 WRITE_REPORTS=1 REPORT_ORDER=order296b npx vitest run src/strategic/testHarness/__tests__/order296bNojdhet.test.ts

import { describe, expect, it } from 'vitest';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { playMorning, tickUntil, type ScenarioAnswer } from '../weekHarness';
import { mountRoomLikeScene } from '../roomParity';
import { PLAYERS } from '../randomness';
import { firstDayOfWeek } from '../../../sim/calendar';
import { HAPPY_THRESHOLD, UNHAPPY_THRESHOLD } from '../../simulation/reputation';
import type { SimulationState } from '../../types';
import { valueQuotaSatisfactionDelta } from '../../simulation/valueQuota';

interface Track { start: number; sat: number; state: string; src: Record<string, number>; waited: number }

const WAIT_STATES = new Set(['waiting', 'arriving']);
const PRESENT = new Set(['waiting', 'seated', 'ordering', 'dining', 'paying', 'serving']);

function evening(s: SimulationState, answer: ScenarioAnswer, done: { sat: number; src: Record<string, number>; start: number; waited: number }[]): SimulationState {
  const track = new Map<string, Track>();
  let logLen = s.incidents?.log.length ?? 0;
  return tickUntil(s, (x) => {
    const log = x.incidents?.log.length ?? 0;
    const rocket = log !== logLen || !!x.incidents?.ongoing;
    logLen = log;
    // Slumpen: alla närvarande ändrade lika mycket samma tick.
    const deltas: number[] = [];
    for (const g of x.guests) {
      const t = track.get(g.id);
      if (t && PRESENT.has(g.state) && PRESENT.has(t.state)) deltas.push(+(g.satisfaction - t.sat).toFixed(6));
    }
    const room = deltas.length > 2 && deltas.every((d) => d === deltas[0] && d !== 0);
    for (const g of x.guests) {
      let t = track.get(g.id);
      if (!t) { t = { start: g.satisfaction, sat: g.satisfaction, state: g.state, src: {}, waited: 0 }; track.set(g.id, t); continue; }
      const d = g.satisfaction - t.sat;
      if (WAIT_STATES.has(t.state) && WAIT_STATES.has(g.state)) t.waited += 1;
      if (Math.abs(d) > 1e-9) {
        let k: string;
        if (room) k = 'slumpen';
        else if (rocket && d < 0) k = 'raketen';
        else if (d > 0) k = 'plus';
        else if (WAIT_STATES.has(t.state) && WAIT_STATES.has(g.state)) k = 'kö';
        else if (g.state === 'dining' && t.state !== 'dining') {
          // Värdekvoten (samma funktion som service.ts läser); resten är
          // mise en place-bristen (mepConsumption.ts applyMissingMepHit).
          const v = valueQuotaSatisfactionDelta(x);
          t.src['maten:värdekvoten'] = (t.src['maten:värdekvoten'] ?? 0) + v;
          t.src['maten:miseEnPlace'] = (t.src['maten:miseEnPlace'] ?? 0) + (d - v);
          t.sat = g.satisfaction; t.state = g.state;
          continue;
        }
        else k = `övrigt:${t.state}>${g.state}`;
        t.src[k] = (t.src[k] ?? 0) + d;
      }
      if (g.state === 'leaving' && t.state !== 'leaving') done.push({ sat: g.satisfaction, src: t.src, start: t.start, waited: t.waited });
      t.sat = g.satisfaction; t.state = g.state;
    }
    return x.day.period === 'evening' || x.day.period === 'morning';
  }, answer);
}

describe.skipIf(!process.env.SAT_SEEDS)('ORDER 296b — nöjdheten', () => {
  it('källorna till missnöjda gäster', async () => {
    const seeds = Array.from({ length: Number(process.env.SAT_SEEDS ?? 3) }, (_, i) => i + 1);
    const days = Number(process.env.SAT_DAYS ?? 12);
    const answer = (process.env.SAT_ANSWER ?? 'best') as ScenarioAnswer;
    const gone: { sat: number; src: Record<string, number>; start: number; waited: number }[] = [];
    for (const seed of seeds) {
      let s: SimulationState = makeNewGameState(seed);
      s = { ...s, cash: 1_000_000, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(1) } };
      for (let d = 0; d < days; d++) {
        const day = s.day.dayNumber;
        s = playMorning(s, { scenarioAnswer: answer });
        mountRoomLikeScene(s.businessClass);
        const opened = reducer(s, { type: 'START_SERVICE' });
        if (opened !== s) s = evening(opened, answer, gone);
        else s = reducer(s, { type: 'CLOSE_DAY' });
        if (s.day.period === 'evening') s = reducer(s, { type: 'END_EVENING' });
        s = tickUntil(s, (x) => x.day.dayNumber > day && x.day.period === 'morning');
      }
    }
    const groups = { missnojda: gone.filter((g) => g.sat <= UNHAPPY_THRESHOLD), mitten: gone.filter((g) => g.sat > UNHAPPY_THRESHOLD && g.sat < HAPPY_THRESHOLD), nojda: gone.filter((g) => g.sat >= HAPPY_THRESHOLD) };
    const summary = Object.fromEntries(Object.entries(groups).map(([k, gs]) => {
      const src: Record<string, number> = {};
      for (const g of gs) for (const [s, v] of Object.entries(g.src)) src[s] = (src[s] ?? 0) + v;
      const n = Math.max(1, gs.length);
      return [k, {
        n: gs.length,
        meanStart: +(gs.reduce((a, g) => a + g.start, 0) / n).toFixed(3),
        meanEnd: +(gs.reduce((a, g) => a + g.sat, 0) / n).toFixed(3),
        meanWaitTicks: +(gs.reduce((a, g) => a + g.waited, 0) / n).toFixed(1),
        meanPerSource: Object.fromEntries(Object.entries(src).sort((a, b) => a[1] - b[1]).map(([s, v]) => [s, +(v / n).toFixed(3)]))
      }];
    }));
    if (process.env.WRITE_REPORTS === '1') {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_ORDER ?? 'order296b');
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, process.env.SAT_OUT ?? 'nojdhet.json'), JSON.stringify({ definition: 'Gästerna som gick, efter nöjdheten när de gick; summan av nöjdhetens ändringar per källa och gäst (se filens huvud). Baspaketet, svaren SAT_ANSWER, vecka 1–2.', seeds, days, answer, summary }, null, 2) + '\n');
    }
    expect(gone.length).toBeGreaterThan(0);
  }, 3600000);
});
