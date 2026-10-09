// ORDER 321 (Anders 2026-10-09) — provspelsläget: börja direkt i foodtrucken, vinbaren eller bistron.
//
// Öppnas med ?prov i adressen (http://localhost:4173/?prov) och syns inte i det vanliga spelet. Startskärmen
// (ProvStart.tsx) väljer var, veckan i säsongen, kassan, vädret och, om man vill, en situation som tvingas fram
// den första kvällen. Tillståndet byggs längs spelets egen väg (weekHarness startInFoodtruck och Åsas
// erbjudande, sim/ladder.ts takeOffer), så att laget, lånet och rummet blir som när spelaren når steget:
//   foodtrucken: introduktionen, inträdesprovet och erbjudandet om vagnen;
//   vinbaren:    därtill erbjudandet om vinbaren;
//   bistron:     därtill erbjudandet om bistron, utan de stängda dagarna för ombyggnaden.
// Medaljerna och kraven för steget räknas som uppfyllda (balance.ts LADDER.requirements och FOODTRUCK).
// Ett provspel sparas aldrig (sim/save.ts savesForDayChange, SaveContext), så det når inte portfolion.
// ORDER 322 C (Anders 2026-10-09) — krogen heter verksamhetens riktiga namn: namnet i det senast sparade spelet
// (liggarens namn, SaveFile.businessName), annars Designs exempel Hyttgrillen (prov.businessName). Det går att
// skriva ett annat på startskärmen.

import { reducer } from '../simulation/reducer';
import { makeNewGameState } from '../simulation/model';
import { firstDayOfWeek } from '../../sim/calendar';
import { FOODTRUCK, LADDER, RISK, SEASON } from '../../sim/balance';
import { depositSek, missingFor, purchaseLoanSek, takeOffer } from '../../sim/ladder';
import { stepSpec, type PlayableStep } from '../../sim/ladderStep';
import { incidentBankFor } from '../../sim/incidentBank';
import { TRUCK_WEATHERS, type TruckWeatherKind } from '../../sim/truckLife';
import type { MedalLevel } from '../../sim/balance';
import { awardMedal } from '../knowledge/pavilionVisit';
import { readSlot, slotNumbers, type SaveStore } from '../../sim/save';
import type { PavilionKey, SimulationState } from '../types';

export type ProvPlace = PlayableStep;
export const PROV_PLACES: readonly ProvPlace[] = LADDER.playable;
export type ProvWeather = 'auto' | TruckWeatherKind;
export const PROV_WEATHERS: readonly ProvWeather[] = ['auto', ...TRUCK_WEATHERS];
export const PROV_WEEKS: readonly number[] = Array.from({ length: SEASON.weeks }, (_, i) => i + 1);

export interface ProvSetup {
  place: ProvPlace;
  week: number;
  cashSek: number;
  weather: ProvWeather;
  /** Situationen som tvingas fram den första kvällen, eller null. */
  incidentId: string | null;
  /** Verksamhetens namn; tomt ger det sparade eller exemplet (savedBusinessName, prov.businessName). */
  name: string;
}

/** Är adressens sökdel ?prov (ensam eller bland andra)? Värdet spelar ingen roll; ?prova är inte prov. */
export function isProvSearch(search: string): boolean {
  return new URLSearchParams(search).has('prov');
}

/** Kassan förifylld för steget: spelets startkassa i foodtrucken, annars stegets krav på kassan. */
export function defaultCashSek(place: ProvPlace): number {
  return LADDER.requirements[place]?.cashSek ?? RISK.startCashSek;
}

export function defaultSetup(place: ProvPlace = 'foodtruck'): ProvSetup {
  return { place, week: 1, cashSek: defaultCashSek(place), weather: 'auto', incidentId: null, name: '' };
}

/** Namnet i det senast sparade spelet (bara läst; provspelet skriver aldrig), eller null. */
export function savedBusinessName(store: Pick<SaveStore, 'getItem'> | null): string | null {
  if (!store) return null;
  let best: { at: string; name: string } | null = null;
  for (const n of slotNumbers()) {
    const slot = readSlot(store as SaveStore, n);
    const name = slot.status === 'ok' ? slot.file.businessName?.trim() : null;
    if (slot.status === 'ok' && name && (!best || slot.file.savedAt > best.at)) best = { at: slot.file.savedAt, name };
  }
  return best?.name ?? null;
}

