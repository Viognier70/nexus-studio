import { SceneSnapshot } from './SceneSnapshot';
import { Canvas } from '@react-three/fiber';
import { memo, Suspense, type CSSProperties } from 'react';
import * as THREE from 'three';
import { CameraController } from '../camera/CameraController';
import type { Landmark } from '../content/world';
import { BrewpubScene, WineBarScene } from './BrewpubScene';
import { RestaurantScene } from './RestaurantScene';
import { ChimneySmoke } from './ChimneySmoke';
import { ProceduralFacades } from './ProceduralFacades';
import { ScaleReference } from '../../scene/ScaleReference';
import { FpsProbe } from '../../lib/FpsProbe';
import { RenderProfileProbe } from '../../lib/RenderProfileProbe';
import { PixelSampleProbe } from '../../lib/PixelSampleProbe';
import { WallSurfaceAuditProbe } from '../../lib/WallSurfaceAuditProbe';
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
import { IncidentOutcomeBubble } from './IncidentOutcomeBubble';
import { MentorComment } from './MentorComment';
import { PlayerBusiness } from './PlayerBusiness';
import { StreetLabels } from './StreetLabels';
import { PublicRealm } from './PublicRealm';
import { RetainingWalls } from './RetainingWalls';
import { StreetTrees } from './StreetTrees';
import { TorgetPlaza } from './TorgetPlaza';
import { StreetLamps } from './village/StreetLamps';
import { VillageVenues } from './village/VillageVenues';
import { VillageLife } from './village/VillageLife';
import { StreetArrivals } from './village/StreetArrivals';
import { VillageWindows } from './village/VillageWindows';
import { OpeningMentor } from '../opening/OpeningMentor';

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

// ORDER 297b — scenen ritas om bara när dess egna props ändras. Utan memo
// renderade StrategicApp (som läser simuleringen) om hela Canvas-trädet vid
// varje simuleringssteg, med byns tusentals <Instance>-barn: den största
// kostnaden på byns nivå medan kvällen går (reports/order297b/profil-*.json).
// Komponenterna som följer simuleringen läser den själva (useSimState).
export const StrategicScene = memo(function StrategicScene({ onSelect, selectedId, showScaleRef = false }: Props) {
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
      {/* ORDER 285 — tidningens foto ur scenen. */}
      <SceneSnapshot />
      <Suspense fallback={null}>
        <group name="part:OsmTerrain"><OsmTerrain /></group>
        <group name="part:OsmDistricts"><OsmDistricts /></group>
        <group name="part:OsmWater"><OsmWater /></group>
        <group name="part:HorizonForest"><HorizonForest /></group>
        <group name="part:OsmForest"><OsmForest /></group>
        <group name="part:OsmMeadowVegetation"><OsmMeadowVegetation /></group>
        <group name="part:OsmRoads"><OsmRoads /></group>
        <group name="part:OsmDriveways"><OsmDriveways /></group>
        <group name="part:TorgetPlaza"><TorgetPlaza /></group>
        <group name="part:OsmYardSurfaces"><OsmYardSurfaces /></group>
        <group name="part:RetainingWalls"><RetainingWalls /></group>
        <group name="part:OsmBuildings"><OsmBuildings /></group>
        <group name="part:ProceduralFacades"><ProceduralFacades /></group>
        <group name="part:OsmFences"><OsmFences /></group>
        <group name="part:StreetTrees"><StreetTrees /></group>
        <group name="part:PublicRealm"><PublicRealm /></group>
        <group name="part:OsmOutbuildings"><OsmOutbuildings /></group>
        <group name="part:OsmParcelBoundaries"><OsmParcelBoundaries /></group>
        <group name="part:OsmPropertyDetail"><OsmPropertyDetail /></group>
        <group name="part:OsmYards"><OsmYards /></group>
        <group name="part:CraftedLandmarks"><CraftedLandmarks /></group>
        <group name="part:CraftedLandmarksD2"><CraftedLandmarksD2 /></group>
        <group name="part:PlayerBusiness"><PlayerBusiness /></group>
        <group name="part:RestaurantScene"><RestaurantScene /></group>
        <group name="part:BrewpubScene"><BrewpubScene /></group>
        <group name="part:WineBarScene"><WineBarScene /></group>
        <group name="part:InteriorGuests"><InteriorGuests /></group>
        <group name="part:InteriorStaff"><InteriorStaff /></group>
        {/* ORDER 292b — prototypgästen (AnimationPrototype.tsx) monteras inte:
            den satte sig på golvet där den gamla krogens stol stod. */}
        <group name="part:EntranceDoorPulse"><EntranceDoorPulse /></group>
        <group name="part:DeliveryVan"><DeliveryVan /></group>
        <group name="part:MentorComment"><MentorComment /></group>
        <group name="part:IncidentOutcomeBubble"><IncidentOutcomeBubble /></group>
        <group name="part:OsmLandmarks"><OsmLandmarks onSelect={onSelect} selectedId={selectedId} /></group>
        <group name="part:OsmTraffic"><OsmTraffic /></group>
        <group name="part:OsmPedestrians"><OsmPedestrians /></group>
        {/* ORDER 288 — byn och konkurrensen: gatlyktorna, krogarna som lyser
            när de har öppet (med etiketter i HUD-lagret), gästerna, bilarna,
            bussen och vagnarna, och vem som är på väg in på gatan. */}
        <group name="part:StreetLamps"><StreetLamps /></group>
        {/* ORDER 297 — byns fönster i kvällsljuset (Designs Byn i kvällsljus). */}
        <group name="part:VillageWindows"><VillageWindows /></group>
        <group name="part:VillageVenues"><VillageVenues /></group>
        <group name="part:VillageLife"><VillageLife /></group>
        <group name="part:StreetArrivals"><StreetArrivals /></group>
        <group name="part:LandmarkGatherers"><LandmarkGatherers /></group>
        <group name="part:OsmBoats"><OsmBoats /></group>
        <group name="part:ChimneySmoke"><ChimneySmoke /></group>
        <group name="part:StreetLabels"><StreetLabels /></group>
        {/* ORDER 308 — Ingrid i dörren till Måltidens hus, bara under öppningen. */}
        <group name="part:OpeningMentor"><OpeningMentor /></group>
        <RenderProfileProbe />
        <ScaleReference enabled={showScaleRef} halfSize={80} groundY={0.02} />
        {import.meta.env.DEV && <FpsProbe />}
        {import.meta.env.DEV && <PixelSampleProbe />}
        {import.meta.env.DEV && <WallSurfaceAuditProbe />}
        {import.meta.env.DEV && <CalibrationQuad />}
      </Suspense>
      <CameraController />
    </Canvas>
  );
});
