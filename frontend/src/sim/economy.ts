// ORDER 265 (Nexus v1 etapp 3) — ekonomin: golvet, lånet, marknaden,
// nedgradering och klassbyte.
//
// Speldesign > Ekonomin och > Verksamhetsklasserna. Alla tal kommer från
// `balance.ts`; filen får inte innehålla andra talvärden än 0 och 1.
// Kassa och krediter byter aldrig plats: här läses medaljer, aldrig
// krediter, och inget i filen skriver krediter.

import {
  BUSINESS_CLASSES,
  DOWNGRADE,
  ECONOMY,
  FLOOR,
  LOAN,
  REPUTATION,
  MARKET,
  MEDAL_LEVELS,
  UPGRADE,
  WEEK,
  type BusinessClassId,
  type BusinessClassSpec,
  type MedalLevel,
  type MedalRequirement
} from './balance';
import { calendarFor } from './calendar';
import type { PavilionKey, SimulationState } from '../strategic/types';
import { applyCashCost, applyCashDelta, postLedger } from '../strategic/simulation/cashReading';
import { strings } from '../content/strings.sv';

export const ALL_PAVILIONS: readonly PavilionKey[] = [
  'maltidbiblioteket',
  'kalastorget',
  'stensota',
  'metodkoket',
  'gastronomiskateatern'
];

// v1-klassen → simuleringens rum (F20). Vinbaren spelas i vinbarens rum
// (wineBarRoom.ts, 20 platser; ORDER 267 / etapp 5, scene/BrewpubScene.tsx
// WineBarScene); restaurang och nattklubb har ännu inget eget rum och
// spelas i kvarterskrogen (etapp 7 och 10).
export const V1_CLASS_TO_ROOM: Record<BusinessClassId, SimulationState['businessClass']> = {
  vinbar: 'vinbaren',
  foodtruck: 'foodtrucken',
  restaurang: 'kvarterskrogen',
  olkrog: 'ölkrogen',
  gastgiveri: 'gästgiveriet',
  nattklubb: 'kvarterskrogen'
};

export interface LoanState {
  originalSek: number;
  principalSek: number;
  weeksLeft: number;
}

// ORDER 267 — en kväll i veckan, för söndagstidningen (sim/newspaper.ts).
export interface EveningRecord {
  dayNumber: number;
  revenueSek: number;
  reputationDelta: number;
  // Gäster som kom (dagens ankomster) mot dagens tak på marknaden.
  guests: number;
  marketCap: number;
  gaveUp: number;
}

// Kvällen till veckans lista när servicen stänger, både vid vanlig
// stängning (reducer.ts) och när den faller ihop (collapse.ts). `before`
// bär servicens startvärden (day.revenueAtServiceStart m.fl.), `after`
// kvällens utfall.
export function recordEvening(before: SimulationState, after: SimulationState): EconomyState {
  const d = before.day;
  const record: EveningRecord = {
    dayNumber: d.dayNumber,
    revenueSek: Math.round(after.revenue - (d.revenueAtServiceStart ?? after.revenue)),
    reputationDelta: after.reputation - (d.reputationAtServiceStart ?? before.reputation),
    guests: d.arrivalsToday ?? 0,
    marketCap: dailyGuestCap(before),
    gaveUp: before.metrics.giveUpsThisService
  };
  return { ...after.economy, weekEvenings: [...(after.economy.weekEvenings ?? []), record] };
}

export interface SettlementRecord {
  week: number;
  // ORDER 267 — veckans kvällar, för söndagstidningen.
  evenings?: EveningRecord[];
  revenueSek: number;
  floorSek: number;
  topUpSek: number;
  amortisationSek: number;
  downgradedFrom: BusinessClassId | null;
  downgradedTo: BusinessClassId | null;
}

export interface EconomyState {
  businessClass: BusinessClassId | null;
  loan: LoanState | null;
  // state.revenue när veckan började (efter förra avräkningen).
  weekRevenueStartSek: number;
  // ORDER 267 — kvällarna sedan förra avräkningen (söndagstidningen).
  weekEvenings?: EveningRecord[];
  consecutiveNegativeDayEnds: number;
  downgradePending: boolean;
  lastSettlement: SettlementRecord | null;
  // Senaste dagsavslutets varning, för kvällsberättelsen.
  warning: 'first' | 'second' | 'downgrade' | null;
}

export function classSpec(id: BusinessClassId): BusinessClassSpec {
  return BUSINESS_CLASSES.list.find((c) => c.id === id)!;
}

