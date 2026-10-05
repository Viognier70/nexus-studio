// ORDER 308 — öppningen före första morgonen (Designs D2, omtag 2026-10-04).
// Tidslinjen som rena funktioner av tiden t: vilken bild som syns, svärtan,
// raderna, nålarna, kvällen och kamerorna. En port av prototypens
// Oppningen.html (layers, villagePose, camAt, textAt, capAt, pinsAt, blackAt)
// mot spelets egna moduler:
//   - byns nivåer är spelets (camera/eveningLevels.ts levelTarget, samma
//     LEVELS och BLEND som Designs frameAt läser), så att flygturen landar
//     exakt där spelets nivåer börjar;
//   - Måltidens hus dörr räknas ur spelets karta (WORLD_RAW_BUILDINGS, samma
//     grythyttan-world.json som Designs byKarta.js) och spelets gatunät
//     (content/villageNetwork.ts), som Designs placeMentor/doorOf;
//   - vår krog är spelarens rum som interiorLayout.ts placerar det
//     (Designs sim.PV.obb).
// Manuset (oppningManus.js) är Designs fil, oförändrad.

import * as M from './oppningManus';
import type { BarCamKey, OpeningPin, OpeningText, OpeningView, VillageCamKey } from './oppningManus';
import { LEVELS } from '../village/villageEvening';
import { levelTarget } from '../camera/eveningLevels';
import { computePlayerBusinessInterior } from '../business/interiorLayout';
import { WORLD, WORLD_RAW_BUILDINGS, type Vec2Tuple } from '../content/world';
import { nearestNode, walkNetwork } from '../content/villageNetwork';
import { CAMPUS_POINT, landmarkPoint } from '../content/villagePlaces';

export type Vec2 = [number, number];
export type LayerOpacity = { village: number; empty: number; glimpse: number };

/** Öppningens längd i sekunder (manusets END). */
export const OPENING_END: number = M.END;
/** Hoppa över går efter så här många sekunder (LEVERANSNOT §3: "Hoppa över som förut, efter 3 s"). */
export const SKIP_AFTER_S = 3;
/** Första morgonen tonar upp ur svärtan på så här lång tid efter öppningen. */
export const FADE_UP_S = 1.0;
/** Den som har sett öppningen förut kan hoppa över den direkt (LEVERANSNOT 2026-10-03 §4). */
export const SEEN_KEY = 'nexus.openingSeen';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function ease(name: string | undefined, k: number): number {
  k = clamp(k, 0, 1);
  if (name === 'outCubic') return 1 - Math.pow(1 - k, 3);
  if (name === 'inOutSine') return -(Math.cos(Math.PI * k) - 1) / 2;
  return k;
}

/** Två kameralägen: avståndet logaritmiskt, vridningen den kortaste vägen. */
export function lerpPose(a: OpeningView, b: OpeningView, k: number): OpeningView {
  let dy = b.yaw - a.yaw;
  while (dy > Math.PI) dy -= 2 * Math.PI;
  while (dy < -Math.PI) dy += 2 * Math.PI;
  return {
    tx: lerp(a.tx ?? 0, b.tx ?? 0, k),
    ty: lerp(a.ty ?? 0, b.ty ?? 0, k),
    tz: lerp(a.tz ?? 0, b.tz ?? 0, k),
    pitch: lerp(a.pitch, b.pitch, k),
    fov: lerp(a.fov ?? 34, b.fov ?? 34, k),
    dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), k)),
    yaw: a.yaw + dy * k
  };
}

/** Ett värde ur en nyckellista ({ t, [key] }), linjärt mellan nycklarna. */
export function track<K extends string>(list: Array<{ t: number } & Record<K, number>>, t: number, key: K): number {
  if (t <= list[0].t) return list[0][key];
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (t < b.t) return a[key] + (b[key] - a[key]) * (t - a.t) / (b.t - a.t);
  }
  return list[list.length - 1][key];
}

// ---------- bilderna ----------

/** Vilken bild som gäller vid t (manusets SHOTS). */
export function shotAt(t: number): (typeof M.SHOTS)[number] {
  let cur = M.SHOTS[0];
  for (const s of M.SHOTS) if (t >= s.t) cur = s;
  return cur;
}

