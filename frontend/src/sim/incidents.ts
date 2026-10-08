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

import { countTruckSituation } from './ladder';
import { prefersInspection } from './fika';
import type { ConsequenceSeverity, Guest, GuestType, KnowledgeAxis, RoomReaction, SimulationState, StaffRole, YrkesSpar } from '../strategic/types';
import { applyAnswerMood } from './guestMood';
import { spreadWord } from './streetWord';
import { complaintStamina, hesitationWellbeing, incidentArea, staffEffect, staffKnows } from './staffCondition';
import { createRng } from '../strategic/util/rng';
import { effectiveSpeed } from '../strategic/simulation/consequence';
import { bumpMorale } from '../strategic/simulation/morale';
import { applyCashDelta, applyCashRevenue, postLedger } from '../strategic/simulation/cashReading';
import { takeFromStock } from '../strategic/simulation/stockPackages';
import { clockMinutes, formatClock } from './clock';
import { clampReputation } from '../strategic/simulation/reputation';
import { strings } from '../content/strings';
import { avecShareFor, conceptWrongFactor, moveConceptReputation } from './goods';
import { rocketClipFor, rocketFigure, type RocketFigure } from './theatreTriggers';
import { ANSWER_EFFECTS, CONSEQUENCES, DOUBLE_OR_NOTHING, GUEST_TYPES, STAFF_CONDITION, THEATRE, INCIDENTS, SITUATIONS, GAME_MINUTES_PER_SIM_SECOND, MENU_ROCKETS, REPUTATION, SERVICE_STREAM, SHOP } from './balance';
import { abilityActive } from './shop';
import { calendarFor } from './calendar';
import { clampScenarioCash, scenarioUnitSek } from './economy';
import { bestAnswerFactor, medalSteps } from './knowledgeInService';
import { businessRoomRef } from '../strategic/scene/interiorSharedState';
import {
  fitsMenu,
  incidentBankFor,
  incidentById,
  type AnswerQuality,
  type ArcPhase,
  optionQuality,
  type Incident,
  type IncidentCondition,
  type IncidentCue,
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
  // ORDER 280 — Back your knowledge: spelaren startade raketen själv.
  // ORDER 305b — säkerheten (och det låsta svaret) är borttagen: valet att
  // gå vidare i kvitt eller dubbelt är säkerheten, i alla raketer.
  backed?: boolean;
  // ORDER 285 — det raketen gett hittills (klarade steg): krediter och
  // gäster som kommit in. Summeras i loggen.
  earned?: { credits: number; guestsIn: number };
  // ORDER 286a — raketen börjar i rummet: figurens klipp spelas i så här
  // många verkliga sekunder innan kortet öppnas och stegets klocka går.
  introLeft?: number;
  // ORDER 319a.4 — förvarningen som spelas under introt (incidentBank IncidentCue).
  cue?: IncidentCue;
  // ORDER 292 — vad som står på spel vid bordet när raketen öppnas.
  stake?: TableStake | null;
  // ORDER 305 — kvitt eller dubbelt (balance.ts DOUBLE_OR_NOTHING): potten
  // (krediter per kunskapsform och bordets merbeställning i kronor) och valet
  // efter ett rätt steg, med tiden kvar att välja (verkliga sekunder).
  pot?: RocketPot | null;
  choosing?: boolean;
  choiceLeft?: number;
  // ORDER 310b — låset och väntan: svaret är låst men inte avgjort.
  pending?: PendingAnswer | null;
}

// ORDER 310b (Anders 2026-10-05, Designs kvitt eller dubbelt) — ett låst svar
// som väntar på avgörandet. Tiderna är verkliga sekunder kvar: låset slår igen
// när lockLeft når 0 (INCIDENTS.lockSeconds), avgörandet kommer när
// verdictLeft når 0 (INCIDENTS.verdictSeconds). Stegets klocka står under
// tiden, och svarets följd verkar först vid avgörandet.
export interface PendingAnswer {
  optionId: string;
  lockLeft: number;
  verdictLeft: number;
}

// Var i väntan svaret står: 'lock' tills låset slagit igen, sedan 'wait'.
export function pendingPhase(active: ActiveIncident | null | undefined): 'lock' | 'wait' | null {
  const p = active?.pending;
  if (!p) return null;
  return p.lockLeft > 0 ? 'lock' : 'wait';
}

