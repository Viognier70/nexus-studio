// ORDER 086 §6 step 1 — deriveFaces unit tests.

import { describe, expect, it } from 'vitest';
import {
  RECENT_ANSWER_WINDOW_SEC,
  deriveGuestFace,
  deriveStaffFace,
  recentAnswerHit
} from '../deriveFaces';
import { WAIT_HAIL_SEC, WAIT_IMPATIENT_SEC } from '../deriveActions';
import type {
  DayState,
  EnablerRecord,
  Guest,
  StaffMember
} from '../../../types';
import { initialDay } from '../../../simulation/model';

function makeDay(overrides: Partial<DayState> = {}): DayState {
  return { ...initialDay(), period: 'dinner', ...overrides };
}

function makeStaff(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 's1',
    role: 'kock',
    workload: 0.3,
    taskType: null,
    taskProgress: 0,
    taskDuration: 0,
    targetGuestId: null,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    ...overrides
  };
}

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'g1',
    state: 'seated',
    satisfaction: 0.6,
    seatIndex: 0,
    arrivalTime: 0,
    stateTime: 0,
    scenarioSource: false,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    hadWelcomeDrink: false,
    lastCheckbackAt: null,
    walkAwayOnArrival: false,
    ...overrides
  };
}

function makeEnablers(latestWriteAt: number | null = null): Record<string, EnablerRecord> {
  const rec: EnablerRecord = {
    episteme: 0, techne: 0, phronesis: 0,
    history: latestWriteAt === null
      ? []
      : [{ at: latestWriteAt, register: 'episteme', amount: 0.05, scenarioId: 's' }]
  };
  return { cultural: rec, scientific: rec, practical: rec };
}

// -------- recentAnswerHit -----------------------------------------------

describe('recentAnswerHit', () => {
  it('no history → false', () => {
    expect(recentAnswerHit(makeEnablers(null), 100)).toBe(false);
  });
  it('newest write inside window → true', () => {
    expect(recentAnswerHit(makeEnablers(100 - RECENT_ANSWER_WINDOW_SEC + 1), 100)).toBe(true);
  });
  it('newest write outside window → false', () => {
    expect(recentAnswerHit(makeEnablers(100 - RECENT_ANSWER_WINDOW_SEC - 1), 100)).toBe(false);
  });
});

// -------- deriveStaffFace: 10 rules -------------------------------------

describe('deriveStaffFace — every rule row', () => {
  it('SF1 evening period → exhausted', () => {
    expect(deriveStaffFace({
      staff: makeStaff(), day: makeDay({ period: 'evening' }),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('exhausted');
  });
  it('SF1 serviceCollapsed → exhausted', () => {
    expect(deriveStaffFace({
      staff: makeStaff(), day: makeDay({ serviceCollapsed: true }),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('exhausted');
  });
  it('SF2 recentAnswerHit → proud', () => {
    expect(deriveStaffFace({
      staff: makeStaff(), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: true, targetGuestSatisfaction: null
    })).toBe('proud');
  });
  it('SF3 greet → smiling', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ taskType: 'greet' }), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('smiling');
  });
  it('SF3 welcomeDrink → smiling', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ taskType: 'welcomeDrink' }), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('smiling');
  });
  it('SF4 order → attentive', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ taskType: 'order' }), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('attentive');
  });
  it('SF5 red rhythm + workload ≥ 0.7 → strained', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ workload: 0.75 }), day: makeDay({ serviceRhythm: 'red' }),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('strained');
  });
  it('SF6 target guest satisfaction < 0.3 → irritated', () => {
    expect(deriveStaffFace({
      staff: makeStaff(), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: 0.2
    })).toBe('irritated');
  });
  it('SF7 amber rhythm → tense', () => {
    expect(deriveStaffFace({
      staff: makeStaff(), day: makeDay({ serviceRhythm: 'amber' }),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('tense');
  });
  it('SF6 workload ≥ 0.95 → hurried (ORDER 088 §2.1 — threshold moved from 0.85)', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ workload: 0.96 }), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('hurried');
  });
  it('SF9 has taskType, no other flag → focused', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ taskType: 'clear' }), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('focused');
  });
  it('SF10 fallback → neutral', () => {
    expect(deriveStaffFace({
      staff: makeStaff({ taskType: null, workload: 0.1 }), day: makeDay(),
      simTime: 100, recentAnswerHitFlag: false, targetGuestSatisfaction: null
    })).toBe('neutral');
  });
});

