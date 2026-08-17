// ORDER 087 §4 — gästmönster. Eight guest patterns as pure functions
// of `(task, patience, simTime)`. Same shape ORDER 087 §4 says
// UNDERLAG 001 §07 specifies for staff — a switch dressed as a table,
// no side effects, no Math.random, no Date.now (DoD §6.7).
//
// Numbering follows ORDER 087 §4:
//   13 IDLE          — guest at rest inside the room (post-seat, pre-order)
//   14 WALK          — guest walking to their target position
//   15 SIT DOWN      — the sit transition
//   16 READ MENU     — the ordering-with-patience window
//   17 HAIL          — trying to catch someone's eye
//   18 IMPATIENT     — visible tension, lutning −5° bakåt (unique in the
//                       library — everything else leans forward)
//   19 EAT           — dining
//   20 EXIT          — leaving or declined
//
// 13/14/20 are the `guest` tempo profile of staff patterns 01/02/03
// (slower, plattare, mindre lutning). Not new mönsterfunktioner, but
// a `profile` field distinguishes them at read time.

import type { Guest, GuestState, StaffMember } from '../../types';
import { WAIT_HAIL_SEC, WAIT_IMPATIENT_SEC } from './deriveActions';

// Pattern labels — the eight guest reels. Grep-visible so ORDER 087
// §6.6 grep-revision catches any silent drop from the derivation file.
//
// reel IDLE
// reel WALK
// reel SIT DOWN
// reel READ MENU
// reel HAIL
// reel IMPATIENT
// reel EAT
// reel EXIT
export type GuestPatternLabel =
  | 'IDLE'         // 13
  | 'WALK'         // 14
  | 'SIT DOWN'     // 15
  | 'READ MENU'    // 16
  | 'HAIL'         // 17
  | 'IMPATIENT'    // 18
  | 'EAT'          // 19
  | 'EXIT';        // 20

export const ALL_GUEST_PATTERN_LABELS: readonly GuestPatternLabel[] = [
  'IDLE', 'WALK', 'SIT DOWN', 'READ MENU', 'HAIL', 'IMPATIENT', 'EAT', 'EXIT'
];

// Numeric pattern index per label (13..20). Kept as a table so the
// numbering is asserted alongside the label vocabulary and so tests
// can iterate over (number, label) pairs.
export const GUEST_PATTERN_NUMBER: Record<GuestPatternLabel, number> = {
  'IDLE': 13,
  'WALK': 14,
  'SIT DOWN': 15,
  'READ MENU': 16,
  'HAIL': 17,
  'IMPATIENT': 18,
  'EAT': 19,
  'EXIT': 20
};

// The three tempo variants — 13/14/20 — share their pattern function
// with staff patterns 01/02/03 conceptually. `profile` distinguishes
// them at read time so a renderer can pick the guest cadence
// (slower, flatter, less lean) without duplicating the pattern
// function. `guest` is the ORDER 087 §4 profile; `staff` is the
// existing personalen tempo.
export type PatternProfile = 'guest' | 'staff';

// Guest patterns are pure functions of these three things:
//   task     — a guest's current GuestState (analogous to staff task).
//   patience — inverse of satisfaction, in [0, 1]. 0 = calm, 1 = spent.
//              Derived from Guest.satisfaction and wait time; see
//              deriveGuestPatience() below.
//   simTime  — sim-seconds; used for elapsed-time computations only.
//              Pattern functions never call Math.random or Date.now
//              (DoD §6.7).
export interface GuestPatternInput {
  task: GuestState;
  patience: number;
  simTime: number;
  // Elapsed time in the current GuestState. Pure derived value —
  // simTime − guest.stateTime. Passed in so callers that already
  // have it don't re-subtract, and so the pattern functions stay
  // trivially deterministic on their inputs.
  inState: number;
  // ORDER 087 §4 — the walk-away-at-door polarity of `leaving`. When
  // true, EXIT pattern reads as `walk-away`; otherwise EXIT reads
  // as `leaving`. Kept on the input rather than baked into the
  // pattern selector so a test can pin either polarity.
  walkAwayOnArrival: boolean;
  // ORDER 087 §4 — seated guest may either be pre-order (IDLE + welcome
  // drink beat) or ORDER 044 §3.3 has already flowed them onto the seat.
  // Passed so a `seated` guest that has had their welcome drink still
  // reads as IDLE (not stuck at SIT DOWN).
  hadWelcomeDrink: boolean;
}

