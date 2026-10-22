// ORDER 334 C — lokalernas egna rum (Anders 2026-10-22: "D15:s egna interiörer: källaren med tegelvalv (i gatuplan går
// bra), salongen med kakelugn och soffgrupp, glashörnet med glasat sydostläge. Olika storlek och rymd enligt D15. Valet
// ska synas i rummet."). Designs D15 kvarterRita.js buildVenue och kvarterPlatser.js VENUES är förlagan.
//
// Vinbarens möblering (wineBarRoom.ts: 20 platser, köket, baren, gånggrafen) står kvar i alla lokaler, eftersom
// simuleringens platser och figurernas vägar läser den. Lokalens rum byggs runt och i den, i rummets lokala ram:
//   - Källaren (14,7 × 9,8 m, D15 i tak 2,35 m): tegel och sten, tegelvalv som springer vid 2,35 m (två tunnor längs
//     rummet och två gördelbågar), pelarna som murpelare mot långväggarna där möblerna lämnar plats (D15:s tre pelare
//     mitt i rummet står där baren står), fönsterbrunnarna högt upp i norra muren.
//   - Salongen (28,9 × 10,2 m, 4,2 m): vinbaren i östra änden, en öppning i dess västra vägg, och D15:s salong i den
//     västra: parkett, mörkgröna väggar, kakelugnen mot gaveln, soffgruppen framför, ljuskronorna och de höga fönstren.
//   - Flygeln (cirka 270 m², 3,6 m): vinbaren i det sydöstra hörnet med glas från golv till tak i söder och öster,
//     resten av flygeln norr om det, fönsterbänken med pallar längs östra glaset, betonggolv och pendlar.
// Kakelugnen, soffgruppen och pallarna vid fönsterbänken är rekvisita, inte platser: platserna är vinbarens 20.
//
// Synligt på krogens nivå (Z, väggarna kapade och taket borta): golvet, väggarnas färg, rummets form och storlek,
// glaset, murpelarna, kakelugnen, soffgruppen och fönsterbänken. Valven, ljuskronorna och pendlarna tonar ut med taket
// som i D15 (applyPremisesCeiling, roofBlend.ts roofAt).
import * as THREE from 'three';
import type { PremisesId } from '../../sim/districts';
import { PREMISES_FRAMES } from '../content/premises';
import { CUT_H, PLINTH_M, type WallSide, type WineBarRoom } from './wineBarRoom';
import { SALON } from './tablePlans';

export type VenueId = Exclude<PremisesId, 'torget'>;
type V2 = [number, number];

/** Rummets väggar, golv och höjd per lokal (D15: källarens sten och tegel, salongens mörkgröna panel och parkett,
 *  Flygelns tegel och betong). heightM är väggarnas höjd: i källaren valvens hjässa, i de andra D15:s ceilingM. */
export const PREMISES_LOOK: Record<VenueId, { wall: string; wallCap: string; floor: string; heightM: number }> = {
  kallaren: { wall: '#7b4e3a', wallCap: '#5b392a', floor: '#6b655b', heightM: 3.4 },
  salongen: { wall: '#34463a', wallCap: '#26332b', floor: '#8a5a36', heightM: 4.2 },
  glashornet: { wall: '#7d4f3c', wallCap: '#5d3a2c', floor: '#8c8a84', heightM: 3.6 }
};

const BRICK = '#8a5640';
const GLASS = '#a9c4cf';
const MULLION = '#2b2e30';
const GLOW = '#ffe2ad';
const WALL_EXT_T = 0.3;
/** Källarens murpelare mot långväggarna i rummets lokala x (fria väggbitar mellan köket, loungerna, tvåorna och DJ:n). */
export const CELLAR_PIERS_X = [-3.9, 2.95] as const;
export const CELLAR_PIER = { w: 0.5, d: 0.3 } as const;
/** Valven springer vid D15:s takhöjd (2,35 m) och når väggarnas höjd i hjässan. */
export const CELLAR_VAULT_SPRING_M = 2.35;

