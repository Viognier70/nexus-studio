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
import { OsmFences } from './OsmFences';
import { OsmYardSurfaces } from './OsmYardSurfaces';
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
import { DayLighting } from './DayLighting';
import { DeliveryVan } from './DeliveryVan';
import { InteriorGuests } from './InteriorGuests';
import { InteriorStaff } from './InteriorStaff';
import { MentorComment } from './MentorComment';
import { PlayerBusiness } from './PlayerBusiness';
import { Sky } from './Sky';
import { StreetLabels } from './StreetLabels';
import { PublicRealm } from './PublicRealm';
import { RetainingWalls } from './RetainingWalls';
import { StreetTrees } from './StreetTrees';
import { TorgetPlaza } from './TorgetPlaza';

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
      {/* ORDER 043 v3 step 1: hemisphere + directional + ambient
          lights are now period-driven by DayLighting. The lunch
          configuration reproduces the ORDER 042 baseline exactly
          (hemi #f5efdd/#5d6553 @0.95, sun [200,380,200] intensity
          1.05 colour #f7ecd0, ambient 0.32) so full-daylight scenes
          don't regress. Morning, afternoon, dinner and evening
          depart from that baseline. */}
      <DayLighting />
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
        <TorgetPlaza />
        <OsmYardSurfaces />
        <RetainingWalls />
        <OsmBuildings />
        <OsmFences />
        <StreetTrees />
        <PublicRealm />
        <OsmOutbuildings />
        <OsmParcelBoundaries />
        <OsmPropertyDetail />
        <OsmYards />
        <CraftedLandmarks />
        <CraftedLandmarksD2 />
        <PlayerBusiness />
        <InteriorGuests />
        <InteriorStaff />
        <DeliveryVan />
        <MentorComment />
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
