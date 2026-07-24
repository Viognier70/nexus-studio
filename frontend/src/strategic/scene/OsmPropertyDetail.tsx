import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  idHash,
  inAnyWater,
  nearAnyBuilding,
  obbLocalToWorld,
  orientedBbox,
  polygonArea
} from '../procgen/geom';
import { outbuildingSideFor } from '../procgen/parcel';

// Property-scale decor around every eligible residential building:
//   - Small gravel pad in front of the entrance
//   - Wood pile at the rear corner (~1 in 4 houses)
// Everything deterministic per building id + hash suffix. Rendered
// via drei Instances so 250+ pads and ~60 wood piles cost 4 draw
// calls total.

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

interface Pad {
  x: number;
  z: number;
  angle: number;
}

interface WoodPile {
  x: number;
  z: number;
  angle: number;
}

export function OsmPropertyDetail() {
  const { pads, woodPiles } = useMemo(() => {
    const p: Pad[] = [];
    const w: WoodPile[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;
      const obb = orientedBbox(b.poly);

      // Gravel entrance pad on the +Z-in-OBB side (matching the
      // EntranceMarker convention in OsmBuildings). Positioned 1.5 m
      // clear of the wall.
      const halfD = obb.d / 2;
      const [px, pz] = obbLocalToWorld(obb, 0, halfD + 1.5);
      if (!inAnyWater(px, pz)) {
        p.push({ x: px, z: pz, angle: obb.angle });
      }

      // Wood pile on the right-mid side of the parent OBB on ~28 % of
      // eligible houses. Placed at (halfW + 2, -halfD * 0.4) so it
      // sits clearly outside the wall AND clearly away from the
      // rear-centre where OsmProceduralOutbuildings prefers to put
      // its shed. Rejects positions that would clip a neighbour
      // building or an outbuilding sharing the right side.
      const wh = idHash(b.id + ':woodpile');
      if (wh < 0.28) {
        const [wx, wz] = obbLocalToWorld(obb, obb.w / 2 + 2.0, -halfD * 0.4);
        const outbuildingSide = outbuildingSideFor(b);
        const wouldCollideWithShed = outbuildingSide === 'right';
        if (
          !wouldCollideWithShed &&
          !inAnyWater(wx, wz) &&
          !nearAnyBuilding(wx, wz, b.id, 1.0)
        ) {
          w.push({ x: wx, z: wz, angle: obb.angle });
        }
      }
    }
    return { pads: p, woodPiles: w };
  }, []);

  return (
    <group>
      {/* Gravel entrance pads — thin, slightly above the road plane so
          they read as loose gravel over grass. Positioned above the
          landcover so nothing hides them. */}
      {pads.length > 0 && (
        <Instances limit={pads.length} range={pads.length}>
          <boxGeometry args={[3.5, 0.05, 3.0]} />
          <meshStandardMaterial color="#a89e88" roughness={0.95} />
          {pads.map((p, i) => (
            <Instance
              key={`pd-${i}`}
              position={[p.x, 0.12, p.z]}
              rotation={[0, -p.angle, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Wood pile: a stack of three short dark logs. Each pile is one
          Instances group, all logs share the same material. Instanced
          at pile positions so the whole village adds 3 draw calls. */}
      {woodPiles.length > 0 && (
        <>
          <Instances limit={woodPiles.length} range={woodPiles.length}>
            <boxGeometry args={[2.4, 0.4, 0.6]} />
            <meshStandardMaterial color="#5a4632" roughness={0.95} />
            {woodPiles.map((p, i) => (
              <Instance
                key={`wp1-${i}`}
                position={[p.x, 0.2, p.z]}
                rotation={[0, -p.angle, 0]}
              />
            ))}
          </Instances>
          <Instances limit={woodPiles.length} range={woodPiles.length}>
            <boxGeometry args={[2.3, 0.35, 0.55]} />
            <meshStandardMaterial color="#5f4b35" roughness={0.95} />
            {woodPiles.map((p, i) => (
              <Instance
                key={`wp2-${i}`}
                position={[p.x, 0.6, p.z]}
                rotation={[0, -p.angle, 0]}
              />
            ))}
          </Instances>
          <Instances limit={woodPiles.length} range={woodPiles.length}>
            <boxGeometry args={[2.2, 0.3, 0.5]} />
            <meshStandardMaterial color="#645038" roughness={0.95} />
            {woodPiles.map((p, i) => (
              <Instance
                key={`wp3-${i}`}
                position={[p.x, 0.95, p.z]}
                rotation={[0, -p.angle, 0]}
              />
            ))}
          </Instances>
        </>
      )}
    </group>
  );
}
