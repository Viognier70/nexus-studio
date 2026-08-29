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
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';
import type { Guest, GuestState } from '../types';
import { staffPositionsRef } from './interiorSharedState';
import {
  derivePipCarriers,
  patternForGuest
} from '../ui/RoomCardPanel/guestPatterns';
import {
  PIP_COLOUR,
  PIP_SIZE_M,
  computePatternTransform
} from './patternTransform';
// ORDER 121 §2 — figureRig ersätter cylinderpucken. Pipens Y-position
// kommer från rig.joints.headAnchor per §6, inte från konstanten
// PIP_OFFSET_ABOVE_PUCK_TOP_M längre.
import {
  createFigureRig,
  disposeFigureRig,
  applyPose,
  blendPose,
  poseIdle,
  poseSeated,
  poseWalk,
  type FigureRig,
  type FigurePose
} from './figureRig';

// ORDER 121 — cylinderpuckens `GUEST_RADIUS_M`/`GUEST_HEIGHT_M`/`GUEST_Y`
// utgår. Riggen har fötterna i golvplanet (y=0) i sitt lokala rum, så
// gruppen sitter direkt vid marken. Höjdkontraktet (1,700 m) bärs av
// `FIGURE.totalHeight` i figureRig.ts.
// ORDER 121 §2 — stridslängd för gångfas (poseWalk tar cykler, inte
// sekunder). En cykel = två fotisättningar. 0,75 m ger cirka 1,6 cykler
// per sekund vid 1,2 m/s — naturlig kadens.
const STRIDE_LENGTH_M = 0.75;

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

// ORDER 046 §4 / ORDER 088 §2.3 / ORDER 121 §2 — sit / stand animation.
//
// Före ORDER 121 dippades hela pucken 0,27 m i Y (SIT_DIP_M) under
// SIT_STAND_DURATION_SEC för att läsa som sittande vid pitch 58° /
// distans 8,4 m. Riggen ersätter det: `poseSeated` sänker höften 0,41 m
// (sitshöjd 0,45 m) och böjer knä och höft så låret går vågrätt och
// sulan står plan i golvplanet — kroppen ändrar form, inte bara höjd.
// SIT_DIP_M utgår som Y-konstant; övergången görs istället som
// blendPose(poseIdle → poseSeated) över samma 0,5 s.
const SIT_STAND_DURATION_SEC = 0.5;

// ORDER 123 §2.2 (SD-004 §3.3-preciseringen 2026-08-29): paletten
// ljusas så gästen är läsbar mot golvets #a89577. Tidigare palett
// hade `dining`/`paying`/`leaving`-färger med kontrastförhållande
// 1,08–1,29 mot golvet — kroppen försvann i golvet. Nya färger för
// SEATED_STATES (`seated`/`ordering`/`dining`/`paying`) ligger i
// bandet [1,8, 3,6]:1 per `silhouetteContrast.ts`. `sleeping` +
// `leaving` + `declined` är transienta / edge-tillstånd och testas
// inte lika strikt — de är fade-outs, kort synliga.
// `eating`/`serving` rör bara foodtruck-scenen (typkrav; renderas
// aldrig i InteriorGuests).
// ORDER 123 §5 — exporterad så `paletteContrast.test.ts` kan hävda
// bandet mot golvet. SEATED_STATES-färgerna testas strikt; andra
// tillstånd är transienta / edge.
export const GUEST_COLOUR: Record<GuestState, string> = {
  arriving: '#efd9a8',
  waiting: '#f0d19a',
  seated: '#ecd2a0',
  ordering: '#edd0a4',
  dining: '#ebcda2',
  paying: '#e8c99e',
  // ORDER 111 §4 — sleeping-gäst (värdshus) läses lite dovare än seated:
  // hen är på plats men inte i aktiv service. Muted warm-tan.
  sleeping: '#c4ac7d',
  // ORDER 115 §4.5 — eating-gäst (foodtruck-uteplats) — inte i denna
  // scene men typen kräver alla GuestState-nycklar. Foodtruck-specific.
  eating: '#d4c088',
  // ORDER 115 rev 2 — serving-gäst (foodtruck-överlämning) — samma
  // typkrav; färgen behöver bara vara definierad, används inte i
  // restaurang-scenen.
  serving: '#c9c0a4',
  // Transienta exit-tillstånd — gäst på väg ut, kort synlig i vyn.
  // Lite mörkare än SEATED_STATES men inte inuti strikt kontrastband.
  leaving: '#d3bd8c',
  declined: '#b8a276'
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
  // ORDER 088 §3 — stable phase seed so per-puck bob/microYaw don't
  // sync. Deterministic per guest id.
  phaseSeed: number;
  // ORDER 121 §2 — gångfas i cykler (poseWalk-argument). Ökar med
  // (delta × WALK_SPEED_M_PER_S / STRIDE_LENGTH_M) när figuren rör sig,
  // står still när figuren står still. Kadensen hänger ihop med
  // förflyttningen och inte med väggklockan.
  walkPhase: number;
}

