// ORDER 088 §3 — shared pattern-transform module for the room.
//
// Pure functions of `(patternKind, profile, simTime, phaseSeed)` that
// return the visual transform primitives a puck applies in-scene:
// lean angle, vertical bob offset, micro-yaw. Same pattern kinds are
// used by both guest and staff pucks, distinguished only by `profile`
// — no duplicated pattern functions (DoD §7.6).
//
// Numbering follows ORDER 087 §4 (guest 13–20) and ORDER 087 §4
// tempo-variant rule (staff 01–03 share code path with guest 13/14/20
// under profile='guest' — i.e. the reverse direction of the ORDER 088
// §3 wording; the pattern kind is the primitive, profile picks the
// amplitude).
//
// Parameters below are the Underlag 003 §2 values, referenced by
// ORDER 088 §3.

import type { GuestPatternLabel } from '../ui/RoomCardPanel/guestPatterns';

// Staff-only labels for movement primitives. Kept separate from
// GuestPatternLabel so grep audits can see the numbering. 01/02/03
// map 1:1 to IDLE/WALK/EXIT — see kindForStaff() below.
export type StaffPatternLabel = 'IDLE' | 'WALK' | 'EXIT';
// All pattern kinds callable by both actors. The staff-only reels
// (04..12: task-specific like GREET, ORDER, SERVE) are not represented
// as visual transforms here — they are already covered by the puck's
// task-bob and station drift in InteriorStaff.tsx. This module is only
// the primitives that both actor types share.
export type SharedPatternKind = 'IDLE' | 'WALK' | 'EXIT';

// `profile` selects the amplitude table. Same primitive function is
// called by both — no duplicate implementation (DoD §7.6).
export type PatternProfile = 'guest' | 'staff';

// Amplitude table per profile. Values from Underlag 003 §2 (guest
// tempo) and the pre-ORDER-088 InteriorStaff constants (staff tempo).
interface PatternParams {
  bobAmpM: number;
  bobFreqHz: number;
  leanRad: number;   // signed radians; negative = backwards
  moveSpeedMPerSec: number;
}

// ORDER 087 §4 — guest tempo (slower, flatter, less lean).
const GUEST_PARAMS: Record<SharedPatternKind, PatternParams> = {
  IDLE: {
    bobAmpM: 0.009,             // ±0.9 cm per Underlag 003 §2
    bobFreqHz: 0.27,
    leanRad: (1 * Math.PI) / 180,
    moveSpeedMPerSec: 0          // idle doesn't move
  },
  WALK: {
    bobAmpM: 0.023,             // 2.3 cm
    bobFreqHz: 1.35,
    leanRad: (2 * Math.PI) / 180,
    moveSpeedMPerSec: 1.0       // per Underlag 003 §2
  },
  EXIT: {
    bobAmpM: 0.023,
    bobFreqHz: 1.7,
    leanRad: (3 * Math.PI) / 180,
    moveSpeedMPerSec: 1.26      // per Underlag 003 §2
  }
};

// Staff tempo — pre-ORDER-088 InteriorStaff constants matched here
// (InteriorStaff continues to render its own bob/drift; this table is
// the reference so the shared function stays honest about its two
// profiles).
const STAFF_PARAMS: Record<SharedPatternKind, PatternParams> = {
  IDLE: {
    bobAmpM: 0.05,              // TASK_BOB_AMPLITUDE_M in InteriorStaff
    bobFreqHz: 2.0,             // TASK_BOB_FREQ_HZ
    leanRad: 0,                 // staff pucks don't lean
    moveSpeedMPerSec: 0
  },
  WALK: {
    bobAmpM: 0.05,
    bobFreqHz: 2.0,
    leanRad: 0,
    moveSpeedMPerSec: 1.4       // STAFF_WALK_SPEED_M_PER_S
  },
  EXIT: {
    bobAmpM: 0.05,
    bobFreqHz: 2.0,
    leanRad: 0,
    moveSpeedMPerSec: 1.4
  }
};

// Extended amplitude table for guest-only patterns. These have no
// staff counterpart (staff don't sit down, read menus, or hail).
// Parameters from Underlag 003 §2.
interface GuestOnlyParams extends PatternParams {
  microYawAmpRad?: number;
  microYawFreqHz?: number;
  bobPhaseOffset?: number;
}

const GUEST_ONLY_PARAMS: Record<
  Exclude<GuestPatternLabel, SharedPatternKind>,
  GuestOnlyParams
