import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import {
  COMMERCIAL_STATUS,
  LANDMARK_BY_ID,
  STATUS_PALETTE,
  WORLD,
  tintColour
} from '../content/world';
import type { CommercialStatus, Landmark, RawBuilding, Vec2Tuple } from '../content/world';

// Handcrafted low-poly geometry for the landmarks a Grythyttan visitor must
// recognise within seconds. Where a landmark corresponds to a real OSM way
// we start from its verified footprint and layer signature features on top.
// Where a landmark is a node we place a small crafted building around it.
//
// Property status is expressed as a wall / roof tint on the actual building
// rather than as a floating orb — see VS-03 spec section 13.

const BUILDING_BY_ID: Record<string, RawBuilding> = Object.fromEntries(
  WORLD.buildings.map((b) => [b.id, b])
);

function buildingFor(landmark: Landmark): RawBuilding | null {
  if (landmark.source.osmType === 'way' && landmark.source.osmId != null) {
    return BUILDING_BY_ID[`w${landmark.source.osmId}`] ?? null;
  }
  return null;
}

function extrudeShape(poly: Vec2Tuple[], height: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i][0], poly[i][1]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function polygonCentre(poly: Vec2Tuple[]): [number, number] {
  let cx = 0,
    cz = 0,
    n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  if (n === 0) return [0, 0];
  return [cx / n, cz / n];
}

// Apply a status tint to a base colour if the landmark has curated status.
function stainWall(id: string, base: string, k = 0.5): string {
  const status = COMMERCIAL_STATUS[id];
  if (!status) return base;
  return tintColour(base, STATUS_PALETTE[status].wall, k);
}
function stainRoof(id: string, base: string, k = 0.3): string {
  const status = COMMERCIAL_STATUS[id];
  if (!status) return base;
  return tintColour(base, STATUS_PALETTE[status].roof, k);
}

// Shared PASS 4 tree helper. Kept intentionally simple — two low-poly
// shapes (cylinder trunk + spherical/conical crown) matching the
// aesthetic used by OsmForest so hand-placed trees around a landmark
// blend with the surrounding forest at village scale.
function LandmarkTree({
  position,
  kind = 'deciduous',
  scale = 1,
  rotation = 0
}: {
  position: [number, number, number];
  kind?: 'deciduous' | 'coniferous';
  scale?: number;
  rotation?: number;
}) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 3.6, 6]} />
        <meshStandardMaterial color="#3f382e" roughness={1} />
      </mesh>
      {kind === 'coniferous' ? (
        <>
          <mesh position={[0, 5.4, 0]}>
            <coneGeometry args={[2.6, 6.4, 10]} />
            <meshStandardMaterial color="#3a4a3f" roughness={1} />
          </mesh>
          <mesh position={[0, 3.6, 0]}>
            <coneGeometry args={[3.1, 4.6, 10]} />
            <meshStandardMaterial color="#3a4a3f" roughness={1} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 5.0, 0]}>
          <sphereGeometry args={[2.8, 12, 10]} />
          <meshStandardMaterial color="#4a684a" roughness={1} />
        </mesh>
      )}
    </group>
  );
}

