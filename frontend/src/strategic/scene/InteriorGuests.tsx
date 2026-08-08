// Live-simulation guests, rendered inside the player business.
//
// ORDER 044 §3.1 — guests must travel between states, not teleport.
// Each guest holds an in-scene position that eases toward the target
// slot for its current state at walking pace (~1.2 m/s). New guests
// spawn a few metres outside the arrival slot so the walk-in is
// visible; walk-aways head to declined slots that are laterally
// offset from the queue so the geometry of a refusal reads without
// needing the stream to spell it out.
//
// The path is the reading. A guest being seated glides across the
// entrance line, past the waiting queue, to a seat. A guest turning
// away veers laterally on the arrival arc, then heads back out. Same
// puck, opposite trajectories.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';
import type { Guest, GuestState } from '../types';
import { staffPositionsRef } from './interiorSharedState';

const GUEST_RADIUS_M = 0.32;
const GUEST_HEIGHT_M = 1.6;
const GUEST_Y = GUEST_HEIGHT_M / 2 + 0.06;

// Walking pace — 1.2 m/s is a comfortable indoor stroll. Guests moving
// at this pace cross the 6 m arrival radius in ~5 s, which reads as
// "walking" rather than teleport-with-easing.
const WALK_SPEED_M_PER_S = 1.2;

// Spawn offset: new guests appear this many metres further out along
// the entrance→arrival-slot vector, then walk in. Small enough that
// the wait isn't tedious (~3 s at walking pace), long enough to be
// legible as an arrival.
const SPAWN_OUTER_OFFSET_M = 4;

// Exit offset: leaving / declined guests, once they've reached their
// state's slot, continue outward this many metres before their puck
// is pruned from the scene. Creates a natural "walked away" trail.
const EXIT_OUTER_OFFSET_M = 6;

// ORDER 044 §3.3 seat-attention system — one mechanic, two readings.
//
// Physical alternative to an opacity pulse (Vision Owner 2026-08-08:
// "opacitetspuls är gränsfall mot symbol"): the guest puck's
// rendered position leans by up to LEAN_MAX_XZ_M toward a source of
// attention, plus a small Y dip to sell "leaning forward" from the
// isometric camera. Two polarities from one lean vector:
//
//   Wait polarity — a seated guest without staff nearby for
//   WAIT_LEAN_START_SEC accrues attention, and the puck leans toward
//   the room's centre-of-service (bar). Reading: "looking for
//   someone."  Grows linearly with wait time, saturating at
//   WAIT_LEAN_FULL_SEC.
//
//   Positive polarity — a seated guest with a staff puck within
//   STAFF_NEAR_RADIUS_M eases the lean toward the staff puck.
//   Reading: "the diner turned toward the server." Applies while the
//   staff puck stays close; fades back to neutral when they leave.
//
// Because both polarities modulate the same physical offset, there
// is no new symbol — just where the guest is sitting.
const LEAN_MAX_XZ_M = 0.22;
const LEAN_MAX_Y_M = 0.05;             // small forward-dip
const LEAN_EASE_PER_SEC = 1.5;         // how fast the lean glides to target
const STAFF_NEAR_RADIUS_M = 1.8;       // "attending" distance
const WAIT_LEAN_START_SEC = 8;         // how long unattended before lean starts
const WAIT_LEAN_FULL_SEC = 45;         // lean saturates at this wait duration
const SEATED_STATES: readonly GuestState[] = ['seated', 'ordering', 'dining', 'paying'];

// ORDER 046 §4 — sit / stand animation.
//
// On the transition tick 'waiting' → 'seated', dip Y by SIT_DIP_M
// over SIT_STAND_DURATION_SEC then stay dipped (guest is sitting).
// On 'paying' → 'leaving', rise Y from the dip back to standing.
// The Y offset composes on top of the lean-Y so a seated-and-leaning
// guest still leans normally.
const SIT_DIP_M = 0.15;
const SIT_STAND_DURATION_SEC = 0.5;

const GUEST_COLOUR: Record<GuestState, string> = {
  arriving: '#e6d4a0',
  waiting: '#e6b878',
  seated: '#c9c0a4',
  ordering: '#b9b394',
  dining: '#a89f7e',
  paying: '#9c9070',
  leaving: '#8a836e',
  declined: '#6a6455'
};

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type SlotXZ = [number, number];

interface GuestTarget {
  x: number;
  z: number;
  // Colour drives the mesh material each frame.
  colour: string;
}

