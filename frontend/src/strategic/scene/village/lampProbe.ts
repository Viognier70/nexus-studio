// ORDER 302c (Anders 2026-10-06) — kontrasten under gatlyktorna, mätt i spelets
// egen bild (Designs LEVERANSNOT 2026-10-06 §7: "Under gatlyktorna blir marken
// ljusare än STREET_SURFACES. Där kan kvoten sjunka under 1,8").
//
// Mätningen körs bara när skriptet ber om den (document.body.dataset.lampProbe
// = 'req', scripts/order302c-lyktor.mjs); annars gör modulen ingenting.
//   - Gatans figurer (VillageLife), byns fotgängare (OsmPedestrians) och folket
//     vid landmärkena (LandmarkGatherers) lämnar sina figurer i samma bildruta
//     som de ritas (addProbeFigures, i useFrame).
//   - Efter att bildrutan ritats (en mikrouppgift efter R3F:s gl.render, innan
//     webbläsaren visar bilden) läses dukens bildpunkter med readPixels: samma
//     bild som spelaren ser, med tonmappningen och ljuset, utan HUD:en.
//   - Därefter ritas samma bildruta en gång till utan figurerna (deras meshar
//     döljs, sedan ritas den med dem igen), och samma bildpunkter läses: det
//     är bakgrunden figuren syns mot, i samma ljus. Bildpunkter som inte
//     ändras när figuren döljs är skymda (ett hus framför) och räknas inte.
//   - Per figur: kroppen (bålens mitt och två punkter vid sidan, medianen) mot
//     bakgrunden i samma punkter, 3 × 3 bildpunkter per punkt. Därtill marken
//     runt fötterna på kamerans sida (fem punkter, utom där en annan figur
//     står), som en andra jämförelse (ringRatio). Luminansen är WCAG:s relativa
//     luminans ur bildpunktens sRGB, kvoten (ljusa + 0,05) / (mörka + 0,05) som
//     guestGroups.ts lum och checkGroupsAgainstStreet.
//   - Närmaste lykta och hur tänd den är (StreetLamps.tsx lampLive).
// Utfallet skrivs till document.body.dataset.lampProbeResult (JSON).

import * as THREE from 'three';
import type { GuestGroupId } from '../guestGroups';
import { lampLive } from './StreetLamps';

export interface ProbeFigure {
  src: 'life' | 'peds' | 'gatherers';
  group: GuestGroupId | null;
  variant: number;
  /** Kroppens färg som den sattes på instansen. */
  colour: string;
  x: number;
  z: number;
  /** Bålens mitt över marken, meter (med figurens förstoring). */
  bodyY: number;
  /** Bålens halva bredd, meter (med förstoringen). */
  halfW: number;
  /** Figurens förstoring (avståndet till marken runt fötterna räknas ur den). */
  scale: number;
}

let collected: ProbeFigure[] = [];
let hide: THREE.Object3D[] = [];
let sceneRef: THREE.Scene | null = null;
let scheduled = false;

export function lampProbeRequested(): boolean {
  return typeof document !== 'undefined' && document.body.dataset.lampProbe === 'req';
}

function srgbToLin(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lumAt(px: Uint8Array, W: number, H: number, x: number, y: number): number | null {
  const cx = Math.round(x), cy = Math.round(y);
  if (cx < 1 || cy < 1 || cx >= W - 1 || cy >= H - 1) return null;
  let r = 0, g = 0, b = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = ((cy + dy) * W + (cx + dx)) * 4;
    r += px[i]; g += px[i + 1]; b += px[i + 2];
  }
  return 0.2126 * srgbToLin(r / 9) + 0.7152 * srgbToLin(g / 9) + 0.0722 * srgbToLin(b / 9);
}
const median = (a: number[]) => { const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Lämnar figurer till mätningen i den här bildrutan (bara när den är begärd). */
export function addProbeFigures(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, figs: ProbeFigure[], meshes: (THREE.Object3D | null | undefined)[]): void {
  if (!lampProbeRequested()) return;
  collected.push(...figs);
  for (const m of meshes) if (m) hide.push(m);
  sceneRef = scene;
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const all = collected;
    const meshes = hide;
    const scene = sceneRef;
    collected = [];
    hide = [];
    if (!lampProbeRequested() || !scene) return;
    try { document.body.dataset.lampProbeResult = JSON.stringify(measure(gl, scene, camera, all, meshes)); } catch (e) { document.body.dataset.lampProbeResult = JSON.stringify({ error: String(e) }); }
    document.body.dataset.lampProbe = 'done';
  });
}

