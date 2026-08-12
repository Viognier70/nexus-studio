// ORDER 056 Del F — parametric facades wired into the strategic view.
//
// For each eligible building, generate LOD 0 and LOD 1 geometry once at
// mount via `buildFacade`. LOD 2 = fall through to OsmBuildings (the
// existing extruded box). A per-frame distance check (throttled) flips
// visibility between LOD 0 (near), LOD 1 (mid), and hidden (far).
// Buildings that switch to LOD-hidden re-appear in the OsmBuildings
// pass via `SKIP_PROCEDURAL_IDS` — the two representations never
// render simultaneously.
//
// Memory strategy: per-building geometry is unique (footprints differ),
// but the material per bucket is shared. That keeps draw call count
// manageable — a single MeshStandardMaterial per (kulor / knutar /
// taktackning / sockel) bucket, referenced by many meshes.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WORLD } from '../content/world';
import type { RawBuilding } from '../content/world';
import {
  FODER_HEX,
  KULOR_HEX,
  KNUT_HEX,
  SILL_HEX,
  SOCKEL_HEX,
  TAKTACKNING_HEX,
  type FacadeParams
} from '../../lib/facade/schema';
import { buildFacade, type FacadeGeometry } from '../../lib/facade/buildFacade';
import { paramsFor } from '../../lib/facade/paramsFor';
import { skyState } from '../../lib/lighting/skyState';

// Distance thresholds in metres, measured camera → building centroid.
// Adjust in one place so LOD tuning stays legible.
//   < LOD_NEAR_M  → LOD 0 (walls + panel relief + corners + windows +
//                          sockel + roof)
//   otherwise    → LOD 1 (walls + corners + sockel + roof, no panel
//                          relief, no windows) — this is the always-on
//                          fallback so a house never disappears from
//                          the strategic view; only the detail changes.
// LOD 1 was scoped as a middle rung with an OsmBuildings fall-through
// beyond it, but that made eligible houses vanish at village zoom.
// One LOD swap is enough for now; the far-distance form is a plain
// tri-count-low massing.
const LOD_NEAR_M = 70;

const ELIGIBLE_KINDS = new Set([
  'house',
  'detached',
  'residential',
  'apartments'
]);

// Exported so OsmBuildings can skip these IDs and avoid double-rendering.
export const SKIP_PROCEDURAL_IDS: Set<string> = new Set(
  WORLD.buildings
    .filter((b) => ELIGIBLE_KINDS.has(b.kind ?? ''))
    .map((b) => b.id)
);

// FNV-1a — same shape as paramsFor's hash. Local copy to avoid pulling
// in the whole module.
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

interface BuiltBuilding {
  building: RawBuilding;
  params: FacadeParams;
  centroid: [number, number];
  lod0: FacadeGeometry;
  lod1: FacadeGeometry;
  // ORDER 057 Del B — deterministic per-building flag for whether
  // the windows are lit at night. About 60 % of houses. Same hash
  // stream as paramsFor so it stays stable across reloads.
  windowsLit: boolean;
}

// Deterministic ~60% lit flag derived from OSM id. Uses a different
// salt from paramsFor so the flag doesn't correlate with kulör /
// panel choice (avoids "all falurod houses are lit" style patterns).
function isLit(osmId: string): boolean {
  let h = 0x1b873593 ^ hash32(osmId);
  h = Math.imul(h, 0xcc9e2d51);
  return (h >>> 0) / 4294967296 < 0.6;
}

function centroidOf(poly: readonly [number, number][]): [number, number] {
  let cx = 0, cz = 0;
  for (const [x, z] of poly) { cx += x; cz += z; }
  const n = Math.max(1, poly.length);
  return [cx / n, cz / n];
}

