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
import { staffPositionsRef } from './interiorSharedState';

// ORDER 054 Del A — staff height matches guest (1.70 m per ORDER 053
// unit contract). The previous 1.75 m came from ORDER 053's silhouette-
// differentiation motivation: at the bird's-eye strategic camera,
// slightly taller pucks let the eye separate staff from guests at a
// glance. That job is now carried by radius (slim 0.24 vs guest 0.32)
// and uniform tone (dark, low-chroma via ROLE_COLOUR) — form and
// colour, not height. (ORDER 055 Del E corrects the earlier comment
// that mislabelled the 1.75 m as a "body-type stereotype cheat" —
// that framing did not match what ORDER 053 recorded.)
const STAFF_RADIUS_M = 0.24;
const STAFF_HEIGHT_M = 1.70;
const STAFF_Y = STAFF_HEIGHT_M / 2 + 0.06;

// Movement pace — a little brisker than guests. Staff working under
// load pick their step up a touch.
const STAFF_WALK_SPEED_M_PER_S = 1.4;

// ORDER 045 prep tempo — Vision Owner (2026-08-08): "Personalen rör
// sig för långsamt under prep — de ska arbeta, inte driva." During
// the mise-en-place window (day.prepEndsAt set, past opening, before
// service arrivals) staff are actively working: pace × 1.8, drift
// amplitude 3× wider, faster oscillation frequency. Falls back to
// service-time defaults the moment prep closes.
const PREP_PACE_MULTIPLIER = 1.8;
const PREP_DRIFT_AMPLITUDE_M = 1.5;   // vs the 0.5 m service-time idle drift
const PREP_DRIFT_FREQ_HZ = 1.1;       // vs the ~0.4 Hz service-time frequency

// ORDER 046 §4 — task bob. When guests are in the room, staff pucks
// bob subtly in Y to read as "doing something at their station"
// rather than "standing still." Amplitude scales with load so a
// calm room reads different from a busy one; during prep the pucks
// already bob larger via the drift amplitude so this is a service-
// time-only overlay.
const TASK_BOB_AMPLITUDE_M = 0.05;
const TASK_BOB_FREQ_HZ = 2.0;

// Uniform tones per role — kept dark and low-chroma so staff never
// blend with the warm-beige guest palette. Same shape difference
// (slim + tall) reinforces the distinction from the top-down camera.
const ROLE_COLOUR: Record<StaffRole, string> = {
  'värd':     '#2a2f3a',   // host — dark navy
  'servitör': '#33383f',   // server — charcoal
  'kock':     '#3d3835',   // cook — warm dark brown
  'lärling':  '#4a4744'    // apprentice — mid-grey
};

