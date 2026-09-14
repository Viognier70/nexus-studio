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
// Roles → stations (ORDER 154 — Vision Owner-mappningstabellen).
// Primärkälla: `businessRoomRef.current.staffStationsByRole` som
// scenerna publicerar via `stationFor(role, room)` i businessRoom.ts.
// Fallback (för klasser vars scen ej monterat ännu, eller när ref
// saknas): den restaurangsspecifika `computeStations(layout)` här —
// bevarad så äldre kod inte tystnar innan alla klasser har scener.
//
// Roll-mappningen är kontraktets ansvar per klass, inte renderarens.
// Se STATION_MAP i businessRoom.ts för de 24 cellerna. Renderaren
// hanterar bara två specialfall: (1) null-cell → fallback via
// layoutens beräkning; (2) ref saknad → samma fallback.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useSimState } from '../simulation/SimulationProvider';
import { COVERS_PER_MEMBER } from '../simulation/team';
import type { StaffRole, TeamMember } from '../types';
import { staffPositionsRef, staffPosesRef, businessRoomRef, guestPositionsRef } from './interiorSharedState';
import type { SharedStaffPose, SharedBusinessRoom } from './interiorSharedState';
import type { TaskType } from '../types';

// ORDER 206 — bekvämtyp för det per-roll hem-mappningsvärdet som
// InteriorStaff läser från kontraktet. Publiceras av *Scene via
// `resolveStaffHomesWorldByRole`.
type SharedStaffHomes = SharedBusinessRoom['staffHomesByRole'];
import { derivePipCarriers } from '../ui/RoomCardPanel/guestPatterns';
import {
  PIP_COLOUR,
  PIP_SIZE_M
} from './patternTransform';
import { teamPipCarriersFromStaffPipCarriers, bridgeTeamToStaff } from './teamStaffBridge';
// ORDER 121 §2 — figureRig ersätter cylinderpucken. Pipens Y kommer nu
// från rig.joints.headAnchor per §6.
import {
  createFigureRig,
  disposeFigureRig,
  applyPose,
  blendPose,
  poseIdle,
  poseWalk,
  poseGreet,
  poseCarry,
  poseWork,
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

// ORDER 155 — ROLE_COLOUR flyttat till `staffColour.ts` så rumsfilerna
// kan importera utan att dra in InteriorStaff.tsx. Re-exporterad här
// för bakåtkompatibilitet med `paletteContrast.test.ts` som importerar
// från denna fil.
import { ROLE_COLOUR } from './staffColour';
export { ROLE_COLOUR };

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
  // ORDER 198 — yaw-tillstånd för poseGreet-riktning. `walkYaw` följer
  // rörelseriktningen (uppdateras vid `movedThisFrame`), `renderedYaw`
  // är det tal som skrevs till `group.rotation.y` denna frame (så nästa
  // frame kan interpolera från kvarvarande yaw utan snap). `greetBlend`
  // ligger på [0..1] och rampar upp mot 1 medan staff står stilla på
  // en greet-task, ner mot 0 när task upphör eller staff börjar röra
  // sig igen — så torso-yaw:en mot gästen fejdas in/ut i stället för
  // att snappa.
  walkYaw: number;
  renderedYaw: number;
  greetBlend: number;
  // ORDER 217 (C3 §3.2) — pathIdx = index i staffPathsByRole[role] mot
  // vilken waypoint personalen är på väg. -1 = ingen aktiv path (staff
  // är hemma eller följer taskGuest-target direkt). Uppdateras när
  // personalen når nuvarande waypoint (< PATH_ADVANCE_THRESHOLD_M) eller
  // när task-state byter (nästa order-serie kan koppla walkPathToSeat
  // för task-guest-fallet).
  pathIdx: number;
}

// ORDER 217 (C3 §3.2) — tröskel för att räknas "framme vid waypoint" och
// avancera till nästa. Matchar guest-koden GREET_ARRIVAL_THRESHOLD_M-
// principen: ease har sub-frame-jitter, en snäv tröskel ger flimmer.
const PATH_ADVANCE_THRESHOLD_M = 0.6;
// ORDER 217 (C3 §3.2) — hur långt från home staff måste vara för att
// initiera path-följning. Om staff redan står vid home (< HOME_NEAR_M)
// behövs ingen path — den standard-drift som fanns pre-217 räcker.
const HOME_NEAR_M = 1.2;

