// ORDER 289 — rättelser efter provspelet av 285 (Vision Owner 2026-09-29).
// "Raketen fastnar": Think so är förvald i varje steg, och efter att svaret
// är låst finns en andra tidsgräns (BACK.lockSeconds); när den går ut satsas
// Guessing. Här spelas en egen raket genom alla tre stegen till slut, en gång
// med vald säkerhet och en gång utan.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { BACK } from '../balance';
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
  it('med vald säkerhet: tre steg, raketen stängs', () => {
    let s = toBacked(evening(5));
    const id = s.incidents.active!.id;
    for (let step = 0; step < 3; step++) {
      s = toNextStep(s, step);
      expect(s.incidents.active?.id).toBe(id);
      s = reducer(s, { type: 'PICK_BACK_ANSWER', optionId: best(s) });
      s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: s.incidents.active!.picked!, confidence: BACK.defaultConfidence });
    }
    expect(s.incidents.active).toBeNull();
    const rec = s.incidents.log[s.incidents.log.length - 1];
    expect(rec.id).toBe(id);
    expect(rec.step).toBeNull();
  });

  it('utan vald säkerhet: efter den andra tidsgränsen satsas Guessing, och raketen går till slut', () => {
    let s = toBacked(evening(5));
    const id = s.incidents.active!.id;
    for (let step = 0; step < 3; step++) {
      s = toNextStep(s, step);
      expect(s.incidents.active?.id).toBe(id);
      s = reducer(s, { type: 'PICK_BACK_ANSWER', optionId: best(s) });
      expect(s.incidents.active!.lockLeft).toBe(BACK.lockSeconds);
      // Spelaren väljer ingen nivå. Klockan går (lockLeft) tills den är ute.
      let ticks = 0;
      while (s.incidents.active?.id === id && s.incidents.active.step === step && s.incidents.active.picked && ticks < 1000) { s = reducer(s, TICK); ticks++; }
      expect(ticks).toBeLessThan(1000);
    }
    expect(s.incidents.active).toBeNull();
    const rec = s.incidents.log[s.incidents.log.length - 1];
    expect(rec.id).toBe(id);
    expect(rec.step).toBeNull();
    // Guessing: bara vinst (förlusten är 0), aldrig fel på grund av tiden.
    expect(s.incidents.lastBack?.confidence).toBe(0);
  });
});

describe('ORDER 289 — raketräkningen', () => {
  it('antalet raketer står still hela kvällen, också med egna raketer', () => {
    let s = evening(5);
    const totals = new Set<number>();
    let backs = 0;
    for (let i = 0; i < 40000 && s.day.period === 'dinner'; i++) {
      if (s.incidents.active) {
        totals.add(rocketCounter(s).total);
        if (s.incidents.active.backed) {
          const a = s.incidents.active;
          if (!a.picked && (a.revealLeft ?? 0) <= 0) s = reducer(s, { type: 'PICK_BACK_ANSWER', optionId: best(s) });
          else if (a.picked) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: a.picked, confidence: 0 });
        } else s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: best(s) });
      } else if (backs < 2 && canStartBack(s)) { s = reducer(s, { type: 'START_BACK' }); backs++; }
      s = reducer(s, TICK);
    }
    expect(backs).toBeGreaterThan(0);
    expect(totals.size).toBe(1);
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

describe('ORDER 289 — ett låst fel svar när tiden går ut', () => {
  it('räknas som svaret med Guessing, inte som tiden ute', () => {
    let s = toBacked(evening(5));
    const a = s.incidents.active!;
    const step = incidentById('vinbar', a.id)!.steps[a.step];
    const wrong = rankedStepOption(step, 'worst', a.struck, a.situation);
    s = reducer(s, { type: 'PICK_BACK_ANSWER', optionId: wrong });
    for (let i = 0; i < 1000 && s.incidents.active?.picked; i++) s = reducer(s, TICK);
    const rec = s.incidents.log[s.incidents.log.length - 1];
    expect(rec.optionId).toBe(wrong);
    expect(rec.quality).not.toBe('staff');
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
    expect(en.morningBuy.mainsCover(1, 1)).toBe('1 of 1 guest');
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
