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
import { usePlayerBusinessInterior } from '../business/interiorLayout';
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

  const wallMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const roofMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const interiorGroupRef = useRef<THREE.Group>(null);

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

  return (
    <group>
      {/* Walls — literal side quads only, no top or bottom cap (that
          was the ORDER 042 §3.2 tint bug). DoubleSide so the walls read
          correctly whether the camera is outside the building looking in
          or inside looking out; per-vertex normals point outward and
          three.js flips them for back-facing pixels under DoubleSide, so
          both sides light correctly. useFrame keeps opacity + depthWrite
          in sync with the roof crossfade. */}
      <mesh geometry={geom.wallGeo}>
        <meshStandardMaterial
          ref={wallMaterialRef}
          color={WALL_COLOUR}
          roughness={0.85}
          metalness={0.02}
          transparent
          side={THREE.DoubleSide}
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

      {/* Interior stub — hidden at far zoom, fades in as camera approaches.
          Everything below sits in a group rotated to the OBB frame so the
          bar, tables and entrance step stay parallel to the actual walls
          of the rotated OSM footprint. Positions come from layout, which
          runs obbLocalToWorld internally. */}
      <group ref={interiorGroupRef} visible={false}>
        {/* Floor — planeGeometry is in the mesh's local XY; after
            rotation-X = -π/2 (to lie flat) and rotation-Y = roomRotY the
            plane's local X sits along the OBB's long axis. */}
        <mesh position={[cx, 0.06, cz]} rotation={[-Math.PI / 2, 0, roomRotY]}>
          <planeGeometry args={[layout.width - 0.4, layout.depth - 0.4]} />
          <meshStandardMaterial color={INTERIOR_FLOOR_COLOUR} transparent opacity={0} />
        </mesh>
        {/* Bar strip — long axis along OBB local +X, so mesh args =
            [lengthAlongX, height, widthAlongZ]. */}
        <mesh
          position={[layout.bar.worldPosition[0], 0.55, layout.bar.worldPosition[1]]}
          rotation={[0, roomRotY, 0]}
        >
          <boxGeometry args={[layout.bar.lengthM, 1.05, layout.bar.widthM]} />
          <meshStandardMaterial color={BAR_COLOUR} transparent opacity={0} />
        </mesh>
        {/* Tables — each rotated to the OBB angle so the box sides align
            with the room's walls. The 4-top uses a distinct colour so
            the mix reads clearly from bird's-eye. */}
        {layout.tables.map((t) => (
          <mesh
            key={t.id}
            position={[t.worldPosition[0], 0.45, t.worldPosition[1]]}
            rotation={[0, roomRotY, 0]}
          >
            <boxGeometry args={[t.sizeM, 0.75, t.sizeM]} />
            <meshStandardMaterial
              color={t.kind === 'four' ? FOURTOP_COLOUR : TABLE_COLOUR}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
        {/* Bar stools — small pucks at each seat position in front of
            the bar. Round so no rotation needed. */}
        {layout.barStoolPositions.map((p, i) => (
          <mesh key={`stool-${i}`} position={[p[0], 0.5, p[1]]}>
            <cylinderGeometry args={[0.28, 0.28, 0.9, 10]} />
            <meshStandardMaterial color={BAR_COLOUR} transparent opacity={0} />
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
