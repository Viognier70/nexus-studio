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
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';
import { COVERS_PER_MEMBER } from '../simulation/team';
import type { StaffRole, TeamMember } from '../types';
import { staffPositionsRef } from './interiorSharedState';
import { derivePipCarriers } from '../ui/RoomCardPanel/guestPatterns';
import {
  PIP_COLOUR,
  PIP_SIZE_M
} from './patternTransform';
import { teamPipCarriersFromStaffPipCarriers } from './teamStaffBridge';
// ORDER 121 §2 — figureRig ersätter cylinderpucken. Pipens Y kommer nu
// från rig.joints.headAnchor per §6.
import {
  createFigureRig,
  disposeFigureRig,
  applyPose,
  poseIdle,
  poseWalk,
  type FigureRig
} from './figureRig';

// ORDER 054 Del A / ORDER 121 §2 — staff height matches guest (1.70 m).
// Skillnaden bärs nu av axelbredd (guest 0,46 / staff 0,40 via figureRig
// FigureVariant) och uniformsfärg (ROLE_COLOUR) — form och färg, inte
// höjd. STAFF_RADIUS_M och STAFF_Y utgår som puck-konstanter; rhythm-
// ringen behåller sitt eget mått nedanför.
// ORDER 121 §2 — stridslängd för gångfas (poseWalk tar cykler).
const STRIDE_LENGTH_M = 0.75;

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

// Uniform tones per role.
//
// ORDER 123 §2.2 (SD-004 §3.3-preciseringen 2026-08-29): paletten
// ljusas från det tidigare bandet #2a2f3a–#4a4744, som gav "kroppen
// blir en skugga oavsett hur hjässan löses" mot golvets #a89577.
// Kontrastförhållandet var 4,5–6:1 = ren silhuett utan internt
// färgdjup. Nya färger ligger i bandet [1,8, 3,6]:1 mot golvet, per
// `silhouetteContrast.ts`, med bevarad roll-distinktion ≥ 12 ΔE.
// Tester (`paletteContrast.test.ts`) hävdar bandet — nästa gång någon
// justerar en färg fångas driften direkt.
// ORDER 123 §5 — exporterad så `paletteContrast.test.ts` kan hävda
// bandet mot golvet + roll-distinktionen mellan färgerna.
//
// Rollerna sprids över FYRA distinkta hue-familjer (djup marinblå,
// varm-neutral, burgundy, kall-grå) så parvis ΔE 76 ≥ 12 uppfylls
// utan att någon uniform hamnar utanför [1,8, 3,6]:1-kontrastbandet
// mot golvets #a89577. Ett tidigare försök med fyra mörka
// neutraler (#4a5464, #565b64, #605852, #6b6660) föll på §4.4:
// pair-wise ΔE 5,6–11,1 — spelaren kunde inte skilja rollerna åt.
export const ROLE_COLOUR: Record<StaffRole, string> = {
  'värd':     '#2f4a68',   // host — deep navy (cool, doorway)
  // ORDER 127 §3.3 — servitör bytt från #6b6260 till #454a52.
  // Tidigare warm-neutral kollapsade mot ölkrogens `floorBrew #7d776c`
  // (kontrast 1.33:1 — ORDER 125 §7-fynd). Ny mörkare cool grey ligger
  // i L 0.069, klarar bandet [1.8, 3.6]:1 mot alla golvzoner:
  // restaurant #a08462 = 2.52, ölkrogen dining #a49b8a = 3.24,
  // brew #7d776c = 1.99, kitchen #948f84 = 2.76. Parvis ΔE mot övriga
  // roller > 12 bevarad (verifierat i paletteZoneCheck-tester).
  'servitör': '#454a52',   // server — dark cool grey (was #6b6260)
  'kock':     '#7a3e3a',   // cook — burgundy (warm, kitchen)
  'lärling':  '#d8d3ce'    // apprentice — light warm-grey (muted, junior)
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
// ORDER 121 §2 — behåller ringens innerdiameter på 0,24 m (samma mått
// som gamla STAFF_RADIUS_M) så tick-lasttolken läser oförändrat.
// Riggens fötter är ~0,20 m breda, så ringen omsluter fortfarande figuren
// men lämnar små ankarnyckelben synliga.
const RHYTHM_RING_INNER_M = 0.24;
const RHYTHM_RING_OUTER_M = 0.24 + 0.08;
const RHYTHM_RING_Y = 0.03;   // just above the floor, under the rig body

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
  // ORDER 121 §2 — gångfas i cykler + tidsstämpel för föregående
  // position, så pose-valet vet om personalen faktiskt rör sig eller
  // står på sin station.
  walkPhase: number;
}

