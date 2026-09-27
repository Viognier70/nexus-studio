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
  NEW_START,
  SCENARIO_CASH,
  FLOOR,
  LOAN,
  REPUTATION,
  MARKET,
  MEDAL_LEVELS,
  TEAM_BY_CLASS,
  UPGRADE,
  WAGES,
  WEEK,
  type BusinessClassId,
  type BusinessClassSpec,
  type MedalLevel,
  type MedalRequirement
} from './balance';
import { calendarFor } from './calendar';
import type { PavilionKey, SimulationState } from '../strategic/types';
import { applyCashCost, applyCashDelta, postLedger } from '../strategic/simulation/cashReading';
import { teamForClass } from '../strategic/simulation/team';
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
  // ORDER 268 — sedan när spelaren står utan verksamhet och hur många
  // prov hon gjort sedan dess (banken lånar ut igen efter en hel vecka
  // med minst ett prov). Saknas i äldre sparfiler: då gäller inget krav.
  withoutBusiness?: { sinceDay: number; examsTaken: number } | null;
  // ORDER 268 — scenariernas kassa sedan veckoavräkningen (taket ±20 %).
  weekScenarioCashSek?: number;
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
  return state.cash - dailyWagesSek(state) - dailyInterestSek(state.economy.loan);
}

// ORDER 268 — lönerna för dagen: bara på servicedagar ("Söndag ingen lön").
export function dailyWagesSek(state: SimulationState): number {
  if (WAGES.onlyOnServiceDays && !calendarFor(state.day.dayNumber).isServiceDay) return 0;
  return state.team.members.filter((m) => !m.isAgency).reduce((sum, m) => sum + m.dailyCost, 0);
}

// ORDER 268 — det nedgraderingen räknar: kassan vid dagsavslut plus
// kreditramen (golvet). "Nedgradering räknas först när kassan är under
// minus veckogolvet tre dagsavslut i rad."
export function dayEndHeadroom(state: SimulationState): number {
  return dayEndCash(state) + creditLineSek(state) * DOWNGRADE.creditLineInWeeksOfFloor;
}

