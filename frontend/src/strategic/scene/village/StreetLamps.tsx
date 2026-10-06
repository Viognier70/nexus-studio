// ORDER 288 — gatlyktorna i kvällsbyn (Vision Owner 2026-10-01: "Ljus i
// kvällsbyn: gatlyktor, upplysta fönster och krogar som lyser när de har
// öppet. Byn ska vara stämningsfull, men det ska gå att se gator, hus och
// människor.").
//
// ORDER 297 — lyktorna som i Designs leverans Byn i kvällsljus (byKvall.js,
// villageEvening.ts LIGHTS och COLOURS):
//   - var 30:e meter längs bilgatorna (secondary, tertiary, unclassified,
//     residential, living_street), växelvis på var sin sida, strax utanför
//     vägkanten, inom byns utsnitt; ingen lykta i vårt rum eller på dess
//     trottoar (rummets ram, interiorLayout.ts);
//   - de tänds en i taget efter kvällens gång e, var och en på sitt eget e
//     inom LIGHTS.lamps.on, med ett kort fladder (flickerS, realtid);
//   - ett sken på lyktan och en ljuscirkel på marken (poolRadiusM), som tonar
//     ned på byns nivå (BLEND.lantern) så att gatorna inte ser prickiga ut;
//   - de sex lyktorna närmast vår dörr har en riktig ljuskälla.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from '../../content/world';
import { useSimState } from '../../simulation/SimulationProvider';
import { useCamera } from '../../camera/CameraContext';
import { eveningProgress } from '../../../sim/clock';
import { useOpeningEvening } from '../../opening/openingStage';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { BLEND, COLOURS, LIGHTS } from '../../village/villageEvening';

const SPACING_M = 30;
const FIRST_AT_M = 12;
const KERB_M = 0.9;
const POLE_H = 3.6;
const HEAD_Y = 3.7;
const ROAD_W: Record<string, number> = { secondary: 7, tertiary: 6, unclassified: 5, residential: 5, living_street: 4.6 };
const LAMP_KINDS = new Set(Object.keys(ROAD_W));
// Byns utsnitt i leveransen (byKvall.js): x −260…680, z −220…380.
const CROP = { x0: -260, x1: 680, z0: -220, z1: 380 };
// Rummets skal och trottoaren (byKvall.js inOurRoom): halva längden 7,8 + 4,6,
// halva djupet 5,9 + 1,4, i rummets ram.
const ROOM_KEEP_OUT = { x: 7.8 + 4.6, z: 5.9 + 1.4 };
const NEAR_LIGHTS = 6;
const POINT_INTENSITY = 16;
const POINT_DISTANCE_M = 16;