export interface PremisesInterior {
  id: VenueId;
  /** Golvet, väggarna och rekvisitan (rummets lokala ram). */
  group: THREE.Group;
  /** Valven, ljuskronorna och pendlarna: tonar ut med taket. */
  ceiling: THREE.Group;
  dispose: () => void;
}

/** Bygger lokalens rum i vinbarens rum. toLocal: en punkt i lokalens ram (content/premises.ts) till rummets lokala ram. */
export function applyPremisesInterior(room: WineBarRoom, id: VenueId, toLocal: (p: readonly [number, number]) => V2): PremisesInterior {
  const f = PREMISES_FRAMES[id];
  const look = PREMISES_LOOK[id];
  const halfW = room.width / 2, halfD = room.depth / 2, H = look.heightM;
  const mats: THREE.Material[] = [];
  const geos: THREE.BufferGeometry[] = [];
  const mat = (c: string, rough = 0.9, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, ...extra }); mats.push(m); return m; };
  const group = new THREE.Group(); group.name = 'premisesInterior'; group.userData.premises = id;
  const ceiling = new THREE.Group(); ceiling.name = 'premisesCeiling';
  room.group.add(group); room.group.add(ceiling);

  function box(parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, name: string, ry = 0): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d); geos.push(g);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.name = name;
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cyl(parent: THREE.Object3D, r0: number, r1: number, h: number, m: THREE.Material, x: number, y: number, z: number, name: string, seg = 16): THREE.Mesh {
    const g = new THREE.CylinderGeometry(r0, r1, h, seg); geos.push(g);
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  // En punkt och en riktning i lokalens ram, i rummets.
  const L = (x: number, z: number) => toLocal([x, z]);
  const dirOf = (dx: number, dz: number): V2 => { const a = L(f.offsetX, f.offsetZ), b = L(f.offsetX + dx, f.offsetZ + dz); return [b[0] - a[0], b[1] - a[1]]; };
  const sideOf = (n: V2): WallSide => (Math.abs(n[0]) >= Math.abs(n[1]) ? (n[0] > 0 ? 'E' : 'W') : (n[1] > 0 ? 'N' : 'S'));
  const centre: V2 = (() => { const p = f.poly ?? [[f.room.x0, f.room.z0], [f.room.x1, f.room.z0], [f.room.x1, f.room.z1], [f.room.x0, f.room.z1]]; const q = p.map((v) => L(v[0], v[1])); return [q.reduce((a, v) => a + v[0], 0) / q.length, q.reduce((a, v) => a + v[1], 0) / q.length]; })();

  // ── Väggarnas och golvets färg ──
  const recolour = (name: string, c: string) => room.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.name === name) (m.material as THREE.MeshStandardMaterial).color.set(c); });
  recolour('wallNLower0', look.wall);
  recolour('wallNCap0', look.wallCap);
  recolour('floorMain', look.floor);

  // ── Golvet över hela D15-rummet (strax under vinbarens golv) ──
  const outline: V2[] = (f.poly ?? [[f.room.x0, f.room.z0], [f.room.x1, f.room.z0], [f.room.x1, f.room.z1], [f.room.x0, f.room.z1]]).map((v) => L(v[0], v[1]));
  {
    const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(shape); geos.push(g);
    const floor = new THREE.Mesh(g, mat(look.floor, 0.85)); floor.rotation.x = -Math.PI / 2; floor.position.y = PLINTH_M - 0.004; floor.name = 'premisesFloor'; floor.receiveShadow = true;
    group.add(floor);
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), mat('#6d6a5f')); geos.push(slab.geometry);
    slab.rotation.x = -Math.PI / 2; slab.position.y = 0; slab.name = 'premisesSlab'; slab.receiveShadow = true; group.add(slab);
  }

  // ── En vägg mellan två punkter (rummets lokala ram), utåt från rummets mitt. Kapas som vinbarens: sockeln och
  //    listen står kvar, överdelen läggs i wallUpper[sida] och döljs när kameran står på den sidan (updateCutaway). ──
  const lowerGroup = new THREE.Group(); lowerGroup.name = 'premisesWalls'; room.parts.walls.add(lowerGroup);
  const glassGroup = new THREE.Group(); glassGroup.name = 'premisesGlass'; group.add(glassGroup);
  function wallBetween(a: V2, b: V2, m: THREE.Material, opts: { glass?: boolean; name: string; windows?: { u: number; w: number; y0: number; y1: number }[] }) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 0.05) return;
    let nx = -dz / len, nz = dx / len;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if ((mx - centre[0]) * nx + (mz - centre[1]) * nz < 0) { nx = -nx; nz = -nz; }
    const cx = mx + nx * WALL_EXT_T / 2, cz = mz + nz * WALL_EXT_T / 2, ry = -Math.atan2(dz, dx);
    if (opts.glass) {
      const g = box(glassGroup, len, H - 0.1, 0.06, glassMat(), cx, 0.1 + (H - 0.1) / 2, cz, opts.name, ry);
      g.castShadow = false;
      const n = Math.max(1, Math.round(len / 1.5));
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        box(glassGroup, 0.07, H - 0.1, 0.1, mullionMat(), a[0] + dx * u + nx * WALL_EXT_T / 2, 0.1 + (H - 0.1) / 2, a[1] + dz * u + nz * WALL_EXT_T / 2, `${opts.name}Mullion${i}`, ry);
      }
      box(glassGroup, len, 0.12, 0.12, mullionMat(), cx, H, cz, `${opts.name}Head`, ry);
      return;
    }
    const side = sideOf([nx, nz]);
    box(lowerGroup, len, CUT_H, WALL_EXT_T, m, cx, 0.1 + CUT_H / 2, cz, `${opts.name}Lower`, ry);
    box(lowerGroup, len, 0.03, WALL_EXT_T, capMat(), cx, 0.1 + CUT_H + 0.015, cz, `${opts.name}Cap`, ry);
    box(room.parts.wallUpper[side], len, H - CUT_H, WALL_EXT_T, m, cx, 0.1 + CUT_H + (H - CUT_H) / 2, cz, `${opts.name}Upper`, ry);
    for (const [i, w] of (opts.windows ?? []).entries()) {
      const px = a[0] + (dx / len) * w.u, pz = a[1] + (dz / len) * w.u;
      box(room.parts.wallUpper[side], w.w, w.y1 - w.y0, 0.04, glowMat(), px + nx * (WALL_EXT_T + 0.03), (w.y0 + w.y1) / 2, pz + nz * (WALL_EXT_T + 0.03), `${opts.name}Window${i}`, ry);
    }
  }
  let _glass: THREE.Material | null = null, _mull: THREE.Material | null = null, _glow: THREE.Material | null = null, _cap: THREE.Material | null = null, _ext: THREE.Material | null = null;
  const glassMat = () => (_glass ??= mat(GLASS, 0.1, { metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }));
  const mullionMat = () => (_mull ??= mat(MULLION, 0.6, { metalness: 0.3 }));
  const glowMat = () => (_glow ??= mat(GLOW, 0.4, { emissive: new THREE.Color('#ffbe6a'), emissiveIntensity: 0.9 }));
  const capMat = () => (_cap ??= mat(look.wallCap));
  const wallMat = () => (_ext ??= mat(look.wall));

  // Taket över det som ligger utanför vinbarens rum (rummets eget tak täcker resten); tonar som vinbarens tak.
  function roofOver(pts: V2[]) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }); geos.push(g);
    const m = new THREE.Mesh(g, mat('#5c5951')); m.rotation.x = -Math.PI / 2; m.position.y = H + 0.1 + 0.01; m.name = 'premisesRoof';
    room.parts.roof.add(m);
  }

  // Vinbarens sida mot en riktning i lokalens ram.
  const boxSide = (dx: number, dz: number): WallSide => sideOf(dirOf(dx, dz));
  // Byt material på en av vinbarens väggar (alla delar: sockeln, listen och överdelen).
  function retexture(side: WallSide, m: THREE.Material) {
    room.parts.walls.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh && mesh.name.startsWith('wall' + side)) { mesh.material = m; mesh.castShadow = false; } });
  }

  if (id === 'kallaren') buildCellar(); else if (id === 'salongen') buildSalon(); else buildGlass();

  // ── Källaren ──
  function buildCellar() {
    const brick = mat(BRICK, 0.92);
    // Murpelarna mot långväggarna, från golvet till valvens fot.
    for (const x of CELLAR_PIERS_X) for (const s of [-1, 1]) {
      box(group, CELLAR_PIER.w, CELLAR_VAULT_SPRING_M, CELLAR_PIER.d, brick, x, 0.1 + CELLAR_VAULT_SPRING_M / 2, s * (halfD - 0.2 - CELLAR_PIER.d / 2), `cellarPier${x}${s}`);
    }
    // Valven: två tunnor längs rummet över var sin halva, och gördelbågarna över pelarna.
    const vm = mat(BRICK, 0.9, { side: THREE.DoubleSide, transparent: true });
    const r = (halfD - 0.2) / 2, rise = H - CELLAR_VAULT_SPRING_M;
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(r, r, 2 * (halfW - 0.2), 20, 1, true, 0, Math.PI); geos.push(g);
      const v = new THREE.Mesh(g, vm); v.rotation.z = Math.PI / 2; v.scale.set(rise / r, 1, 1);
      v.position.set(0, 0.1 + CELLAR_VAULT_SPRING_M, s * r); v.name = `cellarVault${s}`; ceiling.add(v);
    }
    for (const x of CELLAR_PIERS_X) for (const s of [-1, 1]) {
      const g = new THREE.TorusGeometry(r, 0.14, 6, 16, Math.PI); geos.push(g);
      const arch = new THREE.Mesh(g, vm); arch.rotation.y = Math.PI / 2; arch.scale.set(1, rise / r, 1);
      arch.position.set(x, 0.1 + CELLAR_VAULT_SPRING_M, s * r); arch.name = `cellarArch${x}${s}`; ceiling.add(arch);
    }
    // Glödlampor i valven.
    const bulb = mat(GLOW, 0.4, { emissive: new THREE.Color('#ffb040'), emissiveIntensity: 1.8, transparent: true });
    for (const x of [-5.8, -1.8, 2.2, 5.6]) for (const s of [-1, 1]) cyl(ceiling, 0.05, 0.05, 0.12, bulb, x, H - 0.3, s * r, `cellarBulb${x}${s}`, 8);
    // ORDER 334 A — AW-skylten: en trottoarpratare utanför dörren de kvällar AW är vald (setAfterWorkSign), på andra
    // sidan dörren från kön ute (wineBarHouse.ts QUEUE_SPOTS queueOut, z ≤ 0,1). Ingen text, som i D15.
    const aw = new THREE.Group(); aw.name = 'afterWorkSign'; aw.visible = false; aw.position.set(halfW + 0.65, 0, 1.9); group.add(aw);
    const board = mat('#262624', 0.8), frame = mat('#b89a6a', 0.7), chalk = mat('#e9e3d6', 0.9, { emissive: new THREE.Color('#fff2d8'), emissiveIntensity: 0.25 });
    for (const sgn of [-1, 1]) {
      const leaf = new THREE.Group(); leaf.position.set(sgn * 0.17, 0, 0); leaf.rotation.z = sgn * 0.19; aw.add(leaf);
      box(leaf, 0.04, 0.95, 0.62, frame, 0, 0.48, 0, `afterWorkFrame${sgn}`);
      box(leaf, 0.05, 0.78, 0.5, board, sgn * 0.005, 0.5, 0, `afterWorkBoard${sgn}`);
      for (const [i, y] of [0.72, 0.6, 0.46].entries()) box(leaf, 0.055, 0.035, 0.36 - i * 0.08, chalk, sgn * 0.006, y, 0, `afterWorkChalk${sgn}${i}`);
    }
    // Fönsterbrunnarna högt upp i norra muren (D15 windows: x −6,4, −4,0, −1,6, 1,0 × 0,5 m vid 1,75 m).
    const north = boxSide(0, -1);
    const nz = north === 'N' ? halfD : north === 'S' ? -halfD : 0;
    if (nz !== 0) for (const [i, x] of [-6.4, -4.0, -1.6].entries()) {
      const p = L(x, f.offsetZ - 5); const lx = Math.max(-halfW + 0.6, Math.min(halfW - 0.6, p[0]));
      box(room.parts.wallUpper[north], 1.0, 0.5, 0.04, glowMat(), lx, 1.75 + 0.25, nz + Math.sign(nz) * 0.03, `cellarWindowWell${i}`);
    }
  }

  // ── Salongen ──
  function buildSalon() {
    const R = f.room, t = 0.3;
    const dX = dirOf(1, 0), rX = -Math.atan2(dX[1], dX[0]);
    const boxWest = f.offsetX - (halfW + 0.02);
    // Vinbarens västra vägg blir en mellanvägg med en öppning mot salongen (z −1,4…1,4, mellan förrådet och köket).
    const west = boxSide(-1, 0);
    const old = room.parts.walls.getObjectByName('wall' + west);
    if (old) old.visible = false;
    const part = new THREE.Group(); part.name = 'salonPartition'; room.parts.walls.add(part);
    const up = new THREE.Group(); up.name = 'salonPartitionUpper'; part.add(up);
    const wx = west === 'W' ? -halfW + 0.1 : halfW - 0.1;
    for (const [z0, z1] of [[-halfD, -1.4], [1.4, halfD]] as const) {
      box(part, 0.2, CUT_H, z1 - z0, wallMat(), wx, 0.1 + CUT_H / 2, (z0 + z1) / 2, `salonPartLower${z0}`);
      box(part, 0.2, 0.03, z1 - z0, capMat(), wx, 0.1 + CUT_H + 0.015, (z0 + z1) / 2, `salonPartCap${z0}`);
      box(up, 0.2, H - CUT_H, z1 - z0, wallMat(), wx, 0.1 + CUT_H + (H - CUT_H) / 2, (z0 + z1) / 2, `salonPartUpper${z0}`);
    }
    box(up, 0.2, H - 2.6, 2.8, wallMat(), wx, 0.1 + 2.6 + (H - 2.6) / 2, 0, 'salonPartLintel');
    room.parts.wallUpper[west] = up;
    // Salongens ytterväggar runt den västra delen, med de höga fönstren (D15 windows y 0,75…3,35).
    const tall = (xs: number[], from: number) => xs.map((x) => ({ u: Math.abs(x - from), w: 1.1, y0: 0.85, y1: 3.45 }));
    wallBetween(L(R.x0, R.z1), L(boxWest, R.z1), wallMat(), { name: 'salonNorth', windows: tall([-12.6, -10.0, -5.2], R.x0) });
    wallBetween(L(R.x0, R.z0), L(boxWest, R.z0), wallMat(), { name: 'salonSouth', windows: tall([-12.6, -10.0, -5.2], R.x0) });
    wallBetween(L(R.x0, R.z0), L(R.x0, R.z1), wallMat(), { name: 'salonWest' });
    roofOver([L(R.x0 - t, R.z0 - t), L(boxWest, R.z0 - t), L(boxWest, R.z1 + t), L(R.x0 - t, R.z1 + t)]);
    // Kakelugnen mot västra gaveln (D15: vita kakel, mässingskrönet och luckan), och soffgruppen framför den.
    const ku = mat('#ebe4d4', 0.45), brass = mat('#b88a3e', 0.4, { metalness: 0.6 });
    // ORDER 335 D — soffgruppen och de runda borden är platser i rummets plan (tablePlans.ts SALON, wineBarRoom.ts);
    // här står kakelugnen, mattan och det låga bordet, på samma punkter i rummets lokala ram.
    const k = SALON.stove;
    cyl(group, 0.42, 0.48, 2.9, ku, k[0], 0.1 + 1.45, k[1], 'salonStove', 14);
    cyl(group, 0.5, 0.5, 0.12, brass, k[0], 0.1 + 2.96, k[1], 'salonStoveCrown', 14);
    box(group, 0.06, 0.38, 0.32, mat('#1f1d1b', 0.6, { metalness: 0.4 }), k[0] + 0.43, 0.1 + 0.55, k[1], 'salonStoveDoor', rX);
    const wood = mat('#4a3324', 0.7), rug = mat('#7c4b38', 0.95);
    box(group, SALON.rug.w, 0.01, SALON.rug.d, rug, SALON.rug.at[0], PLINTH_M + 0.003, SALON.rug.at[1], 'salonRug', rX);
    box(group, SALON.lowTable.w, 0.42, SALON.lowTable.d, wood, SALON.lowTable.at[0], 0.1 + 0.21, SALON.lowTable.at[1], 'salonLowTable', rX);
    // Ljuskronorna (tonar ut med taket).
    const cm = mat('#f6efd8', 0.3, { emissive: new THREE.Color('#ffd58f'), emissiveIntensity: 1.2, transparent: true });
    const bm = mat('#b88a3e', 0.4, { metalness: 0.6, transparent: true });
    for (const x of [-9.0, -2.0]) {
      const c = L(x, 0);
      const g = new THREE.TorusGeometry(0.45, 0.025, 6, 20); geos.push(g);
      const ring = new THREE.Mesh(g, bm); ring.rotation.x = Math.PI / 2; ring.position.set(c[0], H - 1.0, c[1]); ring.name = `salonChandelier${x}`; ceiling.add(ring);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(ceiling, 0.035, 0.035, 0.12, cm, c[0] + Math.cos(a) * 0.45, H - 0.92, c[1] + Math.sin(a) * 0.45, `salonCandle${x}${i}`, 6); }
      cyl(ceiling, 0.01, 0.01, 1.0, bm, c[0], H - 0.5, c[1], `salonChandelierCord${x}`, 4);
    }
  }

  // ── Flygeln ──
  function buildGlass() {
    const poly = f.poly!, t = 0.3;
    const bx0 = f.offsetX - (halfW + 0.02), bx1 = f.offsetX + (halfW + 0.02), bz1 = f.offsetZ + (halfD + 0.02);
    // Vinbarens östra och södra vägg blir glas (D15 glass edges 1 och 2, sydostläget).
    const glassM = glassMat();
    for (const side of [boxSide(1, 0), boxSide(0, -1)]) {
      retexture(side, glassM);
      // Spröjsarna längs sidan, inte i dörren (z −0,8…0,8 i östra väggen).
      const alongX = side === 'N' || side === 'S';
      const fixed = side === 'E' ? halfW - 0.1 : side === 'W' ? -halfW + 0.1 : side === 'N' ? halfD - 0.1 : -halfD + 0.1;
      const span = alongX ? halfW : halfD;
      const grp = room.parts.walls.getObjectByName('wall' + side) ?? room.parts.walls;
      for (let u = -span + 0.05; u <= span; u += 1.5) {
        if (side === 'E' && Math.abs(u) < 0.85) continue;
        box(grp, 0.07, H - 0.1, 0.1, mullionMat(), alongX ? u : fixed, 0.1 + (H - 0.1) / 2, alongX ? fixed : u, `glassMullion${side}${u.toFixed(1)}`);
      }
    }
    // Resten av flygeln: glas i söder (väster om rummet) och öster (norr om rummet), tegel i norr och mot Kärnhuset.
    wallBetween(L(poly[1][0], poly[1][1]), L(bx0, poly[1][1]), glassM, { glass: true, name: 'wingSouthGlass' });
    wallBetween(L(poly[2][0], bz1), L(poly[3][0], poly[3][1]), glassM, { glass: true, name: 'wingEastGlass' });
    wallBetween(L(poly[3][0], poly[3][1]), L(poly[4][0], poly[4][1]), wallMat(), { name: 'wingNorthA' });
    wallBetween(L(poly[4][0], poly[4][1]), L(poly[0][0], poly[0][1]), wallMat(), { name: 'wingNorthB' });
    wallBetween(L(poly[0][0], poly[0][1]), L(poly[1][0], poly[1][1]), wallMat(), { name: 'wingWest' });
    roofOver([L(poly[1][0] - t, poly[1][1] - t), L(bx0, poly[1][1] - t), L(bx0, bz1), L(bx1 + t, bz1), L(poly[3][0] + t, poly[3][1] + t), L(poly[4][0], poly[4][1] + t), L(poly[0][0] - t, poly[0][1] + t)]);
    // Fönsterbänken med pallar längs östra glaset norr om rummet (D15: pallar längs glaset).
    const wood = mat('#6b5440', 0.7), seat = mat('#3d3a36', 0.8);
    const b0 = L(poly[2][0] - 0.25, bz1 + 0.6), b1 = L(poly[2][0] - 0.25, poly[3][1] - 0.5);
    const bl = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
    box(group, bl, 0.05, 0.4, wood, (b0[0] + b1[0]) / 2, 0.1 + 1.05, (b0[1] + b1[1]) / 2, 'wingBench', -Math.atan2(b1[1] - b0[1], b1[0] - b0[0]));
    const n = Math.max(2, Math.floor(bl / 1.3));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, p = L(poly[2][0] - 0.75, bz1 + 0.6 + u * (poly[3][1] - 0.5 - bz1 - 0.6));
      cyl(group, 0.2, 0.2, 0.05, seat, p[0], 0.1 + 0.75, p[1], `wingStool${i}`, 12);
      cyl(group, 0.03, 0.03, 0.75, mullionMat(), p[0], 0.1 + 0.375, p[1], `wingStoolStem${i}`, 6);
    }
    // Pendlarna (tonar ut med taket).
    const shade = mat('#2f2f2c', 0.6, { transparent: true }), bulb = mat(GLOW, 0.4, { emissive: new THREE.Color('#ffb46a'), emissiveIntensity: 1.4, transparent: true });
    for (const [x, z] of [[-4, 4.5], [0, 4.5], [4, 4.5], [-4, 7.5], [0, 7.3], [-7.35, -6], [-7.35, -1]] as const) {
      const p = L(x, z);
      cyl(ceiling, 0.008, 0.008, 1.0, shade, p[0], H - 0.5, p[1], `wingPendantCord${x}${z}`, 4);
      cyl(ceiling, 0.06, 0.22, 0.2, shade, p[0], H - 1.05, p[1], `wingPendant${x}${z}`, 12);
      cyl(ceiling, 0.05, 0.05, 0.05, bulb, p[0], H - 1.17, p[1], `wingBulb${x}${z}`, 8);
    }
  }

  const pi: PremisesInterior = {
    id, group, ceiling,
    dispose: () => { group.removeFromParent(); ceiling.removeFromParent(); mats.forEach((m) => m.dispose()); geos.forEach((g) => g.dispose()); }
  };
  room.group.userData.premisesInterior = pi;
  return pi;
}

