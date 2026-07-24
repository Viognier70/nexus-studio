import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  carRoadSegments,
  closestRoadPoint,
  idHash,
  inAnyWater,
  nearAnyBuilding,
  nearAnyRoadSegment,
  obbLocalToWorld,
  orientedBbox,
  polygonArea,
  segmentIntersection
} from '../procgen/geom';

// Deterministic parcel boundaries — one line of fence, hedge or stone
// edge along each of the four OBB sides of every eligible residential
// building. Each segment is per-instance-scaled, so all fences of a
// given style render as a single drei Instances draw call.
//
// Style selection is driven by the building's wealth tier and a per-
// segment style hash — variety inside a neighbourhood without random
// noise. Segments are rejected if they would cross a road, sit on
// another building, or land in water.

type BoundaryStyle = 'painted_timber' | 'wire' | 'hedge' | 'stone';

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

// Wealth tier resolved per building. Mirrors the OsmBuildings profile
// (kept local to avoid coupling — the hash bucket is identical).
type WealthTier = 'modest' | 'standard' | 'prosperous';
function wealthFor(id: string): WealthTier {
  const w = idHash(id + ':wealth');
  return w < 0.28 ? 'modest' : w < 0.85 ? 'standard' : 'prosperous';
}

// Per-side style selection. `null` = no boundary on this side, which is
// a legitimate outcome: a modest cottage may have wire on the road
// side and nothing at the back, a prosperous villa a hedge on three
// sides and a stone edge along the driveway.
function chooseStyle(
  wealth: WealthTier,
  buildingHash: number,
  sideHash: number
): BoundaryStyle | null {
  // Modest tier: mostly bare, occasional wire.
  if (wealth === 'modest') {
    if (buildingHash < 0.50) return null;
    return sideHash < 0.6 ? 'wire' : null;
  }
  // Standard tier: mix of painted timber, hedge, some bare.
  if (wealth === 'standard') {
    if (sideHash < 0.24) return null;
    if (sideHash < 0.58) return 'painted_timber';
    return 'hedge';
  }
  // Prosperous tier: mostly hedge / painted timber, some stone.
  if (sideHash < 0.12) return null;
  if (sideHash < 0.55) return 'hedge';
  if (sideHash < 0.85) return 'painted_timber';
  return 'stone';
}

interface Segment3D {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
}
interface CornerPost {
  x: number;
  z: number;
}

// Same driveway rules OsmDriveways applies. Kept in sync here so the
// gate logic knows whether a driveway exists and where it lands.
const MAX_DRIVEWAY_LEN = 45;
const MIN_DRIVEWAY_LEN = 1.8;

// Gate + minimum-fragment thresholds. A useful fence fragment is at
// least 1.5 m long; a shorter cut is discarded so we don't render
// visible stubs. Half gate = 1.6 m so the total gap is ~3.2 m —
// enough to read as an entrance without breaking the parcel line.
const HALF_GATE = 1.6;
const MIN_FRAGMENT = 1.5;

