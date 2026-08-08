// ORDER 043 v3 §10 step 5 team invariants.
//
// Pinned:
//   * Initial team is three members (värd + servitör + kock), day 1.
//   * teamCompetence averages the axis across members.
//   * teamCapacity = members × COVERS_PER_MEMBER (min 1).
//   * chargeStructuralCost sums non-agency dailyCost into
//     paidStructuralCost. Agency members contribute nothing.
//   * addAgencyMember / removeAgencyMembers are inverses.
//   * Day advance (evening → next morning via ticks) charges cost
//     once per day.

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import { reducer } from '../reducer';
import {
  AGENCY_HIRE_COST,
  COVERS_PER_MEMBER,
  ROLE_DEFAULTS,
  addAgencyMember,
  chargeStructuralCost,
  initialTeam,
  makeTeamMember,
  removeAgencyMembers,
  teamCapacity,
  teamCompetence
} from '../team';

describe('initial team', () => {
  const t = initialTeam();
  it('has three members (värd + servitör + kock)', () => {
    expect(t.members).toHaveLength(3);
    const roles = t.members.map((m) => m.role).sort();
    expect(roles).toEqual(['kock', 'servitör', 'värd'].sort());
  });
  it('all initial members hired on day 1 with 7-day contracts', () => {
    for (const m of t.members) {
      expect(m.hiredOnDay).toBe(1);
      expect(m.contractEndsDay).toBe(8);
      expect(m.isAgency).toBe(false);
    }
  });
  it('paidStructuralCost starts at 0', () => {
    expect(t.paidStructuralCost).toBe(0);
  });
});

describe('teamCompetence — averages the axis', () => {
  it('for scientific: kock high, others low → average around 0.4', () => {
    const t = initialTeam();
    const c = teamCompetence(t, 'scientific');
    expect(c).toBeGreaterThan(0.35);
    expect(c).toBeLessThan(0.5);
  });
  it('for cultural: värd high, servitör mid, kock low → mid average', () => {
    const t = initialTeam();
    const c = teamCompetence(t, 'cultural');
    expect(c).toBeGreaterThan(0.4);
    expect(c).toBeLessThan(0.55);
  });
  it('for practical: all mid → around 0.55', () => {
    const t = initialTeam();
    const c = teamCompetence(t, 'practical');
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThan(0.65);
  });
  it('returns 0 for an empty team', () => {
    const t = { members: [], paidStructuralCost: 0 };
    expect(teamCompetence(t, 'scientific')).toBe(0);
  });
});

describe('teamCapacity', () => {
  it('is members × COVERS_PER_MEMBER', () => {
    const t = initialTeam();
    expect(teamCapacity(t)).toBe(3 * COVERS_PER_MEMBER);
  });
  it('never goes below 1 (empty team)', () => {
    expect(teamCapacity({ members: [], paidStructuralCost: 0 })).toBe(1);
  });
});

describe('chargeStructuralCost', () => {
  it('adds sum of dailyCost across non-agency members', () => {
    const t = initialTeam();
    const expected =
      ROLE_DEFAULTS.värd.dailyCost +
      ROLE_DEFAULTS.servitör.dailyCost +
      ROLE_DEFAULTS.kock.dailyCost;
    const after = chargeStructuralCost(t);
    expect(after.paidStructuralCost).toBe(expected);
  });
  it('agency members contribute nothing to the daily charge', () => {
    let t = initialTeam();
    t = addAgencyMember(t, 1);
    const nonAgencyDaily =
      ROLE_DEFAULTS.värd.dailyCost +
      ROLE_DEFAULTS.servitör.dailyCost +
      ROLE_DEFAULTS.kock.dailyCost;
    const after = chargeStructuralCost(t);
    expect(after.paidStructuralCost).toBe(nonAgencyDaily);
  });
});

describe('addAgencyMember / removeAgencyMembers are inverses', () => {
  it('add then remove returns to the same member count', () => {
    const t0 = initialTeam();
    let t = addAgencyMember(t0, 1);
    expect(t.members).toHaveLength(t0.members.length + 1);
    t = removeAgencyMembers(t);
    expect(t.members).toHaveLength(t0.members.length);
    // Non-agency members are untouched.
    for (let i = 0; i < t0.members.length; i++) {
      expect(t.members[i].id).toBe(t0.members[i].id);
    }
  });
});

describe('makeTeamMember — lärling defaults', () => {
  const m = makeTeamMember('lärling', 3);
  it('has lärling role, low competence, cheap dailyCost', () => {
    expect(m.role).toBe('lärling');
    expect(m.competence).toEqual(ROLE_DEFAULTS.lärling.competence);
    expect(m.dailyCost).toBe(ROLE_DEFAULTS.lärling.dailyCost);
    expect(m.hiredOnDay).toBe(3);
    expect(m.contractEndsDay).toBe(10);
    expect(m.isAgency).toBe(false);
  });
});

describe('day-advance integration — charge fires once per day', () => {
  it('accumulates dailyCost when evening auto-advances to next morning', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 3
    });
    // Dinner (3 min = 180 s = 900 ticks) → evening → +75 ticks for
    // the close pause → morning.
    const beforePaid = s.team.paidStructuralCost;
    for (let i = 0; i < 1100; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('morning');
    expect(s.team.paidStructuralCost).toBeGreaterThan(beforePaid);
  });
});

// Sanity: unused import guard so a future test can grow this file.
void AGENCY_HIRE_COST;