export function InteriorStaff() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);
  const sim = useSimState();

  const positionsRef = useRef<Map<string, AnimatedStaff>>(new Map());
  // ORDER 078 (M5) — group refs so the whole rig-plus-ring subtree
  // moves as one when tickStaff writes a new position each frame.
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());
  // ORDER 088 §4 — pip mesh refs per TeamMember id, toggled per tick.
  const pipRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  // ORDER 121 §2 — rig-refs per team-member-id.
  const rigsRef = useRef<Map<string, FigureRig>>(new Map());

  // ORDER 121 §8 DoD 5 — läckagetest-garanti.
  useEffect(() => {
    const rigs = rigsRef.current;
    return () => {
      rigs.forEach((rig) => disposeFigureRig(rig));
      rigs.clear();
    };
  }, []);

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

    // ORDER 088 §4 + ORDER 090 §3 — pip carriers this tick.
    // StaffMember.targetGuestId is the "responsibility" edge, so a
    // hailing guest's carrier is its owning StaffMember. Because the
    // room renders TeamMember pucks (economic layer) rather than
    // StaffMember pucks (task layer), we bridge via
    // `bridgeTeamToStaff`: bipartite role-match in list order.
    //
    // Pre-090 this was a role-only match ("any servitör with a hail
    // lights ALL servitör pucks"), which was ambiguous the moment a
    // second servitör hired in — pip could land on the wrong puck.
    // The bridge fixes that: TeamMember at index k of role R maps to
    // StaffMember at index k of role R, so pip lands on the specific
    // puck whose owning task edge fired.
    const pipCarriers = derivePipCarriers(sim.guests, sim.staff, sim.simTime);
    const teamPipCarrierIds = teamPipCarriersFromStaffPipCarriers(
      sim.team.members,
      sim.staff,
      new Set(pipCarriers.staffIds)
    );

    for (const member of sim.team.members) {
      seenIds.add(member.id);
      const home = stations[member.role] ?? stations['servitör'];

      let pos = positionsRef.current.get(member.id);
      if (!pos) {
        // Spawn at home station on first sighting.
        pos = {
          cx: home[0],
          cz: home[1],
          jitterSeed: Math.random() * Math.PI * 2,
          walkPhase: 0
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
      let movedThisFrame = false;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        pos.cx += dx * invd * step;
        pos.cz += dz * invd * step;
        movedThisFrame = true;
      } else if (dsq > 1e-6) {
        pos.cx = targetX;
        pos.cz = targetZ;
        movedThisFrame = true;
      }
      // ORDER 121 §2 — gångfas ökar med stridslängd per meter.
      if (movedThisFrame) {
        pos.walkPhase += (step / STRIDE_LENGTH_M);
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

      const grp = groupRefs.current.get(member.id);
      // ORDER 121 §2 — hämta/skapa rig med staff-variant + roll-uniform.
      let rig = rigsRef.current.get(member.id);
      if (grp && !rig) {
        rig = createFigureRig({
          variant: 'staff',
          garmentColour: ROLE_COLOUR[member.role]
        });
        grp.add(rig.root);
        rigsRef.current.set(member.id, rig);
      }
      if (grp) {
        // ORDER 078 (M5) — group moves; rig + ring stay in local
        // frame (rig at y=0, ring at RHYTHM_RING_Y).
        grp.position.set(pos.cx, bobY, pos.cz);
      }
      if (rig) {
        // Uniformsfärgen är stabil per roll; opacity följer visibility.
        rig.materials.forEach((mat) => {
          mat.opacity = visibility;
          const wantTransparent = visibility < 0.99;
          if (mat.transparent !== wantTransparent) {
            mat.transparent = wantTransparent;
            mat.needsUpdate = true;
          }
        });
        // ORDER 121 §4 — poseWalk vid rörelse, annars poseIdle. poseWork
        // och poseCarry är FLAGGADE i figureRig.ts (staff har ingen
        // task-state resp. carry-state i sim-lagret) — presentationslagret
        // väljer inte dem självt.
        const t = sim.simTime + pos.jitterSeed;
        if (movedThisFrame) {
          applyPose(rig, poseWalk(pos.walkPhase));
        } else {
          applyPose(rig, poseIdle(t));
        }
      }

      // Publish position for the seat-attention system in
      // InteriorGuests to read this frame.
      staffPositionsRef.current.set(member.id, {
        x: pos.cx,
        z: pos.cz,
        role: member.role
      });

      // ORDER 088 §4 + ORDER 090 §3 + ORDER 121 §6 — pip på huvudankaret
      // (inte längre puck-topp). Id-bryggan (teamPipCarriersFromStaff-
      // PipCarriers) mappar från StaffMember-tasks till specifik
      // TeamMember — pip landar på rätt figur även med flera servitörer.
      const pipMesh = pipRefs.current.get(member.id);
      if (pipMesh && grp && rig) {
        const isCarrier = teamPipCarrierIds.has(member.id);
        pipMesh.visible = isCarrier && visibility > 0.02;
        grp.updateWorldMatrix(true, true);
        const anchorWorld = new THREE.Vector3();
        rig.joints.headAnchor.getWorldPosition(anchorWorld);
        const anchorLocal = grp.worldToLocal(anchorWorld);
        pipMesh.position.copy(anchorLocal);
        const pMat = pipMesh.material as THREE.MeshStandardMaterial;
        if (pMat) {
          pMat.opacity = visibility;
          pMat.transparent = visibility < 0.99;
        }
      }
    }

    // Prune positions + rigs for members that left (fire / contract end).
    // ORDER 121 §8 DoD 5 — disposeFigureRig så material inte läcker.
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!seenIds.has(id)) {
        positionsRef.current.delete(id);
        staffPositionsRef.current.delete(id);
        const oldRig = rigsRef.current.get(id);
        if (oldRig) {
          disposeFigureRig(oldRig);
          rigsRef.current.delete(id);
        }
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
          {/* ORDER 121 §2 — cylinder-mesh borttagen. Riggen monteras
              imperativt i useFrame via grp.add(rig.root). */}
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
          {/* ORDER 088 §4 — pip cube on staff puck. Hidden by default;
              visibility toggled per tick from role-matched pip
              carriers. No text, no number — same primitive as guest
              pip. */}
          <mesh
            ref={(mesh) => {
              if (mesh) pipRefs.current.set(m.id, mesh);
              else pipRefs.current.delete(m.id);
            }}
            visible={false}
            userData={{ testid: `staff-pip-${m.id}` }}
          >
            <boxGeometry args={[PIP_SIZE_M, PIP_SIZE_M, PIP_SIZE_M]} />
            <meshStandardMaterial
              color={PIP_COLOUR}
              emissive={PIP_COLOUR}
              emissiveIntensity={0.6}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
