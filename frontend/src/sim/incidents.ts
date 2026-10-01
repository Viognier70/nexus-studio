// ORDER 270 — händelserna i servicen (Vision Owner 2026-09-26, efter
// provspelet; tillägg efter provspelet 2026-09-27). Speldesign > Servicen >
// Händelserna i servicen.
//
// Servicen är en följd av händelser: 2–4 per kväll, fler fredag och
// lördag, i en båge med öppning, rusning, kris och avslut. Varje händelse
// är en raket med tre frågor i samma sammanhang (Vision Owner 2026-09-27):
// episteme (vad), techne (hur), phronesis (när och varför), var och en med
// sin nedräkning i verklig tid. Nästa steg nås bara genom att klara det
// förra. Fel svar, eller inget svar, ger stegets konsekvens och personalen
// tar över resten med sämre utfall; hela raketen klarad ger bästa utfall.
// Rummet står inte still: servicen fortsätter medan nedräkningen går, så
// att väntan syns. Uteblir svaret kostar det dessutom −1 kredit. Medaljer
// i paviljongen som hör till stegets axel ger mer tid på just det steget
// och, från silver, stryker ett fel alternativ. Varje utfall verkar direkt:
// i kassan, på gästerna (nöjdheten syns i rummet), på personalens ork
// (moralen) och i ryktet. Ett fel val låser: följden pågår synligt i
// rummet tills nästa händelse. Rätt svar kan bero på kvällens läge
// (klockslag, kön, gästerna vid borden). Ett val kan utlösa eller
// förhindra en senare händelse. En händelse om ett bord kommer bara när
// en gäst sitter där.
//
// Talen står i `balance.ts` `INCIDENTS`; händelserna i händelsebanken.

import type { Guest, GuestType, KnowledgeAxis, SimulationState, StaffRole, YrkesSpar } from '../strategic/types';
import { createRng } from '../strategic/util/rng';
import { bumpMorale } from '../strategic/simulation/morale';
import { applyCashDelta, applyCashRevenue, postLedger } from '../strategic/simulation/cashReading';
import { clampReputation } from '../strategic/simulation/reputation';
import { strings } from '../content/strings';
import { rocketClipFor, rocketFigure, type RocketFigure } from './theatreTriggers';
import { ANSWER_EFFECTS, THEATRE, BACK, type Confidence, GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, MENU_ROCKETS, REPUTATION, SERVICE_STREAM, SITTING } from './balance';
import { calendarFor } from './calendar';
import { clampScenarioCash, scenarioUnitSek } from './economy';
import { bestAnswerFactor, medalSteps } from './knowledgeInService';
import {
  fitsMenu,
  incidentBankFor,
  incidentById,
  type AnswerQuality,
  type ArcPhase,
  optionQuality,
  type Incident,
  type IncidentCondition,
  type IncidentOngoingMeta,
  type IncidentOutcomeMeta,
  type IncidentStep,
  type OutcomeText,
  type Reference,
  type StepOptionMeta
} from './incidentBank';

export interface IncidentContext {
  table: number;
  guestIds: string[];
  guest: string;
  wine: string;
  staff: string;
  // Klockslaget i speltid när händelsen kom ("20.30").
  clock: string;
  // ORDER 286a — vem i rummet raketen börjar med, och klippet som spelas först.
  figure?: RocketFigure | null;
}

export interface ActiveIncident {
  id: string;
  openedAt: number;
  // Raketens steg (0 episteme, 1 techne, 2 phronesis). Nedräkningen och de
  // strukna alternativen gäller steget.
  step: number;
  secondsTotal: number;
  secondsLeft: number;
  // Ett fel alternativ i steget som spelarens medaljer strukit.
  struck: string[];
  // ORDER 271 — det förra stegets svar visas (rätt) i `revealLeft`
  // verkliga sekunder innan stegets nedräkning börjar.
  revealed?: StepReveal | null;
  revealLeft?: number;
  // Sant när händelsen kom som följd av ett tidigare val.
  chained: boolean;
  // Kvällens läge när händelsen kom (händelsens `situations`), annars null.
  situation: string | null;
  context: IncidentContext;
  // ORDER 280 — Back your knowledge: spelaren startade raketen själv och
  // väljer säkerhet för varje steg. Rör bara krediterna.
  backed?: boolean;
  // ORDER 284 — i Back your knowledge låses svaret när spelaren väljer det,
  // och stegets klocka stannar, så att hen hinner välja säkerhet ("två
  // raketer gick ut på tid", tredje provspelet).
  picked?: string | null;
  // ORDER 285 — det raketen gett hittills (klarade steg): krediter, varav
  // Back your knowledge, och gäster som kommit in. Summeras i loggen.
  earned?: { credits: number; guestsIn: number };
  // Den andra tidsgränsen efter att svaret är låst (BACK.lockSeconds).
  lockLeft?: number;
  // ORDER 286a — raketen börjar i rummet: figurens klipp spelas i så här
  // många verkliga sekunder innan kortet öppnas och stegets klocka går.
  introLeft?: number;
  // ORDER 292 — vad som står på spel vid bordet när raketen öppnas.
  stake?: TableStake | null;
}

// ORDER 292 (Vision Owner 2026-10-01: "Insatsen före svaret: raketkortet visar
// vad som står på spel i kronor och gäster") — bordets nota (beställda notor,
// och kvällens snittnota för den som inte har beställt), antalet gäster och
// gästtyperna. Stamgäster med namn kommer med veckomålen (287b).
export interface TableStake {
  billSek: number;
  guests: number;
  types: Partial<Record<GuestType, number>>;
}

export function expectedBillSek(state: SimulationState): number {
  const bills = state.day.billsTonight ?? 0;
  const start = state.day.revenueAtServiceStart;
  if (bills > 0 && start !== null && start !== undefined) return Math.round((state.revenue - start) / bills);
  return ANSWER_EFFECTS.stakeDefaultBillSek;
}

export function tableStake(state: SimulationState, guestIds: string[]): TableStake | null {
  const table = state.guests.filter((g) => guestIds.includes(g.id) && PRESENT.includes(g.state));
  if (table.length === 0) return null;
  const typical = expectedBillSek(state);
  const types: Partial<Record<GuestType, number>> = {};
  let billSek = 0;
  for (const g of table) {
    billSek += g.order?.revenueSek ?? typical;
    if (g.guestType) types[g.guestType] = (types[g.guestType] ?? 0) + 1;
  }
  return { billSek: Math.round(billSek), guests: table.length, types };
}

// ORDER 280 — säkerheten spelaren valde (balance.ts Confidence).
export type { Confidence } from './balance';

// ORDER 280 — ett låst svar i Back your knowledge.
export interface BackResult {
  step: number;
  confidence: Confidence;
  correct: boolean;
  // Krediterna svaret gav (negativt vid fel).
  delta: number;
  endsRocket: boolean;
  at: number;
}

