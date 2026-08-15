// ORDER 090 §3 — TeamMember ↔ StaffMember id bridge.
//
// Motivation: the room renders TeamMember pucks (economic layer),
// but pip carriers are computed from StaffMember (task layer,
// carries `targetGuestId`). ORDER 088 §4 first shipped this as
// role-matching (any servitör with a hailing target lit ALL
// servitör-role team pucks), which is ambiguous the moment a
// second servitör hires in: pip could land on the wrong puck.
//
// This module resolves the mapping deterministically. Same team +
// staff arrays return the same bridge — no randomness, no time.
//
// Mapping rule: bipartite match by role in list order.
//   - Group both arrays by role.
//   - For each role, pair team[k]-of-role with staff[k]-of-role.
//   - A TeamMember with no staff of its role (or with k beyond the
//     staff count for that role) maps to `null`.
//
// This is stable across ticks because both arrays' internal order is
// stable within a service (hires append, fires remove-by-id preserving
// order). Cross-service policy staffCount changes rebuild sim.staff
// via makeStaff() — the bridge is recomputed each tick anyway (pure
// function of the current arrays), so any rebuild is picked up.

import type { StaffMember, StaffRole, TeamMember } from '../types';

/**
 * Return a map from TeamMember.id → StaffMember.id | null.
 *
 * Pure. Same (team, staff) tuple returns the same map. Called from
 * InteriorStaff each tick to look up which puck should raise the pip
 * when derivePipCarriers reports a StaffMember carrier.
 */
export function bridgeTeamToStaff(
  team: readonly TeamMember[],
  staff: readonly StaffMember[]
): Map<string, string | null> {
  const result = new Map<string, string | null>();
  // Bucket staff members by role, preserving order.
  const staffByRole = new Map<StaffRole, StaffMember[]>();
  for (const s of staff) {
    const arr = staffByRole.get(s.role) ?? [];
    arr.push(s);
    staffByRole.set(s.role, arr);
  }
  // Walk team in order; for each role assign the next available
  // staff member of that role. When exhausted, map to null.
  const consumedByRole = new Map<StaffRole, number>();
  for (const m of team) {
    const consumed = consumedByRole.get(m.role) ?? 0;
    const roleArr = staffByRole.get(m.role) ?? [];
    const staffMember = roleArr[consumed];
    result.set(m.id, staffMember ? staffMember.id : null);
    consumedByRole.set(m.role, consumed + 1);
  }
  return result;
}

/**
 * Convenience: given a Set of pip-carrier StaffMember ids from
 * derivePipCarriers, return the Set of TeamMember ids that should
 * render the pip.
 */
export function teamPipCarriersFromStaffPipCarriers(
  team: readonly TeamMember[],
  staff: readonly StaffMember[],
  pipCarrierStaffIds: ReadonlySet<string>
): Set<string> {
  const bridge = bridgeTeamToStaff(team, staff);
  const teamIds = new Set<string>();
  for (const [teamId, staffId] of bridge) {
    if (staffId !== null && pipCarrierStaffIds.has(staffId)) {
      teamIds.add(teamId);
    }
  }
  return teamIds;
}
