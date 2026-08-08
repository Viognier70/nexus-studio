// Live-simulation guests, rendered inside the player business.
//
// The simulation code in ../simulation/ was written months before ORDER
// 042 §3.1 swapped the player business to an OSM footprint. Its
// INTERIOR anchors (../content/layout.ts) target a toy world where the
// wine bar sits at (0, 0). Rather than rewrite the simulation to match
// the new footprint — which ORDER 042 §2 explicitly forbids — this
// component projects each guest's *state* onto local-frame slots
// derived from the actual player-business polygon.
//
// The mapping is intentionally cosmetic:
//   arriving / waiting  → outside the south wall
//   seated / ordering / dining / paying → at a table (assigned by seatIndex)
//   leaving             → back at the entrance strip
//
// Guests fade in as the camera approaches (same crossfade band as the
// interior stub in PlayerBusiness) so nothing distracts the strategic view.

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';
import type { Guest, GuestState } from '../types';

const GUEST_RADIUS_M = 0.32;
const GUEST_HEIGHT_M = 1.6;
const GUEST_Y = GUEST_HEIGHT_M / 2 + 0.06;

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

interface GuestSlot {
  id: string;
  x: number;
  z: number;
  colour: string;
}

export function InteriorGuests() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);
  const sim = useSimState();

  useFrame(() => {
    if (!groupRef.current) return;
    // Same crossfade band as PlayerBusiness's interior stub.
    const dist = actualRef.current.distance;
    const visibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    const g = groupRef.current;
    g.visible = visibility > 0.02;
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && 'opacity' in mat) {
          mat.opacity = visibility;
          const wantTransparent = visibility < 0.99;
          if (mat.transparent !== wantTransparent) {
            mat.transparent = wantTransparent;
            mat.needsUpdate = true;
          }
        }
      }
    });
  });

  if (!layout) return null;

  const slots = projectGuests(sim.guests, layout);
  if (slots.length === 0) return null;

  return (
    <group ref={groupRef} visible={false}>
      {slots.map((s) => (
        <mesh key={s.id} position={[s.x, GUEST_Y, s.z]}>
          <cylinderGeometry args={[GUEST_RADIUS_M, GUEST_RADIUS_M, GUEST_HEIGHT_M, 10]} />
          <meshStandardMaterial color={s.colour} roughness={0.9} transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

function projectGuests(
  guests: Guest[],
  layout: NonNullable<ReturnType<typeof usePlayerBusinessInterior>>
): GuestSlot[] {
  const slots: GuestSlot[] = [];
  const { waitingSlots, declinedSlots, arrivalSlots, seats } = layout;
  let arrivingIdx = 0;
  let leavingIdx = 0;
  let waitingIdx = 0;
  let declinedIdx = 0;
  for (const g of guests) {
    const colour = GUEST_COLOUR[g.state];
    switch (g.state) {
      case 'arriving': {
        // Pre-computed arrival arc in the OBB frame. Modulo wrap keeps
        // a big arrival wave from stretching indefinitely past the
        // building's short-side bounds.
        const [wx, wz] = arrivalSlots[arrivingIdx % arrivalSlots.length];
        slots.push({ id: g.id, x: wx, z: wz, colour });
        arrivingIdx += 1;
        break;
      }
      case 'waiting': {
        // Pre-computed queue slots — 2 wide, 4 deep, extending
        // perpendicular to the entrance wall in the OBB local +X
        // direction. Modulo wrap keeps the queue bounded rather than
        // stretching down the street (the pre-ORDER-043-B.1 world-
        // frame offsets did the wrong thing on the rotated polygon).
        const [wx, wz] = waitingSlots[waitingIdx % waitingSlots.length];
        slots.push({ id: g.id, x: wx, z: wz, colour });
        waitingIdx += 1;
        break;
      }
      case 'seated':
      case 'ordering':
      case 'dining':
      case 'paying': {
        // seatIndex points into the flat seats array; TOTAL_SEATS long,
        // one entry per chair (tables' chairs first, bar stools last).
        // Fallback to seats[0] rather than skipping so a guest with a
        // stale seatIndex still renders somewhere legible.
        const idx = g.seatIndex ?? -1;
        const seat = idx >= 0 && idx < seats.length ? seats[idx] : seats[0];
        slots.push({ id: g.id, x: seat[0], z: seat[1], colour });
        break;
      }
      case 'leaving': {
        // Leaving guests exit through the entrance to the +X side.
        // Small spread using OBB-aware slot picking so we don't slide
        // sideways down the street on rotated polygons.
        const [wx, wz] = arrivalSlots[leavingIdx % arrivalSlots.length];
        slots.push({ id: g.id, x: wx, z: wz, colour });
        leavingIdx += 1;
        break;
      }
      case 'declined': {
        // ORDER 043 §6 walk-away visualisation. Slots are laterally
        // offset from the waiting queue in the OBB local frame, so
        // the walk-away puck reads as "someone walked past the queue
        // back out" rather than joining the queue.
        const [wx, wz] = declinedSlots[declinedIdx % declinedSlots.length];
        slots.push({ id: g.id, x: wx, z: wz, colour });
        declinedIdx += 1;
        break;
      }
    }
  }
  return slots;
}