// ORDER 280 — kvällens träffsäkerhet per säkerhet: [rätt, totalt].
export type Calibration = [[number, number], [number, number], [number, number]];

// En raket i kvällens logg. `step` är steget där raketen föll (null när
// hela raketen klarades); `optionId` svaret där, null när personalen
// beslutade själv.
export interface IncidentRecord {
  id: string;
  step: number | null;
  optionId: string | null;
  quality: AnswerQuality | 'staff';
  situation: string | null;
  context: IncidentContext;
  at: number;
  // ORDER 285 — vad raketen ändrade, till kvällens händelselogg (Designs
  // leverans 2026-09-29, kvällens resultat): kassan och ryktet ur utfallet
  // (samma tal som lastOutcome.deltas), krediterna och gästerna över alla steg.
  deltas?: { cashSek: number; reputation: number; credits: number; guestsIn: number };
  // ORDER 289 — planerad, följd eller egen (Back your knowledge).
  kind?: 'planned' | 'chained' | 'backed';
}

// ORDER 271 — ett svar i stunden (Design paket 6, R2/R3): valt svar,
// det rätta, och om steget klarades.
export interface StepReveal {
  step: number;
  optionId: string | null;
  correctId: string;
  cleared: boolean;
  // ORDER 276 — gäster som svaret släppte in (raketerna styr gästflödet).
  guestsIn?: number;
}

export interface IncidentDeltas {
  cashSek: number;
  satisfaction: number;
  stamina: number;
  reputation: number;
}

export interface IncidentOutcomeView {
  incidentId: string;
  optionId: string | null;
  // ORDER 271 — steget där raketen föll (null när den klarades), svaret i
  // stunden och vem i personalen som tog över (FRAGOR §49).
  reveal?: StepReveal | null;
  takeover?: { role: StaffRole; memberId: string | null; until: number } | null;
  text: string;
  at: number;
  deltas: IncidentDeltas;
  // ORDER 280 — Back your knowledge: svaret på det sista steget.
  back?: BackResult | null;
}

// Följden av ett fel val, som pågår i rummet tills nästa händelse.
export interface OngoingConsequence extends IncidentOngoingMeta {
  incidentId: string;
  text: string;
  since: number;
  guestIds: string[];
}

export interface LessonItem {
  incidentId: string;
  title: string;
  // Steget där raketen föll och dess fråga.
  stepAxis: KnowledgeAxis;
  question: string;
  chosen: string | null;
  explanation: string;
  better: string;
  betterExplanation: string;
  reference: Reference | null;
}

export interface IncidentsState {
  // Sant under en service där klassen har en händelsebank.
  enabled: boolean;
  slots: { at: number; phase: ArcPhase }[];
  plannedCount?: number;
  queued: string[];
  // Den kedjade händelsens sammanhang (samma bord som valet gällde).
  queuedContext: Record<string, IncidentContext>;
  blocked: string[];
  fired: string[];
  chainsAdded: number;
  serviceEndsAt: number | null;
  active: ActiveIncident | null;
  ongoing: OngoingConsequence | null;
  log: IncidentRecord[];
  lastOutcome: IncidentOutcomeView | null;
  // Kvällens lärdom, satt när servicen stänger och läst i kvällen.
  lesson: LessonItem[] | null;
  // Mognadens evidens (Professionell mognad och portfolio).
  eveningsTurned: number;
  lessonEvenings: number;
  turnedTonight: boolean;
  // ORDER 280 — Back your knowledge: kvällens raketer, krediter att bokföra
  // (positivt = tillbaka, negativt = dras; reducern bokför dem), det
  // senaste låsta svaret och kvällens träffsäkerhet.
  betsTonight?: number;
  betCreditsDue?: number;
  lastBack?: BackResult | null;
  calibration?: Calibration;
}

export function initialIncidents(): IncidentsState {
  return {
    enabled: false, slots: [], queued: [], queuedContext: {}, blocked: [], fired: [], chainsAdded: 0,
    serviceEndsAt: null, active: null, ongoing: null, log: [], lastOutcome: null, lesson: null,
    eveningsTurned: 0, lessonEvenings: 0, turnedTonight: false
  };
}

export function incidentsOf(state: SimulationState): IncidentsState {
  return state.incidents ?? initialIncidents();
}

export function isIncidentOpen(state: SimulationState): boolean {
  return !!state.incidents?.active;
}

// Antal händelser i kväll: efter veckodag, en till under en högtid.
export function incidentsTonight(dayNumber: number): number {
  const cal = calendarFor(dayNumber);
  const base = INCIDENTS.perWeekday[cal.weekday] + (cal.holiday ? INCIDENTS.holidayExtra : 0);
  return Math.max(INCIDENTS.minPerEvening, Math.min(INCIDENTS.maxPerEvening, base));
}

// Bågen: första är öppning, sista avslut, näst sista kris, resten rusning.
export function arcFor(n: number): ArcPhase[] {
  const last = n - 1;
  return Array.from({ length: n }, (_, i): ArcPhase => {
    if (i === 0) return 'opening';
    if (i === last) return 'closing';
    if (i === last - 1) return 'crisis';
    return 'rush';
  });
}

// ---------------------------------------------------------------------
// Kvällens klocka och läge
// ---------------------------------------------------------------------

const MINUTES_PER_HOUR = INCIDENTS.minutesPerHour;

// Klockslaget i spelminuter efter midnatt (servicen 18–23, F31).
export function clockMinutes(state: SimulationState): number {
  const since = Math.max(0, state.simTime - state.day.periodStartAt);
  return SITTING.serviceStartHour * MINUTES_PER_HOUR + Math.floor(since * GAME_MINUTES_PER_SIM_SECOND);
}

// Klockslaget som text i det aktuella språket (ORDER 273, Designs §2):
// "18:00" på engelska, "18.00" på svenska (strängtabellen service.clock.hhmm).
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR);
  const m = minutes % MINUTES_PER_HOUR;
  return strings.service.clock.hhmm(String(h), String(m).padStart(INCIDENTS.clockDigits, '0'));
}

function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * MINUTES_PER_HOUR + (m || 0);
}

function seatedGuests(state: SimulationState): Guest[] {
  return state.guests.filter((g) => PRESENT.includes(g.state) && g.seatIndex !== null);
}

export function conditionHolds(state: SimulationState, c: IncidentCondition | undefined): boolean {
  if (!c) return true;
  const now = clockMinutes(state);
  if (c.from && now < parseClock(c.from)) return false;
  if (c.to && now >= parseClock(c.to)) return false;
  const waiting = state.waitingIds.length;
  if (c.minWaiting !== undefined && waiting < c.minWaiting) return false;
  if (c.maxWaiting !== undefined && waiting > c.maxWaiting) return false;
  const seated = seatedGuests(state).length;
  if (c.minSeated !== undefined && seated < c.minSeated) return false;
  if (c.maxSeated !== undefined && seated > c.maxSeated) return false;
  return true;
}

