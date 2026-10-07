// ORDER 310b (Anders 2026-10-05: "Det ska dröja, för det är där spänningen
// finns") — Designs lås och väntan i simuleringen. Svaret låses vid trycket,
// låset slår igen efter INCIDENTS.lockSeconds (0,9 s) och svaret avgörs efter
// INCIDENTS.verdictSeconds (3,8 s), i verklig tid. Under väntan står stegets
// klocka, och ingenting av svarets följd syns: rummet, kassan, krediterna,
// loggen och bandet är som om spelaren inte hade svarat. Valet i kvitt eller
// dubbelt kommer efter avgörandet. Tiden ute avgörs direkt, som förut.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { DOUBLE_OR_NOTHING, INCIDENTS } from '../balance';
import { incidentById } from '../incidentBank';
import { closeIncidents, pendingPhase, rankedStepOption } from '../incidents';
import type { SimulationState } from '../../strategic/types';
import { stocked } from '../../strategic/testHarness/stocked';
import { untilVerdict } from './verdict';

const TICK = { type: 'TICK', dt: 0.2 } as const;
// Farten 2: en tick är 0,1 s i verkligheten.
const SPEED = 2;
// ORDER 314 — under situationen går spelet i 1× (consequence.ts effectiveSpeed):
// en tick är då TICK.dt verkliga sekunder, oavsett spelarens hastighet.
const REAL_PER_TICK = TICK.dt;

function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, TICK);
  return s;
}

function wineBarService(): SimulationState {
  let s = makeNewGameState(7);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: SPEED };
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  return reducer(stocked(s), { type: 'START_SERVICE' });
}

function best(s: SimulationState, rank: 'best' | 'worst' = 'best'): string {
  const a = s.incidents.active!;
  return rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], rank, a.struck, a.situation);
}

function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    if (s.incidents.active) s = s.incidents.active.choosing ? reducer(s, { type: 'INCIDENT_GO' }) : untilVerdict(reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) }));
    s = reducer(s, TICK);
  }
  expect(s.incidents.active?.id).toBe(id);
  for (let i = 0; i < 2000 && (s.incidents.active?.introLeft ?? 0) > 0; i++) s = reducer(s, TICK);
  return s;
}

const ID = 'vb09-getosten';
const ticksFor = (seconds: number) => Math.round(seconds / REAL_PER_TICK);

