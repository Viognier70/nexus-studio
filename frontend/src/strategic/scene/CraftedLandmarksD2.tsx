import { Instance, Instances } from '@react-three/drei';
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
interface WindowInst { x: number; y: number; z: number; angleY: number }
interface CornerpostInst { x: number; z: number }
interface FasciaInst { midX: number; midZ: number; length: number; angle: number }

// Walk the polygon once to derive:
//   • Window rhythm on every outer edge > 4 m, 2 storeys, ~3.5 m bays
//   • Cornerposts at convex vertices only (concave notches don't get one)
//   • Fascia strips along every edge (dark line at wall/roof junction)
//   • Longest edge midpoint + outward normal — used for the main entrance
// All positions are in the LOCAL frame (offset from the polygon centroid)
// so they render inside the outer group.
function derivePhase3Decor(b: RawBuilding, centre: [number, number]) {
  const windows: WindowInst[] = [];
  const cornerposts: CornerpostInst[] = [];
  const fascia: FasciaInst[] = [];
  const n = b.poly.length - 1;   // closed polygon: last vertex = first

  let entranceEdge: {
    midLx: number; midLz: number; nx: number; nz: number; angleY: number
  } | null = null;
  let longestLen = 0;

  for (let i = 0; i < n; i++) {
    const p1 = b.poly[i];
    const p2 = b.poly[i + 1];
    const dx = p2[0] - p1[0];
    const dz = p2[1] - p1[1];
    const len = Math.hypot(dx, dz);
    if (len === 0) continue;

    // Outward normal for CCW polygon in (X, Z) coords.
    const nx = -dz / len;
    const nz = dx / len;
    const angleY = Math.atan2(nx, nz);   // rotate so +Z faces outward

    // Local midpoint of the edge (relative to centroid).
    const midX = (p1[0] + p2[0]) / 2;
    const midZ = (p1[1] + p2[1]) / 2;
    const midLx = midX - centre[0];
    const midLz = midZ - centre[1];

    // Fascia — one strip per edge, always emitted.
    fascia.push({ midX: midLx, midZ: midLz, length: len, angle: angleY });

    // Windows on edges that can accommodate at least one bay.
    if (len >= 4) {
      const bays = Math.max(1, Math.round(len / 3.5));
      for (let bay = 0; bay < bays; bay++) {
        const t = (bay + 0.5) / bays;
        const px = p1[0] + t * dx;
        const pz = p1[1] + t * dz;
        const wLx = px - centre[0] + nx * 0.06;   // 0.06 m proud of the wall
        const wLz = pz - centre[1] + nz * 0.06;
        // Two storeys per bay.
        windows.push({ x: wLx, y: 2.4, z: wLz, angleY });
        windows.push({ x: wLx, y: 4.9, z: wLz, angleY });
      }
    }

    // Track the longest edge for the main entrance.
    if (len > longestLen) {
      longestLen = len;
      entranceEdge = { midLx, midLz, nx, nz, angleY };
    }
  }

  // Cornerposts at convex vertices only (cross product > 0 in CCW frame).
  for (let i = 0; i < n; i++) {
    const prev = b.poly[(i - 1 + n) % n];
    const curr = b.poly[i];
    const next = b.poly[(i + 1) % n];
    const ix = curr[0] - prev[0];
    const iz = curr[1] - prev[1];
    const ox = next[0] - curr[0];
    const oz = next[1] - curr[1];
    const cross = ix * oz - iz * ox;
    if (cross <= 0.1) continue;   // skip concave / near-straight
    cornerposts.push({
      x: curr[0] - centre[0],
      z: curr[1] - centre[1]
    });
  }

  return { windows, cornerposts, fascia, entranceEdge };
}