function medalValue(level: MedalLevel | undefined): number {
  return FLOOR.medalValue[level ?? 'none'];
}

function medalRank(level: MedalLevel | undefined): number {
  return level ? MEDAL_LEVELS.indexOf(level) + 1 : 0;
}

// Food truckens huvudpaviljong är "spelarens bästa".
export function mainPavilionFor(id: BusinessClassId, medals: SimulationState['medals']): PavilionKey {
  const main = classSpec(id).mainPavilion;
  if (main !== 'best') return main;
  return [...ALL_PAVILIONS].sort((a, b) => medalRank(medals[b]) - medalRank(medals[a]))[0];
}

// G = 0,6 × huvudpaviljongens värde + 0,4 × snittet av övriga, högst 90.
export function floorPercent(id: BusinessClassId, medals: SimulationState['medals']): number {
  const main = mainPavilionFor(id, medals);
  const others = ALL_PAVILIONS.filter((p) => p !== main);
  const avgOthers = others.reduce((sum, p) => sum + medalValue(medals[p]), 0) / others.length;
  const g = FLOOR.mainPavilionWeight * medalValue(medals[main]) + FLOOR.otherPavilionsWeight * avgOthers;
  return Math.min(FLOOR.maxPercent, g);
}

export function floorSek(id: BusinessClassId | null, medals: SimulationState['medals']): number {
  if (!id) return 0;
  return Math.round((floorPercent(id, medals) / FLOOR.percentBase) * ECONOMY.normalWeeklyRevenueSek[id]);
}

export function startLoanSek(id: BusinessClassId): number {
  return ECONOMY.normalWeeklyRevenueSek[id] * ECONOMY.startLoanWeeksOfRevenue;
}

// Ett krav: nivån (eller högre) i minst `count` paviljonger, varav de namngivna.
export function meetsRequirement(req: MedalRequirement, medals: SimulationState['medals']): boolean {
  const need = medalRank(req.level);
  const ok = (p: PavilionKey) => medalRank(medals[p]) >= need;
  if (!req.including.every(ok)) return false;
  return ALL_PAVILIONS.filter(ok).length >= req.count;
}

export function meetsClass(id: BusinessClassId, medals: SimulationState['medals']): boolean {
  return classSpec(id).requirements.every((r) => meetsRequirement(r, medals));
}

// Marknaden: spelarens andelstak och dagens tak på gäster.
export function totalMedalSteps(medals: SimulationState['medals']): number {
  return ALL_PAVILIONS.reduce((sum, p) => sum + medalRank(medals[p]), 0);
}

export function marketShareCap(medals: SimulationState['medals']): number {
  return Math.min(1, MARKET.baseShareCap + MARKET.shareCapPerMedalStep * totalMedalSteps(medals));
}

// Dagens tak på gäster: spelarens andel av dagens pool. Tester av
// rummets mekanik kan stänga av taket med policies.marketCapEnabled.
export function dailyGuestCap(state: SimulationState): number {
  if (state.policies.marketCapEnabled === false) return Number.POSITIVE_INFINITY;
  const pool = MARKET.basePoolPerDay * calendarFor(state.day.dayNumber).guestFactor;
  return Math.floor(pool * marketShareCap(state.medals));
}

// Nedgraderingskedjan (speldesign > Nedgradering).
export function downgradeTarget(id: BusinessClassId | null, medals: SimulationState['medals']): BusinessClassId | null {
  switch (id) {
    case 'gastgiveri':
    case 'nattklubb':
      return 'restaurang';
    case 'restaurang':
      return medalRank(medals.metodkoket) > medalRank(medals.stensota) ? 'olkrog' : 'vinbar';
    case 'vinbar':
    case 'olkrog':
      return 'foodtruck';
    default:
      return null;
  }
}

export function initialEconomy(id: BusinessClassId | null, weeksLeft: number, revenueNow: number): EconomyState {
  return {
    businessClass: id,
    loan: id ? { originalSek: startLoanSek(id), principalSek: startLoanSek(id), weeksLeft } : null,
    weekRevenueStartSek: revenueNow,
    consecutiveNegativeDayEnds: 0,
    downgradePending: false,
    lastSettlement: null,
    warning: null
  };
}

// Räntan per dag: 5 % av lånebeloppet över säsongens veckor (F3).
export function dailyInterestSek(loan: LoanState | null): number {
  if (!loan || loan.principalSek <= 0) return 0;
  return (LOAN.interestRate * loan.originalSek) / (LOAN.amortisationWeeks * WEEK.daysPerWeek);
}

