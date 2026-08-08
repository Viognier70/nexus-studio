// ORDER 044 §3.2 — staff exist in the room.
//
// One puck per TeamMember (state.team.members). Distinguishable from
// guests by silhouette: taller, thinner, darker uniform tone. Never
// selectable — no onClick, no hover state. Per EXECUTIVE_DESIGN_
// DIRECTIVE_001 §7 the player never commands them; what the player
// sees is the consequence of who they hired.
//
// Movement: each member has a home station derived from role. Under
// load, the station-anchored idle position drifts toward the room's
// centre of gravity (guest activity) at a rate scaled by team load.
// A calm service reads as stations held; a busy one reads as pucks
// crossing the floor. At load > 1.0 the drift saturates.
//
// Roles → stations, using the actual player-business OBB frame so
// the mapping survives building swaps:
//   värd     → 1 m inside the entrance (host at the door)
//   servitör → floor centre (circulates near tables)
//   kock     → the far end of the room (behind the bar / pass)
//   lärling  → mid-floor (helps everywhere)

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';
import { COVERS_PER_MEMBER } from '../simulation/team';
import type { StaffRole, TeamMember } from '../types';

const STAFF_RADIUS_M = 0.24;         // slimmer than guests (0.32)
const STAFF_HEIGHT_M = 1.75;         // taller than guests (1.6)
const STAFF_Y = STAFF_HEIGHT_M / 2 + 0.06;

// Movement pace — a little brisker than guests. Staff working under
// load pick their step up a touch.
const STAFF_WALK_SPEED_M_PER_S = 1.4;

// Uniform tones per role — kept dark and low-chroma so staff never
// blend with the warm-beige guest palette. Same shape difference
// (slim + tall) reinforces the distinction from the top-down camera.
const ROLE_COLOUR: Record<StaffRole, string> = {
  'värd':     '#2a2f3a',   // host — dark navy
  'servitör': '#33383f',   // server — charcoal
  'kock':     '#3d3835',   // cook — warm dark brown
  'lärling':  '#4a4744'    // apprentice — mid-grey
};

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type XZ = [number, number];

// Home stations in world XZ, derived from the OBB local frame so a
// building swap picks up new stations automatically.
function computeStations(
  layout: NonNullable<ReturnType<typeof usePlayerBusinessInterior>>
): Record<StaffRole, XZ> {
  const { entrance, bar, centre } = layout;
  // Vector from centre to entrance (points "outward" from the room's
  // heart to the door). One metre back from the entrance places värd
  // just inside the door.
  const [cx, cz] = centre;
  const [ex, ez] = entrance;
  const dx = ex - cx;
  const dz = ez - cz;
  const d = Math.hypot(dx, dz);
  const invD = d > 1e-3 ? 1 / d : 0;
  const inwardDx = -dx * invD;
  const inwardDz = -dz * invD;

  const värd: XZ = [ex + inwardDx * 1.5, ez + inwardDz * 1.5];
  const servitör: XZ = [cx, cz];
  // Kock lives at the bar centre — matches "behind the pass".
  const kock: XZ = [bar.worldPosition[0], bar.worldPosition[1]];
  // Lärling half-way between servitör and kock — floats.
  const lärling: XZ = [(servitör[0] + kock[0]) * 0.5, (servitör[1] + kock[1]) * 0.5];

  return { värd, servitör, kock, lärling };
}

// Guest count that counts as "active" for load computation.
function activeGuestCount(guests: NonNullable<ReturnType<typeof useSimState>>['guests']): number {
  let n = 0;
  for (const g of guests) {
    if (
      g.state === 'arriving' ||
      g.state === 'waiting' ||
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
    ) n += 1;
  }
  return n;
}

interface AnimatedStaff {
  cx: number;
  cz: number;
  jitterSeed: number;   // per-puck phase for the idle drift
}

export function InteriorStaff() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);
  const sim = useSimState();

  const positionsRef = useRef<Map<string, AnimatedStaff>>(new Map());
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const stations = useMemo(() => (layout ? computeStations(layout) : null), [layout]);

  useFrame((_, delta) => {
    if (!groupRef.current || !layout || !stations) return;

    const dist = actualRef.current.distance;
    const visibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    groupRef.current.visible = visibility > 0.02;

    // Load — how strained the team is. Matches the reputation loop
    // and event-stream denominator so the room reads the same as
    // those systems say.
    const capacity = Math.max(1, sim.team.members.length * COVERS_PER_MEMBER);
    const load = activeGuestCount(sim.guests) / capacity;
    const strainFactor = Math.min(1, Math.max(0, load - 0.4) / 0.8);

    const now = sim.simTime;
    const [gcx, gcz] = layout.centre; // room's centre-of-gravity for load drift
    const seenIds = new Set<string>();

    for (const member of sim.team.members) {
      seenIds.add(member.id);
      const home = stations[member.role] ?? stations['servitör'];

      let pos = positionsRef.current.get(member.id);
      if (!pos) {
        // Spawn at home station on first sighting.
        pos = {
          cx: home[0],
          cz: home[1],
          jitterSeed: Math.random() * Math.PI * 2
        };
        positionsRef.current.set(member.id, pos);
      }

      // Target: home station + small idle drift + load-driven pull
      // toward the room's centre. At load ≤ 0.4 the puck sits at home;
      // at load ≥ 1.2 it's substantially pulled into the guest area.
      const jitterX = Math.sin(now * 0.4 + pos.jitterSeed) * 0.5;
      const jitterZ = Math.cos(now * 0.35 + pos.jitterSeed * 1.7) * 0.5;
      const pullDX = gcx - home[0];
      const pullDZ = gcz - home[1];
      const targetX = home[0] + jitterX + pullDX * strainFactor * 0.5;
      const targetZ = home[1] + jitterZ + pullDZ * strainFactor * 0.5;

      // Ease toward target at walking pace.
      const dx = targetX - pos.cx;
      const dz = targetZ - pos.cz;
      const dsq = dx * dx + dz * dz;
      const step = STAFF_WALK_SPEED_M_PER_S * delta;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        pos.cx += dx * invd * step;
        pos.cz += dz * invd * step;
      } else {
        pos.cx = targetX;
        pos.cz = targetZ;
      }

      const mesh = meshRefs.current.get(member.id);
      if (mesh) {
        mesh.position.set(pos.cx, STAFF_Y, pos.cz);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          // Colour is stable per role; only opacity ticks with visibility.
          mat.opacity = visibility;
          const wantTransparent = visibility < 0.99;
          if (mat.transparent !== wantTransparent) {
            mat.transparent = wantTransparent;
            mat.needsUpdate = true;
          }
        }
      }
    }

    // Prune positions for members that left (fire / contract end).
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!seenIds.has(id)) positionsRef.current.delete(id);
    }
  });

  if (!layout || !stations) return null;

  return (
    <group ref={groupRef} visible={false}>
      {sim.team.members.map((m: TeamMember) => (
        <mesh
          key={m.id}
          ref={(mesh) => {
            if (mesh) meshRefs.current.set(m.id, mesh);
            else meshRefs.current.delete(m.id);
          }}
          position={[0, STAFF_Y, 0]}
        >
          <cylinderGeometry args={[STAFF_RADIUS_M, STAFF_RADIUS_M, STAFF_HEIGHT_M, 8]} />
          <meshStandardMaterial
            color={ROLE_COLOUR[m.role]}
            roughness={0.85}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}