// ---------- Coordinate frame for crafted landmarks ----------
// The OSM local-metric projection encodes +Y = south (world.json meta:
// `mPerDeg`, with the Y axis defined against decreasing latitude). When
// extrudeShape rotates the polygon into world XZ, the polygon's Y flips
// sign, and the raw extrusion sits at world Z = -poly.y. Meanwhile
// landmark.position is stored in polygon coordinates and used directly
// for camera focus and gameplay logic, at world Z = +poly.y. Placing
// overlaid decor at [centre[0], y, centre[1]] therefore puts it 2·centre[1]
// south of the walls — the "duplicate cross-shaped building" the Vision
// Owner observed on the church rev 1.
//
// The fix used across every crafted landmark from ORDER 004 PASS 1
// onwards: negate the shape's Y before extrusion so the wall geometry
// lands at world Z = +poly.y, centre the shape at the polygon centroid
// so the resulting mesh is local to (0, 0, 0), and wrap the whole
// landmark inside a single <group position={[landmark.position[0], 0,
// landmark.position[1]]}>. Walls and any decor placed inside the group
// then share one local frame and cannot come apart.
//
// Wall material uses THREE.DoubleSide as a belt-and-braces against
// polygon winding — several OSM polygons in this dataset are wound
// clockwise, which would otherwise cull exterior faces.
function useLandmarkWallGeo(
  b: RawBuilding | null,
  wallHeight: number
): THREE.BufferGeometry | null {
  return useMemo(() => {
    if (!b) return null;
    const c = polygonCentre(b.poly);
    const shape = new THREE.Shape();
    shape.moveTo(b.poly[0][0] - c[0], -(b.poly[0][1] - c[1]));
    for (let i = 1; i < b.poly.length; i++) {
      shape.lineTo(b.poly[i][0] - c[0], -(b.poly[i][1] - c[1]));
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: wallHeight,
      bevelEnabled: false,
      steps: 1
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [b, wallHeight]);
}

// PASS 1 delivery for a landmark backed by a real OSM footprint: correct
// position (via landmark.position), correct orientation and footprint
// (from OSM), approximated height (per-landmark default), no invented
// silhouette or facade detail. Roof forms, towers, chimneys, windows
// and entrances are the domain of PASS 2 and PASS 3.
function CraftedFootprintPass1({
  landmark,
  wallHeight,
  wallColour
}: {
  landmark: Landmark;
  wallHeight: number;
  wallColour: string;
}) {
  const b = buildingFor(landmark);
  const geo = useLandmarkWallGeo(b, wallHeight);
  if (!b || !geo) return null;
  const wall = stainWall(landmark.id, wallColour);
  return (
    <group position={[landmark.position[0], 0, landmark.position[1]]}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={wall}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------- Gästgivaregården — PASS 2 silhouette + PASS 3 facade ----------
// Verified from four Vision Owner photographs:
//   gästgiveriet.jpeg          — street facade, two-storey Falu-red timber
//                                 with attached wing along Prästgatan, oculus
//                                 window in the visible gable end, hanging
//                                 'GÄSTGIVAREGÅRDEN 1641' sign board over the
//                                 entrance
//   gästgiveriet3.jpeg         — rear/courtyard facade with round-arch dormers
//                                 on the roof pitch and 2–3 chimneys along ridge
//   gästgiveriet 4.jpeg        — corner view with gable-end silhouette + sign
//   gästgibveriet på prästgatan.jpeg — winter street shot for roof pitch
// Confidence per aspect: documentation/references/district-1/gastgivaregard/
// manifest.json.
//
// PASS 2: massing + roof geometry + pitch + chimneys + dormers.
// PASS 3 (this revision): rhythmic small-paned windows on both long facades,
// round oculus in each gable end, round oculi in the three courtyard-side
// dormers, entrance sign + door on the street facade.
function GastgivaregardPass2({ landmark }: { landmark: Landmark }) {
  const b = buildingFor(landmark);
  const WALL_H = 8;
  const wallGeo = useLandmarkWallGeo(b, WALL_H);

  // Steep Bergslag gable — ridge along the polygon's long axis (Z after
  // the shared-frame transform). Width covers the 24.7 m polygon extent.
  const ROOF_W = 26.5; // slight overhang past the walls at the eaves
  const ROOF_L = 43.5; // slight overhang at the gable ends
  const RIDGE_H = 7.2; // steep pitch — measurable in gästgibveriet-på-prästgatan.jpeg

  const gableRoofGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-ROOF_W / 2, 0);
    shape.lineTo(ROOF_W / 2, 0);
    shape.lineTo(0, RIDGE_H);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: ROOF_L,
      bevelEnabled: false,
      steps: 1
    });
    g.translate(0, 0, -ROOF_L / 2);
    return g;
  }, []);

  if (!b || !wallGeo) return null;

  const wall = stainWall(landmark.id, '#c9482f');
  const ROOF = '#2f2620';
  const CHIMNEY_WALL = '#c9482f';
  const CHIMNEY_CAP = '#2f2620';

  return (
    <group position={[landmark.position[0], 0, landmark.position[1]]}>
      {/* Walls — OSM footprint in the shared local frame. */}
      <mesh geometry={wallGeo}>
        <meshStandardMaterial
          color={wall}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Steep gable roof — dark charcoal, ridge along local Z. */}
      <mesh geometry={gableRoofGeo} position={[0, WALL_H, 0]}>
        <meshStandardMaterial
          color={ROOF}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Two chimneys along the ridge — count from gästgiveriet3.jpeg. */}
      {[-8, 6].map((dz, i) => (
        <group
          key={`ch-${i}`}
          position={[0, WALL_H + RIDGE_H - 0.3, dz]}
        >
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[1.1, 3.0, 1.1]} />
            <meshStandardMaterial color={CHIMNEY_WALL} roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.05, 0]}>
            <boxGeometry args={[1.35, 0.35, 1.35]} />
            <meshStandardMaterial color={CHIMNEY_CAP} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Three gabled dormers on the +X pitch (courtyard side per
          gästgiveriet3.jpeg), each with a round oculus (PASS 3). */}
      {[-11, 0, 11].map((dz, i) => (
        <group
          key={`d-${i}`}
          position={[ROOF_W * 0.22, WALL_H + RIDGE_H * 0.45, dz]}
        >
          <mesh>
            <boxGeometry args={[2.4, 2.6, 2.6]} />
            <meshStandardMaterial color={wall} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <coneGeometry args={[1.7, 1.6, 4]} />
            <meshStandardMaterial color={ROOF} roughness={0.9} />
          </mesh>
          {/* Round oculus — faces courtyard (+X) side. */}
          <mesh
            position={[1.31, 0.15, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.55, 0.55, 0.1, 16]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.7} />
          </mesh>
          <mesh
            position={[1.36, 0.15, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.4, 0.4, 0.02, 16]} />
            <meshStandardMaterial color="#3a2b22" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* PASS 3 — Rhythmic small-paned windows on the two long facades.
          Two storeys of 6 windows each per side. Position uses local X
          extent of ±12 m (polygon width 24.7) and long-axis Z from -18
          to +18. White frames on a Falu-red facade. */}
      {[-15, -9, -3, 3, 9, 15].flatMap((dz) =>
        [3.0, 5.7].map((y, si) => (
          <group key={`w-street-${dz}-${si}`}>
            {/* Street-side (+X) facade */}
            <mesh position={[12.4, y, dz]}>
              <boxGeometry args={[0.1, 1.5, 0.9]} />
              <meshStandardMaterial color="#efe6d4" roughness={0.7} />
            </mesh>
            <mesh position={[12.42, y, dz]}>
              <boxGeometry args={[0.02, 1.15, 0.55]} />
              <meshStandardMaterial color="#2f2620" roughness={0.9} />
            </mesh>
            {/* Courtyard-side (-X) facade */}
            <mesh position={[-12.4, y, dz]}>
              <boxGeometry args={[0.1, 1.5, 0.9]} />
              <meshStandardMaterial color="#efe6d4" roughness={0.7} />
            </mesh>
            <mesh position={[-12.42, y, dz]}>
              <boxGeometry args={[0.02, 1.15, 0.55]} />
              <meshStandardMaterial color="#2f2620" roughness={0.9} />
            </mesh>
          </group>
        ))
      )}

      {/* Round oculus in the visible gable end (verified in
          gästgiveriet.jpeg). Placed near the apex of the +Z gable. */}
      <mesh
        position={[0, WALL_H + RIDGE_H * 0.55, 21.5]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.9, 0.9, 0.1, 16]} />
        <meshStandardMaterial color="#efe6d4" roughness={0.7} />
      </mesh>
      <mesh
        position={[0, WALL_H + RIDGE_H * 0.55, 21.56]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.65, 0.65, 0.02, 16]} />
        <meshStandardMaterial color="#3a2b22" roughness={0.9} />
      </mesh>

      {/* Street-facing entrance — dark door + hanging sign board with
          'GÄSTGIVAREGÅRDEN 1641' colour block (text is a bitmap job
          beyond the strategic-scale scope; the sign reads as a warm
          burgundy plaque per gästgiveriet.jpeg). */}
      <mesh position={[12.42, 1.6, -3]}>
        <boxGeometry args={[0.15, 3.2, 1.4]} />
        <meshStandardMaterial color="#2a1f18" roughness={0.85} />
      </mesh>
      {/* Sign board hanging above the entrance. */}
      <mesh position={[13.0, 4.6, -3]}>
        <boxGeometry args={[0.15, 1.0, 2.4]} />
        <meshStandardMaterial
          color="#4b2018"
          emissive="#4b2018"
          emissiveIntensity={0.18}
          roughness={0.65}
        />
      </mesh>
      {/* Small lantern beside the sign — visible in gästgiveriet.jpeg. */}
      <mesh position={[13.2, 4.9, -1.4]}>
        <boxGeometry args={[0.3, 0.5, 0.3]} />
        <meshStandardMaterial
          color="#f4e6cf"
          emissive="#f4c680"
          emissiveIntensity={0.5}
          roughness={0.55}
        />
      </mesh>

      {/* PASS 4 — Rear courtyard (gästgiveriet3.jpeg). A rectangular
          gravel-toned patio on the courtyard-pitch side (local -X). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-19, 0.07, 0]}
      >
        <planeGeometry args={[14, 34]} />
        <meshStandardMaterial color="#c9c1af" roughness={0.95} />
      </mesh>
      {/* Two small courtyard umbrellas (form only) — sunny courtyard is a
          consistent detail across the reference photos. PASS 5: small
          round tables beneath each umbrella (verified in gästgiveriet3.jpeg
          — tables + chairs + diners under the umbrellas). */}
      {[-8, 4].map((dz, i) => (
        <group key={`umb-${i}`} position={[-19, 0, dz]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 3.6, 6]} />
            <meshStandardMaterial color="#3a3630" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.4, 0]}>
            <coneGeometry args={[1.8, 0.6, 8]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.85} />
          </mesh>
          {/* PASS 5 — small round table under the umbrella. */}
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.05, 20]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
            <meshStandardMaterial color="#3a3630" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Two additional standalone tables further along the courtyard,
          matching the wider table cluster in gästgiveriet3.jpeg. */}
      {[-2, -14].map((dz, i) => (
        <group key={`ct-${i}`} position={[-16, 0, dz]}>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
            <meshStandardMaterial color="#3a3630" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* PASS 4 — Street cobble strip on the street (local +X) side.
          Runs along the length of the building matching gästgiveriet.jpeg
          / gästgibveriet på prästgatan.jpeg. Slightly darker than the
          courtyard gravel. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[16, 0.05, 0]}
      >
        <planeGeometry args={[6, 40]} />
        <meshStandardMaterial color="#8f8779" roughness={0.95} />
      </mesh>

      {/* Two street-side deciduous trees along Prästgatan. */}
      <LandmarkTree position={[19, 0, -16]} scale={1.0} />
      <LandmarkTree position={[19, 0, 12]} scale={1.05} rotation={0.7} />
    </group>
  );
}

