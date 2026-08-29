// ORDER 125 §3 — ölkrogens rum monterat i strategiska scenen.
//
// Villkorat på `sim.businessClass === 'ölkrogen'`. När klassen är vald
// skapas rummet via `createBrewpubRoom` en gång (imperativt, med egen
// grupp) och läggs som barn till en THREE.Group under vår ref.
// Placeringen sker per handoff/-koden:
//   room.group.position.set(obb.centre[0], 0, obb.centre[1]);
//   room.group.rotation.y = -obb.angle;
// `resolveWorldPositions(room)` är tillgänglig för sim-lagret men
// anropas inte här — den är bara för framtida integration av
// gästplaceringar med figureRig.
//
// `updateBrewpubRoom(room, phase)` anropas varje bildruta med
// `phase = 0` per §5-flaggan `brewPhase` — produktionstillstånd
// finns inte i sim-lagret ännu och phasen får inte uppfinnas.

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimState } from '../simulation/SimulationProvider';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import {
  createBrewpubRoom,
  updateBrewpubRoom,
  disposeBrewpubGeometry,
  type BrewpubRoom
} from './brewpubRoom';

export function BrewpubScene() {
  const sim = useSimState();
  const layout = usePlayerBusinessInterior(sim.businessClass);
  const groupRef = useRef<THREE.Group>(null);
  const roomRef = useRef<BrewpubRoom | null>(null);

  const isBrewpub = sim.businessClass === 'ölkrogen';

  // Skapa rummet en gång när ölkrogen är vald + gruppen är monterad.
  // Fäst rummet på gruppen och positionera per PLAYER_BUSINESS-OBB.
  useEffect(() => {
    if (!isBrewpub) return;
    const grp = groupRef.current;
    if (!grp || !layout) return;
    if (roomRef.current) return; // idempotent — endast första gången
    const room = createBrewpubRoom();
    room.group.position.set(layout.centre[0], 0, layout.centre[1]);
    room.group.rotation.y = -layout.worldAngle;
    grp.add(room.group);
    roomRef.current = room;
    return () => {
      const r = roomRef.current;
      if (r) {
        r.group.removeFromParent();
        roomRef.current = null;
      }
    };
  }, [isBrewpub, layout]);

  // Dispose delade geometrier när komponenten avmonteras helt.
  useEffect(() => {
    return () => {
      disposeBrewpubGeometry();
    };
  }, []);

  useFrame(() => {
    const room = roomRef.current;
    if (!room) return;
    // ORDER 125 §5 — brewPhase FLAGGAT. phase=0 tills produktionstillstånd
    // finns i sim-lagret. Uppfinns inte.
    updateBrewpubRoom(room, 0);
  });

  if (!isBrewpub) return null;
  return <group ref={groupRef} />;
}
