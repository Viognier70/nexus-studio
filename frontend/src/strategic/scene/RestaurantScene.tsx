// ORDER 144 — kvarterskrogens rum monterat i strategiska scenen.
//
// Följer BrewpubScene-mönstret (ORDER 125). Skillnaden från förlagan:
// monteringen går via `businessRoom.ts`-kontraktet (`createRoom` /
// `updateRoom` / `resolveWorldPositions`), inte direkt mot
// `restaurantRoom.ts`. Det var hela poängen med kontraktet — se
// LEVERANS.md §Monteringsordning: "monteringskod mot rumsfilerna
// direkt får sex specialfall för sex saker som gör samma sak, och
// specialfall är där fel gömmer sig".
//
// Villkorat på `sim.businessClass === 'kvarterskrogen'`. Placering
// per interiorLayout-OBB (enda sanningen sedan ORDER 144 §twoLayouts
// — RESTAURANT_INTERIOR.bar/kitchen/tables/staffHomes raderade i
// samma order).
//
// `updateRoom(room, 0)` anropas varje bildruta — fläkten i spiskåpan
// får ingen fas eftersom köket saknar tillstånd (`FLAGS.kitchenStations`).

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimState } from '../simulation/SimulationProvider';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import {
  createRoom,
  resolveWorldPositions,
  resolveStaffStationsWorld,
  updateRoom,
  setShellOpacity,
  type BusinessRoom
} from './businessRoom';
import { disposeRestaurantGeometry } from './restaurantRoom';
import { businessRoomRef } from './interiorSharedState';
import { useCamera } from '../camera/CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';

// ORDER 184 — samma smoothstep-formel som PlayerBusinesss roof-fade.
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function RestaurantScene() {
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const groupRef = useRef<THREE.Group>(null);
  const roomRef = useRef<BusinessRoom | null>(null);
  const { actualRef } = useCamera();

  const isRestaurant = sim.businessClass === 'kvarterskrogen';

  useEffect(() => {
    if (!isRestaurant) return;
    const grp = groupRef.current;
    if (!grp || !layout) return;
    if (roomRef.current) return;
    // createRoom via businessRoom-kontraktet. Skickar in width/depth
    // ur interiorLayout så restaurantRoom bygger geometri i samma
    // format sim-lagret räknar i (OBB w869907975).
    const room = createRoom('kvarterskrogen', {
      width: layout.width,
      depth: layout.depth
    });
    room.group.position.set(layout.centre[0], 0, layout.centre[1]);
    room.group.rotation.y = -layout.worldAngle;
    grp.add(room.group);
    roomRef.current = room;
    // ORDER 150 — publicera kontraktets värld-XZ:er så InteriorGuests
    // placerar gäster på RUMMETS 16 platser i stället för att läsa
    // usePlayerBusinessInterior().seats (som fortfarande råkar vara
    // 16 för restaurangen men är restaurangspecifik ändå).
    const world = resolveWorldPositions(room);
    // ORDER 154 — publicera sim-rollernas hemstationer så InteriorStaff
    // kan läsa dem i stället för att räkna ur layout.entrance/bar/centre.
    const staffStationsByRole = resolveStaffStationsWorld(room);
    businessRoomRef.current = {
      businessClass: 'kvarterskrogen',
      seats: world.seats as [number, number][],
      standing: world.standing as [number, number][],
      stations: world.staffStations as [number, number][],
      entrance: world.entrance as [number, number],
      waitingSpot: world.waitingSpot as [number, number],
      capacity: room.capacity,
      staffStationsByRole
    };
    return () => {
      const r = roomRef.current;
      if (r) {
        r.group.removeFromParent();
        r.dispose?.();
        roomRef.current = null;
      }
      if (businessRoomRef.current?.businessClass === 'kvarterskrogen') {
        businessRoomRef.current = null;
      }
    };
  }, [isRestaurant, layout]);

  useEffect(() => {
    return () => {
      disposeRestaurantGeometry();
    };
  }, []);

  useFrame(() => {
    const room = roomRef.current;
    if (!room) return;
    // ORDER 144 — phase=0. Köket har inget tillstånd i sim-lagret,
    // och fläkten uppfinns inte. Följer §2.2 i restaurantRoom.FLAGS.
    updateRoom(room, 0);
    // ORDER 184 — samma roof-fade som PlayerBusiness hade före den
    // skippades vid contract-monterat läge. Utan detta står restaurangens
    // tak kvar när kameran zoomat in i myBusiness-preset och skymer
    // inredningen — samma fynd som drev ORDER 184.
    const dist = actualRef.current.distance;
    const shellOpacity = smoothstep(
      GRAY_BOX_CAMERA.restaurantRoofFadeMid - GRAY_BOX_CAMERA.restaurantRoofFadeHalf,
      GRAY_BOX_CAMERA.restaurantRoofFadeMid + GRAY_BOX_CAMERA.restaurantRoofFadeHalf,
      dist
    );
    setShellOpacity(room, shellOpacity);
  });

  if (!isRestaurant) return null;
  return <group ref={groupRef} />;
}
