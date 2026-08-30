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

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimState } from '../simulation/SimulationProvider';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { createRoom, updateRoom, type BusinessRoom } from './businessRoom';
import { disposeBrewpubGeometry } from './brewpubRoom';

export function BrewpubScene() {
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const groupRef = useRef<THREE.Group>(null);
  const roomRef = useRef<BusinessRoom | null>(null);

  const isBrewpub = sim.businessClass === 'ölkrogen';

  useEffect(() => {
    if (!isBrewpub) return;
    const grp = groupRef.current;
    if (!grp || !layout) return;
    if (roomRef.current) return;
    // createRoom via businessRoom-kontraktet. Skickar in width/depth ur
    // interiorLayout så brewpubRoom bygger geometri i samma format
    // sim-lagret räknar i (OBB w869907975).
    const room = createRoom('ölkrogen', {
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
  }, [isBrewpub, layout]);

  useEffect(() => {
    return () => {
      disposeBrewpubGeometry();
    };
  }, []);

  useFrame(() => {
    const room = roomRef.current;
    if (!room) return;
    updateRoom(room, 0);
  });

  if (!isBrewpub) return null;
  return <group ref={groupRef} />;
}