// Shared material cache — one material per unique tone across all
// facades. Cuts draw-call count when many buildings share a colour.
//
// ORDER 060 §3 — DoubleSide bandage removed. buildFacade's
// quadFromEdgeToTop now winds triangles so face normals point
// outward for CCW input (see the comment on that function), and
// ensureCCW normalises OSM polygons at entry. With those two in
// place FrontSide renders walls correctly on all 138 houses and
// diffuse lighting evaluates against the true outward normal —
// which restores expected shading on sun-facing walls (DoubleSide
// flipped the normal at shading time, producing the wrong
// hemisphere response).
//
// `side` parameter kept in the signature because glass / cutouts
// / future two-sided decoration may still need it; nothing is
// currently passing it.
const materialCache = new Map<string, THREE.MeshStandardMaterial>();
function getMaterial(
  color: string,
  roughness: number,
  metalness: number,
  side: THREE.Side = THREE.FrontSide
): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}|${side}`;
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness, side });
    materialCache.set(key, m);
  }
  return m;
}

// Glass material — physical material with transmission so daylight
// passes through the pane onto the interior floor.
let glassMaterialSingleton: THREE.MeshPhysicalMaterial | null = null;
function getGlassMaterial(): THREE.MeshPhysicalMaterial {
  if (glassMaterialSingleton) return glassMaterialSingleton;
  glassMaterialSingleton = new THREE.MeshPhysicalMaterial({
    color: '#c8dbe3',
    roughness: 0.05,
    metalness: 0,
    transmission: 0.9,
    thickness: 0.02,
    ior: 1.5,
    transparent: true,
    side: THREE.DoubleSide
  });
  return glassMaterialSingleton;
}

// ORDER 057 Del B — lit-window material for the "some houses have
// lights on at night" reading. Same physical parameters as the plain
// glass, but with a warm emissive that ramps with skyState.nightFactor
// via a per-frame update in the ProceduralFacades component. Standard
// material (not physical) — we don't need transmission on the lit
// pane; the emissive replaces the transmitted daylight after dark.
let litGlassMaterialSingleton: THREE.MeshStandardMaterial | null = null;
function getLitGlassMaterial(): THREE.MeshStandardMaterial {
  if (litGlassMaterialSingleton) return litGlassMaterialSingleton;
  litGlassMaterialSingleton = new THREE.MeshStandardMaterial({
    color: '#4a3820',       // deep amber base, keeps the pane feel
    emissive: '#ffb460',    // warm interior tungsten
    emissiveIntensity: 0,   // starts at 0 (day); useFrame animates
    roughness: 0.35,
    metalness: 0
  });
  return litGlassMaterialSingleton;
}
const LIT_GLASS_PEAK_EMISSIVE = 1.4;   // scaled by nightFactor at runtime

// ---------- component -------------------------------------------------

export function ProceduralFacades() {
  const { camera } = useThree();

  // Build every eligible building's LOD 0 + LOD 1 geometry once.
  // Heavy work; runs at mount, never again. Buildings are cheap to
  // hold in memory as BufferGeometry — a few thousand triangles per
  // house at LOD 0, a few hundred at LOD 1.
  const built = useMemo<BuiltBuilding[]>(() => {
    const list: BuiltBuilding[] = [];
    for (const b of WORLD.buildings) {
      if (!ELIGIBLE_KINDS.has(b.kind ?? '')) continue;
      if (b.poly.length < 3) continue;
      const params = paramsFor(b.id);
      const seed = hash32(b.id);
      const lod0 = buildFacade(b.poly, params, seed, { lod: 0 });
      const lod1 = buildFacade(b.poly, params, seed, { lod: 1 });
      list.push({
        building: b,
        params,
        centroid: centroidOf(b.poly),
        lod0,
        lod1,
        windowsLit: isLit(b.id)
      });
    }
    return list;
  }, []);

  // Track per-building LOD so we only touch mesh.visible when it flips.
  // Only two states now: 'lod0' (near, full detail) and 'lod1' (mid+far,
  // simplified). LOD 1 is always on when not near — no hidden state.
  const lodStateRef = useRef<Map<string, 'lod0' | 'lod1'>>(new Map());
  const groupsRef = useRef<Map<string, { lod0: THREE.Group; lod1: THREE.Group }>>(new Map());
  // ORDER 057 Del B — per-building glass mesh ref, populated only for
  // lit buildings. Used to swap material between transmission glass
  // (day) and emissive amber (night) as skyState.nightFactor crosses
  // a small threshold. The swap is per-mesh so unlit houses stay on
  // the physical glass at all times.
  const litGlassMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const litSwapStateRef = useRef<'day' | 'night'>('day');

  // Throttled distance check — every 4 frames is enough (~15 Hz at
  // 60 fps); LOD transitions don't need to be sub-frame precise.
  // ORDER 057 Del B — same throttle drives the lit-glass emissive
  // update + day/night material swap. Cheap: one intensity write per
  // frame, and at most one material-swap per building per twilight
  // crossing (usually zero mid-day / mid-night).
  const frameCounter = useRef(0);
  useFrame(() => {
    frameCounter.current += 1;
    if (frameCounter.current % 4 !== 0) return;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const b of built) {
      const dx = b.centroid[0] - cx;
      const dz = b.centroid[1] - cz;
      const dist = Math.hypot(dx, dz);
      const level: 'lod0' | 'lod1' = dist < LOD_NEAR_M ? 'lod0' : 'lod1';
      const prev = lodStateRef.current.get(b.building.id);
      if (prev === level) continue;
      lodStateRef.current.set(b.building.id, level);
      const groups = groupsRef.current.get(b.building.id);
      if (!groups) continue;
      groups.lod0.visible = level === 'lod0';
      groups.lod1.visible = level === 'lod1';
    }

    // ORDER 057 Del B — drive emissive intensity from nightFactor.
    // Read once per throttled tick; write to the shared material so
    // every lit-glass mesh picks it up in the next frame's shader.
    const nightFactor = skyState.nightFactor;
    const litMat = getLitGlassMaterial();
    litMat.emissiveIntensity = nightFactor * LIT_GLASS_PEAK_EMISSIVE;

    // Swap glass materials on lit buildings when we cross the
    // day/night boundary. Threshold 0.05 gives a small hysteresis-free
    // dead-band so we don't thrash the swap right at the twilight
    // pivot. Material assignment is a plain reference write; three.js
    // picks it up on next render.
    const wantsNight: 'day' | 'night' = nightFactor > 0.05 ? 'night' : 'day';
    if (litSwapStateRef.current !== wantsNight) {
      litSwapStateRef.current = wantsNight;
      const targetMat: THREE.Material = wantsNight
        ? litMat
        : getGlassMaterial();
      for (const mesh of litGlassMeshesRef.current.values()) {
        mesh.material = targetMat;
      }
    }
  });

  // Clean up cached geometries + materials when the component
  // unmounts (StrictMode double-mount, HMR).
  useEffect(() => {
    return () => {
      for (const b of built) {
        b.lod0.walls.dispose();
        b.lod0.corners?.dispose();
        b.lod0.roof.dispose();
        b.lod0.sockel?.dispose();
        b.lod0.windowFrames?.dispose();
        b.lod0.windowGlass?.dispose();
        b.lod0.windowSills?.dispose();
        b.lod1.walls.dispose();
        b.lod1.corners?.dispose();
        b.lod1.roof.dispose();
        b.lod1.sockel?.dispose();
      }
    };
  }, [built]);

  return (
    <group>
      {built.map((b) => (
        <BuildingGroup
          key={b.building.id}
          data={b}
          registerGroups={(g) => groupsRef.current.set(b.building.id, g)}
          registerLitGlass={
            b.windowsLit
              ? (m) => {
                  if (m) litGlassMeshesRef.current.set(b.building.id, m);
                  else litGlassMeshesRef.current.delete(b.building.id);
                }
              : undefined
          }
        />
      ))}
    </group>
  );
}

interface BuildingGroupProps {
  data: BuiltBuilding;
  registerGroups: (g: { lod0: THREE.Group; lod1: THREE.Group }) => void;
  // Only set for lit buildings (per data.windowsLit). Left undefined
  // for unlit; the mesh's material stays on the plain transmission
  // glass at all times.
  registerLitGlass?: (mesh: THREE.Mesh | null) => void;
}

function BuildingGroup({ data, registerGroups, registerLitGlass }: BuildingGroupProps) {
  const lod0Ref = useRef<THREE.Group>(null);
  const lod1Ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (lod0Ref.current && lod1Ref.current) {
      registerGroups({ lod0: lod0Ref.current, lod1: lod1Ref.current });
    }
  }, [registerGroups]);

  // ORDER 060 §3 — FrontSide is enough now that quadFromEdgeToTop
  // produces outward-facing normals for CCW input (verified by the
  // `wall face normals point OUTWARD for CCW and CW input` test).
  const wallMat = getMaterial(KULOR_HEX[data.params.kulor], 0.75, 0);
  const cornerMat = getMaterial(KNUT_HEX[data.params.knutar], 0.85, 0);
  const roofMat = getMaterial(
    TAKTACKNING_HEX[data.params.taktackning],
    data.params.taktackning === 'plat' ? 0.55 : 0.85,
    data.params.taktackning === 'plat' ? 0.5  : 0
  );
  const sockelMat = data.params.sockel !== 'ingen'
    ? getMaterial(SOCKEL_HEX[data.params.sockel], 0.9, 0)
    : null;
  const foderMat = getMaterial(FODER_HEX, 0.85, 0);
  const sillMat  = getMaterial(SILL_HEX,  0.85, 0);
  const glassMat = getGlassMaterial();

  return (
    <>
      {/* LOD 0 — full detail with windows. Starts hidden; useFrame
          promotes it when the camera comes close. */}
      <group ref={lod0Ref} visible={false}>
        <mesh geometry={data.lod0.walls} material={wallMat} castShadow receiveShadow />
        {data.lod0.corners && (
          <mesh geometry={data.lod0.corners} material={cornerMat} castShadow />
        )}
        {data.lod0.sockel && sockelMat && (
          <mesh geometry={data.lod0.sockel} material={sockelMat} castShadow receiveShadow />
        )}
        <mesh geometry={data.lod0.roof} material={roofMat} castShadow receiveShadow />
        {data.lod0.windowFrames && (
          <mesh geometry={data.lod0.windowFrames} material={foderMat} castShadow />
        )}
        {data.lod0.windowSills && (
          <mesh geometry={data.lod0.windowSills} material={sillMat} castShadow />
        )}
        {data.lod0.windowGlass && (
          // Glass is castShadow=false — physical transmission material
          // renders through the shadow map as opaque, which defeats
          // the purpose of letting sunlight into the interior.
          // ORDER 057 Del B — for lit buildings, register the mesh
          // ref so ProceduralFacades' useFrame can swap its material
          // between transmission-glass (day) and emissive amber
          // (night). The material prop below is the day-side default;
          // the swap replaces it at runtime, so the initial JSX value
          // is only used for the frames before the first useFrame
          // tick.
          <mesh
            ref={registerLitGlass}
            geometry={data.lod0.windowGlass}
            material={glassMat}
          />
        )}
      </group>
      {/* LOD 1 — no windows, no panel relief. Visible by default so
          buildings render before the first useFrame tick sets a
          per-building LOD; the frame check then demotes to hidden if
          LOD 0 kicks in. */}
      <group ref={lod1Ref} visible={true}>
        <mesh geometry={data.lod1.walls} material={wallMat} castShadow receiveShadow />
        {data.lod1.corners && (
          <mesh geometry={data.lod1.corners} material={cornerMat} castShadow />
        )}
        {data.lod1.sockel && sockelMat && (
          <mesh geometry={data.lod1.sockel} material={sockelMat} castShadow receiveShadow />
        )}
        <mesh geometry={data.lod1.roof} material={roofMat} castShadow receiveShadow />
      </group>
    </>
  );
}
