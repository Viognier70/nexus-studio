// ORDER 316 — fikat efter stängning (Anders 2026-10-07, BESLUT del 1).
//
// "Efter stängning tar laget en fika. En i personalen kommer fram med en
// fråga av komplex natur." Högst ett dilemma per kväll, utlöst av något som
// hänt under kvällen (content/fika/dilemmas.ts triggers); har inget av det
// hänt kommer inget dilemma. Samma dilemma kan komma igen tidigast efter två
// veckor (FIKA.repeatAfterDays), och portfolion (fika.log) visar om svaret
// har förändrats.
//
// Följderna i ordning: personalens trivsel och lojalitet (den som frågade
// dubbelt), sedan i vissa fall ekonomin, sist krediter i Phronesis. "Gå hem"
// finns alltid: hela laget tappar lite trivsel. Ett dilemma som står obesvarat
// när kvällen tar slut räknas som "Gå hem".
//
// Valet av dilemma läser inte simuleringens slump (rngState), så att resten
// av kvällen och harnessens tal inte flyttas av fikat.

import type { SimulationState, StaffMember } from '../strategic/types';
import { DILEMMAS, FIKA_PEOPLE, STAFF_ROLE_OF, dilemmaById, type Dilemma, type DilemmaGrade, type DilemmaOptionId, type DilemmaTrigger, type FikaPerson } from '../content/fika/dilemmas';
import { FIKA } from './balance';
import { calendarFor } from './calendar';
import { wellbeingOf, staminaOf } from './staffCondition';
import { hashKey } from '../strategic/util/hash';
import { incidentBankFor } from './incidentBank';

export interface FikaEntry {
  day: number;
  dilemmaId: string;
  // null: "Gå hem".
  optionId: DilemmaOptionId | null;
  grade: DilemmaGrade | null;
  // Samma dilemma tidigare: om nivån eller svaret ändrades sedan dess.
  changed?: boolean;
}

export interface FikaTonight {
  day: number;
  dilemmaId: string;
  answer: DilemmaOptionId | 'home' | null;
  previous: FikaEntry | null;
  // Följderna som bokfördes, till kortet efter svaret.
  outcome?: FikaOutcome;
}

export interface FikaOutcome {
  grade: DilemmaGrade | null;
  wellbeingPoints: number;
  askerLoyaltyPoints: number;
  credits: number;
  costSek: number;
  inspectionRisk: boolean;
  quitRisk: boolean;
  suggestAbility: string | null;
}

export interface FikaState {
  tonight: FikaTonight | null;
  log: FikaEntry[];
  loyalty: Partial<Record<FikaPerson, number>>;
  inspectionRiskUntilDay?: number | null;
  suggested?: string[];
}

export function fikaOf(state: Pick<SimulationState, 'fika'>): FikaState {
  return state.fika ?? { tonight: null, log: [], loyalty: {} };
}