function KarnhusetD2Pass5({ landmark }: { landmark?: unknown } = {}) {
  const b = BUILDING_BY_ID['w193810921'];
  const WALL_H = 7;
  const PARAPET_H = 0.5;
  const wallGeo = useWallGeo(b, WALL_H);
  const parapetGeo = useWallGeo(b, PARAPET_H);
  void landmark;

  const decor = useMemo(() => {
    if (!b) return null;
    return derivePhase3Decor(b, polygonCentre(b.poly));
  }, [b]);

  if (!b || !wallGeo || !parapetGeo || !decor) return null;

  const centre = polygonCentre(b.poly);
  const WALL_COLOUR = '#e0d8c2';
  const ROOF_COLOUR = '#3a352d';
  const TRIM_COLOUR = '#efe6d4';       // cream cornerboards + door lintel
  const FASCIA_COLOUR = '#3a352d';     // matches roof
  const WINDOW_COLOUR = '#efe6d4';     // pale institutional glass with cream frame reads as one at zoom
  const WINDOW_EMISSIVE = '#f4c680';   // faint warm interior tint

  const entrance = decor.entranceEdge;

  return (
    <group position={[centre[0], 0, centre[1]]}>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial
          color={WALL_COLOUR}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={parapetGeo} position={[0, WALL_H, 0]}>
        <meshStandardMaterial
          color={ROOF_COLOUR}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Windows — one Instances group across the whole polygon. Each
          window is 0.95 × 1.35 m; box depth 0.06 m sits 0.06 m proud
          of the wall so it depth-writes cleanly above the wall face. */}
      {decor.windows.length > 0 && (
        <Instances
          limit={decor.windows.length}
          range={decor.windows.length}
        >
          <boxGeometry args={[0.95, 1.35, 0.06]} />
          <meshStandardMaterial
            color={WINDOW_COLOUR}
            emissive={WINDOW_EMISSIVE}
            emissiveIntensity={0.12}
            roughness={0.65}
          />
          {decor.windows.map((w, i) => (
            <Instance
              key={`kw-${i}`}
              position={[w.x, w.y, w.z]}
              rotation={[0, w.angleY, 0]}
            />
          ))}
        </Instances>
      )}

      {/* Cornerposts — cream painted vertical boards at convex
          vertices. Reads as the classic Bergslag painted-timber
          cornerboard trim. */}
      {decor.cornerposts.length > 0 && (
        <Instances
          limit={decor.cornerposts.length}
          range={decor.cornerposts.length}
        >
          <boxGeometry args={[0.28, WALL_H, 0.28]} />
          <meshStandardMaterial color={TRIM_COLOUR} roughness={0.85} />
          {decor.cornerposts.map((c, i) => (
            <Instance
              key={`kcp-${i}`}
              position={[c.x, WALL_H / 2, c.z]}
            />
          ))}
        </Instances>
      )}

      {/* PHASE 5 — Dark drainpipes at every convex vertex, running
          from the parapet down to the ground. Standard Bergslag
          institutional-timber drainage detail; every cornerboard
          gets a paired downpipe on the outer side. */}
      {decor.cornerposts.length > 0 && (
        <Instances
          limit={decor.cornerposts.length}
          range={decor.cornerposts.length}
        >
          <cylinderGeometry args={[0.09, 0.09, WALL_H, 6]} />
          <meshStandardMaterial color={FASCIA_COLOUR} roughness={0.9} />
          {decor.cornerposts.map((c, i) => (
            <Instance
              key={`kdp-${i}`}
              position={[c.x, WALL_H / 2, c.z]}
            />
          ))}
        </Instances>
      )}

      {/* Fascia — dark line along every outer edge at the wall / roof
          junction. Reads as the parapet-shadow band. */}
      {decor.fascia.length > 0 && (
        <Instances
          limit={decor.fascia.length}
          range={decor.fascia.length}
        >
          <boxGeometry args={[1, 0.22, 0.05]} />
          <meshStandardMaterial color={FASCIA_COLOUR} roughness={0.9} />
          {decor.fascia.map((f, i) => (
            <Instance
              key={`kf-${i}`}
              position={[f.midX, WALL_H - 0.06, f.midZ]}
              rotation={[0, f.angle, 0]}
              scale={[f.length, 1, 1]}
            />
          ))}
        </Instances>
      )}

      {/* Main entrance — placed on the longest outer edge. A dark door
          + cream lintel + small dark canopy overhead. Restrained
          institutional composition, no portico, no columns, nothing
          the reference package doesn't support. PHASE 4 adds a
          small paved apron directly in front. */}
      {entrance && (
        <group
          position={[
            entrance.midLx + entrance.nx * 0.04,
            0,
            entrance.midLz + entrance.nz * 0.04
          ]}
          rotation={[0, entrance.angleY, 0]}
        >
          {/* PHASE 4 — Small paved apron in front of the entrance
              (Bergslag academic-institutional standard). Sits above
              landcover so it reads over grass. Kept restrained: no
              parking lot / bicycle stand / bollards placed without
              a reference. */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.13, 2.2]}
          >
            <planeGeometry args={[6.5, 3.6]} />
            <meshStandardMaterial color="#a89e88" roughness={0.95} />
          </mesh>
          {/* Threshold step */}
          <mesh position={[0, 0.11, 0.35]}>
            <boxGeometry args={[2.4, 0.22, 0.6]} />
            <meshStandardMaterial color="#8a8078" roughness={0.95} />
          </mesh>
          {/* Twin doors */}
          <mesh position={[-0.55, 1.35, 0.05]}>
            <boxGeometry args={[1.05, 2.65, 0.06]} />
            <meshStandardMaterial color="#2f2620" roughness={0.85} />
          </mesh>
          <mesh position={[0.55, 1.35, 0.05]}>
            <boxGeometry args={[1.05, 2.65, 0.06]} />
            <meshStandardMaterial color="#2f2620" roughness={0.85} />
          </mesh>
          {/* Cream lintel */}
          <mesh position={[0, 2.9, 0.06]}>
            <boxGeometry args={[2.4, 0.15, 0.06]} />
            <meshStandardMaterial color={TRIM_COLOUR} roughness={0.85} />
          </mesh>
          {/* Small dark canopy above the doors */}
          <mesh position={[0, 3.1, 0.45]}>
            <boxGeometry args={[2.8, 0.14, 0.9]} />
            <meshStandardMaterial color={FASCIA_COLOUR} roughness={0.9} />
          </mesh>
          {/* Wall lantern to the side of the entrance */}
          <mesh position={[1.5, 3.1, 0.08]}>
            <boxGeometry args={[0.22, 0.35, 0.22]} />
            <meshStandardMaterial
              color="#f4e6cf"
              emissive="#f4c680"
              emissiveIntensity={0.5}
              roughness={0.55}
            />
          </mesh>
          {/* PHASE 5 — Small cream address / building-name plate
              beside the door at eye level. Reads as generic building
              marking at strategic zoom (text is a bitmap job outside
              the current scope). */}
          <mesh position={[-1.6, 1.9, 0.06]}>
            <boxGeometry args={[0.35, 0.55, 0.04]} />
            <meshStandardMaterial color={TRIM_COLOUR} roughness={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ---------- Old Station corridor — shared industrial-shed helper ----------
// Handcrafts the actual OSM polygon at a chosen wall height. Reused
// across the 5 D2 station-corridor buildings so all five share one
// small component. Each renders inside a group anchored at its own
// polygon centroid, using the same D1-style Y-negation frame
// convention as useWallGeo.
//
// BATCH PHASE 1: walls only. Later phases will progressively add
// roof, facade, surroundings and fine detail — same batch mechanic,
// same shared helper.

interface IndustrialShedProps {
  osmId: string;
  wallHeight: number;
  wallColour: string;
  roofColour: string;
}

function IndustrialShedD2Pass5({
  osmId,
  wallHeight,
  wallColour,
  roofColour
}: IndustrialShedProps) {
  const b = BUILDING_BY_ID[osmId];
  const PARAPET_H = 0.4;
  const wallGeo = useWallGeo(b, wallHeight);
  const parapetGeo = useWallGeo(b, PARAPET_H);

  // Reuse the polygon-decor helper — derives cornerposts, fascia,
  // longest edge (loading dock location) from the OSM polygon.
  const decor = useMemo(() => {
    if (!b) return null;
    return derivePhase3Decor(b, polygonCentre(b.poly));
  }, [b]);

  if (!b || !wallGeo || !parapetGeo || !decor) return null;

  const centre = polygonCentre(b.poly);
  const CORNERPOST_COLOUR = '#2f2925';   // dark iron / weathered timber
  const FASCIA_COLOUR = roofColour;

  const loadingDoorHeight = Math.min(wallHeight - 0.5, 3.6);
  const dock = decor.entranceEdge;   // longest edge = loading side

  return (
    <group position={[centre[0], 0, centre[1]]}>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial
          color={wallColour}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={parapetGeo} position={[0, wallHeight, 0]}>
        <meshStandardMaterial
          color={roofColour}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dark cornerposts at convex polygon vertices — industrial
          reinforcement / iron corner cladding. */}
      {decor.cornerposts.length > 0 && (
        <Instances
          limit={decor.cornerposts.length}
          range={decor.cornerposts.length}
        >
          <boxGeometry args={[0.22, wallHeight, 0.22]} />
          <meshStandardMaterial color={CORNERPOST_COLOUR} roughness={0.9} />
          {decor.cornerposts.map((c, i) => (
            <Instance
              key={`icp-${i}`}
              position={[c.x, wallHeight / 2, c.z]}
            />
          ))}
        </Instances>
      )}

      {/* PHASE 5 — Dark downpipes at every convex vertex (industrial
          drainage standard). Same positions as the cornerposts. */}
      {decor.cornerposts.length > 0 && (
        <Instances
          limit={decor.cornerposts.length}
          range={decor.cornerposts.length}
        >
          <cylinderGeometry args={[0.08, 0.08, wallHeight, 6]} />
          <meshStandardMaterial color={CORNERPOST_COLOUR} roughness={0.9} />
          {decor.cornerposts.map((c, i) => (
            <Instance
              key={`idp-${i}`}
              position={[c.x, wallHeight / 2, c.z]}
            />
          ))}
        </Instances>
      )}

      {/* PHASE 5 — Small roof exhaust vent at the polygon centroid.
          Universal industrial-building rooftop fitting. */}
      <group position={[0, wallHeight + PARAPET_H, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 1.2, 10]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.15, 10]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
        </mesh>
      </group>

      {/* Fascia at wall/roof junction — matches parapet colour. */}
      {decor.fascia.length > 0 && (
        <Instances
          limit={decor.fascia.length}
          range={decor.fascia.length}
        >
          <boxGeometry args={[1, 0.2, 0.05]} />
          <meshStandardMaterial color={FASCIA_COLOUR} roughness={0.9} />
          {decor.fascia.map((f, i) => (
            <Instance
              key={`if-${i}`}
              position={[f.midX, wallHeight - 0.05, f.midZ]}
              rotation={[0, f.angle, 0]}
              scale={[f.length, 1, 1]}
            />
          ))}
        </Instances>
      )}

      {/* Single loading door on the longest edge — no glass, industrial
          roll-up style. Dimensions scale with the building's wall
          height so small BJ outbuildings get pedestrian-scale doors,
          large modern warehouses get bay-scale roll-ups. */}
      {dock && (
        <group
          position={[
            dock.midLx + dock.nx * 0.04,
            0,
            dock.midLz + dock.nz * 0.04
          ]}
          rotation={[0, dock.angleY, 0]}
        >
          <mesh position={[0, loadingDoorHeight / 2, 0.05]}>
            <boxGeometry args={[
              wallHeight > 6 ? 4.4 : 2.6,
              loadingDoorHeight,
              0.08
            ]} />
            <meshStandardMaterial color="#2a251f" roughness={0.85} />
          </mesh>
          {/* Small dark step in front of the door */}
          <mesh position={[0, 0.09, 0.35]}>
            <boxGeometry args={[
              wallHeight > 6 ? 4.6 : 2.8,
              0.18,
              0.6
            ]} />
            <meshStandardMaterial color="#6a6058" roughness={0.95} />
          </mesh>
          {/* PHASE 4 — Gravel loading yard in front of the dock. Larger
              for larger buildings (freight trucks need turnaround). */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.11, wallHeight > 6 ? 5.5 : 2.8]}
          >
            <planeGeometry args={[
              wallHeight > 6 ? 12 : 6,
              wallHeight > 6 ? 9 : 4.5
            ]} />
            <meshStandardMaterial color="#8f867a" roughness={0.95} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Typology palette for the 5 corridor buildings. Kept close to the
// procedural `industrial` and `barn` KIND_COLOUR baselines from
// OsmBuildings so neighbourhood coherence holds; per-building
// variation from the historical/functional context (BJ era vs
// modern food industry) applied within that palette.
interface StationCorridorEntry {
  osmId: string;
  wallHeight: number;
  wallColour: string;
  roofColour: string;   // reserved for PHASE 2
  note: string;
}

const STATION_CORRIDOR: StationCorridorEntry[] = [
  {
    osmId: 'w870510842',
    wallHeight: 4,
    wallColour: '#7a3626',   // Faluröd — station-adjacent BJ-era outbuilding
    roofColour: '#312622',
    note: 'BJ switching building (small)'
  },
  {
    osmId: 'w870510839',
    wallHeight: 5,
    wallColour: '#6a3226',   // dark Faluröd — freight warehouse
    roofColour: '#2f2925',
    note: 'BJ-era freight warehouse'
  },
  {
    osmId: 'w870510833',
    wallHeight: 5,
    wallColour: '#6a675e',   // industrial grey — modern food-industry
    roofColour: '#3d3a34',
    note: 'Medium food-industry warehouse'
  },
  {
    osmId: 'w870510834',
    wallHeight: 7,
    wallColour: '#6f6c62',   // industrial grey (slightly lighter for the largest)
    roofColour: '#3d3a34',
    note: 'Large food-industry complex'
  },
  {
    osmId: 'w870510823',
    wallHeight: 7,
    wallColour: '#6a675e',   // industrial grey
    roofColour: '#3d3a34',
    note: 'Largest food-industry warehouse'
  }
];

// ---------- School complex — shared helper ----------
// Handcrafts each Grythyttans skola outbuilding at its actual OSM
// polygon. Reused across the 9 buildings of the D2 school-complex
// zone. Palette matches the procedural `school` KIND_COLOUR baseline
// (warm ochre plaster + brown roof) so the handcrafted buildings sit
// coherently among any procedural school buildings elsewhere.

interface SchoolBuildingProps {
  osmId: string;
  wallHeight: number;
  wallColour: string;
  roofColour: string;
}

function SchoolBuildingD2Pass3({
  osmId,
  wallHeight,
  wallColour,
  roofColour
}: SchoolBuildingProps) {
  const b = BUILDING_BY_ID[osmId];
  const PARAPET_H = 0.45;
  const wallGeo = useWallGeo(b, wallHeight);
  const parapetGeo = useWallGeo(b, PARAPET_H);

  const decor = useMemo(() => {
    if (!b) return null;
    return derivePhase3Decor(b, polygonCentre(b.poly));
  }, [b]);

  if (!b || !wallGeo || !parapetGeo || !decor) return null;

  const centre = polygonCentre(b.poly);
  const TRIM_COLOUR = '#efe6d4';        // cream painted-timber institutional trim
  const WINDOW_COLOUR = '#efe6d4';
  const WINDOW_EMISSIVE = '#f4c680';
  const FASCIA_COLOUR = roofColour;
  const twoStoreys = wallHeight >= 6;
  const entrance = decor.entranceEdge;

  return (
    <group position={[centre[0], 0, centre[1]]}>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial
          color={wallColour}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={parapetGeo} position={[0, wallHeight, 0]}>
        <meshStandardMaterial
          color={roofColour}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Institutional windows — 1 or 2 storeys per building. Only
          the +Z-facing side of each edge is emitted; each `window`
          from decor is already positioned proud of the wall with
          the correct rotation. Emit the second storey only for
          buildings tall enough. */}
      {decor.windows.length > 0 && (
        <Instances
          limit={decor.windows.length}
          range={decor.windows.length}
        >
          <boxGeometry args={[0.95, 1.35, 0.06]} />
          <meshStandardMaterial
            color={WINDOW_COLOUR}
            emissive={WINDOW_EMISSIVE}
            emissiveIntensity={0.12}
            roughness={0.65}
          />
          {decor.windows
            .filter((w) => twoStoreys || w.y < 3.5)
            .map((w, i) => (
              <Instance
                key={`sw-${osmId}-${i}`}
                position={[w.x, w.y, w.z]}
                rotation={[0, w.angleY, 0]}
              />
            ))}
        </Instances>
      )}

      {/* Cornerposts — cream painted vertical trim at every convex
          polygon vertex. */}
      {decor.cornerposts.length > 0 && (
        <Instances
          limit={decor.cornerposts.length}
          range={decor.cornerposts.length}
        >
          <boxGeometry args={[0.24, wallHeight, 0.24]} />
          <meshStandardMaterial color={TRIM_COLOUR} roughness={0.85} />
          {decor.cornerposts.map((c, i) => (
            <Instance
              key={`scp-${osmId}-${i}`}
              position={[c.x, wallHeight / 2, c.z]}
            />
          ))}
        </Instances>
      )}

      {/* Fascia at wall/roof junction. */}
      {decor.fascia.length > 0 && (
        <Instances
          limit={decor.fascia.length}
          range={decor.fascia.length}
        >
          <boxGeometry args={[1, 0.2, 0.05]} />
          <meshStandardMaterial color={FASCIA_COLOUR} roughness={0.9} />
          {decor.fascia.map((f, i) => (
            <Instance
              key={`sf-${osmId}-${i}`}
              position={[f.midX, wallHeight - 0.05, f.midZ]}
              rotation={[0, f.angle, 0]}
              scale={[f.length, 1, 1]}
            />
          ))}
        </Instances>
      )}

      {/* Main entrance — one per building, on the longest edge.
          Twin doors sized for schoolchildren / staff traffic. Only
          emit for buildings large enough to be a main entrance
          (skip the smallest annex). */}
      {entrance && wallHeight >= 5 && (
        <group
          position={[
            entrance.midLx + entrance.nx * 0.04,
            0,
            entrance.midLz + entrance.nz * 0.04
          ]}
          rotation={[0, entrance.angleY, 0]}
        >
          <mesh position={[0, 0.11, 0.35]}>
            <boxGeometry args={[2.2, 0.22, 0.55]} />
            <meshStandardMaterial color="#8a8078" roughness={0.95} />
          </mesh>
          <mesh position={[-0.5, 1.35, 0.05]}>
            <boxGeometry args={[0.95, 2.6, 0.06]} />
            <meshStandardMaterial color="#2f2620" roughness={0.85} />
          </mesh>
          <mesh position={[0.5, 1.35, 0.05]}>
            <boxGeometry args={[0.95, 2.6, 0.06]} />
            <meshStandardMaterial color="#2f2620" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.83, 0.06]}>
            <boxGeometry args={[2.15, 0.14, 0.06]} />
            <meshStandardMaterial color={TRIM_COLOUR} roughness={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// School palette per building. Wall heights scale with function
// class (small annex → 4.5 m single-storey; large multi-wing main
// building → 7 m two-storey). Wall colours drawn from a small
// coherent palette so the whole complex reads as one municipal
// facility rather than 9 independent buildings.
interface SchoolEntry {
  osmId: string;
  wallHeight: number;
  wallColour: string;
  roofColour: string;
  note: string;
}

const SCHOOL_COMPLEX: SchoolEntry[] = [
  { osmId: 'w870510877', wallHeight: 4.5, wallColour: '#c4ac86', roofColour: '#5a3f30', note: 'small annex' },
  { osmId: 'w870510878', wallHeight: 6.0, wallColour: '#c4ac86', roofColour: '#5a3f30', note: 'medium block' },
  { osmId: 'w870510876', wallHeight: 7.0, wallColour: '#c9b28e', roofColour: '#5a3f30', note: 'main F-6 wing (largest)' },
  { osmId: 'w870510869', wallHeight: 5.5, wallColour: '#c4ac86', roofColour: '#5a3f30', note: 'medium block' },
  { osmId: 'w870510870', wallHeight: 6.0, wallColour: '#c4ac86', roofColour: '#5a3f30', note: 'medium block' },
  { osmId: 'w870510866', wallHeight: 6.0, wallColour: '#c4ac86', roofColour: '#5a3f30', note: 'medium block' },
  { osmId: 'w870510884', wallHeight: 5.0, wallColour: '#c9b28e', roofColour: '#5a3f30', note: 'L-shape annex (Björken/Linden preschool)' },
  { osmId: 'w870510872', wallHeight: 6.5, wallColour: '#c9b28e', roofColour: '#5a3f30', note: 'large block (Björken/Linden preschool)' },
  { osmId: 'w870510871', wallHeight: 6.0, wallColour: '#c4ac86', roofColour: '#5a3f30', note: 'medium block' }
];

// ---------- Composition ----------
export function CraftedLandmarksD2() {
  return (
    <group>
      <KarnhusetD2Pass5 />
      {STATION_CORRIDOR.map((e) => (
        <IndustrialShedD2Pass5
          key={e.osmId}
          osmId={e.osmId}
          wallHeight={e.wallHeight}
          wallColour={e.wallColour}
          roofColour={e.roofColour}
        />
      ))}
      {SCHOOL_COMPLEX.map((e) => (
        <SchoolBuildingD2Pass3
          key={e.osmId}
          osmId={e.osmId}
          wallHeight={e.wallHeight}
          wallColour={e.wallColour}
          roofColour={e.roofColour}
        />
      ))}
    </group>
  );
}