function measure(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, figs: ProbeFigure[], meshes: THREE.Object3D[]) {
  const ctx = renderer.getContext();
  const W = ctx.drawingBufferWidth, H = ctx.drawingBufferHeight;
  const read = () => { const b = new Uint8Array(W * H * 4); renderer.setRenderTarget(null); ctx.readPixels(0, 0, W, H, ctx.RGBA, ctx.UNSIGNED_BYTE, b); return b; };
  const px = read();
  // Samma bildruta utan figurerna: bakgrunden i samma punkter.
  const was = meshes.map((m) => m.visible);
  meshes.forEach((m) => { m.visible = false; });
  renderer.render(scene, camera);
  const bg = read();
  meshes.forEach((m, i) => { m.visible = was[i]; });
  renderer.render(scene, camera);
  const same = (x: number, y: number) => {
    const cx = Math.round(x), cy = Math.round(y);
    const i = (cy * W + cx) * 4;
    return Math.abs(px[i] - bg[i]) + Math.abs(px[i + 1] - bg[i + 1]) + Math.abs(px[i + 2] - bg[i + 2]) <= 3;
  };
  camera.updateMatrixWorld();
  const v = new THREE.Vector3();
  const toPx = (x: number, y: number, z: number): [number, number] | null => {
    v.set(x, y, z).project(camera);
    if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return null;
    return [((v.x + 1) / 2) * W, ((v.y + 1) / 2) * H];
  };
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const rows: unknown[] = [];
  for (const f of figs) {
    // Kamerans riktning i marknivå (mot kameran) och sidled.
    let cx = camPos.x - f.x, cz = camPos.z - f.z;
    const cl = Math.hypot(cx, cz) || 1;
    cx /= cl; cz /= cl;
    const sx = -cz, sz = cx;
    const centre = toPx(f.x, f.bodyY, f.z);
    if (!centre) continue;
    const bodyL: number[] = [];
    const backL: number[] = [];
    let hidden = 0;
    for (const o of [0, -0.55, 0.55]) {
      const p = toPx(f.x + sx * f.halfW * o, f.bodyY, f.z + sz * f.halfW * o);
      const l = p ? lumAt(px, W, H, p[0], p[1]) : null;
      const b = p ? lumAt(bg, W, H, p[0], p[1]) : null;
      if (l === null || b === null) continue;
      if (same(p![0], p![1])) { hidden++; continue; }
      bodyL.push(l);
      backL.push(b);
    }
    // Marken på kamerans sida (den bakom figuren skyms av den), 0,8 m ut med förstoringen.
    const ringR = 0.8 * f.scale;
    const groundL: number[] = [];
    for (const a of [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2]) {
      const dx = cx * Math.cos(a) - cz * Math.sin(a), dz = cx * Math.sin(a) + cz * Math.cos(a);
      const gx = f.x + dx * ringR, gz = f.z + dz * ringR;
      let blocked = false;
      for (const o of figs) {
        if (o === f) continue;
        if (Math.hypot(o.x - gx, o.z - gz) < 0.6 * Math.max(o.scale, f.scale)) { blocked = true; break; }
      }
      if (blocked) continue;
      const p = toPx(gx, 0.02, gz);
      const l = p ? lumAt(px, W, H, p[0], p[1]) : null;
      if (l !== null) groundL.push(l);
    }
    if (bodyL.length < 2) continue;
    const lb = median(bodyL), lk = median(backL);
    const lg = groundL.length >= 2 ? median(groundL) : null;
    // Närmaste lykta och hur tänd den är (0..1).
    let lampM = Infinity, lampK = 0;
    for (let i = 0; i < lampLive.pos.length; i++) {
      const d = Math.hypot(lampLive.pos[i][0] - f.x, lampLive.pos[i][1] - f.z);
      if (d < lampM) { lampM = d; lampK = lampLive.k[i] ?? 0; }
    }
    rows.push({
      src: f.src, group: f.group, variant: f.variant, colour: f.colour,
      x: +f.x.toFixed(2), z: +f.z.toFixed(2),
      screen: [+(centre[0] / W).toFixed(3), +(1 - centre[1] / H).toFixed(3)],
      lampM: Number.isFinite(lampM) ? +lampM.toFixed(2) : null, lampK: +lampK.toFixed(2),
      bodyL: +lb.toFixed(4), backL: +lk.toFixed(4), hiddenPoints: hidden,
      ratio: +((Math.max(lb, lk) + 0.05) / (Math.min(lb, lk) + 0.05)).toFixed(3),
      bodyBrighter: lb > lk,
      groundL: lg === null ? null : +lg.toFixed(4), groundN: groundL.length,
      ringRatio: lg === null ? null : +((Math.max(lb, lg) + 0.05) / (Math.min(lb, lg) + 0.05)).toFixed(3)
    });
  }
  return { w: W, h: H, figures: figs.length, rows };
}
