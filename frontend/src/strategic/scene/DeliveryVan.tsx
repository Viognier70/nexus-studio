// ORDER 043 §6 — the ecological phenomenon rendered.
//
// state.delivery has been driven by the reducer since ORDER 042 but was
// rendered nowhere; scene/Traffic.tsx has a delivery van that uses its
// own local ref state, unconnected to the sim. This component connects
// the sim's delivery cycle to a concrete van that arrives at the
// player business's delivery bay (the -X end of the OBB, opposite the
// entrance) and leaves.
//
// The rhythm is the reading: at high ecological capital the van comes
// often; at low ecological capital the cooldown between arrivals
// stretches and the van appears rarely. There is no static crate, no
// static badge — the delivery bay is empty when the van is not present,
// and the van's presence itself is the phenomenon.
//
// Van shape: a compact box (3 m long along the OBB's long axis × 1.8 m
// wide × 2.0 m tall) so it reads as a small delivery van at strategic
// zoom. Rotated to match the OBB so it drives straight into the bay
// along the building's own axis. Fades in/out with a small opacity
// ramp at the start and end of the trip so it doesn't pop.

import { deliveryStop } from '../business/deliveryStop';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';
import { playerTruckPlacement } from '../content/villagePlaces';
import { THEATRE } from '../../sim/balance';
import { alongPath, pathLength, truckDeliveryPath } from './village/truckDelivery';

// ORDER 319a.4 — leveransen till spelarens vagn (förvarningen 'delivery'): bilen kör ut i den här
// farten när situationen är avgjord, i meter per verklig sekund.
const TRUCK_VAN_OUT_MPS = 9;

const VAN_LENGTH_M = 3.0;   // along OBB local X
const VAN_WIDTH_M = 1.8;    // along OBB local Z
const VAN_HEIGHT_M = 2.0;   // along Y
const VAN_Y = VAN_HEIGHT_M / 2 + 0.05;
const TRUCK_VAN_TOP_M = VAN_HEIGHT_M;
const VAN_COLOUR = '#7a8f4a';   // sage / olive — evokes a produce truck
const VAN_TRIM_COLOUR = '#3a3020';

// Trip shape as a function of state.delivery.progress ∈ [0, 1]:
//   0.00 → 0.35   drive in from approach to bay
//   0.35 → 0.70   parked at bay (unloading)
//   0.70 → 1.00   reverse out to approach
// The reducer runs one full 0→1 cycle over ~12 sim-sec, so the drive-in
// and drive-out are ~4 sim-sec each and the pause is also ~4 sim-sec.
const DRIVE_IN_END = 0.35;
const DWELL_END = 0.70;
const FADE_WINDOW = 0.05; // opacity ramps over the first/last 5% of the trip

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function progressPosition(
  progress: number,
  approach: [number, number],
  bay: [number, number]
): [number, number] {
  if (progress <= DRIVE_IN_END) {
    // Drive in.
    const t = progress / DRIVE_IN_END;
    return [lerp(approach[0], bay[0], t), lerp(approach[1], bay[1], t)];
  }
  if (progress <= DWELL_END) {
    // Dwell at the bay.
    return [bay[0], bay[1]];
  }
  // Drive out.
  const t = (progress - DWELL_END) / (1 - DWELL_END);
  return [lerp(bay[0], approach[0], t), lerp(bay[1], approach[1], t)];
}

function progressOpacity(progress: number): number {
  // Fade in during the first FADE_WINDOW of the drive-in, fade out
  // during the last FADE_WINDOW of the drive-out. Dwell is fully opaque.
  if (progress < FADE_WINDOW) return progress / FADE_WINDOW;
  if (progress > 1 - FADE_WINDOW) return (1 - progress) / FADE_WINDOW;
  return 1;
}