// Kassan vid dagsavslut (F24): som den blir när dagen är slut, efter
// kvällens löner och lånets ränta (som bokförs vid dygnsskiftet).
// Räknas när kvällen börjar, så att kvällsberättelsen kan bära varningen.
export function dayEndCash(state: SimulationState): number {
  const wages = state.team.members.filter((m) => !m.isAgency).reduce((sum, m) => sum + m.dailyCost, 0);
  return state.cash - wages - dailyInterestSek(state.economy.loan);
}

// Dagsavslut (F24): när kvällen börjar. Räknar dagar i rad under noll
// och ger varningen till kvällsberättelsen.
export function dayEnd(economy: EconomyState, cash: number): EconomyState {
  const negative = cash < 0;
  const count = negative ? economy.consecutiveNegativeDayEnds + 1 : 0;
  const reached = count >= DOWNGRADE.consecutiveNegativeDayEnds;
  const warningsLeft = DOWNGRADE.consecutiveNegativeDayEnds - count;
  let warning: EconomyState['warning'] = null;
  if (reached) warning = 'downgrade';
  else if (negative && warningsLeft === DOWNGRADE.warningDays) warning = 'first';
  else if (negative && warningsLeft === DOWNGRADE.warningDays - 1) warning = 'second';
  return {
    ...economy,
    consecutiveNegativeDayEnds: count,
    downgradePending: economy.downgradePending || (reached && economy.businessClass !== null),
    warning
  };
}

// Klassbyte (F22). Lokalen säljs och restskulden skrivs av.
// - Uppgradering eller byte till lika stor klass: den nya klassens
//   startlån, amorterat över åtta veckor från start, och ryktet halveras
//   "eftersom gästerna inte känner den nya lokalen" (> Uppgradering).
// - Nedgradering (tvingad eller frivillig): speldesignen säger bara att
//   "resten av lånet skrivs ner"; den mindre lokalen tas över utan nytt
//   lån, så att det finns en väg tillbaka. En tvingad nedgradering
//   nollställer ett underskott i kassan (försäljningen täcker det).
// Byte till en mindre klass är en nedgradering (skuldfri). Byte till en
// lika stor eller större klass är en ny lokal: nytt lån och halverat rykte.
export function isDowngrade(from: BusinessClassId | null, to: BusinessClassId | null): boolean {
  if (!from) return false;
  if (!to) return true;
  return classSpec(to).sizeRank < classSpec(from).sizeRank;
}

export function changeClass(state: SimulationState, to: BusinessClassId | null, forced: boolean): SimulationState {
  const economy = state.economy;
  const up = !isDowngrade(economy.businessClass, to);
  return {
    ...state,
    cash: forced ? Math.max(state.cash, 0) : state.cash,
    businessClass: to ? V1_CLASS_TO_ROOM[to] : state.businessClass,
    reputation: up ? Math.max(REPUTATION.floor / REPUTATION.scale, state.reputation * UPGRADE.reputationFactor) : state.reputation,
    economy: {
      ...economy,
      businessClass: to,
      loan: up && to ? { originalSek: startLoanSek(to), principalSek: startLoanSek(to), weeksLeft: LOAN.amortisationWeeks } : null,
      consecutiveNegativeDayEnds: 0,
      downgradePending: false,
      warning: null
    }
  };
}

// Vilka klasser spelaren kan byta till nu, och varför inte de andra.
export type ClassOption =
  | { id: BusinessClassId; status: 'current' }
  | { id: BusinessClassId; status: 'available' }
  | { id: BusinessClassId; status: 'requirements' }
  | { id: BusinessClassId; status: 'cash' }
  | { id: BusinessClassId; status: 'upgradeOnly' };

export function canChangeClassToday(state: SimulationState): boolean {
  if (state.day.period !== 'morning') return false;
  // Utan verksamhet kan banken besökas vilken morgon som helst.
  if (state.economy.businessClass === null) return true;
  return !calendarFor(state.day.dayNumber).isServiceDay;
}

// ORDER 267 (F33) — spelarens första verksamhet i introduktionen.
function isFirstBusiness(state: SimulationState): boolean {
  return !!state.introduction && state.economy.businessClass === null;
}

