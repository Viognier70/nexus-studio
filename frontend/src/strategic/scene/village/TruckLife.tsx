// ORDER 319c (ORDRAR_319_D9.md "Platsen och vädret", Designs D9 truckProps.ts, truckWeather.ts, truckEvening.ts
// och tilläggets torchLighting.ts) — det som förändras vid spelarens vagn under kvällen, i vagnens ram:
//
//   - Marschallerna: lågan tänds när medhjälparen tänder dem (torchRound.ts, sim/truckLife.ts errand) och
//     fladdrar (13 och 29 Hz, ±15 %); i blåsten lutar den. Ett varmt sken på marken runt varje.
//   - Värmaren lyser en sval kväll, med skenet på däcket.
//   - Ljusslingan och luckan tonar in med kvällen: k = smoothstep((e − 0,42) / 0,38) (LIGHTS_K).
//   - Röken ur skorstenen, efter vädret (truckWeather.ts smoke): tunn i regnet, platt i blåsten, tät i kylan.
//   - Regnet: markisen fälls ut helt, borden och däcket blir mörka och blöta, pölar på torget och regnstreck.
//   - Blåsten: servetterna flyger från borden där någon äter (gästen griper efter dem, TRUCK_SIGNALS.grab),
//     markisens bågkant fladdrar, ljusslingan svajar och servetthållarna har en tyngd.
//   - Skräpet på borden (sim/truckLife.ts litter): servetter och tråg. Ett klick städar bordet.
//   - Sopkorgens lucka slår upp när någon slänger servetten (TRUCK_SIGNALS.binTossAt).
//   - Menyn när pekaren är över skylten (TruckMenuCard.tsx).
// Inga riktiga ljuskällor: skenet är genomskinliga skivor på marken, så att byns ljus och skuggor inte ändras.

import { Html } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { eveningProgress } from '../../../sim/clock';
import { TRUCK_TABLES, truckOf, truckRaining, type TruckTable } from '../../../sim/truckLife';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { TruckMenuCard } from '../../ui/curious/TruckMenuCard';
import { DECK_TOP_M, TRUCK_COLOURS, TRUCK_LAYOUT, onDeck } from '../playerTruck';
import { MENU_BOARD, TRUCK_PROPS } from '../truckProps';
import { LIGHTS_K, TRUCK_LIGHTS } from '../truckEvening';
import { TRUCK_WEATHER } from '../truckWeather';
import { TORCH_ROUND } from '../torchLighting';
import { torchIgniteTimes } from './torchRound';
import type { TruckFrame } from './truckGuestFlow';

/** Signaler från figurerna (PlayerTruckCrew.tsx) till platsen och tillbaka. */
export const TRUCK_SIGNALS = {
  /** När den senaste servetten slängdes i sopkorgen (klockan i useFrame). */
  binTossAt: -Infinity,
  /** Gästen vars servett blåste iväg, och när (guest.grabNapkin). */
  grab: new Map<string, number>()
};

const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Markisen i regn (Designs rain.awning): hela vagnens längd och 0,6 m längre ut. */
const RAIN_AWNING = TRUCK_WEATHER.rain.awning;
/** Regnstrecken runt vagnen: så många, i en låda så här stor (meter), fallande så här fort. */
const RAIN = { count: 420, box: [26, 9, 22] as [number, number, number], speedMps: 9, lengthM: 0.38 };
/** Pölarna på torget framför vagnen (Designs puddles 6), i vagnens ram. */
const PUDDLES: [number, number, number][] = [[-3.1, 5.6, 0.7], [0.4, 6.4, 0.9], [3.5, 5.3, 0.6], [-6.2, 4.1, 0.8], [6.9, 5.8, 0.75], [1.6, 3.6, 0.45]];
/** Servetterna i blåsten: högst så många i luften. */
const NAPKINS_MAX = 10;
/** Röken: puffarna som finns samtidigt. */
const SMOKE_MAX = 32;
/** Skorstenens topp (playerTruck.ts: taket 2,6 m och skorstenen 0,7 m). */
const CHIMNEY_TOP_M = 3.3;

function glowDisc(radius: number, colour: string): THREE.Mesh {
  const tex = glowTexture();
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ color: colour, map: tex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

let GLOW_TEX: THREE.Texture | null = null;
function glowTexture(): THREE.Texture {
  if (GLOW_TEX) return GLOW_TEX;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
    const a = Math.max(0, 1 - d);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(255 * a * a);
  }
  GLOW_TEX = new THREE.DataTexture(data, size, size);
  GLOW_TEX.needsUpdate = true;
  return GLOW_TEX;
}

