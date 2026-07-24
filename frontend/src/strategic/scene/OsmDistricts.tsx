import { useMemo } from 'react';
import * as THREE from 'three';
import { GROUND_Y, WORLD, tintColour } from '../content/world';
import type { RawPolygon, Vec2Tuple } from '../content/world';

// FNV-1a 32-bit hash of a polygon id — used to wobble the base tint
// per neighbourhood so 12 residential polygons don't read as one flat
// beige patch at village zoom.
function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function districtWobble(baseHex: string, id: string, magnitude: number): string {
  const hash = idHash(id);
  // Nudge alternately toward warmer and cooler tints so neighbours
  // differ deterministically without drifting the average.
  const warmTint = '#c4a670';
  const coolTint = '#7a8f7a';
  const tint = hash > 0.5 ? warmTint : coolTint;
  const k = magnitude * Math.abs(hash - 0.5) * 2;
  return tintColour(baseHex, tint, k);
}

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
  // Per-polygon wobble magnitude, 0 = no variation.
  wobble: number;
}

export function OsmDistricts() {
  const layers: Layer[] = useMemo(() => {
    return [
      // Forest: darker, cooler green than the base meadow so treed areas
      // are legible even before the actual tree instances resolve. Modest
      // per-patch wobble so a valley of five neighbouring forest polygons
      // reads as five distinct patches, not one continuous green.
      {
        polys: WORLD.forest,
        colour: '#5a6152',
        y: GROUND_Y.terrain + 0.02,
        wobble: 0.14
      },
      // Grass / open lawn: brighter green — sports fields, park lawns.
      {
        polys: WORLD.grass,
        colour: '#8a9575',
        y: GROUND_Y.terrain + 0.04,
        wobble: 0.10
      },
      // Residential neighbourhoods: warm sand tone so the built-up areas
      // read as a single "village" from village zoom. A stronger wobble
      // here — 12 neighbourhoods otherwise all render as the same beige.
      {
        polys: WORLD.residential,
        colour: '#a89e85',
        y: GROUND_Y.terrain + 0.06,
        wobble: 0.18
      },
      // Graveyard: muted stone tone, distinct from residential.
      {
        polys: WORLD.graveyards,
        colour: '#8f8a7a',
        y: GROUND_Y.terrain + 0.08,
        wobble: 0
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
            const c = layer.wobble > 0
              ? districtWobble(layer.colour, p.id, layer.wobble)
              : layer.colour;
            return (
              <mesh key={`${p.id}`} geometry={geo}>
                <meshStandardMaterial
                  color={c}
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