// ORDER 198 — pose-mappning från sim-task till presentationspose.
//
// **Motivering:** sim producerar `taskType` för varje aktiv staff-medlem
// via service.ts:PRIORITY. Presentationslagret läste ingen av dem
// förrän nu — allt reducerades till poseWalk/poseIdle. `poseGreet` och
// `poseCarry` fanns i figureRig.ts (ORDER 121 §4) men var explicit
// "flaggade" som ej valda av renderaren eftersom sim-lagret inte hade
// task-state. Kommentaren är föråldrad — sim HAR task-state
// (types.ts:52-77, satt av service.ts:completeStaffTask och
// findTaskTarget). ORDER 198 stänger gapet.
//
// **CARRY_TASKS:** uppgifter där händerna bär något (bricka, karaff,
// gäst-tallrik). poseCarry blandar in gångbenen via `phase` när staff
// rör sig, så bärande under promenad är samma pose (figureRig.ts:671
// dokumentation). `serve`, `welcomeDrink`, `decant`, `clear` bär alla
// något visuellt — `checkback` gör det inte (tomhänt tillsyn).
// `order`/`flambe` hanteras nu i WORK_TASKS (ORDER 216).
//
// **GREET_TASKS:** uppgifter där staff möter en gäst ansikte mot
// ansikte — `greet` (välkomna vid entrén) och `seat` (visa till bord).
// poseGreet är stationär (arm-vinkning + torso-yaw), så den kickar
// bara in när staff är nära gästen (`GREET_ARRIVAL_THRESHOLD_M`);
// under promenaden dit → poseWalk. Ute-vinkeln till gästen sätts via
// `group.rotation.y` (staff vänder hela kroppen), och `targetYaw=0`
// skickas till poseGreet så torso/huvud står i linje med kroppen.
const CARRY_TASKS: ReadonlySet<TaskType> = new Set<TaskType>([
  'serve',
  'welcomeDrink',
  'decant',
  'clear'
]);
const GREET_TASKS: ReadonlySet<TaskType> = new Set<TaskType>(['greet', 'seat']);

// ORDER 216 (C3) — WORK_TASKS: stationära uppgifter där bålen är fram
// och händerna är i arbete. Fyller den lucka ORDER 198:s kommentar
// noterade ("poseWork skulle passa där, men det är ej i scope för
// ORDER 198"). Två grupper:
//   Gäst-tasks stationära vid bord: `order` (skriva på pad), `flambe`
//   (tableside-tillagning). Sim moveStaff → guest.position; när staff
//   står stilla vid bordet ska poseWork spela, inte poseIdle.
//   Bg-tasks vid station: `misEnPlace`, `dish`, `restock`, `clean`.
//   Sim moveStaff → INTERIOR.staffHomes[role]; när staff står stilla
//   vid stationen ska poseWork spela.
// `checkback` är INTE work — det är en kort tomhänt tillsyn (poseIdle
// räcker; en kort blick på gästen, inget arbete med händerna).
const WORK_TASKS: ReadonlySet<TaskType> = new Set<TaskType>([
  'order',
  'flambe',
  'misEnPlace',
  'dish',
  'restock',
  'clean'
]);

// Avstånd i meter till puckens EASE-target (efter ORDER 196:s clamp)
// där poseGreet börjar väljas. Vi kan inte mäta mot gästens faktiska
// position eftersom en arriving guest ligger 2,5–6 m utanför entrén
// (arrival/waiting-slot); ORDER 196 clampar staff-target till entrén
// när guest ligger utanför OBB, så staff står vid dörren och greetar
// "genom" väggen. Rätt "har jag kommit fram?"-signal är därför
// avstånd till target-XZ, inte till guest-XZ. Tröskeln matchar
// ease-loopens `dsq > step^2`-marginal med lite luft så pose-valet
// inte flimrar när puckens sub-frame-jitter oscillerar runt target.
const GREET_ARRIVAL_THRESHOLD_M = 0.8;

// Sekunder för greetBlend att gå från 0 → 1 (eller tvärtom). Matchar
// SIT_STAND_DURATION i InteriorGuests (0.5s per ORDER 121 §4).
const GREET_BLEND_DURATION_SEC = 0.5;

// ORDER 220 §1 — trail-offset för escort. Under greet-task med rörlig
// gäst sätter InteriorStaff värdens target till gästens render-position
// MINUS unit(walkYaw) * ESCORT_TRAIL_M, dvs. en punkt strax bakom
// gästen längs gångriktningen. Effekt: värden går samma väg som gästen,
// ett halvsteg efter, i stället för att gena en rak diagonal mellan
// hemplatsen och gästens aktuella position. Värdet 0.7 m är ungefär ett
// stridslängds-mellanrum (STRIDE_LENGTH_M = 0.75 m) — nära nog att
// figurerna läser som "tillsammans" men inte så nära att skelettens
// bounding-boxar överlappar visuellt.
const ESCORT_TRAIL_M = 0.7;

/**
 * Kortaste vinkelinterpolation mellan `from` och `to`. Kopierar
 * `interpAngle` i InteriorGuests.tsx (ORDER 197 §2 (d)) i stället för
 * att exportera — funktionen är fyra rader och en gemensam modul
 * skulle betala mer i indirection än den sparar.
 */
