// ORDER 046 §1 — service collapse invariants.
//
// Pinned:
//   * weakestAxis picks the axis with the lowest MAX team competence
//     (single-station model, not average). Ties broken in a stable
//     order (scientific → cultural → practical).
//   * collapseProbabilityPerTick is monotonic in strain at fixed
//     competence, and monotonic in (1 − weakest) at fixed strain.
//   * fireCollapse mutates state exactly as spec'd — flag set, axis
//     recorded, reputation dropped, ConsequenceEvent appended,
//     eventStream gains one 'collapse' entry, period forced to
//     evening, agency cleared.
//   * tickCollapseRoll never fires during opening / prep / non-service
//     periods, and never fires twice in the same service.
//   * Calibration — a 1000-service simulation for three team archetypes
//     yields collapse rates within ±3 % of the analytical prediction.
//
// The calibration test uses `fireCollapse` composed with the analytical
// probability, not a full sim tick loop — the full loop is more brittle
// against unrelated changes elsewhere in the reducer.

import { describe, expect, it } from 'vitest';
import { COLLAPSE_TEXTS } from '../../../content/collapse.sv';
import {
  COLLAPSE_FLOOR,
  COLLAPSE_REPUTATION_DROP,
  COLLAPSE_STRAIN_GAIN,
  collapseProbabilityPerTick,
  fireCollapse,
  teamMaxCompetence,
  tickCollapseRoll,
  weakestAxis
} from '../collapse';
import { strainMultiplier } from '../eventStream';
import { makeInitialState } from '../model';
import { makeTeamMember, initialTeam } from '../team';
import type { SimulationState, TeamMember, TeamState } from '../../types';

// -------- helpers --------------------------------------------------------

function withTeam(state: SimulationState, team: TeamState): SimulationState {
  return { ...state, team };
}

function inRunningService(state: SimulationState): SimulationState {
  // Put state in a post-prep dinner service with a moderate load.
  return {
    ...state,
    day: {
      ...state.day,
      period: 'dinner',
      periodStartAt: 0,
      currentServiceLengthMinutes: 15,
      openingEndsAt: null,
      prepEndsAt: null,
      doorsOpenedThisService: true,
      serviceCollapsed: false,
      collapseAxis: null
    }
  };
}

// -------- weakestAxis ----------------------------------------------------

describe('teamMaxCompetence — MAX across members (single-station model)', () => {
  it('empty team → 0', () => {
    const empty: TeamState = { members: [], paidStructuralCost: 0, strainSinceSimTime: null };
    expect(teamMaxCompetence(empty, 'scientific')).toBe(0);
  });
  it('picks the highest, not the average', () => {
    const t = initialTeam();
    // Kock scientific = 0.75; servitör 0.30; värd 0.20. Max is 0.75.
    expect(teamMaxCompetence(t, 'scientific')).toBeCloseTo(0.75, 5);
  });
});

describe('weakestAxis — MIN over axis-max', () => {
  it('default team has weakest axis = scientific or practical, value ~0.60', () => {
    // Defaults: max scientific 0.75 (kock), max cultural 0.75 (värd),
    // max practical 0.60 (servitör / kock tie). Weakest = practical 0.60.
    const t = initialTeam();
    const w = weakestAxis(t);
    expect(w.axis).toBe('practical');
    expect(w.value).toBeCloseTo(0.60, 5);
  });
  it('a lärling-only team is very weak across all axes', () => {
    const t: TeamState = {
      members: [makeTeamMember('lärling', 1), makeTeamMember('lärling', 1)],
      paidStructuralCost: 0,
      strainSinceSimTime: null
    };
    const w = weakestAxis(t);
    // Lärling defaults: scientific 0.20, cultural 0.30, practical 0.30.
    // Max across two lärlingar in each = same defaults. Weakest = scientific 0.20.
    expect(w.axis).toBe('scientific');
    expect(w.value).toBeCloseTo(0.20, 5);
  });
  it('empty team → weakest 0 on the first axis (stable tie-break)', () => {
    const empty: TeamState = { members: [], paidStructuralCost: 0, strainSinceSimTime: null };
    const w = weakestAxis(empty);
    expect(w.value).toBe(0);
    expect(w.axis).toBe('scientific');
  });
});

// -------- probability shape ----------------------------------------------

