// ORDER 125 §3 — ölkrogens rum monterat i strategiska scenen.
// ORDER 149 — omlagd att gå via `businessRoom.ts`-kontraktet
// (`createRoom('ölkrogen', …)` / `updateRoom`) i stället för direkt
// mot `createBrewpubRoom`. Samma mönster som RestaurantScene efter
// ORDER 144. Motiv: monteringskod mot rumsfilerna direkt får sex
// specialfall för sex saker som gör samma sak, och specialfall är där
// fel gömmer sig (businessRoom.ts §Varför).
//
// Villkorat på `sim.businessClass === 'ölkrogen'`. Placering per
// interiorLayout-OBB.
//
// `updateRoom(room, 0)` anropas varje bildruta med phase = 0 per §5-
// flaggan `brewPhase` — produktionstillstånd finns inte i sim-lagret
// ännu och phasen får inte uppfinnas.
//
// ORDER 267 (Nexus v1 etapp 5) — komponenten är generisk över rums-
// klassen (`ContractRoomScene`) och monterar även vinbaren
// (`WineBarScene`, wineBarRoom.ts via samma kontrakt). v1:s vinbar
// spelas i det rummet (sim/economy.ts V1_CLASS_TO_ROOM). Vinbarens
// skivtallrik får phase 0 som ölkrogens bryggning (businessRoom.ts
// updateRoom-kommentaren). Filnamnet behålls: många kommentarer pekar
// hit.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimState } from '../simulation/SimulationProvider';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import {
  createRoom,
  resolveWorldPositions,
  resolveStaffHomesWorldByRole,
  resolveStaffPathsWorldByRole,
  resolveWalkPathsToSeatsWorld,
  updateRoom,
  setShellOpacity,
  shellOpacityForDistance,
  roomSizeFor,
  type BusinessRoom
} from './businessRoom';
import { disposeBrewpubGeometry } from './brewpubRoom';
import {
  disposeWineBarGeometry,
  PLINTH_M as WINE_BAR_PLINTH_M,
  LIGHT_MOODS,
  setMood,
  setWineWallLevel,
  updateCutaway,
  updateWineBarRoom,
  type MoodId,
  type WineBarRoom,
  type WineWallLevel
} from './wineBarRoom';
import { WineBarFigures } from './WineBarFigures';
import { calendarFor } from '../../sim/calendar';
import { clockMinutes } from '../../sim/incidents';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import type { SimulationState } from '../types';
import { businessRoomRef } from './interiorSharedState';
import { buildNav, type XZ } from './roomNav';
import { useCamera } from '../camera/CameraContext';
import { IndoorLamps } from './IndoorLamps';
import type { Vec2 } from './businessRoom';
import { applyWineBarRoof, CUT_BELOW, roofAt, STAGE_LIGHT, stageLightIntensity } from '../village/roofBlend';

// ORDER 184 — skalets tonning: businessRoom.shellOpacityForDistance (samma
// smoothstep som PlayerBusiness roof-fade; flyttad dit i ORDER 271).

// ORDER 201 fynd 1 — brewpubRoom lägger golv-slabben på Y=0.11 (onamngiven
// i brewpubRoom, PLINTH_M i övriga rumsfiler).
const BREWPUB_PLINTH_M = 0.11;

export function BrewpubScene() {
  return <ContractRoomScene roomClass="ölkrogen" plinth={BREWPUB_PLINTH_M} disposeGeometry={disposeBrewpubGeometry} />;
}

export function WineBarScene() {
  return <ContractRoomScene roomClass="vinbaren" plinth={WINE_BAR_PLINTH_M} disposeGeometry={disposeWineBarGeometry} />;
}

interface ContractRoomSceneProps {
  roomClass: 'ölkrogen' | 'vinbaren';
  plinth: number;
  disposeGeometry: () => void;
}