interface AnimatedPos {
  cx: number;
  cz: number;
  // Current lean offset (added on top of cx/cz + Y at render time).
  // Eases toward leanTargetX/Z/Y each frame at LEAN_EASE_PER_SEC.
  leanX: number;
  leanZ: number;
  leanY: number;
  // ORDER 046 §4 — sit / stand animation.
  //
  // Previous state, tracked so we can detect the transition tick
  // and start the animation. Null on first frame.
  prevState: GuestState | null;
  // Sit/stand animation phase, 0..1 within the SIT_STAND_DURATION.
  // −1 when no animation active. Y-offset is a triangular envelope
  // over the phase (down then up for sit, up-then-back for stand).
  sitStandPhase: number;
  // Direction: -1 for sit (dip and stay), +1 for stand (rise back).
  sitStandDir: -1 | 0 | 1;
}

export function InteriorGuests() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);
  const sim = useSimState();

  // Per-guest current position (mutated each frame — React does not
  // re-render on position changes; the mesh transform is set direct).
  const positionsRef = useRef<Map<string, AnimatedPos>>(new Map());
  // Mesh refs keyed by guest id, so useFrame can set position + colour.
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  // Stable arrival-slot picker per guest. Assigned on first sighting
  // so a guest that arrives at slot 2 does not visually swap to slot 0
  // when an earlier guest leaves. Same idea for waiting / declined.
  const slotAssignRef = useRef<Map<string, {
    arrival: number;
    waiting: number;
    declined: number;
  }>>(new Map());
  const slotCounterRef = useRef({ arrival: 0, waiting: 0, declined: 0 });

  // Cached spawn point outward of each arrival slot (2 × radius).
  const spawnPoints: SlotXZ[] = useMemo(() => {
    if (!layout) return [];
    return layout.arrivalSlots.map(([sx, sz]) => {
      const [ex, ez] = layout.entrance;
      const dx = sx - ex;
      const dz = sz - ez;
      const d = Math.hypot(dx, dz);
      if (d < 0.01) return [sx, sz];
      return [
        sx + (dx / d) * SPAWN_OUTER_OFFSET_M,
        sz + (dz / d) * SPAWN_OUTER_OFFSET_M
      ];
    });
  }, [layout]);

  useFrame((_, delta) => {
    if (!groupRef.current || !layout) return;

    // Same crossfade band as PlayerBusiness's interior stub.
    const dist = actualRef.current.distance;
    const visibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    const g = groupRef.current;
    g.visible = visibility > 0.02;

    // Compute per-guest target for this frame.
    const idsSeen = new Set<string>();
    for (const guest of sim.guests) {
      idsSeen.add(guest.id);
      let slots = slotAssignRef.current.get(guest.id);
      if (!slots) {
        slots = {
          arrival: slotCounterRef.current.arrival++ % layout.arrivalSlots.length,
          waiting: slotCounterRef.current.waiting++ % layout.waitingSlots.length,
          declined: slotCounterRef.current.declined++ % layout.declinedSlots.length
        };
        slotAssignRef.current.set(guest.id, slots);
      }
      const target = targetFor(guest, slots, layout, spawnPoints);
      // Initialise position for a first-seen guest at the outer spawn
      // point matching their arrival slot — the walk-in becomes
      // visible instead of a pop-in on the arc.
      let pos = positionsRef.current.get(guest.id);
      if (!pos) {
        const spawn = spawnPoints[slots.arrival];
        pos = {
          cx: spawn[0], cz: spawn[1],
          leanX: 0, leanZ: 0, leanY: 0,
          prevState: null, sitStandPhase: -1, sitStandDir: 0
        };
        positionsRef.current.set(guest.id, pos);
      }

      // ORDER 046 §4 — detect sit / stand transitions and start the
      // Y-animation. waiting → seated is a sit (dip down); paying →
      // leaving is a stand (rise back). Any other transition resets
      // the phase so we don't double-animate.
      if (pos.prevState !== null && pos.prevState !== guest.state) {
        if (pos.prevState === 'waiting' && guest.state === 'seated') {
          pos.sitStandPhase = 0;
          pos.sitStandDir = -1;
        } else if (pos.prevState === 'paying' && guest.state === 'leaving') {
          pos.sitStandPhase = 0;
          pos.sitStandDir = 1;
        }
      }
      pos.prevState = guest.state;

      // Advance sit / stand phase.
      let sitStandY = 0;
      if (pos.sitStandDir !== 0 && pos.sitStandPhase >= 0) {
        pos.sitStandPhase += delta / SIT_STAND_DURATION_SEC;
        if (pos.sitStandPhase >= 1) {
          pos.sitStandPhase = 1;
          if (pos.sitStandDir === 1) {
            // Stand complete — back to zero.
            pos.sitStandDir = 0;
            pos.sitStandPhase = -1;
          }
        }
        if (pos.sitStandDir === -1) {
          // Sit — ease from 0 to −SIT_DIP_M with an easeOut curve.
          const t = pos.sitStandPhase;
          const eased = 1 - (1 - t) * (1 - t);
          sitStandY = -SIT_DIP_M * eased;
        } else if (pos.sitStandDir === 1) {
          // Stand — ease from −SIT_DIP_M back to 0.
          const t = pos.sitStandPhase;
          const eased = t * t;
          sitStandY = -SIT_DIP_M * (1 - eased);
        }
      } else if (SEATED_STATES.includes(guest.state)) {
        // Guest is seated but never played the sit-down (e.g. joined
        // mid-service already seated). Hold at the dipped position.
        sitStandY = -SIT_DIP_M;
      }
      // Ease toward target at walking pace.
      const dx = target.x - pos.cx;
      const dz = target.z - pos.cz;
      const dsq = dx * dx + dz * dz;
      const step = WALK_SPEED_M_PER_S * delta;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        pos.cx += dx * invd * step;
        pos.cz += dz * invd * step;
      } else {
        pos.cx = target.x;
        pos.cz = target.z;
      }

      // ORDER 044 §3.3 lean — physical seat-attention.
      const lean = computeLeanTarget(guest, target, layout, sim.simTime);
      const leanEase = LEAN_EASE_PER_SEC * delta;
      pos.leanX += (lean.tx - pos.leanX) * Math.min(1, leanEase);
      pos.leanZ += (lean.tz - pos.leanZ) * Math.min(1, leanEase);
      pos.leanY += (lean.ty - pos.leanY) * Math.min(1, leanEase);

      // Push to mesh. sit-stand Y composes on top of lean-Y so a
      // seated-and-leaning guest still leans normally.
      const mesh = meshRefs.current.get(guest.id);
      if (mesh) {
        mesh.position.set(
          pos.cx + pos.leanX,
          GUEST_Y + pos.leanY + sitStandY,
          pos.cz + pos.leanZ
        );
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.set(target.colour);
          mat.opacity = visibility;
          const wantTransparent = visibility < 0.99;
          if (mat.transparent !== wantTransparent) {
            mat.transparent = wantTransparent;
            mat.needsUpdate = true;
          }
        }
      }
    }

    // Prune positions + slot assignments for guests that left the sim.
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!idsSeen.has(id)) {
        positionsRef.current.delete(id);
        slotAssignRef.current.delete(id);
      }
    }
  });

  if (!layout) return null;

  return (
    <group ref={groupRef} visible={false}>
      {sim.guests.map((g) => (
        <mesh
          key={g.id}
          ref={(m) => {
            if (m) meshRefs.current.set(g.id, m);
            else meshRefs.current.delete(g.id);
          }}
          position={[0, GUEST_Y, 0]}
        >
          <cylinderGeometry args={[GUEST_RADIUS_M, GUEST_RADIUS_M, GUEST_HEIGHT_M, 10]} />
          <meshStandardMaterial color={GUEST_COLOUR[g.state]} roughness={0.9} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

// Target position + colour for a guest's current state. Each state has
// a natural terminus:
//   arriving  → arrival slot on the entrance arc
//   waiting   → queue slot (2.5–5.2 m outside the entrance)
//   seated    → the seat inside
//   leaving   → back to the arrival slot, then further out
//   declined  → laterally-offset "walk-away" slot outside the queue,
//               then further out
function targetFor(
  guest: Guest,
  slots: { arrival: number; waiting: number; declined: number },
  layout: NonNullable<ReturnType<typeof usePlayerBusinessInterior>>,
  spawnPoints: SlotXZ[]
): GuestTarget {
  const colour = GUEST_COLOUR[guest.state];
  const { arrivalSlots, waitingSlots, declinedSlots, seats } = layout;
  switch (guest.state) {
    case 'arriving': {
      const [x, z] = arrivalSlots[slots.arrival];
      return { x, z, colour };
    }
    case 'waiting': {
      const [x, z] = waitingSlots[slots.waiting];
      return { x, z, colour };
    }
    case 'seated':
    case 'ordering':
    case 'dining':
    case 'paying': {
      const idx = guest.seatIndex ?? -1;
      const seat = idx >= 0 && idx < seats.length ? seats[idx] : seats[0];
      return { x: seat[0], z: seat[1], colour };
    }
    case 'leaving': {
      // Head back out via the arrival slot's outer spawn point.
      const [x, z] = exitPointFor(layout, arrivalSlots[slots.arrival], spawnPoints[slots.arrival]);
      return { x, z, colour };
    }
    case 'declined': {
      // Walk-away — head out via the declined slot's outer projection.
      // Declined slots sit laterally offset from the queue, so the
      // trajectory reads distinctly from a normal exit.
      const declined = declinedSlots[slots.declined];
      const [x, z] = exitPointFor(layout, declined, extendedExit(layout, declined));
      return { x, z, colour };
    }
  }
}

// Once a leaving / declined guest reaches its state's slot, ease
// EXIT_OUTER_OFFSET_M further out along the entrance→slot vector so
// the puck visibly departs before being pruned. Called only through
// targetFor; kept as a helper for symmetry with the arrival spawn.
function exitPointFor(
  _layout: NonNullable<ReturnType<typeof usePlayerBusinessInterior>>,
  _slot: SlotXZ,
  outer: SlotXZ
): SlotXZ {
  return outer;
}

function extendedExit(
  layout: NonNullable<ReturnType<typeof usePlayerBusinessInterior>>,
  slot: SlotXZ
): SlotXZ {
  const [sx, sz] = slot;
  const [ex, ez] = layout.entrance;
  const dx = sx - ex;
  const dz = sz - ez;
  const d = Math.hypot(dx, dz);
  if (d < 0.01) return [sx, sz];
  return [
    sx + (dx / d) * EXIT_OUTER_OFFSET_M,
    sz + (dz / d) * EXIT_OUTER_OFFSET_M
  ];
}

// ORDER 044 §3.3 seat-attention lean target computation.
//
// Physical alternative to a symbolic pulse: return the (tx, tz, ty)
// offset the guest puck should ease its rendered position toward.
// Two polarities from one lean vector:
//
//   Positive (staff nearby): lean toward the staff puck. Reading:
//   "the diner turned toward the server as they arrived."
//
//   Wait (no staff, seated too long): lean toward the bar (the room's
//   centre-of-service). Amplitude grows from 0 at WAIT_LEAN_START_SEC
//   to full at WAIT_LEAN_FULL_SEC. Reading: "looking for someone."
//
// For non-seated guests, lean returns to zero (they're already
// walking; a lean on top would read as instability).
function computeLeanTarget(
  guest: Guest,
  currentTarget: GuestTarget,
  layout: NonNullable<ReturnType<typeof usePlayerBusinessInterior>>,
  now: number
): { tx: number; tz: number; ty: number } {
  if (!SEATED_STATES.includes(guest.state)) {
    return { tx: 0, tz: 0, ty: 0 };
  }
  const seatX = currentTarget.x;
  const seatZ = currentTarget.z;

  // Nearest staff puck.
  let nearestDx = 0, nearestDz = 0, nearestDist = Infinity;
  for (const sp of staffPositionsRef.current.values()) {
    const dx = sp.x - seatX;
    const dz = sp.z - seatZ;
    const d = Math.hypot(dx, dz);
    if (d < nearestDist) {
      nearestDist = d;
      nearestDx = dx;
      nearestDz = dz;
    }
  }

  if (nearestDist <= STAFF_NEAR_RADIUS_M && nearestDist > 1e-3) {
    // Positive polarity — lean toward the staff puck. Full LEAN_MAX
    // amplitude; a diner turning to acknowledge the server.
    const invd = 1 / nearestDist;
    return {
      tx: nearestDx * invd * LEAN_MAX_XZ_M,
      tz: nearestDz * invd * LEAN_MAX_XZ_M,
      ty: -LEAN_MAX_Y_M * 0.5   // small forward-dip
    };
  }

  // Wait polarity — how long has the guest been at this seat without
  // attention?
  const dwell = now - guest.stateTime;
  if (dwell < WAIT_LEAN_START_SEC) return { tx: 0, tz: 0, ty: 0 };
  const t = Math.min(
    1,
    (dwell - WAIT_LEAN_START_SEC) / (WAIT_LEAN_FULL_SEC - WAIT_LEAN_START_SEC)
  );
  // Direction: toward the bar (the pass — where a server would come from).
  const [barX, barZ] = layout.bar.worldPosition;
  const dx = barX - seatX;
  const dz = barZ - seatZ;
  const d = Math.hypot(dx, dz);
  if (d < 1e-3) return { tx: 0, tz: 0, ty: 0 };
  const invd = 1 / d;
  return {
    tx: dx * invd * LEAN_MAX_XZ_M * t,
    tz: dz * invd * LEAN_MAX_XZ_M * t,
    ty: -LEAN_MAX_Y_M * t
  };
}
