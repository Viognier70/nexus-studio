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

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';

const VAN_LENGTH_M = 3.0;   // along OBB local X
const VAN_WIDTH_M = 1.8;    // along OBB local Z
const VAN_HEIGHT_M = 2.0;   // along Y
const VAN_Y = VAN_HEIGHT_M / 2 + 0.05;
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

  useFrame(() => {
    if (!layout || !groupRef.current) return;
    const g = groupRef.current;
    const d = sim.delivery;
    if (!d.active) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const [wx, wz] = progressPosition(d.progress, layout.deliveryApproach, layout.deliveryBay);
    g.position.set(wx, VAN_Y, wz);
    // Rotate the van to align with the OBB's long axis (same convention
    // as tables + bar in PlayerBusiness). mesh rotation-Y = -worldAngle.
    g.rotation.y = -layout.worldAngle;
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