export function situationFor(state: SimulationState, incident: Incident): string | null {
  return (incident.situations ?? []).find((s) => conditionHolds(state, s.when))?.id ?? null;
}

// ---------------------------------------------------------------------
// Planeringen
// ---------------------------------------------------------------------

// När servicen öppnar: planera kvällens händelser jämnt över tiden med
// öppna dörrar. Utan händelsebank för klassen är händelserna avstängda.
export function planIncidents(state: SimulationState, doorsOpenAt: number, serviceEndsAt: number): SimulationState {
  const prev = incidentsOf(state);
  const reset: IncidentsState = {
    ...initialIncidents(),
    eveningsTurned: prev.eveningsTurned,
    lessonEvenings: prev.lessonEvenings
  };
  if (incidentBankFor(state.economy.businessClass).length === 0) return { ...state, incidents: reset };
  const rng = createRng(state.rngState);
  const n = incidentsTonight(state.day.dayNumber);
  const window = serviceEndsAt - doorsOpenAt;
  const phases = arcFor(n);
  const slots = phases.map((phase, i) => {
    const frac = INCIDENTS.windowStart + (INCIDENTS.windowEnd - INCIDENTS.windowStart) * (n === 1 ? 0 : i / (n - 1));
    const jitter = rng.range(-INCIDENTS.jitter, INCIDENTS.jitter);
    return { at: doorsOpenAt + window * Math.min(INCIDENTS.windowEnd, Math.max(INCIDENTS.windowStart, frac + jitter)), phase };
  }).sort((a, b) => a.at - b.at);
  return {
    ...state,
    rngState: rng.state,
    // ORDER 289 — antalet raketer som planerats i kväll; står still hela
    // kvällen (följdraketer och egna raketer räknas för sig).
    incidents: { ...reset, enabled: true, slots, serviceEndsAt, plannedCount: slots.length }
  };
}

function pick<T>(items: readonly T[], r: number): T {
  return items[Math.min(items.length - 1, Math.floor(r * items.length))];
}

const PRESENT: Guest['state'][] = ['seated', 'ordering', 'dining', 'paying'];

function presentGuests(state: SimulationState): Guest[] {
  return state.guests.filter((g) => g.state !== 'leaving' && g.state !== 'declined' && g.state !== 'arriving');
}

function contextFor(state: SimulationState, r: () => number): IncidentContext {
  const s = strings.service.incident;
  const seated = seatedGuests(state);
  let table: number;
  let guestIds: string[] = [];
  if (seated.length > 0) {
    const g = pick(seated, r());
    table = Math.floor((g.seatIndex ?? 0) / INCIDENTS.seatsPerTable) + 1;
    guestIds = g.partyId ? seated.filter((o) => o.partyId === g.partyId).map((o) => o.id) : [g.id];
  } else {
    table = Math.floor(r() * INCIDENTS.fallbackTables) + 1;
  }
  const roles = state.team.members.map((m) => m.role as string);
  const role = roles.length > 0 ? pick(roles, r()) : null;
  return {
    table,
    guestIds,
    guest: pick(s.guests, r()),
    wine: pick(s.wines, r()),
    staff: (role && s.staffRoles[role]) || s.staffFallback,
    clock: formatClock(clockMinutes(state))
  };
}

