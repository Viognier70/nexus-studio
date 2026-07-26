import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  nearestStreetProfile,
  type BoundaryStyle
} from '../content/streetProfiles';
import {
  carRoadSegments,
  closestRoadPoint,
  obbLocalToWorld,
  orientedBbox,
  polygonArea
} from '../procgen/geom';

// ORDER 031 — Boundary System.
//
// Every residential plot gets a boundary at its road-facing edge, but
// the boundary style is inherited from the fronting street's
// StreetProfile — not a single picket-fence-for-everyone default.
//
// Boundary styles supported:
//   none            no visible boundary — commercial forecourts, industrial
//                   frontage, or plots where the survey saw open space
//   hedge           living green boundary — Nygatan, Åsgatan, Hammargatan
//   wooden-fence    dark timber vertical-board fence — Kyrkogatan, Skiffergatan
//   picket-fence    white picket cream boards + dark posts — Badvägen
//   wire-fence      low institutional / farm wire mesh — Mässingsslatan, Lokavägen
//   stone-wall      low dry-stone or masonry — Kyrkbacken (churchyard)
//   retaining-wall  handled by Terrain component, not here
//   mixed           picket + hedge combo — mixed peripheral streets
//
// The renderer picks the boundary based on the profile of the CLOSEST
// named street to the plot centroid. This means neighbouring buildings
// on the same street share their boundary style (as reality does), and
// diversity comes from actually-different streets — not per-building
// randomness.

const HOST_KINDS = new Set([
  'house', 'detached', 'residential', 'apartments', 'yes', 'outbuilding'
]);

const MAX_ROAD_DIST = 55;
const MIN_AREA = 45;
const MIN_LONG_SIDE = 5;
const BOUNDARY_OFFSET = 3.5;

// Per-style geometry parameters. Height / thickness dimensions in
// metres, colours in hex. Keep these single-source-of-truth so
// documentation / future styles can extend the map.
interface BoundarySpec {
  panelHeight: number;
  panelThick: number;
  postHeight: number;
  postSize: number;
  panelColour: string;
  postColour: string;
  postSpacingM: number;   // 0 → no distinct posts (hedge, stone wall)
  segmentCount: number;   // number of segments per panel (1 = single continuous)
  jitterY?: number;       // for hedges, small vertical wobble to break flatness
}

const BOUNDARY_SPECS: Record<Exclude<BoundaryStyle, 'none' | 'retaining-wall'>, BoundarySpec> = {
  hedge: {
    // Rounded dark-green hedgerow, no distinct posts.
    panelHeight: 1.05,
    panelThick: 0.55,
    postHeight: 0,
    postSize: 0,
    panelColour: '#5a6b4b',
    postColour: '#5a6b4b',
    postSpacingM: 0,
    segmentCount: 4,
    jitterY: 0.08
  },
  'wooden-fence': {
    // Dark vertical-board timber fence — utilitarian rural boundary.
    panelHeight: 1.2,
    panelThick: 0.05,
    postHeight: 1.35,
    postSize: 0.12,
    panelColour: '#5a4630',
    postColour: '#3a2e20',
    postSpacingM: 2.5,
    segmentCount: 1
  },
  'picket-fence': {
    // Cream picket with dark posts — Badvägen residential character.
    panelHeight: 0.9,
    panelThick: 0.06,
    postHeight: 1.05,
    postSize: 0.12,
    panelColour: '#e8dcbe',
    postColour: '#4a3a2e',
    postSpacingM: 3.0,
    segmentCount: 1
  },
  'wire-fence': {
    // Low grey mesh — barely visible from distance, institutional /
    // industrial character. Rendered as a very thin dark strip.
    panelHeight: 0.9,
    panelThick: 0.02,
    postHeight: 1.05,
    postSize: 0.06,
    panelColour: '#7d7d75',
    postColour: '#3a3a30',
    postSpacingM: 4.0,
    segmentCount: 1
  },
  'stone-wall': {
    // Low stone / masonry — churchyard, historic terraces. Slightly
    // shorter than fences, thicker.
    panelHeight: 0.55,
    panelThick: 0.35,
    postHeight: 0,
    postSize: 0,
    panelColour: '#8a8478',
    postColour: '#8a8478',
    postSpacingM: 0,
    segmentCount: 3,
    jitterY: 0.05
  },
  mixed: {
    // Fallback — mostly picket, some sections hedge. Uses picket geo
    // for simplicity; the profile catalogue will disambiguate at doc
    // level. Distinct colour so the "mixed default" is recognisable
    // in visual reviews.
    panelHeight: 0.9,
    panelThick: 0.08,
    postHeight: 1.05,
    postSize: 0.12,
    panelColour: '#c9b998',
    postColour: '#4a3a2e',
    postSpacingM: 3.5,
    segmentCount: 1
  }
};

