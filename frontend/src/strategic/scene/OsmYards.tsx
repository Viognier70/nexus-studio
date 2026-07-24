import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { GROUND_Y, LANDMARK_BUILDING_IDS, WORLD } from '../content/world';
import {
  idHash,
  inAnyWater,
  nearAnyBuilding,
  obbLocalToWorld,
  orientedBbox,
  polygonArea
} from '../procgen/geom';
import { outbuildingSideFor } from '../procgen/parcel';

// Two restrained yard features on top of the existing property system:
//   - Kitchen garden patch on ~20 % of eligible houses (tilled dark
//     rectangle in a plausible yard corner)
//   - Small yard tree cluster on ~40 % of prosperous houses (two small
//     deciduous trees standing near the property, inside the parcel)
//
// Everything deterministic, everything instanced, no per-frame work.

const HOST_KINDS = new Set(['house', 'detached', 'residential']);

interface Patch {
  x: number;
  z: number;
  angle: number;
  scaleX: number;
  scaleZ: number;
}
interface Tree {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

export function OsmYards() {
  const { gardens, yardTrees } = useMemo(() => {
    const g: Patch[] = [];
    const t: Tree[] = [];
    for (const b of WORLD.buildings) {
      if (LANDMARK_BUILDING_IDS.has(b.id)) continue;
      const kind = b.kind ?? 'yes';
      if (!HOST_KINDS.has(kind)) continue;
      const area = polygonArea(b.poly);
      if (area < 55) continue;
      const obb = orientedBbox(b.poly);

      // Wealth (matches the OsmBuildings profile).
      const wh = idHash(b.id + ':wealth');
      const wealth =
        wh < 0.28 ? 'modest' : wh < 0.85 ? 'standard' : 'prosperous';

      // Kitchen garden on ~22 % of standard / prosperous houses. Placed
      // at the left-mid side of the OBB (opposite the wood pile in
      // OsmPropertyDetail which sits at right-mid). Skipped when the
      // outbuilding for this parent also landed on the left, to avoid
      // shed+garden overlap. Rotation and size take a small deterministic
      // wobble so a row of gardens doesn't line up in lockstep.
      const gh = idHash(b.id + ':garden');
      if (wealth !== 'modest' && gh < 0.22) {
        const outbuildingSide = outbuildingSideFor(b);
        if (outbuildingSide !== 'left') {
          const [gx, gz] = obbLocalToWorld(
            obb,
            -(obb.w / 2 + 2.5),
            -obb.d * 0.15
          );
          if (
            !inAnyWater(gx, gz) &&
            !nearAnyBuilding(gx, gz, b.id, 0.5)
          ) {
            // Small rotation and size wobble.
            const rotDelta = (idHash(b.id + ':gardenRot') - 0.5) * 0.4;   // ±0.2 rad
            const sw = 0.85 + idHash(b.id + ':gardenW') * 0.3;             // 0.85–1.15
            const sd = 0.85 + idHash(b.id + ':gardenD') * 0.3;
            g.push({
              x: gx,
              z: gz,
              angle: obb.angle + rotDelta,
              scaleX: sw,
              scaleZ: sd
            });
          }
        }
      }

      // Prosperous villas: two small yard trees on the front-left / front-
      // right of the parcel. Placed clear of the entrance pad and
      // driveway on the front axis. Skipped when the outbuilding
      // fell back to the front (rare — a shed sits where the trees
      // would go).
      if (wealth === 'prosperous' && outbuildingSideFor(b) !== 'front') {
        const th = idHash(b.id + ':yardtrees');
        if (th < 0.55) {
          const offsets: Array<[number, number]> = [
            [-obb.w / 2 - 3.0, obb.d / 2 + 4.5],
            [obb.w / 2 + 3.0, obb.d / 2 + 4.5]
          ];
          for (let i = 0; i < offsets.length; i++) {
            const [lx, lz] = offsets[i];
            const [wx, wz] = obbLocalToWorld(obb, lx, lz);
            if (
              !inAnyWater(wx, wz) &&
              !nearAnyBuilding(wx, wz, b.id, 0.5)
            ) {
              t.push({
                x: wx,
                z: wz,
                scale: 0.85 + ((th * (i + 1) * 4.9) % 1) * 0.35,
                rotation: (th * (i + 1) * 7.3) % (Math.PI * 2)
              });
            }
          }
        }
      }

      // Standard-tier houses: one small yard tree on the front-right of
      // ~30 % of parcels. Gives standard properties a vertical yard
      // element without turning every street into an orchard.
      if (
        wealth === 'standard' &&
        outbuildingSideFor(b) !== 'front' &&
        outbuildingSideFor(b) !== 'right'
      ) {
        const sh = idHash(b.id + ':stdyardtree');
        if (sh < 0.32) {
          const [wx, wz] = obbLocalToWorld(
            obb,
            obb.w / 2 + 3.0,
            obb.d / 2 + 4.5
          );
          if (
            !inAnyWater(wx, wz) &&
            !nearAnyBuilding(wx, wz, b.id, 0.5)
          ) {
            t.push({
              x: wx,
              z: wz,
              scale: 0.78 + sh * 0.4,     // 0.78–1.10, slightly smaller than villa trees
              rotation: (sh * 5.1) % (Math.PI * 2)
            });
          }
        }
      }
    }
    return { gardens: g, yardTrees: t };
  }, []);

  return (
    <group>
      {/* Kitchen garden — 3.6 × 2.8 m tilled patch, darker peat colour,
          just above landcover so grass shows around it. Per-instance
          rotation and scale add small deterministic variance. */}
      {gardens.length > 0 && (
        <Instances limit={gardens.length} range={gardens.length}>
          <boxGeometry args={[3.6, 0.06, 2.8]} />
          <meshStandardMaterial color="#4a4030" roughness={1} />
          {gardens.map((p, i) => (
            <Instance
              key={`kg-${i}`}
              position={[p.x, GROUND_Y.landcover + 0.03, p.z]}
              rotation={[0, -p.angle, 0]}
              scale={[p.scaleX, 1, p.scaleZ]}
            />
          ))}
        </Instances>
      )}
      {/* Yard trees — two small deciduous per prosperous property.
          Rendered in two Instances passes (trunk + canopy) so both
          share single geometries. */}
      {yardTrees.length > 0 && (
        <>
          <Instances limit={yardTrees.length} range={yardTrees.length}>
            <cylinderGeometry args={[0.14, 0.2, 1.2, 6]} />
            <meshStandardMaterial color="#4a3a2e" roughness={1} />
            {yardTrees.map((tr, i) => (
              <Instance
                key={`yt-t-${i}`}
                position={[tr.x, 0.6 * tr.scale, tr.z]}
                scale={tr.scale}
                rotation={[0, tr.rotation, 0]}
              />
            ))}
          </Instances>
          <Instances limit={yardTrees.length} range={yardTrees.length}>
            <sphereGeometry args={[1.1, 10, 8]} />
            <meshStandardMaterial color="#5a744d" roughness={1} />
            {yardTrees.map((tr, i) => (
              <Instance
                key={`yt-c-${i}`}
                position={[tr.x, 2.2 * tr.scale, tr.z]}
                scale={tr.scale}
                rotation={[0, tr.rotation, 0]}
              />
            ))}
          </Instances>
        </>
      )}
    </group>
  );
}
