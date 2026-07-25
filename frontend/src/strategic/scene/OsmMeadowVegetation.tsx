import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { WORLD, WORLD_BOUNDS } from '../content/world';
import type { Vec2Tuple } from '../content/world';

// Two flavours of open-country vegetation that live outside the
// polygonal OsmForest:
//   - Isolated pasture trees scattered across meadow / grazing land
//   - Roadside bush clusters along major roads
//
// Everything is deterministic (grid-cell + polynomial hash), no drei
// createRng, no per-frame work. Rendered via drei Instances for cheap
// draw counts.

function inside(polygon: Vec2Tuple[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) hit = !hit;
  }
  return hit;
}

// Compact deterministic hash of two ints — used as the per-cell seed
// for the isolated-tree scatter.
function cellHash(ix: number, iz: number): number {
  let h = 2166136261;
  h ^= ix | 0;
  h = Math.imul(h, 16777619);
  h ^= iz | 0;
  h = Math.imul(h, 16777619);
  return (h >>> 0) / 0xffffffff;
}

// Grid cell size for pasture-tree scatter. Larger → sparser trees.
const CELL = 55;

// Probability a cell yields a tree (before exclusion). Kept low so
// meadows read as open pasture with the occasional tree, not another
// forest.
const CELL_YIELD = 0.28;

// A cell that survives all polygon exclusion still needs to sit inside
// the built village bounds — otherwise trees appear kilometres beyond
// the horizon.
const PASTURE_MARGIN = 200;

interface Tree {
  x: number;
  z: number;
  s: number;
  r: number;
  deciduous: boolean;
}

interface Bush {
  x: number;
  z: number;
  s: number;
}

function inAnyForest(x: number, z: number): boolean {
  for (const patch of WORLD.forest) {
    if (patch.poly.length < 3) continue;
    if (inside(patch.poly, x, z)) return true;
  }
  return false;
}

function inAnyResidential(x: number, z: number): boolean {
  for (const r of WORLD.residential) {
    if (r.poly.length < 3) continue;
    if (inside(r.poly, x, z)) return true;
  }
  return false;
}

function inAnyWater(x: number, z: number): boolean {
  for (const w of WORLD.water) {
    if (w.poly.length < 3) continue;
    if (inside(w.poly, x, z)) return true;
  }
  return false;
}

// Roughly is this point in a village-built area — buildings sit within
// residential polygons, so this also captures the built cluster.
function inAnyGrass(x: number, z: number): boolean {
  for (const g of WORLD.grass) {
    if (g.poly.length < 3) continue;
    if (inside(g.poly, x, z)) return true;
  }
  return false;
}

// Point-to-nearest-car-road distance. ORDER 022 V8 exclusion: OSM
// service and residential roads pass very close to pasture-tree
// grid cells; the previous polygon-only exclusion set (buildings +
// water + residential + forest + grass) still allowed trees within
// 1–2 m of an asphalt centreline. `nearAnyCarRoad` provides the
// perpendicular-distance test the polygon set cannot express.
const CAR_HW_KINDS: ReadonlySet<string> = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'unclassified', 'residential', 'living_street', 'service'
]);
function distPointToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
function nearAnyCarRoad(x: number, z: number, clearance: number): boolean {
  for (const r of WORLD.roads) {
    if (!CAR_HW_KINDS.has(r.kind)) continue;
    if (r.poly.length < 2) continue;
    // Cheap bbox reject over the polyline.
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [rx, rz] of r.poly) {
      if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
      if (rz < minZ) minZ = rz; if (rz > maxZ) maxZ = rz;
    }
    if (
      x < minX - clearance || x > maxX + clearance ||
      z < minZ - clearance || z > maxZ + clearance
    ) continue;
    for (let i = 1; i < r.poly.length; i++) {
      if (distPointToSegment(x, z, r.poly[i-1][0], r.poly[i-1][1], r.poly[i][0], r.poly[i][1]) < clearance) {
        return true;
      }
    }
  }
  return false;
}

