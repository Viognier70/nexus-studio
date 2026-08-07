import { Instance, Instances } from '@react-three/drei';
import { useMemo } from 'react';
import { WORLD } from '../content/world';
import {
  streetProfile,
  type CanopyDensity,
  type TreeSpecies,
  type VegetationDensity
} from '../content/streetProfiles';
import { inAnyWater, nearAnyBuilding } from '../procgen/geom';

// ORDER 031 — Street vegetation from StreetProfile (Phase 8).
//
// Replaces the ORDER 030 flat-list-of-streets tree pass with a
// per-street density + species + canopy pattern derived from the
// StreetProfile catalogue.
//
// Every named street whose profile has vegetation != 'none' emits
// tree pairs along its polyline. Spacing, species and offset are
// determined by the profile — a Skolgatan pass produces the mature
// birch tunnel; a Prästgatan pass produces sparse isolated birches;
// a Lokavägen pass produces widely spaced conifers on the wide
// industrial verges.
//
// Two draw calls per species used across the village (trunk + canopy),
// so total draws stay under ~8 regardless of tree count.

interface StreetTreeInstance {
  x: number;
  z: number;
  s: number;         // scale
  r: number;         // rotation
  species: TreeSpecies;
}

// Per-species geometry parameters. Kept flat to make additions easy.
interface SpeciesGeometry {
  trunkColour: string;
  trunkTop: number;
  trunkBottom: number;
  trunkHeight: number;
  canopyColour: string;
  canopyRadius: number;
  canopyHeight: number;   // trunk-relative Y offset for canopy centre
  scaleBase: number;      // multiplied by per-tree scale for final size
}

const SPECIES: Record<Exclude<TreeSpecies, 'mixed'>, SpeciesGeometry> = {
  birch: {
    trunkColour: '#c4b8a4',        // pale birch bark
    trunkTop: 0.22,
    trunkBottom: 0.34,
    trunkHeight: 1.8,
    canopyColour: '#6c8557',
    canopyRadius: 1.7,
    canopyHeight: 3.0,
    scaleBase: 1.05
  },
  conifer: {
    trunkColour: '#3f382e',
    trunkTop: 0.18,
    trunkBottom: 0.28,
    trunkHeight: 1.4,
    canopyColour: '#4a5148',
    canopyRadius: 1.3,
    canopyHeight: 2.6,
    scaleBase: 1.15
  },
  ornamental: {
    trunkColour: '#5a4a38',
    trunkTop: 0.14,
    trunkBottom: 0.22,
    trunkHeight: 1.2,
    canopyColour: '#8ea77a',       // brighter, pruned decorative green
    canopyRadius: 1.1,
    canopyHeight: 2.1,
    scaleBase: 0.85
  },
  lime: {
    trunkColour: '#4a4030',
    trunkTop: 0.28,
    trunkBottom: 0.42,
    trunkHeight: 2.2,
    canopyColour: '#7a8f5a',
    canopyRadius: 2.0,
    canopyHeight: 3.6,
    scaleBase: 1.2
  }
};

// Density → per-tree probability (deterministic hash gate) for the
// tree pair. 'none' skips entirely.
const DENSITY_PROBABILITY: Record<VegetationDensity, number> = {
  none:     0,
  sparse:   0.45,
  moderate: 0.75,
  dense:    0.95,
  tunnel:   1.0
};

// Perpendicular offset (metres) from the road centreline. Wider for
// larger canopy species so their trunks sit at plausible verge width.
const CANOPY_OFFSET: Record<CanopyDensity, number> = {
  open:    7.0,
  framed:  5.5,
  tunnel:  4.5
};

function pointHash(x: number, z: number, salt: number): number {
  const ix = Math.round(x * 100);
  const iz = Math.round(z * 100);
  let h = 2166136261 ^ (ix | 0);
  h = Math.imul(h, 16777619);
  h ^= iz | 0;
  h = Math.imul(h, 16777619);
  h ^= salt | 0;
  h = Math.imul(h, 16777619);
  return (h >>> 0) / 0xffffffff;
}

