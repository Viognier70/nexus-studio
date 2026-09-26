// ORDER 270 — händelserna i servicen (Vision Owner 2026-09-26, efter
// provspelet). Speldesign > Servicen > Händelserna i servicen.
//
// Servicen är en följd av händelser: 3–6 per kväll, fler fredag och
// lördag, i en båge med öppning, rusning, kris och avslut. Medan en
// händelse är öppen står rummet stilla och nedräkningen går i verklig
// tid (20 s). Uteblir svaret beslutar personalen själv, med sämre utfall
// och −1 kredit. Medaljer i händelsens paviljong ger mer tid och, från
// silver, stryker ett fel alternativ. Varje svar verkar direkt: i kassan,
// på gästerna (nöjdheten syns i rummet), på personalens ork (moralen)
// och i ryktet. Ett val kan utlösa eller förhindra en senare händelse.
//
// Talen står i `balance.ts` `INCIDENTS`; händelserna i händelsebanken.

import type { Guest, KnowledgeAxis, SimulationState, YrkesSpar } from '../strategic/types';
import { createRng } from '../strategic/util/rng';
import { bumpMorale } from '../strategic/simulation/morale';
import { applyCashDelta, postLedger } from '../strategic/simulation/cashReading';
import { clampReputation } from '../strategic/simulation/reputation';
import { strings } from '../content/strings.sv';
import { INCIDENTS, REPUTATION } from './balance';
import { calendarFor } from './calendar';
import { clampScenarioCash, scenarioUnitSek } from './economy';
import { bestAnswerFactor, medalSteps } from './knowledgeInService';
import {
  incidentBankFor,
  incidentById,
  type AnswerQuality,
  type ArcPhase,
  type Incident,
  type IncidentOutcomeMeta
} from './incidentBank';

export interface IncidentContext {
  table: number;
  guestIds: string[];
  guest: string;
  wine: string;
  staff: string;
}

export interface ActiveIncident {
  id: string;
  openedAt: number;
  secondsTotal: number;
  secondsLeft: number;
  // Ett fel alternativ som spelarens medaljer strukit.
  struck: string[];
  // Sant när händelsen kom som följd av ett tidigare val.
  chained: boolean;
  context: IncidentContext;
}

export interface IncidentRecord {
  id: string;
  // null när personalen beslutade själv.
  optionId: string | null;
  quality: AnswerQuality | 'staff';
  context: IncidentContext;
  at: number;
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
  text: string;
  at: number;
  deltas: IncidentDeltas;
}

export interface LessonItem {
  incidentId: string;
  title: string;
  chosen: string | null;
  explanation: string;
  better: string;
  betterExplanation: string;
}

export interface IncidentsState {
  // Sant under en service där klassen har en händelsebank.
  enabled: boolean;
  slots: { at: number; phase: ArcPhase }[];
  queued: string[];
  blocked: string[];
  fired: string[];
  chainsAdded: number;
  serviceEndsAt: number | null;
  active: ActiveIncident | null;
  log: IncidentRecord[];
  lastOutcome: IncidentOutcomeView | null;
  // Kvällens lärdom, satt när servicen stänger och läst i kvällen.
  lesson: LessonItem[] | null;
  // Mognadens evidens (Professionell mognad och portfolio).
  eveningsTurned: number;
  lessonEvenings: number;
  turnedTonight: boolean;
}

export function initialIncidents(): IncidentsState {
  return {
    enabled: false, slots: [], queued: [], blocked: [], fired: [], chainsAdded: 0,
    serviceEndsAt: null, active: null, log: [], lastOutcome: null, lesson: null,
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
    incidents: { ...reset, enabled: true, slots, serviceEndsAt }
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
  const seated = state.guests.filter((g) => PRESENT.includes(g.state) && g.seatIndex !== null);
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
    staff: (role && s.staffRoles[role]) || s.staffFallback
  };
}