> = {
  'SIT DOWN': {
    bobAmpM: 0,                        // no bob during the sit-down beat
    bobFreqHz: 0,
    leanRad: (3 * Math.PI) / 180,     // slight forward
    moveSpeedMPerSec: 0
  },
  'READ MENU': {
    bobAmpM: 0.006,                    // subtle breathing
    bobFreqHz: 0.22,
    leanRad: (6 * Math.PI) / 180,     // Underlag 003 §2 — 6° kil mot bordet
    moveSpeedMPerSec: 0
  },
  HAIL: {
    bobAmpM: 0.006,
    bobFreqHz: 0.22,
    leanRad: (1 * Math.PI) / 180,     // Underlag 003 §2 — 1°, kil mot närmaste servitör
    moveSpeedMPerSec: 0
  },
  IMPATIENT: {
    bobAmpM: 0.006,
    bobFreqHz: 0.22,
    leanRad: (-5 * Math.PI) / 180,    // ORDER 087 §4 — the ONLY backwards lean.
    moveSpeedMPerSec: 0,
    microYawAmpRad: (8 * Math.PI) / 180,    // Underlag 003 §2 — ±8°
    microYawFreqHz: 0.7                      // Underlag 003 §2 — 0.7 Hz
  },
  EAT: {
    bobAmpM: 0.012,                    // ±1.2 cm per Underlag 003 §2
    bobFreqHz: 0.49,
    leanRad: (7 * Math.PI) / 180,     // Underlag 003 §2 — 7° framåt
    moveSpeedMPerSec: 0
  }
};

// The single primitive: given (kind, profile) → the amplitude bundle
// used to compute lean / bob / speed. This is the "no duplicated
// pattern function" boundary — shared kinds route through this table,
// keyed by the same enum for both profiles.
function paramsFor(
  kind: SharedPatternKind,
  profile: PatternProfile
): PatternParams {
  return profile === 'guest' ? GUEST_PARAMS[kind] : STAFF_PARAMS[kind];
}

// Guest-only params — pattern labels that only guests use.
function guestOnlyParamsFor(
  label: Exclude<GuestPatternLabel, SharedPatternKind>
): GuestOnlyParams {
  return GUEST_ONLY_PARAMS[label];
}

// The output shape a renderer applies to a puck each frame.
export interface PatternTransform {
  leanRad: number;
  bobY: number;
  microYawRad: number;
  moveSpeedMPerSec: number;
}

// ORDER 088 §7.4 — pure function of (label, profile, simTime, seed).
// Same inputs return the same transform — verified by DoD test.
// `phaseSeed` is used only to de-sync pucks in the crowd (so they
// don't bob in lockstep); passing the same seed gives the same phase.
export function computePatternTransform(
  label: GuestPatternLabel,
  profile: PatternProfile,
  simTime: number,
  phaseSeed: number
): PatternTransform {
  // Shared kinds route through paramsFor(); guest-only kinds through
  // guestOnlyParamsFor(). Both paths produce the same output shape.
  const shared = label === 'IDLE' || label === 'WALK' || label === 'EXIT';
  if (shared) {
    const p = paramsFor(label as SharedPatternKind, profile);
    const bobY = p.bobAmpM === 0
      ? 0
      : Math.sin(simTime * p.bobFreqHz * 2 * Math.PI + phaseSeed) * p.bobAmpM;
    return {
      leanRad: p.leanRad,
      bobY,
      microYawRad: 0,
      moveSpeedMPerSec: p.moveSpeedMPerSec
    };
  }
  // Guest-only path. Profile parameter is ignored — guest-only labels
  // are never invoked with a staff profile (asserted in the DoD tests).
  const g = guestOnlyParamsFor(label as Exclude<GuestPatternLabel, SharedPatternKind>);
  const bobY = g.bobAmpM === 0
    ? 0
    : Math.sin(simTime * g.bobFreqHz * 2 * Math.PI + phaseSeed) * g.bobAmpM;
  const microYawRad = g.microYawAmpRad === undefined
    ? 0
    : Math.sin(simTime * (g.microYawFreqHz ?? 0) * 2 * Math.PI + phaseSeed * 1.7) *
      g.microYawAmpRad;
  return {
    leanRad: g.leanRad,
    bobY,
    microYawRad,
    moveSpeedMPerSec: g.moveSpeedMPerSec
  };
}

// Exposed for tests: the pattern label list this module covers.
export const SHARED_KINDS: readonly SharedPatternKind[] = ['IDLE', 'WALK', 'EXIT'];
export const GUEST_ONLY_KINDS: readonly Exclude<GuestPatternLabel, SharedPatternKind>[] =
  ['SIT DOWN', 'READ MENU', 'HAIL', 'IMPATIENT', 'EAT'];

// Grep-visible mapping from ORDER 087 numbering to the shared kinds,
// so a reader can trace `staff 01 ↔ guest 13` etc.
//
//   staff 01 IDLE  ↔ guest 13 IDLE
//   staff 02 WALK  ↔ guest 14 WALK
//   staff 03 EXIT  ↔ guest 20 EXIT
export const STAFF_TO_GUEST_KIND: Record<StaffPatternLabel, SharedPatternKind> = {
  IDLE: 'IDLE',
  WALK: 'WALK',
  EXIT: 'EXIT'
};

// Pip constants — ORDER 088 §4. Same numbers for guest and staff pip.
export const PIP_SIZE_M = 0.06;
export const PIP_OFFSET_ABOVE_PUCK_TOP_M = 0.15;
export const PIP_COLOUR = '#ffbe4a';   // amber — reads as "attention" not warning
