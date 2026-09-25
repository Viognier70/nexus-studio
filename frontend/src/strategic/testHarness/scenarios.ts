// ORDER 266 — veckoharnessens standardscenarier (ordern §1.2: harnessen
// körs efter varje etapp från etapp 3). Samma tre spelare som ORDER 265
// införde, delade så att varje etapp kör samma scenarier och skriver
// sina tal till reports/order<NNN>/week-harness.json.

import { runWeeks, type HarnessRun, type MorningPlan } from './weekHarness';
import { calendarFor } from '../../sim/calendar';
import type { PavilionKey, SimulationState } from '../types';

const ALL = Number.MAX_SAFE_INTEGER;

// Brons i tre (varav Stensöta) på måndag och tisdag vecka 1.
export function examsFirstDays(s: SimulationState): MorningPlan {
  const cal = calendarFor(s.day.dayNumber);
  const pick = (ps: PavilionKey[]) => ps.filter((p) => !s.medals[p]).map((p) => ({ pavilion: p, correct: ALL }));
  if (cal.absoluteWeek === 1 && cal.weekday === 'mon') return { exams: pick(['stensota', 'metodkoket']) };
  if (cal.absoluteWeek === 1 && cal.weekday === 'tue') return { exams: pick(['kalastorget']) };
  return {};
}

export interface ScenarioRun {
  run: HarnessRun;
  // Veckoavräkningarna, lästa på söndagsmorgonen.
  settlements: Record<string, unknown>[];
}

function play(opts: Parameters<typeof runWeeks>[0]): ScenarioRun {
  const settlements: Record<string, unknown>[] = [];
  const run = runWeeks({
    ...opts,
    plan: (s) => {
      if (!calendarFor(s.day.dayNumber).isServiceDay && s.economy.lastSettlement) {
        settlements.push({ ...s.economy.lastSettlement, class: s.economy.businessClass, cash: Math.round(s.cash) });
      }
      return opts.plan(s);
    }
  });
  return { run, settlements };
}

export const SCENARIOS: Record<string, () => ScenarioRun> = {
  // Brons i tre, alla kvällar öppna.
  'vanlig-vecka': () => play({ seed: 42, weeks: 1, plan: examsFirstDays }),
  // Silver i tre och brons i Måltidsbiblioteket, kvällarna stängda tisdag–lördag.
  'svag-vecka': () =>
    play({
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
        return { exams, closeEvening: ['tue', 'wed', 'thu', 'fri', 'sat'].includes(cal.weekday) };
      }
    }),
  // Ingen kassa och inga medaljer vecka 1–2; söndagen efter nedgraderingen
  // brons i tre och tillbaka till vinbaren om banken säger ja.
  'nedgradering-och-tillbaka': () =>
    play({
      seed: 42,
      weeks: 4,
      setup: (s) => ({ ...s, cash: 0 }),
      plan: (s) => {
        const cal = calendarFor(s.day.dayNumber);
        if (!cal.isServiceDay && s.economy.businessClass === 'foodtruck') {
          return {
            exams: (['stensota', 'metodkoket', 'kalastorget'] as PavilionKey[]).filter((p) => !s.medals[p]).map((p) => ({ pavilion: p, correct: ALL })),
            actions: [{ type: 'CHOOSE_CLASS', to: 'vinbar' }]
          };
        }
        return {};
      }
    })
};

export function daySummary(run: HarnessRun) {
  return run.days.map((d) => ({
    day: d.dayNumber, week: d.week, weekday: d.weekday, class: d.businessClass,
    cash: d.cash, floor: d.floor, revenue: d.revenue, guests: d.guests,
    reputation: d.reputation, medals: d.medals, credits: d.credits
  }));
}
