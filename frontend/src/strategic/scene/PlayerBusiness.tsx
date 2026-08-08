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
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { GRAY_BOX_CAMERA } from '../content/grythyttan';
import { useBusiness } from '../business/BusinessContext';
import { BAR_STRIP, usePlayerBusinessInterior } from '../business/interiorLayout';
import { strings } from '../../content/strings.sv';

// Business volume constants — the D01 historic-centre building is a
// two-storey sit-down restaurant per ORDER 042 §1. Height matches
// heightFor's `commercial` default (6.0) rounded up so the roof line
// reads distinct from surrounding houses.
const WALL_HEIGHT_M = 6.5;
const ROOF_RIDGE_ADD_M = 2.4;
const WALL_COLOUR = '#8f4a34';   // faded burgundy — restaurant, not house
const ROOF_COLOUR = '#3a2e20';
const TRIM_COLOUR = '#efe6d4';

// Interior stub — floor + a handful of tables in the pattern
// RESTAURANT_INTERIOR uses in content/grythyttan.ts. Not the final
// interior; enough to say "this is a restaurant floor plan" when the
// camera crosses the roof-fade threshold.
const INTERIOR_FLOOR_COLOUR = '#a08462';
const TABLE_COLOUR = '#e5d5b8';
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

export function PlayerBusiness() {
  const { business, hasName } = useBusiness();
  const { actualRef } = useCamera();
  const layout = usePlayerBusinessInterior();

  const wallMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const roofMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const interiorGroupRef = useRef<THREE.Group>(null);

  // Wall + roof geometry from the shared building polygon.
  const geom = useMemo(() => {
    if (!layout) return null;

    const shape = polygonShape(layout.building.poly);

    const wallGeo = new THREE.ExtrudeGeometry(shape, {
      depth: WALL_HEIGHT_M,
      bevelEnabled: false,
      steps: 1
    });
    wallGeo.rotateX(-Math.PI / 2);

    // Roof cap: a thin slab on top of the walls, plus a gable-ish prism.
    // Kept intentionally simple — this is a first-loop render, not a
    // finished landmark. The gable adds enough silhouette that the
    // building is distinguishable from its flat-roofed neighbours from
    // the strategic view.
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
    if (wallMaterialRef.current) {
      // Walls stay visible always — the interior is a *cutaway*, not a
      // building removal. But they thin slightly when zoomed in so the
      // interior isn't visually strangled at close range.
      const wallOpacity = 0.5 + 0.5 * roofOpacity;
      const mat = wallMaterialRef.current;
      mat.opacity = wallOpacity;
      const wantTransparent = wallOpacity < 0.99;
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
      // Match the roof's depthWrite discipline: transparent geometry
      // must NOT write to the depth buffer, or it culls / tints every
      // subsequent transparent object drawn behind it (trees, fences,
      // other buildings' translucent parts). Without this, the walls'
      // 0.5-alpha brown-red colour bleeds across the whole view when
      // the camera crosses the roof-fade threshold.
      mat.depthWrite = wallOpacity > 0.5;
    }
    if (interiorGroupRef.current) {
      interiorGroupRef.current.visible = interiorVisibility > 0.02;
      // Fade interior in through its own group opacity by scaling material alpha.
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
        }
      });
    }
  });

  if (!layout || !geom) return null;

  const [cx, cz] = layout.centre;
  const barLength = layout.depth * 0.7;
  const barX = layout.bbox.minX + BAR_STRIP.widthM / 2 + BAR_STRIP.offsetM;
  const barZ = cz;
  const tables = layout.tables;

  // Business name label — floats slightly above the roof line at the
  // building centre, always visible. Once `hasName` is false the
  // NameEntryOverlay is capturing the player's input, so we don't show
  // the label until a name exists.
  const labelText = hasName && business.name
    ? `${strings.business.labelPrefix} ${business.name}`
    : '';

  return (
    <group>
      {/* Walls. Canvas runs shadows={false}, so receiveShadow / castShadow
          would be noise. Material is `transparent` from mount so THREE
          places it in the transparent render bucket; useFrame keeps its
          opacity + depthWrite in sync with the roof crossfade. */}
      <mesh geometry={geom.wallGeo}>
        <meshStandardMaterial
          ref={wallMaterialRef}
          color={WALL_COLOUR}
          roughness={0.85}
          metalness={0.02}
          transparent
        />
      </mesh>

      {/* Roof cap — fades on zoom. transparent set here so THREE places
          the material in the transparent render bucket from mount; the
          useFrame toggle above still refreshes it (with needsUpdate) if
          the fade lands fully opaque at large distances. */}
      <mesh geometry={geom.capGeo}>
        <meshStandardMaterial
          ref={roofMaterialRef}
          color={ROOF_COLOUR}
          roughness={0.9}
          metalness={0.05}
          transparent
        />
      </mesh>

      {/* Interior stub — hidden at far zoom, fades in as camera approaches */}
      <group ref={interiorGroupRef} visible={false}>
        {/* Floor — sits ~0.05 m above ground to avoid z-fighting */}
        <mesh position={[cx, 0.06, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[layout.width - 0.4, layout.depth - 0.4]} />
          <meshStandardMaterial color={INTERIOR_FLOOR_COLOUR} transparent opacity={0} />
        </mesh>
        {/* Bar strip along west wall */}
        <mesh position={[barX, 0.55, barZ]}>
          <boxGeometry args={[BAR_STRIP.widthM, 1.05, barLength]} />
          <meshStandardMaterial color={BAR_COLOUR} transparent opacity={0} />
        </mesh>
        {/* Six tables */}
        {tables.map(([tx, tz], i) => (
          <mesh key={i} position={[tx, 0.45, tz]}>
            <boxGeometry args={[1.05, 0.75, 1.05]} />
            <meshStandardMaterial color={TABLE_COLOUR} transparent opacity={0} />
          </mesh>
        ))}
        {/* Entrance marker — a small step at the south end of the building */}
        <mesh position={[layout.entrance[0], 0.1, layout.entrance[1]]}>
          <boxGeometry args={[2.2, 0.2, 0.4]} />
          <meshStandardMaterial color={TRIM_COLOUR} transparent opacity={0} />
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