export function loyaltyOf(state: Pick<SimulationState, 'fika'>, person: FikaPerson): number {
  return fikaOf(state).loyalty[person] ?? FIKA.loyaltyStart;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function triggerHolds(state: SimulationState, t: DilemmaTrigger): boolean {
  const d = state.day;
  switch (t.kind) {
    case 'incident': return (state.incidents?.fired ?? []).some((id) => t.ids.includes(id));
    case 'prepBacklog': return (d.prepBacklogMin ?? 0) > 0;
    case 'delivery': return !!d.stockBoughtToday;
    case 'tips': return (d.tipsSek ?? 0) >= FIKA.tipsAtLeastSek;
    case 'weekend': { const wd = calendarFor(d.dayNumber).weekday; return wd === 'fri' || wd === 'sat'; }
    case 'teamChanged': return state.teamChangedDay === d.dayNumber;
    case 'turnedAway': return (d.turnedAwayFull ?? 0) > 0;
    case 'longWait': return (d.walkedCount ?? 0) > 0 || (state.metrics.giveUpsThisService ?? 0) > 0;
    case 'lowWellbeing': return state.staff.some((s) => wellbeingOf(s) < FIKA.lowWellbeingBelow);
    case 'lowStamina': return state.staff.some((s) => staminaOf(s) < FIKA.lowStaminaBelow);
    case 'tiredTeam': return state.staff.length > 0 && state.staff.reduce((a, s) => a + staminaOf(s), 0) / state.staff.length < FIKA.tiredTeamBelow;
  }
}

/** Dilemman vars utlösare har hänt i kväll och som inte kommit de senaste två veckorna. */
export function eligibleDilemmas(state: SimulationState): Dilemma[] {
  const log = fikaOf(state).log;
  const day = state.day.dayNumber;
  return DILEMMAS.filter((dl) => {
    const last = [...log].reverse().find((e) => e.dilemmaId === dl.id);
    if (last && day - last.day < FIKA.repeatAfterDays) return false;
    return dl.triggers.some((t) => triggerHolds(state, t));
  });
}

/**
 * När servicen stänger: kvällens dilemma, eller inget. Bara i klasser med
 * händelser (laget i rummet) och när en verksamhet finns.
 */
export function planFika(draft: SimulationState): void {
  const fika = fikaOf(draft);
  if (!draft.economy.businessClass || incidentBankFor(draft.economy.businessClass).length === 0) {
    if (fika.tonight) draft.fika = { ...fika, tonight: null };
    return;
  }
  const pool = eligibleDilemmas(draft);
  if (pool.length === 0) {
    draft.fika = { ...fika, tonight: null };
    return;
  }
  const r = hashKey(draft.seed ?? 0, `${draft.day.dayNumber}|fika`);
  const dilemma = pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
  const previous = [...fika.log].reverse().find((e) => e.dilemmaId === dilemma.id) ?? null;
  draft.fika = { ...fika, tonight: { day: draft.day.dayNumber, dilemmaId: dilemma.id, answer: null, previous } };
}

/** Står ett dilemma obesvarat i kväll? */
export function fikaPending(state: Pick<SimulationState, 'fika' | 'day'>): boolean {
  const t = state.fika?.tonight;
  return !!t && t.day === state.day.dayNumber && t.answer === null;
}

/** Har kvällen ett dilemma (besvarat eller inte)? */
export function fikaTonight(state: Pick<SimulationState, 'fika' | 'day'>): FikaTonight | null {
  const t = state.fika?.tonight;
  return t && t.day === state.day.dayNumber ? t : null;
}

function withWellbeing(staff: StaffMember[], points: number, askerRole: string | null, askerPoints: number): StaffMember[] {
  return staff.map((s) => {
    const extra = askerRole !== null && s.role === askerRole ? askerPoints : 0;
    return { ...s, wellbeing: clamp01(wellbeingOf(s) + (points + extra) * FIKA.wellbeingPerPoint) };
  });
}

function withLoyalty(loyalty: FikaState['loyalty'], points: number, asker: FikaPerson | null, askerPoints: number): FikaState['loyalty'] {
  const out: FikaState['loyalty'] = { ...loyalty };
  for (const p of FIKA_PEOPLE) {
    const extra = p === asker ? askerPoints : 0;
    out[p] = clamp01((loyalty[p] ?? FIKA.loyaltyStart) + (points + extra) * FIKA.loyaltyPerPoint);
  }
  return out;
}

/**
 * Spelarens svar. Följderna bokförs i tillståndet; krediterna i Phronesis
 * (FikaOutcome.credits) bokför reducern som frågornas krediter. Kostnaden
 * dras ur kassan av reducern (FikaOutcome.costSek).
 */
export function answerFika(draft: SimulationState, optionId: DilemmaOptionId): FikaOutcome | null {
  const fika = fikaOf(draft);
  const t = fika.tonight;
  if (!t || t.day !== draft.day.dayNumber || t.answer !== null) return null;
  const dilemma = dilemmaById(t.dilemmaId);
  const option = dilemma?.options.find((o) => o.id === optionId);
  if (!dilemma || !option) return null;
  const g = option.grade;
  const econ = option.economy ?? [];
  const quitRisk = econ.some((e) => e.kind === 'quitRisk');
  const inspectionRisk = econ.some((e) => e.kind === 'inspectionRisk');
  const costSek = econ.reduce((a, e) => a + (e.kind === 'cost' ? FIKA.economy[e.key] : 0), 0);
  const suggest = econ.find((e) => e.kind === 'suggestAbility');
  const outcome: FikaOutcome = {
    grade: g,
    wellbeingPoints: FIKA.wellbeing[g],
    askerLoyaltyPoints: FIKA.loyalty[g] + FIKA.loyalty[g] + (quitRisk ? FIKA.economy.quitRiskLoyalty : 0),
    credits: FIKA.credits[g],
    costSek,
    inspectionRisk,
    quitRisk,
    suggestAbility: suggest && suggest.kind === 'suggestAbility' ? suggest.id : null
  };
  const askerRole = STAFF_ROLE_OF[dilemma.asker] ?? null;
  draft.staff = withWellbeing(draft.staff, FIKA.wellbeing[g], askerRole, FIKA.wellbeing[g]);
  const loyalty = withLoyalty(fika.loyalty, FIKA.loyalty[g], dilemma.asker, FIKA.loyalty[g] + (quitRisk ? FIKA.economy.quitRiskLoyalty : 0));
  const entry: FikaEntry = { day: t.day, dilemmaId: t.dilemmaId, optionId, grade: g, ...(t.previous ? { changed: t.previous.optionId !== optionId } : {}) };
  draft.fika = {
    ...fika,
    loyalty,
    tonight: { ...t, answer: optionId, outcome },
    log: [...fika.log, entry],
    inspectionRiskUntilDay: inspectionRisk ? draft.day.dayNumber + FIKA.economy.inspectionEvenings : fika.inspectionRiskUntilDay ?? null,
    suggested: outcome.suggestAbility ? [...new Set([...(fika.suggested ?? []), outcome.suggestAbility])] : fika.suggested
  };
  return outcome;
}

/** "Gå hem": inget svar, hela laget tappar lite trivsel. */
export function goHomeFika(draft: SimulationState): boolean {
  const fika = fikaOf(draft);
  const t = fika.tonight;
  if (!t || t.day !== draft.day.dayNumber || t.answer !== null) return false;
  draft.staff = withWellbeing(draft.staff, FIKA.goHomeWellbeing, null, 0);
  const outcome: FikaOutcome = { grade: null, wellbeingPoints: FIKA.goHomeWellbeing, askerLoyaltyPoints: 0, credits: 0, costSek: 0, inspectionRisk: false, quitRisk: false, suggestAbility: null };
  draft.fika = {
    ...fika,
    tonight: { ...t, answer: 'home', outcome },
    log: [...fika.log, { day: t.day, dilemmaId: t.dilemmaId, optionId: null, grade: null }]
  };
  return true;
}

/** Tillsynen kommer oftare de närmaste kvällarna efter en genväg (FIKA.economy). */
export function inspectionRiskTonight(state: Pick<SimulationState, 'fika' | 'day'>): boolean {
  const until = state.fika?.inspectionRiskUntilDay;
  return until !== null && until !== undefined && state.day.dayNumber <= until;
}

/** Ska kvällens nästa situation bli tillsynen (när den kan komma)? */
export function prefersInspection(state: SimulationState, n: number): boolean {
  if (!inspectionRiskTonight(state)) return false;
  return hashKey(state.seed ?? 0, `${state.day.dayNumber}|${n}|fika-tillsyn`) < FIKA.economy.inspectionShare;
}

