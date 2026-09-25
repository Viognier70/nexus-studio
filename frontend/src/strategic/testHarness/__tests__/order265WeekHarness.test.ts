// ORDER 265 (Nexus v1 etapp 3) — veckoharnessens DoD.
//
// Ordern etapp 3 DoD: "veckoharnessen visar en vecka där golvet fylls
// på, en där det inte behövs, och en nedgradering som följs av en väg
// tillbaka." Tre spelare med fast frö, spelade med gränssnittets
// åtgärder (weekHarness.ts). Rapporten per dag (kassa, golv, gäster,
// rykte, medaljer, krediter, klass) skrivs till
// reports/order265/week-harness.json; testet läser talen ur samma körning.

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWeeks, type HarnessRun, type MorningPlan } from '../weekHarness';
import { calendarFor } from '../../../sim/calendar';
import type { PavilionKey, SimulationState } from '../../types';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order265');
const ALL = Number.MAX_SAFE_INTEGER;

// Brons i tre (varav Stensöta) på måndag och tisdag vecka 1.
function examsFirstDays(s: SimulationState): MorningPlan {
  const cal = calendarFor(s.day.dayNumber);
  const pick = (ps: PavilionKey[]) => ps.filter((p) => !s.medals[p]).map((p) => ({ pavilion: p, correct: ALL }));
  if (cal.absoluteWeek === 1 && cal.weekday === 'mon') return { exams: pick(['stensota', 'metodkoket']) };
  if (cal.absoluteWeek === 1 && cal.weekday === 'tue') return { exams: pick(['kalastorget']) };
  return {};
}

function summary(run: HarnessRun) {
  return run.days.map((d) => ({
    day: d.dayNumber, week: d.week, weekday: d.weekday, class: d.businessClass,
    cash: d.cash, floor: d.floor, revenue: d.revenue, guests: d.guests,
    reputation: d.reputation, medals: d.medals, credits: d.credits
  }));
}

describe('ORDER 265 — veckoharnessen', () => {
  const settlements: Record<string, unknown[]> = {};
  const runs: Record<string, HarnessRun> = {};

  function play(name: string, opts: Parameters<typeof runWeeks>[0]): HarnessRun {
    const seen: unknown[] = [];
    const run = runWeeks({
      ...opts,
      plan: (s) => {
        // Veckoavräkningen görs när söndagen börjar; läs den på söndagsmorgonen.
        if (!calendarFor(s.day.dayNumber).isServiceDay && s.economy.lastSettlement) seen.push({ ...s.economy.lastSettlement, class: s.economy.businessClass, cash: Math.round(s.cash) });
        return opts.plan(s);
      }
    });
    settlements[name] = seen;
    runs[name] = run;
    return run;
  }

  it('en vecka där golvet inte behövs (alla kvällar öppna)', () => {
    const run = play('vanlig-vecka', { seed: 42, weeks: 1, plan: examsFirstDays });
    const s = settlements['vanlig-vecka'][0] as { topUpSek: number; revenueSek: number; floorSek: number };
    expect(s.floorSek).toBeGreaterThan(0);
    expect(s.revenueSek).toBeGreaterThan(s.floorSek);
    expect(s.topUpSek).toBe(0);
    expect(run.final.economy.businessClass).toBe('vinbar');
  });

  it('en vecka där golvet fylls på (silver i tre, kvällarna stängda tisdag–lördag)', () => {
    play('svag-vecka', {
      seed: 42,
      weeks: 1,
      plan: (s) => {
        const cal = calendarFor(s.day.dayNumber);
        const exams: MorningPlan['exams'] =
          cal.weekday === 'mon' ? [{ pavilion: 'stensota', correct: ALL }, { pavilion: 'metodkoket', correct: ALL }]
          : cal.weekday === 'tue' ? [{ pavilion: 'kalastorget', correct: ALL }, { pavilion: 'maltidbiblioteket', correct: ALL }]
          : cal.weekday === 'wed' ? [{ pavilion: 'stensota', correct: ALL }, { pavilion: 'metodkoket', correct: ALL }]
          : cal.weekday === 'thu' ? [{ pavilion: 'kalastorget', correct: ALL }]
          : [];
        // En sjuk vecka: kvällarna stängda tisdag–lördag (skala ner).
        const closed = ['tue', 'wed', 'thu', 'fri', 'sat'].includes(cal.weekday);
        return { exams, closeEvening: closed };
      }
    });
    const s = settlements['svag-vecka'][0] as { topUpSek: number; revenueSek: number; floorSek: number };
    expect(s.revenueSek).toBeLessThan(s.floorSek);
    expect(s.topUpSek).toBe(s.floorSek - s.revenueSek);
  });

  it('en nedgradering som följs av en väg tillbaka', () => {
    const run = play('nedgradering-och-tillbaka', {
      seed: 42,
      weeks: 4,
      // Oförberedd start: nästan ingen kassa och inga medaljer. Vecka 1–2
      // utan besök i Måltidens hus, så kassan går under noll.
      setup: (s) => ({ ...s, cash: 2000 }),
      plan: (s) => {
        const cal = calendarFor(s.day.dayNumber);
        // Vecka 3: brons i tre (varav Stensöta) för vägen tillbaka.
        if (cal.absoluteWeek === 3 && cal.weekday === 'mon') return { exams: [{ pavilion: 'stensota', correct: ALL }, { pavilion: 'metodkoket', correct: ALL }] };
        if (cal.absoluteWeek === 3 && cal.weekday === 'tue') return { exams: [{ pavilion: 'kalastorget', correct: ALL }] };
        // Söndag: tillbaka till vinbaren när banken säger ja.
        if (!cal.isServiceDay && s.economy.businessClass === 'foodtruck') return { actions: [{ type: 'CHOOSE_CLASS', to: 'vinbar' }] };
        return {};
      }
    });
    const classes = run.days.map((d) => d.businessClass);
    const firstFoodtruck = classes.indexOf('foodtruck');
    expect(firstFoodtruck, JSON.stringify(settlements['nedgradering-och-tillbaka'])).toBeGreaterThan(-1);
    expect(classes.slice(0, firstFoodtruck).every((c) => c === 'vinbar')).toBe(true);
    const back = classes.indexOf('vinbar', firstFoodtruck);
    expect(back).toBeGreaterThan(firstFoodtruck);
    const downgrade = (settlements['nedgradering-och-tillbaka'] as { downgradedFrom: string | null }[]).find((x) => x.downgradedFrom);
    expect(downgrade).toMatchObject({ downgradedFrom: 'vinbar', downgradedTo: 'foodtruck' });
  });

  it('rapporten skrivs', () => {
    mkdirSync(OUT, { recursive: true });
    const report = Object.fromEntries(Object.entries(runs).map(([k, r]) => [k, { seed: r.seed, settlements: settlements[k], days: summary(r) }]));
    writeFileSync(resolve(OUT, 'week-harness.json'), JSON.stringify(report, null, 2) + '\n');
    expect(Object.keys(report)).toHaveLength(3);
  });
});