// Point-in-any-building. Some buildings (isolated houses, industrial
// pads, campus outbuildings) sit outside every residential polygon, so
// the residential-only exclusion isn't enough to keep a pasture tree
// from spawning inside their footprint. A 6 m dilation guards against
// trees crowding right up against the wall.
const BUILDING_DILATION = 6;
function nearAnyBuilding(x: number, z: number): boolean {
  for (const b of WORLD.buildings) {
    if (b.poly.length < 3) continue;
    // Quick bbox reject.
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [bx, bz] of b.poly) {
      if (bx < minX) minX = bx;
      if (bx > maxX) maxX = bx;
      if (bz < minZ) minZ = bz;
      if (bz > maxZ) maxZ = bz;
    }
    if (
      x < minX - BUILDING_DILATION ||
      x > maxX + BUILDING_DILATION ||
      z < minZ - BUILDING_DILATION ||
      z > maxZ + BUILDING_DILATION
    ) continue;
    if (inside(b.poly, x, z)) return true;
  }
  return false;
}

export function OsmMeadowVegetation() {
  const { pastureTrees, bushes } = useMemo(() => {
    // Grid extent centred on WORLD_BOUNDS + margin.
    const minX = WORLD_BOUNDS.minX - PASTURE_MARGIN;
    const maxX = WORLD_BOUNDS.maxX + PASTURE_MARGIN;
    const minZ = WORLD_BOUNDS.minZ - PASTURE_MARGIN;
    const maxZ = WORLD_BOUNDS.maxZ + PASTURE_MARGIN;
    const trees: Tree[] = [];

    const nx = Math.ceil((maxX - minX) / CELL);
    const nz = Math.ceil((maxZ - minZ) / CELL);
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const h = cellHash(ix, iz);
        if (h > CELL_YIELD) continue;
        // Jitter within the cell for the actual tree position.
        const jx = ((h * 71.19) % 1) - 0.5;
        const jz = ((h * 97.31) % 1) - 0.5;
        const x = minX + (ix + 0.5 + jx * 0.7) * CELL;
        const z = minZ + (iz + 0.5 + jz * 0.7) * CELL;
        // Exclude cells overlapping any zone we shouldn't put a lone
        // tree in.
        if (inAnyForest(x, z)) continue;
        if (inAnyWater(x, z)) continue;
        if (inAnyResidential(x, z)) continue;
        if (inAnyGrass(x, z)) continue;  // sports fields etc.
        if (nearAnyBuilding(x, z)) continue;  // isolated houses outside residential polys
        // ORDER 022 V8 fix: also exclude cells that would land on a car
        // road. Prior code exclusions only covered polygons; a pasture
        // tree could still spawn 1–2 m from a service-road centreline
        // and render on the asphalt. 3.5 m clearance keeps small trees
        // clear of ~7 m carriageway envelopes plus their lane offset.
        if (nearAnyCarRoad(x, z, 3.5)) continue;
        trees.push({
          x,
          z,
          s: 0.75 + ((h * 3.19) % 1) * 0.75,   // 0.75 – 1.5
          r: ((h * 5.11) % 1) * Math.PI,
          deciduous: ((h * 11.13) % 1) < 0.65   // more broadleaf in open pasture
        });
      }
    }

    // Roadside bushes — sparse clusters along the paved through-roads.
    // Only major classes (secondary / tertiary / unclassified) so the
    // village lanes stay clean. Bushes sit ~3.2 m off the centreline
    // so they don't overlap the road surface itself.
    const bushList: Bush[] = [];
    const bushKinds = new Set(['secondary', 'tertiary', 'unclassified']);
    for (const road of WORLD.roads) {
      if (!bushKinds.has(road.kind)) continue;
      if (road.poly.length < 2) continue;
      // Walk the polyline, emitting a bush pair every ~28 m of length.
      let accumulated = 0;
      const stepM = 28;
      for (let i = 1; i < road.poly.length; i++) {
        const a = road.poly[i - 1];
        const b = road.poly[i];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const segLen = Math.hypot(dx, dz);
        if (segLen === 0) continue;
        const nx = -dz / segLen;
        const nz = dx / segLen;
        let s = -accumulated;
        while (s < segLen) {
          if (s >= 0) {
            const px = a[0] + (dx / segLen) * s;
            const pz = a[1] + (dz / segLen) * s;
            // Deterministic per (roadId + s) — skip some pairs so
            // spacing doesn't feel machine-perfect.
            const seg =
              (((idHashString(road.id) * 1000 + Math.round(s * 10)) | 0) >>> 0) /
              0xffffffff;
            if (seg > 0.28) {
              const offset = 3.2 + (seg * 0.9);
              // Skip if the bush would land in water / residential /
              // forest — same exclusions as the pasture trees.
              const lx = px + nx * offset;
              const lz = pz + nz * offset;
              const rx = px - nx * offset;
              const rz = pz - nz * offset;
              if (
                !inAnyWater(lx, lz) &&
                !inAnyResidential(lx, lz) &&
                !inAnyForest(lx, lz) &&
                !nearAnyBuilding(lx, lz)
              ) {
                bushList.push({ x: lx, z: lz, s: 0.6 + seg * 0.5 });
              }
              if (
                !inAnyWater(rx, rz) &&
                !inAnyResidential(rx, rz) &&
                !inAnyForest(rx, rz) &&
                !nearAnyBuilding(rx, rz)
              ) {
                bushList.push({ x: rx, z: rz, s: 0.6 + seg * 0.5 });
              }
            }
          }
          s += stepM;
        }
        accumulated = (stepM - ((s - segLen + stepM) % stepM)) % stepM;
      }
    }
    return { pastureTrees: trees, bushes: bushList };
  }, []);

  const conifers = pastureTrees.filter((t) => !t.deciduous);
  const decs = pastureTrees.filter((t) => t.deciduous);

  return (
    <group>
      {/* Isolated pasture conifers — a single trunk + cone. */}
      {conifers.length > 0 && (
        <>
          <Instances limit={conifers.length} range={conifers.length}>
            <cylinderGeometry args={[0.16, 0.24, 1.4, 6]} />
            <meshStandardMaterial color="#3f382e" roughness={1} />
            {conifers.map((t, i) => (
              <Instance
                key={`pt-c-${i}`}
                position={[t.x, 0.7 * t.s, t.z]}
                scale={t.s}
                rotation={[0, t.r, 0]}
              />
            ))}
          </Instances>
          <Instances limit={conifers.length} range={conifers.length}>
            <coneGeometry args={[1.2, 3.8, 8]} />
            <meshStandardMaterial color="#4a5148" roughness={1} />
            {conifers.map((t, i) => (
              <Instance
                key={`pt-cc-${i}`}
                position={[t.x, 2.4 * t.s, t.z]}
                scale={t.s}
                rotation={[0, t.r, 0]}
              />
            ))}
          </Instances>
        </>
      )}
      {/* Isolated pasture deciduous — trunk + sphere canopy. */}
      {decs.length > 0 && (
        <>
          <Instances limit={decs.length} range={decs.length}>
            <cylinderGeometry args={[0.2, 0.3, 1.6, 6]} />
            <meshStandardMaterial color="#4a3a2e" roughness={1} />
            {decs.map((t, i) => (
              <Instance
                key={`pt-d-${i}`}
                position={[t.x, 0.8 * t.s, t.z]}
                scale={t.s}
                rotation={[0, t.r, 0]}
              />
            ))}
          </Instances>
          <Instances limit={decs.length} range={decs.length}>
            <sphereGeometry args={[1.4, 10, 8]} />
            <meshStandardMaterial color="#5a744d" roughness={1} />
            {decs.map((t, i) => (
              <Instance
                key={`pt-dc-${i}`}
                position={[t.x, 2.7 * t.s, t.z]}
                scale={t.s}
                rotation={[0, t.r, 0]}
              />
            ))}
          </Instances>
        </>
      )}
      {/* Roadside bushes — small warm-green spheres, one draw call. */}
      {bushes.length > 0 && (
        <Instances limit={bushes.length} range={bushes.length}>
          <sphereGeometry args={[0.65, 8, 6]} />
          <meshStandardMaterial color="#6f8560" roughness={1} />
          {bushes.map((b, i) => (
            <Instance
              key={`rb-${i}`}
              position={[b.x, 0.35 * b.s, b.z]}
              scale={b.s}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}

function idHashString(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}
