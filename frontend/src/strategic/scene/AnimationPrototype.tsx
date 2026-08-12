// Animation prototype (pre-ORDER 053).
//
// One articulated guest, no simulation coupling. Walks through the
// entrance to a specific seat, sits, holds an idle beat, stands, and
// walks back out — on a slow loop so the motion can be inspected
// without refreshing the page.
//
// Body is procedural THREE primitives (spheres, boxes, cylinders) —
// no external model, no rig. Legs pivot at the hip and swing in an
// out-of-phase sine so the walk reads as alternating steps. Torso and
// arms counter-swing at a smaller amplitude for a plausible gait. The
// idle pose is a slow head nod and a subtle vertical breathe on the
// torso; enough that a stationary character does not look dead but not
// so much that it becomes a mannerism.
//
// The figure inherits the standard interior fade so it only appears
// when the camera is zoomed close enough to see inside the building —
// same behaviour as InteriorGuests / InteriorStaff.
//
// This file is deliberately isolated: no reducer coupling, no dispatch,
// no tests. Toggle via ENABLED below.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';

// Master switch — kept here so the file can be included in the scene
// tree unconditionally and turned on/off without a re-export dance.
const ENABLED = true;

// ---------- character dimensions (procedural) --------------------------

const HEAD_RADIUS_M   = 0.12;
const TORSO_HEIGHT_M  = 0.60;
const TORSO_WIDTH_M   = 0.36;
const TORSO_DEPTH_M   = 0.22;
// ORDER 054 Del A restoration — anatomy gives the height, not the other
// way round. Crown = HIP + TORSO + HEAD_RADIUS*1.9 = 0.86 + 0.60 + 0.228
// = 1.688 m. The ~1.2 cm shortfall from ORDER 053's 1.70 m spec is
// accepted per Vision Owner 2026-08-11; the fudge from 0.86 → 0.87 that
// hit 1.70 was reverted (it broke the anatomical proportions to chase
// a decimal). Leg length 0.82 leaves ~4 cm of daylight under the feet
// where a shoe silhouette would live.
const HIP_HEIGHT_M    = 0.86;
const LEG_LENGTH_M    = 0.82;
const LEG_RADIUS_M    = 0.08;
const ARM_LENGTH_M    = 0.62;
const ARM_RADIUS_M    = 0.06;
const SHOULDER_HEIGHT_M = HIP_HEIGHT_M + TORSO_HEIGHT_M - 0.08;
const SHOULDER_HALF_W_M = TORSO_WIDTH_M / 2 - 0.02;

// Tones — a single guest, warm neutral. Kept a shade lighter than the
// InteriorGuests puck palette so the two never read as the same actor
// while the prototype is running alongside them.
const COLOUR_SKIN   = '#d8b48a';
const COLOUR_TORSO  = '#9a7050';
const COLOUR_LIMBS  = '#7a5238';
const COLOUR_LEGS   = '#3f3228';

// ---------- movement + animation timing --------------------------------

const WALK_SPEED_M_PER_S = 1.15;
// Full leg-swing cycle per second at cruise. Two footfalls per cycle,
// so cadence = 2 steps/sec, which matches the walking pace roughly.
const WALK_CYCLE_HZ = 1.0;
const LEG_SWING_AMP_RAD = 0.55;
const ARM_SWING_AMP_RAD = 0.42;
const BODY_BOB_AMP_M = 0.028;

const SIT_STAND_DURATION_SEC = 0.9;
// Amount the body drops as the figure lowers into a seat. Chairs live
// around 0.45 m; standing hip is 0.86 m; the delta is what sit needs
// to sink through.
const SIT_DROP_M = 0.42;
// Angle the thighs rotate forward when seated (legs sticking out).
const SIT_LEG_ROT_RAD = -Math.PI / 2 + 0.15;

// Idle when seated.
const IDLE_HEAD_NOD_HZ = 0.35;
const IDLE_HEAD_NOD_AMP_RAD = 0.06;
const IDLE_BREATHE_HZ = 0.22;
const IDLE_BREATHE_AMP_M = 0.012;

// Loop pacing — the walk / sit / rise / walk-out sequence plays on
// this cadence so the whole cycle is inspectable without a refresh.
const IDLE_SEATED_SEC = 18;
const OUTSIDE_PAUSE_SEC = 4;

// ---------- state machine ---------------------------------------------

type Phase =
  | 'idle-outside'
  | 'walk-in'
  | 'walk-to-seat'
  | 'turn-to-seat'
  | 'sit-down'
  | 'idle-seated'
  | 'stand-up'
  | 'walk-out'
  | 'idle-outside-again';