/** Situationerna som kan komma på platsen (banken för stegets klass; bistron spelar vinbarens). */
export function provIncidents(place: ProvPlace): { id: string; title: string }[] {
  return incidentBankFor(stepSpec(place).businessClass).map((i) => ({ id: i.id, title: i.text.title }));
}

// Inträdesprovet i introduktionen, som i spelarens flöde (weekHarness.ts startInFoodtruck: brons i Stensöta).
const ENTRY_EXAM: { pavilion: PavilionKey; level: MedalLevel } = { pavilion: 'stensota', level: 'brons' };

/** Medaljerna som inträdesprovet och kraven för steget och stegen före det begär. Höjs med awardMedal, som
 *  aldrig sänker en medalj (ORDER 264). */
function medalsFor(place: ProvPlace, medals: SimulationState['medals']): SimulationState['medals'] {
  let out = awardMedal(medals, ENTRY_EXAM.pavilion, ENTRY_EXAM.level);
  for (const step of PROV_PLACES.slice(0, PROV_PLACES.indexOf(place) + 1)) {
    for (const m of LADDER.requirements[step]?.medalsRequired ?? []) out = awardMedal(out, m.pavilion as PavilionKey, m.level as MedalLevel);
  }
  return out;
}

/** Nästa steg som spelaren tar: kraven uppfyllda och Åsas erbjudande taget. */
function climb(s: SimulationState, to: ProvPlace): SimulationState {
  const req = LADDER.requirements[to]!;
  const ready: SimulationState = {
    ...s,
    cash: Math.max(s.cash, req.cashSek),
    reputation: Math.max(s.reputation, req.reputationAtLeast),
    medals: medalsFor(to, s.medals),
    ladder: {
      ...s.ladder!, truckSituations: FOODTRUCK.offerMinSituations, truckEvenings: FOODTRUCK.offerMinEvenings,
      offer: { to, depositSek: depositSek(to, s.medals), loanSek: purchaseLoanSek(to), state: 'offered', offeredOnDay: s.day.dayNumber }
    }
  };
  if (missingFor(ready, to).length > 0) throw new Error(`Provspelet: kraven för ${to} är inte uppfyllda`);
  const next = takeOffer(ready);
  if (next.ladder?.step !== to) throw new Error(`Provspelet: erbjudandet om ${to} gick inte att ta`);
  return next;
}

/** Tillståndet för provspelet: steget, veckan (dess måndag, morgonen), kassan, vädret och situationen. */
export function buildProvState(setup: ProvSetup, seed: number): SimulationState {
  const day = firstDayOfWeek(setup.week);
  let s = reducer(makeNewGameState(seed), { type: 'BEGIN_INTRODUCTION' });
  s = { ...s, introduction: { practiced: true }, medals: medalsFor('foodtruck', s.medals), day: { ...s.day, dayNumber: day } };
  s = reducer(s, { type: 'LADDER_TAKE' });
  for (const step of PROV_PLACES.slice(1, PROV_PLACES.indexOf(setup.place) + 1)) s = climb(s, step);
  const incidentId = setup.incidentId && provIncidents(setup.place).some((i) => i.id === setup.incidentId) ? setup.incidentId : null;
  return {
    ...s,
    cash: setup.cashSek,
    day: { ...s.day, cashAtDayStart: setup.cashSek },
    // Bistron öppnar direkt: ombyggnaden är redan gjord.
    // Kraven för vinbaren (klarade situationer och kvällar i foodtrucken) räknas som uppfyllda också efter köpet.
    ladder: { ...s.ladder!, offer: null, refit: null, ...(setup.place === 'foodtruck' ? {} : { truckSituations: FOODTRUCK.offerMinSituations, truckEvenings: FOODTRUCK.offerMinEvenings }) },
    prov: { weather: setup.weather === 'auto' ? null : setup.weather, incidentId, incidentDay: day }
  };
}
