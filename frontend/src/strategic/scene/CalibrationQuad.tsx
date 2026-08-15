// ORDER 066 — dev-only calibration quad.
//
// A small MeshBasicMaterial plane anchored to the camera view-space
// so it appears at a fixed screen position regardless of camera
// pose. Rendered through the same Canvas pipeline as everything
// else — material → renderer.toneMappingExposure → ACES filmic
// tone map → sRGB output → framebuffer — so the sampled pixel value
// tests the full chain and not just a static overlay bypass.
//
// Chosen colour and expected post-pipeline sRGB value live in
// `calibration.ts`. This component only owns the geometry, transform,
// and material.
//
// Position math (at renderer FoV = 45° vertical, canvas 1280 × 720):
//   - Plane is a child of the R3F active camera, positioned at view-
//     space (0, 0, -3). "3 metres" in front of camera along its
//     forward direction.
//   - At z = -3, one view-space unit vertically spans
//     tan(22.5°) · 3 · 2 = 2.485 units in view-space height.
//   - 720 CSS pixels vertical → 2.485 / 720 ≈ 0.00345 view-space
//     units per CSS pixel.
//   - Plane size 0.5 × 0.5 in view space → 0.5 / 0.00345 ≈ 145 CSS
//     pixels on both axes. Centred on screen.
//   - ROI in visualPoses.ts (`calibration-quad` pose) is 60 × 60
//     centred at (640, 360) → sample sits safely inside the 145-px
//     quad with a healthy margin.
//
// Dev-only. Renders nothing in production builds — the URL param
// `#calibrationQuad=1` is the trigger and the whole component
// tree-shakes when `import.meta.env.DEV` is false.

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CALIBRATION_HEX } from '../testHarness/calibration';
import { harnessParams } from '../testHarness/urlParams';

const VIEW_SPACE_Z = -3;
const VIEW_SPACE_SIZE = 0.5;

export function CalibrationQuad() {
  const camera = useThree((s) => s.camera);
  const meshRef = useRef<THREE.Mesh>(null);

  // Reused vector — no per-frame allocation.
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(0, 0, VIEW_SPACE_Z), []);

  useFrame(() => {
    const m = meshRef.current;
    if (!m) return;
    // Follow the camera: place the mesh at the camera's world
    // position offset by VIEW_SPACE_Z along the camera's forward
    // vector, and match the camera's orientation so the plane
    // always faces the lens.
    worldPos.copy(forward).applyQuaternion(camera.quaternion).add(camera.position);
    m.position.copy(worldPos);
    m.quaternion.copy(camera.quaternion);
  });

  if (!import.meta.env.DEV || !harnessParams.calibrationQuad) return null;

  return (
    <mesh ref={meshRef} renderOrder={1000}>
      <planeGeometry args={[VIEW_SPACE_SIZE, VIEW_SPACE_SIZE]} />
      {/* MeshBasicMaterial: no lighting, colour writes straight into
          the material output → tone map → sRGB. `toneMapped: true`
          is the three.js default. `depthTest: false` so the quad
          always wins the depth test regardless of scene depth. */}
      <meshBasicMaterial
        color={CALIBRATION_HEX}
        depthTest={false}
        depthWrite={false}
        transparent={false}
      />
    </mesh>
  );
}
