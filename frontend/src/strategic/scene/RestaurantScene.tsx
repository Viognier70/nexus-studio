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
import { createRoom, updateRoom, type BusinessRoom } from './businessRoom';
import { disposeRestaurantGeometry } from './restaurantRoom';

export function RestaurantScene() {
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const groupRef = useRef<THREE.Group>(null);
  const roomRef = useRef<BusinessRoom | null>(null);

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
    return () => {
      const r = roomRef.current;
      if (r) {
        r.group.removeFromParent();
        r.dispose?.();
        roomRef.current = null;
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
  });

  if (!isRestaurant) return null;
  return <group ref={groupRef} />;
}
