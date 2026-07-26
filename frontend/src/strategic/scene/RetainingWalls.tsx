import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { WORLD } from '../content/world';
import { streetProfile } from '../content/streetProfiles';

// ORDER 031 — Terrain character (Phase 6).
//
// The Grythyttan digital twin renders on flat terrain (no DEM),
// which strips out a genuine feature of the village: streets like
// Kyrkogatan run uphill, Torget sits in a bowl, and plots on the
// uphill side are elevated behind low stone / timber retaining
// walls.
//
// Without DEM data we cannot render true slopes. But we CAN mark
// the retaining walls procedurally, using StreetProfile.slope as
// the signal. Where a street's slope character is 'uphill' or 'bowl',
// this component draws a low retaining wall along one side of the
// street polyline, at the plot-frontage offset.
//
// This is a recognisability cue, not a physically-correct terrain
// solution. Full terrain generation is out of scope; this component
// gives the visual signature (a low stone wall along an uphill
// street) so the street reads as sloped even on a flat mesh.

const WALL_HEIGHT = 0.65;
const WALL_THICK = 0.55;
const WALL_Y = 0.02;
const WALL_COLOUR = '#8a8478';   // dry-stone grey-warm

// Metres between wall segments (short segments so the wall reads
// as masonry rather than a single continuous slab).
const SEGMENT_M = 4;

// Offset from road centreline to wall — sits between the road edge
// and the plot frontage, on the uphill side.
const OFFSET_M = 4.5;

interface WallSegment {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
}

export function RetainingWalls() {
  const segments = useMemo<WallSegment[]>(() => {
    const out: WallSegment[] = [];
    for (const road of WORLD.roads) {
      if (!road.name) continue;
      const profile = streetProfile(road.name);
      if (profile.slope !== 'uphill' && profile.slope !== 'bowl') continue;
      if (road.poly.length < 2) continue;

      // For uphill streets, place the wall on the +perpendicular side
      // of each segment (arbitrary but consistent). For 'bowl' streets
      // (Torget), place walls on both sides — the plaza sits below
      // the surrounding building level in reality.
      const sides: number[] = profile.slope === 'bowl' ? [1, -1] : [1];

      let accumulated = 0;
      for (let i = 1; i < road.poly.length; i++) {
        const a = road.poly[i - 1];
        const b = road.poly[i];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const segLen = Math.hypot(dx, dz);
        if (segLen === 0) continue;
        const nx = -dz / segLen;
        const nz = dx / segLen;
        const angle = Math.atan2(dz, dx);
        let s = SEGMENT_M - accumulated;
        while (s < segLen) {
          const pcx = a[0] + (dx / segLen) * (s - SEGMENT_M / 2);
          const pcz = a[1] + (dz / segLen) * (s - SEGMENT_M / 2);
          for (const side of sides) {
            const wx = pcx + nx * OFFSET_M * side;
            const wz = pcz + nz * OFFSET_M * side;
            out.push({
              midX: wx,
              midZ: wz,
              length: SEGMENT_M,
              angle
            });
          }
          s += SEGMENT_M;
        }
        accumulated = (SEGMENT_M - ((s - segLen + SEGMENT_M) % SEGMENT_M)) % SEGMENT_M;
      }
    }
    return out;
  }, []);

  if (segments.length === 0) return null;

  return (
    <Instances limit={segments.length} range={segments.length}>
      <boxGeometry args={[1, WALL_HEIGHT, WALL_THICK]} />
      <meshStandardMaterial color={WALL_COLOUR} roughness={1} />
      {segments.map((s, i) => (
        <Instance
          key={`rw-${i}`}
          position={[s.midX, WALL_HEIGHT / 2 + WALL_Y, s.midZ]}
          rotation={[0, -s.angle, 0]}
          scale={[s.length, 1, 1]}
        />
      ))}
    </Instances>
  );
}
