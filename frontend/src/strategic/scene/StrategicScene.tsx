import { Canvas } from '@react-three/fiber';
import { Suspense, type CSSProperties } from 'react';
import { CameraController } from '../camera/CameraController';
import type { Landmark } from '../content/world';
import { ChimneySmoke } from './ChimneySmoke';
import { CraftedLandmarks } from './CraftedLandmarks';
import { CraftedLandmarksD2 } from './CraftedLandmarksD2';
import { LandmarkGatherers } from './LandmarkGatherers';
import { OsmBoats } from './OsmBoats';
import { OsmBuildings } from './OsmBuildings';
import { OsmDistricts } from './OsmDistricts';
import { OsmDriveways } from './OsmDriveways';
import { HorizonForest } from './HorizonForest';
import { OsmForest } from './OsmForest';
import { OsmLandmarks } from './OsmLandmarks';
import { OsmMeadowVegetation } from './OsmMeadowVegetation';
import { OsmOutbuildings } from './OsmProceduralOutbuildings';
import { OsmParcelBoundaries } from './OsmParcelBoundaries';
import { OsmPedestrians } from './OsmPedestrians';
import { OsmPropertyDetail } from './OsmPropertyDetail';
import { OsmYards } from './OsmYards';
import { OsmRoads } from './OsmRoads';
import { OsmTerrain } from './OsmTerrain';
import { OsmTraffic } from './OsmTraffic';
import { OsmWater } from './OsmWater';
import { Sky } from './Sky';
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
      {/* Background fallback matches the sky sphere horizon colour so
          any pixel that misses the sphere still reads consistent. */}
      <color attach="background" args={['#cdc8ba']} />
      {/* Fog colour tracks the sky horizon, so distant features fade
          into the horizon band rather than a mismatched grey. Fog
          starts earlier (1000 m) than the previous 1400 m so
          mid-distance features gain a hint of atmospheric perspective
          at village and district zoom. Far end pulled in to 3600 m so
          the fog envelope stays inside the sky sphere. */}
      <fog attach="fog" args={['#cdc8ba', 1000, 3600]} />
      {/* Hemisphere: sky-side warm cream, ground-side updated to match
          the new three-octave terrain palette (average tone shifted from
          the earlier #485044 dark-green to a slightly warmer #5d6553).
          The bounce onto meshes now agrees with the terrain colour
          instead of pulling everything toward pine-forest green. */}
      <hemisphereLight args={['#f5efdd', '#5d6553', 0.95]} />
      {/* Directional (sun): nudged from the earlier east-heavy (280, 380,
          140) toward a more typical Bergslag midday (200, 380, 200) —
          equally east and south, ~62° altitude, so the shadow angle
          reads as "daytime" rather than "morning". Colour cooled a
          hair from #fdefcc → #f7ecd0 so it doesn't over-warm the
          Faluröd houses. */}
      <directionalLight
        position={[200, 380, 200]}
        intensity={1.05}
        color="#f7ecd0"
      />
      <ambientLight intensity={0.32} />
      <Suspense fallback={null}>
        <Sky />
        <OsmTerrain />
        <OsmDistricts />
        <OsmWater />
        <HorizonForest />
        <OsmForest />
        <OsmMeadowVegetation />
        <OsmRoads />
        <OsmDriveways />
        <OsmBuildings />
        <OsmOutbuildings />
        <OsmParcelBoundaries />
        <OsmPropertyDetail />
        <OsmYards />
        <CraftedLandmarks />
        <CraftedLandmarksD2 />
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
