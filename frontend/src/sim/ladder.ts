// ORDER 315a — karriärstegen (Anders 2026-10-07, BESLUT del 2; förslaget
// documentation/architecture/ORDER_315_FORSLAG.md §1).
//
// Spelaren går stegen foodtruck → vinbar → bistro. Kraven för nästa steg är
// kassan vid dagens slut, byns rykte och medaljerna (balance.ts LADDER). När
// de är uppfyllda kommer Åsas erbjudande på morgonen: "Ta över" eller "Inte
// än". "Inte än" kostar inget och erbjudandet står kvar; spelaren kan stanna
// i foodtrucken hela säsongen. Åsa äger inte huset: hon förmedlar erbjudandet
// och har nycklarna.
//
// Köpet: insatsen ur kassan är en andel av stegets veckogolv, resten lånas
// (som uppgraderingen). Ryktet följer med oförändrat. Bistron byggs om i
// vinbarens hus: vinbarens lån står kvar och ombyggnaden lånas till.
// Stjärnan delas bara ut från bistron (LadderStep.starsPossible).

import type { BusinessClassId } from './balance';
import { FLOOR, LADDER, MEDAL_LEVELS, ECONOMY, LOAN, TEAM_BY_CLASS } from './balance';
import { teamForClass } from '../strategic/simulation/team';
import { ladderOf, nextStep, stepSpec, type LadderOffer, type LadderState, type PlayableStep, type StepRequirement } from './ladderStep';
export * from './ladderStep';
import type { PavilionKey, SimulationState } from '../strategic/types';
import { changeClass, floorPercent, openFirstBusiness } from './economy';
import { introductionStep } from './introduction';
import { applyCashDelta, postLedger } from '../strategic/simulation/cashReading';
import { strings } from '../content/strings';

export function requirementFor(step: PlayableStep): StepRequirement | null {
  return LADDER.requirements[step] ?? null;
}

const rank = (level: string | undefined) => (level ? MEDAL_LEVELS.indexOf(level as (typeof MEDAL_LEVELS)[number]) + 1 : 0);

/** Vilka krav som saknas för steget (tom lista: uppfyllda). */
export function missingFor(state: SimulationState, step: PlayableStep): Array<'cash' | 'reputation' | 'medals'> {
  const req = requirementFor(step);
  if (!req) return [];
  const out: Array<'cash' | 'reputation' | 'medals'> = [];
  if (state.cash < req.cashSek) out.push('cash');
  if (state.reputation < req.reputationAtLeast) out.push('reputation');
  if (!req.medalsRequired.every((m) => rank(state.medals[m.pavilion as PavilionKey]) >= rank(m.level))) out.push('medals');
  return out;
}

/** Stegets normala veckointäkt (klassens gånger stegets faktor). */
function weeklyRevenueSek(step: PlayableStep): number {
  const spec = stepSpec(step);
  return ECONOMY.normalWeeklyRevenueSek[spec.businessClass] * spec.revenueFactor;
}

/** Insatsen ur kassan: en andel av stegets veckogolv. */
export function depositSek(step: PlayableStep, medals: SimulationState['medals']): number {
  const spec = stepSpec(step);
  const floor = (floorPercent(spec.businessClass, medals) / FLOOR.percentBase) * weeklyRevenueSek(step);
  return Math.round(floor * LADDER.depositShareOfWeekFloor);
}

/** Lånet vid köpet: stegets startlån (för bistron ombyggnaden, som läggs till vinbarens). */
export function purchaseLoanSek(step: PlayableStep): number {
  return Math.round(weeklyRevenueSek(step) * ECONOMY.startLoanWeeksOfRevenue);
}


/**
 * Vid dagens slut: kommer Åsas erbjudande om nästa steg? Ett erbjudande som
 * redan står (erbjudet eller avböjt) står kvar.
 */
export function offerAtNight(state: SimulationState): SimulationState {
  const ladder = ladderOf(state);
  if (!ladder || (state.economy.risk?.closedWeek ?? null) !== null) return state;
  const to = nextStep(ladder.step);
  if (!to || (ladder.offer && ladder.offer.to === to)) return state.ladder ? state : { ...state, ladder };
  if (missingFor(state, to).length > 0) return state.ladder ? state : { ...state, ladder };
  const offer: LadderOffer = { to, depositSek: depositSek(to, state.medals), loanSek: purchaseLoanSek(to), state: 'offered', offeredOnDay: state.day.dayNumber };
  return { ...state, ladder: { ...ladder, offer } };
}

