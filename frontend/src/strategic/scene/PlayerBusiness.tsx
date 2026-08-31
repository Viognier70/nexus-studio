// The player-owned business, rendered in the strategic scene.
//
// ORDER 042 §3.1: an OSM building becomes the player's premises. The
// specific building id lives in PLAYER_BUSINESS_BUILDING_IDS in
// world.ts; this component reads whichever id is registered there so a
// building swap requires no code change here. Currently: `w869907975`
// (Candidate A, Torget south edge, 146 m²) — corrected from
// `w869907963` on 2026-07-30 after the ORDER 041 §6 filter-miss
// surfaced (see APPROXIMATION_REGISTER.md entry and world.ts comment).
//
// The building reads as *yours* — carries its name above the roof, and
// its roof crossfades transparent when the camera zooms below the
// interior threshold so the interior is reachable by zoom alone (no
// mode picker, per CAMERA_AND_GAMEPLAY_BIBLE.md §4.1).
//
// This component replaces OsmBuildings' rendering of the registered
// building (which sits in LANDMARK_BUILDING_IDS so OsmBuildings skips
// it). It draws:
//   - Walls, extruded from the OSM footprint at a fixed height
//   - A roof cap whose opacity fades with camera distance
//   - A stub interior (floor, bar, tables, entrance marker) below the roof
//   - A drei <Html> label with the business name above the roof
//
// Interior geometry sizes itself from the building's bbox (dynamic), so
// a building swap adapts the table layout automatically — a compact
// ~150 m² café-scale footprint gives ~6 small tables; a larger 250 m²
// footprint gives more room per table.
//
// Crossfade thresholds live in GRAY_BOX_CAMERA (already authored per
// CAMERA_AND_GAMEPLAY_BIBLE.md §4.1):
//   - restaurantRoofFadeMid: 40      restaurantRoofFadeHalf: 12
//   - restaurantInteriorFadeMid: 55  restaurantInteriorFadeHalf: 20

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useBusiness } from '../business/BusinessContext';
import { usePlayerBusinessInterior } from '../business/interiorLayout';
import { useSimState } from '../simulation/SimulationProvider';
import { skyState } from '../../lib/lighting/skyState';
import { strings } from '../../content/strings.sv';

// Business volume constants — the D01 historic-centre building is a
// two-storey sit-down restaurant per ORDER 042 §1.
// ORDER 054 Del A — the 6.5 m wall is decomposed into the parts a real
// façade carries, so a reader can see what the number means and adjust
// one piece without touching the others:
//   sockel (grundmur, water-table)                    0.35 m
//   floor 1 (våningshöjd per ORDER 053 unit contract) 2.70 m
//   floor 2 (våningshöjd per ORDER 053 unit contract) 2.70 m
//   takfot (eaves + gutter band)                      0.75 m
//   ---------------------------------------------------
//   total (WALL_HEIGHT_M)                             6.50 m
const WALL_SOCKEL_M     = 0.35;
const WALL_FLOOR_HEIGHT_M = 2.70;
const WALL_FLOOR_COUNT  = 2;
const WALL_TAKFOT_M     = 0.75;
const WALL_HEIGHT_M     =
  WALL_SOCKEL_M + WALL_FLOOR_HEIGHT_M * WALL_FLOOR_COUNT + WALL_TAKFOT_M;
const ROOF_RIDGE_ADD_M = 2.4;
// ORDER 054 Del D — Falu red baseline (~#7C2E24 per spec), keeping the
// restaurant a shade cooler-darker than the residential palette so the
// building reads as "public house / krog" not "villa".
const WALL_COLOUR = '#7c2e24';
const ROOF_COLOUR = '#3a2e20';
const TRIM_COLOUR = '#efe6d4';