// Split a raw fence side (defined by its world endpoints) into 0, 1
// or 2 Segment3D entries. If the driveway line crosses this side, cut
// a gate-width gap centred on the crossing point; otherwise return
// the full side. Fragments shorter than MIN_FRAGMENT are dropped.
function fenceSegmentsAcrossGate(
  wxA: number, wzA: number,
  wxB: number, wzB: number,
  driveway: { sx: number; sz: number; qx: number; qz: number } | null
): Segment3D[] {
  const emit = (aX: number, aZ: number, bX: number, bZ: number): Segment3D | null => {
    const dx = bX - aX;
    const dz = bZ - aZ;
    const length = Math.hypot(dx, dz);
    if (length < MIN_FRAGMENT) return null;
    return {
      midX: (aX + bX) / 2,
      midZ: (aZ + bZ) / 2,
      length,
      angle: Math.atan2(dz, dx)
    };
  };
  const full = emit(wxA, wzA, wxB, wzB);
  if (!full) return [];
  if (!driveway) return [full];

  const isect = segmentIntersection(
    wxA, wzA, wxB, wzB,
    driveway.sx, driveway.sz, driveway.qx, driveway.qz
  );
  if (!isect) return [full];

  // tA parametrises the fence side; cut a gate centred on tA.
  const sideLen = Math.hypot(wxB - wxA, wzB - wzA);
  if (sideLen === 0) return [full];
  const half = HALF_GATE / sideLen;
  const tCutA = Math.max(0, isect.tA - half);
  const tCutB = Math.min(1, isect.tA + half);
  const cutAx = wxA + tCutA * (wxB - wxA);
  const cutAz = wzA + tCutA * (wzB - wzA);
  const cutBx = wxA + tCutB * (wxB - wxA);
  const cutBz = wzA + tCutB * (wzB - wzA);
  const out: Segment3D[] = [];
  const left = emit(wxA, wzA, cutAx, cutAz);
  if (left) out.push(left);
  const right = emit(cutBx, cutBz, wxB, wzB);
  if (right) out.push(right);
  return out;
}


