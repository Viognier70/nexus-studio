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

  const slots = projectGuests(sim.guests, layout.entrance, layout.waitingSpot, layout.tables);
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
  entrance: [number, number],
  waitingSpot: [number, number],
  tables: Array<[number, number]>
): GuestSlot[] {
  const slots: GuestSlot[] = [];
  let arrivingIdx = 0;
  let leavingIdx = 0;
  let waitingIdx = 0;
  for (const g of guests) {
    const colour = GUEST_COLOUR[g.state];
    switch (g.state) {
      case 'arriving': {
        // Fan out arrivals in a small arc south of the entrance so a
        // party of eight reads as *incoming* rather than a single blob.
        const angle = (-Math.PI / 2) + (arrivingIdx - 3.5) * 0.12;
        const r = 5 + (arrivingIdx % 3) * 0.7;
        slots.push({
          id: g.id,
          x: entrance[0] + Math.cos(angle) * r,
          z: entrance[1] - Math.sin(angle) * r,
          colour
        });
        arrivingIdx += 1;
        break;
      }
      case 'waiting': {
        // Small line at the waiting spot outside the door.
        slots.push({
          id: g.id,
          x: waitingSpot[0] + ((waitingIdx % 2) === 0 ? -0.5 : 0.5) - Math.floor(waitingIdx / 2) * 0.9,
          z: waitingSpot[1] + Math.floor(waitingIdx / 2) * 0.4,
          colour
        });
        waitingIdx += 1;
        break;
      }
      case 'seated':
      case 'ordering':
      case 'dining':
      case 'paying': {
        const idx = g.seatIndex ?? -1;
        const table = idx >= 0 && idx < tables.length ? tables[idx] : tables[0];
        slots.push({ id: g.id, x: table[0], z: table[1], colour });
        break;
      }
      case 'leaving': {
        slots.push({
          id: g.id,
          x: entrance[0] + (leavingIdx - 1) * 0.7,
          z: entrance[1] + 1.5,
          colour
        });
        leavingIdx += 1;
        break;
      }
      case 'declined':
        // Skip — the reducer prunes these within a few seconds, and drawing
        // them adds nothing legible.
        break;
    }
  }
  return slots;
}
