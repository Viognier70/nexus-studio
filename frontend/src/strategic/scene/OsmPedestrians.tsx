import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import {
  CYCLE_PATHS,
  LANDMARK_BY_ID,
  PED_PATHS,
  polylineLength,
  samplePolyline
} from '../content/world';
import type { RawRoad } from '../content/world';
import { createRng } from '../util/rng';
import { readabilityScale, type ReadabilityCurve } from '../util/readability';
import { GUEST_GROUPS, type GuestGroupId } from './guestGroups';
import { GROUP_IDS } from './guestLooks';
import { OSM_FRAME, streetSignGeometry } from './village/streetLooks';
import { streetFigureMaterial, streetFloorRef } from './village/streetFigureLight';
import { addProbeFigures, lampProbeRequested, type ProbeFigure } from './village/lampProbe';
import { advanceGait, composeLeg, easeMoving, gaitBob, legSwing, streetLegGeometry } from './village/streetGait';
import { clearStreetWalkers, publishStreetWalkers } from './streetPresence';

// Village-scale readability treatment. At close and district range the
// walker keeps its authored 1.2 m height; from ~320 m up the visual scale
// ramps smoothly so the crowd stays visible from Google-Earth altitude.
// Cyclists are slightly larger in reality, so they cap a bit lower.
const WALKER_CURVE: ReadabilityCurve = {
  rampStart: 320,
  rampEnd: 1400,
  maxScale: 6
};
const CYCLIST_CURVE: ReadabilityCurve = {
  rampStart: 320,
  rampEnd: 1400,
  maxScale: 5
};

type WalkerRole = 'resident' | 'student' | 'tourist' | 'conference' | 'staff';

interface Walker {
  role: WalkerRole;
  path: RawRoad;
  t: number;
  speed: number;
  forward: 1 | -1;
  swap: number;
  colour: string;
  // ORDER 302b — D5:s färgvariant (0/1) för gruppens tecken.
  variant: number;
  entering: number;
  // Group membership. A follower (leaderIndex ≥ 0) shadows the leader's
  // path with a small progress offset. Reads as walking together. This
  // is what turns "44 conference guests scattered across the village"
  // into "three or four people leaving Campus in a group."
  leaderIndex: number;
  groupOffset: number;
  // ORDER 323 §6 — gången: fasen ur sträckan, 0 står och 1 går, och pauserna.
  len: number;
  phase: number;
  moving: number;
  pauseLeft: number;
  nextPause: number;
}

interface Cyclist {
  path: RawRoad;
  t: number;
  speed: number;
  forward: 1 | -1;
  swap: number;
  colour: string;
  entering: number;
}

const WALKER_COUNT = 110;
const CYCLIST_COUNT = 10;
const MIN_PATH_LENGTH = 25;
const MIN_CYCLE_LENGTH = 60;
const WALKER_SEED = 0xa30f7c;
// ORDER 323 §6 — farten i meter per sekund (förut en andel av vägen per
// sekund, så att en gående på en lång väg gled fram i 10 m/s), och pauserna:
// var 12–40 s stannar en gående (och hans sällskap) 2–6 s och ser sig om.
const WALK_MPS: [number, number] = [1.05, 1.5];
const PAUSE_EVERY_S: [number, number] = [12, 40];
const PAUSE_S: [number, number] = [2, 6];
// Benen: höften och avståndet mellan benen (meter vid storlek 1).
const PED_HIP_Y = 0.66;
// Överkroppen från strax under höften till axlarna (förut en låda 0–1,2 m).
const PED_BODY_H = 0.6;
const PED_BODY_Y = PED_HIP_Y - 0.06 + PED_BODY_H / 2;
const PED_LEG_HALF_GAP = 0.1;
const CYCLIST_SEED = 0x5c17f3;