// Spelartextens platshållare fylls ur kvällens sammanhang. Första bokstaven
// i varje mening blir stor, eftersom en platshållare kan inleda en mening.
export function formatIncidentText(text: string, ctx: IncidentContext): string {
  const filled = text
    .replace(/\{bord\}/g, String(ctx.table))
    .replace(/\{gäst\}/g, ctx.guest)
    .replace(/\{vin\}/g, ctx.wine)
    .replace(/\{personal\}/g, ctx.staff)
    .replace(/\{klockan\}/g, ctx.clock ?? '');
  return filled.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

// Kan händelsen komma just nu? Kvällens läge stämmer, och finns det ett
// bord i berättelsen sitter en gäst där.
function eligibleNow(state: SimulationState, incident: Incident, context?: IncidentContext): boolean {
  if (!conditionHolds(state, incident.when)) return false;
  if (!incident.needsTable) return true;
  if (context) {
    const present = new Set(seatedGuests(state).map((g) => g.id));
    return context.guestIds.some((id) => present.has(id));
  }
  return seatedGuests(state).length > 0;
}

// Nästa händelse: en kedjad först, annars en ur bågens fas som inte
// kommit i kväll och som kvällens läge tillåter.
function chooseIncident(
  state: SimulationState,
  phase: ArcPhase,
  r: number
): { incident: Incident; chained: boolean; context?: IncidentContext } | null {
  const inc = incidentsOf(state);
  const bank = incidentBankFor(state.economy.businessClass);
  for (const queuedId of inc.queued) {
    if (inc.blocked.includes(queuedId) || inc.fired.includes(queuedId)) continue;
    const q = bank.find((i) => i.id === queuedId);
    const ctx = inc.queuedContext[queuedId];
    if (q && eligibleNow(state, { ...q, when: undefined }, ctx)) return { incident: q, chained: true, context: ctx };
  }
  const weekday = calendarFor(state.day.dayNumber).weekday;
  const menuIds = state.menu.map((m) => m.dishId);
  const free = bank.filter((i) =>
    !i.chainOnly && !inc.fired.includes(i.id) && !inc.blocked.includes(i.id) &&
    (!i.weekdays || i.weekdays.includes(weekday)) && fitsMenu(i, menuIds) && eligibleNow(state, i));
  // ORDER 279 — gästerna frågar om kvällens meny: en raket om en rätt eller
  // dryck på menyn väljs med sannolikheten MENU_ROCKETS.share.
  const onMenu = free.filter((i) => i.requiresOnMenu);
  const others = free.filter((i) => !i.requiresOnMenu);
  const fromMenu = onMenu.length > 0 && (others.length === 0 || r < MENU_ROCKETS.share);
  const group = fromMenu ? onMenu : others;
  const rr = fromMenu ? (others.length === 0 ? r : r / MENU_ROCKETS.share) : (onMenu.length === 0 ? r : (r - MENU_ROCKETS.share) / (1 - MENU_ROCKETS.share));
  const inPhase = group.filter((i) => i.arc === phase);
  const pool = inPhase.length > 0 ? inPhase : group;
  if (pool.length === 0) return null;
  return { incident: pick(pool, Math.min(1 - Number.EPSILON, Math.max(0, rr))), chained: false };
}

// Stegets tid: stegets nedräkning, och mer tid per medaljsteg i
// paviljongen som hör till stegets axel.
export function secondsFor(state: SimulationState, step: IncidentStep): number {
  return INCIDENTS.stepSeconds[step.axis] + INCIDENTS.extraSecondsPerMedalStep * medalSteps(state.medals, step.pavilion);
}

// Från silver i stegets paviljong stryks ett fel alternativ.
function struckFor(state: SimulationState, step: IncidentStep, situation: string | null, r: () => number): string[] {
  if (medalSteps(state.medals, step.pavilion) < INCIDENTS.strikeWrongFromMedalSteps) return [];
  const wrong = step.options.filter((o) => optionQuality(o, situation) === 'wrong');
  return wrong.length > 0 ? [pick(wrong, r()).id] : [];
}

// Öppna nästa händelse när dess tid har kommit (anropas varje tick under
// servicen, efter att dörrarna öppnat). Den förra följden slutar här.
export function maybeOpenIncident(draft: SimulationState): void {
  const inc = draft.incidents;
  if (!inc || !inc.enabled || inc.active || inc.slots.length === 0) return;
  if (draft.day.period !== 'dinner' || !draft.day.doorsOpenedThisService) return;
  const slot = inc.slots[0];
  if (draft.simTime < slot.at) return;
  const rng = createRng(draft.rngState);
  const r = () => rng.next();
  const chosen = chooseIncident(draft, slot.phase, r());
  const slots = inc.slots.slice(1);
  if (!chosen) {
    draft.rngState = rng.state;
    draft.incidents = { ...inc, slots };
    return;
  }
  draft.incidents = { ...inc, slots };
  openIncident(draft, chosen.incident, chosen.chained, chosen.context, false, r);
  draft.rngState = rng.state;
}

// Öppnar en raket: första steget, strukna alternativ och kvällens
// sammanhang. Den förra följden slutar här.
function openIncident(
  draft: SimulationState,
  incident: Incident,
  chained: boolean,
  given: IncidentContext | undefined,
  backed: boolean,
  r: () => number
): void {
  const inc = draft.incidents!;
  const situation = situationFor(draft, incident);
  const first = incident.steps[0];
  const struck = struckFor(draft, first, situation, r);
  const secondsTotal = secondsFor(draft, first);
  const fresh = contextFor(draft, r);
  const base = given ? { ...given, clock: fresh.clock } : fresh;
  // ORDER 286a — figuren och klippet som spelas först (theatreTriggers.ts).
  // Egna raketer (Back your knowledge) börjar direkt.
  const clip = backed ? null : rocketClipFor(incident);
  const figure = rocketFigure(draft, clip, base);
  const context = { ...base, figure };
  const introLeft = figure ? THEATRE.rocketIntroSeconds[figure.clip] : 0;
  const { [incident.id]: _used, ...queuedContext } = inc.queuedContext;
  draft.incidents = {
    ...inc,
    queued: inc.queued.filter((id) => id !== incident.id),
    queuedContext,
    fired: [...inc.fired, incident.id],
    ongoing: null,
    active: { id: incident.id, openedAt: draft.simTime, step: 0, secondsTotal, secondsLeft: secondsTotal, struck, chained, situation, context, backed, introLeft, stake: tableStake(draft, context.guestIds) }
  };
}

// ORDER 280 — Back your knowledge (Vision Owner 2026-09-29, Designs B1):
// spelaren startar själv en raket när ingen annan står öppen, högst
// BACK.maxPerEvening gånger per kväll. Ingen insats krävs för att starta
// (gissar kostar inget); säkerheten väljs för varje steg.
// Provspel av 285 — varför Back your knowledge inte går att starta just nu,
// eller null när den går (samma villkor som canStartBack).
export function whyNotBack(state: SimulationState): 'busy' | 'maxed' | 'noneFits' | 'notOpen' | 'noRockets' | null {
  const inc = state.incidents;
  // ORDER 291 — en verksamhet utan raketer säger det, inte att dörrarna är stängda.
  if (incidentBankFor(state.economy.businessClass).length === 0) return 'noRockets';
  if (!inc?.enabled || state.day.period !== 'dinner' || !state.day.doorsOpenedThisService) return 'notOpen';
  if (inc.active) return 'busy';
  if ((inc.betsTonight ?? 0) >= BACK.maxPerEvening) return 'maxed';
  return backPool(state).length > 0 ? null : 'noneFits';
}

export function canStartBack(state: SimulationState): boolean {
  const inc = state.incidents;
  if (!inc?.enabled || inc.active || state.day.period !== 'dinner' || !state.day.doorsOpenedThisService) return false;
  if ((inc.betsTonight ?? 0) >= BACK.maxPerEvening) return false;
  return backPool(state).length > 0;
}

function backPool(state: SimulationState): Incident[] {
  const inc = incidentsOf(state);
  const menuIds = state.menu.map((m) => m.dishId);
  const seated = seatedGuests(state).length > 0;
  return incidentBankFor(state.economy.businessClass).filter((i) =>
    !i.chainOnly && !inc.fired.includes(i.id) && fitsMenu(i, menuIds) && (!i.needsTable || seated));
}

export function startBack(draft: SimulationState): boolean {
  if (!canStartBack(draft)) return false;
  const rng = createRng(draft.rngState);
  const r = () => rng.next();
  const pool = backPool(draft);
  // Helst en raket om kvällens meny.
  const onMenu = pool.filter((i) => i.requiresOnMenu);
  const inc = draft.incidents!;
  openIncident(draft, pick(onMenu.length > 0 ? onMenu : pool, r()), false, undefined, true, r);
  draft.incidents = { ...draft.incidents!, betsTonight: (inc.betsTonight ?? 0) + 1 };
  draft.rngState = rng.state;
  return true;
}

export function totalCredits(state: SimulationState): number {
  return state.knowledgeCredits.episteme + state.knowledgeCredits.techne + state.knowledgeCredits.phronesis;
}

// Kan spelaren stå för ett svar på den här säkerheten? Bara om krediterna
// räcker till förlusten (Designs canBack).
export function canBack(state: SimulationState, c: Confidence): boolean {
  return totalCredits(state) >= BACK.confidence[c].loss;
}

// Ett låst svar: krediterna efter säkerhet och steg (Designs backAnswer).
// Ingen slump: samma svar och samma säkerhet ger alltid samma krediter.
export function backAnswer(correct: boolean, c: Confidence, step: number): { delta: number; endsRocket: boolean } {
  const conf = BACK.confidence[c];
  const last = INCIDENTS.stepAxes.length - 1;
  return correct
    ? { delta: Math.round(conf.win * (BACK.stepMultiplier[step] ?? 1)), endsRocket: step === last }
    : { delta: 0 - conf.loss, endsRocket: true };
}

export function recordCalibration(cal: Calibration | undefined, c: Confidence, correct: boolean): Calibration {
  const n = (cal ?? [[0, 0], [0, 0], [0, 0]]).map((x) => [...x]) as Calibration;
  n[c][1]++;
  if (correct) n[c][0]++;
  return n;
}

export type CalibrationNote = 'overconfident' | 'underconfident' | 'default';
export function calibrationNote(cal: Calibration | undefined): CalibrationNote {
  if (!cal) return 'default';
  const [g, , k] = cal;
  if (k[1] >= BACK.calibrationMinAnswers && k[0] / k[1] < BACK.calibrationShare) return 'overconfident';
  if (g[1] >= BACK.calibrationMinAnswers && g[0] / g[1] >= BACK.calibrationShare) return 'underconfident';
  return 'default';
}

// Bokför ett låst svar i Back your knowledge (anropas av resolveIncident).
function settleBack(draft: SimulationState, step: number, c: Confidence, correct: boolean): BackResult {
  const { delta, endsRocket } = backAnswer(correct, c, step);
  const inc = draft.incidents!;
  const result: BackResult = { step, confidence: c, correct, delta, endsRocket, at: draft.simTime };
  draft.incidents = {
    ...inc,
    betCreditsDue: (inc.betCreditsDue ?? 0) + delta,
    lastBack: result,
    calibration: recordCalibration(inc.calibration, c, correct)
  };
  return result;
}

// ORDER 279 — "Rätt svar ger högre dricks": bordets gäster lämnar en större
// andel av notan i dricks (läses i reducern vid betalningen).
function raiseTips(draft: SimulationState, ctx: IncidentContext, share: number): void {
  if (share <= 0) return;
  for (const g of draft.guests) if (ctx.guestIds.includes(g.id)) g.tipBonus = (g.tipBonus ?? 0) + share;
}

// ORDER 290 — svarens följd syns i rummet (Vision Owner 2026-09-30): rätt
// svar ger en högre nota vid bordet (och gäster som kommer in, letGuestsIn);
// fel svar ger en lägre nota, missnöjda gäster vid bordet och en gäst i kön
// som går. Händelsen står över bordet i rummet (day.roomReactions).
// ORDER 292 (Vision Owner 2026-10-01: "Följden efter svaret, i rummet och i
// kassan") — rätt svar: bordet beställer mer nu, och beloppet går in i
// kvällskassan direkt (bordets nota gånger rightBillShare; förut lades samma
// andel på notan vid betalningen). Fel svar: en gäst vid bordet går utan att
// betala, stolen blir tom och hens nota går förlorad; de andra vid bordet blir
// missnöjda. Utan gäster vid bordet går en gäst i kön, som förut.
function answerConsequence(draft: SimulationState, ctx: IncidentContext, right: boolean, guestsIn: number, keepTable = false): void {
  const table = draft.guests.filter((g) => ctx.guestIds.includes(g.id) && PRESENT.includes(g.state));
  let left = 0;
  let amountSek = 0;
  let leftGuestId: string | null = null;
  if (right) {
    const stake = tableStake(draft, ctx.guestIds);
    amountSek = stake ? Math.round(stake.billSek * ANSWER_EFFECTS.rightBillShare) : 0;
    if (amountSek > 0 && (draft.day.period === 'dinner' || draft.day.period === 'lunch')) {
      applyCashRevenue(draft, amountSek);
      // Kassabokens försäljningsrad vid stängningen läser serviceperiodens summa (kSEK).
      if (draft.day.period === 'dinner') draft.serviceRevenueToday = { ...draft.serviceRevenueToday, dinner: draft.serviceRevenueToday.dinner + amountSek / SERVICE_STREAM.sekPerKsek };
      else draft.serviceRevenueToday = { ...draft.serviceRevenueToday, lunch: draft.serviceRevenueToday.lunch + amountSek / SERVICE_STREAM.sekPerKsek };
      // Gästtypens intäkt i kväll (som guestTypes.ts recordTypeRevenue;
      // importeras inte, för att undvika ett cirkelberoende).
      const payer = table[0];
      if (payer?.guestType) {
        const rev = { ...(draft.day.guestTypeRevenue ?? {}) };
        rev[payer.guestType] = (rev[payer.guestType] ?? 0) + amountSek;
        draft.day = { ...draft.day, guestTypeRevenue: rev };
      }
    }
  } else if (table.length > 0 && keepTable) {
    // Felet köade en följdraket vid samma bord: gästerna stannar (följden är
    // nästa raket), men bordet beställer mindre.
    const stake = tableStake(draft, ctx.guestIds);
    amountSek = stake ? Math.round(stake.billSek * ANSWER_EFFECTS.wrongBillShare) : 0;
    for (const g of table) {
      g.billBonus = (g.billBonus ?? 0) + ANSWER_EFFECTS.wrongBillShare;
      g.satisfaction = Math.max(0, g.satisfaction + ANSWER_EFFECTS.wrongSatisfaction);
    }
  } else if (table.length > 0) {
    const typical = expectedBillSek(draft);
    const goer = [...table].sort((a, b) => (b.order?.revenueSek ?? typical) - (a.order?.revenueSek ?? typical))[0];
    amountSek = -Math.round(goer.order?.revenueSek ?? typical);
    leftGuestId = goer.id;
    goer.order = undefined;
    sendAway(draft, [goer], 1);
    left = 1;
    for (const g of table) if (g.id !== goer.id) g.satisfaction = Math.max(0, g.satisfaction + ANSWER_EFFECTS.wrongSatisfaction);
  } else {
    const queue = draft.guests.filter((g) => g.state === 'waiting' || g.state === 'arriving');
    left = Math.min(queue.length, ANSWER_EFFECTS.wrongGuestsLeave);
    sendAway(draft, queue, left);
  }
  const t = strings.answerEffects;
  const text = right ? t.up(ctx.table, guestsIn) : t.down(ctx.table, left);
  const now = draft.simTime;
  const keep = (draft.day.roomReactions ?? []).filter((r) => now - r.at <= ANSWER_EFFECTS.reactionSimSeconds);
  draft.day = { ...draft.day, roomReactions: [...keep, { at: now, kind: right ? 'up' : 'down', table: ctx.table, guestIds: table.map((g) => g.id), text, amountSek, leftGuestId }] };
}

export interface CreditChange { axis: KnowledgeAxis; track: YrkesSpar | null; amount: number }

function targetsFor(draft: SimulationState, target: 'table' | 'room', ctx: IncidentContext): Guest[] {
  const present = presentGuests(draft);
  if (target === 'table') {
    const table = present.filter((g) => ctx.guestIds.includes(g.id));
    if (table.length > 0) return table;
  }
  return present;
}

function sendAway(draft: SimulationState, guests: Guest[], n: number): void {
  const now = draft.simTime;
  const leaving = [...guests.filter((g) => g.state === 'waiting'), ...guests.filter((g) => g.state !== 'waiting')].slice(0, n);
  for (const g of leaving) {
    draft.waitingIds = draft.waitingIds.filter((id) => id !== g.id);
    draft.seatedIds = draft.seatedIds.filter((id) => id !== g.id);
    g.state = 'leaving';
    g.stateTime = now;
    g.seatIndex = null;
    // Samma rörelse som service.ts moveGuest (importeras inte: cirkel via model.ts).
    g.targetPosition = { x: 0, z: INCIDENTS.exitZ };
    g.moveProgress = 0;
  }
}

function meanSatisfaction(guests: Guest[]): number | null {
  if (guests.length === 0) return null;
  return guests.reduce((s, g) => s + g.satisfaction, 0) / guests.length;
}


// Det rätta svaret i steget, i kvällens läge.
function correctOptionId(step: IncidentStep, situation: string | null): string {
  return (step.options.find((o) => optionQuality(o, situation) === 'best') ?? step.options[0]).id;
}

// FRAGOR §49 (Vision Owner 2026-09-27): den ordinarie personalen i
// stegets roll tar över och lämnar sin uppgift en stund.
function takeoverFor(draft: SimulationState, incident: Incident, step: IncidentStep): { role: StaffRole; memberId: string | null; until: number } {
  const key = step.axis === 'phronesis' ? 'phronesis' : incident.track;
  const role = INCIDENTS.takeoverRole[key] ?? 'servitör';
  const member = draft.team.members.find((m) => m.role === role) ?? draft.team.members[0] ?? null;
  return { role: (member?.role as StaffRole) ?? role, memberId: member?.id ?? null, until: draft.simTime + INCIDENTS.takeoverSimSeconds };
}

// Är personalen borta från sin uppgift efter ett fel (FRAGOR §49)?
export function takeoverActive(state: SimulationState): { role: StaffRole; memberId: string | null } | null {
  const t = state.incidents?.lastOutcome?.takeover;
  return t && state.simTime < t.until ? t : null;
}


// ORDER 276 — raketerna styr gästflödet: gäster släpps in i lokalen (samma
// väg som ett utfall med `room.arrive`). Returnerar antalet.
function letGuestsIn(draft: SimulationState, n: number): number {
  if (n <= 0 || draft.day.period !== 'dinner') return 0;
  draft.scenario = { ...draft.scenario, spawnedRemaining: draft.scenario.spawnedRemaining + n, nextSpawnAt: draft.simTime };
  return n;
}

interface Applied {
  cashSek: number;
  ongoing: OngoingConsequence | null;
}

// Ett utfall i rummet: kassan, gästerna, orken, ryktet och kedjorna.
// `share` skalar utfallet (personalen som tar över färre steg).
function applyOutcome(
  draft: SimulationState,
  incident: Incident,
  outcome: IncidentOutcomeMeta,
  text: OutcomeText,
  share: number,
  best: boolean
): Applied {
  const ctx = draft.incidents!.active!.context;
  const e = outcome.effects;

  // Kassan: enheter av klassens normala veckointäkt, inom veckans ±20 %.
  let cashSek = e.cash * share * scenarioUnitSek(draft);
  if (cashSek > 0 && best) cashSek *= bestAnswerFactor(draft);
  cashSek = clampScenarioCash(draft, cashSek);
  if (cashSek !== 0) {
    draft.economy = { ...draft.economy, weekScenarioCashSek: (draft.economy.weekScenarioCashSek ?? 0) + cashSek };
    applyCashDelta(draft, cashSek);
    postLedger(draft, { category: 'scenario', amount: cashSek, cause: strings.service.incident.ledger(incident.text.title), causeId: incident.id });
  }

  // Gästerna: nöjdheten syns i rummet (gästernas färg).
  const targets = targetsFor(draft, outcome.target, ctx);
  if (e.satisfaction !== 0) {
    for (const g of targets) g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + e.satisfaction * share));
  }
  const leave = Math.round((outcome.room?.leave ?? 0) * share);
  if (leave > 0) sendAway(draft, targets, leave);
  const arrive = Math.round((outcome.room?.arrive ?? 0) * share);
  if (arrive > 0) {
    draft.scenario = { ...draft.scenario, spawnedRemaining: draft.scenario.spawnedRemaining + arrive, nextSpawnAt: draft.simTime };
  }

  // Personalens ork är moralen, som personalens kompetens läser.
  if (e.stamina !== 0) bumpMorale(draft, e.stamina * share);
  if (e.reputation !== 0) draft.reputation = clampReputation(draft.reputation + (e.reputation * share) / REPUTATION.scale);

  // Kedjor. Den kedjade händelsen gäller samma bord.
  const inc = draft.incidents!;
  let queued = [...inc.queued];
  const queuedContext = { ...inc.queuedContext };
  let blocked = [...inc.blocked];
  let slots = [...inc.slots];
  let chainsAdded = inc.chainsAdded;
  for (const id of outcome.prevents ?? []) {
    blocked = [...blocked, id];
    queued = queued.filter((q) => q !== id);
    delete queuedContext[id];
  }
  for (const id of outcome.triggers ?? []) {
    if (blocked.includes(id) || inc.fired.includes(id) || queued.includes(id)) continue;
    const at = draft.simTime + INCIDENTS.chainDelaySimSeconds;
    if (chainsAdded >= INCIDENTS.chainExtraMax || inc.serviceEndsAt === null || at >= inc.serviceEndsAt) continue;
    queued = [...queued, id];
    queuedContext[id] = ctx;
    const chainedIncident = incidentById(draft.economy.businessClass, id);
    slots = [...slots, { at, phase: chainedIncident?.arc ?? 'crisis' }].sort((a, b) => a.at - b.at);
    chainsAdded += 1;
  }
  draft.incidents = { ...inc, queued, queuedContext, blocked, slots, chainsAdded };

  // Ett fel låser: följden pågår i rummet tills nästa händelse.
  const ongoing: OngoingConsequence | null = outcome.ongoing && text.ongoing
    ? { ...outcome.ongoing, incidentId: incident.id, text: formatIncidentText(text.ongoing, ctx), since: draft.simTime, guestIds: ctx.guestIds }
    : null;
  return { cashSek, ongoing };
}