function ContractRoomScene({ roomClass, plinth, disposeGeometry }: ContractRoomSceneProps) {
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const groupRef = useRef<THREE.Group>(null);
  const roomRef = useRef<BusinessRoom | null>(null);
  const { actualRef } = useCamera();

  const isBrewpub = sim.businessClass === roomClass;
  // ORDER 249 §2 — bord-positioner för IndoorLamps.
  const [tables, setTables] = useState<readonly Vec2[]>([]);
  // ORDER 271 — vinbarens rum för figurerna (monteras efter rummet).
  const [wineBar, setWineBar] = useState<WineBarRoom | null>(null);
  const { camera } = useThree();
  const reducedMotion = usePrefersReducedMotion();
  const isWineBar = roomClass === 'vinbaren';
  // ORDER 271 — kvällens stämning och vinväggens läge ur simuleringen.
  const mood = isWineBar ? wineBarMood(sim) : 'tidig';
  const wallLevel: WineWallLevel = sim.medals?.stensota === 'platina' ? 'platina' : 'bas';
  const cutRef = useRef({ yaw: NaN, x: NaN, z: NaN, d: NaN });
  const stageRef = useRef<THREE.SpotLight>(null);
  const appliedRef = useRef<{ mood: MoodId | null; wall: WineWallLevel | null }>({ mood: null, wall: null });
  const djPlaying = useMemo(() => LIGHT_MOODS[mood].djPlaying, [mood]);

  useEffect(() => {
    if (!isBrewpub) return;
    const grp = groupRef.current;
    if (!grp || !layout) return;
    if (roomRef.current) return;
    // createRoom via businessRoom-kontraktet. Skickar in width/depth ur
    // interiorLayout så brewpubRoom bygger geometri i samma format
    // sim-lagret räknar i (OBB w869907975).
    const room = createRoom(roomClass, roomSizeFor(roomClass, layout.width, layout.depth));
    room.group.position.set(layout.centre[0], 0, layout.centre[1]);
    room.group.rotation.y = -layout.worldAngle;
    grp.add(room.group);
    roomRef.current = room;
    // ORDER 150 — publicera kontraktets värld-XZ:er så InteriorGuests
    // placerar 20 gäster på ölkrogens tjugo platser i stället för att
    // läsa restaurangens 16-stols-layout.
    const world = resolveWorldPositions(room);
    // ORDER 249 §2 — mata IndoorLamps med rummets bord-positioner.
    // ORDER 265 — ölkrogens rum publicerar inga `tables` (brewpubRoom.ts
    // resolveWorldPositions), så värdet var undefined och IndoorLamps
    // kraschade när spelaren bytte till ölkrogen i banken. Inga bord,
    // inga bordslampor.
    setTables((world.tables ?? []) as Vec2[]);
    if (roomClass === 'vinbaren') setWineBar(room.raw as WineBarRoom);
    // ORDER 204 — `resolveStaffStationsWorld` + `staffStationsByRole`
    // borttagna. Kontraktet publicerar `stations` (raw `staffStations`
    // världs-XZ, i deklarationsordning) och InteriorStaff läser den
    // flata listan direkt. Ingen roll-mapping via `stationFor`.
    // ORDER 221 §2 — bygg nav-grafen i rum-lokal XZ. Exempt-punkter =
    // seats (default 0.35 m radie, räcker för en enskild plats på
    // möbelkanten). Stationer behöver större radie eftersom personalen
    // står och arbetar i en workspace-yta som kan ligga i en narrow
    // slot mellan möbler (kvarterskrogens chef mellan spis och prep,
    // ölkrogens brewer i L-hörnet mellan tankraden och bryggverket).
    // 0.7 m öppnar en 1.4 m diameter walkable-zon runt varje station —
    // tillräckligt för approach + poseWork, utan att sudda ut hinder-
    // väggarna i angränsande passager (obstacle-inflate är 0.25 m så
    // en dörrpassage smalare än 1.0 m klipps först vid station-exempt).
    const exemptPoints: XZ[] = room.seats.map((s) => s.local as XZ);
    // Stationsexempt-radie 1.5 m. Se roomNav.ts:BuildOpts.exemptCircles-
     // kommentaren för resonemanget: workspaces ligger ibland i narrow
     // slots (ölkrogens brewer i L-hörnet mellan tankraden och brygg-
     // verket, kvarterskrogens chef mellan spis och prep), och exempt-
     // radien måste räcka för att bygga en gåbar bro genom slotens
     // hinder + inflate på båda sidor. Wall-clampen i buildNav ser till
     // att exempt aldrig läcker utanför ytterväggen.
    const exemptCircles = room.stations.map((s) => ({
      local: s.local as XZ, radius: 1.75
    }));
    const nav = buildNav(room.halfW, room.halfD, room.obstacles,
      { exemptPoints, exemptCircles });
    // Bakade transformer: rummet är statiskt efter mount så en bakad
    // yaw + origin räcker (rummet flyttar aldrig). Rummet är roterat
    // -layout.worldAngle rundt +Y från lokal.
    const roomYaw = room.group.rotation.y;
    const cosR = Math.cos(roomYaw);
    const sinR = Math.sin(roomYaw);
    const rx = room.group.position.x;
    const rz = room.group.position.z;
    const worldToLocalXZ = (world: XZ): XZ => {
      const dx = world[0] - rx;
      const dz = world[1] - rz;
      // Invers rotation: [cos, sin; -sin, cos].
      return [cosR * dx + sinR * dz, -sinR * dx + cosR * dz];
    };
    const localToWorldXZ = (local: XZ): XZ => {
      const lx = local[0];
      const lz = local[1];
      return [cosR * lx - sinR * lz + rx, sinR * lx + cosR * lz + rz];
    };

    businessRoomRef.current = {
      businessClass: roomClass,
      seats: world.seats as [number, number][],
      seatFacings: world.seatFacings as number[],
      // ORDER 200 fynd 1 — läs sitshöjd per plats från kontraktets
      // normaliserade `RoomSeat.seatHeight`. Brewpub-seat 0-11 = CHAIR_HEIGHT
      // (0.45 m), seat 12-19 = STOOL_HEIGHT (0.75 m). Utan denna publicering
      // hardcodade InteriorGuests 0.45 för alla 20 platser → 8 barstols-
      // gäster satt 30 cm under stolsäten.
      seatHeights: room.seats.map((s) => s.seatHeight),
      // ORDER 201 fynd 1 — brewpubRoom lägger golv-slabben på Y=0.11 (se
      // slabPlate `m.position.set(x, 0.11, z)` + alla möbel-Y `+ 0.11`).
      // Konstanten är onamngiven i brewpub men skriven som PLINTH_M i
      // restaurant/wineBar/inn/nightClub. InteriorGuests behöver den för
      // att inte placera pelvis 11 cm under sitten.
      plinth,
      standing: world.standing as [number, number][],
      // ORDER 204/205 — ölkrogens fyra stations (barkeep, brewer, cook, runner)
      // i deklarationsordning. Konsumeras av InteriorStaff.
      stations: world.staffStations as [number, number][],
      // ORDER 205 — parallell array med station-id (för DEV-warnings +
      // framtida Design-driven roll-mapping).
      stationIds: room.stations.map((s) => s.id),
      // ORDER 205 — parallell array med station-facing (radianer, värld-
      // koordinater = raw local facing + room.group.rotation.y). Konsumeras
      // av InteriorStaff för att räkna 0,6 m-hemplats framför stationen.
      stationFacings: room.stations.map((s) => s.facing + room.group.rotation.y),
      // ORDER 206 — kontraktet levererar per-roll hem-XZ+Y+facing.
      // InteriorStaff läser detta i stället för att räkna själv.
      // Mappning + 0,6 m-offset + floorY sker i businessRoom.staffHomeFor.
      staffHomesByRole: resolveStaffHomesWorldByRole(room),
      // ORDER 217 (C3 §3.2) — vägpunkter per roll i värld-XZ.
      staffPathsByRole: resolveStaffPathsWorldByRole(room),
      // ORDER 218 (C3 §3.2 uppföljning) — vägpunkter per säte i värld-XZ.
      walkPathsToSeatsByIndex: resolveWalkPathsToSeatsWorld(room),
      // ORDER 219 (A) — seat-positioner i ROOM-LOKAL XZ, för sim.seatSlot.
      seatsLocal: room.seats.map((s) => s.local as [number, number]),
      // ORDER 296 — sitsens sort, för hovmästarens zoner (sim/hostPins.ts).
      seatKinds: room.seats.map((s) => (s as { kind?: string }).kind ?? ''),
      entrance: world.entrance as [number, number],
      waitingSpot: world.waitingSpot as [number, number],
      // ORDER 203 — brewpub har idag ingen egen queue-form (vestibul
      // eller sidewalk-kö) i rumsfilen; passera igenom `layout.waitingSlots`
      // (OBB-generisk 2×4-form) tills en design-order öppnar den. Se
      // SharedBusinessRoom.waitingSlots-doc för framtida per-rum-formen.
      waitingSlots: layout.waitingSlots as [number, number][],
      capacity: room.capacity,
      // ORDER 221 §2 — gåbar-yta + transformer i samma commit som obstacle-
      // exporten. Konsumenter (InteriorStaff, InteriorGuests) läser detta
      // via businessRoomRef.
      nav: nav,
      worldToLocalXZ: worldToLocalXZ,
      localToWorldXZ: localToWorldXZ
    };
    return () => {
      const r = roomRef.current;
      if (r) {
        r.group.removeFromParent();
        r.dispose?.();
        roomRef.current = null;
      }
      if (businessRoomRef.current?.businessClass === roomClass) {
        businessRoomRef.current = null;
      }
      setWineBar(null);
      appliedRef.current = { mood: null, wall: null };
      cutRef.current = { yaw: NaN, x: NaN, z: NaN, d: NaN };
    };
  }, [isBrewpub, layout, roomClass]);

  useEffect(() => {
    return () => {
      disposeGeometry();
    };
  }, [disposeGeometry]);

  useFrame((state) => {
    const room = roomRef.current;
    if (!room) return;
    if (roomClass === 'vinbaren') {
      const raw = room.raw as WineBarRoom;
      // Stämningen och vinväggen byts bara när värdet ändras.
      if (appliedRef.current.mood !== mood) { setMood(raw, mood); appliedRef.current.mood = mood; }
      if (appliedRef.current.wall !== wallLevel) { setWineWallLevel(raw, wallLevel); appliedRef.current.wall = wallLevel; }
      // Skivtallriken går när DJ:n spelar (helgstämningen), ljuslågorna
      // fladdrar. Inget av det vid reducerad rörelse.
      const tSec = state.clock.elapsedTime;
      updateWineBarRoom(raw, djPlaying && !reducedMotion ? (tSec * 0.55) % 1 : 0, reducedMotion ? undefined : tSec);
      // Väggarna på kamerasidan kapas när kameran vridits eller flyttats,
      // inte varje bildruta (wineBarRoom FLAGS.cutaway).
      const a = actualRef.current;
      const c = cutRef.current;
      // ORDER 297 — taket lyfts och tonar ut mellan 40 och 26 m, och väggarna
      // kapas först när taket är under hälften (village/roofBlend.ts).
      const rk = roofAt(a.distance);
      applyWineBarRoof(raw, rk);
      if (rk >= CUT_BELOW) {
        if (c.d !== -1) { for (const u of Object.values(raw.parts.wallUpper)) u.visible = true; cutRef.current = { ...c, d: -1 }; }
      } else if (!(Math.abs(a.yaw - c.yaw) < 0.02 && Math.abs(a.focus.x - c.x) < 0.5 && Math.abs(a.focus.z - c.z) < 0.5 && Math.abs(a.distance - c.d) < 1)) {
        updateCutaway(raw, camera);
        cutRef.current = { yaw: a.yaw, x: a.focus.x, z: a.focus.z, d: a.distance };
      }
      const light = stageRef.current;
      if (light) {
        const open = sim.day.period === 'dinner' && sim.day.doorsOpenedThisService ? 1 : 0;
        const busy = open || sim.day.period === 'dinner' || sim.day.period === 'evening' ? 1 : 0;
        light.intensity = stageLightIntensity(rk, open, busy);
        light.position.set(room.group.position.x, STAGE_LIGHT.heightM, room.group.position.z);
        light.target.position.set(room.group.position.x, 0, room.group.position.z);
        light.target.updateMatrixWorld();
      }
    } else {
      updateRoom(room, 0);
    }
    // ORDER 184 — samma roof-fade som PlayerBusiness hade före den
    // skippades vid contract-monterat läge. Vid distance ≤ 28 m är
    // skalet helt borta; över 52 m helt opakt.
    // ORDER 297 — vinbarens skal tonas inte längre; taket sköts ovan.
    if (roomClass !== 'vinbaren') {
      const dist = actualRef.current.distance;
      setShellOpacity(room, shellOpacityForDistance(dist));
    }
  });

  if (!isBrewpub) return null;
  return (
    <>
      <group ref={groupRef} />
      <IndoorLamps tables={tables} />
      {isWineBar && wineBar && <WineBarFigures room={wineBar} mood={mood} />}
      {/* ORDER 297 — scenljuset när taket lyfts (village/roofBlend.ts). */}
      {isWineBar && <spotLight ref={stageRef} color="#ffe2b4" intensity={0} distance={STAGE_LIGHT.distance} angle={STAGE_LIGHT.angle} penumbra={STAGE_LIGHT.penumbra} decay={STAGE_LIGHT.decay} />}
    </>
  );
}

// ORDER 271 — kvällens två stämningar (wineBarRoom FLAGS.mood): 'helg' en
// fredag eller lördag från klockan 21 i speltid, annars 'tidig'. Designs
// två bilder är tisdag klockan sex och lördag klockan elva; gränsen 21.00
// är vårt val.
export const WINE_BAR_HELG_FROM_MINUTES = 21 * 60;
export function wineBarMood(sim: SimulationState): MoodId {
  const weekday = calendarFor(sim.day.dayNumber).weekday;
  if (weekday !== 'fri' && weekday !== 'sat') return 'tidig';
  return clockMinutes(sim) >= WINE_BAR_HELG_FROM_MINUTES ? 'helg' : 'tidig';
}