// Bus stop and campus parking are anchored on / next to the campus complex.
// Populating the flow map with these gives pedestrians a plausible reason to
// stream between the arrival edge of the village and its social centres.
const LANDMARK_POSITIONS: Array<[number, number]> = [
  'gry-torget',
  'gry-kyrka',
  'gry-gastgivaregard',
  'gry-cornelis',
  'gry-kringlan',
  'gry-pizzanshus',
  'gry-campus',
  'gry-glass',
  'gry-herrgard'
]
  .map((id) => LANDMARK_BY_ID[id]?.position)
  .filter((p): p is [number, number] => !!p);

// Distance from a candidate path's midpoint to the nearest landmark.
// Peds prefer paths close to landmarks so the visible flow clusters at
// Torget, Campus, Cornelis, Kringlan, Gästgivaregården etc.
function landmarkScore(path: RawRoad): number {
  if (LANDMARK_POSITIONS.length === 0) return 0;
  const mid = path.poly[Math.floor(path.poly.length / 2)];
  let best = Infinity;
  for (const [lx, lz] of LANDMARK_POSITIONS) {
    const d = Math.hypot(mid[0] - lx, mid[1] - lz);
    if (d < best) best = d;
  }
  return best;
}

// Steep inverse-power weighting so distribution concentrates sharply around
// the named destinations rather than smearing evenly across the village.
// An 80 m floor keeps the on-landmark paths from monopolising the pool,
// and the ^1.8 exponent gives a ~30× ratio between paths right at Torget
// and paths 500 m out in the residential ring.
function landmarkWeight(distance: number): number {
  return 1 / Math.pow(80 + distance, 1.8);
}

function pickPedPaths(): { paths: RawRoad[]; weights: number[] } {
  const eligible = PED_PATHS.filter(
    (p) => polylineLength(p.poly) >= MIN_PATH_LENGTH
  );
  const paths = eligible.length ? eligible : PED_PATHS;
  const weights = paths.map((p) => landmarkWeight(landmarkScore(p)));
  return { paths, weights };
}

// A walker on a landmark-adjacent path is dwelling near a destination.
// Slow them slightly and let them stay on that path longer, so the crowd
// visibly *lingers* at Torget, Campus and the church rather than churning.
function isLandmarkPath(path: RawRoad): boolean {
  return landmarkScore(path) < 60;
}

function weightedPick(
  paths: RawRoad[],
  weights: number[],
  r: number
): RawRoad {
  const total = weights.reduce((s, w) => s + w, 0);
  let cum = 0;
  const target = r * total;
  for (let i = 0; i < paths.length; i++) {
    cum += weights[i];
    if (cum >= target) return paths[i];
  }
  return paths[paths.length - 1];
}

// Palette per role. The village should read as populated — residents in
// muted earth tones, students in brighter accents, tourists in high-visibility
// warm colours, conference guests in dark formals.
//
// ORDER 302b (Anders 2026-10-05) — byns folk i Designs D5-grupper
// (guestGroups.ts): byborna i bybornas kläder och keps, studenterna med
// ryggsäck, turisterna i solhatt och konferensgästerna som affärsfolk med vit
// skjorta. Personalen från Måltidens hus är ingen gästgrupp och går som förut.
// Kropparnas färger är D5:s två varianter (looks[].body); tecknet i gruppens
// accentfärg (village/streetLooks.ts streetSignGeometry, ramen OSM_FRAME).
const ROLE_GROUP: Record<WalkerRole, GuestGroupId | null> = {
  resident: 'villager',
  student: 'student',
  tourist: 'tourist',
  conference: 'business',
  staff: null
};
// ORDER 302c — gatans variant (Designs tillägg 2026-10-06, looks[].street): kroppen
// ljusare än marken, tecknet i gatans accentfärg.
const groupBodies = (g: GuestGroupId) => GUEST_GROUPS[g].looks.map((l) => l.street.body);
const ROLE_PALETTE: Record<WalkerRole, string[]> = {
  resident: groupBodies('villager'),
  student: groupBodies('student'),
  tourist: groupBodies('tourist'),
  conference: groupBodies('business'),
  staff: ['#efe7d3', '#c9b28e']
};
// Kroppen är en låda 0,42 × 1,2 × 0,32 m (fötterna vid 0) och huvudet r 0,22 vid 1,35 m (streetLooks.ts OSM_FRAME).