function interpAngle(from: number, to: number, k: number): number {
  const twoPi = Math.PI * 2;
  let d = to - from;
  d = ((d + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return from + d * Math.max(0, Math.min(1, k));
}

// ORDER 202 §2 — DEV-only-warnings för dolt data-fel. En gång per
// (klass, roll) så konsolen inte spammar. Nyckeln inkluderar roll så
// vi ser vilken specifik puck som hamnar utanför OBB eller saknar home.
const TARGET_OUTSIDE_OBB_WARNED = new Set<string>();
const NO_CONTRACT_HOME_WARNED = new Set<string>();
// ORDER 205 — provisorisk station-mappning-warning en gång per klass.
const ROLE_MAPPING_PROVISIONAL_WARNED = new Set<string>();

export function InteriorStaff() {
  // ORDER 174 — sim.businessClass in i interiorLayout så kontrakt-seats
  // vinner över restaurangens 16-stols-default för alla klasser.
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const { actualRef } = useCamera();
  const groupRef = useRef<THREE.Group>(null);

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

  // ORDER 196 — dev-only window-handle för layout-bounds så verify-
  // skriptet kan läsa `halfW * 1.02` mot samma tal som render-clampen
  // (samma layout, samma OBB, samma marginal). Undviker att skriptet
  // duplicerar konstanter — se ORDER 128:s princip om att replikat
  // driver isär.
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && layout) {
      (window as unknown as { __nxLayoutBounds?: unknown }).__nxLayoutBounds = {
        centre: layout.centre,
        width: layout.width,
        depth: layout.depth,
        entrance: layout.entrance
      };
    }
  }, [layout]);

  useFrame((_, delta) => {
    if (!groupRef.current || !layout || !stations) return;

    // ORDER 206 — läs `staffHomesByRole[role]` från kontraktet. Ingen
    // beräkning i scenen: `businessRoom.staffHomeFor()` gör mappningen
    // (STATION_MAP + 0,6 m-offset + floorY) och `resolveStaffHomesWorldByRole`
    // publicerar värdena i värld-XZ. VO 2026-09-10 kl. 16:30: "Bygg
    // staffHomeFor i businessRoom.ts, inte i scenen — kontraktet ska äga
    // mappningen, som ORDER 154 gjorde för stationFor."
    //
    // Roll→station-mappningen i STATION_MAP är delvis ANTAGANDE (öppen
    // Design-fråga STATION_ROLE_MAPPING_QUESTION_2026-09-10.md). VO:
    // "brewer→kock och taps→värd är dina antaganden om Designs namn.
    // Skriv dem som antaganden i koden." → antagandena är markerade
    // som ANTAGANDE-kommentarer i businessRoom.ts:STATION_MAP.
    const roomChan = businessRoomRef.current;
    const contractHomes: SharedStaffHomes | null =
      roomChan != null && roomChan.businessClass === sim.businessClass
        ? roomChan.staffHomesByRole
        : null;
    if (
      import.meta.env.DEV &&
      contractHomes &&
      !ROLE_MAPPING_PROVISIONAL_WARNED.has(sim.businessClass)
    ) {
      ROLE_MAPPING_PROVISIONAL_WARNED.add(sim.businessClass);
      console.warn(
        `[ORDER 206] STATION_MAP-mappning för "${sim.businessClass}" är delvis ANTAGANDE. ` +
        `Se businessRoom.ts:STATION_MAP-kommentar + STATION_ROLE_MAPPING_QUESTION_2026-09-10.md.`
      );
    }

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
    // ORDER 219 (C) — layout.centre användes för load-drift-pullen som
    // togs bort. Behållet som referens om framtida orders vill visualisera
    // "team drar mot centrum" på annat sätt (t.ex. huvudvridning eller
    // gångfrekvens i st f target-position).
    void layout.centre;
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

    // ORDER 186 fynd 5 — koppling till sim-task-pipelinen:
    // (a) värden står vid entré när ingen aktiv task-riktning finns
    // (b) servitören går mot sin targetGuest (staff.targetGuestId)
    // Bridgen mappar TeamMember (economic layer) → StaffMember (task layer)
    // per pattern från ORDER 090:s pip-räkning.
    const teamToStaff = bridgeTeamToStaff(sim.team.members, sim.staff);
    const staffById = new Map(sim.staff.map((s) => [s.id, s]));
    const guestById = new Map(sim.guests.map((g) => [g.id, g]));
    // ORDER 206 — `entranceXZ` konsumerades av värd-branchen som togs
    // bort; värd-hem läses nu ur `contractHomes.värd` (som i sin tur
    // kan peka på entrance via STATION_MAP.ölkrogen.värd = '__entrance').
    // Ingen fri läsning av `roomChan?.entrance` behövs här.

    // ORDER 206 — hem per roll läses direkt ur kontraktet. Ingen
    // scen-lokal beräkning; STATION_MAP + 0,6 m-offset + floorY sker
    // i `businessRoom.staffHomeFor` (som `resolveStaffHomesWorldByRole`
    // wraps och publicerar). Skip medlem med DEV-warn om `contractHomes`
    // saknar rollen (STATION_MAP-cell = null eller ingen station med
    // det id:et i rummet).
    for (const member of sim.team.members) {
      seenIds.add(member.id);

      const contractHome = contractHomes?.[member.role] ?? null;
      if (!contractHome) {
        if (
          import.meta.env.DEV &&
          !NO_CONTRACT_HOME_WARNED.has(sim.businessClass + ':' + member.role)
        ) {
          NO_CONTRACT_HOME_WARNED.add(sim.businessClass + ':' + member.role);
          console.warn(
            `[ORDER 206] staffHomesByRole["${member.role}"] är null för businessClass="${sim.businessClass}" (member.id=${member.id}). ` +
            `Uppdatera STATION_MAP i businessRoom.ts eller lägg till en station i rumsfilen. Pucken renderas inte.`
          );
        }
        continue;
      }
      const home: XZ = contractHome.xz;
      const homeY: number = contractHome.y;
      const homeStationFacing: number = contractHome.facing;

      let pos = positionsRef.current.get(member.id);
      if (!pos) {
        // Spawn at home station on first sighting.
        pos = {
          cx: home[0],
          cz: home[1],
          jitterSeed: Math.random() * Math.PI * 2,
          walkPhase: 0,
          // ORDER 198 — nya fält får neutralt startläge. walkYaw=0
          // (default +Z) bytas ut första gången staff rör sig; tills
          // dess står figuren i sitt spawn-yaw utan att snappa.
          walkYaw: 0,
          renderedYaw: 0,
          greetBlend: 0,
          // ORDER 217 (C3 §3.2) — ingen aktiv path vid spawn (staff står
          // redan vid home). Path aktiveras när staff blivit tillräckligt
          // långt hemifrån och behöver ta sig tillbaka.
          pathIdx: -1
        };
        positionsRef.current.set(member.id, pos);
      }

      // Target: home station + idle drift.
      //
      // ORDER 219 (C) — load-driven pull toward the room's centre BORTTAGEN.
      // Pre-C1/C2/C3-eran använde `pullDX * strainFactor * 0.5` för att
      // visualisera stress ("staff söker sig till centrum vid hög belastning").
      // Med C1/C2/C3 driver riktiga tasks staffs rörelse: order/serve/clear
      // tar staff till gäster, misEnPlace/dish tar staff till stationer.
      // Strain-pullen blev en redundant force som drog staff AWAY från home
      // MELLAN uppgifter — VO 2026-09-14: "mellan uppgifter — tillbaka till
      // hemplatsen. Inte stå kvar där man råkade sluta." Vid load=2 (dinner
      // rush) drog pullen staff halvvägs mot centrum efter varje task-slut i
      // st f att låta dem gå hem. Nu: mellan uppgifter går staff hem via
      // ORDER 217:s walkPath när de är far, straight-line + jitter när nära.
      const jitterX = Math.sin(now * driftFreq + pos.jitterSeed) * driftAmp;
      const jitterZ =
        Math.cos(now * driftFreq * 0.9 + pos.jitterSeed * 1.7) * driftAmp;
      let targetX = home[0] + jitterX;
      let targetZ = home[1] + jitterZ;
      void strainFactor; // reserved; strain visualisation flyttad till pose/rhythm

      // ORDER 200 fynd 3 — värd stannar ALLTID vid entrén, oavsett task.
      //
      // Före ORDER 200: värd hade `entrance + jitter` som default men om
      // sim satte `staff.targetGuestId` (t.ex. greet på arriving guest)
      // lämnade värden entrén och gick mot gästen. VO-direktiv 2026-09-10:
      // "värden ska stanna vid entrén, inte gå till kön. Servera kön är
      // en handling, inte en hemplats." Värdens läsbarhet i rummet ÄR att
      // hen står vid dörren; att greeta är en handling som utförs DÄRIFRÅN,
      // inte genom att lämna posten. Andra roller (servitör/kock/lärling)
      // rör sig till gästen som förr, men task-target hämtas nu från
      // render-lagret (se nedan).
      const bridgedStaffId = teamToStaff.get(member.id) ?? null;
      const bridgedStaff = bridgedStaffId ? staffById.get(bridgedStaffId) ?? null : null;
      const taskGuest = bridgedStaff?.targetGuestId
        ? guestById.get(bridgedStaff.targetGuestId) ?? null
        : null;

      // ORDER 206 — värd-entrance-branchen BORTTAGEN. Design 4-to-4
      // (VO 2026-09-10 kl. 15:30 + 16:30) implicerar att värd hör till
      // EN av de fyra stationerna, inte entrén. STATION_MAP.ölkrogen.värd
      // = '__entrance' är fortsatt ANTAGANDE (VO-arv ORDER 200) tills
      // Design bekräftar 'taps' eller annan station-id; men koden gör
      // ingen scen-lokal specialbehandling — värd följer samma path som
      // övriga roller, task-driven om taskGuest, annars home + drift.
      if (taskGuest) {
        // ORDER 200 fynd 3 — läs gästens RENDER-position (värld-XZ) i
        // stället för `taskGuest.position` (LOKAL frame ~ origin per
        // content/layout.ts:INTERIOR). Innan ORDER 200 gav sim-koordinater
        // (2, -1.8) `targetDistFromCentre = 33 m` när jämförd mot
        // layout.centre = (31.6, -16.7) → ORDER 196:s clamp tryckte
        // ALLA task-driftade staff till entrance-XZ, oavsett gästens
        // faktiska render-position (som ligger inom OBB). Diagnostiken
        // 2026-09-10 visade servitör + kock klumpade på entrance-XZ =
        // (32.4, -10.1) i stället för sina stationer (runner 28.5,-13.5;
        // brewer 26.1,-20.0). Fynd 3.
        const guestRender = guestPositionsRef.current.get(bridgedStaff!.targetGuestId!);
        if (guestRender) {
          targetX = guestRender.x;
          targetZ = guestRender.z;
          // ORDER 220 §1 — escort trail. När task är `greet` och gästen
          // faktiskt går (arriving/waiting mot seat), sätt target BAKOM
          // gästen längs hens gångriktning (`guestRender.yaw`, atan2(dx,dz))
          // med `ESCORT_TRAIL_M`-offset. Effekt: värden går samma väg som
          // gästen, ett halvmeter bakom, i stället för att välja rak linje
          // hem-→-guestpos vilket gav parallella spår (VO 2026-09-14:
          // "två figurer på olika vägar ser sämre ut än ingen eskort alls").
          //
          // Villkor:
          //  - taskType === 'greet' (endast escort under greet, inte serve).
          //  - guestRender.moving (gästen tar faktiskt steg — stilla gäst
          //    ska värden nå fram till, inte fastna 0,6 m bort).
          //  - guestRender.yaw definierad (första publiceringen har den).
          //
          // För seated-gäst med greet-task (sällsynt — findTaskTarget
          // fallback 3, prioriteras efter arriving/waiting) faller vi
          // tillbaka till walkPathsToSeatsByIndex-branchen längre ner. Där
          // rör sig staff genom rummets korridor och den slutliga
          // approachen använder gäst-render-position rakt av.
          //
          // ORDER 219 §5(b) noterade uttryckligen att "värd står vid
          // gäst-target ... men escortar inte guest fysiskt" — snyggare
          // hosting-koreografi flaggades som egen order. Detta är den.
          const taskType = bridgedStaff?.taskType ?? null;
          if (
            taskType === 'greet' &&
            guestRender.moving === true &&
            typeof guestRender.yaw === 'number'
          ) {
            // Enhetsvektor i gästens gångriktning: (sin(yaw), cos(yaw)) i
            // atan2(dx,dz)-konventionen. Trail-offseten dras AV målet
            // (target flyttas bakåt från gästens position mot startpunkten
            // för gästens rörelse).
            const gy = guestRender.yaw;
            targetX = guestRender.x - Math.sin(gy) * ESCORT_TRAIL_M;
            targetZ = guestRender.z - Math.cos(gy) * ESCORT_TRAIL_M;
          }
        } else {
          // Fallback när render-position ännu inte publicerad (första
          // frames före InteriorGuests hunnit skriva): stanna vid home.
          // Vi UNDVIKER sim.guest.position eftersom det är lokala coords
          // och ORDER 196:s clamp skulle skjuta target till entrance.
          // Home är alltid en giltig värld-XZ.
        }
      }

      // ORDER 202 §2 — väggclamp BORTTAGEN. Före ORDER 202:
      //   if (targetDistFromCentre > halfW * 1.02) target = entrance
      // Motivering (ORDER 196): "hindra personal från att gå ut genom
      // väggen". Rot-problemet ORDER 196 löste var att sim.guest.position
      // (lokal frame) gav huge targetDist när jämförd mot layout.centre
      // (värld) → clamp fyrade ALLTID → staff klumpade på entrance.
      // ORDER 200 fixade det genom att läsa guest RENDER-position (värld);
      // efter det är clampen strukturellt onödig — värd är låst vid
      // entrance-branchen, övriga roller har home inuti OBB, task-guest
      // render-position går genom entrance-waypoint. Om target ändå
      // hamnar utanför OBB är det ett fynd (någon data-väg är fel), inte
      // något att gömma. VO-direktiv 2026-09-10 kl. 14:00: "En fallback
      // som döljer att data saknas är samma mönster som INTERIOR.chair.
      // seatY." Utan clampen: DEV-warning en gång per klass+roll om target
      // faktiskt hamnar utanför OBB, så VO ser i konsolen om det inträffar.
      const halfW = layout.width / 2;
      if (
        import.meta.env.DEV &&
        Math.hypot(targetX - layout.centre[0], targetZ - layout.centre[1]) > halfW * 1.02 &&
        !TARGET_OUTSIDE_OBB_WARNED.has(sim.businessClass + ':' + member.role)
      ) {
        TARGET_OUTSIDE_OBB_WARNED.add(sim.businessClass + ':' + member.role);
        console.warn(
          `[ORDER 202 §2] staff target utanför OBB för ${sim.businessClass}/${member.role} (member.id=${member.id}). ` +
          `target=(${targetX.toFixed(1)}, ${targetZ.toFixed(1)}) centre=(${layout.centre[0].toFixed(1)}, ${layout.centre[1].toFixed(1)}) halfW=${halfW.toFixed(2)}. ` +
          `Ingen clamp — undersök varför data-vägen (contractHome/taskGuest) gav utanför-OBB-target.`
        );
      }

      // ORDER 217 (C3 §3.2) + ORDER 218 (uppföljning) — routing via
      // rummets korridorer. Två fall:
      //   (a) staff→home (!taskGuest, far från home): staffPathsByRole
      //       — publicerad av walkPathToStation.
      //   (b) staff→seated-guest: walkPathsToSeatsByIndex[guest.seatIndex]
      //       — publicerad av walkPathToSeat, ORDER 218. Utan detta korsar
      //       en servitör på väg till gäst vid ölkrogens långbord bordet
      //       (samma sorts fel som (a) hade före ORDER 217).
      // Om taskGuest inte är seated (waiting/arriving/etc.) faller vi
      // tillbaka till rak linje mot guest-render-position — inga
      // korridorer beskrivna för de tillstånden.
      const homePath = roomChan?.staffPathsByRole?.[member.role] ?? null;
      const seatPaths = roomChan?.walkPathsToSeatsByIndex ?? null;
      const homeDx = home[0] - pos.cx;
      const homeDz = home[1] - pos.cz;
      const distFromHomeSq = homeDx * homeDx + homeDz * homeDz;
      const farFromHome = distFromHomeSq > HOME_NEAR_M * HOME_NEAR_M;

      // Välj aktiv path.
      let activePath: XZ[] | null = null;
      if (taskGuest && seatPaths) {
        // ORDER 218 — routa via walkPathToSeat om guest är seated
        // (`seatIndex != null`). SEATED_STATES-listan hanteras via närvaro
        // av `seatIndex` — waiting-gäster har seatIndex=null.
        const seatIdx = taskGuest.seatIndex ?? -1;
        if (seatIdx >= 0 && seatIdx < seatPaths.length && seatPaths[seatIdx].length > 1) {
          // Sista waypoint är seat.local; staff står bredvid, inte på
          // stolen. Guest-render-position räknas in via en distanscheck:
          // om staff är nära sista waypoint släpps path och vi går rakt
          // till guest-render-position (för sista biten, ~0.6-1.0 m).
          const path = seatPaths[seatIdx];
          const lastWp = path[path.length - 1];
          const distToSeatSq = (lastWp[0] - pos.cx) ** 2 + (lastWp[1] - pos.cz) ** 2;
          if (distToSeatSq > HOME_NEAR_M * HOME_NEAR_M) {
            activePath = path;
          }
        }
      } else if (!taskGuest && farFromHome && homePath && homePath.length > 1) {
        activePath = homePath;
      }

      if (activePath) {
        // Aktivera path om ingen är aktiv, eller om nuvarande idx är ur
        // range (t.ex. path bytt mellan frames när task-guest ändrats).
        if (pos.pathIdx < 0 || pos.pathIdx >= activePath.length) {
          // Välj waypoint närmast staff-position så staff inte går bakåt
          // till entrén för att sedan gå framåt. Nästa waypoint efter
          // närmaste ger framåtrörelse.
          let nearestIdx = 0;
          let nearestDsq = Infinity;
          for (let i = 0; i < activePath.length; i++) {
            const wx = activePath[i][0];
            const wz = activePath[i][1];
            const d = (wx - pos.cx) ** 2 + (wz - pos.cz) ** 2;
            if (d < nearestDsq) { nearestDsq = d; nearestIdx = i; }
          }
          pos.pathIdx = Math.min(activePath.length - 1, nearestIdx + 1);
        }
        // Avancera om vi nått nuvarande waypoint.
        const w = activePath[pos.pathIdx];
        const wdx = w[0] - pos.cx;
        const wdz = w[1] - pos.cz;
        if (wdx * wdx + wdz * wdz < PATH_ADVANCE_THRESHOLD_M * PATH_ADVANCE_THRESHOLD_M) {
          if (pos.pathIdx < activePath.length - 1) {
            pos.pathIdx += 1;
          } else {
            // Sista waypoint nådd — direkt-target (home eller guest) tar
            // över nästa frame via straight-line ease.
            pos.pathIdx = -1;
          }
        }
        // Använd waypoint som effektivt mål (utan drift — driftjitter
        // under path-routing kan pusha ur korridoren).
        if (pos.pathIdx >= 0 && pos.pathIdx < activePath.length) {
          targetX = activePath[pos.pathIdx][0];
          targetZ = activePath[pos.pathIdx][1];
        }
      } else if (!taskGuest && !farFromHome) {
        // Nära hemma — släpp path-state så nästa långt-hemifrån-övergång
        // startar rent (annars kunde pathIdx hänga kvar från förra passet).
        pos.pathIdx = -1;
      }

      // Ease toward target at walking pace (boosted during prep).
      const dx = targetX - pos.cx;
      const dz = targetZ - pos.cz;
      const dsq = dx * dx + dz * dz;
      const step = pace * delta;
      let movedThisFrame = false;
      let moveDx = 0;
      let moveDz = 0;
      if (dsq > step * step) {
        const invd = 1 / Math.sqrt(dsq);
        moveDx = dx * invd * step;
        moveDz = dz * invd * step;
        pos.cx += moveDx;
        pos.cz += moveDz;
        movedThisFrame = true;
      } else if (dsq > 1e-6) {
        moveDx = targetX - pos.cx;
        moveDz = targetZ - pos.cz;
        pos.cx = targetX;
        pos.cz = targetZ;
        movedThisFrame = true;
      }
      // ORDER 121 §2 — gångfas ökar med stridslängd per meter.
      if (movedThisFrame) {
        pos.walkPhase += (step / STRIDE_LENGTH_M);
      }
      // ORDER 198 — spara rörelseriktningens yaw så pose-valet vet vart
      // figuren är på väg (matchar mönstret i InteriorGuests §2 (c)).
      // Uppdateras bara vid faktisk rörelse; en stationär staff ärver
      // sin senaste yaw. `atan2(dx, dz)` ger yaw runt +Y för +Z-facing
      // frame (samma konvention som seatFacing).
      if (movedThisFrame && (moveDx * moveDx + moveDz * moveDz) > 1e-8) {
        pos.walkYaw = Math.atan2(moveDx, moveDz);
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
        // ORDER 190 fynd 4 — bobY clampas ≥ 0. Före ORDER 190 gick bob-
        // oscillationen ±TASK_BOB_AMPLITUDE_M = ±0.05m; negativ sving
        // gjorde staff synligt under golv-cutout vid entrance-dörren
        // (VO 2026-09-07 17:22 "värd delvis nedsjunken i entréns golv-
        // öppning"). Bob upp bibehålls (rörelsen läses), bob ner
        // kapas till 0 så staff aldrig penetrerar golvet.
        // ORDER 206 — Y = `homeY` (rummets floorY = PLINTH_M ≈ 0.11 m)
        // plus bob-oscillationen. VO 2026-09-10 kl. 16:30: "Hemplatserna
        // ska mätas mot floorY, inte mot noll." Före ORDER 206 stod staff
        // med fötterna på Y=0 medan golvet är på Y=0.11 → figuren 11 cm
        // under golv-nivån. Bob-clampen bakom PLINTH_M så bob-ner aldrig
        // sjunker under golvet (ORDER 190 fynd 4-principen bevarad).
        grp.position.set(pos.cx, homeY + Math.max(0, bobY), pos.cz);
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
        // ORDER 198 — pose-valet läser sim.staff[i].taskType via
        // bridgedStaff. CARRY_TASKS → poseCarry (blandar in poseWalk
        // via `phase` när staff rör sig så bärandet ser rätt ut i
        // gång). GREET_TASKS → poseGreet när staff står nära gästen
        // (inom GREET_ARRIVAL_THRESHOLD_M) och står stilla; poseWalk
        // under promenad dit. Övrigt behåller ORDER 121 §4-beteendet
        // (poseWalk om rörelse, annars poseIdle).
        //
        // Yaw: `group.rotation.y` sätts till walkYaw som default; för
        // greet-poser interpoleras yaw mot vektorn till gästen så
        // hela kroppen vänder sig (targetYaw i poseGreet är då =0).
        // `greetBlend` går 0→1 medan greet-villkoret gäller, 1→0 när
        // det upphör — så torso-vridningen fejdas i stället för att
        // snappa. Matchar SIT_STAND-mönstret i InteriorGuests.
        const t = sim.simTime + pos.jitterSeed;
        const taskType: TaskType | null = bridgedStaff?.taskType ?? null;
        const isCarry = taskType !== null && CARRY_TASKS.has(taskType);
        const isGreetTask = taskType !== null && GREET_TASKS.has(taskType);
        // ORDER 216 (C3) — poseWork när staff står stilla i en work-task.
        const isWorkTask = taskType !== null && WORK_TASKS.has(taskType);
        // Har staff hunnit fram till sin ease-target? `dx/dz` beräknades
        // före steget. Vi kräver INTE `!movedThisFrame` — vid högre
        // sim-speed (>1×) hinner sim genomföra hela greet-tasken (4
        // ticks = 0,8 sim-sek) på färre frames än puckens ease behöver
        // för att helt landa; kravet skulle spärra poseGreet i realistiska
        // provspel. Distanströskeln räcker: när staff är inom
        // GREET_ARRIVAL_THRESHOLD_M av (den ORDER 196-clampade) target
        // spelar det ingen roll om puckens sub-frame-jitter ännu räknas
        // som "movedThisFrame".
        const distToTargetSq = dx * dx + dz * dz;
        const nearGreetTarget =
          isGreetTask &&
          distToTargetSq <= GREET_ARRIVAL_THRESHOLD_M * GREET_ARRIVAL_THRESHOLD_M;

        // Beräkna yaw mot gästen för greet-posen (samma frame som
        // pose väljs). ORDER 200 fynd 3 — läs render-position, INTE
        // sim.guest.position (lokal frame). Fallback: nuvarande walkYaw.
        let guestYaw = pos.walkYaw;
        const taskGuestId = bridgedStaff?.targetGuestId ?? null;
        const taskGuestRender = taskGuestId
          ? guestPositionsRef.current.get(taskGuestId)
          : null;
        if (taskGuestRender) {
          const gdx = taskGuestRender.x - pos.cx;
          const gdz = taskGuestRender.z - pos.cz;
          if (gdx * gdx + gdz * gdz > 1e-6) {
            guestYaw = Math.atan2(gdx, gdz);
          }
        }

        // Uppdatera greetBlend mot måltillståndet (1 om nearGreetTarget,
        // annars 0). delta*duration-invers = rate per sekund.
        const blendRate = delta / GREET_BLEND_DURATION_SEC;
        const targetBlend = nearGreetTarget ? 1 : 0;
        if (pos.greetBlend < targetBlend) {
          pos.greetBlend = Math.min(targetBlend, pos.greetBlend + blendRate);
        } else if (pos.greetBlend > targetBlend) {
          pos.greetBlend = Math.max(targetBlend, pos.greetBlend - blendRate);
        }

        // Välj pose. Ordningsföljd:
        //   1. greet (om vi är nära gästen med greet-task) — poseGreet
        //      med targetYaw=0 (kroppen är redan vänd via renderedYaw
        //      nedan). Om greetBlend<1 blandar vi in poseIdle/poseWalk
        //      så inhoppet ser mjukt ut.
        //   2. carry — poseCarry, phase= walkPhase om rörelse, annars
        //      null (armar bär, ben står stilla).
        //   3. fallback — poseWalk om rörelse, annars poseIdle.
        let poseName: SharedStaffPose['poseName'];
        if (nearGreetTarget || pos.greetBlend > 0) {
          // Stationär greet med torso-yaw = 0 (kroppen håller riktningen).
          poseName = 'poseGreet';
          if (pos.greetBlend >= 0.999) {
            applyPose(rig, poseGreet(t, { targetYaw: 0, side: 1 }));
          } else {
            // Blend mellan idle/walk och greet så inhoppet dämpas.
            const baseIsWalk = movedThisFrame;
            const base = baseIsWalk ? poseWalk(pos.walkPhase) : poseIdle(t);
            const greet = poseGreet(t, { targetYaw: 0, side: 1 });
            // blendPose (figureRig.ts:475) väger båda pose-uppsättningarna
            // linjärt per led — samma pattern som SIT_STAND-blenden i
            // InteriorGuests. Alla sex poser sätter samma led-set (se
            // figureRig.ts:698 POSE_JOINT_NOTES), så viktningen är
            // trygg.
            applyPose(rig, blendPose(base, greet, pos.greetBlend));
            if (pos.greetBlend < 0.5) {
              poseName = baseIsWalk ? 'poseWalk' : 'poseIdle';
            }
          }
        } else if (isCarry) {
          poseName = 'poseCarry';
          applyPose(
            rig,
            poseCarry(t, { phase: movedThisFrame ? pos.walkPhase : null })
          );
        } else if (isWorkTask && !movedThisFrame) {
          // ORDER 216 (C3) — poseWork spelar när staff står vid arbetsplats
          // (station för bg-tasks, gästbord för order/flambe) och taskType
          // signalerar arbete. Priorityn står EFTER isCarry så en staff som
          // bär `serve` fortfarande spelar poseCarry även om de skulle råka
          // matcha ett WORK_TASKS-namn (inga overlap idag men rätt ordning
          // förebygger framtida ambiguity). Villkoret !movedThisFrame gör
          // att staff spelar poseWalk under promenaden dit — samma pattern
          // som poseGreet med sitt distance-gate.
          poseName = 'poseWork';
          applyPose(rig, poseWork(t));
        } else if (movedThisFrame) {
          poseName = 'poseWalk';
          applyPose(rig, poseWalk(pos.walkPhase));
        } else {
          poseName = 'poseIdle';
          applyPose(rig, poseIdle(t));
        }

        // Yaw på group: interpolera mellan senaste renderad yaw och
        // ny mål-yaw. Målet är guestYaw när greetBlend > 0 (så staff
        // vänder sig mot gästen medan blend rampar upp), annars
        // walkYaw. Interpolationssteget matchar greetBlend-rampen så
        // rörelsen är samordnad.
        // ORDER 205 — när staff är vid sin station (nära home, ingen
        // rörelse, ingen greet-blend), vänd mot stationen enligt
        // `homeStationFacing`. Så figuren tittar in i arbetsområdet
        // istället för att stå med walkYaw från senaste task-walk.
        let targetYawRad: number;
        if (pos.greetBlend > 0) {
          targetYawRad = guestYaw;
        } else if (
          !movedThisFrame &&
          Math.hypot(pos.cx - home[0], pos.cz - home[1]) < 0.4
        ) {
          // ORDER 206 — homeStationFacing är alltid definierad (contract-
          // levererad), så villkoret är bara "inaktiv vid home".
          targetYawRad = homeStationFacing;
        } else {
          targetYawRad = pos.walkYaw;
        }
        // Snabb ease på yaw: `1 - exp(-delta * k)` med k=6/s ger ~63%
        // konvergens per 0.17s — snappar snabbt utan att flimra.
        const yawEase = 1 - Math.exp(-delta * 6);
        pos.renderedYaw = interpAngle(pos.renderedYaw, targetYawRad, yawEase);

        if (grp) {
          grp.rotation.y = pos.renderedYaw;
        }

        // Publicera pose-val till DEV-hook.
        staffPosesRef.current.set(member.id, {
          poseName,
          taskType,
          targetGuestId: bridgedStaff?.targetGuestId ?? null,
          moving: movedThisFrame,
          yaw: pos.renderedYaw,
          greetYaw: poseName === 'poseGreet' ? 0 : null
        });
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