describe('collapseProbabilityPerTick — formula shape', () => {
  const base = makeInitialState(42);

  it('at rest (load 0) equals floor + (1 − weakest) × 0.30 × gain', () => {
    const state = inRunningService(base);
    const p = collapseProbabilityPerTick(state);
    const w = weakestAxis(state.team).value;
    const expected = COLLAPSE_FLOOR + (1 - w) * strainMultiplier(0) * COLLAPSE_STRAIN_GAIN;
    expect(p).toBeCloseTo(expected, 8);
  });

  it('monotonic in strain at fixed team', () => {
    // Fake up load by pushing many active guests. We compare two
    // states differing only in guest count.
    const t = initialTeam();
    const restState = withTeam(inRunningService(base), t);
    const strainedState: SimulationState = {
      ...restState,
      guests: Array.from({ length: 40 }, (_, i) => ({
        id: `g${i}`, state: 'seated' as const, satisfaction: 0.5,
        seatIndex: 0, arrivalTime: 0, stateTime: 0, scenarioSource: false,
        position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
        moveProgress: 1, hadWelcomeDrink: false, walkAwayOnArrival: false
      }))
    };
    expect(collapseProbabilityPerTick(strainedState)).toBeGreaterThan(
      collapseProbabilityPerTick(restState)
    );
  });

  it('monotonic in (1 − weakest) at fixed strain', () => {
    const strong = withTeam(inRunningService(base), initialTeam());
    const weak = withTeam(inRunningService(base), {
      members: [makeTeamMember('lärling', 1)],
      paidStructuralCost: 0,
      strainSinceSimTime: null
    });
    expect(collapseProbabilityPerTick(weak)).toBeGreaterThan(
      collapseProbabilityPerTick(strong)
    );
  });
});

// -------- fireCollapse — state effect -----------------------------------

describe('fireCollapse — state mutation matches spec', () => {
  it('sets serviceCollapsed + collapseAxis + forces evening', () => {
    const s = inRunningService(makeInitialState(1));
    const draft = { ...s };
    fireCollapse(draft);
    expect(draft.day.serviceCollapsed).toBe(true);
    expect(draft.day.collapseAxis).not.toBeNull();
    expect(draft.day.period).toBe('evening');
    expect(draft.day.currentServiceLengthMinutes).toBeNull();
  });

  it('appends a "collapse" entry to eventStream', () => {
    const s = inRunningService(makeInitialState(1));
    const draft = { ...s };
    fireCollapse(draft);
    const last = draft.eventStream[draft.eventStream.length - 1];
    expect(last.kind).toBe('collapse');
    expect(last.text.length).toBeGreaterThan(0);
    expect(last.causeTag).toBe('ignorance');
  });

  it('drops reputation by COLLAPSE_REPUTATION_DROP (clamped to 0)', () => {
    const s = { ...inRunningService(makeInitialState(1)), reputation: 0.5 };
    const draft = { ...s };
    fireCollapse(draft);
    expect(draft.reputation).toBeCloseTo(0.5 - COLLAPSE_REPUTATION_DROP, 5);
  });

  it('clamps reputation at 0', () => {
    const s = { ...inRunningService(makeInitialState(1)), reputation: 0.05 };
    const draft = { ...s };
    fireCollapse(draft);
    expect(draft.reputation).toBe(0);
  });

  it('appends a ConsequenceEvent (staff_resigns, social)', () => {
    const s = inRunningService(makeInitialState(1));
    const draft = { ...s };
    const beforeLen = draft.consequenceEvents.length;
    fireCollapse(draft);
    expect(draft.consequenceEvents).toHaveLength(beforeLen + 1);
    const ev = draft.consequenceEvents[beforeLen];
    expect(ev.kind).toBe('staff_resigns');
    expect(ev.capital).toBe('social');
    expect(ev.active).toBe(true);
  });

  it('clears agency members + agency offer', () => {
    const base = inRunningService(makeInitialState(1));
    const withAgency: SimulationState = {
      ...base,
      team: {
        ...base.team,
        members: [
          ...base.team.members,
          { ...makeTeamMember('lärling', 1), isAgency: true } as TeamMember
        ]
      },
      agencyOffer: {
        role: 'lärling',
        moneyCost: 800,
        socialCostIfDeclined: 0.03,
        offeredAt: 0,
        expiresAt: 60
      }
    };
    fireCollapse(withAgency);
    expect(withAgency.team.members.some((m) => m.isAgency)).toBe(false);
    expect(withAgency.agencyOffer).toBeNull();
  });
});

// -------- tickCollapseRoll — gating -------------------------------------