interface Puff { s: THREE.Sprite; age: number; life: number; vx: number; vz: number; rise: number }
interface Napkin { m: THREE.Mesh; age: number; vx: number; vz: number; spin: number }

export function TruckLife({ at }: { at: TruckFrame }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const { scene } = useThree();
  const [menu, setMenu] = useState(false);
  const truck = truckOf(sim);
  const raining = truckRaining(sim);
  const weather = truck.weather;

  const parts = useMemo(() => {
    const g = new THREE.Group();
    g.name = 'truckLife';
    // Marschallernas lågor och sken.
    const T = TRUCK_PROPS.torch;
    const flameMat = new THREE.MeshBasicMaterial({ color: T.flame.colour, transparent: true });
    const coreMat = new THREE.MeshBasicMaterial({ color: T.flame.core, transparent: true });
    const torches = T.at.map(([x, z], i) => {
      const y = (onDeck(x, z) ? DECK_TOP_M : 0) + T.holder.height + 0.025 + T.candle.height;
      const flame = new THREE.Group();
      flame.position.set(x, y, z);
      flame.name = 'torchFlame' + i;
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.035, T.flame.height, 8), flameMat);
      outer.position.y = T.flame.height / 2;
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.018, T.flame.height * 0.55, 6), coreMat);
      core.position.y = T.flame.height * 0.3;
      flame.add(outer, core);
      const glow = glowDisc(T.light.radius, T.light.colour);
      glow.position.set(x, 0.03, z);
      g.add(flame, glow);
      return { flame, glow, lit: 0 };
    });
    // Värmarens sken och brännaren.
    const H = TRUCK_PROPS.heater;
    const heaterGlow = glowDisc(H.light.radius, H.light.colour);
    heaterGlow.position.set(H.at[0], DECK_TOP_M + 0.02, H.at[1]);
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 14), new THREE.MeshBasicMaterial({ color: '#ff9646', transparent: true, opacity: 0 }));
    burner.position.set(H.at[0], DECK_TOP_M + H.hood.height - 0.33, H.at[1]);
    g.add(heaterGlow, burner);
    // Luckans sken på marken (TRUCK_LIGHTS.hatch.glow[0]).
    const hg = TRUCK_LIGHTS.hatch.glow[0];
    const hatchGlow = glowDisc(hg.radius, hg.colour);
    hatchGlow.position.set(hg.at[0], 0.03, hg.at[1]);
    g.add(hatchGlow);
    // Markisen utfälld i regn.
    const awning = new THREE.Mesh(new THREE.BoxGeometry(RAIN_AWNING.x1 - RAIN_AWNING.x0, 0.04, RAIN_AWNING.z1 - RAIN_AWNING.z0), new THREE.MeshStandardMaterial({ color: TRUCK_COLOURS.awning, roughness: 0.7 }));
    awning.position.set((RAIN_AWNING.x0 + RAIN_AWNING.x1) / 2, TRUCK_LAYOUT.awning.height - 0.08, (RAIN_AWNING.z0 + RAIN_AWNING.z1) / 2);
    awning.rotation.x = 0.12;
    awning.name = 'awningRain';
    awning.castShadow = true;
    g.add(awning);
    // Pölarna.
    const puddleMat = new THREE.MeshBasicMaterial({ color: '#28344a', transparent: true, opacity: 0.35, depthWrite: false });
    const puddles = PUDDLES.map(([x, z, r]) => {
      const p = new THREE.Mesh(new THREE.CircleGeometry(r, 20), puddleMat);
      p.rotation.x = -Math.PI / 2;
      p.scale.set(1.4, 1, 1);
      p.position.set(x, 0.025, z);
      g.add(p);
      return p;
    });
    // Regnstrecken.
    const rainGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(RAIN.count * 6);
    const seeds = new Float32Array(RAIN.count * 3);
    for (let i = 0; i < RAIN.count; i++) {
      seeds[i * 3] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      seeds[i * 3 + 1] = (Math.sin(i * 78.233) * 12345.678) % 1;
      seeds[i * 3 + 2] = (Math.sin(i * 39.425) * 24634.634) % 1;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#c9d4e2', transparent: true, opacity: 0.3, depthWrite: false }));
    rain.frustumCulled = false;
    g.add(rain);
    // Röken.
    const smokeTex = glowTexture();
    const puffs: Puff[] = Array.from({ length: SMOKE_MAX }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: TRUCK_PROPS.smoke.puff.colour, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      g.add(s);
      return { s, age: 0, life: 1, vx: 0, vz: 0, rise: 0 };
    });
    // Servetterna i blåsten.
    const napkinMat = new THREE.MeshStandardMaterial({ color: TRUCK_PROPS.napkinHolder.colour.napkins, side: THREE.DoubleSide, roughness: 0.9 });
    const napkins: Napkin[] = Array.from({ length: NAPKINS_MAX }, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), napkinMat);
      m.visible = false;
      g.add(m);
      return { m, age: 0, vx: 0, vz: 0, spin: 0 };
    });
    // Tyngden över servetterna i blåsten.
    const weights = (['A', 'B', 'C'] as const).map((k) => {
      const [x, z] = TRUCK_PROPS.standTable.at[k];
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: '#5b5752', roughness: 0.4, metalness: 0.5 }));
      w.position.set(x, (onDeck(x, z) ? DECK_TOP_M : 0) + TRUCK_PROPS.standTable.top.height + TRUCK_PROPS.napkinHolder.size[2] * 1.5 + 0.01, z);
      w.rotation.y = 0.3;
      g.add(w);
      return w;
    });
    return { g, torches, heaterGlow, burner, hatchGlow, awning, puddles, rain, seeds, puffs, napkins, weights };
  }, []);

  useEffect(() => () => {
    parts.g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
    });
  }, [parts]);

  const clock = useRef({ smokeAcc: 0, napkinNext: 0 });
  const litterClicks = useRef(0);
  const wet = useRef<Map<THREE.Mesh, { dry: THREE.Color; mat: THREE.MeshStandardMaterial }>>(new Map());

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // Kontrollskriptet (scripts/order319c-check.mjs) läser vagnens läge härifrån.
    if (typeof window !== 'undefined') (window as unknown as { __nxTruckLife?: unknown }).__nxTruckLife = { truck, raining, eating: sim.guests.filter((g) => g.state === 'eating').length, e: eveningProgress(sim), speed: sim.speed, litterClicks: litterClicks.current };
    const dt = Math.min(0.1, delta);
    const e = eveningProgress(sim) ?? 0;
    const k = smooth((e - LIGHTS_K.from) / LIGHTS_K.span);
    const wind = weather === 'wind';
    const cool = weather === 'cool';
    // Marschallerna: tända när rundan är klar, och en i taget under rundan (tändningens tid ur torchRound.ts).
    const errand = truck.errand;
    const ignite = errand?.kind === 'torches' ? torchIgniteTimes(errand.total) : null;
    const done = errand?.kind === 'torches' ? errand.total - errand.left : 0;
    parts.torches.forEach((x, i) => {
      const on = truck.torchesLit || (ignite !== null && done >= ignite[i]);
      x.lit = on ? Math.min(1, x.lit + dt / TORCH_ROUND.litFadeS) : 0;
      const f = 1 + 0.15 * (0.6 * Math.sin(t * 2 * Math.PI * 13 + i) + 0.4 * Math.sin(t * 2 * Math.PI * 29 + i * 2));
      x.flame.visible = x.lit > 0.01;
      x.flame.scale.set(x.lit, x.lit * f * (wind ? 1 / TRUCK_WEATHER.wind.torches.flameWidth * 1.3 : 1), x.lit * (wind ? TRUCK_WEATHER.wind.torches.flameWidth : 1));
      x.flame.rotation.z = wind ? -Math.atan2(TRUCK_WEATHER.wind.torches.leanM, TRUCK_PROPS.torch.flame.height) * 4 : 0;
      (x.glow.material as THREE.MeshBasicMaterial).opacity = TRUCK_PROPS.torch.light.intensity * x.lit * (0.9 + 0.1 * f);
    });
    // Värmaren en sval kväll.
    const heat = cool ? 1 : 0;
    (parts.heaterGlow.material as THREE.MeshBasicMaterial).opacity = TRUCK_PROPS.heater.light.intensity * heat;
    (parts.burner.material as THREE.MeshBasicMaterial).opacity = heat;
    // Luckan och ljusslingan tonar in med kvällen.
    (parts.hatchGlow.material as THREE.MeshBasicMaterial).opacity = 0.3 * (0.3 + 0.7 * k);
    const trailer = scene.getObjectByName('playerTrailer');
    const sway = wind ? TRUCK_WEATHER.wind.stringLights.swayM * Math.sin(t * 2 * Math.PI * TRUCK_WEATHER.wind.stringLights.hz) : 0;
    trailer?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (o.name === 'stringLight') {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!o.userData.base) { o.userData.base = o.position.clone(); mat.userData.lit = mat.color.clone(); }
        mat.color.copy(new THREE.Color(TRUCK_LIGHTS.stringLights.unlit).lerp(mat.userData.lit as THREE.Color, k));
        mat.emissive.copy(mat.color);
        mat.emissiveIntensity = 1.4 * k;
        const b = o.userData.base as THREE.Vector3;
        o.position.set(b.x + sway * Math.sin(b.z * 1.7), b.y, b.z + sway * Math.cos(b.x * 1.3));
      } else if (o.name.startsWith('trailerScallop')) {
        if (o.userData.baseZ === undefined) o.userData.baseZ = o.position.z;
        o.position.z = o.userData.baseZ + (wind ? 0.05 * Math.sin(t * 2 * Math.PI * 9 + o.position.x) * Math.sin(t * 2 * Math.PI * 17) : 0);
      } else if (/^(standTable[ABC]|trailerDeck|bench)$/.test(o.name)) {
        // Blöta bord och däck i regnet: mörkare (Designs rain.wet).
        let w = wet.current.get(m);
        if (!w) { const mat = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mat; w = { dry: mat.color.clone(), mat }; wet.current.set(m, w); }
        const to = new THREE.Color(o.name === 'trailerDeck' ? TRUCK_WEATHER.rain.wet.deck : TRUCK_WEATHER.rain.wet.table);
        w.mat.color.copy(w.dry).lerp(to, raining ? 1 : 0);
        w.mat.roughness = raining ? 0.35 : 0.65;
      } else if (o.name === 'trailerBinFlap') {
        // Luckan slår upp när någon slänger (Designs BIN.flap.openS).
        const since = t - TRUCK_SIGNALS.binTossAt;
        const open = since >= 0 && since < TRUCK_PROPS.bin.flap.openS ? Math.sin(Math.PI * since / TRUCK_PROPS.bin.flap.openS) : 0;
        o.rotation.x = -1.1 * open;
      }
    });
    parts.awning.visible = raining;
    parts.puddles.forEach((p) => { p.visible = raining; });
    parts.weights.forEach((w) => { w.visible = wind; });
    // Regnstrecken faller i en låda runt vagnen.
    parts.rain.visible = raining;
    if (raining) {
      const arr = (parts.rain.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const [bx, by, bz] = RAIN.box;
      for (let i = 0; i < RAIN.count; i++) {
        const sx = parts.seeds[i * 3], sy = parts.seeds[i * 3 + 1], sz = parts.seeds[i * 3 + 2];
        const x = (Math.abs(sx) - 0.5) * bx, z = (Math.abs(sz) - 0.5) * bz + 2;
        const y = by - ((t * RAIN.speedMps + Math.abs(sy) * by) % by);
        arr.set([x, y, z, x - 0.04, y + RAIN.lengthM, z], i * 6);
      }
      (parts.rain.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
    // Röken ur skorstenen, efter vädret.
    const sm = TRUCK_WEATHER[weather].smoke;
    const P = TRUCK_PROPS.smoke;
    clock.current.smokeAcc += dt;
    while (clock.current.smokeAcc >= P.emitEveryS) {
      clock.current.smokeAcc -= P.emitEveryS;
      const free = parts.puffs.find((p) => !p.s.visible);
      if (!free) break;
      free.age = 0;
      free.life = sm.life * lerp(1, P.puff.lifeS[1] / P.puff.lifeS[0], Math.random());
      // Driften i kartans +x (från väster), i vagnens ram.
      free.vx = sm.driftX * Math.cos(at.rotationY);
      free.vz = sm.driftX * Math.sin(at.rotationY);
      free.rise = wind ? 0.15 : (P.risesToM - P.heightM) / free.life;
      free.s.position.set(TRUCK_LAYOUT.chimney[0], CHIMNEY_TOP_M, TRUCK_LAYOUT.chimney[1]);
      free.s.visible = true;
    }
    for (const p of parts.puffs) {
      if (!p.s.visible) continue;
      p.age += dt;
      if (p.age >= p.life) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; p.s.position.y += p.rise * dt;
      const r = P.puff.r0 + sm.growth * p.age;
      p.s.scale.setScalar(r * 2.4);
      (p.s.material as THREE.SpriteMaterial).opacity = sm.alpha * (1 - p.age / p.life) * smooth(p.age / 0.3);
    }
    // Servetterna blåser från borden där någon äter, och gästen griper efter dem.
    const N = TRUCK_WEATHER.wind.napkins;
    if (wind) {
      clock.current.napkinNext -= dt;
      const eaters = sim.guests.filter((g) => g.state === 'eating' && g.truckSpot && g.truckSpot.includes('-'));
      if (clock.current.napkinNext <= 0 && eaters.length > 0) {
        clock.current.napkinNext = lerp(N.everyS[0], N.everyS[1], Math.random());
        const g = eaters[Math.floor(Math.random() * eaters.length)];
        const table = g.truckSpot!.split('-')[0] as TruckTable;
        const free = parts.napkins.find((n) => !n.m.visible);
        if (free) {
          const [x, z] = TRUCK_PROPS.standTable.at[table];
          free.m.position.set(x, DECK_TOP_M + TRUCK_PROPS.standTable.top.height + 0.1, z);
          const sp = lerp(N.speed[0], N.speed[1], Math.random());
          free.vx = sp * Math.cos(at.rotationY);
          free.vz = sp * Math.sin(at.rotationY) + (Math.random() - 0.5) * 2 * N.sideways;
          free.spin = lerp(N.spinPerS[0], N.spinPerS[1], Math.random());
          free.age = 0;
          free.m.visible = true;
          TRUCK_SIGNALS.grab.set(g.id, t);
        }
      }
    }
    for (const n of parts.napkins) {
      if (!n.m.visible) continue;
      n.age += dt;
      if (n.age >= N.lifeS) { n.m.visible = false; continue; }
      n.m.position.x += n.vx * dt; n.m.position.z += n.vz * dt;
      n.m.position.y = Math.max(0.05, n.m.position.y + (0.6 * Math.sin(n.age * 3) - 0.25) * dt);
      n.m.rotation.set(n.age * n.spin, n.age * n.spin * 0.6, 0);
      n.m.scale.set(1, lerp(0.55, 1, 0.5 + 0.5 * Math.sin(n.age * 11)), 1);
    }
  });

  // Skräpet på borden: servetter och ett tråg per gäst som lämnade det. Ett klick städar bordet.
  const litter = TRUCK_TABLES.filter((k) => truck.litter[k] > 0);
  const tableY = (k: TruckTable) => { const [x, z] = TRUCK_PROPS.standTable.at[k]; return (onDeck(x, z) ? DECK_TOP_M : 0) + TRUCK_PROPS.standTable.top.height; };
  const clearing = truck.errand?.kind === 'clear' ? truck.errand.table : null;
  return (
    <group position={[at.x, 0, at.z]} rotation={[0, at.rotationY, 0]}>
      <primitive object={parts.g} />
      {litter.map((k) => {
        const [x, z] = TRUCK_PROPS.standTable.at[k];
        const n = Math.min(LITTER_SHOWN, truck.litter[k]);
        return (
          <group
            key={k}
            name={'litter' + k}
            position={[x, tableY(k), z]}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); litterClicks.current++; if (clearing !== k) dispatch({ type: 'TRUCK_CLEAR_TABLE', table: k }); }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = ''; }}
          >
            {Array.from({ length: n }, (_, i) => {
              const a = i * 2.1 + (k.charCodeAt(0) % 3), r = 0.12 + 0.05 * (i % 2);
              return (
                <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, a, 0]}>
                  <mesh position={[0, 0.015, 0]}><boxGeometry args={[0.33, 0.03, 0.135]} /><meshStandardMaterial color={TRUCK_PROPS.napkinHolder.colour.napkins} roughness={0.9} /></mesh>
                  <mesh position={[0.06, 0.06, 0.02]}><boxGeometry args={[0.075, 0.075, 0.075]} /><meshStandardMaterial color="#f7f3ea" roughness={0.95} /></mesh>
                </group>
              );
            })}
            {/* Träffytan för klicket: hela bordsskivan. */}
            <mesh position={[0, 0.06, 0]} visible={false}><cylinderGeometry args={[TRUCK_PROPS.standTable.top.diameter / 2, TRUCK_PROPS.standTable.top.diameter / 2, 0.14, 16]} /></mesh>
          </group>
        );
      })}
      {/* Skylten: menyn när pekaren är över den. */}
      <mesh
        position={[MENU_BOARD.at[0], MENU_BOARD.size[1] / 2, MENU_BOARD.at[1]]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setMenu(true); }}
        onPointerOut={() => setMenu(false)}
      >
        <boxGeometry args={[MENU_BOARD.footprint[0], MENU_BOARD.size[1], MENU_BOARD.footprint[1]]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {menu && (
        <Html position={[MENU_BOARD.at[0], MENU_BOARD.size[1] + 0.25, MENU_BOARD.at[1]]} center zIndexRange={[33, 0]} style={{ pointerEvents: 'none' }}>
          <TruckMenuCard />
        </Html>
      )}
    </group>
  );
}

/** Högst så många högar skräp syns per bord. */
const LITTER_SHOWN = 3;
