import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  carRoadSegments,
  closestRoadPoint,
  inAnyWater,
  nearAnyBuilding,
  obbLocalToWorld,
  orientedBbox,
  polygonArea
} from '../procgen/geom';

// One gravel driveway per eligible residential building — a straight
// line from the entrance-pad side of the OBB out to the nearest point
// on the nearest driveable road. Rendered as a single per-instance-
// scaled box in a drei Instances group so the whole village driveway
// network costs one draw call.

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

// Skip driveways longer than this — if the nearest road is > 45 m
// away the building is probably a farmhouse deep in the field, and
// a straight-line driveway would run through half a wood.
const MAX_DRIVEWAY_LEN = 45;

interface Driveway {
  midX: number;
  midZ: number;
  length: number;
  angle: number;
}

export function OsmDriveways() {
  const driveways = useMemo<Driveway[]>(() => {
    const segments = carRoadSegments();
    const out: Driveway[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;

      const obb = orientedBbox(b.poly);
      // Start on the +Z-in-OBB side (same convention as EntranceMarker
      // and OsmPropertyDetail's gravel pad). Offset by 2 m past the
      // wall so the driveway begins at the pad's outer edge.
      const [sx, sz] = obbLocalToWorld(obb, 0, obb.d / 2 + 2.0);

      const nearest = closestRoadPoint(sx, sz, segments);
      if (!nearest) continue;
      const dist = Math.sqrt(nearest.distSq);
      if (dist > MAX_DRIVEWAY_LEN) continue;
      // Very short: already on the road, skip driveway (property likely
      // fronts the road directly).
      if (dist < 1.8) continue;

      // Sample along the driveway path for collision with other buildings
      // or water. Roads are the target, so we don't reject a driveway
      // for crossing a road — but we do reject the ones that would clip
      // a neighbour.
      const NSAMPLES = 6;
      let valid = true;
      for (let i = 1; i < NSAMPLES; i++) {
        const t = i / NSAMPLES;
        const px = sx + t * (nearest.qx - sx);
        const pz = sz + t * (nearest.qz - sz);
        if (nearAnyBuilding(px, pz, b.id, 0.2)) { valid = false; break; }
        if (inAnyWater(px, pz)) { valid = false; break; }
      }
      if (!valid) continue;

      const angle = Math.atan2(nearest.qz - sz, nearest.qx - sx);
      out.push({
        midX: (sx + nearest.qx) / 2,
        midZ: (sz + nearest.qz) / 2,
        length: dist,
        angle
      });
    }
    return out;
  }, []);

  if (driveways.length === 0) return null;

  // Driveway sits just above the entrance pad's top face (pad Y = 0.12
  // + height 0.05 = 0.17) so at close zoom the two gravel surfaces
  // read as one continuous apron. Previous 0.30 elevation floated
  // ~0.16 m above the pad — invisible at wide zoom, awkward at kvarteret.
  const DRIVEWAY_Y = 0.16;
  return (
    <Instances limit={driveways.length} range={driveways.length}>
      <boxGeometry args={[1, 0.02, 2.6]} />
      <meshStandardMaterial color="#a89e88" roughness={0.95} />
      {driveways.map((d, i) => (
        <Instance
          key={`dw-${i}`}
          position={[d.midX, DRIVEWAY_Y, d.midZ]}
          rotation={[0, -d.angle, 0]}
          scale={[d.length, 1, 1]}
        />
      ))}
    </Instances>
  );
}
