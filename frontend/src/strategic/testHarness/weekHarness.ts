// ORDER 265 (Nexus v1 etapp 3) — veckoharnessen.
//
// Ordern §1.2: "Harnessen spelar en hel vecka headless med fast
// fröslump. Från etapp 3 och framåt körs den efter varje etapp och
// rapporterar kassa, golv, gäster, rykte, medaljer och krediter per dag."
//
// Harnessen spelar med samma åtgärder som gränssnittet skickar
// (START_SERVICE, CLOSE_DAY, END_EVENING, VISIT_PAVILION, …), så att det
// som mäts är det spelaren spelar. Talen läses ur simuleringens
// tillstånd, samma källa som gränssnittet visar.
//
// En "spelare" är en plan: vad som görs på morgonen varje dag.

import { reducer } from '../simulation/reducer';
import { makeInitialState } from '../simulation/model';
import { bankQuestionById } from '../knowledge/questionBank';
import { calendarFor } from '../../sim/calendar';
import { floorSek } from '../../sim/economy';
import { mountRoomLikeScene } from './roomParity';
import { WEEK } from '../../sim/balance';
import type { PavilionKey, SimAction, SimulationState } from '../types';

// Simuleringens tick är 0,2 s (5 Hz), samma som SimulationProvider.
const TICK_DT = 0.2;
const MAX_TICKS_PER_PHASE = 200000;

export interface MorningPlan {
  // Prov i dessa paviljonger (svarar rätt på `correct` frågor).
  exams?: { pavilion: PavilionKey; correct: number }[];
  practice?: PavilionKey[];
  activities?: string[];
  // Godtyckliga åtgärder på morgonen (t.ex. klassbyte på söndag).
  actions?: SimAction[];
  // Stäng kvällens service (skala ner, samma som spelarens knapp) och
  // avsluta dagen utan service.
  closeEvening?: boolean;
}

export type PlayerPlan = (state: SimulationState) => MorningPlan;

export interface DayRecord {
  dayNumber: number;
  week: number;
  weekday: string;
  cash: number;
  revenue: number;
  guests: number;
  reputation: number;
  medals: SimulationState['medals'];
  credits: SimulationState['knowledgeCredits'];
  // Fylls av ekonomimodulen från etapp 3 (null före).
  floor: number | null;
  businessClass: string | null;
  events: string[];
}

function tickUntil(s: SimulationState, done: (s: SimulationState) => boolean): SimulationState {
  for (let i = 0; i < MAX_TICKS_PER_PHASE && !done(s); i++) s = reducer(s, { type: 'TICK', dt: TICK_DT });
  return s;
}

function answer(s: SimulationState, correctCount: number): SimulationState {
  const visit = s.pavilionVisit;
  if (!visit) return s;
  for (let i = 0; i < visit.questionIds.length; i++) {
    const q = bankQuestionById(s.pavilionVisit!.questionIds[i]);
    if (!q) break;
    const idx = i < correctCount ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
    s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: idx });
    s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
  }
  return reducer(s, { type: 'CLOSE_VISIT' });
}

export function playMorning(s: SimulationState, plan: MorningPlan): SimulationState {
  for (const e of plan.exams ?? []) {
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: e.pavilion, mode: 'exam' });
    s = answer(s, e.correct);
  }
  for (const p of plan.practice ?? []) {
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: p, mode: 'practice' });
    s = answer(s, Number.MAX_SAFE_INTEGER);
  }
  for (const id of plan.activities ?? []) s = reducer(s, { type: 'PICK_ACTIVITY', id });
  for (const a of plan.actions ?? []) s = reducer(s, a);
  // Kvällen stängd eller öppen enligt planen (växeln ligger kvar mellan dagar).
  if (Boolean(plan.closeEvening) !== s.scaleDown.closedDinner) {
    s = reducer(s, { type: 'CLOSE_SERVICE', service: 'dinner' });
  }
  return s;
}

// Spelar en dag från morgon till nästa morgon, i samma rum som spelaren
// ser (roomParity.ts).
export function playDay(s: SimulationState, plan: MorningPlan): { state: SimulationState; guests: number } {
  const day = s.day.dayNumber;
  s = playMorning(s, plan);
  mountRoomLikeScene(s.businessClass);
  const seen = new Set<string>();
  const opened = reducer(s, { type: 'START_SERVICE' });
  if (opened !== s) {
    s = tickUntil(opened, (x) => {
      for (const g of x.guests) seen.add(g.id);
      return x.day.period === 'evening' || x.day.period === 'morning';
    });
  } else {
    s = reducer(s, { type: 'CLOSE_DAY' });
  }
  if (s.day.period === 'evening') {
    s = reducer(s, { type: 'SKIP_QUIZ' });
    s = reducer(s, { type: 'END_EVENING' });
  }
  s = tickUntil(s, (x) => x.day.dayNumber > day && (x.day.period === 'morning'));
  return { state: s, guests: seen.size };
}

export interface HarnessRun {
  seed: number;
  days: DayRecord[];
  final: SimulationState;
}

// Hook för ekonomimodulen (etapp 3): golv och klass per dag.
export interface EconomyReading {
  floor(state: SimulationState): number | null;
  businessClass(state: SimulationState): string | null;
}

// ORDER 265 — golvet och klassen läses ur v1-ekonomin (src/sim/economy.ts).
export const V1_ECONOMY: EconomyReading = {
  floor: (s) => floorSek(s.economy.businessClass, s.medals),
  businessClass: (s) => s.economy.businessClass
};

export function runWeeks(opts: {
  seed: number;
  weeks: number;
  plan: PlayerPlan;
  setup?: (s: SimulationState) => SimulationState;
  economy?: EconomyReading;
}): HarnessRun {
  const economy = opts.economy ?? V1_ECONOMY;
  let s = makeInitialState(opts.seed);
  if (opts.setup) s = opts.setup(s);
  const days: DayRecord[] = [];
  const totalDays = opts.weeks * WEEK.daysPerWeek;
  for (let i = 0; i < totalDays; i++) {
    const cal = calendarFor(s.day.dayNumber);
    const revenueBefore = s.revenue;
    const streamBefore = s.eventStream.length;
    const { state, guests } = playDay(s, opts.plan(s));
    s = state;
    days.push({
      dayNumber: cal.dayNumber,
      week: cal.absoluteWeek,
      weekday: cal.weekday,
      cash: Math.round(s.cash),
      // state.revenue är i SEK (samma källa som kvällens redovisning,
      // EveningAccountMetrics.revenue).
      revenue: Math.round(s.revenue - revenueBefore),
      guests,
      reputation: Math.round(s.reputation * 1000) / 1000,
      medals: { ...s.medals },
      credits: { ...s.knowledgeCredits },
      floor: economy.floor(s),
      businessClass: economy.businessClass(s),
      events: s.eventStream.slice(streamBefore).filter((e) => e.kind.startsWith('economy_')).map((e) => e.text)
    });
  }
  return { seed: opts.seed, days, final: s };
}
