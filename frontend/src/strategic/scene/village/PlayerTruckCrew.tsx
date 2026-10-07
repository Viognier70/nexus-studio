// ORDER 315b del 2 — besättningen i spelarens vagn (Designs D7 playerTruck.ts TRUCK_CREW,
// truckClips.ts): en vid grillen (truck.grill, i loop) och en vid luckan (truck.wipeCounter i
// loop, truck.hatchServe när en gäst har fått sin mat). Stationerna i vagnens ram
// (TRUCK_LAYOUT.stations), vagnens golv 0,5 m upp. Syns när foodtrucken har öppet i kväll.
// Tempot följer kön: stressad med fler än QUEUE_STRESSED som väntar.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { applyPose, createFigureRig } from '../figureRig';
import { CLIPS, sampleClip, type TempoId } from '../figureClips';
import { TRUCK_CREW, TRUCK_LAYOUT } from '../playerTruck';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { useSimState } from '../../simulation/SimulationProvider';

const FLOOR_Y_M = 0.5;
const QUEUE_STRESSED = 4;
const QUEUE_CALM = 1;

export function PlayerTruckCrew() {
  const sim = useSimState();
  const crew = useMemo(() => {
    const grill = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.grill.uniform });
    const hatch = createFigureRig({ variant: 'staff', garmentColour: TRUCK_CREW.hatch.uniform });
    const g = new THREE.Group();
    g.name = 'playerTruckCrew';
    const at = playerTruckPlacement();
    g.position.set(at.x, 0, at.z);
    g.rotation.y = at.rotationY;
    // Grillaren vänd mot gallret (−Z), den vid luckan mot luckan (+Z).
    grill.root.position.set(TRUCK_LAYOUT.stations.grill[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.grill[1]);
    grill.root.rotation.y = Math.PI;
    hatch.root.position.set(TRUCK_LAYOUT.stations.hatch[0], FLOOR_Y_M, TRUCK_LAYOUT.stations.hatch[1]);
    g.add(grill.root, hatch.root);
    return { g, grill, hatch };
  }, []);
  useEffect(() => () => { crew.grill.materials.forEach((m) => m.dispose()); crew.hatch.materials.forEach((m) => m.dispose()); }, [crew]);

  const served = useRef({ count: -1, at: -Infinity });
  const open = sim.economy.businessClass === 'foodtruck' && (sim.day.period === 'dinner' || sim.day.period === 'lunch');
  useFrame((state) => {
    crew.g.visible = open;
    if (!open) return;
    const t = state.clock.elapsedTime;
    const waiting = sim.waitingIds.length;
    const tempo: TempoId = waiting > QUEUE_STRESSED ? 'stressed' : waiting > QUEUE_CALM ? 'normal' : 'calm';
    const stress = tempo === 'stressed' ? 1 : tempo === 'normal' ? 0.5 : 0;
    applyPose(crew.grill, sampleClip('truck.grill', t, tempo, { stress }).pose);
    // En gäst som fått sin mat (dagens notor) ger ett varv truck.hatchServe.
    const bills = sim.day.billsTonight ?? 0;
    if (served.current.count < 0) served.current.count = bills;
    if (bills > served.current.count) { served.current = { count: bills, at: t }; }
    const serveLen = CLIPS['truck.hatchServe'].seconds[tempo];
    const since = t - served.current.at;
    const pose = since < serveLen
      ? sampleClip('truck.hatchServe', since, tempo, { stress, hand: 'L' }).pose
      : sampleClip('truck.wipeCounter', t, tempo, { stress }).pose;
    applyPose(crew.hatch, pose);
  });
  return <primitive object={crew.g} />;
}