// ORDER 078 (M5) — service-rhythm colour ring. Thin cylinder at the
// puck's base with per-tick colour driven by state.day.serviceRhythm.
// Only visible during service (green/amber/red); reducer sets
// rhythm=null outside service so the ring hides itself.
const RHYTHM_COLOUR: Record<'green' | 'amber' | 'red', string> = {
  green: '#7bce8f',
  amber: '#e8c169',
  red:   '#d97070'
};
const RHYTHM_RING_INNER_M = STAFF_RADIUS_M;
const RHYTHM_RING_OUTER_M = STAFF_RADIUS_M + 0.08;
const RHYTHM_RING_Y = 0.03;   // just above the floor, under the puck body

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
  // ORDER 078 (M5) — group refs so the whole puck-plus-ring subtree
  // moves as one when tickStaff writes a new position each frame.
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());

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

    // ORDER 045 prep-tempo detection. In prep window (opening closed,
    // prep still running) staff work at PREP_PACE_MULTIPLIER pace with
    // wider + faster drift — the kitchen setting up, the floor being
    // wiped down, the delivery being unpacked. Falls back the moment
    // prep closes.
    const inPrep =
      (sim.day.period === 'lunch' || sim.day.period === 'dinner') &&
      sim.day.openingEndsAt === null &&
      sim.day.prepEndsAt !== null &&
      sim.simTime < sim.day.prepEndsAt;
    const pace = inPrep
      ? STAFF_WALK_SPEED_M_PER_S * PREP_PACE_MULTIPLIER
      : STAFF_WALK_SPEED_M_PER_S;
    const driftAmp = inPrep ? PREP_DRIFT_AMPLITUDE_M : 0.5;
    const driftFreq = inPrep ? PREP_DRIFT_FREQ_HZ : 0.4;

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

      // Target: home station + idle drift (wider + faster in prep) +
      // load-driven pull toward the room's centre. At load ≤ 0.4 the
      // puck sits at home; at load ≥ 1.2 it's substantially pulled
      // into the guest area (post-prep only).
      const jitterX = Math.sin(now * driftFreq + pos.jitterSeed) * driftAmp;
      const jitterZ =
        Math.cos(now * driftFreq * 0.9 + pos.jitterSeed * 1.7) * driftAmp;
      const pullDX = gcx - home[0];
      const pullDZ = gcz - home[1];
      const targetX = home[0] + jitterX + pullDX * strainFactor * 0.5;
      const targetZ = home[1] + jitterZ + pullDZ * strainFactor * 0.5;

      // Ease toward target at walking pace (boosted during prep).
      const dx = targetX - pos.cx;
      const dz = targetZ - pos.cz;
      const dsq = dx * dx + dz * dz;
      const step = pace * delta;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        pos.cx += dx * invd * step;
        pos.cz += dz * invd * step;
      } else {
        pos.cx = targetX;
        pos.cz = targetZ;
      }

      // ORDER 046 §4 — task-bob overlay. Applies during service
       // (post-prep) when there are active guests; scales with load
       // so a calm room bobs subtly and a busy one more visibly.
       // Per-puck phase from jitterSeed so the pucks don't bob in
       // lockstep. During prep the pucks are already bobbing on the
       // drift; adding this would smear the two reads together, so
       // suppress during prep.
       let bobY = 0;
       if (!inPrep && (sim.day.period === 'lunch' || sim.day.period === 'dinner') && load > 0.05) {
         const bobAmp = TASK_BOB_AMPLITUDE_M * Math.min(1, load);
         bobY = Math.sin(now * TASK_BOB_FREQ_HZ * 2 * Math.PI + pos.jitterSeed * 3) * bobAmp;
       }

      const mesh = meshRefs.current.get(member.id);
      const grp = groupRefs.current.get(member.id);
      if (grp) {
        // ORDER 078 (M5) — group moves; puck + ring stay in local
        // frame (puck at STAFF_Y + bobY, ring at RHYTHM_RING_Y).
        grp.position.set(pos.cx, bobY, pos.cz);
      }
      if (mesh) {
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

      // Publish position for the seat-attention system in
      // InteriorGuests to read this frame.
      staffPositionsRef.current.set(member.id, {
        x: pos.cx,
        z: pos.cz,
        role: member.role
      });
    }

    // Prune positions for members that left (fire / contract end).
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!seenIds.has(id)) {
        positionsRef.current.delete(id);
        staffPositionsRef.current.delete(id);
      }
    }
  });

  if (!layout || !stations) return null;

  const rhythm = sim.day.serviceRhythm;
  const showRing = rhythm !== null;
  const ringColour = rhythm ? RHYTHM_COLOUR[rhythm] : '#000000';

  return (
    <group ref={groupRef} visible={false}>
      {sim.team.members.map((m: TeamMember) => (
        <group
          key={m.id}
          ref={(g) => {
            if (g) groupRefs.current.set(m.id, g);
            else groupRefs.current.delete(m.id);
          }}
        >
          <mesh
            position={[0, STAFF_Y, 0]}
            ref={(mesh) => {
              if (mesh) meshRefs.current.set(m.id, mesh);
              else meshRefs.current.delete(m.id);
            }}
          >
            <cylinderGeometry args={[STAFF_RADIUS_M, STAFF_RADIUS_M, STAFF_HEIGHT_M, 8]} />
            <meshStandardMaterial
              color={ROLE_COLOUR[m.role]}
              roughness={0.85}
              transparent
              opacity={0}
            />
          </mesh>
          {showRing && (
            <mesh position={[0, RHYTHM_RING_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[RHYTHM_RING_INNER_M, RHYTHM_RING_OUTER_M, 24]} />
              <meshBasicMaterial
                color={ringColour}
                transparent
                opacity={0.85}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