interface Runtime {
  phase: Phase;
  phaseStart: number;   // sim time when the current phase began
  x: number;            // world XZ position
  z: number;
  yaw: number;          // heading (radians, atan2(dx, dz))
  distanceWalked: number;   // for leg-cycle phase; only advances while walking
  sitStandT: number;    // 0 = standing, 1 = fully seated
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Shortest yaw delta from a to b, in radians.
function angleShortest(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// ---------- component --------------------------------------------------

export function AnimationPrototype() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();

  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);   // whole body — drops for sit
  const headRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  // Derived path anchors: the outside spawn, the entrance, and one
  // target seat. All in world XZ. Memoised on layout so a building
  // swap regenerates the route.
  const path = useMemo(() => {
    if (!layout) return null;
    const [ex, ez] = layout.entrance;
    // Outside starting point: 6 m outward from the entrance along the
    // entrance→waitingSpot vector, so the walk-in reads as approaching
    // from the plaza.
    const [wx, wz] = layout.waitingSpot;
    const odx = wx - ex;
    const odz = wz - ez;
    const od = Math.hypot(odx, odz) || 1;
    const outsideX = ex + (odx / od) * 6;
    const outsideZ = ez + (odz / od) * 6;
    // Seat target: pick the first seat of the four-top (table id 't2').
    // seats[] is ordered table-by-table; t0 has 2 seats, t1 has 2, so
    // the 4-top seats are indices 4..7. We use seat 4 — the "long
    // wall" edge — so the sit-down reads clearly against the room's
    // geometry.
    const targetSeat = layout.seats[4] ?? layout.seats[0];
    return {
      outside: [outsideX, outsideZ] as [number, number],
      entrance: [ex, ez] as [number, number],
      seat: targetSeat,
      seatTableIndex: 2   // t2, the four-top; used to derive facing.
    };
  }, [layout]);

  // Runtime state — mutated in useFrame, does not trigger React renders.
  const rt = useRef<Runtime>({
    phase: 'idle-outside',
    phaseStart: 0,
    x: 0,
    z: 0,
    yaw: 0,
    distanceWalked: 0,
    sitStandT: 0
  });

