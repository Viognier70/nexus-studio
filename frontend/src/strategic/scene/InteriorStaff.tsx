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
import type { SharedStaffPose } from './interiorSharedState';
import type { TaskType } from '../types';
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
}

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
// något visuellt — `checkback` gör det inte (tomhänt tillsyn) och
// `order`/`flambe` är stationära (poseWork skulle passa där, men det
// är ej i scope för ORDER 198).
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

    // ORDER 204 — läs den flata `stations`-listan direkt från kontraktet
    // (raw `staffStations` världs-XZ i deklarationsordning). Ingen roll-
    // härledning via `stationFor`/STATION_MAP — Design (via VO 2026-09-10
    // kl. 15:30) klargjorde att rummet levererar `stations` som garanterat
    // fält och en index-baserad tilldelning per team-medlem räcker.
    // Ölkrogen har 4 stations (barkeep, brewer, cook, runner); team har
    // 3-4 medlemmar. Värden hanteras separat i entrance-branchen nedan
    // (är alltid vid entrén oavsett), övriga roller får varsin station
    // via `nonVärdIndex` (räknat i member-order).
    const roomChan = businessRoomRef.current;
    const contractStations: readonly XZ[] | null =
      roomChan && roomChan.businessClass === sim.businessClass
        ? (roomChan.stations as readonly XZ[])
        : null;

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

    // ORDER 186 fynd 5 — koppling till sim-task-pipelinen:
    // (a) värden står vid entré när ingen aktiv task-riktning finns
    // (b) servitören går mot sin targetGuest (staff.targetGuestId)
    // Bridgen mappar TeamMember (economic layer) → StaffMember (task layer)
    // per pattern från ORDER 090:s pip-räkning.
    const teamToStaff = bridgeTeamToStaff(sim.team.members, sim.staff);
    const staffById = new Map(sim.staff.map((s) => [s.id, s]));
    const guestById = new Map(sim.guests.map((g) => [g.id, g]));
    const entranceXZ = (roomChan?.entrance ?? layout.entrance) as XZ;

    // ORDER 204 — räkna nonVärd-index inuti loopen; värd hoppar över och
    // skippar en position i station-indexeringen. Så första servitör/kock
    // får stations[0], andra stations[1] etc. Deklarationsordning i
    // rumsfilen bestämmer vilken station som får vilken puck.
    let nonVärdIndex = 0;
    for (const member of sim.team.members) {
      seenIds.add(member.id);

      // ORDER 204 — värd hanteras i entrance-branchen längre ner (target
      // = entrance oavsett), så home behöver inte pekas ut för värd.
      // För övriga roller: läs `stations[nonVärdIndex]` från kontraktet.
      // Ingen roll-mapping via STATION_MAP — Design (via VO 2026-09-10
      // kl. 15:30): "Det heter stations på businessRoom-kontraktet och
      // staffStations på råobjektet. Ölkrogen har fyra. Läs kontraktets
      // garanterade fält på nytt och använd stations. Ingen härledning
      // ur stationFor."
      //
      // Ordning: brewpub `staffStations` deklarationsordning är
      // [barkeep, brewer, cook, runner]. Team-medlemmar (efter värd)
      // fyller stations i ordning: första nonVärd = barkeep, andra
      // = brewer, tredje = cook, fjärde = runner. Deklarationsordningen
      // i rumsfilen är därmed kontraktets ordning-som-mening.
      let home: XZ;
      if (member.role === 'värd') {
        // Placeholder — entrance-branchen nedan skriver över target.
        home = entranceXZ;
      } else {
        if (!contractStations || contractStations.length === 0) {
          if (
            import.meta.env.DEV &&
            !NO_CONTRACT_HOME_WARNED.has(sim.businessClass + ':' + member.role)
          ) {
            NO_CONTRACT_HOME_WARNED.add(sim.businessClass + ':' + member.role);
            console.warn(
              `[ORDER 204] kontraktets stations-lista tom för businessClass="${sim.businessClass}" (member.id=${member.id}, role=${member.role}). ` +
              `Ingen fallback — pucken renderas inte. Lägg till staffStations i rumsfilen (t.ex. brewpubRoom.ts).`
            );
          }
          continue;
        }
        if (nonVärdIndex >= contractStations.length) {
          if (
            import.meta.env.DEV &&
            !NO_CONTRACT_HOME_WARNED.has(sim.businessClass + ':overflow')
          ) {
            NO_CONTRACT_HOME_WARNED.add(sim.businessClass + ':overflow');
            console.warn(
              `[ORDER 204] team har fler nonVärd-medlemmar (${nonVärdIndex + 1}) än kontraktets stations (${contractStations.length}) för "${sim.businessClass}". ` +
              `Extra medlem "${member.role}" (${member.id}) renderas inte. Lägg till fler stations i rumsfilen.`
            );
          }
          nonVärdIndex += 1;
          continue;
        }
        home = contractStations[nonVärdIndex];
        nonVärdIndex += 1;
      }

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
          greetBlend: 0
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
      let targetX = home[0] + jitterX + pullDX * strainFactor * 0.5;
      let targetZ = home[1] + jitterZ + pullDZ * strainFactor * 0.5;

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

      if (member.role === 'värd') {
        // Värd: fast vid entrén, lätt jitter så figuren inte fryses.
        // Ingen task-override — sim:s eventuella targetGuestId ignoreras.
        targetX = entranceXZ[0] + jitterX * 0.4;
        targetZ = entranceXZ[1] + jitterZ * 0.4;
      } else if (taskGuest) {
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
        grp.position.set(pos.cx, Math.max(0, bobY), pos.cz);
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
        const targetYawRad = pos.greetBlend > 0 ? guestYaw : pos.walkYaw;
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