// ORDER 302c — cyklisterna (cykeln och den som cyklar, en låda) i gatans
// färger för bybor och studenter (guestGroups.ts looks[].street.body). Förut
// fanns ett tegelrött bland dem, och D5 säger inget rött. Fyra färger som
// förut, så att slumpflödet är detsamma.
const CYCLIST_PALETTE: string[] = [...groupBodies('villager'), ...groupBodies('student')];

// Rough share of population. Sums to 1.
const ROLE_MIX: Array<[WalkerRole, number]> = [
  ['resident', 0.44],
  ['student', 0.26],
  ['tourist', 0.16],
  ['conference', 0.10],
  ['staff', 0.04]
];

function pickRole(rng: { next(): number }): WalkerRole {
  const r = rng.next();
  let cum = 0;
  for (const [role, share] of ROLE_MIX) {
    cum += share;
    if (r < cum) return role;
  }
  return 'resident';
}

// ORDER 319a.2 — den gåendes höjd vid prövningen mot kamerans bild.
const WALKER_TOP_M = 1.7;

export function OsmPedestrians() {
  const { actualRef } = useCamera();
  const gl = useThree((x) => x.gl);
  const camera = useThree((x) => x.camera);
  const scene = useThree((x) => x.scene);
  const { paths, weights } = useMemo(() => pickPedPaths(), []);
  const cyclePaths = useMemo(
    () =>
      CYCLE_PATHS.filter((p) => polylineLength(p.poly) >= MIN_CYCLE_LENGTH),
    []
  );
  const walkers = useMemo<Walker[]>(() => {
    const rng = createRng(WALKER_SEED);
    if (paths.length === 0) return [];
    const list: Walker[] = Array.from({ length: WALKER_COUNT }, () => {
      const role = pickRole(rng);
      return {
        role,
        path: weightedPick(paths, weights, rng.next()),
        t: rng.next(),
        speed: rng.range(WALK_MPS[0], WALK_MPS[1]),
        forward: rng.chance(0.5) ? 1 : -1,
        swap: rng.range(35, 90),
        colour: rng.pick(ROLE_PALETTE[role]),
        variant: 0,
        entering: 1,
        leaderIndex: -1,
        groupOffset: 0,
        len: 1,
        phase: rng.next(),
        moving: 1,
        pauseLeft: 0,
        nextPause: rng.range(PAUSE_EVERY_S[0], PAUSE_EVERY_S[1])
      };
    });
    // Second pass: group formation. Roughly one in every seven walkers
    // starts a group; the next 1–2 walkers become its followers.
    // Conference guests and tourists are twice as likely to be grouped
    // as residents (they arrive in parties). Group members share the
    // leader's path but sit at a small `groupOffset` in path progress
    // so they walk shoulder-adjacent, not stacked. If the leader swaps
    // to a new path, the follower reads the new path the same frame.
    let i = 0;
    while (i < list.length) {
      const leader = list[i];
      const groupable =
        leader.role === 'conference' || leader.role === 'tourist';
      const shouldGroup =
        (groupable && rng.chance(0.55)) ||
        (!groupable && rng.chance(0.22));
      if (!shouldGroup) {
        i += 1;
        continue;
      }
      // Group of 2 (single follower) most of the time; 3 for a rarer
      // "trio" reading. Never larger — larger groups collide visually.
      const followerCount = rng.chance(0.3) ? 2 : 1;
      for (let k = 1; k <= followerCount && i + k < list.length; k++) {
        const f = list[i + k];
        f.leaderIndex = i;
        // ±3–5 % offset, alternating sides so a group of three fans
        // out visibly.
        const side = k % 2 === 0 ? 1 : -1;
        f.groupOffset = side * rng.range(0.03, 0.055);
        // Match leader's speed so the group doesn't drift apart.
        f.speed = leader.speed;
        // Keep the follower's own role palette but nudge them onto
        // the leader's initial path so the first frame reads coherent.
        f.path = leader.path;
        f.forward = leader.forward;
        f.t = leader.t + f.groupOffset;
      }
      i += followerCount + 1;
    }
    for (const w of list) {
      w.variant = Math.max(0, ROLE_PALETTE[w.role].indexOf(w.colour));
      w.len = Math.max(1, polylineLength(w.path.poly));
    }
    return list;
  }, [paths, weights]);

  const cyclists = useMemo<Cyclist[]>(() => {
    const rng = createRng(CYCLIST_SEED);
    const pool = cyclePaths.length ? cyclePaths : paths;
    if (pool.length === 0) return [];
    return Array.from({ length: CYCLIST_COUNT }, () => ({
      path: rng.pick(pool),
      t: rng.next(),
      speed: rng.range(0.016, 0.028),
      forward: rng.chance(0.5) ? 1 : -1,
      swap: rng.range(50, 110),
      colour: rng.pick(CYCLIST_PALETTE),
      entering: 1
    }));
  }, [cyclePaths, paths]);

  const walkerMesh = useRef<THREE.InstancedMesh>(null);
  const walkerHeadMesh = useRef<THREE.InstancedMesh>(null);
  const cyclistRefs = useRef<Array<THREE.Group | null>>([]);
  const cyclistMatRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const walkerColours = useMemo(
    () => walkers.map((w) => new THREE.Color(w.colour)),
    [walkers]
  );
  const fadedColour = useMemo(() => new THREE.Color(0x000000), []);
  // ORDER 319a.2 — kamerans bild: en gående byter väg bara när varken den gamla eller den nya
  // platsen syns (förut försvann den mitt i bilden och växte fram på en ny plats).
  const view = useMemo(() => ({ f: new THREE.Frustum(), m: new THREE.Matrix4(), p: new THREE.Vector3() }), []);
  // ORDER 302b — tecknen: ett InstancedMesh per grupp, en plats per gående i
  // gruppen, accentfärgen satt en gång.
  const signs = useMemo(() => {
    const slot = walkers.map(() => -1);
    const meshes = {} as Record<GuestGroupId, THREE.InstancedMesh>;
    const root = new THREE.Group();
    for (const g of GROUP_IDS) {
      const idx = walkers.map((w, i) => (ROLE_GROUP[w.role] === g ? i : -1)).filter((i) => i >= 0);
      const mesh = new THREE.InstancedMesh(streetSignGeometry(g, OSM_FRAME), streetFigureMaterial({ roughness: 0.85 }), Math.max(1, idx.length));
      mesh.count = idx.length;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const c = new THREE.Color();
      idx.forEach((wi, k) => {
        slot[wi] = k;
        mesh.setColorAt(k, c.set(GUEST_GROUPS[g].looks[walkers[wi].variant % 2].street.accent));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      meshes[g] = mesh;
      root.add(mesh);
    }
    return { slot, meshes, root };
  }, [walkers]);
  useEffect(() => () => {
    for (const g of GROUP_IDS) {
      signs.meshes[g].geometry.dispose();
      (signs.meshes[g].material as THREE.Material).dispose();
    }
  }, [signs]);
  // ORDER 323 §6 — benen (vänster, höger) och platserna som bilarna ser vid övergångarna.
  const walkerLegMeshes = [useRef<THREE.InstancedMesh>(null), useRef<THREE.InstancedMesh>(null)] as const;
  const legMatrix = useMemo(() => new THREE.Matrix4(), []);
  const legGeometry = useMemo(() => streetLegGeometry(0.075, PED_HIP_Y - 0.02), []);
  useEffect(() => () => legGeometry.dispose(), [legGeometry]);
  const presence = useMemo(() => new Float32Array(walkers.length * 2), [walkers]);
  useEffect(() => () => clearStreetWalkers('peds'), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = performance.now() / 1000;
    // Readability treatment — see util/readability.ts. Purely visual;
    // simulation state (position, speed, path) is unchanged.
    const camDist = actualRef.current.distance;
    const walkerRead = readabilityScale(camDist, WALKER_CURVE);
    const cyclistRead = readabilityScale(camDist, CYCLIST_CURVE);
    // ORDER 302c — mätningen under lyktorna (village/lampProbe.ts), bara på begäran.
    const probe: ProbeFigure[] | null = lampProbeRequested() ? [] : null;
    camera.updateMatrixWorld();
    view.f.setFromProjectionMatrix(view.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const inView = (x: number, z: number) => view.f.containsPoint(view.p.set(x, 0, z)) || view.f.containsPoint(view.p.set(x, WALKER_TOP_M, z));
    if (walkerMesh.current) {
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i];
        w.swap -= dt;
        // Followers shadow their leader every frame. The leader owns the
        // pathing decisions; the follower just holds their group offset
        // in progress so the group walks together.
        const prevT = w.t;
        const prevPath = w.path;
        if (w.leaderIndex >= 0) {
          const L = walkers[w.leaderIndex];
          w.path = L.path;
          w.len = L.len;
          w.forward = L.forward;
          // Sällskapet står när ledaren står.
          w.pauseLeft = L.pauseLeft;
          w.t = Math.max(0, Math.min(1, L.t + w.groupOffset));
          // No further simulation for a follower — the sample below runs
          // on the shadowed values.
        } else {
          // Landmark-adjacent walkers move at 60% speed. Reads as dwelling.
          const linger = isLandmarkPath(w.path);
          const walkSpeed = linger ? w.speed * 0.75 : w.speed;
          // ORDER 323 §6 — ibland stannar den gående en stund.
          if (w.pauseLeft > 0) w.pauseLeft = Math.max(0, w.pauseLeft - dt);
          else if ((w.nextPause -= dt) <= 0) {
            const r = createRng(Math.floor(now * 1000) + i * 31);
            w.pauseLeft = r.range(PAUSE_S[0], PAUSE_S[1]) * (linger ? 1.5 : 1);
            w.nextPause = r.range(PAUSE_EVERY_S[0], PAUSE_EVERY_S[1]);
          }
          if (w.pauseLeft <= 0) w.t += (dt * walkSpeed * w.forward) / w.len;
          if (w.t > 1) {
            w.t = 1 - (w.t - 1);
            w.forward = -1;
          } else if (w.t < 0) {
            w.t = -w.t;
            w.forward = 1;
          }
          const here = w.swap <= 0 ? samplePolyline(w.path.poly, w.t) : null;
          if (w.swap <= 0 && here && !inView(here.x, here.z)) {
            const rng = createRng(Math.floor(performance.now() * 7 + i * 11));
            const path = weightedPick(paths, weights, rng.next());
            const t = rng.next();
            const there = samplePolyline(path.poly, t);
            // Den nya platsen syns: försök igen nästa bild.
            if (inView(there.x, there.z)) continue;
            w.path = path;
            w.len = Math.max(1, polylineLength(path.poly));
            w.forward = rng.chance(0.5) ? 1 : -1;
            w.t = t;
            // A walker who has just arrived near a landmark stays longer
            // than one on a through-street; on a through-street they push
            // on sooner.
            w.swap = isLandmarkPath(w.path)
              ? rng.range(60, 140)
              : rng.range(25, 55);
            w.entering = 0;
          }
        }
        if (w.entering < 1) {
          w.entering = Math.min(1, w.entering + dt * 2.2);
        }
        const p = samplePolyline(w.path.poly, w.t);
        // ORDER 323 §6 — gången: benen svingar med sträckan den gående har
        // gått (streetGait.ts), så att fötterna följer marken; i en paus står
        // benen raka och kroppen stilla. Förut gungade en låda utan ben.
        const walked = prevPath === w.path ? Math.abs(w.t - prevT) * w.len : 0;
        w.moving = easeMoving(w.moving, walked > 1e-4, dt);
        w.phase = advanceGait(w.phase, walked, 1, dt);
        const bob = gaitBob(w.phase, w.moving);
        // Face the direction of motion.
        const yaw = p.yaw + (w.forward === -1 ? Math.PI : 0);
        // Fade-in hides the teleport frame; readability grows the walker
        // at village range only. Feet stay on the ground because position.y
        // scales with the same factor.
        const scale = w.entering * w.entering * walkerRead;
        for (const [k, side] of [[0, -1], [1, 1]] as const) {
          const leg = walkerLegMeshes[k].current;
          if (!leg) continue;
          composeLeg(legMatrix, p.x, bob * scale, p.z, yaw, side, legSwing(w.phase, side, w.moving), scale, PED_HIP_Y, PED_LEG_HALF_GAP);
          leg.setMatrixAt(i, legMatrix);
        }
        presence[i * 2] = p.x;
        presence[i * 2 + 1] = p.z;
        tempObj.position.set(p.x, (PED_BODY_Y + bob) * scale, p.z);
        tempObj.rotation.set(0, yaw, 0);
        tempObj.scale.set(scale, scale, scale);
        tempObj.updateMatrix();
        walkerMesh.current.setMatrixAt(i, tempObj.matrix);
        const c = walkerColours[i].clone().lerp(fadedColour, 1 - w.entering);
        walkerMesh.current.setColorAt(i, c);
        if (walkerHeadMesh.current) {
          tempObj.position.set(p.x, (1.35 + bob) * scale, p.z);
          tempObj.rotation.set(0, yaw, 0);
          tempObj.scale.set(scale, scale, scale);
          tempObj.updateMatrix();
          walkerHeadMesh.current.setMatrixAt(i, tempObj.matrix);
        }
        // ORDER 302b — gruppens tecken i figurens ram (fötterna vid 0).
        const group = ROLE_GROUP[w.role];
        if (probe && group && w.entering >= 1) probe.push({ src: 'peds', group, variant: w.variant % 2, colour: w.colour, x: p.x, z: p.z, bodyY: (PED_BODY_Y + bob) * scale, halfW: 0.21 * scale, scale });
        if (group) {
          tempObj.position.set(p.x, bob * scale, p.z);
          tempObj.updateMatrix();
          signs.meshes[group].setMatrixAt(signs.slot[i], tempObj.matrix);
        }
      }
      walkerMesh.current.instanceMatrix.needsUpdate = true;
      for (const leg of walkerLegMeshes) if (leg.current) leg.current.instanceMatrix.needsUpdate = true;
      publishStreetWalkers('peds', presence, walkers.length);
      // ORDER 323 §6 — kontrollens räkning (bara i dev): gående som står still och som går.
      if (import.meta.env.DEV) {
        let standing = 0;
        const walkingAt: Array<[number, number]> = [];
        walkers.forEach((w, i) => { if (w.moving < 0.5) standing++; else if (walkingAt.length < 8) walkingAt.push([presence[i * 2], presence[i * 2 + 1]]); });
        (window as unknown as { __nxPeds?: unknown }).__nxPeds = { total: walkers.length, standing, walking: walkers.length - standing, walkingAt };
      }
      if (walkerHeadMesh.current) {
        walkerHeadMesh.current.instanceMatrix.needsUpdate = true;
      }
      for (const g of GROUP_IDS) signs.meshes[g].instanceMatrix.needsUpdate = true;
      if (probe) addProbeFigures(gl, scene, camera, probe, [walkerMesh.current, walkerHeadMesh.current, signs.root]);
      if (walkerMesh.current.instanceColor) {
        walkerMesh.current.instanceColor.needsUpdate = true;
      }
    }

    for (let i = 0; i < cyclists.length; i++) {
      const c = cyclists[i];
      c.swap -= dt;
      c.t += dt * c.speed * c.forward;
      if (c.t > 1) {
        c.t = 1 - (c.t - 1);
        c.forward = -1;
      } else if (c.t < 0) {
        c.t = -c.t;
        c.forward = 1;
      }
      const cHere = c.swap <= 0 ? samplePolyline(c.path.poly, c.t) : null;
      if (c.swap <= 0 && cHere && !inView(cHere.x, cHere.z)) {
        const pool = cyclePaths.length ? cyclePaths : paths;
        if (pool.length) {
          const rng = createRng(Math.floor(performance.now() * 5 + i * 17));
          const path = rng.pick(pool);
          const t = rng.next();
          const there = samplePolyline(path.poly, t);
          // ORDER 319a.2 — bara när varken den gamla eller den nya platsen syns.
          if (!inView(there.x, there.z)) {
            c.path = path;
            c.forward = rng.chance(0.5) ? 1 : -1;
            c.t = t;
            c.swap = rng.range(50, 110);
            c.entering = 0;
          }
        }
      }
      if (c.entering < 1) {
        c.entering = Math.min(1, c.entering + dt * 2.2);
      }
      const p = samplePolyline(c.path.poly, c.t);
      const g = cyclistRefs.current[i];
      if (g) {
        // Position.y scales with readability so the wheels stay on the
        // ground (the geometry is centred at y = 0.45 with the base at 0).
        g.position.set(p.x, 0.45 * cyclistRead, p.z);
        g.rotation.y = p.yaw + (c.forward === -1 ? Math.PI : 0);
        g.scale.setScalar(cyclistRead);
      }
      const mat = cyclistMatRefs.current[i];
      if (mat) mat.opacity = c.entering;
    }
  });

  return (
    <group>
      {walkers.length > 0 && (
        <>
          {/* Body — narrower box so peds read as human silhouettes. ORDER 323 §6:
              överkroppen från höften, benen egna instanser som svingar. */}
          <instancedMesh
            ref={walkerMesh}
            args={[undefined, undefined, walkers.length]}
          >
            <boxGeometry args={[0.42, PED_BODY_H, 0.32]} />
            <meshStandardMaterial ref={streetFloorRef} roughness={0.9} />
          </instancedMesh>
          {walkerLegMeshes.map((ref, k) => (
            <instancedMesh key={k} ref={ref} args={[legGeometry, undefined, walkers.length]}>
              <meshStandardMaterial ref={streetFloorRef} color="#3b342d" roughness={0.9} />
            </instancedMesh>
          ))}
          {/* Head — small warm neutral sphere. Shares per-instance colour
              with body via the head material fixed to a skin tone. */}
          <primitive object={signs.root} />
          <instancedMesh
            ref={walkerHeadMesh}
            args={[undefined, undefined, walkers.length]}
          >
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshStandardMaterial ref={streetFloorRef} color="#d9b48a" roughness={0.8} />
          </instancedMesh>
        </>
      )}
      {cyclists.map((c, i) => (
        <group
          key={`cyc-${i}`}
          ref={(ref) => {
            cyclistRefs.current[i] = ref;
          }}
        >
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.4, 0.7, 1.6]} />
            <meshStandardMaterial
              ref={(ref) => {
                cyclistMatRefs.current[i] = ref;
                if (ref) streetFloorRef(ref);
              }}
              color={c.colour}
              roughness={0.85}
              transparent
              opacity={1}
            />
          </mesh>
          <mesh position={[0, 0.85, -0.2]}>
            <boxGeometry args={[0.35, 0.35, 0.5]} />
            <meshStandardMaterial ref={streetFloorRef} color="#c8b39a" roughness={0.75} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