  useFrame((state3f, delta) => {
    if (!ENABLED) return;
    if (!layout || !path || !rootRef.current || !bodyRef.current) return;

    // Interior fade — same band the rest of the interior uses. Hide the
    // figure when the camera is too far to see inside the room.
    const dist = actualRef.current.distance;
    const visibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    rootRef.current.visible = visibility > 0.02;
    if (!rootRef.current.visible) return;

    const state = rt.current;
    const now = state3f.clock.getElapsedTime();
    if (state.phaseStart === 0) {
      // First tick — initialise position at the outside anchor.
      state.x = path.outside[0];
      state.z = path.outside[1];
      state.yaw = Math.atan2(path.entrance[0] - state.x, path.entrance[1] - state.z);
      state.phaseStart = now;
    }
    const phaseElapsed = now - state.phaseStart;

    // Phase-specific movement + phase-transition logic.
    let isWalking = false;
    let targetX = state.x;
    let targetZ = state.z;
    let sitTarget = state.sitStandT;   // 0 standing, 1 seated

    switch (state.phase) {
      case 'idle-outside': {
        // Hold outside a beat before the first walk-in so the entry
        // reads as a decision, not a spawn.
        if (phaseElapsed >= 1.2) transitionTo(state, 'walk-in', now);
        break;
      }
      case 'walk-in': {
        targetX = path.entrance[0];
        targetZ = path.entrance[1];
        isWalking = true;
        if (arrived(state, targetX, targetZ, 0.15)) {
          transitionTo(state, 'walk-to-seat', now);
        }
        break;
      }
      case 'walk-to-seat': {
        targetX = path.seat[0];
        targetZ = path.seat[1];
        isWalking = true;
        // Stop a step short so the figure ends up standing next to the
        // seat rather than clipping through it.
        if (arrived(state, targetX, targetZ, 0.35)) {
          transitionTo(state, 'turn-to-seat', now);
        }
        break;
      }
      case 'turn-to-seat': {
        // Turn to face the table centre before sitting. t2 is the
        // four-top the seat belongs to.
        const table = layout.tables[path.seatTableIndex];
        if (table) {
          const [tx, tz] = table.worldPosition;
          const desiredYaw = Math.atan2(tx - state.x, tz - state.z);
          const delta_yaw = angleShortest(state.yaw, desiredYaw);
          const turnStep = 3.0 * delta;
          if (Math.abs(delta_yaw) <= turnStep) {
            state.yaw = desiredYaw;
            transitionTo(state, 'sit-down', now);
          } else {
            state.yaw += Math.sign(delta_yaw) * turnStep;
          }
        } else {
          transitionTo(state, 'sit-down', now);
        }
        break;
      }
      case 'sit-down': {
        // Ease sit from 0 → 1 over SIT_STAND_DURATION_SEC.
        const t = Math.min(1, phaseElapsed / SIT_STAND_DURATION_SEC);
        sitTarget = t;
        if (t >= 1) transitionTo(state, 'idle-seated', now);
        break;
      }
      case 'idle-seated': {
        sitTarget = 1;
        if (phaseElapsed >= IDLE_SEATED_SEC) transitionTo(state, 'stand-up', now);
        break;
      }
      case 'stand-up': {
        const t = Math.min(1, phaseElapsed / SIT_STAND_DURATION_SEC);
        sitTarget = 1 - t;
        if (t >= 1) transitionTo(state, 'walk-out', now);
        break;
      }
      case 'walk-out': {
        targetX = path.outside[0];
        targetZ = path.outside[1];
        isWalking = true;
        if (arrived(state, targetX, targetZ, 0.2)) {
          transitionTo(state, 'idle-outside-again', now);
        }
        break;
      }
      case 'idle-outside-again': {
        if (phaseElapsed >= OUTSIDE_PAUSE_SEC) transitionTo(state, 'walk-in', now);
        break;
      }
    }

    // Move toward target if walking.
    if (isWalking) {
      const dx = targetX - state.x;
      const dz = targetZ - state.z;
      const d = Math.hypot(dx, dz);
      const step = WALK_SPEED_M_PER_S * delta;
      if (d > 1e-4) {
        const desiredYaw = Math.atan2(dx, dz);
        // Ease heading toward walk direction so the turn reads.
        const dyaw = angleShortest(state.yaw, desiredYaw);
        const turnStep = 5.0 * delta;
        state.yaw += Math.abs(dyaw) < turnStep ? dyaw : Math.sign(dyaw) * turnStep;
      }
      if (d <= step) {
        state.x = targetX;
        state.z = targetZ;
        state.distanceWalked += d;
      } else {
        state.x += (dx / d) * step;
        state.z += (dz / d) * step;
        state.distanceWalked += step;
      }
    }

    // Ease sit-stand toward its target so an abruptly interrupted phase
    // still resolves smoothly (defensive; normally the phase clocks
    // drive it).
    const sitLerp = 6.0 * delta;
    state.sitStandT += (sitTarget - state.sitStandT) * Math.min(1, sitLerp);

    // Push transforms to the group tree.
    const group = rootRef.current;
    group.position.x = state.x;
    group.position.z = state.z;
    group.rotation.y = state.yaw;

    // Body vertical: drop when sitting.
    const body = bodyRef.current;
    body.position.y = -state.sitStandT * SIT_DROP_M;

    // Walking limbs — leg + arm swing driven by distanceWalked so the
    // cadence is coupled to actual travel, not wall-clock.
    if (leftLegRef.current && rightLegRef.current) {
      const walkPhase = state.distanceWalked * WALK_CYCLE_HZ * (2 * Math.PI / WALK_SPEED_M_PER_S);
      // Blend walk swing OUT as the figure sits.
      const walkBlend = 1 - state.sitStandT;
      const legSwing = Math.sin(walkPhase) * LEG_SWING_AMP_RAD * walkBlend;
      // Sit adds a forward thigh rotation so the leg sticks out from
      // the hip when seated.
      const sitLegRot = state.sitStandT * SIT_LEG_ROT_RAD;
      leftLegRef.current.rotation.x = sitLegRot + legSwing;
      rightLegRef.current.rotation.x = sitLegRot - legSwing;
    }
    if (leftArmRef.current && rightArmRef.current) {
      const walkPhase = state.distanceWalked * WALK_CYCLE_HZ * (2 * Math.PI / WALK_SPEED_M_PER_S);
      const walkBlend = 1 - state.sitStandT;
      const armSwing = Math.sin(walkPhase) * ARM_SWING_AMP_RAD * walkBlend;
      // Arms opposite legs.
      leftArmRef.current.rotation.x = -armSwing;
      rightArmRef.current.rotation.x = armSwing;
    }

    // Body bob for walking + breathe for idle-seated.
    if (torsoRef.current) {
      const walkBlend = 1 - state.sitStandT;
      const walkPhase = state.distanceWalked * WALK_CYCLE_HZ * (2 * Math.PI / WALK_SPEED_M_PER_S);
      // Two footfalls per stride → 2× cadence bob, half amplitude
      // (rectified sine style: |sin|).
      const bob = Math.abs(Math.sin(walkPhase)) * BODY_BOB_AMP_M * walkBlend;
      const breathe = Math.sin(now * 2 * Math.PI * IDLE_BREATHE_HZ) * IDLE_BREATHE_AMP_M * state.sitStandT;
      // The torso lives at HIP_HEIGHT + TORSO_HEIGHT/2 in local space;
      // the bob/breathe is a small vertical offset from there.
      torsoRef.current.position.y = HIP_HEIGHT_M + TORSO_HEIGHT_M / 2 + bob + breathe;
    }

    // Head — walks tracks torso; seated adds a slow nod.
    if (headRef.current) {
      const seatedIdle = state.sitStandT;
      const nod = Math.sin(now * 2 * Math.PI * IDLE_HEAD_NOD_HZ) * IDLE_HEAD_NOD_AMP_RAD * seatedIdle;
      headRef.current.rotation.x = nod;
      // Follow the torso bob so the head stays glued to it.
      const walkBlend = 1 - state.sitStandT;
      const walkPhase = state.distanceWalked * WALK_CYCLE_HZ * (2 * Math.PI / WALK_SPEED_M_PER_S);
      const bob = Math.abs(Math.sin(walkPhase)) * BODY_BOB_AMP_M * walkBlend;
      const breathe = Math.sin(now * 2 * Math.PI * IDLE_BREATHE_HZ) * IDLE_BREATHE_AMP_M * state.sitStandT;
      headRef.current.position.y = HIP_HEIGHT_M + TORSO_HEIGHT_M + HEAD_RADIUS_M * 0.9 + bob + breathe;
    }
  });