/** ORDER 334 A — AW-skylten utanför källarens dörr de kvällar AW är vald. */
export function setAfterWorkSign(pi: PremisesInterior, on: boolean): void {
  const sign = pi.group.getObjectByName('afterWorkSign');
  if (sign && sign.visible !== on) sign.visible = on;
}

/** Valven, ljuskronorna och pendlarna tonar ut med taket (rk = roofBlend.ts roofAt: 1 på, 0 borta). */
export function applyPremisesCeiling(pi: PremisesInterior, rk: number): void {
  pi.ceiling.visible = rk > 0.01;
  pi.ceiling.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mt = m.material as THREE.MeshStandardMaterial;
    mt.opacity = rk;
    mt.depthWrite = rk > 0.95;
    m.castShadow = rk > 0.95;
  });
}

/** Lokalens punkt (content/premises.ts) i rummets lokala ram, med rummets läge i byn (layout.centre, layout.worldAngle,
 *  som BrewpubScene placerar rummet: group.position = centre, group.rotation.y = −worldAngle). */
export function premisesToRoomLocal(id: VenueId, centre: readonly [number, number], worldAngle: number): (p: readonly [number, number]) => V2 {
  const f = PREMISES_FRAMES[id];
  const c = Math.cos(f.th), s = Math.sin(f.th);
  const th = -worldAngle, ct = Math.cos(th), st = Math.sin(th);
  return (p) => {
    const wx = f.C[0] + c * p[0] - s * p[1], wz = f.C[1] + s * p[0] + c * p[1];
    const dx = wx - centre[0], dz = wz - centre[1];
    return [ct * dx - st * dz, st * dx + ct * dz];
  };
}