export function DeliveryVan() {
  const layout = usePlayerBusinessInterior();
  const sim = useSimState();
  const groupRef = useRef<THREE.Group>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const cabMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera } = useThree();
  // ORDER 319a.4 — bilens resa till vagnen: in under förvarningen, parkerad under situationen, ut efter.
  const truckTrip = useRef<{ path: [number, number][]; length: number; s: number; phase: 'in' | 'parked' | 'out'; incidentId: string } | null>(null);
  const view = useMemo(() => ({ f: new THREE.Frustum(), m: new THREE.Matrix4(), p: new THREE.Vector3() }), []);

  // Geometry is stable across renders; only position/opacity change per
  // frame. Group holds two boxes (body + cab) so the shape reads as a
  // van rather than a single blob.
  const geom = useMemo(
    () => ({
      body: new THREE.BoxGeometry(VAN_LENGTH_M * 0.7, VAN_HEIGHT_M, VAN_WIDTH_M),
      cab: new THREE.BoxGeometry(VAN_LENGTH_M * 0.35, VAN_HEIGHT_M * 0.85, VAN_WIDTH_M)
    }),
    []
  );

  useFrame((_, delta) => {
    if (!layout || !groupRef.current) return;
    const g = groupRef.current;
    // ORDER 319a.4 — i foodtrucken kör bilen till vagnen när en situation börjar med leveransen; byns
    // vanliga leveranser till krogens hus hör inte till vagnen.
    if (sim.economy.businessClass === 'foodtruck') {
      const a = sim.incidents?.active;
      let trip = truckTrip.current;
      if (!trip && a?.cue === 'delivery' && (a.introLeft ?? 0) > 0) {
        camera.updateMatrixWorld();
        view.f.setFromProjectionMatrix(view.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        const inView = (x: number, z: number) => [0, TRUCK_VAN_TOP_M].some((y) => view.f.containsPoint(view.p.set(x, y, z)));
        const path = truckDeliveryPath(playerTruckPlacement(), inView);
        trip = truckTrip.current = { path, length: pathLength(path), s: 0, phase: 'in', incidentId: a.id };
      }
      if (!trip) { g.visible = false; return; }
      const here = a?.id === trip.incidentId;
      if (trip.phase === 'in') {
        trip.s = trip.length * (1 - Math.max(0, here ? a!.introLeft ?? 0 : 0) / THEATRE.cueSeconds.delivery);
        if (!here || (a!.introLeft ?? 0) <= 0) trip.phase = 'parked';
      }
      if (trip.phase === 'parked' && !here) trip.phase = 'out';
      if (trip.phase === 'out') trip.s -= TRUCK_VAN_OUT_MPS * Math.min(0.1, delta);
      if (trip.s <= 0 && trip.phase === 'out') { truckTrip.current = null; g.visible = false; return; }
      const p = alongPath(trip.path, trip.s);
      const [dx, dz] = [Math.sin(p.heading), Math.cos(p.heading)];
      g.visible = true;
      g.position.set(p.x, VAN_Y, p.z);
      // Hytten (lokala +x) framåt: in mot vagnen, ut därifrån.
      g.rotation.y = trip.phase === 'out' ? Math.atan2(dz, -dx) : Math.atan2(-dz, dx);
      for (const mat of [bodyMatRef.current, cabMatRef.current]) if (mat && mat.opacity !== 1) { mat.opacity = 1; mat.transparent = false; mat.needsUpdate = true; }
      return;
    }
    const d = sim.delivery;
    if (!d.active) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // ORDER 312 — bilen stannar på gatan bakom krogen (business/deliveryStop.ts),
    // inte på gården: lastplatsen i layouten är husets baksida, bilens väg
    // går längs den ritade körbanan. Utan gata bakom huset: som förut.
    const stop = deliveryStop(layout);
    const [wx, wz] = stop
      ? progressPosition(d.progress, stop.approach, stop.bay)
      : progressPosition(d.progress, layout.deliveryApproach, layout.deliveryBay);
    g.position.set(wx, VAN_Y, wz);
    // Bilen längs gatan (lokala +x, hytten, mot lastplatsen); utan gata
    // längs rummets axel som förut (rotation-Y = -worldAngle).
    g.rotation.y = stop ? stop.rotationY : -layout.worldAngle;
    const op = progressOpacity(d.progress);
    for (const mat of [bodyMatRef.current, cabMatRef.current]) {
      if (!mat) continue;
      mat.opacity = op;
      const wantTransparent = op < 0.99;
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
    }
  });

  if (!layout) return null;

  return (
    <group ref={groupRef} visible={false}>
      {/* Cargo body — longer, slightly forward on the local X axis so the
          cab reads as being at the "front" of the van. */}
      <mesh geometry={geom.body} position={[-VAN_LENGTH_M * 0.15, 0, 0]}>
        <meshStandardMaterial
          ref={bodyMatRef}
          color={VAN_COLOUR}
          roughness={0.75}
          metalness={0.15}
          transparent
        />
      </mesh>
      {/* Cab — shorter, at the front (positive local X) so the van faces
          the bay when driving in. Slightly shorter Y for a small
          silhouette break between cab + body. */}
      <mesh
        geometry={geom.cab}
        position={[VAN_LENGTH_M * 0.325, -VAN_HEIGHT_M * 0.075, 0]}
      >
        <meshStandardMaterial
          ref={cabMatRef}
          color={VAN_TRIM_COLOUR}
          roughness={0.6}
          metalness={0.25}
          transparent
        />
      </mesh>
    </group>
  );
}
