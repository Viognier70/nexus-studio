import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../content/world';
import type { RawBuilding, Vec2Tuple } from '../content/world';

// District 2 handcrafted landmarks. Separate from CraftedLandmarks
// (District 1, frozen) so ORDER 014 work has its own file and cannot
// accidentally regress the D1 reconstructions.
//
// Reference package for every landmark rendered here lives at
// documentation/references/district-2/<landmark>/. Every landmark must
// meet the ORDER 014 threshold:
//   • Landmark tier: overall confidence ≥ 0.90
//   • Ordinary tier: overall confidence ≥ 0.75; footprint, placement,
//     orientation and scale MUST still be VERIFIED from a reference
//   • Detail may be typology-synthesised for ordinary tier only

const BUILDING_BY_ID: Record<string, RawBuilding> = Object.fromEntries(
  WORLD.buildings.map((b) => [b.id, b])
);

function polygonCentre(poly: Vec2Tuple[]): [number, number] {
  let cx = 0, cz = 0, n = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    cx += poly[i][0];
    cz += poly[i][1];
    n++;
  }
  return n === 0 ? [0, 0] : [cx / n, cz / n];
}

// Extrude a building polygon into a wall geometry centred on the
// polygon centroid. Matches the D1 convention in CraftedLandmarks so
// coordinate math for future decor (windows, roof, entrance) is local
// to the building centre. See the frame-convention comment on
// CraftedLandmarks::useLandmarkWallGeo for the derivation of the
// Y-negation trick.
function useWallGeo(
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

// ---------- Kärnhuset — PHASE 2 (walls + roof) ----------
// ORDER 014 District 2, ordinary tier (threshold 0.75).
//
// VERIFIED aspects (from documentation/references/district-2/karnhuset/):
//   • Footprint: OSM way 193810921 — 26-vertex irregular multi-wing
//     polygon (bbox 69.5 × 97.6 m, actual area 1 970.6 m²)
//   • Placement: OSM polygon centroid (world (407.8, -89.6))
//   • Orientation: baked into polygon geometry
//   • Scale: OSM
//   • Year built: 1993 (Akademiska Hus facility T0014002)
//   • Function: admin, classrooms, food lab, sensory lab, 2 lecture
//     halls (K112 30-seat floor 1, K215 60-seat floor 2), Studentpuben
//   • Storey count: 2 minimum (K215 confirmed on floor 2)
//
// TYPOLOGY-SYNTHESIZED aspects (Bergslag 1993 institutional):
//   • Wall material: painted institutional cladding — pale plaster
//     (matches procedural university KIND_COLOUR baseline so the
//     handcrafted rendering doesn't invent a divergent identity
//     against neighbouring institutional buildings)
//   • Wall height: 7 m (2-storey institutional, ~3.5 m floor-to-floor)
//   • Roof: flat with a low parapet cap. Bergslag institutional 1993
//     multi-wing polygons don't lend themselves to per-wing gables
//     without inventing ridge lines; a flat parapetted roof is the
//     safe institutional-typology default, and it matches the
//     neighbouring Måltidens hus roof geometry (also flat).
//
// NOT INCLUDED in PHASE 2 (later phases):
//   • Windows, entrance (PHASE 3)
//   • Immediate surroundings (PHASE 4)
//   • Fine detail (PHASE 5)
function KarnhusetD2Pass2({ landmark }: { landmark?: unknown } = {}) {
  const b = BUILDING_BY_ID['w193810921'];
  const WALL_H = 7;
  const PARAPET_H = 0.5;   // shallow parapet cap for the flat roof
  const wallGeo = useWallGeo(b, WALL_H);
  const parapetGeo = useWallGeo(b, PARAPET_H);
  void landmark;   // reserved for a future gry-* landmark record

  if (!b || !wallGeo || !parapetGeo) return null;

  const centre = polygonCentre(b.poly);
  const WALL_COLOUR = '#e0d8c2';   // very slight desaturation of the procedural university baseline
  const ROOF_COLOUR = '#3a352d';   // dark grey-brown institutional flat roof

  return (
    <group position={[centre[0], 0, centre[1]]}>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial
          color={WALL_COLOUR}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Flat parapetted roof — dark grey-brown box that caps the
          walls with a small vertical face reading as the parapet
          edge from oblique view. */}
      <mesh geometry={parapetGeo} position={[0, WALL_H, 0]}>
        <meshStandardMaterial
          color={ROOF_COLOUR}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------- Composition ----------
export function CraftedLandmarksD2() {
  return (
    <group>
      <KarnhusetD2Pass2 />
    </group>
  );
}
