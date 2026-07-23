import { Canvas } from '@react-three/fiber';
import { Suspense, type CSSProperties } from 'react';
import { CameraController } from '../camera/CameraController';
import type { Landmark } from '../content/world';
import { ChimneySmoke } from './ChimneySmoke';
import { CraftedLandmarks } from './CraftedLandmarks';
import { LandmarkGatherers } from './LandmarkGatherers';
import { OsmBoats } from './OsmBoats';
import { OsmBuildings } from './OsmBuildings';
import { OsmDistricts } from './OsmDistricts';
import { OsmForest } from './OsmForest';
import { OsmLandmarks } from './OsmLandmarks';
import { OsmPedestrians } from './OsmPedestrians';
import { OsmRoads } from './OsmRoads';
import { OsmTerrain } from './OsmTerrain';
import { OsmTraffic } from './OsmTraffic';
import { OsmWater } from './OsmWater';
import { StreetLabels } from './StreetLabels';

// GL config for stable rendering.
//
// * `logarithmicDepthBuffer` is intentionally OFF: it collides with
//   polygonOffset on many drivers and was a source of shimmering ground
//   layers in VS-02B. With the frustum tightened and ground layers placed
//   at distinct Y offsets, a standard 24-bit depth buffer is sufficient.
// * `antialias` softens the low-poly silhouettes at village scale.
const CANVAS_GL = {
  antialias: true,
  powerPreference: 'high-performance' as const,
  stencil: false
};
const CANVAS_DPR: [number, number] = [1, 2];
const CANVAS_CAMERA = { fov: 42, near: 2, far: 5000 };
const CANVAS_STYLE: CSSProperties = { position: 'absolute', inset: 0 };

interface Props {
  onSelect: (landmark: Landmark) => void;
  selectedId: string | null;
}

export function StrategicScene({ onSelect, selectedId }: Props) {
  return (
    <Canvas
      gl={CANVAS_GL}
      dpr={CANVAS_DPR}
      camera={CANVAS_CAMERA}
      shadows={false}
      style={CANVAS_STYLE}
    >
      <color attach="background" args={['#c3ccc9']} />
      <fog attach="fog" args={['#c3ccc9', 1400, 4200]} />
      <hemisphereLight args={['#f5efdd', '#485044', 0.95]} />
      <directionalLight
        position={[280, 380, 140]}
        intensity={1.05}
        color="#fdefcc"
      />
      <ambientLight intensity={0.38} />
      <Suspense fallback={null}>
        <OsmTerrain />
        <OsmDistricts />
        <OsmWater />
        <OsmForest />
        <OsmRoads />
        <OsmBuildings />
        <CraftedLandmarks />
        <OsmLandmarks onSelect={onSelect} selectedId={selectedId} />
        <OsmTraffic />
        <OsmPedestrians />
        <LandmarkGatherers />
        <OsmBoats />
        <ChimneySmoke />
        <StreetLabels />
      </Suspense>
      <CameraController />
    </Canvas>
  );
}