  if (!ENABLED || !layout || !path) return null;

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        {/* Torso — box centered at (0, HIP+TORSO/2, 0) */}
        <mesh
          ref={torsoRef}
          position={[0, HIP_HEIGHT_M + TORSO_HEIGHT_M / 2, 0]}
          castShadow={false}
        >
          <boxGeometry args={[TORSO_WIDTH_M, TORSO_HEIGHT_M, TORSO_DEPTH_M]} />
          <meshStandardMaterial color={COLOUR_TORSO} roughness={0.85} />
        </mesh>

        {/* Head — sphere just above torso */}
        <mesh
          ref={headRef}
          position={[0, HIP_HEIGHT_M + TORSO_HEIGHT_M + HEAD_RADIUS_M * 0.9, 0]}
        >
          <sphereGeometry args={[HEAD_RADIUS_M, 16, 12]} />
          <meshStandardMaterial color={COLOUR_SKIN} roughness={0.9} />
        </mesh>

        {/* Arms — pivot at shoulder, cylinder hangs down along +Y-ish.
            Geometry is offset so rotation.x at the group swings the arm
            around the shoulder. */}
        <group ref={leftArmRef} position={[-SHOULDER_HALF_W_M, SHOULDER_HEIGHT_M, 0]}>
          <mesh position={[0, -ARM_LENGTH_M / 2, 0]}>
            <cylinderGeometry args={[ARM_RADIUS_M, ARM_RADIUS_M, ARM_LENGTH_M, 8]} />
            <meshStandardMaterial color={COLOUR_LIMBS} roughness={0.9} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[SHOULDER_HALF_W_M, SHOULDER_HEIGHT_M, 0]}>
          <mesh position={[0, -ARM_LENGTH_M / 2, 0]}>
            <cylinderGeometry args={[ARM_RADIUS_M, ARM_RADIUS_M, ARM_LENGTH_M, 8]} />
            <meshStandardMaterial color={COLOUR_LIMBS} roughness={0.9} />
          </mesh>
        </group>

        {/* Legs — pivot at hip, offset laterally. */}
        <group ref={leftLegRef} position={[-0.09, HIP_HEIGHT_M, 0]}>
          <mesh position={[0, -LEG_LENGTH_M / 2, 0]}>
            <cylinderGeometry args={[LEG_RADIUS_M, LEG_RADIUS_M, LEG_LENGTH_M, 8]} />
            <meshStandardMaterial color={COLOUR_LEGS} roughness={0.9} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.09, HIP_HEIGHT_M, 0]}>
          <mesh position={[0, -LEG_LENGTH_M / 2, 0]}>
            <cylinderGeometry args={[LEG_RADIUS_M, LEG_RADIUS_M, LEG_LENGTH_M, 8]} />
            <meshStandardMaterial color={COLOUR_LEGS} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------- helpers ----------------------------------------------------

function arrived(state: Runtime, x: number, z: number, tol: number): boolean {
  const dx = x - state.x;
  const dz = z - state.z;
  return dx * dx + dz * dz <= tol * tol;
}

function transitionTo(state: Runtime, phase: Phase, now: number): void {
  state.phase = phase;
  state.phaseStart = now;
}