// Dagsavslut (F24): när kvällen börjar. Räknar dagar i rad under noll
// och ger varningen till kvällsberättelsen. ORDER 268: `headroom` är
// kassan plus kreditramen (dayEndHeadroom).
export function dayEnd(economy: EconomyState, headroom: number): EconomyState {
  const negative = headroom < 0;
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

// ORDER 268 (F37) — personalen följer klassen: vid uppgradering följer
// alla med, vid nedgradering stannar de klassen har plats för, och utan
// verksamhet finns ingen personal (och inga löner).
// ORDER 268 — vid tvingad nedgradering säljs lokalen: 50 % av
// inventarievärdet blir startkassa i den nya klassen (underskottet
// skrivs av med lokalen). Vid uppgradering från en verksamhet dras
// kontantinsatsen; resten täcks av den nya klassens startlån.
export function saleProceedsSek(from: BusinessClassId | null): number {
  if (!from) return 0;
  return Math.round(startLoanSek(from) * DOWNGRADE.inventoryShareOfStartLoan * DOWNGRADE.salePriceShareOfInventory);
}

export function upgradeDepositSek(to: BusinessClassId, medals: SimulationState['medals']): number {
  return Math.round(floorSek(to, medals) * UPGRADE.depositShareOfWeekFloor);
}

export function changeClass(state: SimulationState, to: BusinessClassId | null, forced: boolean): SimulationState {
  const economy = state.economy;
  const up = !isDowngrade(economy.businessClass, to);
  const proceeds = forced ? saleProceedsSek(economy.businessClass) : 0;
  const deposit = up && to && economy.businessClass !== null ? upgradeDepositSek(to, state.medals) : 0;
  const ledger = [...state.ledger];
  const draft: SimulationState = { ...state, ledger, cash: forced ? Math.max(state.cash, 0) : state.cash };
  if (proceeds > 0) {
    applyCashDelta(draft, proceeds);
    postLedger(draft, { category: 'other', amount: proceeds, cause: strings.economy.ledger.sale });
  }
  if (deposit > 0) {
    applyCashDelta(draft, -deposit);
    postLedger(draft, { category: 'other', amount: -deposit, cause: strings.economy.ledger.deposit });
  }
  return {
    ...draft,
    team: teamForClass(state.team, to ? TEAM_BY_CLASS.roles[to] : [], up, state.day.dayNumber),
    businessClass: to ? V1_CLASS_TO_ROOM[to] : state.businessClass,
    reputation: up ? Math.max(REPUTATION.floor / REPUTATION.scale, state.reputation * UPGRADE.reputationFactor) : state.reputation,
    economy: {
      ...economy,
      businessClass: to,
      loan: up && to ? { originalSek: startLoanSek(to), principalSek: startLoanSek(to), weeksLeft: LOAN.amortisationWeeks } : null,
      consecutiveNegativeDayEnds: 0,
      downgradePending: false,
      warning: null,
      withoutBusiness: to === null ? { sinceDay: state.day.dayNumber, examsTaken: 0 } : null
    }
  };
}

// ORDER 268 — ett prov utan verksamhet räknas mot bankens krav.
export function recordExamWithoutBusiness(economy: EconomyState): EconomyState {
  if (economy.businessClass !== null || !economy.withoutBusiness) return economy;
  return { ...economy, withoutBusiness: { ...economy.withoutBusiness, examsTaken: economy.withoutBusiness.examsTaken + 1 } };
}

// ORDER 268 — "Efter inget lån ger banken nytt lån först efter en hel
// vecka i Måltidens hus med minst ett prov."
export function bankReadyAfterNoBusiness(state: SimulationState): boolean {
  const w = state.economy.withoutBusiness;
  if (state.economy.businessClass !== null || !w) return true;
  return state.day.dayNumber - w.sinceDay >= NEW_START.daysWithoutBusiness && w.examsTaken >= NEW_START.examsRequired;
}

// ORDER 270 (provspel 2026-09-27) — spelaren har förlorat verksamheten och
// står utan lån: "Utan verksamhet och utan pengar: en tydlig ruta mitt på
// skärmen. Den enda vägen vidare är till Måltidens hus för att öva och göra
// prov, så att banken kan ge lån. Inga andra knappar." (Introduktionen,
// före den första verksamheten, har mentorn och räknas inte hit.)
export function isStrandedWithoutBusiness(state: SimulationState): boolean {
  return state.economy.businessClass === null && !!state.economy.withoutBusiness && !state.introduction;
}

// Vilka klasser spelaren kan byta till nu, och varför inte de andra.
export type ClassOption =
  | { id: BusinessClassId; status: 'current' }
  | { id: BusinessClassId; status: 'available' }
  | { id: BusinessClassId; status: 'requirements' }
  | { id: BusinessClassId; status: 'cash' }
  | { id: BusinessClassId; status: 'bankWait' }
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
    // ORDER 268 — efter inget lån: en hel vecka i Måltidens hus med
    // minst ett prov. Ingen kontantinsats (det finns ingen lokal att
    // byta från, och kassan står still utan verksamhet).
    if (current === null && !first && !bankReadyAfterNoBusiness(state)) return { id: c.id, status: 'bankWait' as const };
    // ORDER 268 — uppgradering kräver kontantinsats, 25 % av en veckas
    // golv i den nya klassen; resten lånas. Gäller byte från en
    // verksamhet, inte den första och inte en ny start.
    if (current !== null && !isDowngrade(current, c.id) && state.cash < upgradeDepositSek(c.id, state.medals)) return { id: c.id, status: 'cash' as const };
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

// ORDER 268 — scenariernas kassa (Vision Owner 2026-09-26): en enhet är
// en andel av klassens normala veckointäkt, och veckans summa hålls
// inom ±20 % av den. Utan verksamhet finns ingen service och inga scenarier.
export function scenarioUnitSek(state: SimulationState): number {
  const cls = state.economy.businessClass;
  return cls ? ECONOMY.normalWeeklyRevenueSek[cls] * SCENARIO_CASH.unitShareOfWeeklyRevenue : 0;
}

export function scenarioChoiceUnits(scenarioId: string | null, choice: 'A' | 'B' | 'C'): number {
  return (scenarioId && SCENARIO_CASH.choiceUnits[scenarioId]?.[choice]) || 0;
}

// Det belopp som får bokas nu: veckans summa efter beloppet hålls inom taket.
export function clampScenarioCash(state: SimulationState, deltaSek: number): number {
  const cls = state.economy.businessClass;
  if (!cls) return 0;
  const cap = ECONOMY.normalWeeklyRevenueSek[cls] * SCENARIO_CASH.weeklyCapShareOfNormalRevenue;
  const sofar = state.economy.weekScenarioCashSek ?? 0;
  return Math.max(-cap, Math.min(cap, sofar + deltaSek)) - sofar;
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
    economy: { ...e, loan, weekRevenueStartSek: state.revenue, weekEvenings: [], weekScenarioCashSek: 0 }
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