/** Lagrens opacitet vid t (prototypens layers): övergången in i en bild är fade sekunder lång. */
export function layersAt(t: number): { op: LayerOpacity; shot: string } {
  const sh = M.SHOTS;
  let i = 0;
  sh.forEach((s, j) => { if (t >= s.t) i = j; });
  const cur = sh[i];
  const prev = i > 0 ? sh[i - 1] : null;
  const op: LayerOpacity = { village: 0, empty: 0, glimpse: 0 };
  const has = (l: string): l is keyof LayerOpacity => l in op;
  const k = cur.fade > 0 ? Math.min(1, (t - cur.t) / cur.fade) : 1;
  if (prev && prev.layer !== cur.layer && k < 1 && has(prev.layer)) op[prev.layer] = 1;
  if (has(cur.layer)) op[cur.layer] = prev && prev.layer !== cur.layer && has(prev.layer) && op[prev.layer] === 1 ? k : 1;
  if (cur.layer === 'black' && prev && has(prev.layer)) op[prev.layer] = 1;
  return { op, shot: cur.id };
}

/** Svärtan vid t (BLACK), och efter slutet: första morgonen tonar upp ur den. */
export function blackAt(t: number): number {
  if (t > OPENING_END) return clamp(1 - (t - OPENING_END) / FADE_UP_S, 0, 1);
  return track(M.BLACK, t, 'k');
}

/** Kvällens e vid t (EVENING), till byns ljus. */
export function eveningAt(t: number): number {
  return track(M.EVENING, t, 'e');
}

// ---------- texten och nålarna ----------

export function fadeK(x: OpeningText, t: number): { k: number; a: number } {
  const a = clamp((t - x.from) / x.fadeIn, 0, 1);
  const b = clamp((x.to - t) / x.fadeOut, 0, 1);
  return { k: Math.min(a, b), a };
}

/** Raderna över flygturen (TEXT): platsen, rad 1 och rad 2. dy är lyftningen i % av höjden. */
export function titleAt(t: number, reduced = false): Record<string, { k: number; dy: number }> {
  const out: Record<string, { k: number; dy: number }> = {};
  for (const x of M.TEXT) { const F = fadeK(x, t); out[x.key] = { k: F.k, dy: reduced ? 0 : (1 - F.a) * 1.2 }; }
  return out;
}

/** Raden efter flygturen (CAPTIONS): en åt gången, eller ingen. */
export function captionAt(t: number, reduced = false): { key: string | null; k: number; dy: number } {
  for (const c of M.CAPTIONS) {
    const F = fadeK(c, t);
    if (F.k > 0) return { key: c.key, k: F.k, dy: reduced ? 0 : (1 - F.a) * 1.2 };
  }
  return { key: null, k: 0, dy: 0 };
}

/** Nålarna som syns vid t, med opacitet (PINS). Var de står räknar scenen (kamerans projektion). */
export function pinsAt(t: number): Array<{ pin: OpeningPin; k: number }> {
  const out: Array<{ pin: OpeningPin; k: number }> = [];
  for (const p of M.PINS) { const F = fadeK(p, t); if (F.k > 0) out.push({ pin: p, k: F.k }); }
  return out;
}

/** Alla textnycklar spelaren kan se under öppningen (strängtabellens opening.*). */
export const OPENING_KEYS: string[] = [...M.TEXT, ...M.CAPTIONS, ...M.PINS].map((x) => x.key);

// ---------- byn: vår krog och Måltidens hus ----------

const ROOM = computePlayerBusinessInterior();
/** Vår krogs mitt i byns ram (Designs sim.PV.obb.centre), där taknålen står. */
export const VENUE_CENTRE: Vec2 = ROOM ? [ROOM.centre[0], ROOM.centre[1]] : [0, 0];

function centroid(poly: Vec2Tuple[]): Vec2 {
  let x = 0;
  let z = 0;
  let n = 0;
  for (let i = 0; i < poly.length - 1; i++) { x += poly[i][0]; z += poly[i][1]; n++; }
  return n ? [x / n, z / n] : [0, 0];
}

