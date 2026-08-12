import { Canvas } from '@react-three/fiber';
import { Suspense, type CSSProperties } from 'react';
import * as THREE from 'three';
import { CameraController } from '../camera/CameraController';
import type { Landmark } from '../content/world';
import { AnimationPrototype } from './AnimationPrototype';
import { ChimneySmoke } from './ChimneySmoke';
import { ProceduralFacades } from './ProceduralFacades';
import { ScaleReference } from '../../scene/ScaleReference';
import { FpsProbe } from '../../lib/FpsProbe';
import { PixelSampleProbe } from '../../lib/PixelSampleProbe';
import { CalibrationQuad } from './CalibrationQuad';
import { CraftedLandmarks } from './CraftedLandmarks';
import { EntranceDoorPulse } from './EntranceDoorPulse';
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
// * ORDER 054 Del D — ACES filmic tone map + sRGB output. This step
//   alone changes the whole image; do material work AFTER this or
//   you'll be tuning materials against the wrong picture.
// ORDER 061 point 3 — DEV builds need `preserveDrawingBuffer: true`
// so the PixelSampleProbe can readPixels off the default framebuffer.
// With the WebGL default `preserveDrawingBuffer: false`, the browser
// is free to discard the backbuffer after present() — subsequent
// readPixels returns zeros regardless of what was rendered. Prod
// builds stay on the default so the browser can do zero-copy present.
const CANVAS_GL = {
  antialias: true,
  powerPreference: 'high-performance' as const,
  stencil: false,
  toneMapping: THREE.ACESFilmicToneMapping,
  // ORDER 055 Del C — exposure 1.0 combined with the pre-Del-C
  // intensity ramp gave dusk-at-noon. Raised to 1.3 alongside the
  // sun intensity bump so mid-day reads as clear light.
  toneMappingExposure: 1.3,
  outputColorSpace: THREE.SRGBColorSpace,
  preserveDrawingBuffer: import.meta.env.DEV
};
const CANVAS_DPR: [number, number] = [1, 2];
const CANVAS_CAMERA = { fov: 42, near: 2, far: 5000 };
const CANVAS_STYLE: CSSProperties = { position: 'absolute', inset: 0 };
// ORDER 054 Del C — soft PCF shadows. Frustum tightness is enforced
// by SunLightRig (not the far plane), so a big far-plane doesn't blow
// out shadow resolution.
const CANVAS_SHADOWS = { type: THREE.PCFSoftShadowMap };

interface Props {
  onSelect: (landmark: Landmark) => void;
  selectedId: string | null;
  // ORDER 053 Del D — dev-only scale-reference overlay.
  showScaleRef?: boolean;
}

export function StrategicScene({ onSelect, selectedId, showScaleRef = false }: Props) {
  return (
    <Canvas
      gl={CANVAS_GL}
      dpr={CANVAS_DPR}
      camera={CANVAS_CAMERA}
      shadows={CANVAS_SHADOWS}
      style={CANVAS_STYLE}
    >
      {/* ORDER 055 Del D — background + fog are now owned by SunLightRig
          (via DayLighting) so they track the sun elevation each frame.
          DayLighting passes fogRange=[1000, 3600] appropriate to the
          village-scale scene. */}
      <DayLighting />
      <Suspense fallback={null}>
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
        <ProceduralFacades />
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
        <AnimationPrototype />
        <EntranceDoorPulse />
        <DeliveryVan />
        <MentorComment />
        <OsmLandmarks onSelect={onSelect} selectedId={selectedId} />
        <OsmTraffic />
        <OsmPedestrians />
        <LandmarkGatherers />
        <OsmBoats />
        <ChimneySmoke />
        <StreetLabels />
        <ScaleReference enabled={showScaleRef} halfSize={80} groundY={0.02} />
        {import.meta.env.DEV && <FpsProbe />}
        {import.meta.env.DEV && <PixelSampleProbe />}
        {import.meta.env.DEV && <CalibrationQuad />}
      </Suspense>
      <CameraController />
    </Canvas>
  );
}
