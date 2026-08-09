// ORDER 044 §3.3 — a tiny cross-component channel for the room's
// live puck positions.
//
// InteriorStaff writes each staff puck's world XZ every frame; the
// seat-attention system in InteriorGuests reads them to find the
// nearest staff to each seated guest. Kept as a module singleton
// rather than a React context because:
//   * Both consumers live under the same Suspense boundary and mount
//     order is stable.
//   * Data flows one-way per frame with no reactivity requirement —
//     a re-render on every position change would be catastrophic.
//   * Contexts add lifecycle complexity for a shared ref with no
//     component tree relationship.
//
// StaffRole is carried so a future refinement can weight proximity
// by role (a servitör within 2 m ≠ a kock within 2 m for attention
// purposes) without another channel.

import type { StaffRole } from '../types';

export interface SharedStaffPos {
  x: number;
  z: number;
  role: StaffRole;
}

// Keyed by team-member id.
export const staffPositionsRef: { current: Map<string, SharedStaffPos> } = {
  current: new Map()
};
