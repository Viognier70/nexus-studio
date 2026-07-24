import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { WORLD } from '../content/world';
import { idHash, orientedBbox } from '../procgen/geom';
import { outbuildingPlacementFor } from '../procgen/parcel';

// Small secondary structures (garden sheds, small outbuildings) placed
// deterministically alongside larger residential buildings so a farm
// or family plot reads as a full property rather than a single free-
// standing box. Placement is delegated to procgen/parcel.ts so the
// wood-pile / garden / yard-tree modules can query the same authority.
// Everything renders through drei Instances — 2 shed wall instances +
// 2 shed roof instances for the whole village.

interface Outbuilding {
  x: number;
  z: number;
  angle: number;    // world-space Y rotation
  size: 'small' | 'medium';
  colour: string;
}

const SHED_PALETTE = [
  '#7d5b3f',   // creosoted timber
  '#8b3e2b',   // faded Faluröd
  '#5f4a3a',   // dark stained timber
  '#a89b7d'    // weathered grey
];

export function OsmOutbuildings() {
  const outbuildings = useMemo<Outbuilding[]>(() => {
    const list: Outbuilding[] = [];
    for (const b of WORLD.buildings) {
      // Placement helper handles landmark exclusion, host-kind check,
      // area threshold, spawn probability, and OBB-side selection.
      // Wood pile / kitchen garden / yard tree code queries the same
      // helper so all four modules agree on which side the shed
      // occupies and can skip conflicting positions.
      const placement = outbuildingPlacementFor(b);
      if (!placement) continue;
      const obb = orientedBbox(b.poly);
      const hash = idHash(b.id + ':outbuilding');
      const paletteIdx = Math.floor(hash * 100) % SHED_PALETTE.length;
      list.push({
        x: placement.wx,
        z: placement.wz,
        angle: obb.angle,
        size: placement.size,
        colour: SHED_PALETTE[paletteIdx]
      });
    }
    return list;
  }, []);

  if (outbuildings.length === 0) return null;

  const smalls = outbuildings.filter((o) => o.size === 'small');
  const mediums = outbuildings.filter((o) => o.size === 'medium');

  return (
    <group>
      {/* Small shed walls (3.6 × 2.6 × 3.0 m) */}
      {smalls.length > 0 && (
        <Instances limit={smalls.length} range={smalls.length}>
          <boxGeometry args={[3.6, 2.6, 3.0]} />
          <meshStandardMaterial roughness={0.95} />
          {smalls.map((o, i) => (
            <Instance
              key={`sw-${i}`}
              position={[o.x, 1.3, o.z]}
              rotation={[0, -o.angle, 0]}
              color={o.colour}
            />
          ))}
        </Instances>
      )}
      {/* Small shed roofs (thin dark box, slightly wider than walls) */}
      {smalls.length > 0 && (
        <Instances limit={smalls.length} range={smalls.length}>
          <boxGeometry args={[3.9, 0.3, 3.3]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
          {smalls.map((o, i) => (
            <Instance
              key={`sr-${i}`}
              position={[o.x, 2.75, o.z]}
              rotation={[0, -o.angle, 0]}
            />
          ))}
        </Instances>
      )}
      {/* Medium outbuilding walls (5.6 × 3.2 × 4.2 m) */}
      {mediums.length > 0 && (
        <Instances limit={mediums.length} range={mediums.length}>
          <boxGeometry args={[5.6, 3.2, 4.2]} />
          <meshStandardMaterial roughness={0.95} />
          {mediums.map((o, i) => (
            <Instance
              key={`mw-${i}`}
              position={[o.x, 1.6, o.z]}
              rotation={[0, -o.angle, 0]}
              color={o.colour}
            />
          ))}
        </Instances>
      )}
      {/* Medium outbuilding roofs */}
      {mediums.length > 0 && (
        <Instances limit={mediums.length} range={mediums.length}>
          <boxGeometry args={[5.9, 0.35, 4.5]} />
          <meshStandardMaterial color="#2a251f" roughness={0.9} />
          {mediums.map((o, i) => (
            <Instance
              key={`mr-${i}`}
              position={[o.x, 3.35, o.z]}
              rotation={[0, -o.angle, 0]}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}