// ORDER 305 — raketens pott i kvitt eller dubbelt.
export interface RocketPot {
  credits: Partial<Record<KnowledgeAxis, number>>;
  cashSek: number;
  payerType: GuestType | null;
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

// ORDER 305b (Anders 2026-10-05) — portfolion registrerar valet i kvitt
// eller dubbelt: gick vidare och hade rätt, gick vidare och hade fel,
// stannade med rätt. `step` är steget valet gällde (1 = andra steget).
export type KvittChoice = 'goRight' | 'goWrong' | 'stopRight';
export interface KvittEntry {
  at: number;
  day: number;
  incidentId: string;
  step: number;
  choice: KvittChoice;
}

// En raket i kvällens logg. `step` är steget där raketen föll (null när
// hela raketen klarades); `optionId` svaret där, null när personalen
// beslutade själv.
export interface IncidentRecord {
  id: string;
  step: number | null;
  optionId: string | null;
  // ORDER 305 — 'stopped': spelaren stannade och tog potten.
  quality: AnswerQuality | 'staff' | 'stopped';
  situation: string | null;
  context: IncidentContext;
  at: number;
  // ORDER 285 — vad raketen ändrade, till kvällens händelselogg (Designs
  // leverans 2026-09-29, kvällens resultat): kassan och ryktet ur utfallet
  // (samma tal som lastOutcome.deltas), krediterna och gästerna över alla steg.
  deltas?: { cashSek: number; reputation: number; credits: number; guestsIn: number };
  // ORDER 289 — planerad, följd eller egen (Back your knowledge).
  // ORDER 314: 'backed' finns bara i loggar från före ordern.
  kind?: 'planned' | 'chained' | 'backed';
  // ORDER 305 — kvitt eller dubbelt: potten togs (stannade eller klarade
  // raketen) eller förlorades (fel efter att ha gått vidare).
  pot?: { taken: boolean; credits: number; cashSek: number };
  // ORDER 314 — spelaren svarade inte och personalen klarade situationen.
  staffCleared?: boolean;
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
  // ORDER 305 — kvitt eller dubbelt: potten som togs eller förlorades.
  pot?: IncidentRecord['pot'];
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
  // ORDER 296c — när dörrarna öppnade (kvällens fönster för raketerna).
  doorsOpenAt?: number | null;
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
  // ORDER 280 — Back your knowledge: kvällens egna raketer.
  betsTonight?: number;
  // ORDER 305 — en tagen pott: krediterna per kunskapsform (reducern bokför dem).
  potCreditsDue?: Partial<Record<KnowledgeAxis, number>>;
  // ORDER 305b — kvällens val i kvitt eller dubbelt (portfolion har hela säsongen).
  kvittTonight?: Record<KvittChoice, number>;
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

// Kvällens klocka (sim/clock.ts, ORDER 292: egen modul så att lagret kan
// läsa den utan cirkelberoende).
export { clockMinutes, formatClock } from './clock';

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
  if (c.inspection !== undefined && inspectionVariant(state) !== c.inspection) return false;
  return true;
}

// ORDER 293 — tillsynens steg 3 väljs efter kvällens läge, i ordningen A nekad
// gäst (gästen som vinglade har nekats i kväll), B ålderskontroll (studenter i
// rummet), D kravet på mat (köket har slut, någon gick utan), annars C
// egenkontroll (Designs manus 4, "Utlösare").
export function inspectionVariant(state: SimulationState): 'A' | 'B' | 'C' | 'D' {
  if (incidentsOf(state).fired.includes(INCIDENTS.drunkIncidentId)) return 'A';
  if (presentGuests(state).some((g) => g.guestType === 'student')) return 'B';
  if ((state.day.soldOutGuests ?? 0) > 0) return 'D';
  return 'C';
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
  // ORDER 296c — ingen plan: raketerna mognar ur rummet (maybeOpenIncident).
  // ORDER 314 — kvällens antal situationer, SITUATIONS.minPerEvening–maxPerEvening.
  const rng = createRng(state.rngState);
  const plannedCount = SITUATIONS.minPerEvening + Math.floor(rng.next() * (SITUATIONS.maxPerEvening - SITUATIONS.minPerEvening + 1));
  return {
    ...state,
    rngState: rng.state,
    incidents: { ...reset, enabled: true, slots: [], serviceEndsAt, doorsOpenAt, plannedCount: Math.min(SITUATIONS.maxPerEvening, plannedCount) }
  };
}

// ORDER 296c — rummets tryck: de som sitter och kön mot rummets platser.
export function roomPressure(state: SimulationState): number {
  const seats = businessRoomRef.current?.capacity ?? INCIDENTS.fallbackSeats;
  return Math.min(INCIDENTS.pressureMax, (seatedGuests(state).length + state.waitingIds.length) / Math.max(1, seats));
}

// Bågens fas efter kvällens andel.
function phaseAt(frac: number): ArcPhase {
  if (frac >= INCIDENTS.arcClosingFrom) return 'closing';
  if (frac >= INCIDENTS.arcCrisisFrom) return 'crisis';
  if (frac >= INCIDENTS.arcRushFrom) return 'rush';
  return 'opening';
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
/** ORDER 319a.4 — gästen som pekar mot luckan: den som varit längst i kön eller vid luckan och hunnit
 * gå fram i bild (THEATRE.cueGuestSettledSeconds sedan ankomsten), annars den vid ståborden, annars
 * (en lugn kväll) den som varit längst i kön, vid luckan eller på väg in. Den som hämtar eller betalar
 * pekar inte: utan uteservering går den strax därifrån. Ingen gäst: ingen. */
export function hatchGuest(state: SimulationState): SimulationState['guests'][number] | null {
  const settled = (g: SimulationState['guests'][number]) => state.simTime - g.arrivalTime >= THEATRE.cueGuestSettledSeconds;
  const atHatch = (g: SimulationState['guests'][number]) => g.state === 'waiting' || g.state === 'ordering';
  const tiers = [
    state.guests.filter((g) => atHatch(g) && settled(g)),
    // ORDER 319c — den som äter står vid sin plats och äter klart först efter förvarningen.
    state.guests.filter((g) => g.state === 'eating' && settled(g) && state.simTime - g.stateTime >= THEATRE.cueEaterWindowSimSeconds[0] && state.simTime - g.stateTime <= THEATRE.cueEaterWindowSimSeconds[1]),
    state.guests.filter((g) => atHatch(g) || g.state === 'arriving')
  ];
  const at = tiers.find((t) => t.length > 0) ?? [];
  return at.length === 0 ? null : at.reduce((a, b) => (b.arrivalTime < a.arrivalTime ? b : a));
}

function eligibleNow(state: SimulationState, incident: Incident, context?: IncidentContext): boolean {
  if (!conditionHolds(state, incident.when)) return false;
  // ORDER 319a.4 — gästen vid luckan behöver en gäst som står där.
  if (incident.cue === 'guestAtHatch' && !hatchGuest(state)) return false;
  if (!incident.needsTable) return true;
  if (context) {
    const present = new Set(seatedGuests(state).map((g) => g.id));
    return context.guestIds.some((id) => present.has(id));
  }
  return seatedGuests(state).length > 0;
}

// Nästa händelse: en kedjad först, annars en ur bågens fas som inte
// kommit i kväll och som kvällens läge tillåter.
// ORDER 293 — tillsynens fyra varianter är en familj.
const INSPECTION_FAMILY = 'event-inspection';

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
  // ORDER 293 — en familj (tillsynens varianter) högst en gång per kväll.
  const firedFamilies = new Set(bank.filter((i) => i.family && inc.fired.includes(i.id)).map((i) => i.family));
  const free = bank.filter((i) =>
    !i.chainOnly && !inc.fired.includes(i.id) && !inc.blocked.includes(i.id) && !(i.family && firedFamilies.has(i.family)) &&
    (!i.weekdays || i.weekdays.includes(weekday)) && fitsMenu(i, menuIds) && eligibleNow(state, i));
  // ORDER 316 — en genväg i fikat (kylen, golvet) gör att tillsynen kommer
  // oftare de närmaste kvällarna (sim/fika.ts prefersInspection).
  const inspection = free.filter((i) => i.family === INSPECTION_FAMILY);
  if (inspection.length > 0 && prefersInspection(state, inc.log.length)) {
    return { incident: pick(inspection, Math.min(1 - Number.EPSILON, Math.max(0, r))), chained: false };
  }
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

// ORDER 314 — situationens andel av sina följder (balance.ts SITUATIONS.effectShare).
const K = SITUATIONS.effectShare;

/** ORDER 314 — pausen mellan två situationer i simsekunder (minGapGameMinutes). */
export function situationGapSimSeconds(): number {
  return SITUATIONS.minGapGameMinutes / GAME_MINUTES_PER_SIM_SECOND;
}

// ORDER 296c — en raket mognar ur rummet (anropas varje tick under servicen,
// efter att dörrarna öppnat): inom kvällens fönster, efter pausen sedan
// förra raketen, med en chans som växer med fullheten, och när bankens
// villkor stämmer just nu. En kedjad raket går först. Inget tak per kväll.
// Den förra följden slutar här.
// ORDER 314 — takten: högst kvällens antal (plannedCount, 4–6), aldrig två
// samtidigt, minst SITUATIONS.minGapGameMinutes mellan dem (från att förra
// avgjordes). Upp till kvällens antal mognar de ur rummets tryck; de första
// minPerEvening kommer senast på sina jämnt fördelade tider i fönstret.
export function maybeOpenIncident(draft: SimulationState, dt: number): void {
  const inc = draft.incidents;
  if (!inc || !inc.enabled || inc.active) return;
  if (draft.day.period !== 'dinner' || !draft.day.doorsOpenedThisService) return;
  // ORDER 319b — situationen väntar tills frågekortet till en nyfiken gäst är stängt (ett kort i taget).
  if (draft.day.curious?.current?.card) return;
  const from = inc.doorsOpenAt ?? draft.day.doorsOpenAt ?? draft.simTime;
  const until = inc.serviceEndsAt ?? draft.simTime;
  const frac = (draft.simTime - from) / Math.max(1, until - from);
  if (frac < INCIDENTS.windowStart || frac > INCIDENTS.windowEnd) return;
  const planned = inc.plannedCount ?? SITUATIONS.maxPerEvening;
  // En köad följd (ett tidigare fel) får komma upp till maxPerEvening.
  if (inc.log.length >= (inc.queued.length > 0 ? SITUATIONS.maxPerEvening : planned)) return;
  const lastAt = inc.log.length > 0 ? inc.log[inc.log.length - 1].at : -Infinity;
  if (draft.simTime < lastAt + situationGapSimSeconds()) return;
  const rng = createRng(draft.rngState);
  const r = () => rng.next();
  const p = roomPressure(draft);
  const chance = (INCIDENTS.triggerBasePerSimSecond + INCIDENTS.triggerFullPerSimSecond * p * p) * dt;
  // Golvet: den k:te av de första minPerEvening ska ha kommit vid (k + 1) /
  // (minPerEvening + 1) av fönstret, jämnt fördelat över kvällen.
  const k = inc.log.length;
  const dueFrac = INCIDENTS.windowStart + ((k + 1) / (SITUATIONS.minPerEvening + 1)) * (INCIDENTS.windowEnd - INCIDENTS.windowStart);
  const behind = k < SITUATIONS.minPerEvening && frac >= dueFrac;
  // En köad följd kommer när dess tid är inne (INCIDENTS.chainDelaySimSeconds
  // efter felet, inc.slots), inte bara när slumpen träffar.
  const chainDue = inc.queued.length > 0 && inc.slots.some((sl) => sl.at <= draft.simTime);
  const rolled = behind || r() < chance;
  if (!rolled && !chainDue) {
    draft.rngState = rng.state;
    return;
  }
  const chosen = chooseIncident(draft, phaseAt(frac), r());
  // Följdens tid öppnar bara följden; annat väntar på rummet eller golvet.
  if (chosen && (rolled || chosen.chained)) openIncident(draft, chosen.incident, chosen.chained, chosen.context, false, r);
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
  // ORDER 319a.4 — förvarningen: gästen först i kön går fram till luckan och pekar
  // (askPointMenu), eller leveransbilen kommer; kortet väntar på den.
  const cue = backed ? undefined : incident.cue;
  const hatch = cue === 'guestAtHatch' ? hatchGuest(draft) : null;
  const clip = backed ? null : hatch ? 'askPointMenu' : rocketClipFor(incident);
  const figure = hatch ? { kind: 'guest' as const, guestId: hatch.id, clip: 'askPointMenu' as const } : rocketFigure(draft, clip, base);
  const context = { ...base, figure, ...(hatch ? { guestIds: [hatch.id] } : {}) };
  // ORDER 293 — händelserna som teater: kortet väntar på manusets uppbyggnad.
  const eventAsk = backed ? undefined : THEATRE.eventAskSeconds[incident.id];
  // En gäst som ännu är på väg till vagnen (en lugn kväll) hinner gå fram innan hen pekar: kortet
  // väntar resten av THEATRE.cueGuestSettledSeconds (verkliga sekunder i normal fart).
  const walkUp = hatch ? Math.max(0, THEATRE.cueGuestSettledSeconds - (draft.simTime - hatch.arrivalTime)) : 0;
  const introLeft = figure ? THEATRE.rocketIntroSeconds[figure.clip] + walkUp : cue ? THEATRE.cueSeconds[cue] : eventAsk ? eventAsk[0] : 0;
  // ORDER 296 — födelsedagspaketet (butiken): sällskapet har bokat tårta och
  // bubbel i förväg, och köket vet i tid.
  if (incident.id === INCIDENTS.birthdayIncidentId && abilityActive(draft, 'birthday') && !draft.day.birthdayPackageSek) {
    applyCashRevenue(draft, SHOP.effects.birthdayPackageSek);
    draft.serviceRevenueToday = { ...draft.serviceRevenueToday, dinner: draft.serviceRevenueToday.dinner + SHOP.effects.birthdayPackageSek / SERVICE_STREAM.sekPerKsek };
    draft.day = { ...draft.day, birthdayPackageSek: SHOP.effects.birthdayPackageSek };
  }
  const { [incident.id]: _used, ...queuedContext } = inc.queuedContext;
  draft.incidents = {
    ...inc,
    queued: inc.queued.filter((id) => id !== incident.id),
    queuedContext,
    fired: [...inc.fired, incident.id],
    ongoing: null,
    active: { id: incident.id, openedAt: draft.simTime, step: 0, secondsTotal, secondsLeft: secondsTotal, struck, chained, situation, context, backed, introLeft, ...(cue ? { cue } : {}), stake: tableStake(draft, context.guestIds) }
  };
}

// ORDER 314 (Anders 2026-10-06) — "Inga frivilliga raketer": Stå för ditt
// svar (ORDER 280, whyNotBack/canStartBack/startBack) är borttagen. All
// kunskap prövas i situationer som uppstår i rummet (maybeOpenIncident).

export function totalCredits(state: SimulationState): number {
  return state.knowledgeCredits.episteme + state.knowledgeCredits.techne + state.knowledgeCredits.phronesis;
}

// ORDER 305b — portfolion och kvällens räkning av valen i kvitt eller dubbelt.
function recordKvitt(draft: SimulationState, incidentId: string, step: number, choice: KvittChoice): void {
  draft.kvittLog = [...(draft.kvittLog ?? []), { at: draft.simTime, day: draft.day.dayNumber, incidentId, step, choice }];
  const t = { goRight: 0, goWrong: 0, stopRight: 0, ...(draft.incidents!.kvittTonight ?? {}) };
  t[choice]++;
  draft.incidents = { ...draft.incidents!, kvittTonight: t };
}

// ORDER 279 — "Rätt svar ger högre dricks": bordets gäster lämnar en större
// andel av notan i dricks (läses i reducern vid betalningen).
function raiseTips(draft: SimulationState, ctx: IncidentContext, share: number): void {
  if (share <= 0) return;
  for (const g of draft.guests) if (ctx.guestIds.includes(g.id)) g.tipBonus = (g.tipBonus ?? 0) + share * K;
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
// ORDER 303 D — hur allvarligt ett fel är, ur raketens egen data (balance.ts
// CONSEQUENCES): grovt om felet skickar ut gäster eller kostar ryktet eller
// nöjdheten mycket, medel om nöjdheten sjunker en del, annars lätt.
export function failSeverity(fail: IncidentOutcomeMeta | undefined): ConsequenceSeverity {
  const e = fail?.effects;
  const sat = e?.satisfaction ?? 0;
  if ((fail?.room?.leave ?? 0) > 0 || (e?.reputation ?? 0) <= CONSEQUENCES.graveReputationAtMost || sat <= CONSEQUENCES.graveSatisfactionAtMost) return 'grave';
  if (sat <= CONSEQUENCES.mediumSatisfactionAtMost) return 'medium';
  return 'mild';
}

const worse = (s: ConsequenceSeverity): ConsequenceSeverity => (s === 'mild' ? 'medium' : s === 'medium' && STAFF_CONDITION.hesitationToGrave > 0 ? 'grave' : s);

// ORDER 305 — bordets merbeställning in i kvällskassan (förut inne i
// answerConsequence; också när en pott i kvitt eller dubbelt tas).
function bookTableCash(draft: SimulationState, amountSek: number, payerType: GuestType | null): void {
  if (amountSek <= 0 || (draft.day.period !== 'dinner' && draft.day.period !== 'lunch')) return;
  applyCashRevenue(draft, amountSek);
  // Kassabokens försäljningsrad vid stängningen läser serviceperiodens summa (kSEK).
  if (draft.day.period === 'dinner') draft.serviceRevenueToday = { ...draft.serviceRevenueToday, dinner: draft.serviceRevenueToday.dinner + amountSek / SERVICE_STREAM.sekPerKsek };
  else draft.serviceRevenueToday = { ...draft.serviceRevenueToday, lunch: draft.serviceRevenueToday.lunch + amountSek / SERVICE_STREAM.sekPerKsek };
  // Gästtypens intäkt i kväll (som guestTypes.ts recordTypeRevenue;
  // importeras inte, för att undvika ett cirkelberoende).
  if (payerType) {
    const rev = { ...(draft.day.guestTypeRevenue ?? {}) };
    rev[payerType] = (rev[payerType] ?? 0) + amountSek;
    draft.day = { ...draft.day, guestTypeRevenue: rev };
  }
}

// ORDER 305 — holdCash: bordets merbeställning bokförs inte utan läggs i
// raketens pott (kvitt eller dubbelt); beloppet returneras.
function answerConsequence(draft: SimulationState, ctx: IncidentContext, right: boolean, guestsIn: number, keepTable = false, severity: ConsequenceSeverity = 'grave', rocketCleared = false, incidentId: string | null = null, hesitated = false, holdCash = false): number {
  let held = 0;
  const table = draft.guests.filter((g) => ctx.guestIds.includes(g.id) && PRESENT.includes(g.state));
  let left = 0;
  let amountSek = 0;
  let leftGuestId: string | null = null;
  let detail: NonNullable<RoomReaction['detail']> = right ? 'more' : 'queue';
  if (right) {
    // ORDER 292 — ett glas till ur lagret, till listans pris; annars en andel av notan.
    const extra = draft.menu.find((m) => m.dishId === ANSWER_EFFECTS.rightExtraDishId);
    const inStock = extra && (draft.day.platesRemaining[extra.dishId] ?? 0) > 0;
    if (extra && inStock && table.length > 0) {
      takeFromStock(draft, extra.dishId, draft.simTime);
      amountSek = Math.round(extra.price * K);
      detail = 'glass';
    } else {
      const stake = tableStake(draft, ctx.guestIds);
      amountSek = stake ? Math.round(stake.billSek * ANSWER_EFFECTS.rightBillShare * K) : 0;
    }
    if (holdCash) held = amountSek;
    else bookTableCash(draft, amountSek, table[0]?.guestType ?? null);
  } else if (table.length > 0 && keepTable) {
    // Felet köade en följdraket vid samma bord: gästerna stannar (följden är
    // nästa raket), men bordet beställer mindre.
    const stake = tableStake(draft, ctx.guestIds);
    amountSek = stake ? Math.round(stake.billSek * ANSWER_EFFECTS.wrongBillShare * K) : 0;
    detail = 'less';
    for (const g of table) {
      g.billBonus = (g.billBonus ?? 0) + ANSWER_EFFECTS.wrongBillShare * K;
      g.satisfaction = Math.max(0, g.satisfaction + ANSWER_EFFECTS.wrongSatisfaction * K);
    }
  } else if (table.length > 0 && severity === 'medium') {
    // ORDER 303 D — medel: bordet beställer mindre (ingen flaska till, ingen
    // dessert) och klagar; personalen lägger tid på att lugna (orken sjunker).
    const c = CONSEQUENCES.wrong.medium;
    const stake = tableStake(draft, ctx.guestIds);
    amountSek = stake ? Math.round(stake.billSek * c.billShare * K) : 0;
    detail = 'complaint';
    for (const g of table) {
      g.billBonus = (g.billBonus ?? 0) + c.billShare * K;
      g.tipBonus = (g.tipBonus ?? 0) + c.tipShare * K;
      g.satisfaction = Math.max(0, g.satisfaction + c.satisfaction * K);
    }
    bumpMorale(draft, c.staffMorale);
    complaintStamina(draft);
  } else if (table.length > 0 && severity === 'mild') {
    // ORDER 303 D — lätt: mindre dricks, bordet lite mindre nöjt.
    const c = CONSEQUENCES.wrong.mild;
    detail = 'tips';
    for (const g of table) {
      g.tipBonus = (g.tipBonus ?? 0) + c.tipShare * K;
      g.satisfaction = Math.max(0, g.satisfaction + c.satisfaction * K);
    }
  } else if (table.length > 0) {
    // ORDER 303 D — grovt: gästen med den största notan går utan att betala.
    bumpMorale(draft, CONSEQUENCES.wrong.grave.staffMorale);
    const typical = expectedBillSek(draft);
    const sorted = [...table].sort((a, b) => (b.order?.revenueSek ?? typical) - (a.order?.revenueSek ?? typical));
    const n = Math.max(1, Math.round(table.length * CONSEQUENCES.wrong.grave.tableShareLeaving));
    const goers = sorted.slice(0, n);
    amountSek = -Math.round(goers.reduce((a, g) => a + (g.order?.revenueSek ?? typical), 0));
    leftGuestId = goers[0].id;
    for (const g of goers) g.order = undefined;
    sendAway(draft, goers, goers.length);
    left = goers.length;
    detail = 'leaves';
    for (const g of table) if (!goers.includes(g)) g.satisfaction = Math.max(0, g.satisfaction + ANSWER_EFFECTS.wrongSatisfaction * K);
  } else if (severity === 'grave') {
    const queue = draft.guests.filter((g) => g.state === 'waiting' || g.state === 'arriving');
    left = Math.min(queue.length, ANSWER_EFFECTS.wrongGuestsLeave);
    sendAway(draft, queue, left);
  }
  // ORDER 303 D — rätt hela vägen: bordet stannar för avec.
  if (right && rocketCleared && table.length > 0 && (draft.day.period === 'dinner' || draft.day.period === 'lunch')) {
    const stake = tableStake(draft, ctx.guestIds);
    // ORDER 303 E — trött eller otrivd personal ger mindre av ett rätt svar.
    // ORDER 307 — avec kommer med avecvagnen (sim/goods.ts avecShareFor).
    const avec = stake ? Math.round(stake.billSek * (CONSEQUENCES.right.avecShare + avecShareFor(draft)) * staffEffect(draft) * K) : 0;
    if (avec > 0) {
      applyCashRevenue(draft, avec);
      if (draft.day.period === 'dinner') draft.serviceRevenueToday = { ...draft.serviceRevenueToday, dinner: draft.serviceRevenueToday.dinner + avec / SERVICE_STREAM.sekPerKsek };
      else draft.serviceRevenueToday = { ...draft.serviceRevenueToday, lunch: draft.serviceRevenueToday.lunch + avec / SERVICE_STREAM.sekPerKsek };
      amountSek += avec;
      detail = 'avec';
    }
  }
  // ORDER 303 C — ryktet per svar (poäng 0–100), recensionen i morgon och
  // ordet på gatan i kväll.
  const repPoints = (right
    ? (CONSEQUENCES.right.stepReputation + (rocketCleared ? CONSEQUENCES.right.clearedReputation : 0)) * staffEffect(draft)
    : CONSEQUENCES.wrong[severity].reputation) * K;
  draft.reputation = clampReputation(draft.reputation + repPoints / REPUTATION.scale);
  // ORDER 307 — ryktet i kvällens koncept: ett fel gånger förlåtelsen hos
  // bordets gästtyp.
  const tier = draft.day.booking?.dayNumber === draft.day.dayNumber ? draft.day.booking?.concept ?? null : null;
  let conceptPoints: number | null = null;
  if (tier) {
    const payerType = table[0]?.guestType;
    const forgive = !right && payerType ? GUEST_TYPES.forgiveness[payerType] : 1;
    conceptPoints = repPoints * forgive;
    moveConceptReputation(draft, tier, conceptPoints, REPUTATION.scale);
  }
  if (incidentId) {
    // ORDER 309b — conceptReputation: konceptets poäng (Recensioner i morse).
    draft.day = { ...draft.day, answerReviews: [...(draft.day.answerReviews ?? []), { incidentId, right, severity: right ? null : severity, reputation: repPoints, table: ctx.table, guestType: table[0]?.guestType ?? null, conceptReputation: conceptPoints }] };
  }
  if (!right) spreadWord(draft, CONSEQUENCES.street.perWrong * K);
  else if (rocketCleared) spreadWord(draft, CONSEQUENCES.street.perCleared * K);
  // ORDER 299b — svaret lyfter eller sänker stämningen vid bordet, hos dem som
  // såg det och i rummet (sim/guestMood.ts); nöjdheten och ekonomin rörs inte.
  const witnessIds = applyAnswerMood(draft, table, right, K);
  const t = strings.answerEffects;
  const base = right
    ? (detail === 'avec' ? t.avec(ctx.table) : t.up(ctx.table, guestsIn))
    : leftGuestId ? t.tableLeaves(ctx.table) : detail === 'complaint' ? t.complaint(ctx.table) : detail === 'tips' ? t.tips(ctx.table) : t.down(ctx.table, left);
  // ORDER 303 E — tvekan syns: personalen saknade kunskapen.
  const text = hesitated ? `${t.hesitated} · ${base}` : base;
  const now = draft.simTime;
  const keep = (draft.day.roomReactions ?? []).filter((r) => now - r.at <= ANSWER_EFFECTS.reactionSimSeconds);
  draft.day = {
    ...draft.day,
    roomReactions: [...keep, { at: now, kind: right ? 'up' : 'down', table: ctx.table, guestIds: table.map((g) => g.id), text, amountSek, leftGuestId, detail, guestsIn, left, witnessIds }],
    consequence: { at: now, kind: right ? 'right' : 'wrong', table: ctx.table, tableGuestIds: table.map((g) => g.id), witnessIds }
  };
  return held;
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
  // ORDER 293 — i händelserna som teater tar Per, värden, över (Designs leverans 3).
  const role = THEATRE.eventAskSeconds[incident.id] ? 'värd' : INCIDENTS.takeoverRole[key] ?? 'servitör';
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
function letGuestsIn(draft: SimulationState, n0: number): number {
  // ORDER 314 — situationens andel (K): de hela gästerna, och resten med
  // sannolikheten som blir kvar (spelets rngState).
  let n = Math.floor(n0 * K);
  if (n0 * K - n > 0) {
    const rng = createRng(draft.rngState);
    if (rng.next() < n0 * K - n) n++;
    draft.rngState = rng.state;
  }
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
  // ORDER 314 — K: kassans del av en situation (fler situationer per kväll).
  let cashSek = e.cash * share * scenarioUnitSek(draft) * K;
  if (cashSek > 0 && best) cashSek *= bestAnswerFactor(draft);
  // ORDER 296b — ett fel kostar hälften så mycket i kassan.
  // ORDER 307b (304: "Ju högre klass … hårdare följder av fel svar") — ett fel
  // svars förlust i kassan gånger kvällens koncepts wrongFactor; wrongCashShare
  // är orörd (Anders 2026-10-05).
  if (cashSek < 0 && !best) cashSek *= INCIDENTS.wrongCashShare * conceptWrongFactor(draft);
  cashSek = clampScenarioCash(draft, cashSek);
  if (cashSek !== 0) {
    draft.economy = { ...draft.economy, weekScenarioCashSek: (draft.economy.weekScenarioCashSek ?? 0) + cashSek };
    applyCashDelta(draft, cashSek);
    postLedger(draft, { category: 'scenario', amount: cashSek, cause: strings.service.incident.ledger(incident.text.title), causeId: incident.id });
  }

  // Gästerna: nöjdheten syns i rummet (gästernas färg).
  const targets = targetsFor(draft, outcome.target, ctx);
  if (e.satisfaction !== 0) {
    for (const g of targets) g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + e.satisfaction * share * K));
  }
  const leave = Math.round((outcome.room?.leave ?? 0) * share);
  if (leave > 0) sendAway(draft, targets, leave);
  const arrive = Math.round((outcome.room?.arrive ?? 0) * share);
  if (arrive > 0) {
    draft.scenario = { ...draft.scenario, spawnedRemaining: draft.scenario.spawnedRemaining + arrive, nextSpawnAt: draft.simTime };
  }

  // Personalens ork är moralen, som personalens kompetens läser.
  if (e.stamina !== 0) bumpMorale(draft, e.stamina * share * K);
  if (e.reputation !== 0) draft.reputation = clampReputation(draft.reputation + (e.reputation * share * K) / REPUTATION.scale);

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
// ORDER 305 — kvitt eller dubbelt (balance.ts DOUBLE_OR_NOTHING).
export function potCredits(pot: RocketPot | null | undefined): number {
  return pot ? Object.values(pot.credits).reduce((a, b) => a + (b ?? 0), 0) : 0;
}
// Ett rätt steg: potten gånger growth (när den finns) plus stegets vinst.
function growPot(pot: RocketPot | null | undefined, axis: KnowledgeAxis, credit: number, cashSek: number, payerType: GuestType | null): RocketPot {
  const g = DOUBLE_OR_NOTHING.growth;
  const credits: Partial<Record<KnowledgeAxis, number>> = {};
  for (const [a, n] of Object.entries(pot?.credits ?? {}) as [KnowledgeAxis, number][]) credits[a] = n * g;
  credits[axis] = (credits[axis] ?? 0) + credit;
  return { credits, cashSek: Math.round((pot?.cashSek ?? 0) * g + cashSek), payerType: pot?.payerType ?? payerType };
}
// Potten tas: kronorna till kvällskassan, krediterna till reducern.
function takePot(draft: SimulationState, pot: RocketPot): void {
  bookTableCash(draft, pot.cashSek, pot.payerType);
  const due = { ...(draft.incidents!.potCreditsDue ?? {}) };
  for (const [a, n] of Object.entries(pot.credits) as [KnowledgeAxis, number][]) due[a] = (due[a] ?? 0) + n;
  draft.incidents = { ...draft.incidents!, potCreditsDue: due };
}
const payerOf = (draft: SimulationState, ctx: IncidentContext): GuestType | null =>
  draft.guests.find((g) => ctx.guestIds.includes(g.id) && PRESENT.includes(g.state))?.guestType ?? null;

// ORDER 305 — spelaren stannar efter ett rätt steg och tar potten.
// Personalen tar resten av händelsen med sitt utfall för stegen som återstod
// (som när ett steg faller), men utan felets följd: inget rykte, inget ord på
// gatan, ingen gäst som går.
export function stopIncident(draft: SimulationState): void {
  const inc = draft.incidents;
  const active = inc?.active;
  if (!inc || !active?.choosing) return;
  const incident = incidentById(draft.economy.businessClass, active.id);
  if (!incident) {
    draft.incidents = { ...inc, active: null };
    return;
  }
  const ctx = active.context;
  const before = meanSatisfaction(presentGuests(draft));
  const moraleBefore = draft.morale;
  const repBefore = draft.reputation;
  const pot = active.pot ?? null;
  if (pot) takePot(draft, pot);
  recordKvitt(draft, incident.id, active.step, 'stopRight');
  const share = INCIDENTS.staffShareByFailedStep[active.step] ?? 1;
  const staff = DOUBLE_OR_NOTHING.stopTakesStaffOutcome
    ? applyOutcome(draft, incident, incident.staff, incident.text.staff, share, false)
    : { cashSek: 0, ongoing: null };
  // ORDER 305b — utan personalens utfall säger texten att spelaren stannade.
  const text = DOUBLE_OR_NOTHING.stopTakesStaffOutcome ? formatIncidentText(incident.text.staff.outcome, ctx) : strings.rocket.card.kvitt.stoppedText;
  const after = meanSatisfaction(presentGuests(draft));
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: 'ambient',
    causeTag: null, causeChainId: null, sustainability: 'social', kind: 'v1_incident', scenarioId: incident.id
  }];
  const potRecord = { taken: true, credits: potCredits(pot), cashSek: pot?.cashSek ?? 0 };
  const cashSek = staff.cashSek + potRecord.cashSek;
  const now = draft.incidents!;
  const credits = (active.earned?.credits ?? 0) + potRecord.credits;
  const guestsIn = active.earned?.guestsIn ?? 0;
  draft.incidents = {
    ...now,
    active: null,
    ongoing: staff.ongoing ?? null,
    log: [...now.log, {
      id: incident.id, step: active.step, optionId: null, quality: 'stopped', situation: active.situation, context: ctx, at: draft.simTime,
      kind: active.backed ? 'backed' : active.chained ? 'chained' : 'planned',
      deltas: { cashSek, reputation: draft.reputation - repBefore, credits, guestsIn }, pot: potRecord
    }],
    lastOutcome: {
      incidentId: incident.id, optionId: null, reveal: active.revealed ?? null,
      takeover: DOUBLE_OR_NOTHING.stopTakesStaffOutcome ? takeoverFor(draft, incident, incident.steps[active.step]) : null,
      text, at: draft.simTime,
      deltas: { cashSek, satisfaction: before !== null && after !== null ? after - before : 0, stamina: draft.morale - moraleBefore, reputation: draft.reputation - repBefore },
      pot: potRecord
    }
  };
}

// ORDER 305 — spelaren satsar potten på nästa steg: stegets klocka börjar.
export function goOnIncident(draft: SimulationState): void {
  const active = draft.incidents?.active;
  if (!active?.choosing) return;
  draft.incidents = { ...draft.incidents!, active: { ...active, choosing: false, choiceLeft: 0 } };
}

// ORDER 310b — spelaren svarar: svaret låses och väntar på avgörandet
// (INCIDENTS.verdictSeconds). Inget av svarets följd verkar ännu. Ett struket
// eller okänt svar, ett svar under valet i kvitt eller dubbelt och ett andra
// svar medan det första väntar avvisas (false).
export function lockAnswer(draft: SimulationState, optionId: string): boolean {
  const inc = draft.incidents;
  const active = inc?.active;
  if (!inc || !active || active.pending || active.choosing) return false;
  const incident = incidentById(draft.economy.businessClass, active.id);
  const step = incident?.steps[active.step ?? 0];
  if (!step || !step.options.some((o) => o.id === optionId && !active.struck.includes(o.id))) return false;
  draft.incidents = {
    ...inc,
    active: { ...active, pending: { optionId, lockLeft: INCIDENTS.lockSeconds, verdictLeft: INCIDENTS.verdictSeconds } }
  };
  return true;
}

// ORDER 310b — avgörandet: det låsta svaret avgörs (resolveIncident).
export function settlePendingAnswer(draft: SimulationState): CreditChange | null {
  const inc = draft.incidents;
  const active = inc?.active;
  const p = active?.pending;
  if (!inc || !active || !p) return null;
  draft.incidents = { ...inc, active: { ...active, pending: null } };
  return resolveIncident(draft, p.optionId);
}

/**
 * ORDER 314 — klarar personalen situationen när spelaren inte svarar?
 * Sannolikheten är SITUATIONS.staffSuccessTrained när någon i laget har
 * situationens kunskapsområde (staffKnows, incidentArea), annars
 * staffSuccessUntrained. Slumpen går genom spelets rngState.
 */
export function staffHandles(draft: SimulationState, incident: Incident): boolean {
  const p = staffKnows(draft, incidentArea(incident.track)) ? SITUATIONS.staffSuccessTrained : SITUATIONS.staffSuccessUntrained;
  const rng = createRng(draft.rngState);
  const hit = rng.next() < p;
  draft.rngState = rng.state;
  return hit;
}

export function resolveIncident(draft: SimulationState, optionId: string | null): CreditChange | null {
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

  // ORDER 305b — ett svar efter att spelaren gått vidare i kvitt eller dubbelt.
  if (DOUBLE_OR_NOTHING.enabled && stepIndex > 0) recordKvitt(draft, incident.id, stepIndex, option && quality !== 'wrong' ? 'goRight' : 'goWrong');

  // Klarat steg: nästa steg öppnas i samma sammanhang.
  if (option && quality !== 'wrong' && stepIndex < incident.steps.length - 1) {
    const next = incident.steps[stepIndex + 1];
    const rng = createRng(draft.rngState);
    const struck = struckFor(draft, next, active.situation, () => rng.next());
    draft.rngState = rng.state;
    const secondsTotal = secondsFor(draft, next);
    const guestsIn = letGuestsIn(draft, INCIDENTS.guestsPerClearedStep);
    raiseTips(draft, active.context, MENU_ROCKETS.tipBonusPerClearedStep);
    // ORDER 305 — kvitt eller dubbelt: stegets krediter och bordets
    // merbeställning går i potten, och spelaren väljer att stanna eller gå vidare.
    const kvitt = DOUBLE_OR_NOTHING.enabled;
    const payer = payerOf(draft, active.context);
    const held = answerConsequence(draft, active.context, true, guestsIn, false, 'grave', false, incident.id, false, kvitt && DOUBLE_OR_NOTHING.potHoldsCash);
    const revealed: StepReveal = { step: stepIndex, optionId: option.id, correctId: correctOptionId(step, active.situation), cleared: true, guestsIn };
    const stepCredit = quality === 'best' ? INCIDENTS.bestAnswerCredit : 0;
    const earned = { credits: (active.earned?.credits ?? 0) + (kvitt ? 0 : stepCredit), guestsIn: (active.earned?.guestsIn ?? 0) + guestsIn };
    const pot = kvitt ? growPot(active.pot, step.axis, stepCredit, held, payer) : null;
    draft.incidents = {
      ...draft.incidents!,
      active: { ...active, step: stepIndex + 1, secondsTotal, secondsLeft: secondsTotal, struck, revealed, revealLeft: eventRevealSeconds(active, stepIndex), earned, pot, choosing: kvitt, choiceLeft: kvitt ? DOUBLE_OR_NOTHING.choiceSeconds : 0 }
    };
    return kvitt ? null : creditFor(stepCredit);
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
  // ORDER 314 — spelaren svarade inte: personalen tar över med sin egen
  // kompetens (kunskapsområdena från 303, sim/staffCondition.ts staffKnows).
  const staffCleared = option === null && staffHandles(draft, incident);
  if (cleared) {
    // Hela raketen klarad: bästa utfall.
    cashSek = applyOutcome(draft, incident, incident.success, incident.text.success, 1, true).cashSek;
    text = formatIncidentText(incident.text.success.outcome, ctx);
    credit = (quality === 'best' && !DOUBLE_OR_NOTHING.enabled ? INCIDENTS.bestAnswerCredit : 0) + (incident.success.effects.credit ?? 0);
  } else if (staffCleared) {
    // Personalen klarade det: en del av det bästa utfallet, och spelaren
    // tappar som förut en kredit för att inte ha svarat.
    cashSek = applyOutcome(draft, incident, incident.success, incident.text.success, SITUATIONS.staffSuccessShare, false).cashSek;
    text = formatIncidentText(incident.text.success.outcome, ctx);
    credit = -INCIDENTS.timeoutCreditPenalty;
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
  const chains = cleared || staffCleared ? [] : [...((option?.fail ?? step.fail).triggers ?? []), ...(incident.staff.triggers ?? [])];
  // ORDER 303 E — saknar personalen händelsens kunskapsområde tvekar de: ett
  // fel svar blir ett steg allvarligare, och trivseln sjunker.
  const hesitated = !cleared && !staffCleared && !staffKnows(draft, incidentArea(incident.track));
  if (hesitated) hesitationWellbeing(draft);
  const severity = cleared ? 'grave' : staffCleared ? 'mild' : hesitated ? worse(failSeverity(option?.fail ?? step.fail)) : failSeverity(option?.fail ?? step.fail);
  // ORDER 305 — kvitt eller dubbelt: en klarad raket tar potten (gånger
  // growth, med sista stegets vinst); ett fel eller tiden ute förlorar den.
  const kvitt = DOUBLE_OR_NOTHING.enabled;
  const payer = payerOf(draft, ctx);
  const heldLast = answerConsequence(draft, ctx, cleared || staffCleared, guestsIn, chains.length > 0, severity, cleared, incident.id, hesitated, kvitt && cleared && DOUBLE_OR_NOTHING.potHoldsCash);
  let potRecord: IncidentRecord['pot'];
  if (kvitt && cleared) {
    const pot = growPot(active.pot, step.axis, quality === 'best' ? INCIDENTS.bestAnswerCredit : 0, heldLast, payer);
    takePot(draft, pot);
    potRecord = { taken: true, credits: potCredits(pot), cashSek: pot.cashSek };
    cashSek += pot.cashSek;
  } else if (kvitt && active.pot) {
    potRecord = { taken: false, credits: potCredits(active.pot), cashSek: active.pot.cashSek };
  }
  const reveal: StepReveal = { step: stepIndex, optionId: option?.id ?? null, correctId: correctOptionId(step, active.situation), cleared, guestsIn };
  const takeover = cleared ? null : takeoverFor(draft, incident, step);
  const now = draft.incidents!;
  const record: IncidentRecord = {
    id: incident.id,
    step: cleared ? null : stepIndex,
    optionId: option?.id ?? null,
    quality: cleared ? 'best' : option ? 'wrong' : 'staff',
    // ORDER 314 — personalen tog över och klarade det (räknas inte som klarad av spelaren).
    ...(staffCleared ? { staffCleared: true } : {}),
    situation: active.situation,
    context: ctx,
    at: draft.simTime,
    kind: active.backed ? 'backed' : active.chained ? 'chained' : 'planned',
    deltas: {
      cashSek,
      reputation: draft.reputation - repBefore,
      credits: (active.earned?.credits ?? 0) + credit + (potRecord?.taken ? potRecord.credits : 0),
      guestsIn: (active.earned?.guestsIn ?? 0) + guestsIn
    },
    pot: potRecord
  };
  // ORDER 315c — klarade situationer i foodtrucken; ett "ok" i sista steget räknas som halvt grepp.
  countTruckSituation(draft, cleared, quality === 'ok');
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
      pot: potRecord
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

// ORDER 293 — i en händelse som teater visas svaret tills scenen har kommit
// till nästa fråga (THEATRE.eventAskSeconds), minst INCIDENTS.revealSeconds.
function eventRevealSeconds(active: ActiveIncident, stepIndex: number): number {
  const ask = active.backed ? undefined : THEATRE.eventAskSeconds[active.id];
  if (!ask || ask[stepIndex + 1] === undefined) return INCIDENTS.revealSeconds;
  return Math.max(INCIDENTS.revealSeconds, ask[stepIndex + 1] - ask[stepIndex]);
}

// Nedräkningen går i verklig tid: en tick är dt spelsekunder, och i farten
// `speed` motsvarar det dt / speed verkliga sekunder.
// ORDER 310b — 'expired' när stegets tid eller valets tid är ute, 'verdict'
// när ett låst svar ska avgöras (settlePendingAnswer), annars null.
export function countDown(draft: SimulationState, dt: number): 'expired' | 'verdict' | null {
  let inc = draft.incidents;
  if (!inc?.active) return null;
  // ORDER 314 — under situationen går spelet i 1× (consequence.ts effectiveSpeed).
  let real = dt / Math.max(1, effectiveSpeed(draft));
  // ORDER 310b — väntan på avgörandet räknas från trycket, i verklig tid.
  const p = inc.active.pending;
  let verdict = false;
  if (p) {
    const v = p.verdictLeft - real;
    verdict = v <= 0;
    draft.incidents = inc = { ...inc, active: { ...inc.active, pending: { ...p, lockLeft: Math.max(0, p.lockLeft - real), verdictLeft: Math.max(0, v) } } };
  }
  const held = verdict ? 'verdict' : null;
  // ORDER 286a — först figurens klipp i rummet; stegets klocka står under tiden.
  const intro = inc.active!.introLeft ?? 0;
  if (intro > 0) {
    draft.incidents = { ...inc, active: { ...inc.active!, introLeft: Math.max(0, intro - real) } };
    return held;
  }
  const reveal = inc.active!.revealLeft ?? 0;
  if (reveal > 0) {
    // Svaret i stunden visas först; stegets tid börjar sedan på full tid.
    const rest = reveal - real;
    draft.incidents = { ...inc, active: { ...inc.active!, revealLeft: Math.max(0, rest), revealed: rest > 0 ? inc.active!.revealed : null } };
    if (rest > 0) return held;
    real = -rest;
  }
  // ORDER 310b — stegets klocka står medan svaret väntar på avgörandet.
  if (p) return held;
  // ORDER 305 — kvitt eller dubbelt: valet efter ett rätt steg har sin egen
  // tid, och stegets klocka börjar först när spelaren gått vidare. När tiden
  // går ut stannar spelaren (reducer.ts TICK).
  const c = draft.incidents.active!;
  if (c.choosing) {
    const choice = (c.choiceLeft ?? DOUBLE_OR_NOTHING.choiceSeconds) - real;
    draft.incidents = { ...draft.incidents, active: { ...c, choiceLeft: Math.max(0, choice) } };
    return choice <= 0 ? 'expired' : null;
  }
  const a = draft.incidents.active!;
  const left = a.secondsLeft - real;
  draft.incidents = { ...draft.incidents, active: { ...a, secondsLeft: Math.max(0, left) } };
  return left <= 0 ? 'expired' : null;
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
  // ORDER 310b — ett låst svar som väntar avgörs när servicen stänger.
  const credit = inc.active ? (inc.active.pending ? settlePendingAnswer(draft) : resolveIncident(draft, null)) : null;
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