// ORDER 159 — plinth (stenbas / grundmur), portad från OsmBuildings.tsx
// BuildingPlinth med commercial-tier defaults. Utan denna renderas
// PlayerBusiness som svävande låda — se OsmBuildings.tsx:670 "omitting
// it makes procedural houses read as timber floating on grass". Grannar
// i `PLINTH_KINDS` får plinthen automatiskt; spelarens byggnad filtreras
// bort av `LANDMARK_BUILDING_IDS` innan OsmBuildings, så vi ritar den
// själva här. Lokal kopia (ORDER 159 §2 val B) — ingen ny cross-module-
// koppling mot OsmBuildings.
//
// Höjd 0,42 m: OsmBuildings.tsx:1071 `wealth === 'commercial'`-defaultet.
// Inset 0,35 m + extra 0,1 m (samma som BuildingPlinth): plinthen sitter
// 10 cm bredare än ridge-facen så den läser som stenbas som väggen sitter
// PÅ, inte en list som väggen döljer. Färg #8a8478: OsmBuildings.tsx:1077
// standard-tier gråmurgrå. `castShadow` toggle:as i useFrame per ORDER
// 055 Del A tillsammans med väggopaciteten.
const PLINTH_HEIGHT_M = 0.42;
const PLINTH_INSET_M = 0.35;
const PLINTH_OUTWARD_M = 0.1;
const PLINTH_COLOUR = '#8a8478';