function inside(poly: Vec2Tuple[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function signedArea(poly: Vec2Tuple[]): number {
  let a = 0;
  for (let i = 0; i < poly.length - 1; i++) a += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  return a / 2;
}

interface Edge { mid: Vec2; n: Vec2; L: number }

/** Kanterna med utåtriktad normal (Designs byKvallPlats.js edges). */
function edges(poly: Vec2Tuple[]): Edge[] {
  const sg = signedArea(poly) > 0 ? 1 : -1;
  const out: Edge[] = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const L = Math.hypot(dx, dz);
    if (L < 0.3) continue;
    out.push({ L, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n: [(-dz / L) * sg * -1, (dx / L) * sg * -1] });
  }
  return out;
}

/** Dörren: kanten som vetter mot närmaste gata (mitten + 3 m ut, närmast en nod i gatunätet). */
function doorOf(poly: Vec2Tuple[]): Edge {
  const g = walkNetwork();
  let best: Edge | null = null;
  let bd = Infinity;
  for (const e of edges(poly)) {
    if (e.L < 3) continue;
    const p: Vec2 = [e.mid[0] + e.n[0] * 3, e.mid[1] + e.n[1] * 3];
    const k = nearestNode(g, p[0], p[1]);
    if (k < 0) continue;
    const d = Math.hypot(g.nodes[k][0] - p[0], g.nodes[k][1] - p[1]);
    if (d < bd) { bd = d; best = e; }
  }
  return best ?? edges(poly)[0];
}

/**
 * Byggnaden som spelet ritar den. Ett landmärke med egen form (CraftedLandmarks,
 * t.ex. Måltidens hus för gry-campus) ritar fotavtrycket kring sin mitt och
 * ställer det på landmärkets position, så att väggarna kan ligga några meter
 * från OSM-läget (Måltidens hus 2,2 m norrut). Dörren räknas mot väggarna som
 * syns, annars står Ingrid inne i väggen.
 */
export function renderedPoly(id: string, raw: Vec2Tuple[]): Vec2Tuple[] {
  const b = WORLD.buildings.find((x) => x.id === id);
  const poly = b?.poly ?? raw;
  const lm = WORLD.landmarks.find((l) => l.source?.osmType === 'way' && l.source.osmId != null && `w${l.source.osmId}` === id);
  if (!lm) return poly;
  const c = centroid(poly);
  const dx = lm.position[0] - c[0];
  const dz = lm.position[1] - c[1];
  return poly.map(([x, z]) => [x + dx, z + dz] as Vec2Tuple);
}

export interface MentorDoor { x: number; z: number; yaw: number; toTown: Vec2; building: string }

let doorCache: MentorDoor | null = null;
/** Där Ingrid står: Måltidens hus dörr, 1,2 m ut och 2,2 m längs väggen (Designs placeMentor). */
export function mentorDoor(): MentorDoor {
  if (doorCache) return doorCache;
  const [cx, cz] = CAMPUS_POINT;
  let best: (typeof WORLD_RAW_BUILDINGS)[number] | null = null;
  let bd = Infinity;
  for (const b of WORLD_RAW_BUILDINGS) {
    if (!b.poly || b.poly.length < 4) continue;
    if (inside(b.poly, cx, cz)) { best = b; break; }
    const c = centroid(b.poly);
    const d = Math.hypot(c[0] - cx, c[1] - cz);
    if (d < bd) { bd = d; best = b; }
  }
  const e = doorOf(renderedPoly(best!.id, best!.poly));
  const out = M.MENTOR.outM;
  const al = M.MENTOR.along || 0;
  const tl: Vec2 = [e.n[1], -e.n[0]];
  const x = e.mid[0] + e.n[0] * out + tl[0] * al;
  const z = e.mid[1] + e.n[1] * out + tl[1] * al;
  const [tx, tz] = landmarkPoint('gry-torget') ?? [12.49, -27.59];
  const L = Math.hypot(tx - x, tz - z) || 1;
  doorCache = { x, z, yaw: Math.atan2(e.n[0], e.n[1]), toTown: [(tx - x) / L, (tz - z) / L], building: best!.id };
  return doorCache;
}

// ---------- byns kamera ----------

/** Byns egen inramning på avståndet d (Designs frameAt, mot spelets levelTarget). */
export function framePose(d: number): OpeningView {
  const L = LEVELS;
  const n = L.length;
  let i = 0;
  while (i < n - 2 && d < L[i + 1].dist) i++;
  const a = L[i];
  const b = L[i + 1];
  const k = clamp(Math.log(a.dist / d) / Math.log(a.dist / b.dist), 0, 1);
  const A = levelTarget(a);
  const B = levelTarget(b);
  const dy = Math.atan2(Math.sin(B.yaw - A.yaw), Math.cos(B.yaw - A.yaw));
  return {
    tx: lerp(A.focus.x, B.focus.x, k),
    tz: lerp(A.focus.z, B.focus.z, k),
    yaw: A.yaw + dy * k,
    ty: lerp(a.targetY ?? 0, b.targetY ?? 0, k),
    pitch: lerp(a.pitch, b.pitch, k),
    fov: lerp(a.fov ?? 34, b.fov ?? 34, k),
    dist: d
  };
}

function keyPose(k: VillageCamKey): OpeningView {
  if (k.v) return k.v;
  if (k.frame) return framePose(k.frame);
  const m = k.mentor!;
  const D = mentorDoor();
  const lead = m.lead ?? 0;
  return { tx: D.x + D.toTown[0] * lead, ty: 1.2, tz: D.z + D.toTown[1] * lead, dist: m.dist, yaw: D.yaw + m.side, pitch: m.pitch, fov: 34 };
}

/** Byns kamera vid t (VILLAGE_CAM). */
export function villagePose(t: number): OpeningView {
  const ks = M.VILLAGE_CAM;
  if (t <= ks[0].t) return keyPose(ks[0]);
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (t < b.t) {
      if (a.frame && !b.v && !b.mentor && b.frame) {
        const k = ease(b.ease, (t - a.t) / (b.t - a.t));
        return framePose(Math.exp(lerp(Math.log(a.frame), Math.log(b.frame), k)));
      }
      if (b.mentor && !a.mentor) return keyPose(b);
      return lerpPose(keyPose(a), keyPose(b), ease(b.ease, (t - a.t) / (b.t - a.t)));
    }
  }
  return keyPose(ks[ks.length - 1]);
}