// Spelartextens platshållare fylls ur kvällens sammanhang. Första bokstaven
// i varje mening blir stor, eftersom en platshållare kan inleda en mening.
export function formatIncidentText(text: string, ctx: IncidentContext): string {
  const filled = text
    .replace(/\{bord\}/g, String(ctx.table))
    .replace(/\{gäst\}/g, ctx.guest)
    .replace(/\{vin\}/g, ctx.wine)
    .replace(/\{personal\}/g, ctx.staff);
  return filled.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

// Nästa händelse: en kedjad först, annars en ur bågens fas som inte
// kommit i kväll.
function chooseIncident(state: SimulationState, phase: ArcPhase, r: number): { incident: Incident; chained: boolean } | null {
  const inc = incidentsOf(state);
  const bank = incidentBankFor(state.economy.businessClass);
  const queuedId = inc.queued.find((id) => !inc.blocked.includes(id) && !inc.fired.includes(id));
  if (queuedId) {
    const q = bank.find((i) => i.id === queuedId);
    if (q) return { incident: q, chained: true };
  }
  const weekday = calendarFor(state.day.dayNumber).weekday;
  const free = bank.filter((i) =>
    !i.chainOnly && !inc.fired.includes(i.id) && !inc.blocked.includes(i.id) &&
    (!i.weekdays || i.weekdays.includes(weekday)));
  const inPhase = free.filter((i) => i.arc === phase);
  const pool = inPhase.length > 0 ? inPhase : free;
  if (pool.length === 0) return null;
  return { incident: pick(pool, r), chained: false };
}

export function secondsFor(state: SimulationState, incident: Incident): number {
  return INCIDENTS.countdownSeconds + INCIDENTS.extraSecondsPerMedalStep * medalSteps(state.medals, incident.pavilion);
}

// Öppna nästa händelse när dess tid har kommit (anropas varje tick under
// servicen, efter att dörrarna öppnat).
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
  const { incident, chained } = chosen;
  const steps = medalSteps(draft.medals, incident.pavilion);
  const wrong = incident.options.filter((o) => o.quality === 'wrong');
  const struck = steps >= INCIDENTS.strikeWrongFromMedalSteps && wrong.length > 0 ? [pick(wrong, r()).id] : [];
  const secondsTotal = secondsFor(draft, incident);
  draft.incidents = {
    ...inc,
    slots,
    queued: inc.queued.filter((id) => id !== incident.id),
    fired: [...inc.fired, incident.id],
    active: { id: incident.id, openedAt: draft.simTime, secondsTotal, secondsLeft: secondsTotal, struck, chained, context: contextFor(draft, r) }
  };
  draft.rngState = rng.state;
}

export interface CreditChange { axis: KnowledgeAxis; track: YrkesSpar | null; amount: number }

function targetsFor(draft: SimulationState, outcome: IncidentOutcomeMeta, ctx: IncidentContext): Guest[] {
  const present = presentGuests(draft);
  if (outcome.target === 'table') {
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

// Svaret (eller personalens eget beslut när optionId är null). Muterar
// draft (samma mönster som advanceTick) och returnerar krediten som
// reducern bokför via ACCUMULATE_KNOWLEDGE.
export function resolveIncident(draft: SimulationState, optionId: string | null): CreditChange | null {
  const inc = draft.incidents;
  const active = inc?.active;
  if (!inc || !active) return null;
  const incident = incidentById(draft.economy.businessClass, active.id);
  if (!incident) {
    draft.incidents = { ...inc, active: null };
    return null;
  }
  const option = optionId === null ? null : incident.options.find((o) => o.id === optionId && !active.struck.includes(o.id));
  if (optionId !== null && !option) return null;
  const outcome: IncidentOutcomeMeta = option ?? incident.staff;
  const ctx = active.context;
  const e = outcome.effects;

  // Kassan: enheter av klassens normala veckointäkt, inom veckans ±20 %.
  let cashSek = e.cash * scenarioUnitSek(draft);
  if (cashSek > 0 && option?.quality === 'best') cashSek *= bestAnswerFactor(draft);
  cashSek = clampScenarioCash(draft, cashSek);
  if (cashSek !== 0) {
    draft.economy = { ...draft.economy, weekScenarioCashSek: (draft.economy.weekScenarioCashSek ?? 0) + cashSek };
    applyCashDelta(draft, cashSek);
    postLedger(draft, { category: 'scenario', amount: cashSek, cause: strings.service.incident.ledger(incident.text.title), causeId: incident.id });
  }

  // Gästerna: nöjdheten syns i rummet (gästernas färg).
  const targets = targetsFor(draft, outcome, ctx);
  const before = meanSatisfaction(presentGuests(draft));
  if (e.satisfaction !== 0) {
    for (const g of targets) g.satisfaction = Math.max(0, Math.min(1, g.satisfaction + e.satisfaction));
  }
  if (outcome.room?.leave) sendAway(draft, targets, outcome.room.leave);
  if (outcome.room?.arrive) {
    draft.scenario = { ...draft.scenario, spawnedRemaining: draft.scenario.spawnedRemaining + outcome.room.arrive, nextSpawnAt: draft.simTime };
  }
  const after = meanSatisfaction(presentGuests(draft));

  // Personalens ork är moralen, som personalens kompetens läser.
  const moraleBefore = draft.morale;
  if (e.stamina !== 0) bumpMorale(draft, e.stamina);
  const repBefore = draft.reputation;
  if (e.reputation !== 0) draft.reputation = clampReputation(draft.reputation + e.reputation / REPUTATION.scale);

  // Kedjor.
  let queued = [...inc.queued];
  let blocked = [...inc.blocked];
  let slots = [...inc.slots];
  let chainsAdded = inc.chainsAdded;
  for (const id of outcome.prevents ?? []) {
    blocked = [...blocked, id];
    queued = queued.filter((q) => q !== id);
  }
  for (const id of outcome.triggers ?? []) {
    if (blocked.includes(id) || inc.fired.includes(id) || queued.includes(id)) continue;
    const at = draft.simTime + INCIDENTS.chainDelaySimSeconds;
    if (chainsAdded >= INCIDENTS.chainExtraMax || inc.serviceEndsAt === null || at >= inc.serviceEndsAt) continue;
    queued = [...queued, id];
    const chainedIncident = incidentById(draft.economy.businessClass, id);
    slots = [...slots, { at, phase: chainedIncident?.arc ?? 'crisis' }].sort((a, b) => a.at - b.at);
    chainsAdded += 1;
  }

  const text = formatIncidentText(option ? incident.text.options[option.id].outcome : incident.text.staff.outcome, ctx);
  const quality: IncidentRecord['quality'] = option ? option.quality : 'staff';
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: quality === 'best' ? 'positive' : 'ambient',
    causeTag: null, causeChainId: null, sustainability: 'social', kind: 'v1_incident', scenarioId: incident.id
  }];
  draft.incidents = {
    ...inc,
    active: null,
    queued, blocked, slots, chainsAdded,
    log: [...inc.log, { id: incident.id, optionId: option?.id ?? null, quality, context: ctx, at: draft.simTime }],
    turnedTonight: inc.turnedTonight || (incident.arc === 'crisis' && quality === 'best'),
    lastOutcome: {
      incidentId: incident.id,
      optionId: option?.id ?? null,
      text,
      at: draft.simTime,
      deltas: {
        cashSek,
        satisfaction: before !== null && after !== null ? after - before : e.satisfaction,
        stamina: draft.morale - moraleBefore,
        reputation: draft.reputation - repBefore
      }
    }
  };
  if (!option) return { axis: incident.axis, track: incident.track, amount: -INCIDENTS.timeoutCreditPenalty };
  if (option.quality === 'best') return { axis: incident.axis, track: incident.track, amount: INCIDENTS.bestAnswerCredit };
  return null;
}

