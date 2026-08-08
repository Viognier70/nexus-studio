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
        pos = { cx: spawn[0], cz: spawn[1] };
        positionsRef.current.set(guest.id, pos);
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
      // Push to mesh.
      const mesh = meshRefs.current.get(guest.id);
      if (mesh) {
        mesh.position.set(pos.cx, GUEST_Y, pos.cz);
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