// Svaret på raketens aktuella steg, eller personalens eget beslut när
// optionId är null. Ett klarat steg öppnar nästa; det sista klarade ger
// raketens bästa utfall. Ett fel (eller inget svar) ger stegets
// konsekvens, och personalen tar över resten. Muterar draft (samma mönster
// som advanceTick) och returnerar krediten som reducern bokför via
// ACCUMULATE_KNOWLEDGE. Svaret går inte att ändra.
export function resolveIncident(draft: SimulationState, optionId: string | null, confidence: Confidence = 0): CreditChange | null {
  const inc = draft.incidents;
  const active = inc?.active;
  if (!inc || !active) return null;
  const incident = incidentById(draft.economy.businessClass, active.id);
  const stepIndex = active.step ?? 0;
  const step = incident?.steps[stepIndex];
  if (!incident || !step) {
    draft.incidents = { ...inc, active: null };
    return null;
  }
  const option = optionId === null ? null : step.options.find((o) => o.id === optionId && !active.struck.includes(o.id));
  if (optionId !== null && !option) return null;
  const quality = option ? optionQuality(option, active.situation) : null;
  const creditFor = (amount: number): CreditChange | null =>
    amount === 0 ? null : { axis: step.axis, track: step.track, amount };

  // ORDER 280 — Back your knowledge: varje låst svar ger eller tar
  // krediter efter säkerheten. Tiden ute räknas som fel på gissar.
  const backC: Confidence = option ? confidence : 0;
  const backResult = active.backed ? settleBack(draft, stepIndex, backC, option !== null && quality !== 'wrong') : null;

  // Klarat steg: nästa steg öppnas i samma sammanhang.
  if (option && quality !== 'wrong' && stepIndex < incident.steps.length - 1) {
    const next = incident.steps[stepIndex + 1];
    const rng = createRng(draft.rngState);
    const struck = struckFor(draft, next, active.situation, () => rng.next());
    draft.rngState = rng.state;
    const secondsTotal = secondsFor(draft, next);
    const guestsIn = letGuestsIn(draft, INCIDENTS.guestsPerClearedStep);
    raiseTips(draft, active.context, MENU_ROCKETS.tipBonusPerClearedStep);
    answerConsequence(draft, active.context, true, guestsIn);
    const revealed: StepReveal = { step: stepIndex, optionId: option.id, correctId: correctOptionId(step, active.situation), cleared: true, guestsIn };
    const stepCredit = quality === 'best' ? INCIDENTS.bestAnswerCredit : 0;
    const earned = { credits: (active.earned?.credits ?? 0) + stepCredit + (backResult?.delta ?? 0), guestsIn: (active.earned?.guestsIn ?? 0) + guestsIn };
    draft.incidents = {
      ...draft.incidents!,
      active: { ...active, step: stepIndex + 1, secondsTotal, secondsLeft: secondsTotal, struck, revealed, revealLeft: INCIDENTS.revealSeconds, picked: null, earned }
    };
    return creditFor(stepCredit);
  }

  const ctx = active.context;
  const before = meanSatisfaction(presentGuests(draft));
  const moraleBefore = draft.morale;
  const repBefore = draft.reputation;
  const cleared = option !== null && quality !== 'wrong';
  let cashSek: number;
  let ongoing: OngoingConsequence | null = null;
  let text: string;
  let credit: number;
  if (cleared) {
    // Hela raketen klarad: bästa utfall.
    cashSek = applyOutcome(draft, incident, incident.success, incident.text.success, 1, true).cashSek;
    text = formatIncidentText(incident.text.success.outcome, ctx);
    credit = (quality === 'best' ? INCIDENTS.bestAnswerCredit : 0) + (incident.success.effects.credit ?? 0);
  } else {
    // Stegets konsekvens, och personalen tar över resten med sämre utfall.
    const failMeta = option?.fail ?? step.fail;
    const failText = (option?.fail && step.text.options[option.id].fail) || step.text.fail;
    const failed = applyOutcome(draft, incident, failMeta, failText, 1, false);
    const share = INCIDENTS.staffShareByFailedStep[stepIndex] ?? 1;
    const staff = applyOutcome(draft, incident, incident.staff, incident.text.staff, share, false);
    cashSek = failed.cashSek + staff.cashSek;
    ongoing = failed.ongoing ?? staff.ongoing;
    text = `${formatIncidentText(failText.outcome, ctx)} ${formatIncidentText(incident.text.staff.outcome, ctx)}`;
    credit = (failMeta.effects.credit ?? 0) - (option ? 0 : INCIDENTS.timeoutCreditPenalty);
  }
  const after = meanSatisfaction(presentGuests(draft));

  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: cleared ? 'positive' : 'ambient',
    causeTag: null, causeChainId: null, sustainability: 'social', kind: 'v1_incident', scenarioId: incident.id
  }];
  // ORDER 276 — det sista klarade steget och hela raketen släpper in gäster.
  const guestsIn = cleared ? letGuestsIn(draft, INCIDENTS.guestsPerClearedStep + INCIDENTS.guestsOnRocketCleared) : 0;
  if (cleared) raiseTips(draft, ctx, MENU_ROCKETS.tipBonusPerClearedStep + MENU_ROCKETS.tipBonusOnRocketCleared);
  // ORDER 292 — ett fel som köar en följdraket vid samma bord låter gästerna sitta kvar.
  const chains = cleared ? [] : [...((option?.fail ?? step.fail).triggers ?? []), ...(incident.staff.triggers ?? [])];
  answerConsequence(draft, ctx, cleared, guestsIn, chains.length > 0);
  const reveal: StepReveal = { step: stepIndex, optionId: option?.id ?? null, correctId: correctOptionId(step, active.situation), cleared, guestsIn };
  const takeover = cleared ? null : takeoverFor(draft, incident, step);
  const now = draft.incidents!;
  const record: IncidentRecord = {
    id: incident.id,
    step: cleared ? null : stepIndex,
    optionId: option?.id ?? null,
    quality: cleared ? 'best' : option ? 'wrong' : 'staff',
    situation: active.situation,
    context: ctx,
    at: draft.simTime,
    kind: active.backed ? 'backed' : active.chained ? 'chained' : 'planned',
    deltas: {
      cashSek,
      reputation: draft.reputation - repBefore,
      credits: (active.earned?.credits ?? 0) + credit + (backResult?.delta ?? 0),
      guestsIn: (active.earned?.guestsIn ?? 0) + guestsIn
    }
  };
  draft.incidents = {
    ...now,
    active: null,
    ongoing,
    log: [...now.log, record],
    turnedTonight: now.turnedTonight || (incident.arc === 'crisis' && cleared),
    lastOutcome: {
      incidentId: incident.id,
      optionId: option?.id ?? null,
      reveal,
      takeover,
      text,
      at: draft.simTime,
      deltas: {
        cashSek,
        satisfaction: before !== null && after !== null ? after - before : 0,
        stamina: draft.morale - moraleBefore,
        reputation: draft.reputation - repBefore
      },
      back: backResult
    }
  };
  return creditFor(credit);
}