const hash = (i: number, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** ORDER 302c — lyktorna och hur tända de är just nu (0..1), för mätningen under lyktorna (village/lampProbe.ts). */
export const lampLive: { pos: Array<[number, number]>; k: Float32Array } = { pos: [], k: new Float32Array(0) };

export function lampPositions(): Array<[number, number]> {
  const room = computePlayerBusinessInterior();
  const inOurRoom = (x: number, z: number) => {
    if (!room) return false;
    const c = Math.cos(room.worldAngle);
    const s = Math.sin(room.worldAngle);
    const dx = x - room.centre[0];
    const dz = z - room.centre[1];
    return Math.abs(c * dx + s * dz) < ROOM_KEEP_OUT.x && Math.abs(-s * dx + c * dz) < ROOM_KEEP_OUT.z;
  };
  const out: Array<[number, number]> = [];
  for (const r of WORLD.roads) {
    if (!LAMP_KINDS.has(r.kind) || r.poly.length < 2) continue;
    const w = (r.width ? Math.min(r.width, 8) : ROAD_W[r.kind]) / 2 + KERB_M;
    let acc = FIRST_AT_M;
    let side = 1;
    for (let i = 1; i < r.poly.length; i++) {
      const [ax, az] = r.poly[i - 1];
      const [bx, bz] = r.poly[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (L <= 0) continue;
      while (acc < L) {
        const k = acc / L;
        const x = ax + (bx - ax) * k - ((bz - az) / L) * w * side;
        const z = az + (bz - az) * k + ((bx - ax) / L) * w * side;
        if (x > CROP.x0 && x < CROP.x1 && z > CROP.z0 && z < CROP.z1 && !inOurRoom(x, z)) out.push([x, z]);
        side = -side;
        acc += SPACING_M;
      }
      acc -= L;
    }
  }
  return out;
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function StreetLamps() {
  const sim = useSimState();
  const { actualRef } = useCamera();
  // ORDER 308 — under öppningen tänds ljusen efter manusets kväll (oppningManus EVENING).
  const opening = useOpeningEvening();
  const e = opening ?? eveningProgress(sim);
  const built = useMemo(() => {
    const pos = lampPositions();
    const n = pos.length;
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, POLE_H, 6);
    poleGeo.translate(0, POLE_H / 2, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.6, metalness: 0.3 }), n);
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    headGeo.translate(0, HEAD_Y, 0);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
    const tex = glowTexture();
    // Skenet på lyktan: punkter med färg per lykta (svart = släckt), additivt.
    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos.flatMap(([x, z]) => [x, HEAD_Y - 0.1, z]), 3));
    glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const glowMat = new THREE.PointsMaterial({ map: tex, size: 3.2, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const glows = new THREE.Points(glowGeo, glowMat);
    glows.frustumCulled = false;
    // Ljuscirkeln på marken: en platta per lykta, färgen bär ljuset.
    const poolGeo = new THREE.PlaneGeometry(1, 1);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pools = new THREE.InstancedMesh(poolGeo, poolMat, n);
    pools.renderOrder = 2;
    const m = new THREE.Matrix4();
    const off = new THREE.Color('#3a342c');
    const d = LIGHTS.lamps.poolRadiusM * 2;
    pos.forEach(([x, z], i) => {
      m.makeTranslation(x, 0, z);
      poles.setMatrixAt(i, m);
      heads.setMatrixAt(i, m);
      heads.setColorAt(i, off);
      m.makeScale(d, 1, d).setPosition(x, 0.085, z);
      pools.setMatrixAt(i, m);
      pools.setColorAt(i, new THREE.Color(0, 0, 0));
    });
    // De sex närmast vår dörr har en riktig ljuskälla.
    const room = computePlayerBusinessInterior();
    const door = room ? room.entrance : [0, 0];
    const nearest = pos.map((p, i) => [Math.hypot(p[0] - door[0], p[1] - door[1]), i] as const).sort((a, b) => a[0] - b[0]).slice(0, NEAR_LIGHTS).map((x) => x[1]);
    const lights = nearest.map((i) => {
      const l = new THREE.PointLight(COLOURS.lamp, 0, POINT_DISTANCE_M, 1.6);
      l.position.set(pos[i][0], HEAD_Y - 0.1, pos[i][1]);
      return { i, l };
    });
    const group = new THREE.Group();
    group.add(poles, heads, glows, pools, ...lights.map((x) => x.l));
    const thr = pos.map((_, i) => LIGHTS.lamps.on[0] + (LIGHTS.lamps.on[1] - LIGHTS.lamps.on[0]) * hash(i, 21));
    return { group, poles, heads, glows, pools, lights, tex, n, pos, thr, k: new Float32Array(n), off, on: new THREE.Color(COLOURS.lampHead).multiplyScalar(2.4), lamp: new THREE.Color(COLOURS.lamp) };
  }, []);

  useEffect(() => {
    lampLive.pos = built.pos;
    lampLive.k = built.k;
    if (typeof document !== 'undefined') document.body.dataset.streetLamps = String(built.n);
    return () => {
      built.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.());
      built.tex.dispose();
    };
  }, [built]);

  useFrame((state, delta) => {
    const ev = e ?? 0;
    const dt = Math.min(delta, 0.1);
    const lantern = smooth(BLEND.lantern[0], BLEND.lantern[1], actualRef.current.distance);
    const colours = built.glows.geometry.getAttribute('color') as THREE.BufferAttribute;
    const c = new THREE.Color();
    const t = state.clock.elapsedTime;
    let lit = 0;
    for (let i = 0; i < built.n; i++) {
      const on = e !== null && ev >= built.thr[i];
      const k = on ? Math.min(1, built.k[i] + dt / LIGHTS.lamps.flickerS) : Math.max(0, built.k[i] - dt * 2);
      built.k[i] = k;
      // Fladdret när lyktan tänds.
      const v = on && k < 1 ? k * (hash(Math.floor(t * 22) + i * 13, 3) > 0.45 ? 1 : 0.15) : k;
      if (v > 0) lit++;
      built.heads.setColorAt(i, c.copy(built.off).lerp(built.on, v));
      c.copy(built.lamp).multiplyScalar(0.55 * v);
      colours.setXYZ(i, c.r, c.g, c.b);
      built.pools.setColorAt(i, c.copy(built.lamp).multiplyScalar(0.3 * v * (1 - 0.65 * lantern)));
    }
    for (const { i, l } of built.lights) l.intensity = POINT_INTENSITY * built.k[i];
    if (built.heads.instanceColor) built.heads.instanceColor.needsUpdate = true;
    if (built.pools.instanceColor) built.pools.instanceColor.needsUpdate = true;
    colours.needsUpdate = true;
    if (typeof document !== 'undefined') document.body.dataset.streetLampsLit = String(lit);
  });

  return <primitive object={built.group} />;
}
