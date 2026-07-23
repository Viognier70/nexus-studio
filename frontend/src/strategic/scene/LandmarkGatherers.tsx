import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { LANDMARK_BY_ID } from '../content/world';
import type { Vec2Tuple } from '../content/world';
import { createRng } from '../util/rng';
import { readabilityScale } from '../util/readability';

// Static-ish figures placed at named landmarks. They are the reason the
// player's eye is drawn to Torget, Campus, Gästgivaregården etc. — not
// because a marker is on top of the building, but because a small crowd
// is *there*.
//
// A gatherer is a figure who is not walking a path. They stand, drift a
// step or two, occasionally rotate to face another gatherer, and remain
// present for a while. Every ~35–60 s a slot rotates: one figure leaves
// (fades out) and a new one takes their place at a slightly different
// offset. That turnover, watched over 20 seconds, is what lets the
// village pass the Vision Owner's twenty-second rule.
//
// No overlays. No icons. Just people who happen to be standing where
// people stand.

interface GatherPoint {
  landmarkId: string;
  centre: Vec2Tuple;
  radius: number;
  // How many concurrent figures at this landmark. Torget wants a small
  // crowd, a quiet antikvariat wants at most one loiterer.
  count: number;
  // Visual mix — students at Campus, tourists at Gästgivar / Cornelis,
  // conference guests at Campus / Gästgivar, mixed elsewhere.
  palette: string[];
}

// Where the gatherings happen. Radius is *around* the landmark centre —
// figures fan out within it, then the readability scale grows them at
// village altitude without moving them off-plaza.
const GATHER_POINTS_RAW: Array<
  Omit<GatherPoint, 'centre'> & { landmarkId: string }
> = [
  {
    landmarkId: 'gry-torget',
    radius: 12,
    count: 8,
    palette: ['#8b8478', '#c69b6a', '#d6ac4f', '#5c8fa8', '#a05236', '#7a7770']
  },
  {
    landmarkId: 'gry-campus',
    radius: 16,
    count: 10,
    palette: ['#d6ac4f', '#5c8fa8', '#7ab27a', '#8874a8', '#2d2b26', '#efe7d3']
  },
  {
    landmarkId: 'gry-gastgivaregard',
    radius: 8,
    count: 5,
    palette: ['#c9482f', '#e08c66', '#c69b6a', '#3a3630', '#efe7d3']
  },
  {
    landmarkId: 'gry-kringlan',
    radius: 6,
    count: 4,
    palette: ['#8b8478', '#c69b6a', '#d6ac4f', '#c9482f']
  },
  {
    landmarkId: 'gry-cornelis',
    radius: 7,
    count: 5,
    palette: ['#c9482f', '#e08c66', '#c69b6a', '#5c8fa8']
  },
  {
    landmarkId: 'gry-pizzanshus',
    radius: 6,
    count: 3,
    palette: ['#8b8478', '#c69b6a', '#c9482f']
  },
  {
    landmarkId: 'gry-glass',
    radius: 5,
    count: 3,
    palette: ['#c9482f', '#e08c66', '#d6ac4f', '#7ab27a']
  },
  {
    landmarkId: 'gry-kyrka',
    radius: 8,
    count: 3,
    palette: ['#8b8478', '#7a7770', '#96917f', '#2d2b26']
  },
  {
    landmarkId: 'gry-herrgard',
    radius: 8,
    count: 3,
    palette: ['#8b8478', '#c69b6a', '#3a3630']
  }
];

interface Gatherer {
  cx: number;
  cz: number;
  offX: number;
  offZ: number;
  targetOffX: number;
  targetOffZ: number;
  colour: string;
  yaw: number;
  targetYaw: number;
  // Presence lifecycle. life ∈ [0, 1]. Rises to 1 (arrived), holds, then
  // falls back to 0 (left). When 0 for long enough, the slot picks a
  // fresh identity and starts over.
  life: number;
  lifeDir: 1 | -1;
  holdRemaining: number;
  seed: number;
}

// Village-scale readability curve — same shape as walkers so gatherers
// stay visually consistent with the crowd around them.
const GATHERER_CURVE = { rampStart: 320, rampEnd: 1400, maxScale: 6 };