// Pick a concrete species from the profile spec. 'mixed' rotates
// between birch and conifer per position hash so mixed streets read
// as legibly heterogeneous.
function resolveSpecies(spec: TreeSpecies, h: number): Exclude<TreeSpecies, 'mixed'> {
  if (spec === 'mixed') return h > 0.6 ? 'conifer' : 'birch';
  return spec;
}

export function StreetTrees() {
  const trees = useMemo<StreetTreeInstance[]>(() => {
    const out: StreetTreeInstance[] = [];
    for (const road of WORLD.roads) {
      if (!road.name) continue;
      const profile = streetProfile(road.name);
      if (profile.vegetation === 'none') continue;
      if (profile.tree_spacing_m <= 0) continue;
      if (road.poly.length < 2) continue;

      const step = profile.tree_spacing_m;
      const offset = CANOPY_OFFSET[profile.canopy];
      const gate = DENSITY_PROBABILITY[profile.vegetation];

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
        let s = step - accumulated;
        while (s < segLen) {
          const px = a[0] + (dx / segLen) * s;
          const pz = a[1] + (dz / segLen) * s;
          for (const side of [+1, -1] as const) {
            const tx = px + nx * offset * side;
            const tz = pz + nz * offset * side;
            if (inAnyWater(tx, tz)) continue;

            // Density gate — a deterministic hash < gate keeps this
            // tree, otherwise the slot skips. This is how 'sparse'
            // (0.45) reads visibly sparser than 'dense' (0.95): both
            // sample at the same spacing but sparse drops most.
            const gateH = pointHash(tx, tz, 1);
            if (gateH > gate) continue;

            const h = pointHash(tx, tz, 2);
            const species = resolveSpecies(profile.tree_species, h);
            const speciesGeo = SPECIES[species];
            const jx = (h - 0.5) * 1.5;
            const jz = (((h * 3.19) % 1) - 0.5) * 1.5;
            const scaleWobble = 0.4 * ((h * 5.11) % 1);
            const fx = tx + jx;
            const fz = tz + jz;
            if (nearAnyBuilding(fx, fz, null, 1.5)) continue;
            out.push({
              x: fx,
              z: fz,
              s: speciesGeo.scaleBase + scaleWobble,
              r: ((h * 7.13) % 1) * Math.PI,
              species
            });
          }
          s += step;
        }
        accumulated = (step - ((s - segLen + step) % step)) % step;
      }
    }
    return out;
  }, []);

  if (trees.length === 0) return null;

  // Group by species → one Instances pair per species.
  const usedSpecies: Exclude<TreeSpecies, 'mixed'>[] = ['birch', 'conifer', 'ornamental', 'lime'];

  return (
    <group>
      {usedSpecies.map((species) => {
        const speciesTrees = trees.filter((t) => t.species === species);
        if (speciesTrees.length === 0) return null;
        const geo = SPECIES[species];
        return (
          <group key={species}>
            <Instances limit={speciesTrees.length} range={speciesTrees.length}>
              <cylinderGeometry args={[geo.trunkTop, geo.trunkBottom, geo.trunkHeight, 6]} />
              <meshStandardMaterial color={geo.trunkColour} roughness={1} />
              {speciesTrees.map((t, i) => (
                <Instance
                  key={`${species}-t-${i}`}
                  position={[t.x, (geo.trunkHeight / 2) * t.s, t.z]}
                  scale={t.s}
                  rotation={[0, t.r, 0]}
                />
              ))}
            </Instances>
            <Instances limit={speciesTrees.length} range={speciesTrees.length}>
              {species === 'conifer'
                ? <coneGeometry args={[geo.canopyRadius, geo.canopyRadius * 3.0, 8]} />
                : <sphereGeometry args={[geo.canopyRadius, 10, 8]} />}
              <meshStandardMaterial color={geo.canopyColour} roughness={1} />
              {speciesTrees.map((t, i) => (
                <Instance
                  key={`${species}-c-${i}`}
                  position={[t.x, geo.canopyHeight * t.s, t.z]}
                  scale={t.s}
                  rotation={[0, t.r, 0]}
                />
              ))}
            </Instances>
          </group>
        );
      })}
    </group>
  );
}
