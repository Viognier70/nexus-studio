// ORDER 266 (Nexus v1 etapp 4) — ryktets återhämtning och händelser ur
// simuleringen.
//
// Speldesign > Ryktet: "Det återhämtar sig långsamt av sig självt och
// snabbare genom händelser … Varje återhämtning nämns i händelse-
// strömmen." > Händelser: "Händelser uppstår ur simuleringen, inte ur en
// kortlek. Dålig hygien leder till inspektion, gott rykte till en
// recensent, svag kassa till ett samtal från banken. Varje händelse har
// en orsak som kvällsberättelsen kan peka på."
//
// Alla tal kommer från balance.ts. Händelserna skrivs i strömmen med
// kind 'v1_*' och en orsak i texten; morgonens händelser visas också på
// morgonraden (strategic/scenario/DayActionBar.tsx).

import { EVENTS, REPUTATION } from './balance';
import { strings } from '../content/strings';
import { applyCashCost, postLedger } from '../strategic/simulation/cashReading';
import { businessHasMiseEnPlace } from '../strategic/business/businessClass';
import type { EventStreamCauseTag, EventStreamEntry, SimulationState } from '../strategic/types';
import { hashKey } from '../strategic/util/hash';
import { abilityActive } from './shop';
import { t as tt } from '../content/nexusStrings';
import { getLanguage } from '../content/language';

export interface ServiceEventsState {
  inspectionDue: boolean;
  reviewerTonight: boolean;
  // ORDER 296 — gårdagens recension, som står i morgonens tidning.
  paperReview?: 'good' | 'bad' | 'mixed' | null;
}

export function initialServiceEvents(): ServiceEventsState {
  return { inspectionDue: false, reviewerTonight: false };
}

const share = (points: number) => points / REPUTATION.scale;

function post(draft: SimulationState, kind: string, text: string, positive: boolean, causeTag: EventStreamCauseTag | null = null): void {
  const entry: EventStreamEntry = {
    at: draft.simTime,
    text,
    category: positive ? 'positive' : 'ambient',
    causeTag,
    causeChainId: null,
    sustainability: 'social',
    kind,
    scenarioId: null
  };
  draft.eventStream = [...draft.eventStream, entry];
}

function raiseReputation(draft: SimulationState, points: number, cap = 1): void {
  draft.reputation = Math.min(cap, draft.reputation + share(points));
}

function lowerReputation(draft: SimulationState, points: number): void {
  draft.reputation = Math.max(share(REPUTATION.floor), draft.reputation - share(points));
}

// ORDER 296 — kommer recensenten i kväll? Gott rykte drar henne alltid
// (reviewerReputationAtLeast); annars kommer hon ibland, oftare ju bättre
// ryktet är. Samma svar på morgonen (förmågan critic) och när dörrarna öppnar.
export function reviewerComes(state: SimulationState): boolean {
  if (state.reputation >= share(EVENTS.reviewerReputationAtLeast)) return true;
  const chance = EVENTS.reviewerChanceBase + EVENTS.reviewerChancePerReputation * state.reputation;
  // Dagen först i nyckeln: FNV-1a sprider dåligt när bara slutet skiljer.
  return hashKey(state.seed ?? 0, `${state.day.dayNumber}|reviewer`) < chance;
}

// När servicen öppnar: kommer det en recensent i kväll?
export function onServiceOpen(draft: SimulationState): void {
  const reviewer = reviewerComes(draft);
  draft.serviceEvents = { ...draft.serviceEvents, reviewerTonight: reviewer };
  if (reviewer) post(draft, 'v1_reviewer_booked', strings.service.events.reviewerBooked, false);
}

