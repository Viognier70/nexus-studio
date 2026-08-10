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
    const t = { members: [], paidStructuralCost: 0, strainSinceSimTime: null };
    expect(teamCompetence(t, 'scientific')).toBe(0);
  });
});

describe('teamCapacity', () => {
  it('is members × COVERS_PER_MEMBER', () => {
    const t = initialTeam();
    expect(teamCapacity(t)).toBe(3 * COVERS_PER_MEMBER);
  });
  it('never goes below 1 (empty team)', () => {
    expect(teamCapacity({ members: [], paidStructuralCost: 0, strainSinceSimTime: null })).toBe(1);
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

describe('HIRE_TEAM_MEMBER / FIRE_TEAM_MEMBER (morning-only)', () => {
  it('HIRE adds a member with the requested role, morning phase only', () => {
    let s = makeInitialState(1);
    expect(s.day.period).toBe('morning');
    const before = s.team.members.length;
    s = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'lärling' });
    expect(s.team.members.length).toBe(before + 1);
    const added = s.team.members[s.team.members.length - 1];
    expect(added.role).toBe('lärling');
    expect(added.hiredOnDay).toBe(s.day.dayNumber);
    expect(added.contractEndsDay).toBe(s.day.dayNumber + 7);
    expect(added.isAgency).toBe(false);
  });

  it('HIRE outside morning is a no-op', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    expect(s.day.period).toBe('afternoon');
    const before = s.team.members.length;
    s = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'lärling' });
    expect(s.team.members.length).toBe(before);
  });

  it('HIRE respects TEAM_MAX_MEMBERS cap (6)', () => {
    let s = makeInitialState(1);
    // Start at 3; try to hire 5 more.
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'lärling' });
    }
    expect(s.team.members.length).toBe(6);
  });

  it('FIRE removes the named member and pays a buyout for remaining contract', () => {
    let s = makeInitialState(1);
    const initialMember = s.team.members[0];
    const buyout =
      Math.max(0, initialMember.contractEndsDay - s.day.dayNumber) *
      initialMember.dailyCost;
    const costBefore = s.cost;
    const paidBefore = s.team.paidStructuralCost;
    s = reducer(s, { type: 'FIRE_TEAM_MEMBER', memberId: initialMember.id });
    expect(s.team.members.find((m) => m.id === initialMember.id)).toBeUndefined();
    expect(s.cost).toBe(costBefore + buyout);
    expect(s.team.paidStructuralCost).toBe(paidBefore + buyout);
  });

  it('FIRE outside morning is a no-op', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    const firstId = s.team.members[0].id;
    const before = s.team.members.length;
    s = reducer(s, { type: 'FIRE_TEAM_MEMBER', memberId: firstId });
    expect(s.team.members.length).toBe(before);
  });

  it('FIRE with a bogus memberId is a no-op', () => {
    let s = makeInitialState(1);
    const before = s.team.members.length;
    s = reducer(s, { type: 'FIRE_TEAM_MEMBER', memberId: 'nonexistent' });
    expect(s.team.members.length).toBe(before);
  });

  it('HIRE then FIRE within same morning charges the full buyout (no free churn)', () => {
    let s = makeInitialState(1);
    const costBefore = s.cost;
    s = reducer(s, { type: 'HIRE_TEAM_MEMBER', role: 'kock' });
    const hired = s.team.members[s.team.members.length - 1];
    const expectedBuyout = 7 * hired.dailyCost; // full contract remaining
    s = reducer(s, { type: 'FIRE_TEAM_MEMBER', memberId: hired.id });
    expect(s.cost).toBe(costBefore + expectedBuyout);
  });
});