// ORDER 087 §4 — pattern selection is a first-match table over the
// input tuple. Every guest state maps to exactly one pattern; no
// tuple reaches two branches. The uniqueness is verified in
// __tests__/guestPatterns.test.ts.
//
// The `waiting` state splits on inState:
//   inState ≥ WAIT_HAIL_SEC       → HAIL (pattern 17)
//   inState ≥ WAIT_IMPATIENT_SEC  → IMPATIENT (pattern 18)
//   otherwise                     → IDLE (pattern 13, at the door)
export function selectGuestPattern(input: GuestPatternInput): GuestPatternLabel {
  switch (input.task) {
    case 'arriving':
      // Walking in — reel WALK. Guest tempo profile.
      return 'WALK';
    case 'waiting':
      if (input.inState >= WAIT_HAIL_SEC) return 'HAIL';
      if (input.inState >= WAIT_IMPATIENT_SEC) return 'IMPATIENT';
      return 'IDLE';
    case 'seated':
      // Sit-down transition covers the seat-lowering beat; once welcome
      // drink is in hand the guest reads as IDLE.
      if (input.hadWelcomeDrink) return 'IDLE';
      return 'SIT DOWN';
    case 'ordering':
      // The patient window: reading the menu. Escalates identically to
      // `waiting`: past hail-threshold → HAIL (trying to catch
      // someone's eye), past impatient-threshold → IMPATIENT (ready to
      // order), otherwise → READ MENU. Same thresholds as `waiting`,
      // kept centralised in deriveActions.
      if (input.inState >= WAIT_HAIL_SEC) return 'HAIL';
      if (input.inState >= WAIT_IMPATIENT_SEC) return 'IMPATIENT';
      return 'READ MENU';
    case 'dining':
      return 'EAT';
    case 'paying':
      // Paying is a fast beat between dining and leaving — reads as
      // IDLE at the table. A separate PAY pattern would be one more
      // reel without a distinct silhouette from IDLE at this camera.
      return 'IDLE';
    case 'leaving':
      return 'EXIT';
    case 'declined':
      return 'EXIT';
    // ORDER 111 §4 — sleeping-gäst (värdshus) läses som IDLE på plats:
    // hen är kvar i värdshuset över natten men gör ingenting synligt
    // förrän frukost-passet väcker hen.
    case 'sleeping':
    // ORDER 115 §4.5 — eating-gäst (foodtruck-uteplats) hanteras
    // i FoodtruckScene med egen positioning + pose. RoomCardPanel
    // används bara i restaurang-läget; fallback IDLE så typen
    // täcker alla GuestState.
    case 'eating':
      return 'IDLE';
  }
}

// Convenience derivation from a Guest record. Callers with a Guest in
// hand shouldn't have to spell out the pattern input tuple.
export function patternForGuest(guest: Guest, simTime: number): GuestPatternLabel {
  return selectGuestPattern({
    task: guest.state,
    patience: deriveGuestPatience(guest, simTime),
    simTime,
    inState: Math.max(0, simTime - guest.stateTime),
    walkAwayOnArrival: guest.walkAwayOnArrival,
    hadWelcomeDrink: guest.hadWelcomeDrink
  });
}

// ORDER 087 §5.3 — patience derivation. `patience` in [0, 1] where
// 0 = calm and 1 = spent. Guests spend patience by waiting past the
// impatient threshold; they also read patience as `1 − satisfaction`
// when actively engaged (dining, paying). Deterministic — no
// randomness, no clock — same guest at same simTime yields same value.
export function deriveGuestPatience(guest: Guest, simTime: number): number {
  const inState = Math.max(0, simTime - guest.stateTime);
  switch (guest.state) {
    case 'waiting':
    case 'ordering': {
      // Linear ramp from 0 at t=IMPATIENT to 1 at t=HAIL. Clamped.
      if (inState <= WAIT_IMPATIENT_SEC) return 0;
      if (inState >= WAIT_HAIL_SEC) return 1;
      const span = WAIT_HAIL_SEC - WAIT_IMPATIENT_SEC;
      return (inState - WAIT_IMPATIENT_SEC) / span;
    }
    case 'dining':
    case 'paying':
      // Once seated with food, patience = dissatisfaction.
      return Math.max(0, Math.min(1, 1 - guest.satisfaction));
    case 'declined':
    case 'leaving':
      // Already done — patience reads full if walk-away, else 0.
      return guest.walkAwayOnArrival ? 1 : 0;
    case 'arriving':
    case 'seated':
    // ORDER 111 §4 — sleeping-gäst har inget att uttrycka; nolltålighet.
    case 'sleeping':
    // ORDER 115 §4.5 — eating-gäst (foodtruck) läses som nöjd närhet
    // = nolltålighet. Faktiskt satisfaction bär den avläsningen som
    // ansiktsuttryck via FoodtruckScene.
    case 'eating':
      return 0;
  }
}

// ORDER 087 §4 — pattern 18 IMPATIENT is the only pattern in the
// library that leans backward. All other patterns lean forward.
// This constant is what a renderer reads to decide sign. Not a
// visual constant that gets used here (the derivation stays pure),
// but exported so the renderer + tests both cite one source.
export const IMPATIENT_LEAN_DEG = -5;   // backwards
export const DEFAULT_LEAN_DEG = 3;      // forwards

export function leanDegForPattern(label: GuestPatternLabel): number {
  return label === 'IMPATIENT' ? IMPATIENT_LEAN_DEG : DEFAULT_LEAN_DEG;
}

// ORDER 087 §5.1 — the status pip has two bearers. A guest in pattern
// HAIL (17) or IMPATIENT (18) raises the pip; the staff member whose
// targetGuestId points at that guest raises the same pip. Same signal,
// one truth, two places where it shows. Returns the ids that carry
// the pip this tick.
//
// Pure — same (guests, staff, simTime) tuple returns the same ids.
export interface PipCarriers {
  guestIds: readonly string[];
  staffIds: readonly string[];
}

// The patterns that raise the pip. Kept as a constant so a test can
// assert exactly HAIL + IMPATIENT and nothing else silently gets in.
export const PIP_PATTERNS: readonly GuestPatternLabel[] = ['HAIL', 'IMPATIENT'];

export function derivePipCarriers(
  guests: readonly Guest[],
  staff: readonly StaffMember[],
  simTime: number
): PipCarriers {
  const guestIds: string[] = [];
  const raisingGuestIds = new Set<string>();
  for (const g of guests) {
    const p = patternForGuest(g, simTime);
    if (PIP_PATTERNS.includes(p)) {
      guestIds.push(g.id);
      raisingGuestIds.add(g.id);
    }
  }
  const staffIds: string[] = [];
  for (const s of staff) {
    if (s.targetGuestId !== null && raisingGuestIds.has(s.targetGuestId)) {
      staffIds.push(s.id);
    }
  }
  return { guestIds, staffIds };
}
