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
import { staffPositionsRef, businessRoomRef, guestPositionsRef } from './interiorSharedState';
import { computePath } from './roomNav';
import type { XZ } from './roomNav';
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

// ORDER 185 — stolens sitshöjd per CLAUDE.md Enhetskontrakt (0,45 m).
// Applied som Y-lyft på hela guest-gruppen under SEATED_STATES + sleeping,
// eftersom `poseSeated` sänker höften internt men rigg-basen (Y=0) står
// kvar på golvet. Utan lyftet hänger figuren i luften strax över golvet.
//
// ORDER 200 §3.1 — ingen fallback-konstant längre. Den tidigare
// `SEAT_SIT_HEIGHT_FALLBACK_M = 0.45` var restaurangens CHAIR_HEIGHT
// smuget in i ölkrogen (fjärde gången samma familj efter walkPathToSeat,
// staffHomes, queueSlots). Om `seatHeightsForFrame[seatIndex]` inte finns
// tillgänglig → `sitLift = 0`, gästen renderas som halvcrouchad på golvet.
// Det är ett synligt fynd, inte en tyst kompromiss.
//
// ORDER 202 §1 — reverterade ORDER 201:s plinth-formel. Formeln
// (plinth + seatHeight + cushion − hip) gav pelvis vid cushion top för
// chair-kombinationen 0.45+0.11+0.025−0.445=0.14m, men BRÖT den
// visuellt LÖSTA stool-observationen från ORDER 200 (pelvis 1.19 m
// nära bar counter 1.21 m läste som "lutar mot baren"). Rot-orsaken
// för långborden är inte rig-matten — enligt VO-direktiv
// 2026-09-10 kl. 14:00: "Fråga Design: har långborden bänkar som inte
// renderas? seatY 0,45 m antyder en sittyta som saknas i geometrin.
// Antingen ritas bänkarna eller så ska seatY ändras — men det är
// deras rum." Se `documentation/blueprints/ROOM_DESIGN_QUESTION_2026-09-10.md`.
// Tills Design svarar behåller vi ORDER 200-formen: `sitLift = seatHeight`.

// ORDER 200 §3.1 — DEV-only-warning en gång per kod-väg som saknar
// seatHeights. Använder en modul-lokal Set så samma väg inte spammar
// konsolen. Nyckel = businessClass så VO ser vilken klass som fallerar.
const NO_SEAT_HEIGHTS_WARNED = new Set<string>();

// ORDER 203 — samma mönster för waitingSlots-fallback.
const NO_WAITING_SLOTS_WARNED = new Set<string>();

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
// ORDER 197 §2 — avstånd från seat där sit-blend triggas positionellt.
// Vid WALK_SPEED_M_PER_S × SIT_STAND_DURATION_SEC = 0,6 m tar promenaden
// samma tid som blenden — blenden slutförs exakt när gästen når stolen.
// Utan denna avstämning blev det antingen "sitter innan hen når stolen"
// (för lång threshold) eller "står tills stolen och snappar sedan"
// (för kort threshold).
const SEAT_ARRIVAL_THRESHOLD_M = 0.6;

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
  // ORDER 127 §5-beslut — dining/paying justeras uppåt för att passa
  // mot ölkrogens `floorDining #a49b8a` (kontrast MIN 1.8). Val: JUSTERA
  // färgen, inte acceptera avvikelse. Skäl: bandet är valt medvetet i
  // silhouetteContrast.ts, och en 0.06-avvikelse som saknar behandling
  // blir en glömd avvikelse (ORDER 127 §5). Progression seated → paying
  // är fortfarande läsbar via nyansskiften även om ljushetsintervallet
  // krymper — WCAG-kontrasten är kontraktet, inte den narrativa gradienten.
  dining: '#edcfa4',   // was #ebcda2 — nudge upp (L 0.639 → 0.647)
  paying: '#edd0a3',   // was #e8c99e — nudge upp (L 0.612 → 0.659)
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
  // ORDER 197 §2 — yaw i rörelseriktning under promenad (atan2(dx,dz)).
  // Uppdateras varje frame när `movedThisFrame` är sant. Används både
  // som base-yaw under gång och som `blendStartYaw` vid sit-blend-
  // avfyring. Utan detta står gästen med microYaw-jitter men "tittar"
  // åt fel håll under promenaden.
  walkYaw: number;
  // ORDER 197 §3.2 — yaw vid sit-blend-avfyring. Interpoleras mot
  // seatFacing under sitStandPhase 0→1 så gästen svänger in mot bordet
  // i takt med att hen sätter sig. Utan detta snappar yaw från
  // rörelseriktning till seatFacing på ett enda frame när sit-blend
  // fyras — samma sorts fel som teleport-i-sittställning-poserna.
  blendStartYaw: number;
  // ORDER 220 §1 — sant om gästen faktiskt tog ett steg under senaste
  // renderade frame. Läses av publiceringsloopen längre ner för att
  // sätta SharedGuestPos.moving; InteriorStaff behöver flaggan för att
  // veta om trail-offset (värd bakom gäst under gång) ska aktiveras
  // eller inte (stilla gäst → värd närmar sig direkt, ingen offset).
  movedLastFrame: boolean;
  // ORDER 221 §2.3+§2.4 — cachad nav-path för gästens nuvarande target.
  // Samma pattern som staff (InteriorStaff.tsx:navPath). Recomputas när
  // navTargetKey ändras (rundad state+seatIndex-nyckel). Gäster följer
  // waypoints via `navPathIdx`; sista waypoint är target-positionen så
  // ease-loopen får identiskt slutbeteende som pre-221.
  navPath: XZ[] | null;
  navTargetKey: string;
  navPathIdx: number;
}

