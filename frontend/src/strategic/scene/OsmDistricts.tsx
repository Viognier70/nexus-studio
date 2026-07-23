import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_Y, WORLD } from '../content/world';
import type { RawPolygon, Vec2Tuple } from '../content/world';

// OSM landcover rendered as flat ground tint below buildings and roads.
// Reading the districts before reading a single label is how a resident
// recognises where they are — forest darkens the outskirts, residential
// zones warm the neighbourhoods, campus/graveyard/grass areas break up the
// land into legible chunks.

function toShapeGeom(poly: Vec2Tuple[]): THREE.BufferGeometry | null {
  if (poly.length < 4) return null;
  const shape = new THREE.Shape();
  shape.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i][0], poly[i][1]);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

// Skip landcover polygons whose bounding box is entirely far from the
// working area. Same reasoning as OsmWater.
const MAX_DISTANCE = 5500;
function insideRange(poly: Vec2Tuple[]): boolean {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return !(
    minX > MAX_DISTANCE ||
    maxX < -MAX_DISTANCE ||
    minZ > MAX_DISTANCE ||
    maxZ < -MAX_DISTANCE
  );
}

interface Layer {
  polys: RawPolygon[];
  colour: string;
  y: number;
}

export function OsmDistricts() {
  const layers: Layer[] = useMemo(() => {
    return [
      // Forest: darker, cooler green than the base meadow so treed areas
      // are legible even before the actual tree instances resolve.
      {
        polys: WORLD.forest,
        colour: '#5a6152',
        y: GROUND_Y.terrain + 0.02
      },
      // Grass / open lawn: brighter green — sports fields, park lawns.
      {
        polys: WORLD.grass,
        colour: '#8a9575',
        y: GROUND_Y.terrain + 0.04
      },
      // Residential neighbourhoods: warm sand tone so the built-up areas
      // read as a single "village" from village zoom.
      {
        polys: WORLD.residential,
        colour: '#a89e85',
        y: GROUND_Y.terrain + 0.06
      },
      // Graveyard: muted stone tone, distinct from residential.
      {
        polys: WORLD.graveyards,
        colour: '#8f8a7a',
        y: GROUND_Y.terrain + 0.08
      }
    ];
  }, []);

  return (
    <group>
      {layers.map((layer, li) => (
        <group key={`layer-${li}`} position={[0, layer.y, 0]}>
          {layer.polys.map((p) => {
            if (!insideRange(p.poly)) return null;
            const geo = toShapeGeom(p.poly);
            if (!geo) return null;
            return (
              <mesh key={`${p.id}`} geometry={geo}>
                <meshStandardMaterial
                  color={layer.colour}
                  roughness={0.95}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}
