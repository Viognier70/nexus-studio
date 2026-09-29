// ORDER 266 — veckoharnessens standardscenarier (ordern §1.2: harnessen
// körs efter varje etapp från etapp 3). Samma tre spelare som ORDER 265
// införde, delade så att varje etapp kör samma scenarier och skriver
// sina tal till reports/order<NNN>/week-harness.json.

import { runWeeks, type HarnessRun, type MorningPlan } from './weekHarness';
import { calendarFor } from '../../sim/calendar';
import type { PavilionKey, SimulationState } from '../types';
import { packagesFor } from '../simulation/packages';

const ALL = Number.MAX_SAFE_INTEGER;

// Brons i tre (varav Stensöta) på måndag och tisdag vecka 1.
export function examsFirstDays(s: SimulationState): MorningPlan {
  const cal = calendarFor(s.day.dayNumber);
  const pick = (ps: PavilionKey[]) => ps.filter((p) => !s.medals[p]).map((p) => ({ pavilion: p, correct: ALL }));
  if (cal.absoluteWeek === 1 && cal.weekday === 'mon') return { exams: pick(['stensota', 'metodkoket']) };
  if (cal.absoluteWeek === 1 && cal.weekday === 'tue') return { exams: pick(['kalastorget']) };
  return {};
}

// ORDER 268 — harnessens två spelare (Vision Owner 2026-09-26).
// Den rimliga spelaren svarar som en duktig spelare på scenariot vid
// dörren (weekHarness.ts `answerScenario`, 'best'). Den svaga väljer
// sämsta svaret och handlar för lite till lagret: en meny med två rätter
// och råvaror till ungefär fyra kuvert om dagen, så att gästerna efter
// det inte får någon rätt och går (reducer.ts drawMenuDishForGuest).
export const WEAK_STOCK_COVERS = 4;

export function weakMorning(): MorningPlan {
  const n = WEAK_STOCK_COVERS;
  return {
    scenarioAnswer: 'worst',
    // ORDER 275 — den svaga köper inget baspaket, bara råvarorna nedan.
    stock: 'none',
    // ORDER 284 — i klasser med paket köps samma råvaror som portioner (två
    // rätter till n kuvert: kyckling n/2, rotfrukter n × 1,5, örter n, mejeri
    // n/2). Lösa råvaror finns inte i spelarens inköp där och hamnar utanför
    // portionsboken (stockPackages.ts dishPortions). I övriga klasser köps
    // råvarorna som förut.
    actions: (s: SimulationState) => packagesFor(s.economy.businessClass)
      ? [
          // ORDER 277 — servicen startar inte utan en dryck: ett glas vin per kuvert.
          { type: 'BUY_ITEMS', items: { 'chicken-plate': n / 2, 'root-soup': n / 2, 'house-wine-glass': n } }
        ]
      : [
          { type: 'COMPOSE_MENU', dishes: [{ dishId: 'chicken-plate', price: 175 }, { dishId: 'root-soup', price: 95 }] },
          { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'chicken', units: n / 2 },
          { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'root-veg', units: n * 1.5 },
          { type: 'BUY_STOCK', supplierId: 'local-veg', ingredientId: 'herbs', units: n },
          { type: 'BUY_STOCK', supplierId: 'wholesaler', ingredientId: 'dairy', units: n / 2 },
          { type: 'BUY_ITEMS', items: { 'house-wine-glass': n } }
        ]
  };
}

export interface ScenarioRun {
  run: HarnessRun;
  // Veckoavräkningarna, lästa på söndagsmorgonen.
  settlements: Record<string, unknown>[];
}

// ORDER 268 — `onMorning` ser tillståndet varje morgon innan planen
// spelas (för sparfilen som verifieringen i spelarens vy laddar).
export type OnMorning = (state: SimulationState) => void;

function play(opts: Parameters<typeof runWeeks>[0], onMorning?: OnMorning): ScenarioRun {
  const settlements: Record<string, unknown>[] = [];
  const run = runWeeks({
    ...opts,
    plan: (s) => {
      onMorning?.(s);
      if (!calendarFor(s.day.dayNumber).isServiceDay && s.economy.lastSettlement) {
        settlements.push({
          ...s.economy.lastSettlement,
          class: s.economy.businessClass,
          cash: Math.round(s.cash),
          // ORDER 268 — laget efter avräkningen (personalen följer klassen).
          team: s.team.members.map((m) => m.role)
        });
      }
      return opts.plan(s);
    }
  });
  return { run, settlements };
}

export const SCENARIOS: Record<string, (onMorning?: OnMorning) => ScenarioRun> = {
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
  // ORDER 268 — den svaga spelaren (ingen kassa, inga medaljer, sämsta
  // svaret, för lite i lagret) tills vinbaren tas. Sedan spelar hon
  // rimligt: söndagen efter nedgraderingen tar hon brons i tre och driver
  // food trucken en vecka; nästa söndag går hon tillbaka till vinbaren om
  // banken säger ja (kontantinsatsen). Står hon utan verksamhet gör hon
  // prov och frågar banken varje morgon.
  'nedgradering-och-tillbaka': (onMorning) => {
    let weak = true;
    return play({
      seed: 42,
      weeks: 8,
      setup: (s) => ({ ...s, cash: 0 }),
      plan: (s) => {
        if (s.economy.businessClass !== 'vinbar') weak = false;
        if (weak) return weakMorning();
        const cal = calendarFor(s.day.dayNumber);
        const cls = s.economy.businessClass;
        const exams = (['stensota', 'metodkoket', 'kalastorget'] as PavilionKey[]).filter((p) => !s.medals[p]).map((p) => ({ pavilion: p, correct: ALL }));
        const justDowngraded = s.economy.lastSettlement?.downgradedTo === cls;
        if (!cal.isServiceDay && cls === 'foodtruck') {
          return justDowngraded ? { exams } : { exams, actions: [{ type: 'CHOOSE_CLASS', to: 'vinbar' }] };
        }
        if (cls === null) {
          const practice = exams.length === 0 ? [{ pavilion: 'maltidbiblioteket' as PavilionKey, correct: ALL }] : exams;
          return { exams: practice.slice(0, 1), actions: [{ type: 'CHOOSE_CLASS', to: 'vinbar' }] };
        }
        return {};
      }
    }, onMorning);
  }
};

export function daySummary(run: HarnessRun) {
  return run.days.map((d) => ({
    day: d.dayNumber, week: d.week, weekday: d.weekday, class: d.businessClass,
    cash: d.cash, floor: d.floor, revenue: d.revenue, guests: d.guests,
    reputation: d.reputation, medals: d.medals, credits: d.credits
  }));
}
