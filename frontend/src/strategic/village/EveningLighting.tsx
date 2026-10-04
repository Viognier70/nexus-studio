// ORDER 297 — kvällens ljus ur Designs leverans Byn i kvällsljus
// (village/villageEvening.ts SKY, LEVELS.light, VILLAGE_LIGHT; byKvall.js
// update): egen himmel i fyra faser efter kvällens gång e. Ersätter solen
// (SunLightRig) under servicen och kvällen.
//   - bakgrunden och dimman (dimman följer kamerans avstånd, som i leveransen);
//   - halvklotets ljus (himlens och markens färg) och månen, med skugga som
//     följer kameran (upp till 420 m bort);
//   - exponeringen, höjd med ljusnivån (VILLAGE_LIGHT.exposurePerLevel);
//   - nivåns förstärkning (LEVELS.light, logaritmiskt på avståndet) gånger
//     spelarens ljusnivå.
// Nattvärdet till skyState (gatlyktor, fönster och krogarnas sken som läser
// det) följer skymningen: från e = 0 till blå timmen.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { useCamera } from '../camera/CameraContext';
import { writeSkyState } from '../../lib/lighting/skyState';
import { LEVELS, PHASES, SKY, VILLAGE_LIGHT, type SkyKey } from './villageEvening';
import { subscribeVillageLight, villageLightLevel } from './villageLight';

// Spelets material är ljusare än Designs (Designs mark #3a4434, gator #4f4030,
// bruna väggar), och Designs ljusvärden är satta mot deras palett. Faktorn per
// nivå för spelets palett är uppmätt mot Designs kontrollbilder kl. 19.30 i
// 1440 × 900 (scripts/luminance.mjs, bildens mitt; reports/order297/ljus-*.json):
// byn 0,25, kvarteret 0,29, gatan 0,59. På krogens nivå styr teaterns egna ljus
// rummet; den får gatans faktor. Under kalibreringen kan en fast faktor sättas
// i webbläsaren (nexus.eveningPaletteScale).
const PALETTE_BY_LEVEL: Record<string, number> = { village: 0.25, block: 0.29, street: 0.59, venue: 0.59 };
function paletteOverride(): number | null {
  try {
    const v = Number(localStorage.getItem('nexus.eveningPaletteScale'));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
const PALETTE_OVERRIDE = paletteOverride();

/** Spelets palettfaktor på ett avstånd (logaritmiskt mellan nivåerna, som LEVELS.light). */
export function paletteScale(d: number): number {
  if (PALETTE_OVERRIDE !== null) return PALETTE_OVERRIDE;
  const L = LEVELS;
  const at = (i: number) => PALETTE_BY_LEVEL[L[i].id];
  if (d >= L[0].dist) return at(0);
  if (d <= L[L.length - 1].dist) return at(L.length - 1);
  let i = 0;
  while (i < L.length - 2 && d < L[i + 1].dist) i++;
  const k = clamp(Math.log(L[i].dist / d) / Math.log(L[i].dist / L[i + 1].dist), 0, 1);
  return lerp(at(i), at(i + 1), k);
}

const SHADOW_MAP = 2048;
const MOON_SHADOW_MAX_M = 420;
const BLUE_HOUR = PHASES.find((p) => p.id === 'blue')!.from;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export interface SkyNow { bg: THREE.Color; hemiSky: THREE.Color; hemiGround: THREE.Color; lake: THREE.Color; moon: THREE.Color; hemi: number; moonI: number; exposure: number }

/** Himlen vid e, interpolerad mellan nycklarna (byKvall.js skyAt). */
export function skyAt(e: number, keys: SkyKey[] = SKY): SkyNow {
  let i = 0;
  while (i < keys.length - 2 && e > keys[i + 1].e) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const k = clamp((e - a.e) / (b.e - a.e), 0, 1);
  const c = (p: 'bg' | 'hemiSky' | 'hemiGround' | 'lake' | 'moon') => new THREE.Color(a[p]).lerp(new THREE.Color(b[p]), k);
  return { bg: c('bg'), hemiSky: c('hemiSky'), hemiGround: c('hemiGround'), lake: c('lake'), moon: c('moon'), hemi: lerp(a.hemi, b.hemi, k), moonI: lerp(a.moonI, b.moonI, k), exposure: lerp(a.exposure, b.exposure, k) };
}

/** Nivåns ljusförstärkning på ett avstånd (logaritmiskt mellan nivåerna). */
export function levelLight(d: number): number {
  const L = LEVELS;
  if (d >= L[0].dist) return L[0].light;
  if (d <= L[L.length - 1].dist) return L[L.length - 1].light;
  let i = 0;
  while (i < L.length - 2 && d < L[i + 1].dist) i++;
  const k = clamp(Math.log(L[i].dist / d) / Math.log(L[i].dist / L[i + 1].dist), 0, 1);
  return lerp(L[i].light, L[i + 1].light, k);
}

/** Nattvärdet för skyState: 0 i början av skymningen, 1 från blå timmen. */
export function nightFromEvening(e: number): number {
  const t = clamp(e / BLUE_HOUR, 0, 1);
  return t * t * (3 - 2 * t);
}

export function EveningLighting({ e }: { e: number }) {
  const { scene, gl } = useThree();
  const { actualRef } = useCamera();
  const level = useSyncExternalStore(subscribeVillageLight, villageLightLevel, villageLightLevel);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const sky = useMemo(() => skyAt(e), [e]);
  const fog = useMemo(() => new THREE.Fog(sky.bg.getHex(), 1000, 3600), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Nattvärdet till gatlyktorna, fönstren och krogarnas sken.
  writeSkyState(3 - 6 * nightFromEvening(e));

  useEffect(() => {
    const prevBg = scene.background;
    const prevFog = scene.fog;
    const prevExposure = gl.toneMappingExposure;
    scene.fog = fog;
    return () => { scene.background = prevBg; scene.fog = prevFog; gl.toneMappingExposure = prevExposure; };
  }, [scene, gl, fog]);

  useFrame(() => {
    const d = actualRef.current.distance;
    const focus = actualRef.current.focus;
    const LL = level * levelLight(d) * paletteScale(d);
    scene.background = sky.bg;
    fog.color.copy(sky.bg);
    fog.near = d * 1.3;
    fog.far = d * 2.6 + 160;
    gl.toneMappingExposure = sky.exposure * (1 + VILLAGE_LIGHT.exposurePerLevel * (level - 1));
    const h = hemi.current;
    if (h) { h.color.copy(sky.hemiSky); h.groundColor.copy(sky.hemiGround); h.intensity = sky.hemi * LL; }
    const m = moon.current;
    if (m) {
      m.color.copy(sky.moon);
      m.intensity = sky.moonI * (0.5 + 0.5 * LL);
      // Månens skugga följer kameran, så att skuggan är skarp på varje nivå.
      const R = clamp(d * 0.95, 30, MOON_SHADOW_MAX_M);
      const ss = Math.max(1, R / 140);
      target.position.set(focus.x, 0, focus.z);
      target.updateMatrixWorld();
      m.position.set(focus.x - 40 * ss, 90 * ss, focus.z + 60 * ss);
      m.target = target;
      const sc = m.shadow.camera;
      if (sc.right !== R) { sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = 320 * ss; sc.updateProjectionMatrix(); }
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[sky.hemiSky, sky.hemiGround, sky.hemi]} />
      <directionalLight ref={moon} castShadow shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]} shadow-bias={-0.0004} shadow-normalBias={0.04} />
      <primitive object={target} />
    </>
  );
}