// ORDER 088 §3 — hash guest id to a stable [0, 2π) phase seed. Same
// id yields the same seed every mount — no Math.random. Small
// FNV-1a variant.
function phaseSeedFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000 * Math.PI * 2;
}

export function InteriorGuests() {
  const layout = usePlayerBusinessInterior();
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);
  const sim = useSimState();

  // Per-guest current position (mutated each frame — React does not
  // re-render on position changes; the mesh transform is set direct).
  const positionsRef = useRef<Map<string, AnimatedPos>>(new Map());
  // ORDER 088 §3 — group refs so the pattern-driven lean/microYaw
  // pivot at ground level (top tilts, base stays planted). Group holds
  // the rig (added imperativt via group.add) plus the pip mesh.
  const groupRefs = useRef<Map<string, THREE.Group>>(new Map());
  // ORDER 088 §4 — pip mesh refs so visibility can be toggled per
  // tick from derivePipCarriers.
  const pipRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  // ORDER 121 §2 — rig-refs per gäst-id. Skapas i useFrame första gången
  // gästen ses (i samma tick som positionen initialiseras), monteras med
  // group.add(rig.root), och frigörs (disposeFigureRig) när gästen
  // pruneras.
  const rigsRef = useRef<Map<string, FigureRig>>(new Map());

  // ORDER 121 §8 DoD 5 — läckagetest-garanti: när komponenten avmonteras
  // frigörs alla riggens material + delade geometrier. Utan denna
  // useEffect skulle en dev-server-refresh läcka material.
  useEffect(() => {
    const rigs = rigsRef.current;
    return () => {
      rigs.forEach((rig) => disposeFigureRig(rig));
      rigs.clear();
    };
  }, []);

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

    // ORDER 088 §4 — derive pip carriers this tick. `sim.staff` is
    // the visual layer (StaffMember[] with targetGuestId); passing it
    // to derivePipCarriers returns the (guestIds, staffIds) that both
    // raise the pip. Guest ids consumed here; staff ids consumed in
    // InteriorStaff via the same call.
    const pipCarriers = derivePipCarriers(sim.guests, sim.staff, sim.simTime);
    const pipCarrierGuestIds = new Set(pipCarriers.guestIds);

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
          prevState: null, sitStandPhase: -1, sitStandDir: 0,
          phaseSeed: phaseSeedFor(guest.id),
          walkPhase: 0
        };
        positionsRef.current.set(guest.id, pos);
      }

      // ORDER 046 §4 / ORDER 121 §2 — detect sit / stand transitions.
      // waiting → seated startar sit (0 → 1 blendas idle → seated);
      // paying → leaving startar stand (0 → 1 blendas seated → idle).
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

      // Advance sit / stand phase (0..1). Övergången konsumeras i
      // pose-valet nedan (blendPose), inte som Y-offset.
      if (pos.sitStandDir !== 0 && pos.sitStandPhase >= 0) {
        pos.sitStandPhase += delta / SIT_STAND_DURATION_SEC;
        if (pos.sitStandPhase >= 1) {
          pos.sitStandPhase = 1;
          if (pos.sitStandDir === 1) {
            // Stand complete — back to zero (poseIdle rakt av).
            pos.sitStandDir = 0;
            pos.sitStandPhase = -1;
          }
        }
      }

      // Ease toward target at walking pace. Håll koll på om vi rörde
      // oss den här bildrutan så gångfasen bara ökar när fötterna
      // faktiskt tar steg.
      const dx = target.x - pos.cx;
      const dz = target.z - pos.cz;
      const dsq = dx * dx + dz * dz;
      const step = WALK_SPEED_M_PER_S * delta;
      let movedThisFrame = false;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        pos.cx += dx * invd * step;
        pos.cz += dz * invd * step;
        movedThisFrame = true;
      } else if (dsq > 1e-6) {
        // Sista biten — snappar till målet, räknas fortfarande som gång.
        pos.cx = target.x;
        pos.cz = target.z;
        movedThisFrame = true;
      }
      // ORDER 121 §2 — gångfas i cykler (avståndsdrivna, inte tidsdrivna).
      if (movedThisFrame) {
        pos.walkPhase += (step / STRIDE_LENGTH_M);
      }

      // ORDER 044 §3.3 lean — physical seat-attention.
      const lean = computeLeanTarget(guest, target, layout, sim.simTime);
      const leanEase = LEAN_EASE_PER_SEC * delta;
      pos.leanX += (lean.tx - pos.leanX) * Math.min(1, leanEase);
      pos.leanZ += (lean.tz - pos.leanZ) * Math.min(1, leanEase);
      pos.leanY += (lean.ty - pos.leanY) * Math.min(1, leanEase);

      // ORDER 088 §3 — pattern-driven transform. Lean, bob, microYaw
      // derived from the pattern label selected in guestPatterns.ts.
      const pattern = patternForGuest(guest, sim.simTime);
      const patternTx = computePatternTransform(
        pattern, 'guest', sim.simTime, pos.phaseSeed
      );

      // ORDER 121 §2 — hämta/skapa rig för denna gäst. Skapas när
      // gruppen finns (dvs. efter första React-render). Färg = garment
      // för state (samma palett som pucken bar).
      const group = groupRefs.current.get(guest.id);
      let rig = rigsRef.current.get(guest.id);
      if (group && !rig) {
        rig = createFigureRig({
          variant: 'guest',
          garmentColour: target.colour
        });
        group.add(rig.root);
        rigsRef.current.set(guest.id, rig);
      }

      // Group carries the ground-planted lean rotation and microYaw so
      // the rig's base stays grounded while the top tilts. Y = leanY +
      // bob (small vertical wobble from the pattern layer).
      if (group) {
        group.position.set(
          pos.cx + pos.leanX,
          pos.leanY + patternTx.bobY,
          pos.cz + pos.leanZ
        );
        group.rotation.x = patternTx.leanRad;
        group.rotation.y = patternTx.microYawRad;
      }

      if (rig) {
        // Sätt garment-färg per tick (staten skiftar över tid).
        rig.garment.color.set(target.colour);
        rig.materials.forEach((mat) => {
          mat.opacity = visibility;
          const wantTransparent = visibility < 0.99;
          if (mat.transparent !== wantTransparent) {
            mat.transparent = wantTransparent;
            mat.needsUpdate = true;
          }
        });

        // ORDER 121 §4 — pose baserad på state + rörelse.
        // Gående (arriving/leaving/declined + rörelse) → poseWalk.
        // Sittande → poseSeated, med blend under sit/stand-transition.
        // Övrigt stillastående → poseIdle.
        const t = sim.simTime + pos.phaseSeed;
        let pose: FigurePose;
        if (movedThisFrame && !SEATED_STATES.includes(guest.state)) {
          pose = poseWalk(pos.walkPhase);
        } else if (pos.sitStandDir === -1 && pos.sitStandPhase >= 0) {
          // Sätter sig — blenda idle → seated
          pose = blendPose(poseIdle(t), poseSeated(t), pos.sitStandPhase);
        } else if (pos.sitStandDir === 1 && pos.sitStandPhase >= 0) {
          // Reser sig — blenda seated → idle
          pose = blendPose(poseSeated(t), poseIdle(t), pos.sitStandPhase);
        } else if (SEATED_STATES.includes(guest.state) || guest.state === 'sleeping') {
          pose = poseSeated(t);
        } else {
          pose = poseIdle(t);
        }
        applyPose(rig, pose);
      }

      // ORDER 121 §6 — pip-ankaret flyttas från puckens topp till
      // huvudet. Läs headAnchors världsposition (efter applyPose och
      // group-uppdatering), konvertera till group-lokalt rum och sätt
      // pipens position där. Följer sit-stand och lean automatiskt.
      const pipMesh = pipRefs.current.get(guest.id);
      if (pipMesh && group && rig) {
        const isCarrier = pipCarrierGuestIds.has(guest.id);
        pipMesh.visible = isCarrier && visibility > 0.02;
        group.updateWorldMatrix(true, true);
        const anchorWorld = new THREE.Vector3();
        rig.joints.headAnchor.getWorldPosition(anchorWorld);
        const anchorLocal = group.worldToLocal(anchorWorld);
        pipMesh.position.copy(anchorLocal);
        const pMat = pipMesh.material as THREE.MeshStandardMaterial;
        if (pMat) {
          pMat.opacity = visibility;
          pMat.transparent = visibility < 0.99;
        }
      }
    }

    // Prune positions + slot assignments for guests that left the sim.
    // ORDER 121 §8 DoD 5 — dispose:a rig också, så material och
    // material-cachen inte läcker.
    for (const id of Array.from(positionsRef.current.keys())) {
      if (!idsSeen.has(id)) {
        positionsRef.current.delete(id);
        slotAssignRef.current.delete(id);
        const oldRig = rigsRef.current.get(id);
        if (oldRig) {
          disposeFigureRig(oldRig);
          rigsRef.current.delete(id);
        }
      }
    }
  });

  if (!layout) return null;

  return (
    <group ref={groupRef} visible={false}>
      {sim.guests.map((g) => (
        <group
          key={g.id}
          ref={(grp) => {
            if (grp) groupRefs.current.set(g.id, grp);
            else groupRefs.current.delete(g.id);
          }}
        >
          {/* ORDER 121 §2 — cylinder-mesh borttagen. Riggen (figureRig)
              monteras imperativt i useFrame via group.add(rig.root)
              första gången gästen ses; disposeFigureRig i prune. */}
          {/* ORDER 088 §4 — pip cube. Hidden by default; visibility
              toggled per tick from derivePipCarriers. Positionen sätts
              varje tick från rig.joints.headAnchor (ORDER 121 §6). */}
          <mesh
            ref={(m) => {
              if (m) pipRefs.current.set(g.id, m);
              else pipRefs.current.delete(g.id);
            }}
            visible={false}
            userData={{ testid: `guest-pip-${g.id}` }}
          >
            <boxGeometry args={[PIP_SIZE_M, PIP_SIZE_M, PIP_SIZE_M]} />
            <meshStandardMaterial color={PIP_COLOUR} emissive={PIP_COLOUR} emissiveIntensity={0.6} transparent opacity={0} />
          </mesh>
        </group>
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
    case 'paying':
    // ORDER 111 §4 — sleeping-gäst (värdshus) står på sin stol —
    // enkel form: samma placering som seated. Riktig rumsvisualisering
    // (sängar, etc.) hör till senare arbete med Värdshusets scen.
    case 'sleeping':
    // ORDER 115 §4.5 — eating-gäst (foodtruck-uteplats) syns aldrig
    // i restaurangens InteriorGuests-scen (foodtruck har egen
    // FoodtruckScene). Defensiv skip: samma placering som seated om
    // det mot förmodan förekommer.
    case 'eating':
    // ORDER 115 rev 2 — serving-gäst (foodtruck-överlämning) — samma
    // defensiv skip. Foodtruck-scenen har egen render-logik.
    case 'serving': {
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