// ---------- Måltidens hus / Sevillapaviljongen — PASS 2 silhouette + PASS 3 facade ----------
// Verified from three Vision Owner photographs:
//   maltidens-hus-i-norden 1.jpg — under-canopy angle: multicoloured flat
//                                    canopy on four pairs of heavy timber
//                                    columns, drum tower with checkerboard
//                                    base, angled white side buildings
//   maltidens-hus-i-norden 2.jpg — front-on: drum tower with viewing balcony
//                                    and small conical / gilded finial
//   maltidens-hus-i-norden 3.jpg — three-quarter with column pairs, drum
//                                    with conical crown, scale from people
// Confidence per aspect: documentation/references/district-1/maltidenshus/
// manifest.json.
//
// PASS 2: physical form (drum + columns + canopy + finial).
// PASS 3 (this revision): multicoloured checkered canopy pattern (seeded
// grid), drum checkerboard base (alternating vertical strips), drum glazed
// upper storeys (subtle glass band with vertical frames).

// PASS 3 pavilion canopy palette — bright cheerful tones, sampled from the
// mosaic visible in maltidens-hus-i-norden 1.jpg. Kept deterministic per
// (ix, iz) cell so the pattern is stable across sessions.
const PAV_CANOPY_PALETTE = [
  '#c94e37', // red-orange
  '#e0a835', // amber
  '#4a9c47', // apple green
  '#3a7fb0', // sea blue
  '#8c4aa8', // violet
  '#e88a3e', // orange
  '#c92a5a', // magenta
  '#5db06f', // grass green
  '#d9c93a', // yellow
  '#4a6478'  // steel blue
];
function pavCanopyColour(ix: number, iz: number): string {
  const h = ((ix * 73856093) ^ (iz * 19349663)) >>> 0;
  return PAV_CANOPY_PALETTE[h % PAV_CANOPY_PALETTE.length];
}