// Kraven som gäller för ett byte till klassen just nu: i introduktionen
// klassens startkrav (brons i huvudpaviljongen för vinbar och ölkrog),
// annars klasstabellens krav.
export function requirementsFor(state: SimulationState, id: BusinessClassId): readonly MedalRequirement[] {
  const spec = classSpec(id);
  return isFirstBusiness(state) ? spec.startRequirements ?? spec.requirements : spec.requirements;
}

export function classOptions(state: SimulationState): ClassOption[] {
  const current = state.economy.businessClass;
  const first = isFirstBusiness(state);
  return BUSINESS_CLASSES.list.map((c) => {
    if (c.id === current) return { id: c.id, status: 'current' as const };
    // Gästgiveri och nattklubb nås bara genom uppgradering, inte som start.
    if (c.upgradeOnly && current === null) return { id: c.id, status: 'upgradeOnly' as const };
    if (!requirementsFor(state, c.id).every((r) => meetsRequirement(r, state.medals))) {
      return { id: c.id, status: 'requirements' as const };
    }
    // "om kassan räcker till en veckas golv i den nya klassen" — gäller
    // uppgradering, inte den första verksamheten (startlånet täcker den).
    const need = floorSek(c.id, state.medals) * UPGRADE.cashRequiredInWeeksOfFloor;
    if (!first && state.cash < need) return { id: c.id, status: 'cash' as const };
    return { id: c.id, status: 'available' as const };
  });
}

// Bankmötet i introduktionen öppnar den första verksamheten: klassens
// startlån, rummet efter klassen, ryktet orört (det finns ingen tidigare
// lokal som gästerna kände), och introduktionen är slut.
export function openFirstBusiness(state: SimulationState, to: BusinessClassId): SimulationState {
  const opened = changeClass(state, to, false);
  return { ...opened, reputation: state.reputation, introduction: null };
}

// Golvet som kreditram: en satsning får dra kassan ner till −golvet.
export function creditLineSek(state: SimulationState): number {
  return floorSek(state.economy.businessClass, state.medals);
}

// Räntan bokförs vid varje dygnsskifte (samma rytm som lönerna).
export function postDailyInterest(draft: SimulationState): void {
  const sek = dailyInterestSek(draft.economy.loan);
  if (sek <= 0) return;
  applyCashCost(draft, sek);
  postLedger(draft, { category: 'interest', amount: -sek, cause: strings.economy.ledger.interest });
}

// Veckoavräkningen (speldesign: söndagen). Körs när söndagen börjar:
// veckans intäkt mot golvet, påfyllnad, amortering och en väntande
// nedgradering. Påfyllnaden och amorteringen flyttar bara kassa (inte
// intäkt eller kostnad), så att nästa veckas intäkt mäts rent.
export function settleWeek(state: SimulationState): SimulationState {
  const e = state.economy;
  const week = calendarFor(state.day.dayNumber).week;
  const revenueSek = Math.round(state.revenue - e.weekRevenueStartSek);
  const floor = floorSek(e.businessClass, state.medals);
  const topUpSek = Math.max(0, floor - revenueSek);
  const amortisationSek = e.loan && e.loan.weeksLeft > 0 ? Math.round(e.loan.principalSek / e.loan.weeksLeft) : 0;
  const draft: SimulationState = { ...state, ledger: [...state.ledger] };
  if (topUpSek > 0) {
    applyCashDelta(draft, topUpSek);
    postLedger(draft, { category: 'floor', amount: topUpSek, cause: strings.economy.ledger.floor });
  }
  if (amortisationSek > 0) {
    applyCashDelta(draft, -amortisationSek);
    postLedger(draft, { category: 'amortisation', amount: -amortisationSek, cause: strings.economy.ledger.amortisation });
  }
  const loan = e.loan
    ? { ...e.loan, principalSek: Math.max(0, e.loan.principalSek - amortisationSek), weeksLeft: Math.max(0, e.loan.weeksLeft - 1) }
    : null;
  let next: SimulationState = {
    ...draft,
    economy: { ...e, loan, weekRevenueStartSek: state.revenue, weekEvenings: [] }
  };
  let downgradedTo: BusinessClassId | null = null;
  const downgradedFrom = e.downgradePending ? e.businessClass : null;
  if (e.downgradePending) {
    downgradedTo = downgradeTarget(e.businessClass, state.medals);
    next = changeClass(next, downgradedTo, true);
  }
  return {
    ...next,
    economy: {
      ...next.economy,
      lastSettlement: { week, evenings: e.weekEvenings ?? [], revenueSek, floorSek: floor, topUpSek, amortisationSek, downgradedFrom, downgradedTo }
    }
  };
}
