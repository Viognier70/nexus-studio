import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  nearestStreetProfile,
  type SurfaceStyle
} from '../content/streetProfiles';
import {
  carRoadSegments,
  closestRoadPoint,
  obbLocalToWorld,
  orientedBbox,
  polygonArea
} from '../procgen/geom';

// ORDER 031 — Property character (Phase 2).
//
// Every residential plot gets a small ground surface patch on the
// road-facing side of the building. Surface type is inherited from
// the fronting street's StreetProfile.surface so neighbouring plots
// share the same aesthetic (Badvägen = gravel, Prästgatan = asphalt,
// Torget-frontage = paving stones, etc.).
//
// This replaces the "flat green carpet" that surveys cited as an
// absence: driveways / entrance walks / garden strips are the layer
// between road and building that Street View shows very clearly and
// the runtime previously ignored.
//
// Coordinated with:
//   OsmDriveways — draws the narrow gravel road-to-garage strip;
//     unchanged.
//   OsmYards      — existing yard component; unaffected.
//   this component — a broader plot-front surface patch inheriting the
//     StreetProfile.surface style.
//
// Two draw calls per surface type — cheap.

const HOST_KINDS = new Set([
  'house', 'detached', 'residential', 'apartments', 'yes', 'outbuilding'
]);

const MAX_ROAD_DIST = 55;
const MIN_AREA = 45;
const MIN_LONG_SIDE = 5;
const SURFACE_OFFSET = 2.0;    // metres from building wall to surface centre
const SURFACE_Y = 0.05;         // sits below driveways (0.16) + fence base (0.02+ height)

interface SurfacePatch {
  midX: number;
  midZ: number;
  length: number;
  depth: number;
  angle: number;
  style: SurfaceStyle;
}

// Colour + roughness per surface style. Values chosen to read
// distinctly from the green terrain layer at all zoom levels without
// dominating the frame. Deterministic per style — no wobble.
const SURFACE_APPEARANCE: Record<SurfaceStyle, { colour: string; roughness: number }> = {
  grass:          { colour: '#6a7a55', roughness: 0.95 },   // slightly-lighter mown lawn
  gravel:         { colour: '#a89a80', roughness: 0.98 },   // warm gravel apron
  asphalt:        { colour: '#3f3d38', roughness: 0.9 },    // paved forecourt
  'paving-stones':{ colour: '#8a8478', roughness: 0.85 },   // civic plaza-side
  concrete:       { colour: '#a8a29a', roughness: 0.85 },   // modern service yard
  'worn-dirt':    { colour: '#6e5c48', roughness: 1 },      // rural / farm access
  mixed:          { colour: '#8a7c66', roughness: 0.95 }    // grass + gravel + trodden
};

export function OsmYardSurfaces() {
  const patches = useMemo<SurfacePatch[]>(() => {
    const segments = carRoadSegments();
    const out: SurfacePatch[] = [];

    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < MIN_AREA) continue;

      const obb = orientedBbox(b.poly);
      if (Math.max(obb.w, obb.d) < MIN_LONG_SIDE) continue;

      // Pick the road-facing side same way OsmFences does.
      const half = obb.d / 2 + SURFACE_OFFSET;
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

      // Surface style from the fronting street's profile.
      const profile = nearestStreetProfile(obb.centre[0], obb.centre[1]);
      const style = profile.surface;

      // Grass surface style would be indistinguishable from the terrain
      // layer — skip it so we don't waste draws on an invisible patch.
      if (style === 'grass') continue;

      // Patch geometry: slightly wider than the building's long side,
      // 2.5–3 m deep from wall to road-facing edge. This covers the
      // entrance apron + driveway approach + garden strip area that
      // shows in Street View as ground-surface-not-grass.
      const patchLen = Math.min(obb.w + 2.0, 30);   // cap so mega-buildings don't spill
      const patchDepth = 3.0;
      out.push({
        midX,
        midZ,
        length: patchLen,
        depth: patchDepth,
        angle: obb.angle,
        style
      });
    }
    return out;
  }, []);

  if (patches.length === 0) return null;

  // Group by style so each style renders in one draw call with its
  // own material.
  const styles: SurfaceStyle[] = ['gravel', 'asphalt', 'paving-stones', 'concrete', 'worn-dirt', 'mixed'];

  return (
    <group>
      {styles.map((style) => {
        const stylePatches = patches.filter((p) => p.style === style);
        if (stylePatches.length === 0) return null;
        const appearance = SURFACE_APPEARANCE[style];
        return (
          <Instances key={style} limit={stylePatches.length} range={stylePatches.length}>
            <boxGeometry args={[1, 0.02, 1]} />
            <meshStandardMaterial color={appearance.colour} roughness={appearance.roughness} />
            {stylePatches.map((p, i) => (
              <Instance
                key={`${style}-${i}`}
                position={[p.midX, SURFACE_Y, p.midZ]}
                rotation={[0, -p.angle, 0]}
                scale={[p.length, 1, p.depth]}
              />
            ))}
          </Instances>
        );
      })}
    </group>
  );
}