// Nedräkningen går i verklig tid: en tick är dt spelsekunder, och i farten
// `speed` motsvarar det dt / speed verkliga sekunder.
export function countDown(draft: SimulationState, dt: number): boolean {
  const inc = draft.incidents;
  if (!inc?.active) return false;
  const real = dt / Math.max(1, draft.speed);
  const left = inc.active.secondsLeft - real;
  draft.incidents = { ...inc, active: { ...inc.active, secondsLeft: Math.max(0, left) } };
  return left <= 0;
}

// Kvällens lärdom: förklaringen till de fel beslut spelaren tog, och till
// händelserna där personalen fick besluta själv.
export function lessonFor(state: SimulationState): LessonItem[] {
  const inc = incidentsOf(state);
  const items: LessonItem[] = [];
  for (const rec of inc.log) {
    if (rec.quality !== 'wrong' && rec.quality !== 'staff') continue;
    const incident = incidentById(state.economy.businessClass, rec.id);
    if (!incident) continue;
    const best = incident.options.find((o) => o.quality === 'best');
    if (!best) continue;
    const f = (t: string) => formatIncidentText(t, rec.context);
    const chosen = rec.optionId ? incident.text.options[rec.optionId] : null;
    items.push({
      incidentId: rec.id,
      title: f(incident.text.title),
      chosen: chosen ? f(chosen.label) : null,
      explanation: chosen ? f(chosen.explanation) : f(incident.text.staff.outcome),
      better: f(incident.text.options[best.id].label),
      betterExplanation: f(incident.text.options[best.id].explanation)
    });
  }
  return items;
}

// När servicen stänger (naturligt eller vid kollaps).
export function closeIncidents(draft: SimulationState): void {
  const inc = draft.incidents;
  if (!inc || !inc.enabled) return;
  const lesson = lessonFor(draft);
  draft.incidents = {
    ...inc,
    enabled: false,
    active: null,
    slots: [],
    queued: [],
    lesson,
    lessonEvenings: inc.lessonEvenings + (inc.log.length > 0 ? 1 : 0),
    eveningsTurned: inc.eveningsTurned + (inc.turnedTonight ? 1 : 0)
  };
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

// Harnessens och skriptens val: det bästa svaret, eller det sämsta (fel
// svar med lägst summa av effekterna). Strukna alternativ väljs aldrig.
export function rankedIncidentOption(incident: Incident, rank: 'best' | 'worst', struck: readonly string[] = []): string {
  const open = incident.options.filter((o) => !struck.includes(o.id));
  if (rank === 'best') return (open.find((o) => o.quality === 'best') ?? open[0]).id;
  const score = (o: Incident['options'][number]) =>
    o.effects.cash + o.effects.satisfaction + o.effects.stamina + o.effects.reputation / REPUTATION.scale;
  const wrong = open.filter((o) => o.quality === 'wrong');
  const pool = wrong.length > 0 ? wrong : open;
  return [...pool].sort((a, b) => score(a) - score(b))[0].id;
}
