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

import { SALVAGE_BEST, SALVAGE_OPTIONS, salvageGroup } from '../simulation/salvage';
import { reducer } from '../simulation/reducer';
import { makeNewGameState } from '../simulation/model';
import { bankQuestionById } from '../knowledge/questionBank';
import { calendarFor } from '../../sim/calendar';
import { floorSek } from '../../sim/economy';
import { mountRoomLikeScene } from './roomParity';
import { WEEK } from '../../sim/balance';
import { rankedScenarioChoice } from '../simulation/scenarios';
import { incidentById } from '../../sim/incidentBank';
import { packagesFor } from '../simulation/packages';
import { canBack, canStartBack, rankedStepOption } from '../../sim/incidents';
import type { PavilionKey, ScenarioChoice, SimAction, SimulationState } from '../types';

// Simuleringens tick är 0,2 s (5 Hz), samma som SimulationProvider.
const TICK_DT = 0.2;
import { pinsOf, type PinKind } from '../../sim/hostPins';
import { hashKey } from '../util/hash';
import { seatGroupsFree } from '../simulation/service';

const MAX_TICKS_PER_PHASE = 200000;

export interface MorningPlan {
  // Prov i dessa paviljonger (svarar rätt på `correct` frågor).
  exams?: { pavilion: PavilionKey; correct: number }[];
  practice?: PavilionKey[];
  activities?: string[];
  // Godtyckliga åtgärder på morgonen (t.ex. klassbyte på söndag).
  // ORDER 284 — eller en funktion av morgonens läge (t.ex. inköp som
  // beror på om klassen har paket).
  actions?: SimAction[] | ((s: SimulationState) => SimAction[]);
  // ORDER 275 — lagret är insatsen. Den rimliga spelaren köper klassens
  // baspaket varje morgon ('base', förvalt); den svaga handlar själv
  // ('none', se scenarios.ts weakMorning). Klasser utan paket påverkas inte.
  stock?: 'base' | 'none';
  // Stäng kvällens service (skala ner, samma som spelarens knapp) och
  // avsluta dagen utan service.
  closeEvening?: boolean;
  // ORDER 268 — hur spelaren svarar på scenariot vid dörren: 'best' är
  // den rimliga spelaren (det svar som lyfter kvällens tema mest, och
  // rätt svar på frågan), 'worst' den svaga. Utelämnat = 'best'.
  // ORDER 270 — samma val gäller kvällens händelser: den rimliga spelaren
  // väljer det bästa svaret i varje steg, den svaga det sämsta (rankedStepOption).
  scenarioAnswer?: ScenarioAnswer;
  // ORDER 280 — Back your knowledge: spelaren startar en egen raket så fort
  // det går (högst BACK.maxPerEvening per kväll) och står för varje svar
  // med den här säkerheten (svaren som i scenarioAnswer). Utelämnat =
  // ingen egen raket (harnessens spelare gör det inte i slumpmätningen).
  backConfidence?: 0 | 1 | 2;
  // ORDER 296c — hovmästarens nålar: 'wise' svarar klokt på varje nål (se
  // wisePinAnswer); utelämnat = Per väljer (det säkra) när tiden går ut.
  pins?: 'wise';
}

// ORDER 296c — det kloka svaret på en nål: sätt sällskapet om det finns
// plats, låt sommeliern föreslå flaskan, flytta servitören till baren när den
// inte hinner med, och bjud den som väntat länge på ett glas.
export function wisePinAnswer(s: SimulationState, kind: PinKind): 0 | 1 {
  if (kind === 'door') return s.guests.some((g) => g.state === 'waiting') && seatGroupsFree(s).some((g) => g.free.length > 0) ? 0 : 1;
  return 0;
}

function answerPinsWisely(s: SimulationState): SimulationState {
  for (const p of pinsOf(s).open) s = reducer(s, { type: 'HOST_PIN_ANSWER', id: p.id, answer: wisePinAnswer(s, p.kind) });
  return s;
}