export function OsmParcelBoundaries() {
  const { paintedTimber, wire, hedge, stone, cornerPosts } = useMemo(() => {
    const paintedTimber: Segment3D[] = [];
    const wire: Segment3D[] = [];
    const hedge: Segment3D[] = [];
    const stone: Segment3D[] = [];
    const cornerPosts: CornerPost[] = [];
    const segments = carRoadSegments();

    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;

      const wealth = wealthFor(b.id);
      const buildingHash = idHash(b.id + ':fence');

      const obb = orientedBbox(b.poly);
      // Margins strictly larger than the OsmProceduralOutbuildings
      // maximum clearance (6.5 m for medium sheds) so a modest parcel
      // with a medium shed still encloses the shed inside the fence
      // line.
      const margin =
        wealth === 'prosperous' ? 9 : wealth === 'standard' ? 7.5 : 7;
      const halfW = obb.w / 2 + margin;
      const halfD = obb.d / 2 + margin;
      const corners: Array<[number, number]> = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD]
      ];

      // Track which corners are anchored by at least one valid side —
      // corner posts render only there so we don't leave a post
      // dangling in mid-air next to a rejected side.
      const cornerValid = [false, false, false, false];

      // Compute the parent's driveway line once — the fence sides
       // that cross it will be cut to accommodate a gate. Mirrors the
       // rules OsmDriveways applies.
      let driveway: { sx: number; sz: number; qx: number; qz: number } | null = null;
      const [dSx, dSz] = obbLocalToWorld(obb, 0, obb.d / 2 + 2.0);
      const nearestRoad = closestRoadPoint(dSx, dSz, segments);
      if (nearestRoad) {
        const dist = Math.sqrt(nearestRoad.distSq);
        if (dist >= MIN_DRIVEWAY_LEN && dist <= MAX_DRIVEWAY_LEN) {
          driveway = {
            sx: dSx,
            sz: dSz,
            qx: nearestRoad.qx,
            qz: nearestRoad.qz
          };
        }
      }

      for (let s = 0; s < 4; s++) {
        const [ax, az] = corners[s];
        const [bxx, bzz] = corners[(s + 1) % 4];
        const sideHash = idHash(b.id + ':side' + s);
        const style = chooseStyle(wealth, buildingHash, sideHash);
        if (!style) continue;

        // World endpoints of this side.
        const [wxA, wzA] = obbLocalToWorld(obb, ax, az);
        const [wxB, wzB] = obbLocalToWorld(obb, bxx, bzz);

        const NSAMPLES = 5;
        let valid = true;
        for (let i = 0; i <= NSAMPLES; i++) {
          const t = i / NSAMPLES;
          const px = wxA + t * (wxB - wxA);
          const pz = wzA + t * (wzB - wzA);
          if (nearAnyRoadSegment(px, pz, segments, 2.0)) { valid = false; break; }
          if (nearAnyBuilding(px, pz, b.id, 0.6)) { valid = false; break; }
          if (inAnyWater(px, pz)) { valid = false; break; }
        }
        if (!valid) continue;

        // Cut a gate where the driveway crosses this side; either 0,
        // 1 or 2 segments come back.
        const pieces = fenceSegmentsAcrossGate(wxA, wzA, wxB, wzB, driveway);
        if (pieces.length === 0) continue;

        for (const piece of pieces) {
          if (style === 'painted_timber') paintedTimber.push(piece);
          else if (style === 'wire') wire.push(piece);
          else if (style === 'hedge') hedge.push(piece);
          else stone.push(piece);
        }

        cornerValid[s] = true;
        cornerValid[(s + 1) % 4] = true;
      }

      // Corner post at each parcel corner adjacent to at least one
      // valid side. Small dark-timber post so the parcel edge reads as
      // an intentional composition rather than four floating slabs.
      for (let c = 0; c < 4; c++) {
        if (!cornerValid[c]) continue;
        const [wx, wz] = obbLocalToWorld(obb, corners[c][0], corners[c][1]);
        cornerPosts.push({ x: wx, z: wz });
      }
    }
    return { paintedTimber, wire, hedge, stone, cornerPosts };
  }, []);

  return (
    <group>
      {/* Painted timber fence: white board fence, ~1.1 m tall */}
      {paintedTimber.length > 0 && (
        <Instances limit={paintedTimber.length} range={paintedTimber.length}>
          <boxGeometry args={[1, 1.1, 0.08]} />
          <meshStandardMaterial color="#efe6d4" roughness={0.85} />
          {paintedTimber.map((s, i) => (
            <Instance
              key={`pt-${i}`}
              position={[s.midX, 0.55, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Wire fence: dark thin, ~0.9 m tall */}
      {wire.length > 0 && (
        <Instances limit={wire.length} range={wire.length}>
          <boxGeometry args={[1, 0.9, 0.03]} />
          <meshStandardMaterial color="#3f3830" roughness={0.9} />
          {wire.map((s, i) => (
            <Instance
              key={`wf-${i}`}
              position={[s.midX, 0.45, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Hedge: green box, ~0.9 m tall × 0.65 m thick */}
      {hedge.length > 0 && (
        <Instances limit={hedge.length} range={hedge.length}>
          <boxGeometry args={[1, 0.9, 0.65]} />
          <meshStandardMaterial color="#586a4a" roughness={1} />
          {hedge.map((s, i) => (
            <Instance
              key={`hd-${i}`}
              position={[s.midX, 0.45, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Stone edge: low pale-grey box, ~0.35 m tall */}
      {stone.length > 0 && (
        <Instances limit={stone.length} range={stone.length}>
          <boxGeometry args={[1, 0.35, 0.28]} />
          <meshStandardMaterial color="#8a8478" roughness={0.95} />
          {stone.map((s, i) => (
            <Instance
              key={`st-${i}`}
              position={[s.midX, 0.175, s.midZ]}
              rotation={[0, -s.angle, 0]}
              scale={[s.length, 1, 1]}
            />
          ))}
        </Instances>
      )}
      {/* Corner posts — small dark-timber posts at each parcel corner
          adjacent to at least one valid fence / hedge / stone side. */}
      {cornerPosts.length > 0 && (
        <Instances limit={cornerPosts.length} range={cornerPosts.length}>
          <boxGeometry args={[0.16, 1.2, 0.16]} />
          <meshStandardMaterial color="#3f382e" roughness={0.9} />
          {cornerPosts.map((c, i) => (
            <Instance
              key={`cp-${i}`}
              position={[c.x, 0.6, c.z]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