// -------- deriveGuestFace: every state ---------------------------------

describe('deriveGuestFace', () => {
  it('GF1 declined → strained', () => {
    expect(deriveGuestFace(makeGuest({ state: 'declined' }), 10)).toBe('strained');
  });
  it('walkAwayOnArrival + leaving → strained', () => {
    expect(deriveGuestFace(makeGuest({ state: 'leaving', walkAwayOnArrival: true }), 10)).toBe('strained');
  });
  it('GF2 leaving + satisfied → smiling (ORDER 087 §3 — proud is staff-exclusive)', () => {
    expect(deriveGuestFace(makeGuest({ state: 'leaving', satisfaction: 0.9 }), 10)).toBe('smiling');
  });
  it('GF3 leaving + dissatisfied → irritated', () => {
    expect(deriveGuestFace(makeGuest({ state: 'leaving', satisfaction: 0.2 }), 10)).toBe('irritated');
  });
  it('GF4 leaving + neutral → neutral', () => {
    expect(deriveGuestFace(makeGuest({ state: 'leaving', satisfaction: 0.5 }), 10)).toBe('neutral');
  });
  it('GF5 paying + satisfied → smiling', () => {
    expect(deriveGuestFace(makeGuest({ state: 'paying', satisfaction: 0.9 }), 10)).toBe('smiling');
  });
  it('GF6 paying + neutral → neutral', () => {
    expect(deriveGuestFace(makeGuest({ state: 'paying', satisfaction: 0.5 }), 10)).toBe('neutral');
  });
  it('GF7 dining + satisfied → smiling (ORDER 087 §3 — proud is staff-exclusive)', () => {
    expect(deriveGuestFace(makeGuest({ state: 'dining', satisfaction: 0.9 }), 10)).toBe('smiling');
  });
  it('GF8 dining + neutral → focused', () => {
    expect(deriveGuestFace(makeGuest({ state: 'dining', satisfaction: 0.5 }), 10)).toBe('focused');
  });
  it('GF9 ordering → attentive', () => {
    expect(deriveGuestFace(makeGuest({ state: 'ordering' }), 10)).toBe('attentive');
  });
  it('GF10 waiting past hail → hurried', () => {
    expect(deriveGuestFace(makeGuest({ state: 'waiting', stateTime: 0 }), WAIT_HAIL_SEC + 5)).toBe('hurried');
  });
  it('GF11 waiting past impatient → tense', () => {
    expect(deriveGuestFace(makeGuest({ state: 'waiting', stateTime: 0 }), WAIT_IMPATIENT_SEC + 5)).toBe('tense');
  });
  it('GF12 waiting fresh → neutral', () => {
    expect(deriveGuestFace(makeGuest({ state: 'waiting', stateTime: 0 }), 5)).toBe('neutral');
  });
  it('GF13 arriving → neutral', () => {
    expect(deriveGuestFace(makeGuest({ state: 'arriving' }), 5)).toBe('neutral');
  });
  it('GF13 seated → neutral', () => {
    expect(deriveGuestFace(makeGuest({ state: 'seated' }), 5)).toBe('neutral');
  });
});

// -------- tick-idempotence ---------------------------------------------

describe('face tick-idempotence', () => {
  it('two consecutive calls return equal face', () => {
    const g = makeGuest({ state: 'dining', satisfaction: 0.8 });
    expect(deriveGuestFace(g, 100)).toBe(deriveGuestFace(g, 100));
  });
});
