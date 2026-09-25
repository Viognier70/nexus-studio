// ORDER 267 (Nexus v1 etapp 5) — introduktionen.
//
// Speldesign > Ramar för version 1 > Introduktionen: "Spelet börjar med
// bussen till Grythyttan i förstaperson (VS001). En mentor från Campus
// möter spelaren och följer henne genom första dagen: ett övningsbesök,
// ett prov och bankmötet. Målet är att en ny spelare står i sin första
// verksamhet inom 20 minuter."
//
// Bussen (VS001) är en egen vy (src/App.tsx); härifrån börjar
// introduktionen i strategiska spelet, måndag morgon vecka 1, utan
// verksamhet och utan lån. Stegen härleds ur tillståndet:
//   practice — inget övningsbesök gjort ännu
//   exam     — övat, ingen medalj ännu
//   bank     — minst en medalj, ingen verksamhet ännu
// När banken öppnat den första verksamheten tas introduktionen bort
// (sim/economy.ts openFirstBusiness). Besöken under introduktionen tar
// ingen schemaplats (F33), så ett underkänt prov kan göras om samma
// morgon.

import { ALL_PAVILIONS, initialEconomy } from './economy';
import { SEASON } from './balance';
import type { SimulationState } from '../strategic/types';

export type IntroductionStep = 'practice' | 'exam' | 'bank';

export function introductionStep(s: SimulationState): IntroductionStep | null {
  if (!s.introduction || s.economy.businessClass !== null) return null;
  if (ALL_PAVILIONS.some((p) => s.medals[p])) return 'bank';
  return s.introduction.practiced ? 'exam' : 'practice';
}

export function inIntroduction(s: SimulationState): boolean {
  return introductionStep(s) !== null;
}

// Ett nytt spel efter bussen: ingen verksamhet, inget lån.
export function beginIntroduction(s: SimulationState): SimulationState {
  return {
    ...s,
    introduction: { practiced: false },
    economy: initialEconomy(null, SEASON.weeks, s.economy.weekRevenueStartSek)
  };
}

// Ett avslutat övningsbesök under introduktionen.
export function afterVisitClosed(before: SimulationState, after: SimulationState): SimulationState {
  if (!after.introduction || after.introduction.practiced) return after;
  if (before.pavilionVisit?.mode !== 'practice' || before.pavilionVisit.result === null) return after;
  return { ...after, introduction: { ...after.introduction, practiced: true } };
}