describe('tickCollapseRoll — gating', () => {
  it('never fires during opening', () => {
    const s = inRunningService(makeInitialState(1));
    s.day = { ...s.day, openingEndsAt: s.simTime + 5 };
    for (let i = 0; i < 500; i++) { s.tick += 1; tickCollapseRoll(s); }
    expect(s.day.serviceCollapsed).toBe(false);
  });

  it('never fires during prep', () => {
    const s = inRunningService(makeInitialState(1));
    s.day = { ...s.day, prepEndsAt: s.simTime + 60 };
    for (let i = 0; i < 500; i++) { s.tick += 1; tickCollapseRoll(s); }
    expect(s.day.serviceCollapsed).toBe(false);
  });

  it('never fires during non-service periods', () => {
    const s = makeInitialState(1); // morning
    for (let i = 0; i < 500; i++) { s.tick += 1; tickCollapseRoll(s); }
    expect(s.day.serviceCollapsed).toBe(false);
  });

  it('does not fire twice in the same service', () => {
    // Once fired, the flag blocks re-fire even before period rolls.
    const s = inRunningService(makeInitialState(1));
    fireCollapse(s);
    // Force the state back to a running-service shape but keep flag.
    s.day = { ...s.day, period: 'dinner', currentServiceLengthMinutes: 15 };
    const revBefore = s.reputation;
    for (let i = 0; i < 500; i++) { s.tick += 1; tickCollapseRoll(s); }
    expect(s.reputation).toBe(revBefore);
  });
});

// -------- calibration ---------------------------------------------------

// A 15-min service is 4500 ticks (5 Hz × 15 × 60). At a constant
// per-tick probability p, the chance of at least one fire is
// 1 − (1 − p)^N. We compare that analytical value to a Monte Carlo
// over N_SERVICES services, each running for 4500 ticks, for three
// team compositions at three strain levels.
describe('calibration — Monte Carlo agrees with analytical', () => {
  const TICKS_PER_SERVICE = 4500;
  const N_SERVICES = 1000;

  interface Archetype {
    name: string;
    team: () => TeamState;
    // Fake load = many guests as needed; we set it via activeGuestCount
    // by pushing seated guests. Load = guests / (members × 5).
    load: number;
  }

  const archetypes: Archetype[] = [
    { name: 'default-calm',   team: initialTeam,                                                          load: 0.5 },
    { name: 'default-strain', team: initialTeam,                                                          load: 1.5 },
    { name: 'lärling-strain', team: () => ({ members: [makeTeamMember('lärling', 1), makeTeamMember('lärling', 1)], paidStructuralCost: 0, strainSinceSimTime: null }), load: 1.8 }
  ];

  for (const arche of archetypes) {
    it(`${arche.name} — Monte Carlo within ±3 % of analytical`, () => {
      const team = arche.team();
      // Construct a state at the target load. Load = guests / (members × 5).
      const base = inRunningService(makeInitialState(7));
      const guestCount = Math.round(arche.load * team.members.length * 5);
      const stateTemplate: SimulationState = {
        ...base,
        team,
        guests: Array.from({ length: guestCount }, (_, i) => ({
          id: `g${i}`, state: 'seated' as const, satisfaction: 0.5,
          seatIndex: 0, arrivalTime: 0, stateTime: 0, scenarioSource: false,
          position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
          moveProgress: 1, hadWelcomeDrink: false, walkAwayOnArrival: false
        }))
      };
      const p = collapseProbabilityPerTick(stateTemplate);
      const analytical = 1 - Math.pow(1 - p, TICKS_PER_SERVICE);

      // tickCollapseRoll uses a per-tick seed derived from (state.seed
       // × state.tick), so we vary state.seed per service run to sample
       // the distribution. Within a service we advance state.tick each
       // iteration so each tick's roll uses a fresh derived seed.
      let collapses = 0;
      for (let sIdx = 0; sIdx < N_SERVICES; sIdx++) {
        const st: SimulationState = {
          ...stateTemplate,
          seed: (12345 + sIdx * 2654435761) >>> 0,
          tick: 0,
          day: { ...stateTemplate.day, serviceCollapsed: false, collapseAxis: null }
        };
        for (let t = 0; t < TICKS_PER_SERVICE; t++) {
          st.tick = t + 1;
          tickCollapseRoll(st);
          if (st.day.serviceCollapsed) { collapses += 1; break; }
        }
      }
      const measured = collapses / N_SERVICES;
      // ±0.03 absolute tolerance is broad but sufficient for a 1000-run
      // MC — a tighter bound would flake on unrelated small changes.
      expect(Math.abs(measured - analytical)).toBeLessThan(0.03);
    });
  }
});

// -------- content sanity -----------------------------------------------

describe('COLLAPSE_TEXTS — content shape', () => {
  it('has four lines per axis, non-empty, ends on terminator', () => {
    for (const axis of ['scientific', 'cultural', 'practical'] as const) {
      const bank = COLLAPSE_TEXTS[axis];
      expect(bank).toHaveLength(4);
      for (const line of bank) {
        expect(line.length).toBeGreaterThan(20);
        expect(/[.!?]$/.test(line)).toBe(true);
      }
    }
  });
});
