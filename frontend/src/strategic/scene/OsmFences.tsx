import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  carRoadSegments,
  closestRoadPoint,
  obbLocalToWorld,
  orientedBbox,
  polygonArea
} from '../procgen/geom';

// ORDER 030 recognisability lift, Tier 1a — procedural fencing.
//
// Vision Owner Street View survey (RECOGNISABILITY_SURVEY.md) found
// every plot on every street has some kind of boundary — white picket,
// dark timber field fence, low stone wall — and localhost renders none.
// This was the single most-cited defect across all four street surveys.
//
// This component draws a low fence line along the road-facing edge of
// every residential-family building. Two draw calls total (rail +
// posts), rendered via drei Instances so village-scale count is cheap.
//
// The road-facing edge is chosen by picking whichever of the OBB's two
// long-side midpoints is closest to a driveable road. The fence sits
// ~4 m out from that edge — inside the plot but at the visible property
// boundary, on the road side.

const HOST_KINDS = new Set([
  'house', 'detached', 'residential', 'apartments', 'yes', 'outbuilding'
]);

// Skip buildings too far from any road — a fence in the middle of a
// pasture is not what people see from the street. Also skips buildings
// whose OBB is so small that a fence would overlap the entrance step.
const MAX_ROAD_DIST = 55;
const MIN_AREA = 45;
const MIN_LONG_SIDE = 5;

// Fence sits outside the building's OBB long-side, on the road-facing
// edge, at this offset (metres).
const FENCE_OFFSET = 3.5;

// Fence panel dimensions. Kept thin so aerial reads as a line, tall
// enough that street-level reads as a barrier.
const FENCE_HEIGHT = 0.9;
const FENCE_THICK = 0.06;
const POST_HEIGHT = 1.05;
const POST_SIZE = 0.12;

interface FencePanel {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
}

interface FencePost {
  x: number;
  z: number;
  angle: number;
}

export function OsmFences() {
  const { panels, posts } = useMemo<{
    panels: FencePanel[];
    posts: FencePost[];
  }>(() => {
    const segments = carRoadSegments();
    const panels: FencePanel[] = [];
    const posts: FencePost[] = [];

    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < MIN_AREA) continue;

      const obb = orientedBbox(b.poly);
      // Long-side length (the OBB width w is the longest dimension by
      // orientedBbox construction).
      const longSide = Math.max(obb.w, obb.d);
      if (longSide < MIN_LONG_SIDE) continue;

      // Two candidate fence positions — one on each long edge of the OBB.
      // Long edge midpoints sit at local (0, ±d/2) — orientedBbox aligns
      // its w-axis to the longest polygon edge, so d is the perpendicular.
      const half = obb.d / 2 + FENCE_OFFSET;
      const [ax, az] = obbLocalToWorld(obb, 0, half);
      const [bx, bz] = obbLocalToWorld(obb, 0, -half);

      const nearestA = closestRoadPoint(ax, az, segments);
      const nearestB = closestRoadPoint(bx, bz, segments);
      const distA = nearestA ? Math.sqrt(nearestA.distSq) : Infinity;
      const distB = nearestB ? Math.sqrt(nearestB.distSq) : Infinity;
      const bestDist = Math.min(distA, distB);
      if (bestDist > MAX_ROAD_DIST) continue;
      const useA = distA <= distB;
      const midX = useA ? ax : bx;
      const midZ = useA ? az : bz;

      // Fence orientation = OBB's w-axis (parallel to the long side).
      const angle = obb.angle;
      // Fence panel length — the full OBB long side, minus a small
      // notch at either end so posts fit inside the panel run.
      const panelLen = Math.max(3, obb.w - 0.5);

      panels.push({
        midX,
        midZ,
        length: panelLen,
        angle
      });

      // Corner posts — one at each end of the panel.
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const halfLen = panelLen / 2;
      posts.push({ x: midX + cos * halfLen, z: midZ + sin * halfLen, angle });
      posts.push({ x: midX - cos * halfLen, z: midZ - sin * halfLen, angle });
    }
    return { panels, posts };
  }, []);

  if (panels.length === 0) return null;

  // Fence colour — an off-white cream tone consistent with the villa
  // trim palette in OsmBuildings.tsx (`#efe6d4` on corner boards).
  const FENCE_COLOUR = '#e8dcbe';
  const POST_COLOUR = '#4a3a2e';   // creosoted dark timber post

  return (
    <group>
      <Instances limit={panels.length} range={panels.length}>
        <boxGeometry args={[1, FENCE_HEIGHT, FENCE_THICK]} />
        <meshStandardMaterial color={FENCE_COLOUR} roughness={0.95} />
        {panels.map((p, i) => (
          <Instance
            key={`fence-${i}`}
            position={[p.midX, FENCE_HEIGHT / 2 + 0.02, p.midZ]}
            rotation={[0, -p.angle, 0]}
            scale={[p.length, 1, 1]}
          />
        ))}
      </Instances>
      <Instances limit={posts.length} range={posts.length}>
        <boxGeometry args={[POST_SIZE, POST_HEIGHT, POST_SIZE]} />
        <meshStandardMaterial color={POST_COLOUR} roughness={1} />
        {posts.map((p, i) => (
          <Instance
            key={`post-${i}`}
            position={[p.x, POST_HEIGHT / 2 + 0.02, p.z]}
            rotation={[0, -p.angle, 0]}
          />
        ))}
      </Instances>
    </group>
  );
}
