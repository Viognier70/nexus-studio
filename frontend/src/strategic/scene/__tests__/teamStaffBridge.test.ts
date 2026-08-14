// ORDER 090 §3 — TeamMember ↔ StaffMember id bridge tests.
//
// DoD: with two servitörs in tjänst, the pip lands on the correct
// puck (not both). This test proves the bridge is deterministic and
// resolves the ambiguity role-matching had.

import { describe, expect, it } from 'vitest';
import {
  bridgeTeamToStaff,
  teamPipCarriersFromStaffPipCarriers
} from '../teamStaffBridge';
import type { StaffMember, StaffRole, TeamMember } from '../../types';

function makeStaff(id: string, role: StaffRole, targetGuestId: string | null = null): StaffMember {
  return {
    id, role, workload: 0, taskType: null, taskProgress: 0, taskDuration: 0,
    targetGuestId, position: { x: 0, z: 0 }, targetPosition: { x: 0, z: 0 },
    moveProgress: 0
  };
}

function makeTeamMember(id: string, role: StaffRole): TeamMember {
  return {
    id, role,
    competence: { scientific: 0.5, cultural: 0.5, practical: 0.5 },
    dailyCost: 100, hiredOnDay: 1, contractEndsDay: 8, isAgency: false
  };
}

// -------- basic bridge shape -------------------------------------------

describe('ORDER 090 §3 — bridgeTeamToStaff', () => {
  it('maps 1:1 when team and staff arrays are parallel', () => {
    const team = [makeTeamMember('t1', 'värd'), makeTeamMember('t2', 'servitör'), makeTeamMember('t3', 'kock')];
    const staff = [makeStaff('s1', 'värd'), makeStaff('s2', 'servitör'), makeStaff('s3', 'kock')];
    const bridge = bridgeTeamToStaff(team, staff);
    expect(bridge.get('t1')).toBe('s1');
    expect(bridge.get('t2')).toBe('s2');
    expect(bridge.get('t3')).toBe('s3');
  });

  it('maps team members with no matching staff role to null', () => {
    const team = [makeTeamMember('t1', 'värd'), makeTeamMember('t2', 'lärling')];
    const staff = [makeStaff('s1', 'värd')];
    const bridge = bridgeTeamToStaff(team, staff);
    expect(bridge.get('t1')).toBe('s1');
    expect(bridge.get('t2')).toBe(null);   // no lärling staff
  });

  it('is deterministic — same inputs return byte-identical map', () => {
    const team = [makeTeamMember('t1', 'servitör'), makeTeamMember('t2', 'servitör')];
    const staff = [makeStaff('s1', 'servitör'), makeStaff('s2', 'servitör')];
    const a = bridgeTeamToStaff(team, staff);
    const b = bridgeTeamToStaff(team, staff);
    expect(Array.from(a.entries())).toEqual(Array.from(b.entries()));
  });
});

// -------- the ambiguity fix — two servitörs in tjänst ------------------

describe('ORDER 090 §3 — two servitörs in tjänst, pip lands on the right puck', () => {
  it('two servitörs, one owns a hail — only that team-servitör gets the pip', () => {
    // Two staff servitörs; s2 owns the hailing guest.
    const staff = [
      makeStaff('s-värd', 'värd'),
      makeStaff('s-serv-1', 'servitör', null),
      makeStaff('s-serv-2', 'servitör', 'guest-hail'),   // this one owns the hail
      makeStaff('s-kock', 'kock')
    ];
    // Two team servitörs in tjänst.
    const team = [
      makeTeamMember('t-värd', 'värd'),
      makeTeamMember('t-serv-1', 'servitör'),
      makeTeamMember('t-serv-2', 'servitör'),
      makeTeamMember('t-kock', 'kock')
    ];
    // The derivePipCarriers-style output: only s-serv-2 is a carrier.
    const staffPipIds = new Set(['s-serv-2']);
    const teamPipIds = teamPipCarriersFromStaffPipCarriers(team, staff, staffPipIds);

    expect(teamPipIds.has('t-serv-2')).toBe(true);      // the right puck
    expect(teamPipIds.has('t-serv-1')).toBe(false);     // NOT the other servitör
    expect(teamPipIds.has('t-värd')).toBe(false);
    expect(teamPipIds.has('t-kock')).toBe(false);
  });

  it('both servitörs own hails — both team-servitör pucks get the pip', () => {
    const staff = [
      makeStaff('s-serv-1', 'servitör', 'guest-hail-A'),
      makeStaff('s-serv-2', 'servitör', 'guest-hail-B')
    ];
    const team = [
      makeTeamMember('t-serv-1', 'servitör'),
      makeTeamMember('t-serv-2', 'servitör')
    ];
    const staffPipIds = new Set(['s-serv-1', 's-serv-2']);
    const teamPipIds = teamPipCarriersFromStaffPipCarriers(team, staff, staffPipIds);
    expect(teamPipIds.has('t-serv-1')).toBe(true);
    expect(teamPipIds.has('t-serv-2')).toBe(true);
  });

  it('team-servitör with no matching staff-servitör gets no pip', () => {
    // Third team-servitör exists but staff array only has two.
    const staff = [
      makeStaff('s-serv-1', 'servitör', 'guest-hail'),
      makeStaff('s-serv-2', 'servitör', null)
    ];
    const team = [
      makeTeamMember('t-serv-1', 'servitör'),
      makeTeamMember('t-serv-2', 'servitör'),
      makeTeamMember('t-serv-3', 'servitör')   // no matching staff slot
    ];
    const staffPipIds = new Set(['s-serv-1']);
    const teamPipIds = teamPipCarriersFromStaffPipCarriers(team, staff, staffPipIds);
    expect(teamPipIds.has('t-serv-1')).toBe(true);
    expect(teamPipIds.has('t-serv-2')).toBe(false);
    expect(teamPipIds.has('t-serv-3')).toBe(false);
  });
});
