// ORDER 289 — rättelser efter provspelet av 285 (Vision Owner 2026-09-29).
// "Raketen fastnar": en egen raket spelas genom alla tre stegen till slut.
// ORDER 305b — säkerheten och det låsta svaret är borttagna; spelaren går
// vidare eller stannar i kvitt eller dubbelt, och när valets tid går ut
// stannar hen.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { incidentById } from '../incidentBank';
import { canStartBack, rankedStepOption } from '../incidents';
import { rocketCounter } from '../../strategic/ui/service/serviceView';
import { PLAYERS } from '../../strategic/testHarness/randomness';
import type { SimulationState } from '../../strategic/types';

const TICK = { type: 'TICK', dt: 0.2 } as const;

function withCredits(s: SimulationState, n: number): SimulationState {
  return {
    ...s,
    knowledgeCredits: { episteme: n, techne: n, phronesis: n },
    knowledgeTracks: {
      episteme: { untagged: n, sommellerie: 0, kok: 0 },
      techne: { untagged: n, sommellerie: 0, kok: 0 },
      phronesis: { untagged: n, sommellerie: 0, kok: 0 }
    }
  };
}

function evening(seed: number): SimulationState {
  let s = makeNewGameState(seed);
  s = withCredits({ ...s, medals: { ...PLAYERS.baseline }, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 4 } }, 20);
  s = reducer(s, { type: 'BUY_PACKAGE', packageId: 'vinbar-base' });
  return reducer(s, { type: 'START_SERVICE' });
}

function best(s: SimulationState): string {
  const a = s.incidents.active!;
  return rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], 'best', a.struck, a.situation);
}

function toBacked(s: SimulationState): SimulationState {
  for (let i = 0; i < 20000 && !canStartBack(s) && s.day.period === 'dinner'; i++) {
    if (s.incidents.active) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
    s = reducer(s, TICK);
  }
  expect(canStartBack(s)).toBe(true);
  return reducer(s, { type: 'START_BACK' });
}

// Väntar ut det visade svaret mellan stegen (revealLeft).
function toNextStep(s: SimulationState, step: number): SimulationState {
  for (let i = 0; i < 2000 && s.incidents.active && (s.incidents.active.step !== step || (s.incidents.active.revealLeft ?? 0) > 0); i++) s = reducer(s, TICK);
  return s;
}

describe('ORDER 289 — en egen raket spelas till slut', () => {
  // ORDER 305b — säkerheten är borttagen; spelaren går vidare i kvitt eller dubbelt.
  it('gå vidare efter varje steg: tre steg, raketen stängs', () => {
    let s = toBacked(evening(5));
    const id = s.incidents.active!.id;
    for (let step = 0; step < 3; step++) {
      s = toNextStep(s, step);
      expect(s.incidents.active?.id).toBe(id);
      s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
      if (s.incidents.active?.choosing) s = reducer(s, { type: 'INCIDENT_GO' });
    }
    expect(s.incidents.active).toBeNull();
    const rec = s.incidents.log[s.incidents.log.length - 1];
    expect(rec.id).toBe(id);
    expect(rec.step).toBeNull();
  });

  it('utan val: när valets tid går ut stannar spelaren och tar potten', () => {
    let s = toBacked(evening(5));
    const id = s.incidents.active!.id;
    s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
    let ticks = 0;
    while (s.incidents.active?.id === id && ticks < 1000) { s = reducer(s, TICK); ticks++; }
    expect(ticks).toBeLessThan(1000);
    const rec = s.incidents.log[s.incidents.log.length - 1];
    expect(rec).toMatchObject({ id, quality: 'stopped', step: 1 });
    expect(rec.pot?.taken).toBe(true);
  });
});

describe('ORDER 289 — raketräkningen', () => {
  // ORDER 296c — raketerna utlöses av rummet; räkningen är "raket n i kväll"
  // och växer bara med kvällens egna raketer (inte med egna eller följder).
  it('räkningen växer bara med kvällens raketer, inte med egna raketer', () => {
    let s = evening(5);
    const totals = new Set<number>();
    let prevN = 0;
    let backs = 0;
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
      if (s.incidents.active) {
        const { n } = rocketCounter(s);
        if (s.incidents.active.backed || s.incidents.active.chained) totals.add(n - prevN);
        prevN = Math.max(prevN, n - (s.incidents.active.backed || s.incidents.active.chained ? 0 : 1));
        if (s.incidents.active.backed) {
          s = s.incidents.active.choosing ? reducer(s, { type: 'INCIDENT_GO' }) : reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
        } else s = s.incidents.active.choosing ? reducer(s, { type: 'INCIDENT_GO' }) : reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
      } else if (backs < 2 && canStartBack(s)) { s = reducer(s, { type: 'START_BACK' }); backs++; }
      s = reducer(s, TICK);
    }
    expect(backs).toBeGreaterThan(0);
    // En egen raket räknas inte: räkningen står där den stod.
    for (const d of totals) expect(d).toBeLessThanOrEqual(0);
  });
});

describe('ORDER 289 — bankens replik efter vad spelaren har gjort', () => {
  it('räknar påbörjade prov, inte övningar', () => {
    const s0 = makeNewGameState(3);
    expect(s0.examsTaken ?? 0).toBe(0);
    const practice = reducer(s0, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'practice' });
    expect(practice.examsTaken ?? 0).toBe(0);
    const exam = reducer(s0, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'exam' });
    expect(exam.pavilionVisit?.mode).toBe('exam');
    expect(exam.examsTaken).toBe(1);
  });
});

describe('ORDER 289 — singular och plural', () => {
  it('"1 bottle", inte "1 bottles", på båda språken', async () => {
    const { stringsFor } = await import('../../content/strings');
    const en = stringsFor('en');
    const sv = stringsFor('sv');
    expect(en.morningBuy.summary(9, 1)).toContain('1 bottle.');
    expect(en.morningBuy.summary(1, 2)).toContain('1 portion ');
    expect(sv.morningBuy.summary(9, 1)).toContain('1 flaska');
    expect(sv.morningBuy.summary(1, 2)).toMatch(/1 portion\b/);
    // ORDER 291 — "79 portioner till 15 väntade gäster".
    expect(en.morningBuy.mainsCover(1, 1)).toBe('1 portion for 1 expected guest');
    expect(sv.morningBuy.mainsCover(79, 15)).toBe('79 portioner till 15 väntade gäster');
    expect(en.result.stepsOf(1, 1)).toBe('1 of 1 step');
  });
});

describe('ORDER 289 — rådet när maten tog slut', () => {
  it('gäster som gick utan mat ger rådet att köpa mer, inte samma', async () => {
    const { wasteAtDayEnd } = await import('../../strategic/simulation/stockPackages');
    let s = reducer(makeNewGameState(3), { type: 'BUY_ITEMS', items: { 'root-soup': 5, 'house-wine-glass': 5 } });
    s = reducer(s, { type: 'START_SERVICE' });
    expect(s.day.soldOutGuests).toBe(0);
    const d: SimulationState = { ...s, day: { ...s.day, soldOutGuests: 7, foodOutClock: '20.41' } };
    const w = wasteAtDayEnd(d).waste!;
    expect(w.shortage).toEqual({ clock: '20.41', guests: 7, more: 10 });
    expect(w.advice).toBeNull();
  });
});