function MaltidensHusPass2({ landmark }: { landmark: Landmark }) {
  const b = buildingFor(landmark);
  const MAIN_H = 10;
  const wallGeo = useLandmarkWallGeo(b, MAIN_H);
  if (!b || !wallGeo) return null;

  const wall = stainWall(landmark.id, '#e0dccf');
  const MAIN_ROOF = '#3f3a32';
  const DRUM = '#2a2621';       // dark drum walls (glazed detail → PASS 3)
  const DRUM_BALCONY = '#8f867a';
  const TIMBER = '#7a4e2a';     // weathered heavy-timber column
  const CANOPY = '#4a4238';     // neutral form colour; multicoloured pattern → PASS 3
  const FINIAL = '#c9a24a';     // gilded conical crown

  // Pavilion placement. Vision Owner review (PASS 4) flagged the pavilion
  // as being on the wrong side of the main building; flipped from local -Z
  // to local +Z so it now sits off the opposite end of the campus footprint.
  // Exact position within the parcel still needs an aerial confirmation and
  // is flagged in APPROXIMATION_REGISTER.md.
  const PAV_X = 0;
  const PAV_Z = 38;
  const DRUM_R = 5.0;
  const DRUM_H = 12.5;
  const BALCONY_R = 5.6;
  const COL_H = 15.0;
  const COL_R = 0.42;
  const CANOPY_H = 15.4;
  const CANOPY_SIZE = 24;

  return (
    <group position={[landmark.position[0], 0, landmark.position[1]]}>
      {/* Måltidens hus main building — OSM footprint extruded at PASS 1
          height. Flat top (the modernist form is angled/faceted in reality
          but only readable at close range; footprint massing is the PASS 2
          contribution here). */}
      <mesh geometry={wallGeo}>
        <meshStandardMaterial
          color={wall}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* A subtle flat roof cap so the building has a legible top edge from
          the strategic-scale camera. Not an invented roof form — a flat cap
          is the correct silhouette for a modernist civic building. */}
      <mesh position={[0, MAIN_H + 0.15, 0]}>
        <boxGeometry args={[32, 0.3, 65]} />
        <meshStandardMaterial color={MAIN_ROOF} roughness={0.9} />
      </mesh>

      {/* Sevillapaviljongen. */}
      <group position={[PAV_X, 0, PAV_Z]}>
        {/* Drum tower — dark base + glass-band upper storeys. */}
        <mesh position={[0, DRUM_H / 2, 0]}>
          <cylinderGeometry args={[DRUM_R, DRUM_R, DRUM_H, 32]} />
          <meshStandardMaterial color={DRUM} roughness={0.85} />
        </mesh>

        {/* PASS 3 — Drum checkerboard base: 24 alternating vertical strips
            around the drum on the lower ~4 m. Reads as a black-and-white
            checker skin at village scale (maltidens-hus-i-norden 1.jpg). */}
        {Array.from({ length: 24 }).map((_, i) => {
          const theta = (i / 24) * Math.PI * 2;
          const r = DRUM_R + 0.03;
          const stripW = ((2 * Math.PI * r) / 24) * 0.96;
          return (
            <mesh
              key={`chk-${i}`}
              position={[Math.cos(theta) * r, 2.0, Math.sin(theta) * r]}
              rotation={[0, -theta + Math.PI / 2, 0]}
            >
              <boxGeometry args={[stripW, 4.0, 0.06]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#e8dcc4' : '#22201c'}
                roughness={0.9}
              />
            </mesh>
          );
        })}

        {/* PASS 3 — Drum glazed upper storeys: a subtle steel-blue band on
            the upper drum with vertical dark frames every 15°. Reads as
            large glazed windows around the observation storey. */}
        <mesh position={[0, DRUM_H - 3.0, 0]}>
          <cylinderGeometry
            args={[DRUM_R + 0.02, DRUM_R + 0.02, 5.5, 32, 1, true]}
          />
          <meshStandardMaterial
            color="#4a6478"
            emissive="#4a6478"
            emissiveIntensity={0.18}
            roughness={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
        {Array.from({ length: 12 }).map((_, i) => {
          const theta = (i / 12) * Math.PI * 2;
          const r = DRUM_R + 0.05;
          return (
            <mesh
              key={`mullion-${i}`}
              position={[Math.cos(theta) * r, DRUM_H - 3.0, Math.sin(theta) * r]}
              rotation={[0, -theta + Math.PI / 2, 0]}
            >
              <boxGeometry args={[0.08, 5.5, 0.06]} />
              <meshStandardMaterial color="#141210" roughness={0.9} />
            </mesh>
          );
        })}

        {/* Viewing balcony near the top of the drum. */}
        <mesh position={[0, DRUM_H - 1.6, 0]}>
          <cylinderGeometry
            args={[BALCONY_R, BALCONY_R, 0.35, 32]}
          />
          <meshStandardMaterial color={DRUM_BALCONY} roughness={0.85} />
        </mesh>
        {/* Small conical / gilded finial on the crown. */}
        <mesh position={[0, DRUM_H + 0.75, 0]}>
          <coneGeometry args={[0.9, 1.6, 16]} />
          <meshStandardMaterial
            color={FINIAL}
            roughness={0.55}
            metalness={0.35}
          />
        </mesh>

        {/* Four pairs of heavy timber columns supporting the canopy. */}
        {[
          [-9, -9],
          [9, -9],
          [-9, 9],
          [9, 9]
        ].map(([dx, dz], i) => (
          <group key={`pair-${i}`} position={[dx, 0, dz]}>
            <mesh position={[-0.65, COL_H / 2, 0]}>
              <cylinderGeometry args={[COL_R, COL_R * 1.1, COL_H, 10]} />
              <meshStandardMaterial color={TIMBER} roughness={0.9} />
            </mesh>
            <mesh position={[0.65, COL_H / 2, 0]}>
              <cylinderGeometry args={[COL_R, COL_R * 1.1, COL_H, 10]} />
              <meshStandardMaterial color={TIMBER} roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* Flat canopy — base slab in a neutral colour, with the PASS 3
            multicoloured checkered mosaic on the top surface. */}
        <mesh position={[0, CANOPY_H, 0]}>
          <boxGeometry args={[CANOPY_SIZE, 0.9, CANOPY_SIZE]} />
          <meshStandardMaterial color={CANOPY} roughness={0.85} />
        </mesh>
        {/* PASS 5 — Small outdoor tables under the canopy (visible in
            maltidens-hus-i-norden 1.jpg foreground). Arranged in a small
            cluster off to one side of the drum. */}
        {[
          [-6, -6],
          [-4, -6.5],
          [-6.5, -4],
          [6, 6],
          [4, 6.5],
          [6.5, 4]
        ].map(([dx, dz], i) => (
          <group key={`pt-${i}`} position={[dx, 0, dz]}>
            <mesh position={[0, 0.72, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.05, 12]} />
              <meshStandardMaterial color="#c9b28e" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.7, 6]} />
              <meshStandardMaterial color="#3a3630" roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* PASS 3 — Multicoloured checkered mosaic on top of the canopy.
            Deterministic per-cell colour from PAV_CANOPY_PALETTE. The
            pattern is visible from above (village-scale camera pitch) and
            reflects onto the underside light where the strategic scene's
            hemisphere light bounces. */}
        {(() => {
          const CELLS = 8;
          const cell = CANOPY_SIZE / CELLS;
          const tiles: ReactNode[] = [];
          for (let iz = 0; iz < CELLS; iz++) {
            for (let ix = 0; ix < CELLS; ix++) {
              const col = pavCanopyColour(ix, iz);
              tiles.push(
                <mesh
                  key={`t-${ix}-${iz}`}
                  position={[
                    (ix - (CELLS - 1) / 2) * cell,
                    CANOPY_H + 0.52,
                    (iz - (CELLS - 1) / 2) * cell
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[cell * 0.94, cell * 0.94]} />
                  <meshStandardMaterial
                    color={col}
                    emissive={col}
                    emissiveIntensity={0.1}
                    roughness={0.7}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              );
            }
          }
          return tiles;
        })()}
      </group>
    </group>
  );
}

// ---------- Church (Grythyttans Kyrka) ----------
// Verified reconstruction (2026-07-23, revision 2) from Vision Owner refs:
//   kyrkan.jpg     — south facade, tower at right (west end)
//   kyrkan.jpeg    — east / south-east three-quarter, full tower silhouette
//   kyrkan2.jpeg   — north facade, tower at left, clock + cross + dormers
// Confidence per aspect: documentation/references/district-1/kyrka/manifest.json.
//
// Coordinate note. The OSM local-metric projection encodes +Y as south
// (world.json meta: `mPerDeg`, with the Y axis defined against decreasing
// latitude). When extrudeShape rotates the polygon into world XZ, the
// polygon's Y flips sign — the untransformed extrusion sits at
// world Z = -poly.y, which is the mirror of where the camera focuses via
// landmark.position (which is stored in polygon coordinates). The previous
// revision placed decor at [centre[0], y, centre[1]] so the walls ended up
// ~2·centre[1] south of the decor and read as a "duplicate cross-shaped
// building." This revision fixes that by:
//   (1) negating the shape's Y before extrusion, so walls land at world
//       Z = +poly.y, matching the landmark position; and
//   (2) also centring the shape at the polygon centroid, so the whole
//       building is expressed in a local frame around (0, 0, 0). The
//       entire church then lives inside one <group> anchored at
//       landmark.position — walls and decor cannot come apart again.
// Wall material uses THREE.DoubleSide as a belt-and-braces against
// polygon winding: the church's OSM polygon happens to be CW-wound, so
// FrontSide-only rendering would cull the exterior.
function ChurchLandmark({ landmark }: { landmark: Landmark }) {
  const b = buildingFor(landmark);
  const NAVE_WALL_H = 8;

  const WALL = '#a63c2c';
  const ROOF = '#2a2620';
  const TRIM = '#efe6d4';
  const CROSS = '#d4b463';

  const NAVE_L = 35.0;
  const NAVE_W = 15.5;
  const RIDGE_H = 6.2;

  // Tower — offsets are now in the local frame of the group (origin at the
  // polygon centroid, X east-west, Z north-south).
  const TOWER_DX = -14.5; // toward the polygon's west edge
  const TOWER_SIZE = 6.2;
  const TOWER_BODY_H = 18;

  // Walls: extrude the OSM footprint in the shared crafted-landmark frame
  // (see useLandmarkWallGeo above for the rationale).
  const wallGeo = useLandmarkWallGeo(b, NAVE_WALL_H);

  // Nave gable roof — triangular prism, ridge along local X.
  const naveRoofGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-NAVE_W / 2, 0);
    shape.lineTo(NAVE_W / 2, 0);
    shape.lineTo(0, RIDGE_H);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: NAVE_L,
      bevelEnabled: false,
      steps: 1
    });
    g.rotateY(-Math.PI / 2);
    g.translate(NAVE_L / 2, 0, 0);
    return g;
  }, []);

  // Arched-window geometry — extruded shape with a half-round top. The
  // shape has X across the window (width) and Y up (height). Extrusion
  // along +Z gives it a small depth so it sits proud of the wall.
  const archedWindowGeo = useMemo(() => {
    const w = 1.05;
    const h = 3.4;
    const rim = 0.08;
    // Outer arch shape.
    const outer = new THREE.Shape();
    outer.moveTo(-w / 2, 0);
    outer.lineTo(-w / 2, h - w / 2);
    outer.absarc(0, h - w / 2, w / 2, Math.PI, 0, true);
    outer.lineTo(w / 2, 0);
    outer.closePath();
    // Punch out the glass hole in the middle.
    const inner = new THREE.Path();
    const iw = w - 2 * rim;
    const ih = h - 2 * rim;
    inner.moveTo(-iw / 2, rim);
    inner.lineTo(-iw / 2, rim + ih - iw / 2);
    inner.absarc(0, rim + ih - iw / 2, iw / 2, Math.PI, 0, true);
    inner.lineTo(iw / 2, rim);
    inner.closePath();
    outer.holes.push(inner);
    const g = new THREE.ExtrudeGeometry(outer, {
      depth: 0.1,
      bevelEnabled: false,
      steps: 1
    });
    return g;
  }, []);

  // Transept gable — ridge along local Z.
  const transeptRoofGeo = useMemo(() => {
    const T_L = 8.5;
    const T_W = 8.0;
    const T_H = 4.5;
    const shape = new THREE.Shape();
    shape.moveTo(-T_W / 2, 0);
    shape.lineTo(T_W / 2, 0);
    shape.lineTo(0, T_H);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: T_L,
      bevelEnabled: false,
      steps: 1
    });
    g.translate(0, 0, -T_L / 2);
    return g;
  }, []);

  if (!wallGeo) return null;

  const wallMat = <meshStandardMaterial color={WALL} roughness={0.9} side={THREE.DoubleSide} />;

  return (
    <group position={[landmark.position[0], 0, landmark.position[1]]}>
      {/* Nave walls — OSM footprint, centred at the group origin. */}
      <mesh geometry={wallGeo}>{wallMat}</mesh>

      {/* Main nave gable roof — sits directly on top of the wall extrusion. */}
      <mesh geometry={naveRoofGeo} position={[0, NAVE_WALL_H, 0]}>
        <meshStandardMaterial color={ROOF} roughness={0.9} />
      </mesh>

      {/* Two transept gables — one on each protrusion. Poly-space
          coordinates put the "high-Y" transept (v3, v4, v5) toward local
          +Z after negation, and the "low-Y" transept (v9, v10) toward
          local -Z. Positions and roof heights approximated from the
          three photographs. */}
      <mesh
        geometry={transeptRoofGeo}
        position={[2.3, NAVE_WALL_H, 9.5]}
      >
        <meshStandardMaterial color={ROOF} roughness={0.9} />
      </mesh>
      <mesh
        geometry={transeptRoofGeo}
        position={[-1.5, NAVE_WALL_H, -10.5]}
      >
        <meshStandardMaterial color={ROOF} roughness={0.9} />
      </mesh>

      {/* Two dormers on the north pitch — verified in kyrkan2.jpeg. */}
      {[-8, 6].map((dx, i) => (
        <group
          key={`dormer-${i}`}
          position={[dx, NAVE_WALL_H + 1.6, -3.5]}
        >
          <mesh>
            <boxGeometry args={[2.4, 1.8, 1.4]} />
            <meshStandardMaterial color={WALL} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <coneGeometry args={[1.6, 1.2, 4]} />
            <meshStandardMaterial color={ROOF} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.1, -0.72]}>
            <boxGeometry args={[1.4, 1.2, 0.06]} />
            <meshStandardMaterial color={TRIM} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Bell tower — west end. */}
      <group position={[TOWER_DX, 0, 0]}>
        <mesh position={[0, TOWER_BODY_H / 2, 0]}>
          <boxGeometry args={[TOWER_SIZE, TOWER_BODY_H, TOWER_SIZE]} />
          <meshStandardMaterial color={WALL} roughness={0.9} />
        </mesh>
        {/* Clock face on west face — verified in kyrkan2.jpeg. */}
        <mesh
          position={[-TOWER_SIZE / 2 - 0.02, TOWER_BODY_H - 3.8, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.95, 0.95, 0.1, 16]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
        <mesh
          position={[-TOWER_SIZE / 2 - 0.08, TOWER_BODY_H - 3.8, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.75, 0.75, 0.02, 16]} />
          <meshStandardMaterial color="#1a1712" />
        </mesh>
        {/* Cornice under the cap. */}
        <mesh position={[0, TOWER_BODY_H + 0.25, 0]}>
          <boxGeometry args={[TOWER_SIZE + 0.4, 0.5, TOWER_SIZE + 0.4]} />
          <meshStandardMaterial color={ROOF} roughness={0.9} />
        </mesh>
        {/* Ogee cap — 4-sided bell approximation. */}
        <mesh position={[0, TOWER_BODY_H + 1.6, 0]}>
          <cylinderGeometry
            args={[TOWER_SIZE * 0.4, TOWER_SIZE * 0.62, 1.8, 4]}
          />
          <meshStandardMaterial color={ROOF} roughness={0.9} />
        </mesh>
        <mesh position={[0, TOWER_BODY_H + 3.4, 0]}>
          <cylinderGeometry
            args={[TOWER_SIZE * 0.16, TOWER_SIZE * 0.4, 1.8, 4]}
          />
          <meshStandardMaterial color={ROOF} roughness={0.9} />
        </mesh>
        {/* Spire. */}
        <mesh position={[0, TOWER_BODY_H + 5.6, 0]}>
          <cylinderGeometry args={[0.18, 0.28, 2.6, 6]} />
          <meshStandardMaterial color={ROOF} roughness={0.9} />
        </mesh>
        {/* Cross finial. */}
        <mesh position={[0, TOWER_BODY_H + 7.6, 0]}>
          <boxGeometry args={[0.12, 1.4, 0.12]} />
          <meshStandardMaterial
            color={CROSS}
            emissive={CROSS}
            emissiveIntensity={0.25}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, TOWER_BODY_H + 7.7, 0]}>
          <boxGeometry args={[0.9, 0.12, 0.12]} />
          <meshStandardMaterial
            color={CROSS}
            emissive={CROSS}
            emissiveIntensity={0.25}
            roughness={0.5}
          />
        </mesh>
      </group>

      {/* PASS 3 — Arched windows on the two long nave facades. 5 per side,
          white frames on Falu-red walls, glass reads as dark tinted pane
          behind the frame. Arch tops verified in kyrkan2.jpeg. */}
      {[-12, -6, 0, 6, 12].map((dx, i) => (
        <group key={`w-${i}`}>
          {/* North (+Z) facade window. */}
          <group position={[dx, 2.6, NAVE_W / 2]}>
            <mesh geometry={archedWindowGeo}>
              <meshStandardMaterial color={TRIM} roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.35, 0.02]}>
              <boxGeometry args={[0.72, 1.9, 0.03]} />
              <meshStandardMaterial color="#1a1712" roughness={0.9} />
            </mesh>
          </group>
          {/* South (-Z) facade window — flipped so it faces outward. */}
          <group
            position={[dx, 2.6, -NAVE_W / 2]}
            rotation={[0, Math.PI, 0]}
          >
            <mesh geometry={archedWindowGeo}>
              <meshStandardMaterial color={TRIM} roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.35, 0.02]}>
              <boxGeometry args={[0.72, 1.9, 0.03]} />
              <meshStandardMaterial color="#1a1712" roughness={0.9} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Small entrance porch on the south transept (kyrkan.jpg). */}
      <mesh position={[2.3, 1.5, 14]}>
        <boxGeometry args={[2.4, 3.0, 1.6]} />
        <meshStandardMaterial color={WALL} roughness={0.9} />
      </mesh>
      <mesh position={[2.3, 3.2, 14]}>
        <coneGeometry args={[1.6, 1.2, 4]} />
        <meshStandardMaterial color={ROOF} roughness={0.9} />
      </mesh>

      {/* The churchyard rubble-stone perimeter wall is deferred: the actual
          perimeter dimensions are not yet verified, and the previous
          interim rectangle intersected public roads on nearby sides. Wall
          re-enters the scene once a perimeter reference is provided. See
          APPROXIMATION_REGISTER.md. */}

      {/* PASS 4 — Mature trees around the churchyard. Verified in all
          three photos: mixed deciduous perimeter with one large conifer
          visible on the east side in kyrkan.jpeg. Placement is hand-set
          well outside the polygon envelope so no tree clips walls or
          transepts. */}
      <LandmarkTree position={[19, 0, -2]} kind="coniferous" scale={1.35} />
      <LandmarkTree position={[-22, 0, -14]} scale={1.05} rotation={0.4} />
      <LandmarkTree position={[-22, 0, 14]} scale={1.15} rotation={1.7} />
      <LandmarkTree position={[22, 0, 16]} scale={1.0} rotation={-0.6} />
      <LandmarkTree position={[6, 0, -22]} scale={1.1} rotation={2.3} />
      <LandmarkTree position={[-10, 0, 22]} scale={1.05} rotation={-1.1} />
      <LandmarkTree position={[14, 0, 22]} scale={1.0} rotation={0.9} />

      {/* PASS 5 — Fine details.
          Stone path from the south porch out toward the churchyard
          perimeter, matching the entrance path visible in kyrkan2.jpeg,
          plus a small cluster of gravestones (foreground gravestone
          verified in kyrkan2.jpeg). Nothing invented — count and layout
          are conservative approximations. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2.3, 0.08, 18.5]}
      >
        <planeGeometry args={[2.0, 8.0]} />
        <meshStandardMaterial color="#a89f8d" roughness={0.95} />
      </mesh>
      {[
        [-8, 18, 0.3],
        [-6.4, 19.5, -0.15],
        [-9.3, 20.5, 0.2],
        [-5, 20.8, -0.1],
        [-7.5, 22, 0.4]
      ].map(([dx, dz, rot], i) => (
        <group
          key={`grave-${i}`}
          position={[dx, 0.15, dz]}
          rotation={[0, rot, 0]}
        >
          <mesh>
            <boxGeometry args={[0.55, 0.55, 0.15]} />
            <meshStandardMaterial color="#8a847a" roughness={0.98} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.35, 0.28, 0.12]} />
            <meshStandardMaterial color="#8a847a" roughness={0.98} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// The former CampusLandmark, GastgivaregardLandmark, PizzansLandmark and
// HerrgardLandmark components have been retired for ORDER 004 PASS 1. Each
// of them added invented silhouette detail on top of the OSM footprint —
// an octagonal wooden Sevillapaviljongen with a glowing sphere lantern
// (the real pavilion is a round drum under a multicoloured flat canopy on
// column pairs — see documentation/references/district-1/maltidenshus/),
// invented Bergslag roof volumes, chimneys, entrance wings, ornate
// mansard caps and so on. PASS 1 delivers only what OSM and the collected
// photographs verify: position, orientation, footprint, an approximated
// wall height, and a plausible-tone approximation wall colour. Silhouette
// (roofs, towers, chimneys, annexes, overall massing) is the domain of
// PASS 2; windows, entrances, materials and facade colour belong to
// PASS 3. The rendering is now expressed by CraftedFootprintPass1 in the
// composition below.

// ---------- Skola ----------
function SkolaLandmark({ landmark }: { landmark: Landmark }) {
  const b = buildingFor(landmark);
  const geo = useMemo(() => (b ? extrudeShape(b.poly, 8) : null), [b]);
  if (!b || !geo) return null;
  const centre = polygonCentre(b.poly);
  const wall = stainWall(landmark.id, '#c9b28e');
  const roof = stainRoof(landmark.id, '#7b3f2b');
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      {/* Hipped roof. */}
      <group position={[centre[0], 8.15, centre[1]]}>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[24, 1.7, 15]} />
          <meshStandardMaterial color={roof} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[18, 0.15, 10]} />
          <meshStandardMaterial color={roof} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// The former StationLandmark is retired for ORDER 004 PASS 1. Its invented