export function LandmarkGatherers() {
  const { actualRef } = useCamera();

  const groups = useMemo(() => {
    const rng = createRng(0xa9b3c1);
    const out: Array<{ point: GatherPoint; gatherers: Gatherer[] }> = [];
    for (const raw of GATHER_POINTS_RAW) {
      const lm = LANDMARK_BY_ID[raw.landmarkId];
      if (!lm) continue;
      const point: GatherPoint = {
        landmarkId: raw.landmarkId,
        centre: [lm.position[0], lm.position[1]],
        radius: raw.radius,
        count: raw.count,
        palette: raw.palette
      };
      const gatherers: Gatherer[] = [];
      for (let i = 0; i < point.count; i++) {
        const [ox, oz] = randomOffset(rng, point.radius);
        gatherers.push({
          cx: point.centre[0],
          cz: point.centre[1],
          offX: ox,
          offZ: oz,
          targetOffX: ox,
          targetOffZ: oz,
          colour: rng.pick(point.palette),
          yaw: rng.range(0, Math.PI * 2),
          targetYaw: rng.range(0, Math.PI * 2),
          // Stagger start times so they don't all arrive at once.
          life: rng.range(0.3, 1),
          lifeDir: 1,
          holdRemaining: rng.range(18, 45),
          seed: rng.next()
        });
      }
      out.push({ point, gatherers });
    }
    return out;
  }, []);

  // Instanced meshes per group so the whole scene stays one draw call per
  // landmark. Bodies + heads separately, matching the walker aesthetic.
  const bodyRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const headRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColour = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const camDist = actualRef.current.distance;
    const scale = readabilityScale(camDist, GATHERER_CURVE);

    for (let g = 0; g < groups.length; g++) {
      const body = bodyRefs.current[g];
      const head = headRefs.current[g];
      if (!body || !head) continue;
      const { gatherers } = groups[g];
      for (let i = 0; i < gatherers.length; i++) {
        const a = gatherers[i];
        // Lifecycle: arrive → hold → leave → replaced.
        if (a.lifeDir === 1) {
          a.life = Math.min(1, a.life + dt * 0.9);
          if (a.life >= 1) {
            a.holdRemaining -= dt;
            if (a.holdRemaining <= 0) a.lifeDir = -1;
          }
        } else {
          a.life = Math.max(0, a.life - dt * 0.7);
          if (a.life <= 0) {
            // Slot renewal — new gatherer at a slightly different offset,
            // possibly a different palette pick.
            const s = deterministicRng(a.seed + performance.now() * 0.001);
            const p = groups[g].point;
            const [ox, oz] = randomOffset(s, p.radius);
            a.offX = ox;
            a.offZ = oz;
            a.targetOffX = ox;
            a.targetOffZ = oz;
            a.colour = p.palette[Math.floor(s.next() * p.palette.length)];
            a.yaw = s.range(0, Math.PI * 2);
            a.targetYaw = s.range(0, Math.PI * 2);
            a.holdRemaining = s.range(18, 45);
            a.lifeDir = 1;
            a.seed = s.next();
          }
        }
        // Occasional drift: gatherers slowly ease toward a fresh offset
        // and turn slightly. Reads as fidgeting / re-orienting, not
        // walking.
        a.offX += (a.targetOffX - a.offX) * dt * 0.4;
        a.offZ += (a.targetOffZ - a.offZ) * dt * 0.4;
        a.yaw += (a.targetYaw - a.yaw) * dt * 0.6;
        // Every ~7 s, pick a new nearby target.
        if (Math.random() < dt * 0.14) {
          const p = groups[g].point;
          const range = p.radius * 0.65;
          a.targetOffX = a.offX + (Math.random() - 0.5) * range;
          a.targetOffZ = a.offZ + (Math.random() - 0.5) * range;
          a.targetYaw = Math.random() * Math.PI * 2;
        }

        const fade = a.life; // 0 → invisible, 1 → full.
        const s = scale * fade;
        tempObj.position.set(
          a.cx + a.offX,
          0.6 * s,
          a.cz + a.offZ
        );
        tempObj.rotation.set(0, a.yaw, 0);
        tempObj.scale.set(s, s, s);
        tempObj.updateMatrix();
        body.setMatrixAt(i, tempObj.matrix);
        body.setColorAt(i, tempColour.set(a.colour));

        tempObj.position.set(
          a.cx + a.offX,
          1.35 * s,
          a.cz + a.offZ
        );
        tempObj.rotation.set(0, a.yaw, 0);
        tempObj.scale.set(s, s, s);
        tempObj.updateMatrix();
        head.setMatrixAt(i, tempObj.matrix);
      }
      body.instanceMatrix.needsUpdate = true;
      head.instanceMatrix.needsUpdate = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {groups.map((g, gi) => (
        <group key={g.point.landmarkId}>
          <instancedMesh
            ref={(ref) => {
              bodyRefs.current[gi] = ref;
            }}
            args={[undefined, undefined, g.gatherers.length]}
          >
            <boxGeometry args={[0.42, 1.2, 0.32]} />
            <meshStandardMaterial roughness={0.9} />
          </instancedMesh>
          <instancedMesh
            ref={(ref) => {
              headRefs.current[gi] = ref;
            }}
            args={[undefined, undefined, g.gatherers.length]}
          >
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshStandardMaterial color="#d9b48a" roughness={0.8} />
          </instancedMesh>
        </group>
      ))}
    </group>
  );
}

// Random offset within a disc of the given radius, biased slightly toward
// the edge so gatherers cluster along the plaza edges and building fronts
// rather than sitting on top of monuments.
function randomOffset(
  rng: { range(a: number, b: number): number; next(): number },
  radius: number
): [number, number] {
  const angle = rng.range(0, Math.PI * 2);
  const r = radius * (0.55 + rng.next() * 0.45);
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

// Minimal RNG so slot renewal at runtime doesn't collide with the seeded
// pool used at spawn.
function deterministicRng(seed: number) {
  let state = ((seed * 2654435761) >>> 0) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
  return {
    next,
    range(a: number, b: number) {
      return a + next() * (b - a);
    }
  };
}