describe('ORDER 310b — låset och väntan i simuleringen', () => {
  it('talen står i balance.ts: låset vid 0,9 s och avgörandet vid 3,8 s', () => {
    expect(INCIDENTS.lockSeconds).toBe(0.9);
    expect(INCIDENTS.verdictSeconds).toBe(3.8);
    expect(INCIDENTS.lockSeconds).toBeLessThan(INCIDENTS.verdictSeconds);
  });

  it('svaret låses vid trycket, och låset slår igen vid 0,9 s', () => {
    const open = openNow(wineBarService(), ID);
    const s = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'c' });
    expect(s.incidents.active!.pending).toEqual({ optionId: 'c', lockLeft: INCIDENTS.lockSeconds, verdictLeft: INCIDENTS.verdictSeconds });
    expect(pendingPhase(s.incidents.active)).toBe('lock');
    expect(pendingPhase(tick(s, ticksFor(INCIDENTS.lockSeconds) - 1).incidents.active)).toBe('lock');
    const locked = tick(s, ticksFor(INCIDENTS.lockSeconds) + 1);
    expect(pendingPhase(locked.incidents.active)).toBe('wait');
    expect(locked.incidents.active!.pending!.lockLeft).toBe(0);
    // Ett andra svar medan det första väntar ändrar ingenting.
    expect(reducer(s, { type: 'ANSWER_INCIDENT', optionId: 'a' })).toBe(s);
    expect(reducer(locked, { type: 'ANSWER_INCIDENT', optionId: 'a' })).toBe(locked);
  });

  it('avgörandet kommer vid 3,8 s, inte före', () => {
    const open = openNow(wineBarService(), ID);
    let s = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'c' });
    let ticks = 0;
    while (s.incidents.active?.pending && ticks < 1000) { s = reducer(s, TICK); ticks++; }
    // Avgörandet i den tick där 3,8 verkliga sekunder har gått (avrundning i flyttal: högst en tick till).
    expect(ticks * REAL_PER_TICK).toBeGreaterThanOrEqual(INCIDENTS.verdictSeconds - 1e-9);
    expect(ticks * REAL_PER_TICK).toBeLessThanOrEqual(INCIDENTS.verdictSeconds + REAL_PER_TICK + 1e-9);
    // Rätt svar: steget är klarat och svaret visas, med valet efter.
    expect(s.incidents.active!.revealed).toMatchObject({ step: 0, optionId: 'c', cleared: true });
    expect(s.incidents.active!.step).toBe(1);
  });

  it('inget av svaret verkar före avgörandet: rummet, kassan, krediterna och loggen är som utan svar', () => {
    const open = openNow(wineBarService(), ID);
    const n = ticksFor(INCIDENTS.verdictSeconds) - 2;
    const answered = tick(reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'c' }), n);
    const unanswered = tick(open, n);
    expect(answered.incidents.active!.pending).toBeTruthy();
    expect(answered.cash).toBe(unanswered.cash);
    expect(answered.revenue).toBe(unanswered.revenue);
    expect(answered.reputation).toBe(unanswered.reputation);
    expect(answered.morale).toBe(unanswered.morale);
    expect(answered.knowledgeCredits).toEqual(unanswered.knowledgeCredits);
    expect(answered.scenario.spawnedRemaining).toBe(unanswered.scenario.spawnedRemaining);
    expect(answered.guests.map((g) => [g.id, g.state, g.satisfaction, g.tipBonus ?? 0])).toEqual(unanswered.guests.map((g) => [g.id, g.state, g.satisfaction, g.tipBonus ?? 0]));
    expect(answered.day.roomReactions ?? []).toEqual(unanswered.day.roomReactions ?? []);
    expect(answered.day.consequence ?? null).toEqual(unanswered.day.consequence ?? null);
    expect(answered.incidents.log).toEqual(unanswered.incidents.log);
    expect(answered.incidents.lastOutcome).toEqual(unanswered.incidents.lastOutcome);
    expect(answered.incidents.active!.step).toBe(0);
    expect(answered.incidents.active!.revealed ?? null).toBeNull();
    expect(answered.kvittLog ?? []).toEqual(unanswered.kvittLog ?? []);
    // Stegets klocka står under väntan; utan svar går den.
    expect(answered.incidents.active!.secondsLeft).toBe(open.incidents.active!.secondsLeft);
    expect(unanswered.incidents.active!.secondsLeft).toBeLessThan(open.incidents.active!.secondsLeft);
    // Efter avgörandet syns svaret i rummet.
    const after = untilVerdict(answered);
    expect((after.day.roomReactions ?? []).length).toBeGreaterThan((answered.day.roomReactions ?? []).length);
  });

  it('fel svar: följden, personalen och loggen kommer vid avgörandet', () => {
    const open = openNow(wineBarService(), ID);
    const s = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    const waiting = tick(s, ticksFor(INCIDENTS.verdictSeconds) - 2);
    expect(waiting.incidents.active?.id).toBe(ID);
    expect(waiting.incidents.lastOutcome).toEqual(open.incidents.lastOutcome);
    const after = untilVerdict(waiting);
    expect(after.incidents.active).toBeNull();
    expect(after.incidents.log.at(-1)).toMatchObject({ id: ID, step: 0, optionId: 'a', quality: 'wrong' });
    expect(after.incidents.lastOutcome?.takeover).toBeTruthy();
  });

  it('valet i kvitt eller dubbelt kommer efter avgörandet, och dess 8 s börjar efter visningen', () => {
    const open = openNow(wineBarService(), ID);
    const waiting = tick(reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'c' }), ticksFor(INCIDENTS.lockSeconds) + 5);
    expect(waiting.incidents.active!.choosing ?? false).toBe(false);
    expect(waiting.incidents.active!.pot ?? null).toBeNull();
    // Under väntan finns inget val att göra.
    expect(reducer(waiting, { type: 'INCIDENT_STOP' })).toBe(waiting);
    const after = untilVerdict(waiting);
    expect(after.incidents.active!.choosing).toBe(true);
    expect(after.incidents.active!.pot?.credits.episteme).toBe(INCIDENTS.bestAnswerCredit);
    expect(after.incidents.active!.choiceLeft).toBe(DOUBLE_OR_NOTHING.choiceSeconds);
    let s = after;
    for (let i = 0; i < 400 && (s.incidents.active?.revealLeft ?? 0) > 0; i++) s = reducer(s, TICK);
    s = tick(s, 5);
    expect(s.incidents.active!.choiceLeft!).toBeLessThan(DOUBLE_OR_NOTHING.choiceSeconds);
    // Gå vidare: nästa steg frågar, och nästa svar väntar också.
    s = reducer(s, { type: 'INCIDENT_GO' });
    s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
    expect(pendingPhase(s.incidents.active)).toBe('lock');
    expect(s.incidents.active!.step).toBe(1);
  });

  it('tiden ute avgörs direkt, utan väntan', () => {
    const open = openNow(wineBarService(), ID);
    let s = open;
    let ticks = 0;
    while (s.incidents.active?.id === ID && ticks < 2000) { s = reducer(s, TICK); ticks++; }
    // ORDER 314 — ±1 tick: 0,2 s dras av hundra gånger i flyttal.
    expect(Math.abs(ticks - Math.ceil(open.incidents.active!.secondsLeft / REAL_PER_TICK - 1e-9))).toBeLessThanOrEqual(1);
    expect(s.incidents.log.at(-1)).toMatchObject({ id: ID, step: 0, optionId: null, quality: 'staff' });
  });

  it('när servicen stänger under väntan avgörs det låsta svaret', () => {
    const open = openNow(wineBarService(), ID);
    const s = reducer(open, { type: 'ANSWER_INCIDENT', optionId: 'a' });
    const draft: SimulationState = { ...s, guests: s.guests.map((g) => ({ ...g })), day: { ...s.day } };
    closeIncidents(draft);
    expect(draft.incidents.active).toBeNull();
    expect(draft.incidents.log.at(-1)).toMatchObject({ id: ID, optionId: 'a', quality: 'wrong' });
  });

  // ORDER 314 — Stå för ditt svar är borttagen; provet med en egen raket är borta.
});