// När servicen stänger: en kväll utan returer, recensentens omdöme, och
// om stationerna lämnats ostädade (inspektion nästa morgon).
// `prev` är tillståndet före stängningen (räknarna nollställs vid stängning).
export function onServiceClose(draft: SimulationState, prev: SimulationState, branch: string): void {
  const e = strings.service.events;
  // En kväll som föll ihop är aldrig en kväll utan returer.
  const clean = branch !== 'collapsed' && prev.metrics.giveUpsThisService === 0 && prev.day.walkedCount === 0;
  // Återhämtning (F26): händelserna lyfter ett lågt rykte mot målet,
  // inte över det ("Det återhämtar sig … snabbare genom händelser").
  const target = share(REPUTATION.recoveryTarget);
  if (clean && draft.reputation < target) {
    raiseReputation(draft, REPUTATION.cleanEveningBonus, target);
    post(draft, 'v1_recovery_clean', e.cleanEvening, true);
  }
  if (prev.serviceEvents.reviewerTonight) {
    // ORDER 296 — signaturrätten: recensenten frågar efter den, och en kväll
    // som inte föll ihop blir en god recension.
    const signature = abilityActive(prev, 'signature') && branch !== 'collapsed';
    draft.serviceEvents = { ...draft.serviceEvents, paperReview: signature || branch === 'good' ? 'good' : branch === 'thin' || branch === 'collapsed' ? 'bad' : 'mixed' };
    if (signature || branch === 'good') {
      raiseReputation(draft, EVENTS.reviewerReputationChange);
      post(draft, 'v1_review', e.reviewGood, true);
    } else if (branch === 'thin' || branch === 'collapsed') {
      lowerReputation(draft, EVENTS.reviewerReputationChange);
      post(draft, 'v1_review', e.reviewBad, false);
    } else {
      post(draft, 'v1_review', e.reviewMixed, false);
    }
  }
  // Lägsta nivån under kvällen: stationerna fylls på av personalen, så
  // nivån vid stängning säger inte om de hållits rena hela kvällen.
  // ORDER 268 — bara i klasser som har mise en place. Food trucken har
  // inga stationer att hålla (hasMiseEnPlace false, ORDER 111); nivån
  // stod där på noll och gav en inspektion med avgift varje morgon.
  const stations = businessHasMiseEnPlace(prev.businessClass)
    ? prev.day.minStationsReadiness ?? prev.day.prepReadiness?.stations
    : undefined;
  const dirty = stations !== undefined && stations < EVENTS.inspectionStationsBelow;
  draft.serviceEvents = { inspectionDue: dirty, reviewerTonight: false, paperReview: draft.serviceEvents.paperReview ?? null };
}

// När en ny morgon börjar: långsam självläkning, inspektion och banken.
// `bankWarning` är gårdagens varning från ekonomins dagsavslut.
export function onNewMorning(draft: SimulationState, bankWarning: string | null): void {
  const e = strings.service.events;
  const target = share(REPUTATION.recoveryTarget);
  if (draft.reputation < target) {
    raiseReputation(draft, REPUTATION.dailyRecovery, target);
    post(draft, 'v1_recovery_slow', e.slowRecovery, true);
  }
  if (draft.serviceEvents.inspectionDue) {
    lowerReputation(draft, EVENTS.inspectionReputationHit);
    applyCashCost(draft, EVENTS.inspectionFineSek);
    postLedger(draft, { category: 'other', amount: -EVENTS.inspectionFineSek, cause: e.inspectionLedger });
    post(draft, 'v1_inspection', e.inspection, false);
    draft.serviceEvents = { ...draft.serviceEvents, inspectionDue: false };
  }
  if (bankWarning) post(draft, 'v1_bank_call', e.bankCall, false);
  // ORDER 296 — recensionen står i morgonens tidning.
  const review = draft.serviceEvents.paperReview ?? null;
  if (review) {
    const lang = getLanguage();
    post(draft, 'v1_review_paper', tt(lang, review === 'good' ? 'review.paper.good' : review === 'bad' ? 'review.paper.bad' : 'review.paper.mixed'), review === 'good', 'reviewer');
    draft.serviceEvents = { ...draft.serviceEvents, paperReview: null };
  }
  // ORDER 296 — förvarning om recensenten (butiken): kommer hon i kväll?
  if (abilityActive(draft, 'critic') && reviewerComes(draft)) {
    post(draft, 'v1_reviewer_warning', tt(getLanguage(), 'review.warning'), false, 'reviewer');
  }
}

// Dagens händelser från simuleringen (för morgonraden).
export function eventsSince(state: SimulationState, since: number): EventStreamEntry[] {
  return state.eventStream.filter((x) => x.at >= since && x.kind.startsWith('v1_'));
}

// Varje tick under servicen: följ stationernas lägsta nivå (hygien),
// från att dörrarna öppnat. Under förberedelserna byggs nivån upp från
// nästan noll; det är inte ostädat, det är mise en place som pågår.
export function trackHygiene(draft: SimulationState): void {
  if (!draft.day.doorsOpenedThisService) return;
  const stations = draft.day.prepReadiness?.stations;
  if (stations === undefined) return;
  const min = draft.day.minStationsReadiness;
  if (min === undefined || stations < min) draft.day = { ...draft.day, minStationsReadiness: stations };
}