/** Kameran i en av vinbarens scener vid scenens tid (prototypens camAt). */
export function barCamAt(ks: BarCamKey[], t: number): OpeningView {
  if (t <= ks[0].t) return ks[0].v;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (t < b.t) return lerpPose(a.v, b.v, ease(b.ease, (t - a.t) / (b.t - a.t)));
  }
  return ks[ks.length - 1].v;
}

/** Scenernas tid ur öppningens: den tomma vinbaren börjar vid 17 s, glimtarna vid GLIMPSE_T0. */
export const EMPTY_T0 = M.SHOTS.find((s) => s.id === 'empty')!.t;
export const GLIMPSE_T0: number = M.GLIMPSE_T0;

// ---------- minskad rörelse ----------

/**
 * ORDER 308 — med prefers-reduced-motion står kameran still i varje bild:
 * bilden visas från en fast tidpunkt (byn hela på 660 m, gatan framför vår
 * dörr på 42 m med nålen, den tomma vinbaren på 12 m, glimtarnas första
 * ruta, Ingrid på 36 m). Klippen och övertoningarna står kvar, raderna lyfts
 * inte och figurerna rör sig som förut. Tiden, texten och nålarna är desamma.
 */
export const REDUCED_HOLD: Record<string, number> = {
  fly: 6.5,
  descend: 15.2,
  empty: EMPTY_T0 + 6.5,
  door: 23.5,
  decant: 26.8,
  toast: 30.1,
  mentor: 36.6,
  black: 36.6
};

/** Kamerans tid vid t: t, eller bildens fasta tidpunkt med minskad rörelse. */
export function cameraTime(t: number, reduced: boolean): number {
  if (!reduced) return t;
  return REDUCED_HOLD[shotAt(t).id] ?? t;
}

/** Den tomma vinbarens kamera, med glimtarnas tid för glimtarna. */
export function emptyCam(t: number, reduced: boolean, cam: BarCamKey[]): OpeningView {
  return barCamAt(cam, Math.max(0, cameraTime(t, reduced) - EMPTY_T0));
}
export function glimpseCam(t: number, reduced: boolean, cam: BarCamKey[]): OpeningView {
  return barCamAt(cam, Math.max(0, cameraTime(t, reduced) - GLIMPSE_T0));
}

/** Går öppningen att hoppa över vid t. */
export function canSkip(t: number, seenBefore: boolean): boolean {
  return seenBefore || t >= SKIP_AFTER_S;
}

export function openingSeen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
export function markOpeningSeen(): void {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* utan lagring visas öppningen som första gången */ }
}