interface FencePanel {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
  style: Exclude<BoundaryStyle, 'none' | 'retaining-wall'>;
}

interface FencePost {
  x: number;
  z: number;
  angle: number;
  style: Exclude<BoundaryStyle, 'none' | 'retaining-wall'>;
}

function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export function OsmFences() {
  const { panels, posts } = useMemo<{ panels: FencePanel[]; posts: FencePost[] }>(() => {
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
      if (Math.max(obb.w, obb.d) < MIN_LONG_SIDE) continue;

      // Two candidate boundary positions — one on each long edge of
      // the OBB. Pick whichever midpoint sits closer to a car road.
      const half = obb.d / 2 + BOUNDARY_OFFSET;
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

      // Read the boundary style from the fronting street's profile.
      // The road CLOSEST to the plot centroid determines the style —
      // so a plot on Badvägen gets picket, a plot on Kyrkogatan gets
      // wooden fence, a plot on Nygatan gets hedge, etc.
      const profile = nearestStreetProfile(obb.centre[0], obb.centre[1]);
      if (profile.boundary === 'none') continue;
      if (profile.boundary === 'retaining-wall') continue;   // separate renderer

      const style = profile.boundary;
      const spec = BOUNDARY_SPECS[style];
      const angle = obb.angle;
      const panelLen = Math.max(3, obb.w - 0.5);

      // Segment the panel — some styles (hedge, stone) render as
      // multiple short segments to let the vertical jitter and colour
      // wobble break machine-perfect straightness.
      const segLenTarget = panelLen / spec.segmentCount;
      for (let s = 0; s < spec.segmentCount; s++) {
        const tCentre = (s + 0.5) / spec.segmentCount - 0.5;
        const [px, pz] = obbLocalToWorld(obb, tCentre * panelLen, useA ? half : -half);
        panels.push({
          midX: px,
          midZ: pz,
          length: segLenTarget,
          angle,
          style
        });
      }

      // Post pass — only for styles with distinct posts.
      if (spec.postSpacingM > 0) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const halfLen = panelLen / 2;
        // Corner posts.
        posts.push({ x: midX + cos * halfLen, z: midZ + sin * halfLen, angle, style });
        posts.push({ x: midX - cos * halfLen, z: midZ - sin * halfLen, angle, style });
        // Interior posts every `postSpacingM`.
        const nInterior = Math.max(0, Math.floor(panelLen / spec.postSpacingM) - 1);
        for (let i = 1; i <= nInterior; i++) {
          const t = i / (nInterior + 1);
          const off = (t - 0.5) * panelLen;
          posts.push({
            x: midX + cos * off,
            z: midZ + sin * off,
            angle,
            style
          });
        }
      }
    }
    return { panels, posts };
  }, []);

  if (panels.length === 0 && posts.length === 0) return null;

  // Group panels + posts by style so we can render each style in one
  // Instances group (cheap draws) with its own material.
  const stylesWithPanels: Array<Exclude<BoundaryStyle, 'none' | 'retaining-wall'>> = [
    'hedge', 'wooden-fence', 'picket-fence', 'wire-fence', 'stone-wall', 'mixed'
  ];

  return (
    <group>
      {stylesWithPanels.map((style) => {
        const spec = BOUNDARY_SPECS[style];
        const stylePanels = panels.filter((p) => p.style === style);
        const stylePosts = posts.filter((p) => p.style === style);
        if (stylePanels.length === 0 && stylePosts.length === 0) return null;
        return (
          <group key={style}>
            {stylePanels.length > 0 && (
              <Instances limit={stylePanels.length} range={stylePanels.length}>
                <boxGeometry args={[1, spec.panelHeight, spec.panelThick]} />
                <meshStandardMaterial color={spec.panelColour} roughness={0.95} />
                {stylePanels.map((p, i) => {
                  const jitter = spec.jitterY ? (idHash(`${p.midX}:${p.midZ}:${i}`) - 0.5) * spec.jitterY : 0;
                  return (
                    <Instance
                      key={`${style}-panel-${i}`}
                      position={[p.midX, spec.panelHeight / 2 + 0.02 + jitter, p.midZ]}
                      rotation={[0, -p.angle, 0]}
                      scale={[p.length, 1, 1]}
                    />
                  );
                })}
              </Instances>
            )}
            {stylePosts.length > 0 && spec.postHeight > 0 && (
              <Instances limit={stylePosts.length} range={stylePosts.length}>
                <boxGeometry args={[spec.postSize, spec.postHeight, spec.postSize]} />
                <meshStandardMaterial color={spec.postColour} roughness={1} />
                {stylePosts.map((p, i) => (
                  <Instance
                    key={`${style}-post-${i}`}
                    position={[p.x, spec.postHeight / 2 + 0.02, p.z]}
                    rotation={[0, -p.angle, 0]}
                  />
                ))}
              </Instances>
            )}
          </group>
        );
      })}
    </group>
  );
}