// Följden av ett fel val, varje tick tills nästa händelse: nöjdheten och
// orken sjunker. Personalens tempo läses av service.ts (`tempoFactor`).
export function tickOngoing(draft: SimulationState, dt: number): void {
  const o = draft.incidents?.ongoing;
  if (!o || draft.day.period !== 'dinner') return;
  const perTick = dt / INCIDENTS.simSecondsPerMinute;
  if (o.satisfactionPerMinute !== 0) {
    const targets = targetsFor(draft, o.target, { guestIds: o.guestIds } as IncidentContext);
    for (const g of targets) g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + o.satisfactionPerMinute * perTick));
  }
  if (o.staminaPerMinute !== 0) bumpMorale(draft, o.staminaPerMinute * perTick);
}

// Nedräkningen går i verklig tid: en tick är dt spelsekunder, och i farten
// `speed` motsvarar det dt / speed verkliga sekunder.
export function countDown(draft: SimulationState, dt: number): boolean {
  const inc = draft.incidents;
  if (!inc?.active) return false;
  let real = dt / Math.max(1, draft.speed);
  // ORDER 286a — först figurens klipp i rummet; stegets klocka står under tiden.
  const intro = inc.active.introLeft ?? 0;
  if (intro > 0) {
    draft.incidents = { ...inc, active: { ...inc.active, introLeft: Math.max(0, intro - real) } };
    return false;
  }
  const reveal = inc.active.revealLeft ?? 0;
  if (reveal > 0) {
    // Svaret i stunden visas först; stegets tid börjar sedan på full tid.
    const rest = reveal - real;
    draft.incidents = { ...inc, active: { ...inc.active, revealLeft: Math.max(0, rest), revealed: rest > 0 ? inc.active.revealed : null } };
    if (rest > 0) return false;
    real = -rest;
  }
  const a = draft.incidents.active!;
  // ORDER 284 — ett låst svar i Back your knowledge: stegets klocka står.
  // Provspel av 285: i stället går den andra tidsgränsen (BACK.lockSeconds);
  // när den är slut satsas Guessing på det låsta svaret (reducer.ts TICK).
  if (a.backed && a.picked) {
    const lock = (a.lockLeft ?? BACK.lockSeconds) - real;
    draft.incidents = { ...draft.incidents, active: { ...a, lockLeft: Math.max(0, lock) } };
    return lock <= 0;
  }
  const left = a.secondsLeft - real;
  draft.incidents = { ...draft.incidents, active: { ...a, secondsLeft: Math.max(0, left) } };
  return left <= 0;
}