/**
 * ORDER 315b — inträdet: när spelaren klarat inträdesprovet i introduktionen
 * erbjuder Åsa foodtrucken vid Torget (ersätter bankens val av första
 * verksamhet). Ingen insats och inget lån.
 */
export function introOffer(state: SimulationState): LadderOffer | null {
  if (introductionStep(state) !== 'bank') return null;
  return { to: 'foodtruck', depositSek: 0, loanSek: 0, state: state.introduction?.truckDeclined ? 'declined' : 'offered', offeredOnDay: state.day.dayNumber };
}

/** Erbjudandet som står nu: nästa steg, eller foodtrucken i introduktionen. */
export function currentOffer(state: SimulationState): LadderOffer | null {
  return ladderOf(state)?.offer ?? introOffer(state);
}

/** ORDER 315b — foodtrucken öppnas: utan lån, laget kocken (spelaren) och medhjälparen. */
export function openFoodtruck(state: SimulationState): SimulationState {
  const opened = openFirstBusiness(state, 'foodtruck');
  return {
    ...opened,
    // Foodtruckens lag: spelaren vid grillen (kocken) och medhjälparen.
    team: teamForClass(state.team, TEAM_BY_CLASS.roles.foodtruck, false, state.day.dayNumber),
    economy: { ...opened.economy, loan: null },
    ladder: { step: 'foodtruck', reachedOnDay: { foodtruck: state.day.dayNumber }, offer: null }
  };
}

/** Kan spelaren ta erbjudandet nu? Bara på morgonen, och insatsen ska finnas i kassan. */
export function canTakeOffer(state: SimulationState): 'ok' | 'none' | 'notMorning' | 'cash' {
  const offer = currentOffer(state);
  if (!offer) return 'none';
  if (state.day.period !== 'morning') return 'notMorning';
  if (state.cash < offer.depositSek) return 'cash';
  return 'ok';
}

/** "Ta över": köpet (insatsen och lånet) och nästa steg. */
export function takeOffer(state: SimulationState): SimulationState {
  if (canTakeOffer(state) !== 'ok') return state;
  if (introOffer(state)) return openFoodtruck(state);
  const ladder: LadderState = ladderOf(state)!;
  const offer: LadderOffer = ladder.offer!;
  const toSpec = stepSpec(offer.to);
  const fromClass: BusinessClassId | null = state.economy.businessClass;
  let next: SimulationState;
  if (fromClass !== toSpec.businessClass) {
    // Ny verksamhet (foodtrucken → vinbaren): klassbytet med den nya lokalens
    // lån och lag; ryktet följer med oförändrat.
    // Insatsen är klassens (stegets faktor är 1 för vinbaren).
    const changed = changeClass(state, toSpec.businessClass, false);
    next = { ...changed, reputation: state.reputation * LADDER.reputationFactorOnPurchase };
  } else {
    // Ombyggnad i samma hus (vinbaren → bistron): insatsen ur kassan och
    // ombyggnaden till lånet.
    next = { ...state, ledger: [...state.ledger] };
    applyCashDelta(next, -offer.depositSek);
    postLedger(next, { category: 'other', amount: -offer.depositSek, cause: strings.economy.ledger.deposit });
    const loan = state.economy.loan;
    next.economy = {
      ...state.economy,
      loan: loan
        ? { ...loan, originalSek: loan.originalSek + offer.loanSek, principalSek: loan.principalSek + offer.loanSek }
        : { originalSek: offer.loanSek, principalSek: offer.loanSek, weeksLeft: LOAN.amortisationWeeks }
    };
    next.day = { ...next.day, cashAtDayStart: (state.day.cashAtDayStart ?? state.cash) - offer.depositSek };
  }
  return {
    ...next,
    ladder: { step: offer.to, reachedOnDay: { ...ladder.reachedOnDay, [offer.to]: state.day.dayNumber }, offer: null }
  };
}

/** "Inte än": erbjudandet står kvar. */
export function declineOffer(state: SimulationState): SimulationState {
  const intro = introOffer(state);
  if (intro) return intro.state === 'declined' ? state : { ...state, introduction: { ...state.introduction!, truckDeclined: true } };
  const ladder = ladderOf(state);
  if (!ladder?.offer || ladder.offer.state === 'declined') return state;
  return { ...state, ladder: { ...ladder, offer: { ...ladder.offer, state: 'declined' } } };
}