// Interior stub — floor + a handful of tables in the pattern
// RESTAURANT_INTERIOR uses in content/grythyttan.ts. Not the final
// interior; enough to say "this is a restaurant floor plan" when the
// camera crosses the roof-fade threshold.
const INTERIOR_FLOOR_COLOUR = '#a08462';
const TABLE_COLOUR = '#e5d5b8';
// The 4-top gets a distinct tint so the Option 1 mix (four 2-tops + one
// 4-top) reads unambiguously from bird's-eye — five uniform brown boxes
// look like an indistinct row and the 4-top gets lost.
const FOURTOP_COLOUR = '#c9a878';
const BAR_COLOUR = '#5a3f2d';

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Build a THREE.Shape from the raw OSM polygon (with the -y flip that
// every other shape-based renderer uses — see feedback memory
// `feedback_transform_frame_convention.md`).
function polygonShape(poly: readonly [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(poly[0][0], -poly[0][1]);
  for (let i = 1; i < poly.length; i++) {
    shape.lineTo(poly[i][0], -poly[i][1]);
  }
  shape.closePath();
  return shape;
}

// Build the building's side walls as a set of quads — no top or bottom
// cap. Fixes the ORDER 042 §3.2 close-zoom tint bug: ExtrudeGeometry
// puts a solid cap face at Y=WALL_HEIGHT_M covering the whole footprint,
// and when the wall material fades to 50% alpha that cap draws as a
// large translucent brown-red rectangle across the view. The roof cap
// (capGeo) is a separate mesh with its own fade to 0, so removing the
// wall's cap doesn't leave the building open — it leaves the wall
// geometry as literal walls.
//
// DoubleSide keeps things correct from both inside and outside without
// needing to reason about winding direction per building; the polygon
// count is 4–8 so the doubled fill rate is negligible.
function sideWallGeometry(
  poly: readonly [number, number][],
  height: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let base = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    // Outward-facing normal candidate; the sign flips per polygon
    // winding but DoubleSide renders both sides correctly regardless.
    const nx = -dz / len;
    const nz =  dx / len;
    positions.push(a[0], 0,      a[1]);
    positions.push(b[0], 0,      b[1]);
    positions.push(b[0], height, b[1]);
    positions.push(a[0], height, a[1]);
    normals.push(nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

export function PlayerBusiness() {
  const { business, hasName } = useBusiness();
  const { actualRef } = useCamera();
  const layout = usePlayerBusinessInterior();
  // ORDER 057 Del B — restaurant glow. During service (lunch/dinner)
  // the wall picks up a warm emissive tint at night; outside service
  // it still glows a little to read as "the venue is here" but less.
  const sim = useSimState();

  const wallMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const roofMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  // ORDER 159 — plinth-refs. Följer samma ref-mönster som vägg och tak
  // (mesh + material) för att kunna toggla opacity + castShadow per
  // ORDER 055 Del A i samma useFrame. Se PLINTH_HEIGHT_M-konstantens
  // header för portnings-motivering.
  const plinthMeshRef = useRef<THREE.Mesh>(null);
  const plinthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  // ORDER 055 Del A — mesh refs so we can toggle castShadow alongside
  // opacity. A shadow-caster with opacity=0 still stamps the shadow
  // map (the depth pass ignores alpha), which is exactly what we saw:
  // a fully-faded roof projected a rectangle on the plaza.
  const wallMeshRef = useRef<THREE.Mesh>(null);
  const roofMeshRef = useRef<THREE.Mesh>(null);
  const interiorGroupRef = useRef<THREE.Group>(null);
  // Vision Owner 2026-08-15 — interior fill light. At dinner the
  // sun is at −5° elevation in autumn Grythyttan, so SunLightRig
  // contributes 0; only hemi (0.55) + moon (0.35) reach the room.
  // Guests read as dark blobs against a dark room. The fix is a
  // warm pointLight inside the building, gated on the same
  // nightFactor × serviceGain ramp as the wall emissive — the room
  // is *tänd* and the guests are lit by it. Not an emissive on the
  // guest material: a self-lit puck reads as symbol (same objection
  // that fell the opacity pulse in ORDER 044 §3.3).
  const interiorLightRef = useRef<THREE.PointLight>(null);

  // ORDER 159 §DoD 3 — dev-hook för playwright-verifiering av
  // sockelhöjden. Exponerar en funktion som räknar plinth-meshens
  // world-bounding-box (rätt källa: den faktiska renderade meshen,
  // efter matrix-updates), returnerar {yMin, yMax, heightM}. Så
  // verifieringstalet kommer ur three.js scenens output — inte ur
  // en konstant som scriptet också själv skulle citera, och inte
  // ur en JSDoc någon manuellt hämtar. Följer den regel ORDER 160
  // kodifierade efter ORDER 157-fiktionen.
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    (window as unknown as { __nxPlayerBusinessPlinthMeasure?: () => object | null }).__nxPlayerBusinessPlinthMeasure = () => {
      const mesh = plinthMeshRef.current;
      if (!mesh) return null;
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      // ORDER 161 — inkludera nuvarande material-state så en playwright-
      // check kan svara på "syns sockeln från just den här kameraposen?"
      // utan att gissa ur en konstant. Opacity uppdateras varje frame
      // av useFrame-blocket ovan; läsningen är alltså den faktiska
      // renderade opaciteten vid mätögonblicket.
      const plinthMat = plinthMaterialRef.current;
      const wallMat = wallMaterialRef.current;
      return {
        yMinM: box.min.y,
        yMaxM: box.max.y,
        heightM: size.y,
        xExtentM: size.x,
        zExtentM: size.z,
        centreX: (box.min.x + box.max.x) / 2,
        centreZ: (box.min.z + box.max.z) / 2,
        plinthOpacity: plinthMat ? plinthMat.opacity : null,
        wallOpacity: wallMat ? wallMat.opacity : null
      };
    };
    return () => {
      delete (window as unknown as { __nxPlayerBusinessPlinthMeasure?: () => object | null }).__nxPlayerBusinessPlinthMeasure;
    };
  }, []);

  // Wall + roof geometry from the shared building polygon.
  const geom = useMemo(() => {
    if (!layout) return null;

    // Side walls only — no top or bottom cap. See sideWallGeometry
    // comment for why an ExtrudeGeometry here would tint the view.
    const wallGeo = sideWallGeometry(layout.building.poly, WALL_HEIGHT_M);

    // Roof cap: a thin slab on top of the walls. This mesh IS an
    // extruded cap — its whole purpose is to be a translucent lid that
    // fades to 0 at close zoom, so the interior becomes visible. Its
    // own fade curve (useFrame below) drops opacity + depthWrite when
    // the camera crosses the roof-fade threshold.
    const shape = polygonShape(layout.building.poly);
    const capGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: false,
      steps: 1
    });
    capGeo.rotateX(-Math.PI / 2);
    capGeo.translate(0, WALL_HEIGHT_M + 0.05, 0);

    return { wallGeo, capGeo };
  }, [layout]);

  // Camera-distance driven opacity — the roof crossfade and interior
  // reveal that CAMERA_AND_GAMEPLAY_BIBLE.md §4.1 specifies.
  useFrame(() => {
    const dist = actualRef.current.distance;
    // Roof opaque above (mid + half), transparent below (mid - half)
    const roofOpacity = smoothstep(
      GRAY_BOX_CAMERA.restaurantRoofFadeMid - GRAY_BOX_CAMERA.restaurantRoofFadeHalf,
      GRAY_BOX_CAMERA.restaurantRoofFadeMid + GRAY_BOX_CAMERA.restaurantRoofFadeHalf,
      dist
    );
    // Interior fades IN below its threshold (opposite of roof)
    const interiorVisibility = 1 - smoothstep(
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid - GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      GRAY_BOX_CAMERA.restaurantInteriorFadeMid + GRAY_BOX_CAMERA.restaurantInteriorFadeHalf,
      dist
    );
    // ORDER 055 Del A — castShadow is toggled alongside opacity because
    // the shadow-map depth pass ignores material alpha. A fully-faded
    // mesh still stamps its silhouette on the ground unless castShadow
    // is off. Threshold matches depthWrite (opacity > 0.5) so shadow
    // and depth agree about whether a surface "exists" this frame.
    const castsShadow = (op: number) => op > 0.5;

    if (roofMaterialRef.current) {
      const mat = roofMaterialRef.current;
      mat.opacity = roofOpacity;
      const wantTransparent = roofOpacity < 0.99;
      // needsUpdate = true forces THREE to recompile the material's shader
      // and move it between the opaque and transparent render buckets.
      // Without this, toggling .transparent at runtime is silently ignored
      // and .opacity has no visual effect.
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
      mat.depthWrite = roofOpacity > 0.5;
    }
    if (roofMeshRef.current) roofMeshRef.current.castShadow = castsShadow(roofOpacity);
    if (wallMaterialRef.current) {
      // Walls fade with the same curve as the roof. Vision Owner
      // decision 2026-08-08: at close zoom the walls should disappear
      // completely, not sit at half alpha — the earlier "cutaway"
      // reading with 50% translucent walls tinted everything visible
      // through them regardless of DoubleSide / depthWrite settings,
      // because a translucent surface with any alpha > 0 blends its
      // colour into whatever is behind it. Fading to 0 removes the
      // failure mode; the room's spatial anchoring is carried by the
      // floor + bar + tables, not by the wall silhouette at that zoom.
      // Dollhouse-view (cull only the camera-facing wall) is the
      // proper long-term answer and is deferred to its own order.
      const wallOpacity = roofOpacity;
      const mat = wallMaterialRef.current;
      mat.opacity = wallOpacity;
      const wantTransparent = wallOpacity < 0.99;
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
      mat.depthWrite = wallOpacity > 0.5;
      if (wallMeshRef.current) wallMeshRef.current.castShadow = castsShadow(wallOpacity);

      // ORDER 159 §DoD 2 — plinth följer wallOpacity: när väggen är
      // borta (dollhouse-läge) ska stenbasen inte stå kvar som en
      // ring runt den försvunna byggnaden. Samma opacitet-, transparent-
      // och castShadow-mönster som väggen.
      if (plinthMaterialRef.current) {
        const pMat = plinthMaterialRef.current;
        pMat.opacity = wallOpacity;
        const wantTransparent = wallOpacity < 0.99;
        if (pMat.transparent !== wantTransparent) {
          pMat.transparent = wantTransparent;
          pMat.needsUpdate = true;
        }
        pMat.depthWrite = wallOpacity > 0.5;
      }
      if (plinthMeshRef.current) {
        plinthMeshRef.current.castShadow = castsShadow(wallOpacity);
      }

      // ORDER 057 Del B — restaurant glow. Warm interior tint that
      // ramps in with skyState.nightFactor. During service (lunch or
      // dinner) it's boosted so the restaurant reads as "open" from
      // across the plaza; outside service it holds a small baseline
      // so the building still says "there's a room in here" at night.
      const period = sim.day.period;
      const inService = period === 'lunch' || period === 'dinner';
      const serviceGain = inService ? 1.0 : 0.35;
      const glow = skyState.nightFactor * serviceGain;
      if (glow > 0.001) {
        mat.emissive.setHex(0xffb460);   // warm tungsten
        mat.emissiveIntensity = glow * 0.22;
      } else {
        mat.emissiveIntensity = 0;
      }

      // Interior pointLight rides the same ramp × interiorVisibility
      // so it only contributes when the camera is close enough to
      // render the interior at all. Full intensity chosen to lift
      // the puck material (roughness=0.9, no emissive) off the
      // hemi+moon floor without blowing out the walls it also lights.
      // Peak-tested at 22 with `distance=9, decay=2` — a guest at
      // radius 4–5 m gets ~1.0 units of direct light on top of the
      // ~0.9 units of ambient, taking the puck from "reads black"
      // to "reads material colour".
      if (interiorLightRef.current) {
        interiorLightRef.current.intensity =
          22 * glow * interiorVisibility;
      }
    }
    if (interiorGroupRef.current) {
      interiorGroupRef.current.visible = interiorVisibility > 0.02;
      // Fade interior in through its own group opacity by scaling material alpha.
      // Same rule for castShadow — no shadow-stamping from interior
      // furniture when the whole interior is faded to transparent.
      const interiorCasts = castsShadow(interiorVisibility);
      interiorGroupRef.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && 'opacity' in mat) {
            mat.opacity = interiorVisibility;
            const wantTransparent = interiorVisibility < 0.99;
            if (mat.transparent !== wantTransparent) {
              mat.transparent = wantTransparent;
              mat.needsUpdate = true;
            }
          }
          // All interior meshes were authored to cast shadow under
          // Del E of 054; here we gate the whole set by the fade so
          // nothing stamps a shadow while invisible.
          mesh.castShadow = interiorCasts;
        }
      });
    }
  });

  if (!layout || !geom) return null;

  const [cx, cz] = layout.centre;
  // All interior geometry rotates with the building's OBB angle so bar
  // strip, tables, stools and floor stay parallel to the actual walls.
  // three.js Y rotation is CCW around +Y; obb.angle is measured CCW in
  // world XZ, so mesh rotation-Y = -angle aligns mesh local X with the
  // OBB's local X.
  const roomRotY = -layout.worldAngle;

  // Business name label — floats slightly above the roof line at the
  // building centre, always visible. Once `hasName` is false the
  // NameEntryOverlay is capturing the player's input, so we don't show
  // the label until a name exists.
  const labelText = hasName && business.name
    ? `${strings.business.labelPrefix} ${business.name}`
    : '';

  // ORDER 159 — plinth-dimensioner i OBB-lokalt rum. Bredd = layout.width
  // + PLINTH_OUTWARD_M (10 cm bredare än ridge-facen så plinthen syns
  // som stenbas väggen står PÅ). scale-axeln följer three.js BoxGeometry-
  // konvention: X = width, Y = height, Z = depth. rotation-Y = -worldAngle
  // så box-lokal X ligger längs OBB:s långaxel — samma konvention som
  // interiörgeometrin.
  const plinthScaleX = layout.width + PLINTH_OUTWARD_M;
  const plinthScaleZ = layout.depth + PLINTH_OUTWARD_M;
  void PLINTH_INSET_M;  // konstanten dokumenterar OsmBuildings-mönstret; layout.width är redan yttre måttet.

  return (
    <group>
      {/* ORDER 159 — plinth (stenbas, portad från OsmBuildings.BuildingPlinth
          med commercial-tier defaults, se PLINTH_HEIGHT_M-headern).
          Centrerad vertikalt vid PLINTH_HEIGHT_M/2 eftersom BoxGeometry
          är centrerad kring origin. Rotation följer OBB:s vinkel så
          hörnen ligger vid väggarnas hörn. `receiveShadow` alltid på;
          `castShadow` toggle:as i useFrame per ORDER 055 Del A. Renderas
          FÖRE väggen så väggen skriver ovanpå plinthens topphörn (och
          döljer skarven där de överlappar). userData bär flagga för
          playwright-mätningen via `__nxPlayerBusinessPlinthMeasure()`. */}
      <mesh
        ref={plinthMeshRef}
        position={[layout.centre[0], PLINTH_HEIGHT_M / 2, layout.centre[1]]}
        rotation={[0, roomRotY, 0]}
        scale={[plinthScaleX, PLINTH_HEIGHT_M, plinthScaleZ]}
        receiveShadow
        userData={{ playerBusinessPlinth: true }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={plinthMaterialRef}
          color={PLINTH_COLOUR}
          roughness={0.95}
          metalness={0}
          transparent
        />
      </mesh>

      {/* Walls — side quads only, no top or bottom cap. FrontSide (the
          material default) is enough now that walls fade to 0 alongside
          the roof: the camera never sees the walls translucent from
          inside, so the DoubleSide inside-face handling from the earlier
          cutaway attempt isn't needed. useFrame keeps opacity +
          depthWrite in sync with the roof crossfade. */}
      <mesh ref={wallMeshRef} geometry={geom.wallGeo} receiveShadow>
        <meshStandardMaterial
          ref={wallMaterialRef}
          color={WALL_COLOUR}
          roughness={0.75}
          metalness={0}
          transparent
        />
      </mesh>

      {/* Roof cap — fades on zoom. Metalness 0.55/0.6 reads as painted
          sheet metal (ORDER 054 Del E). ORDER 055 Del A — castShadow
          is toggled in useFrame per fade; static castShadow removed.
          A faded roof otherwise stamps a rectangle on the plaza. */}
      <mesh ref={roofMeshRef} geometry={geom.capGeo}>
        <meshStandardMaterial
          ref={roofMaterialRef}
          color={ROOF_COLOUR}
          roughness={0.55}
          metalness={0.6}
          transparent
        />
      </mesh>

      {/* Interior stub — hidden at far zoom, fades in as camera approaches.
          Everything below sits in a group rotated to the OBB frame so the
          bar, tables and entrance step stay parallel to the actual walls
          of the rotated OSM footprint. Positions come from layout, which
          runs obbLocalToWorld internally. */}
      <group ref={interiorGroupRef} visible={false}>
        {/* Interior fill light. Warm tungsten pointLight at ceiling
            height (2.0 m — below the WALL_FLOOR_HEIGHT_M eave line so
            it stays "inside" the room). Intensity is driven each frame
            from useFrame above (skyState.nightFactor × serviceGain ×
            interiorVisibility × 22). `distance = 9 m` covers the full
            room diagonal at falloff = 0 so the far corners still get
            lit; decay = 2 is physically correct (three.js default for
            realistic photometry). castShadow left off — one shadow
            pass per pointLight is expensive on a per-frame budget,
            and the interior stub geometry doesn't produce the kind
            of hard shadow that carries reading value. */}
        <pointLight
          ref={interiorLightRef}
          position={[cx, 2.0, cz]}
          color="#ffb460"
          intensity={0}
          distance={9}
          decay={2}
          castShadow={false}
        />
        {/* Floor — planeGeometry is in the mesh's local XY; after
            rotation-X = -π/2 (to lie flat) and rotation-Y = roomRotY the
            plane's local X sits along the OBB's long axis. */}
        {/* ORDER 054 Del E interior materials — plaster/painted wood
            roughness family; no metalness on furniture.
            ORDER 055 Del A — castShadow is NOT set statically here.
            The useFrame block above toggles it on every mesh in this
            group based on interiorVisibility, so nothing stamps a
            shadow while the interior is faded out. receiveShadow is
            fine statically (a shadow receiver with no light hitting
            it is a no-op). */}
        <mesh position={[cx, 0.06, cz]} rotation={[-Math.PI / 2, 0, roomRotY]} receiveShadow>
          <planeGeometry args={[layout.width - 0.4, layout.depth - 0.4]} />
          <meshStandardMaterial color={INTERIOR_FLOOR_COLOUR} roughness={0.85} metalness={0} transparent opacity={0} />
        </mesh>
        {/* Bar strip — long axis along OBB local +X, so mesh args =
            [lengthAlongX, height, widthAlongZ]. ORDER 053 Del B — bar
            counter height 1.10 m (position y = height/2). */}
        <mesh
          position={[layout.bar.worldPosition[0], 0.55, layout.bar.worldPosition[1]]}
          rotation={[0, roomRotY, 0]}
          receiveShadow
        >
          <boxGeometry args={[layout.bar.lengthM, 1.10, layout.bar.widthM]} />
          <meshStandardMaterial color={BAR_COLOUR} roughness={0.75} metalness={0} transparent opacity={0} />
        </mesh>
        {/* Tables — each rotated to the OBB angle so the box sides align
            with the room's walls. The 4-top uses a distinct colour so
            the mix reads clearly from bird's-eye. */}
        {layout.tables.map((t) => (
          <mesh
            key={t.id}
            position={[t.worldPosition[0], 0.45, t.worldPosition[1]]}
            rotation={[0, roomRotY, 0]}
            receiveShadow
          >
            <boxGeometry args={[t.sizeM, 0.75, t.sizeM]} />
            <meshStandardMaterial
              color={t.kind === 'four' ? FOURTOP_COLOUR : TABLE_COLOUR}
              roughness={0.75}
              metalness={0}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
        {/* Bar stools — small pucks at each seat position in front of
            the bar. Round so no rotation needed. ORDER 053 Del B —
            stool seat at 0.75 m (paired with a 1.10 m bar counter,
            the typical bar-to-stool drop is ~0.30–0.35 m). */}
        {layout.barStoolPositions.map((p, i) => (
          <mesh key={`stool-${i}`} position={[p[0], 0.375, p[1]]}>
            <cylinderGeometry args={[0.28, 0.28, 0.75, 10]} />
            <meshStandardMaterial color={BAR_COLOUR} roughness={0.75} metalness={0} transparent opacity={0} />
          </mesh>
        ))}
        {/* Entrance marker — small step at the entrance-side wall,
            rotated so its long axis runs along the OBB local Z (across
            the door). */}
        <mesh
          position={[layout.entrance[0], 0.1, layout.entrance[1]]}
          rotation={[0, roomRotY, 0]}
        >
          <boxGeometry args={[0.4, 0.2, 2.2]} />
          <meshStandardMaterial color={TRIM_COLOUR} roughness={0.9} metalness={0} transparent opacity={0} />
        </mesh>
      </group>

      {/* Business name label — floats above the roof, always readable
          when the business has been named. Uses drei <Html> so the label
          scales with distance and stays legible from the strategic view. */}
      {labelText && (
        <Html
          position={[cx, WALL_HEIGHT_M + ROOF_RIDGE_ADD_M + 1.5, cz]}
          center
          distanceFactor={45}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              color: '#f5f0e0',
              background: 'rgba(45, 32, 22, 0.85)',
              padding: '3px 10px',
              borderRadius: 3,
              border: '1px solid #a8926a',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {labelText}
          </div>
        </Html>
      )}
    </group>
  );
}