// ORDER 284 — Back your knowledge: spelaren väljer svar. Svaret låses och
// stegets klocka stannar tills hen valt säkerhet och står för svaret.
export function pickBackAnswer(state: SimulationState, optionId: string): SimulationState {
  const a = state.incidents?.active;
  if (!a?.backed || a.picked || (a.revealLeft ?? 0) > 0 || a.secondsLeft <= 0 || a.struck.includes(optionId)) return state;
  const inc = incidentById(state.economy.businessClass, a.id);
  const step = inc?.steps[a.step];
  if (!step?.options.some((o) => o.id === optionId)) return state;
  return { ...state, incidents: { ...state.incidents!, active: { ...a, picked: optionId, lockLeft: BACK.lockSeconds } } };
}

// Kvällens lärdom: förklaringen till steget där raketen föll, när spelaren
// svarade fel eller personalen fick besluta själv. I kvällens läge.
export function lessonFor(state: SimulationState): LessonItem[] {
  const inc = incidentsOf(state);
  const items: LessonItem[] = [];
  for (const rec of inc.log) {
    if (rec.quality !== 'wrong' && rec.quality !== 'staff') continue;
    const incident = incidentById(state.economy.businessClass, rec.id);
    const step = incident?.steps[rec.step ?? 0];
    if (!incident || !step) continue;
    const sit = rec.situation ?? null;
    const best = step.options.find((o) => optionQuality(o, sit) === 'best');
    if (!best) continue;
    const f = (t: string) => formatIncidentText(t, rec.context);
    const explain = (id: string) => {
      const t = step.text.options[id];
      return f((sit && t.explanationIn?.[sit]) || t.explanation);
    };
    const chosen = rec.optionId ? step.text.options[rec.optionId] : null;
    items.push({
      incidentId: rec.id,
      title: f(incident.text.title),
      stepAxis: step.axis,
      question: f(step.text.question),
      chosen: chosen ? f(chosen.label) : null,
      explanation: rec.optionId ? explain(rec.optionId) : f(incident.text.staff.outcome),
      better: f(step.text.options[best.id].label),
      betterExplanation: explain(best.id),
      reference: incident.reference
    });
  }
  return items;
}