// ORDER 188 tillägg 1 — sitYaw-warning en gång per (klass, seatIndex)
// när kontraktet saknar facing för platsen. Data-fel i rumsfilen, inte
// runtime-varning per frame — loggar bara första förekomst.
const _sitYawWarned = new Set<string>();
function warnMissingSitYaw(businessClass: string, seatIndex: number): void {
  const key = `${businessClass}:${seatIndex}`;
  if (_sitYawWarned.has(key)) return;
  _sitYawWarned.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[ORDER 188] sitYaw saknas för seat ${seatIndex} i ${businessClass} — ` +
    `rumsfilen bör sätta facing per RoomSeat (kontrollera brewpubRoom.ts / ` +
    `restaurantRoom.ts). Fallback: microYaw only.`
  );
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

// ORDER 185 — deterministisk raw-hash 0..255 per guest id, används för
// garment-variant-väljaren nedan. Samma FNV-1a-familj som `phaseSeedFor`.
function guestIdByte(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) & 0xff;
}

// ORDER 185 — garment-varianter för sittande gäster. En enda GUEST_COLOUR
// per state gav alla gäster identisk färg (Vision Owner observation
// 2026-09-06 från key=5-vyn). Fyra varianter per state, kalibrerade att
// hålla sig inom ORDER 127 §5:s silhouette-kontrast-band mot ölkrogens
// floorDining `#a49b8a` — hue-variationen läses som olika människor men
// luminance-nyckeln (≈ 0.65) bibehålls så bandet inte bryts.
//
// Icke-sittande stater (arriving/waiting/leaving/declined) behåller
// state-driven färg per `GUEST_COLOUR` för att signalen "gäst på väg in
// / ut" ska läsas tydligt utan att drunkna i garment-variation.
const GARMENT_VARIANTS: Record<'seated' | 'ordering' | 'dining' | 'paying' | 'sleeping', readonly string[]> = {
  // Base #ecd2a0 → 3 hue-nudges i varmt band, samma luminance-nyckel.
  seated:   ['#ecd2a0', '#e8d2a8', '#efd398', '#e6cea3'],
  // Base #edd0a4 → samma pattern, marginellt kallare för state-progression.
  ordering: ['#edd0a4', '#e9d0ac', '#f0d19b', '#e8ccaa'],
  // Base #edcfa4 (nudge upp per ORDER 127 §5).
  dining:   ['#edcfa4', '#e9cfab', '#f0d09c', '#e8cba9'],
  // Base #edd0a3 (nudge upp per ORDER 127 §5).
  paying:   ['#edd0a3', '#e9d0aa', '#f0d19c', '#e8cba9'],
  // Base #c4ac7d (ORDER 111 §4 — mörkare dovare).
  sleeping: ['#c4ac7d', '#c0ac82', '#c8ab78', '#bfa984']
};

function garmentColourFor(guest: Guest): string {
  const state = guest.state;
  const table = GARMENT_VARIANTS[state as keyof typeof GARMENT_VARIANTS];
  if (!table) return GUEST_COLOUR[state];
  const byte = guestIdByte(guest.id);
  return table[byte % table.length];
}

export function InteriorGuests() {
  // ORDER 174 — sim.businessClass in i interiorLayout så kontrakt-seats
  // vinner över restaurangens 16-stols-default för alla klasser.
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);

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

  // ORDER 150 — dev-only exponering av positionsRef så playwright kan
  // läsa faktiska renderade gästpositioner (cx/cz) per id. Refens
  // identitet är stabil, .current-Map:en muteras in place.
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as unknown as { __nxGuestPositions?: unknown }).__nxGuestPositions =
        positionsRef.current;
      // ORDER 193 — dev-only rigg-inspektion. Skriver ut varje gästs
      // faktiskt applicerade led-rotationer i världskoordinater så
      // pose-verifiering kan läsa direkt ur DOM utan att gissa vad
      // applyPose gjorde. Registret uppdateras per bildruta i useFrame
      // via write below; refens identitet är stabil.
      (window as unknown as { __nxRigDebug?: unknown }).__nxRigDebug =
        rigsRef.current;
    }
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

    // ORDER 150 — välj seat-källa per tick. businessRoomRef bär
    // rummets faktiska platser i värld-XZ när scenen (RestaurantScene
    // / BrewpubScene / …) har monterat sitt kontraktsrum. Matchar den
    // aktuell klass använder vi den; annars faller vi tillbaka på
    // layout.seats (restaurantsspecifik) så äldre kod inte tystnar.
    const roomChan = businessRoomRef.current;
    const usingContract =
      roomChan != null &&
      roomChan.businessClass === sim.businessClass &&
      roomChan.seats.length > 0;
    const seatsForFrame: SlotXZ[] = usingContract ? roomChan!.seats : layout.seats;
    // ORDER 186 fynd 2 — facings i samma index-ordning som seatsForFrame.
    // Null när kontraktet saknas (layout.seats-fallback bär inte facing).
    const seatFacingsForFrame: readonly number[] | null = usingContract
      ? roomChan!.seatFacings ?? null
      : null;
    // ORDER 200 fynd 1 + §3.1 — sitshöjd per plats. Null utan kontrakt;
    // consumern nedan använder då `targetSitLift = 0` (loud finding via
    // console.warn i DEV) i stället för att gissa 0.45.
    const seatHeightsForFrame: readonly number[] | null = usingContract
      ? roomChan!.seatHeights ?? null
      : null;
    // ORDER 201 fynd 1 — sockelns tjocklek per klass publicerad. INTE
    // konsumerad av sitLift efter ORDER 202 §1-revert (bänk-vs-stol
    // frågan hos Design). Fältet stannar kvar för framtida användning
    // (mep-prop-plinth, bordslampa, etc.).
    void (usingContract ? roomChan!.plinth : null);
    // ORDER 203 — kön framför entrén, per klass från kontraktet. Tomt
    // array (contract publicerar inga slots) faller tillbaka på
    // `layout.waitingSlots` med DEV-warning. Fallback-warning per klass
    // (samma pattern som seatHeights/plinth i §3.1) så VO ser om ett
    // rum aldrig publicerar sin egen queue-form.
    let waitingSlotsForFrame: readonly SlotXZ[];
    if (usingContract && roomChan!.waitingSlots.length > 0) {
      waitingSlotsForFrame = roomChan!.waitingSlots;
    } else {
      waitingSlotsForFrame = layout.waitingSlots;
      if (
        import.meta.env.DEV &&
        !NO_WAITING_SLOTS_WARNED.has(sim.businessClass)
      ) {
        NO_WAITING_SLOTS_WARNED.add(sim.businessClass);
        console.warn(
          `[ORDER 203] waitingSlots saknas i kontraktet för businessClass="${sim.businessClass}". ` +
          `Fallback till layout.waitingSlots (OBB-generisk 2×4-form). ` +
          `Publicera egen queue-form via *Scene → SharedBusinessRoom.waitingSlots.`
        );
      }
    }
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // Dev-observation för playwright — vilken källa och vilken
      // längd som råder just nu. Sätts varje frame utan overhead
      // (två fältskrivningar mot window).
      const w = window as unknown as { __nxSeatSource?: string; __nxSeatSourceLength?: number };
      w.__nxSeatSource = usingContract ? 'businessRoomContract' : 'interiorLayoutFallback';
      w.__nxSeatSourceLength = seatsForFrame.length;
    }

    // Compute per-guest target for this frame.
    const idsSeen = new Set<string>();
    for (const guest of sim.guests) {
      idsSeen.add(guest.id);
      let slots = slotAssignRef.current.get(guest.id);
      if (!slots) {
        slots = {
          arrival: slotCounterRef.current.arrival++ % layout.arrivalSlots.length,
          // ORDER 203 — mod:a mot kontraktets kö-längd om det finns,
          // annars layout-fallback. Slot-tilldelningen hänger inte
          // efter ID-tilldelning-tid; targetFor:s slot-lookup gör en
          // andra modulo för säkerhets skull om kontraktet växer/krymper.
          waiting: slotCounterRef.current.waiting++ % waitingSlotsForFrame.length,
          declined: slotCounterRef.current.declined++ % layout.declinedSlots.length
        };
        slotAssignRef.current.set(guest.id, slots);
      }
      const target = targetFor(guest, slots, layout, spawnPoints, seatsForFrame, waitingSlotsForFrame);
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
          walkPhase: 0,
          walkYaw: 0,
          blendStartYaw: 0,
          movedLastFrame: false,
          navPath: null,
          navTargetKey: '',
          navPathIdx: -1
        };
        positionsRef.current.set(guest.id, pos);
      }

      // ORDER 046 §4 / ORDER 121 §2 — detect sit / stand transitions.
      // ORDER 197 §2 — sit-blend (waiting → seated) triggas ENDAST
      // positionellt när gästen når inom SEAT_ARRIVAL_THRESHOLD_M från
      // seat (koden strax nedanför). State-transition-triggern hade två
      // fel: (1) första-frames vid state='seated' (t.ex. vid sim-speed >
      // 1 där arriving→waiting→seated händer mellan render-frames) fick
      // pos.prevState=null och triggern eldade aldrig — gästen fastnade
      // i poseSeated + sitLift under hela vägen från spawn till stol
      // (VO-observation 2026-09-09: "gäster teleporteras till sin plats
      // redan i sittställning"); (2) även när triggern eldade normalt
      // vid waiting → seated var gästen fortfarande vid waiting-slot
      // 2.5–5.2m utanför entrén, så sit-blend startade långt före
      // gästen nådde stolen och blenden slutförde långt före
      // promenaden var klar → sista 2-3m av promenaden gjordes i
      // seated pose. Positional trigger löser båda: blend startar när
      // det matchar med resten av rörelsen.
      //
      // Stand-blend (paying → leaving) behåller state-transition-
      // triggern eftersom `paying` alltid är en fullt renderad state
      // före `leaving` (ingen genomgång bara mellan frames).
      if (pos.prevState !== null && pos.prevState !== guest.state) {
        if (pos.prevState === 'paying' && guest.state === 'leaving') {
          pos.sitStandPhase = 0;
          pos.sitStandDir = 1;
          pos.blendStartYaw = pos.walkYaw;
        }
      }
      pos.prevState = guest.state;

      // ORDER 197 §2 — positional sit-blend trigger. Fires when guest
      // reaches within SEAT_ARRIVAL_THRESHOLD_M of seat while state is
      // in SEATED_STATES and no sit-blend has fired yet. Threshold 0.6m
      // matches walk-speed × SIT_STAND_DURATION (1.2 m/s × 0.5s = 0.6m)
      // så promenaden och blenden slutförs samtidigt vid stolen.
      if (
        SEATED_STATES.includes(guest.state) &&
        pos.sitStandDir === 0 &&
        pos.sitStandPhase < 0
      ) {
        const seatIdx = guest.seatIndex ?? -1;
        if (seatIdx >= 0 && seatIdx < seatsForFrame.length) {
          const dToSeat = Math.hypot(
            pos.cx - seatsForFrame[seatIdx][0],
            pos.cz - seatsForFrame[seatIdx][1]
          );
          if (dToSeat < SEAT_ARRIVAL_THRESHOLD_M) {
            pos.sitStandPhase = 0;
            pos.sitStandDir = -1;
            pos.blendStartYaw = pos.walkYaw;
          }
        }
      }

      // ORDER 209 — LATE-STATE SNAP. VO-inspelning 2026-09-11 16:45,
      // femte inspelningen med samma mönster: "sim säger fullt, rummet
      // är tomt". Diagnostik (order209-diagnostic.mjs @ simTime=233s):
      // 8/8 seated-family-gäster med `dir=0 phase=-1` (sit-blend aldrig
      // fyrat) och distToSeat 7-15 m. Rot-orsak: sim.tickGuests
      // transitionerar 'seated' → 'ordering' efter bara 4 sim-sek
      // (service.ts:391) medan render-walken vid 1.2 m/s täcker bara
      // 4.8 m under den tiden. Från arrival-arc (12-15 m från seat) är
      // det omöjligt att hinna fram innan sim går vidare. Sim ligger
      // sedan i 'dining' i 30+ sim-sek medan render står stilla mellan
      // spawnpunkten och seat.
      //
      // ORDER 197 sade "walk-in, teleportera inte" för state='seated'.
      // Den regeln bevaras: så länge state är EXAKT 'seated', gå. Men
      // när state redan passerat till 'ordering'/'dining'/'paying'/
      // 'sleeping' är fasen "har suttit ett tag" — då är det värre att
      // rendera en gäst som stapplar 15 m från sin stol än att snappa
      // fram. Gränsen 1.5 m fångar "har inte hunnit fram" utan att
      // trigga för mikro-jitter kring en gäst som redan sitter.
      const LATE_SEATED_STATES: readonly string[] = ['ordering', 'dining', 'paying', 'sleeping'];
      if (
        LATE_SEATED_STATES.includes(guest.state) &&
        pos.sitStandDir === 0 &&
        pos.sitStandPhase < 0
      ) {
        const seatIdx = guest.seatIndex ?? -1;
        if (seatIdx >= 0 && seatIdx < seatsForFrame.length) {
          const [seatX, seatZ] = seatsForFrame[seatIdx];
          const dToSeat = Math.hypot(pos.cx - seatX, pos.cz - seatZ);
          if (dToSeat > 1.5) {
            const seatYaw = seatFacingsForFrame?.[seatIdx] ?? 0;
            pos.cx = seatX;
            pos.cz = seatZ;
            pos.sitStandPhase = 1;
            pos.sitStandDir = -1;
            pos.walkYaw = seatYaw;
            pos.blendStartYaw = seatYaw;
          }
        }
      }

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
      // ORDER 186 fynd 4 — waypoint via entrance. När en gäst just
      // övergått till sittande (waiting → seated) linjär-interpolerade
      // vi tidigare direkt från waiting-slot (utanför byggnaden) till
      // seat (inuti). Gästen flög rakt genom väggen. Fix: när gästen
      // är seated MEN fortfarande utanför byggnadens footprint, sätt
      // effektivt mål till entrance-punkten. När vi hunnit fram till
      // (< 0,8 m från) entrance, byt tillbaka till seat-target.
      // Byggnadens footprint approximeras av OBB half-width — inte
      // exakt polygon, men tillräckligt konservativ för att undvika
      // vägg-passager i praktiken.
      let effTargetX = target.x;
      let effTargetZ = target.z;
      const seated = SEATED_STATES.includes(guest.state);

      // ORDER 221 §2.3+§2.4 — nav-route för gäster mot INTERIÖRA mål.
      // Samma system som staff (InteriorStaff.tsx). Aktiveras när
      // gästens sluttarget ligger inuti byggnadens OBB (dvs. seated-
      // states — arriving/waiting/leaving ligger utanför). Utan nav:
      // gästen rusade rakt genom bardisk / bord / bryggkar från arrival
      // slot till seat — VO 2026-09-16 "Rummet går att gå i".
      //
      // Cache per (state, seatIndex) — target-punkten är statisk per
      // seat, så nav-anropet kör en gång per gäst-sittning i st f varje
      // frame. När guest byter state (arriving → seated) blir nyckeln
      // ny och path räknas om.
      const roomChanForNav = businessRoomRef.current;
      const nav = roomChanForNav?.nav ?? null;
      const worldToLocal = roomChanForNav?.worldToLocalXZ ?? null;
      const localToWorld = roomChanForNav?.localToWorldXZ ?? null;
      if (nav && worldToLocal && localToWorld && seated) {
        const key = `${guest.state}:${guest.seatIndex ?? -1}`;
        if (pos.navTargetKey !== key || !pos.navPath) {
          const fromLocal = worldToLocal([pos.cx, pos.cz]);
          const toLocal = worldToLocal([target.x, target.z]);
          const localPath = computePath(nav, fromLocal, toLocal);
          if (localPath && localPath.length > 1) {
            pos.navPath = localPath.map((p) => localToWorld(p));
          } else {
            pos.navPath = null;
          }
          pos.navTargetKey = key;
          pos.navPathIdx = 0;
        }
        if (pos.navPath && pos.navPath.length > 1) {
          // Följ pathen — sista waypoint är target. Avancera när nära
          // aktuell waypoint (< 0.5 m). Effektivt mål = aktuell waypoint.
          const wp = pos.navPath[pos.navPathIdx];
          const wdx = wp[0] - pos.cx;
          const wdz = wp[1] - pos.cz;
          if (wdx * wdx + wdz * wdz < 0.5 * 0.5 && pos.navPathIdx < pos.navPath.length - 1) {
            pos.navPathIdx += 1;
          }
          effTargetX = pos.navPath[pos.navPathIdx][0];
          effTargetZ = pos.navPath[pos.navPathIdx][1];
        }
      } else {
        // Gäst i non-seated state → släpp cachad nav-path så nästa
        // seated-transition startar rent.
        pos.navPath = null;
        pos.navTargetKey = '';
        pos.navPathIdx = -1;
      }

      if (seated && !pos.navPath) {
        // ORDER 190 fynd 3 — waypoint släpper när gästen är nära seat.
        // Före ORDER 190 kunde waypoint hålla kvar en gäst vid entrance-
        // jittern trots att seat-positionen redan var nådd — VO fynd
        // 2026-09-07 "gäst står bredvid stolen, inte på". Släpp release
        // vid distToSeat < 1.5 m så final approach går direkt till seat
        // utan att waypoint tar över igen från jitter-oscillation.
        const seatIdx = guest.seatIndex ?? -1;
        const distToSeat =
          seatIdx >= 0 && seatIdx < seatsForFrame.length
            ? Math.hypot(pos.cx - seatsForFrame[seatIdx][0], pos.cz - seatsForFrame[seatIdx][1])
            : Infinity;
        const halfW = layout.width / 2;
        const [cx0, cz0] = layout.centre;
        const dxFromCentre = pos.cx - cx0;
        const dzFromCentre = pos.cz - cz0;
        const distFromCentre = Math.hypot(dxFromCentre, dzFromCentre);
        if (distFromCentre > halfW * 1.02 && distToSeat > 1.5) {
          // ORDER 200 fynd 2/4 — waypoint till entrén, ingen jitter.
          //
          // Före ORDER 200: entrance-jitter (±1.8 m per sin/cos av
          // phaseSeed, kommenterad som "ORDER 188 fynd 2 — kön ska ha
          // egna platser"). Bugen: release-villkoret mätte `distToEntrance`
          // mot RÅ entrance, inte mot jittered target. Jitter-magnituden
          // är alltid `sqrt(sin²+cos²) * 1.8 = 1.8 m`, alltid > 0.8 m-
          // tröskeln → waypoint fyras varje frame → target = samma
          // jittered position → dsq=0 → gäst STÅR STILL för alltid 1.8 m
          // utanför entrén. Diagnostiken 2026-09-10 visade 5-10 gäster
          // fastnade utanför OBB, aldrig nådde seat, sit-blend fyrade
          // aldrig — grund för fynd 2 (gäst på gräset) + fynd 4 (16 seated
          // men bara 6 syns; de 10 klumpade utanför nordväggen bortom
          // kamera-FOV).
          //
          // ORDER 188:s "kluster vid entrance" gällde WAITING-gäster
          // (som placeras via `layout.waitingSlots` — redan distincta
          // platser). Jitter i seated-branchen var missriktad; SEATED-
          // gäster går IGENOM entrén, inte queue:ar där. Rakt genom
          // entrance-punkten är rätt — ingen kluster, gästerna är på
          // väg in.
          effTargetX = layout.entrance[0];
          effTargetZ = layout.entrance[1];
        }
      }
      const dx = effTargetX - pos.cx;
      const dz = effTargetZ - pos.cz;
      const dsq = dx * dx + dz * dz;
      const step = WALK_SPEED_M_PER_S * delta;
      let movedThisFrame = false;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        pos.cx += dx * invd * step;
        pos.cz += dz * invd * step;
        movedThisFrame = true;
      } else if (dsq > 1e-6) {
        // Sista biten — snappar till effektiva målet (entrance-waypoint
        // eller seat), räknas fortfarande som gång.
        pos.cx = effTargetX;
        pos.cz = effTargetZ;
        movedThisFrame = true;
      }
      // ORDER 121 §2 — gångfas i cykler (avståndsdrivna, inte tidsdrivna).
      if (movedThisFrame) {
        pos.walkPhase += (step / STRIDE_LENGTH_M);
        // ORDER 197 §2 — uppdatera walkYaw ur rörelseriktningen. THREE:s
        // yaw-konvention: rotation.y = 0 ger objektets +Z-axel i världens
        // +Z, så för rörelsevektor (dx, dz) blir yaw = atan2(dx, dz).
        // Uppdateras endast när `movedThisFrame` för att undvika
        // NaN-atan2 på nollvektor; senast beräknade värde behålls när
        // gästen står still (så sit-blend-triggeringen får en meningsfull
        // blendStartYaw även på frame där rörelsen just stannade).
        pos.walkYaw = Math.atan2(dx, dz);
      }
      // ORDER 220 §1 — spara gångstate för publicerings-loopen.
      pos.movedLastFrame = movedThisFrame;

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
      // the rig's base stays grounded while the top tilts. Y = seat sit
      // lift + leanY + bob (small vertical wobble from the pattern layer).
      //
      // ORDER 185 — sittande gäster måste lyftas till stolens sitshöjd.
      // `poseSeated` sänker höften 0,41 m internt; utan Y-lyft hänger
      // fötterna ner under golv-nivån och figuren ser ut att "halvsitta
      // ovanpå golvet". Under sit/stand-transition (0..1) skalas lyftet
      // linjärt så pose-blenden och Y-positionen möts vid sit-slutläget.
      //
      // ORDER 200 fynd 1 + §3.1 — sitshöjd per plats från kontraktet.
      // `targetSitLift` är Y-lyftet för guest-gruppen. ORDER 202 §1
      // reverterade ORDER 201:s plinth+cushion-formel — långbords-
      // fyndet är Design-frågan (bänk-vs-stol), inte rig-matten. Här
      // används rå seatHeight per ORDER 200-vägen; stolar och stools
      // får samma delta som pre-ORDER 201 (chair 0.45, stool 0.75).
      let targetSitLift = 0;
      if (
        guest.seatIndex !== null &&
        guest.seatIndex !== undefined &&
        guest.seatIndex >= 0 &&
        seatHeightsForFrame &&
        guest.seatIndex < seatHeightsForFrame.length
      ) {
        targetSitLift = seatHeightsForFrame[guest.seatIndex];
      } else if (
        import.meta.env.DEV &&
        SEATED_STATES.includes(guest.state) &&
        !NO_SEAT_HEIGHTS_WARNED.has(sim.businessClass)
      ) {
        NO_SEAT_HEIGHTS_WARNED.add(sim.businessClass);
        // Loud finding i konsolen — inget silent 0.45. Nyckeln per klass
        // så VO ser vilken klass som fallerar och när.
        console.warn(
          `[ORDER 200 §3.1] seatHeights saknas för businessClass="${sim.businessClass}" (guestId=${guest.id}, seatIndex=${guest.seatIndex}). ` +
          `sitLift=0 → gäster visuellt halvcrouchade. Kontraktet ska publicera SharedBusinessRoom.seatHeights via *Scene-komponenten.`
        );
      }

      let sitLift = 0;
      // ORDER 197 §2 — "statiskt sittande utan transition" är efter sit-
      // blend har nått phase=1 (dir stannar -1). SEATED_STATES UTAN
      // sit-blend-signal betyder gäst är på väg till stolen (state
      // skiftade till seated men positional trigger har inte eldat än)
      // — då noll lyft, gästen går som en person på golvet.
      // ORDER 201 fynd 1 — `targetSitLift` är delta över plinth-nivån
      // (kan vara ~0.14 m för chair, ~0.44 m för stool). Fasen skalar
      // mellan poseIdle (rig root på plinth, ingen lift) och poseSeated
      // (rig root vid targetSitLift). Vid dir=-1, phase=1 håller lyftet.
      if (pos.sitStandPhase >= 0 && pos.sitStandDir === -1) {
        // Sitter ner: lyft eases in med samma phase som pose-blenden
        sitLift = targetSitLift * pos.sitStandPhase;
      } else if (pos.sitStandPhase >= 0 && pos.sitStandDir === 1) {
        // Reser sig: lyft eases ut
        sitLift = targetSitLift * (1 - pos.sitStandPhase);
      }
      if (group) {
        group.position.set(
          pos.cx + pos.leanX,
          sitLift + pos.leanY + patternTx.bobY,
          pos.cz + pos.leanZ
        );
        group.rotation.x = patternTx.leanRad;
        // ORDER 186 fynd 2 — sittande gäster orienterar sig mot bordet via
        // RoomSeat.facing (världs-koordinater, satt av resolveWorldPositions
        // och skickad in via businessRoomRef.seatFacings). Rörliga gäster
        // (arriving/waiting/leaving/declined) behåller mikro-yaw-jitter för
        // liv i puck-populationen. Utan seat-facing hade sittande gäster
        // ryggen mot bordet — Vision Owner fynd 2, 2026-09-07.
        const idx = guest.seatIndex ?? -1;
        const seated =
          SEATED_STATES.includes(guest.state) || guest.state === 'sleeping';
        // ORDER 197 §3.2 — yaw ska interpoleras, inte snappa. Tre lägen:
        //   (a) sit-blend pågår (dir=-1, phase 0→1): interpolera från
        //       walkYaw (rörelsens riktning vid trigger, sparad i
        //       blendStartYaw) mot seatFacing. Fasen matchar sit-lift
        //       och pose-blend så gästen svänger in mot bordet i takt
        //       med att hen sätter sig.
        //   (b) stand-blend pågår (dir=+1, phase 0→1): motsatta riktning
        //       — från seatFacing (blendStartYaw sattes vid trigger)
        //       mot walkYaw. Följdriktig avresa.
        //   (c) fullt sittande (dir=-1 phase>=1): seatFacing + microYaw.
        //   (d) övrigt (går, står): walkYaw + microYaw.
        // Utan (a) snappade yaw från rörelseriktning till seatFacing på
        // ett enda frame när sit-blend fyras — VO-observation samma
        // familj som teleportering-i-sittställning.
        const seatFacing =
          seated &&
          seatFacingsForFrame !== null &&
          idx >= 0 &&
          idx < seatFacingsForFrame.length
            ? seatFacingsForFrame[idx]
            : undefined;
        if (seatFacing !== undefined && Number.isNaN(seatFacing)) {
          warnMissingSitYaw(sim.businessClass ?? 'okänd', idx);
        }
        const validSeatFacing =
          seatFacing !== undefined && !Number.isNaN(seatFacing)
            ? seatFacing
            : null;
        // Modular-π-delta så interpolationen tar kortaste vägen (undviker
        // ~2π-snurr när blendStartYaw och seatFacing ligger på var sin
        // sida om ±π-vändningen).
        const interpAngle = (from: number, to: number, phase: number): number => {
          const rawDelta = to - from;
          const delta = ((rawDelta + Math.PI) % (2 * Math.PI)) - Math.PI;
          return from + delta * phase;
        };
        let baseYaw: number;
        if (
          pos.sitStandDir === -1 &&
          pos.sitStandPhase >= 0 &&
          pos.sitStandPhase < 1 &&
          validSeatFacing !== null
        ) {
          baseYaw = interpAngle(pos.blendStartYaw, validSeatFacing, pos.sitStandPhase);
        } else if (
          pos.sitStandDir === 1 &&
          pos.sitStandPhase >= 0 &&
          pos.sitStandPhase < 1
        ) {
          baseYaw = interpAngle(pos.blendStartYaw, pos.walkYaw, pos.sitStandPhase);
        } else if (
          pos.sitStandDir === -1 &&
          pos.sitStandPhase >= 1 &&
          validSeatFacing !== null
        ) {
          baseYaw = validSeatFacing;
        } else {
          baseYaw = pos.walkYaw;
        }
        group.rotation.y = baseYaw + patternTx.microYawRad;
      }

      if (rig) {
        // Sätt garment-färg per tick (staten skiftar över tid).
        // ORDER 185 — sittande stater använder `garmentColourFor` som
        // ger en av fyra varianter per guest id (hash-baserat) inom
        // ORDER 127 §5:s kontrastband. Icke-sittande stater faller
        // tillbaka på state-driven `target.colour` för läsbarhet i
        // rörliga puckar (arriving/waiting/leaving/declined).
        const garmentColour = SEATED_STATES.includes(guest.state) || guest.state === 'sleeping'
          ? garmentColourFor(guest)
          : target.colour;
        rig.garment.color.set(garmentColour);
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
        //
        // ORDER 186 fynd 1 — state-check FÖRE movement-check. Före ORDER 186
        // vann `movedThisFrame` över SEATED_STATES i första grenen, så en
        // sittande gäst vars XZ jitter:ade över move-tröskeln (från
        // lean-easing eller pattern-bob) flippade till poseWalk för ett
        // frame → tillbaka till poseSeated nästa → osv. Läste som "sittande
        // gäst med raka ben som växlar mellan böjd och rak". Fix: när
        // guest.state är i SEATED_STATES (eller sleeping) och ingen sit/
        // stand-transition pågår, force poseSeated oavsett jitter. Motion
        // pose bara för gäster som INTE är i seated-state.
        const t = sim.simTime + pos.phaseSeed;
        let pose: FigurePose;
        // ORDER 197 §2 — pose-fallback:en "SEATED_STATES → poseSeated"
        // körde över rörelsen: en gäst vars state var 'seated' men som
        // fortfarande promenerade in mot stolen (positional sit-blend
        // hade inte eldat än) fick seated pose under hela promenaden.
        // Fix: pose följer sit-blend-signalen, inte guest.state. När
        // ingen blend pågår och state är seated betyder det antingen
        // (a) på väg till stolen (går, movedThisFrame=true) → poseWalk;
        // (b) blend redan slutförd (dir=-1, phase=1) → poseSeated.
        if (pos.sitStandDir === -1 && pos.sitStandPhase >= 0 && pos.sitStandPhase < 1) {
          pose = blendPose(poseIdle(t), poseSeated(t), pos.sitStandPhase);
        } else if (pos.sitStandDir === 1 && pos.sitStandPhase >= 0 && pos.sitStandPhase < 1) {
          pose = blendPose(poseSeated(t), poseIdle(t), pos.sitStandPhase);
        } else if (pos.sitStandDir === -1 && pos.sitStandPhase >= 1) {
          // Blend slutförd — fullt sittande.
          pose = poseSeated(t);
        } else if (guest.state === 'sleeping') {
          // Sleeping är alltid sittande (värdshus-övernattning).
          pose = poseSeated(t);
        } else if (movedThisFrame) {
          pose = poseWalk(pos.walkPhase);
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
    // ORDER 200 fynd 3 — synka guestPositionsRef med InteriorGuests
    // egen positionsRef (render-lager, värld-XZ). InteriorStaff läser
    // detta i stället för sim.guest.position (lokal frame). Overwrite
    // istället för incremental för att undvika stale entries när
    // pruning-loopen just tog bort id:n ovan.
    guestPositionsRef.current.clear();
    for (const [id, gp] of positionsRef.current) {
      // ORDER 220 §1 — publicera walkYaw + movedLastFrame så InteriorStaff
      // kan lägga värden BAKOM gästen längs hens gångriktning (trail-offset)
      // i stället för att sätta target = guest.position (som ger parallell
      // väg när värd och gäst startar från olika platser). När gästen står
      // still släpps offseten och värden går fram och stannar bredvid.
      guestPositionsRef.current.set(id, {
        x: gp.cx,
        z: gp.cz,
        yaw: gp.walkYaw,
        moving: gp.movedLastFrame
      });
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
  spawnPoints: SlotXZ[],
  // ORDER 150 — seats kommer nu utifrån (fältet i layout är
  // restaurantsspecifikt när klassen är ölkrogen / gästgiveriet /
  // nattklubben). Kallaren väljer källan: businessRoomRef.seats när
  // ett kontraktsrum är monterat för sim.businessClass, annars
  // layout.seats som fallback.
  seats: SlotXZ[],
  // ORDER 203 — samma pattern som `seats`: kön kommer nu utifrån.
  // Kallaren väljer källan (roomChan.waitingSlots eller fallback).
  waitingSlots: readonly SlotXZ[]
): GuestTarget {
  const colour = GUEST_COLOUR[guest.state];
  const { arrivalSlots, declinedSlots } = layout;
  switch (guest.state) {
    case 'arriving': {
      const [x, z] = arrivalSlots[slots.arrival];
      return { x, z, colour };
    }
    case 'waiting': {
      const [x, z] = waitingSlots[slots.waiting % waitingSlots.length];
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