// ORDER 296 — 'half' svarar bäst och sämst vartannat steg (efter raketens
// öppningstid och steg, eller dagen). 'halfRocket' (ORDER 296b) svarar rätt
// på varannan raket hela vägen och fel på den andra, så att hälften av
// raketerna klaras.
// ORDER 296e — 'skill' svarar rätt på varje steg med sannolikheten
// ROCKET_SKILL (förvalt 0,75, Vision Owner 2026-10-03), dragen ur fröet,
// raketen och steget.
export type ScenarioAnswer = 'best' | 'worst' | 'half' | 'halfRocket' | 'skill';
export const ROCKET_SKILL = Number(process.env.ROCKET_SKILL ?? 0.75);
function resolveAnswer(answer: ScenarioAnswer, key: number, seed = 0): 'best' | 'worst' {
  // Nyckeln börjar med det som skiljer (FNV sprider dåligt när bara slutet gör det).
  if (answer === 'skill') return hashKey(seed, `${Math.round(key * 1000)}|skill`) < ROCKET_SKILL ? 'best' : 'worst';
  return answer === 'half' || answer === 'halfRocket' ? (Math.round(key) % 2 === 0 ? 'best' : 'worst') : answer;
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

export function tickUntil(s: SimulationState, done: (s: SimulationState) => boolean, answer: ScenarioAnswer = 'best', backConfidence?: 0 | 1 | 2, pins?: 'wise'): SimulationState {
  for (let i = 0; i < MAX_TICKS_PER_PHASE && !done(s); i++) {
    s = answerScenario(reducer(s, { type: 'TICK', dt: TICK_DT }), answer, backConfidence);
    if (backConfidence !== undefined && canStartBack(s)) s = reducer(s, { type: 'START_BACK' });
    if (pins === 'wise' && (s.day.pins?.open.length ?? 0) > 0) s = answerPinsWisely(s);
  }
  return s;
}

// ORDER 268 — valen rangordnas efter hur de flyttar kvällens tema
// (scenarios.ts `rankedScenarioChoice`, samma som simuleringen läser).
export function rankedChoice(scenarioId: string | null, answer: 'best' | 'worst'): ScenarioChoice {
  return rankedScenarioChoice(scenarioId, answer);
}

// ORDER 268 — spelaren svarar på scenariot vid dörren (ScenarioOverlay:
// första knappen i varje steg, samma som playwright-skripten). Förut
// svarade harnessen aldrig: scenariot stod kvar i 'subject', inga fler
// scenarier fyrades, och deras gäster och kassa uteblev. Mätt från
// reports/order268/save-lordag-vecka1.json: lördagens intäkt 7 140 SEK
// i harnessen mot 17 850 SEK + 8 000 SEK (scenario) i spelarens vy.
export function answerScenario(s: SimulationState, given: ScenarioAnswer = 'best', backConfidence?: 0 | 1 | 2): SimulationState {
  // ORDER 270 — raketens aktuella steg besvaras direkt, som spelaren gör i
  // IncidentCard (samma åtgärd, ANSWER_INCIDENT). Nästa tick svarar på
  // nästa steg.
  const active = s.incidents?.active;
  if (active) {
    const incident = incidentById(s.economy.businessClass, active.id);
    const step = incident?.steps[active.step ?? 0];
    if (step) {
      // ORDER 280 — i en egen raket står spelaren för svaret, så högt
      // krediterna räcker till.
      let c: 0 | 1 | 2 = active.backed ? (backConfidence ?? 0) : 0;
      while (c > 0 && !canBack(s, c)) c = (c - 1) as 0 | 1 | 2;
      return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, resolveAnswer(given, given === 'halfRocket' ? active.openedAt : given === 'skill' ? active.openedAt + (active.step ?? 0) / 10 : active.openedAt + (active.step ?? 0), s.seed ?? 0), active.struck, active.situation), confidence: c });
    }
  }
  const answer = resolveAnswer(given, s.day.dayNumber);
  switch (s.scenario.phase) {
    case 'subject':
      return reducer(s, { type: 'ADVANCE_SCENARIO_TO_SITUATION' });
    case 'situation':
      return reducer(s, { type: 'RESOLVE_SCENARIO', choice: rankedChoice(s.scenario.scenarioId, answer) });
    case 'question': {
      const q = s.scenario.pendingQuestion;
      if (!q) return s;
      const index = q.options.findIndex((o) => o.correct === (answer === 'best'));
      return reducer(s, { type: 'ANSWER_QUESTION', index: Math.max(0, index) });
    }
    case 'question-explanation':
      return reducer(s, { type: 'ACK_QUESTION_EXPLANATION' });
    default:
      return s;
  }
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
  const pkgs = packagesFor(s.economy.businessClass);
  if (pkgs && (plan.stock ?? 'base') === 'base') s = reducer(s, { type: 'BUY_PACKAGE', packageId: pkgs.base.id });
  // ORDER 285 — gårdagens rester: bästa svaret tar vara på dem, det sämsta
  // skickar dem till sopbilen (salvage.ts), som svaren på raketerna.
  if (s.salvage && s.salvage.resolved === null) {
    const group = salvageGroup(s.salvage.dishId);
    if (group) {
      const best = SALVAGE_BEST[group];
      const pick = resolveAnswer(plan.scenarioAnswer ?? 'best', s.day.dayNumber) === 'worst' ? SALVAGE_OPTIONS.find((o) => o !== best)! : best;
      s = reducer(s, { type: 'ANSWER_SALVAGE', optionId: pick });
    }
  }
  const actions = typeof plan.actions === 'function' ? plan.actions(s) : plan.actions ?? [];
  for (const a of actions) s = reducer(s, a);
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
    }, plan.scenarioAnswer, plan.backConfidence, plan.pins);
  } else {
    s = reducer(s, { type: 'CLOSE_DAY' });
  }
  if (s.day.period === 'evening') {
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
  // ORDER 267 — samma start som spelarens nya spel (rummet följer klassen).
  let s = makeNewGameState(opts.seed);
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