// gable-and-ridge roof volume has been removed. The station's OSM footprint
// is now rendered through CraftedFootprintPass1 in the composition.

// ---------- Torget (village square) ----------
// PASS 1 (ORDER 004, 2026-07-23) intended to use the OSM boundary polygon
// of way 122157681, but that way is stored under `roads` (a 54 × 4 m
// linear feature), not `buildings`, so buildingFor() falls back to a
// 36 × 30 placeholder rectangle. Proper polygon ingestion is a separate
// PASS 1 follow-up.
// PASS 4 (ORDER 005, 2026-07-23): formal deciduous tree avenue lining the
// long edges of the square. Verified in all three supplied photographs
// (torget.jpeg, torget2.jpeg, torget 3.jpg) — mature deciduous trees
// spaced regularly along at least one, likely both, long edges.
function TorgetLandmark({ landmark }: { landmark: Landmark }) {
  const b = buildingFor(landmark);
  const groundGeo = useMemo(() => {
    if (!b) return null;
    const c = polygonCentre(b.poly);
    const shape = new THREE.Shape();
    shape.moveTo(b.poly[0][0] - c[0], -(b.poly[0][1] - c[1]));
    for (let i = 1; i < b.poly.length; i++) {
      shape.lineTo(b.poly[i][0] - c[0], -(b.poly[i][1] - c[1]));
    }
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [b]);
  return (
    <group position={[landmark.position[0], 0, landmark.position[1]]}>
      {groundGeo ? (
        <mesh geometry={groundGeo} position={[0, 0.06, 0]}>
          <meshStandardMaterial
            color="#b6ab94"
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <planeGeometry args={[36, 30]} />
          <meshStandardMaterial color="#b6ab94" roughness={0.9} />
        </mesh>
      )}
      {/* PASS 4 — formal tree avenue along both long edges of the square. */}
      {[-14, -7, 0, 7, 14].flatMap((dx) => [
        <LandmarkTree
          key={`t-n-${dx}`}
          position={[dx, 0, -13]}
          scale={1.15}
          rotation={dx * 0.13}
        />,
        <LandmarkTree
          key={`t-s-${dx}`}
          position={[dx, 0, 13]}
          scale={1.15}
          rotation={-dx * 0.13}
        />
      ])}
    </group>
  );
}

// ---------- Grythyttans IP (sports ground) ----------
function IpLandmark({ landmark }: { landmark: Landmark }) {
  const b = buildingFor(landmark);
  const pos = landmark.position;
  const centre = b ? polygonCentre(b.poly) : pos;
  return (
    <group>
      {/* Playing surface — brighter grass tone. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centre[0], 0.06, centre[1]]}
      >
        <planeGeometry args={[100, 60]} />
        <meshStandardMaterial color="#7a9b6a" roughness={0.95} />
      </mesh>
      {/* Small stand along the north edge. */}
      <mesh position={[centre[0], 1.6, centre[1] - 34]}>
        <boxGeometry args={[26, 3.2, 5]} />
        <meshStandardMaterial color="#a89786" roughness={0.9} />
      </mesh>
      <mesh position={[centre[0], 3.4, centre[1] - 34]}>
        <boxGeometry args={[28, 0.3, 5.6]} />
        <meshStandardMaterial color="#3e3229" roughness={0.9} />
      </mesh>
      {/* Floodlight masts. */}
      {[-38, 38].map((dx, i) => (
        <group key={`fl-${i}`} position={[centre[0] + dx, 0, centre[1] - 22]}>
          <mesh position={[0, 6, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 12, 6]} />
            <meshStandardMaterial color="#3a3630" roughness={0.9} />
          </mesh>
          <mesh position={[0, 12.4, 0]}>
            <boxGeometry args={[1.6, 0.8, 0.4]} />
            <meshStandardMaterial
              color="#f4e6cf"
              emissive="#f4c680"
              emissiveIntensity={0.3}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Approximation ground marker (for OSM-node landmarks whose
// footprint has not yet been referenced) ----------
// A low-profile pad + short marker post at the OSM point. Reads as "an
// establishment is here" without asserting building form, height, colour
// or orientation. Used for Guldkringlan under the §4.3 pass until an
// aerial confirms the parcel footprint.
function ApproximationMarker({
  landmark,
  markerColour
}: {
  landmark: Landmark;
  markerColour: string;
}) {
  const pos = landmark.position;
  const wall = stainWall(landmark.id, markerColour);
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[3.2, 3.2, 0.3, 16]} />
        <meshStandardMaterial color="#b0a894" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 2.0, 8]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
    </group>
  );
}

// The former CraftedNode helper — a generic gabled box drawn around each
// OSM-node landmark — has been retired for ORDER 004 PASS 1. Its footprint,
// height, orientation, roof form and awning were all invented. Node
// landmarks (Guldkringlan, Cornelis, Glass & Choklad, Antikvariatet) are
// now rendered by ApproximationMarker until an aerial or facade reference
// establishes their real footprint. See documentation/references/
// district-1/ for the manifest per landmark.

// ---------- Composition ----------
export function CraftedLandmarks() {
  const kyrka = LANDMARK_BY_ID['gry-kyrka'];
  const campus = LANDMARK_BY_ID['gry-campus'];
  const gastgivaregard = LANDMARK_BY_ID['gry-gastgivaregard'];
  const pizzans = LANDMARK_BY_ID['gry-pizzanshus'];
  const herrgard = LANDMARK_BY_ID['gry-herrgard'];
  const skola = LANDMARK_BY_ID['gry-skola'];
  const station = LANDMARK_BY_ID['gry-jarnvag'];
  const torget = LANDMARK_BY_ID['gry-torget'];
  const cornelis = LANDMARK_BY_ID['gry-cornelis'];
  const kringlan = LANDMARK_BY_ID['gry-kringlan'];
  const glass = LANDMARK_BY_ID['gry-glass'];
  const antik = LANDMARK_BY_ID['gry-antik'];
  const ip = LANDMARK_BY_ID['gry-ip'];

  return (
    <group>
      {/* Grythyttans kyrka — full ORDER-003A reconstruction (walls, roof,
          transepts, dormers, bell tower, spire, cross, clock, windows,
          porch) from three verified reference photographs. Sits ahead of
          the rest of District 1 on the pass ladder. */}
      {kyrka && <ChurchLandmark landmark={kyrka} />}

      {/* ORDER-004 PASS 1: footprint-only extrusion at the correct frame
          for each landmark backed by an OSM way. Silhouette detail (roof
          forms, towers, chimneys, annexes) is intentionally absent —
          those are the domain of PASS 2. Wall heights and colours are
          approximation values documented in APPROXIMATION_REGISTER.md. */}
      {campus && <MaltidensHusPass2 landmark={campus} />}
      {gastgivaregard && <GastgivaregardPass2 landmark={gastgivaregard} />}
      {pizzans && (
        <CraftedFootprintPass1
          landmark={pizzans}
          wallHeight={6}
          wallColour="#c69b6a"
        />
      )}
      {herrgard && (
        <CraftedFootprintPass1
          landmark={herrgard}
          wallHeight={9}
          wallColour="#d9c9a4"
        />
      )}
      {station && (
        <CraftedFootprintPass1
          landmark={station}
          wallHeight={6}
          wallColour="#a5442c"
        />
      )}

      {/* SkolaLandmark and IpLandmark are outside the ORDER-004 District 1
          scope and are left in their previous state. They will be re-
          evaluated when their district enters reconstruction. */}
      {skola && <SkolaLandmark landmark={skola} />}
      {ip && <IpLandmark landmark={ip} />}

      {/* Torget — OSM-verified boundary polygon rendered as a paved plane
          at the landmark position. No monument, no benches, no vegetation
          until PASS 2 / PASS 4 references support them. */}
      {torget && <TorgetLandmark landmark={torget} />}

      {/* Node landmarks — OSM provides only a point. Footprint, height,
          orientation, roof form all unknown. ApproximationMarker asserts
          "an establishment exists here" until an aerial supplies the
          parcel footprint. Guldkringlan already has a facade photograph
          (documentation/references/district-1/guldkringlan/) but not an
          aerial, so it remains a marker for now. */}
      {kringlan && <ApproximationMarker landmark={kringlan} markerColour="#7b3f2b" />}
      {cornelis && <ApproximationMarker landmark={cornelis} markerColour="#b0715a" />}
      {glass && <ApproximationMarker landmark={glass} markerColour="#8ea3c0" />}
      {antik && <ApproximationMarker landmark={antik} markerColour="#8a8478" />}
    </group>
  );
}

// Not currently consumed from outside but preserved so the sprint status
// palette can be re-used by future selection chrome.
export type { CommercialStatus };