describe('agency offer machinery', () => {
  // Helper: build up a saturated dinner so activeGuests / capacity
  // sits above threshold long enough for an offer to fire.
  function overloadedDinner(): ReturnType<typeof makeInitialState> {
    let s = reducer(makeInitialState(11), { type: 'SKIP_LUNCH' });
    // Weaken the team by leaving it at defaults (3 members, cap 15).
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 10
    });
    return s;
  }

  it('does not fire an offer outside a service', () => {
    let s = makeInitialState(1);
    // Fabricate saturating guests in state (morning period).
    for (let i = 0; i < 30; i++) {
      s.guests.push({
        id: `g${i}`,
        state: 'seated',
        satisfaction: 0.5,
        seatIndex: 0,
        arrivalTime: 0,
        stateTime: 0,
        scenarioSource: false,
        position: { x: 0, z: 0 },
        targetPosition: { x: 0, z: 0 },
        moveProgress: 1,
        hadWelcomeDrink: false,
        walkAwayOnArrival: false
      });
    }
    for (let i = 0; i < 500; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.agencyOffer).toBeNull();
  });

  it('fires an offer after sustained strain during service', () => {
    let s = overloadedDinner();
    // Force team capacity down by seeding many active guests.
    // Advance through the service and watch for an offer.
    let sawOffer = false;
    for (let i = 0; i < 3000; i++) {
      // Manually inject guests to keep load high across the run.
      if (s.guests.length < 25) {
        for (let k = 0; k < 25 - s.guests.length; k++) {
          s.guests.push({
            id: `pad-${i}-${k}`,
            state: 'dining',
            satisfaction: 0.6,
            seatIndex: 0,
            arrivalTime: 0,
            stateTime: 0,
            scenarioSource: false,
            position: { x: 0, z: 0 },
            targetPosition: { x: 0, z: 0 },
            moveProgress: 1,
            hadWelcomeDrink: false,
            walkAwayOnArrival: false
          });
        }
      }
      s = reducer(s, { type: 'TICK', dt: 0.2 });
      if (s.agencyOffer) {
        sawOffer = true;
        break;
      }
    }
    expect(sawOffer).toBe(true);
  });

  it('ACCEPT_AGENCY adds a member and hits economic capital', () => {
    let s = makeInitialState(1);
    // Fabricate an offer directly.
    s.agencyOffer = {
      role: 'lärling',
      moneyCost: 5000,
      socialCostIfDeclined: 0.03,
      offeredAt: 0,
      expiresAt: 60
    };
    // ORDER 050 §3 (2026-08-10) — agency cost now hits the till in
    // SEK directly, no separate 0..1 economic capital write.
    const cashBefore = s.cash;
    const teamSizeBefore = s.team.members.length;
    s = reducer(s, { type: 'ACCEPT_AGENCY' });
    expect(s.agencyOffer).toBeNull();
    expect(s.team.members.length).toBe(teamSizeBefore + 1);
    expect(s.team.members[s.team.members.length - 1].isAgency).toBe(true);
    expect(s.cash).toBeLessThan(cashBefore);
  });

  it('DECLINE_AGENCY drops social capital by AGENCY_DECLINE_SOCIAL_COST', () => {
    let s = makeInitialState(1);
    s.agencyOffer = {
      role: 'lärling',
      moneyCost: 800,
      socialCostIfDeclined: 0.03,
      offeredAt: 0,
      expiresAt: 60
    };
    const socBefore = s.capitals.values.social;
    s = reducer(s, { type: 'DECLINE_AGENCY' });
    expect(s.agencyOffer).toBeNull();
    expect(s.capitals.values.social).toBeLessThan(socBefore);
    expect(s.team.members.length).toBe(3); // no addition
  });

  it('unanswered offer expires into implicit decline (still costs social)', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 5
    });
    // Fabricate an already-expiring offer.
    s.agencyOffer = {
      role: 'lärling',
      moneyCost: 800,
      socialCostIfDeclined: 0.03,
      offeredAt: s.simTime,
      expiresAt: s.simTime + 1 // will expire on the next tick
    };
    const socBefore = s.capitals.values.social;
    // Advance a handful of ticks past the expiry.
    for (let i = 0; i < 20; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.agencyOffer).toBeNull();
    expect(s.capitals.values.social).toBeLessThan(socBefore);
  });

  it('service close removes agency members and clears any pending offer', () => {
    let s = reducer(makeInitialState(1), { type: 'SKIP_LUNCH' });
    s = reducer(s, {
      type: 'OPEN_SERVICE',
      service: 'dinner',
      lengthMinutes: 3
    });
    // Add an agency member and an offer, then close the service.
    s.team = addAgencyMember(s.team, s.day.dayNumber);
    s.agencyOffer = {
      role: 'lärling',
      moneyCost: 800,
      socialCostIfDeclined: 0.03,
      offeredAt: 0,
      expiresAt: 9999
    };
    expect(s.team.members.filter((m) => m.isAgency).length).toBe(1);
    // Dinner (3 min = 180 s = 900 ticks) → evening. Stop just after
    // the close transition; a bit past the evening pause would roll
    // to the next morning, which is fine but not what we're asserting.
    for (let i = 0; i < 920; i++) s = reducer(s, { type: 'TICK', dt: 0.2 });
    expect(s.day.period).toBe('evening');
    expect(s.team.members.filter((m) => m.isAgency).length).toBe(0);
    expect(s.agencyOffer).toBeNull();
  });
});