// När servicen stänger (naturligt eller vid kollaps). En händelse som står
// öppen när servicen tar slut beslutas av personalen; krediten returneras.
export function closeIncidents(draft: SimulationState): CreditChange | null {
  const inc = draft.incidents;
  if (!inc || !inc.enabled) return null;
  const credit = inc.active ? resolveIncident(draft, null) : null;
  const after = draft.incidents;
  draft.incidents = {
    ...after,
    enabled: false,
    active: null,
    ongoing: null,
    slots: [],
    queued: [],
    queuedContext: {},
    lesson: lessonFor(draft),
    lessonEvenings: after.lessonEvenings + (after.log.length > 0 ? 1 : 0),
    eveningsTurned: after.eveningsTurned + (after.turnedTonight ? 1 : 0)
  };
  return credit;
}

// Kvällens tre mätare (speldesignens medvetna undantag från stat-paneler).
// Samma källor som simuleringen läser: kassan, gästernas nöjdhet i rummet
// och moralen.
export function serviceMeters(state: SimulationState): { cashSek: number; satisfaction: number | null; stamina: number } {
  return {
    cashSek: state.cash,
    satisfaction: meanSatisfaction(presentGuests(state)),
    stamina: state.morale
  };
}

// Harnessens och skriptens val i ett steg, i kvällens läge: det bästa
// svaret, eller det sämsta (ett fel svar; med egen konsekvens det med
// lägst summa av effekterna). Strukna alternativ väljs aldrig.
export function rankedStepOption(
  step: IncidentStep,
  rank: 'best' | 'worst',
  struck: readonly string[] = [],
  situation: string | null = null
): string {
  const open = step.options.filter((o) => !struck.includes(o.id));
  if (rank === 'best') return (open.find((o) => optionQuality(o, situation) === 'best') ?? open[0]).id;
  const failOf = (o: StepOptionMeta) => (o.fail ?? step.fail).effects;
  const score = (o: StepOptionMeta) => {
    const e = failOf(o);
    return e.cash + e.satisfaction + e.stamina + e.reputation / REPUTATION.scale;
  };
  const wrong = open.filter((o) => optionQuality(o, situation) === 'wrong');
  const pool = wrong.length > 0 ? wrong : open;
  return [...pool].sort((a, b) => score(a) - score(b))[0].id;
}
