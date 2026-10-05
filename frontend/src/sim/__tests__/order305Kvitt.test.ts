// ORDER 305 — kvitt eller dubbelt (balance.ts DOUBLE_OR_NOTHING; påslaget
// i ORDER 305b). Efter ett rätt steg väljer spelaren att stanna och ta
// potten, eller satsa den på nästa steg.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SimulationState } from '../../strategic/types';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { DOUBLE_OR_NOTHING, INCIDENTS } from '../balance';
import { incidentById } from '../incidentBank';
import { rankedStepOption, totalCredits } from '../incidents';
import { stocked } from '../../strategic/testHarness/stocked';
import { rocketTally } from '../economy';
import type { IncidentRecord } from '../incidents';

const TICK = { type: 'TICK', dt: 0.2 } as const;
const ID = 'vb09-getosten';

function tick(s: SimulationState, n: number): SimulationState {
  for (let i = 0; i < n; i++) s = reducer(s, TICK);
  return s;
}
function wineBarService(): SimulationState {
  let s = makeNewGameState(7);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2 };
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  return reducer(stocked(s), { type: 'START_SERVICE' });
}
function answer(s: SimulationState, rank: 'best' | 'worst' = 'best'): SimulationState {
  const a = s.incidents.active!;
  if (a.choosing) return reducer(s, { type: 'INCIDENT_GO' });
  const step = incidentById('vinbar', a.id)!.steps[a.step];
  return reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, rank, a.struck, a.situation) });
}
function openNow(s: SimulationState, id: string): SimulationState {
  s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
  if (!s.day.doorsOpenedThisService) s = tick(s, 700);
  for (let i = 0; i < 2000 && s.incidents.active?.id !== id; i++) {
    if (s.incidents.active) s = answer(s);
    s = reducer(s, TICK);
  }
  for (let i = 0; i < 2000 && (s.incidents.active?.introLeft ?? 0) > 0; i++) s = reducer(s, TICK);
  return s;
}
const last = (s: SimulationState) => s.incidents.log[s.incidents.log.length - 1];
const C = INCIDENTS.bestAnswerCredit;

describe('ORDER 305 — kvitt eller dubbelt', () => {
  let open: SimulationState;
  beforeEach(() => {
    DOUBLE_OR_NOTHING.enabled = true;
    open = openNow(wineBarService(), ID);
    expect(open.incidents.active?.id).toBe(ID);
  });
  afterEach(() => {
    // ORDER 305b — påslaget i spelet.
    DOUBLE_OR_NOTHING.enabled = true;
  });

  it('avstängt: nästa steg öppnas direkt och stegets kredit bokförs som förut', () => {
    DOUBLE_OR_NOTHING.enabled = false;
    const s = answer(open);
    expect(s.incidents.active?.choosing).toBeFalsy();
    expect(totalCredits(s)).toBe(totalCredits(open) + C);
  });

  it('efter ett rätt steg väljer spelaren; svaret på nästa steg väntar', () => {
    const s = answer(open);
    expect(s.incidents.active?.choosing).toBe(true);
    expect(s.incidents.active?.pot?.credits.episteme).toBe(C);
    // Krediten ligger i potten, inte bokförd.
    expect(totalCredits(s)).toBe(totalCredits(open));
    const step = incidentById('vinbar', ID)!.steps[1];
    const blocked = reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(step, 'best', s.incidents.active!.struck, s.incidents.active!.situation) });
    expect(blocked).toBe(s);
  });

  it('stanna: potten tas, personalen tar resten utan felets följd', () => {
    const s = reducer(answer(open), { type: 'INCIDENT_STOP' });
    expect(s.incidents.active).toBeNull();
    expect(last(s).quality).toBe('stopped');
    expect(last(s).pot?.taken).toBe(true);
    expect(totalCredits(s)).toBe(totalCredits(open) + C);
    expect(s.day.answerReviews?.filter((r) => !r.right)).toHaveLength(0);
  });

  it('gå vidare och svara fel: hela potten går förlorad', () => {
    let s = reducer(answer(open), { type: 'INCIDENT_GO' });
    s = answer(s, 'worst');
    expect(last(s).quality).toBe('wrong');
    expect(last(s).pot).toEqual(expect.objectContaining({ taken: false, credits: C }));
    expect(totalCredits(s)).toBeLessThanOrEqual(totalCredits(open));
  });

  it('hela vägen: potten dubblas för varje steg och tas när raketen klaras', () => {
    let s = open;
    for (let i = 0; i < 2000 && s.incidents.active; i++) s = answer(s);
    expect(last(s).quality).toBe('best');
    // (C × 2 + C) × 2 + C
    expect(last(s).pot).toEqual(expect.objectContaining({ taken: true, credits: (C * 2 + C) * 2 + C }));
  });

  it('valets tid går ut: spelaren stannar', () => {
    let s = answer(open);
    for (let i = 0; i < 2000 && s.incidents.active; i++) s = reducer(s, TICK);
    expect(last(s).quality).toBe('stopped');
  });
});

describe('ORDER 305b — stjärnans andel klarade raketer', () => {
  const rec = (quality: IncidentRecord['quality'], step: number | null): IncidentRecord =>
    ({ id: ID, step, optionId: null, quality, situation: null, context: { table: 1, guestIds: [], staff: '', clock: '' } as unknown as IncidentRecord['context'], at: 0, kind: 'planned' });

  it('stannar efter steg 2: klarad; efter steg 1: inte klarad', () => {
    expect(DOUBLE_OR_NOTHING.stopCountsAsClearedFrom).toBe(2);
    const t = rocketTally([rec('stopped', 2), rec('stopped', 1), rec('best', null), rec('wrong', 1)], 'vinbar');
    expect(t.fired).toBe(4);
    expect(t.cleared).toBe(2);
    // Stegen: 2 + 1 + 3 rätt, och felet på steg 2 räknas som ett steg.
    expect(t.stepsRight).toBe(2 + 1 + 3 + 1);
    expect(t.steps).toBe(2 + 1 + 3 + 2);
  });
});
