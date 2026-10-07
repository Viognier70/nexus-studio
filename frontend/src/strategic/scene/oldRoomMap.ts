// ORDER 317 — Designs manus (events/handelserManus.js, opening/oppningManus.js)
// är skrivna i vinbarens gamla rum, 15,6 × 11,8 m. Rummet står nu i husets mått
// med Designs möblering (wineBarHouse.ts, 14,47 × 10,05 m). Manusen är Designs
// filer och står kvar oförändrade; i stället översätts varje punkt i dem en gång,
// när manuset byggs, från det gamla rummet till samma plats i det nya.
//
// Översättningen är styckvis linjär per zon, med ankare i de mått som finns i
// båda rummen (gammalt → nytt):
//   köket        x −7,6…−4,6 → −7,035…−4,6, z 1,6…5,7 → 1,4…4,825
//   baren        x −3,6…2,4 → −3,4…1,8, z − 0,4 (vinväggens mittlinje)
//   loungen      gången 3,1 → 2,65, bordet 4,15 → 3,3, dynan 5,1 → 4,285, väggen 5,7 → 4,825
//   tvåorna      gången −3,25 → −3,45, bordet −4,4 → −4,25, väggen −5,7 → −4,825
//   bordens x    −4,2, −2,1, 0 → −4,3, −2,3, −0,3; loungerna −1,8, 2,0 → −2,0, 1,4
//   dörren       x − 0,565 (pulten 6,1 → 5,535, köplatserna 7,2 → 6,635)
//   DJ-hörnet    mitten 5,7, −4,2 → 5,45, −3,7
// Varje översatt punkt prövas mot väggarna i order317Vaggarna.test.ts.

import type { EventScript, ScriptView, Vec2 } from './events/handelserManus';
import { DOOR, doorPath } from './wineBarRoom';
import { ROOM as HOUSE_ROOM } from './wineBarHouse';

function piece(v: number, from: readonly number[], to: readonly number[]): number {
  if (v <= from[0]) return to[0] + (v - from[0]);
  for (let i = 1; i < from.length; i++) {
    if (v <= from[i]) return to[i - 1] + ((v - from[i - 1]) / (from[i] - from[i - 1])) * (to[i] - to[i - 1]);
  }
  const n = from.length - 1;
  return to[n] + (v - from[n]);
}

const OLD_KITCHEN = { x0: -7.6, x1: -4.6, z0: 1.6, z1: 5.7 };
const NEW_KITCHEN = { x0: -7.035, x1: -4.6, z0: 1.4, z1: 4.825 };
const OLD_BAR_X = [-3.6, 2.4], NEW_BAR_X = [-3.4, 1.8];
const STOOL_BAND = 2.7;
const NORTH_Z = { from: [2.7, 3.1, 4.15, 5.1, 5.7], to: [2.3, 2.65, 3.3, 4.285, 4.825] };
const SOUTH_Z = { from: [-5.7, -4.4, -3.25, -2.7], to: [-4.825, -4.25, -3.45, -3.1] };
const TABLE_X = { from: [-7.6, -4.2, -2.1, 0, 2.4, 4.4], to: [-7.035, -4.3, -2.3, -0.3, 1.8, 3.8] };
const LOUNGE_X = { from: [-3.6, -1.8, 2.0, 4.4], to: [-3.4, -2.0, 1.4, 3.8] };
const DOOR_FROM_X = 4.4;
const DOOR_SHIFT = -0.565;
const EAST_SHIFT = -0.6;
const RACK_SHIFT = -0.4;
const DJ = { x: 4.4, z: -3.3, dx: -0.25, dz: 0.5 };
const NE_Z = { from: [2.7, 2.9, 4.6, 5.7], to: [2.6, 3.0, 4.0, 4.825] };

// Köksdörren i kökets södra halvvägg (gammalt x −5,5…−4,7): vägarna genom den
// går genom dörrens mitt i husets kök (x −5,1), så att de inte stryker
// kökets östra halvvägg.
const KITCHEN_DOOR_BAND = { x0: -5.6, x1: -4.6, z0: 1.0, z1: 2.0, x: -5.1 };
// Figurens halva bredd (en gäst, figureRig.ts FIGURE.guestShoulderWidth / 2), med marginal.
const DOOR_SIDE_M = 0.25;

/** En punkt i det gamla rummet (lokal XZ) till samma plats i husets möblering. */
export function fromOldRoom(x: number, z: number): Vec2 {
  const p = fromOldRoomRaw(x, z);
  if (x >= KITCHEN_DOOR_BAND.x0 && x <= KITCHEN_DOOR_BAND.x1 && z >= KITCHEN_DOOR_BAND.z0 && z <= KITCHEN_DOOR_BAND.z1) p[0] = KITCHEN_DOOR_BAND.x;
  // I dörrens väggband står man i dörröppningen, inte i väggen bredvid.
  const halfW = HOUSE_ROOM.width / 2;
  if (p[0] > halfW - DOOR.wall - DOOR_SIDE_M && p[0] < halfW + DOOR_SIDE_M) {
    const lim = DOOR.halfGap - DOOR_SIDE_M;
    p[1] = Math.max(-lim, Math.min(lim, p[1]));
  }
  return p;
}

function fromOldRoomRaw(x: number, z: number): Vec2 {
  // Köket.
  if (x < OLD_KITCHEN.x1 && z > OLD_KITCHEN.z0) {
    return [piece(x, [OLD_KITCHEN.x0, OLD_KITCHEN.x1], [NEW_KITCHEN.x0, NEW_KITCHEN.x1]), piece(z, [OLD_KITCHEN.z0, OLD_KITCHEN.z1], [NEW_KITCHEN.z0, NEW_KITCHEN.z1])];
  }
  // DJ-hörnet (sydost).
  if (x > DJ.x && z < DJ.z) return [x + DJ.dx, z + DJ.dz];
  // Dörren och golvet framför den (öster om ståborden).
  if (x > DOOR_FROM_X) {
    if (z > STOOL_BAND) return [x + DOOR_SHIFT, piece(z, NE_Z.from, NE_Z.to)];
    return [x + DOOR_SHIFT, z];
  }
  // Loungen (norr).
  if (z > STOOL_BAND) return [piece(x, LOUNGE_X.from, LOUNGE_X.to), piece(z, NORTH_Z.from, NORTH_Z.to)];
  // Tvåorna (söder).
  if (z < -STOOL_BAND) return [piece(x, TABLE_X.from, TABLE_X.to), piece(z, SOUTH_Z.from, SOUTH_Z.to)];
  // Korridoren väster om baren (kökets dörr, passet, förrådet).
  if (x < OLD_BAR_X[0]) return [piece(x, [OLD_KITCHEN.x0, OLD_BAR_X[0]], [NEW_KITCHEN.x0, NEW_BAR_X[0]]), z + (z > 0 ? -0.3 : RACK_SHIFT)];
  // Baren med stråken och barstolarna.
  if (x <= OLD_BAR_X[1]) return [piece(x, OLD_BAR_X, NEW_BAR_X), z + RACK_SHIFT];
  // Golvet mellan barens kortände och ståborden.
  return [x + EAST_SHIFT, z + RACK_SHIFT];
}

const isNum = (v: unknown): v is number => typeof v === 'number';
const vec2 = (v: unknown): v is Vec2 => Array.isArray(v) && v.length === 2 && v.every(isNum);
const vec3 = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every(isNum);
const map2 = (p: Vec2): Vec2 => fromOldRoom(p[0], p[1]);
const map3 = (p: [number, number, number]): [number, number, number] => { const q = fromOldRoom(p[0], p[2]); return [q[0], p[1], q[1]]; };

/** Spelarens kamera i manusen (GAME, 24 m) är ingen plats i rummet och översätts inte (eventTheatre.ts känner igen den). */
export const GAME_CAMERA_FROM_M = 23.5;

/** Kamerans mål i manuset: samma översättning (höjden och vinkeln står kvar). */
export function viewFromOldRoom<V extends Pick<ScriptView, 'tx' | 'tz'> & { dist?: number }>(v: V): V {
  if ((v.dist ?? 0) >= GAME_CAMERA_FROM_M) return v;
  const q = fromOldRoom(v.tx, v.tz);
  return { ...v, tx: q[0], tz: q[1] };
}

/**
 * Hela manuset översatt: skådespelarnas start, vägar, blickpunkter och
 * händelsernas platser, rekvisitans platser, effekternas platser och kamerans
 * mål. Platser i manuset som anges med en sittplats (`seat`) läses ur rummet
 * och behöver ingen översättning. Riktningar (`dir`) och förskjutningar
 * (`offset`, `on`) står kvar.
 */
export function scriptFromOldRoom<S extends Pick<EventScript, 'actors' | 'props' | 'effects'> & { beats?: EventScript['beats']; cam?: Array<{ v?: ScriptView | unknown }> }>(sc: S): S {
  const actors: EventScript['actors'] = {};
  for (const [id, a] of Object.entries(sc.actors)) {
    // Vägen genom dörren räknas från där skådespelaren står (start eller förra vägens slut).
    let at: Vec2 | null = vec2(a.pos) && !(a.pos[0] === 0 && a.pos[1] === 0) ? map2(a.pos) : null;
    const walkFrom = (path: Vec2[]): Vec2[] => {
      const full = at ? doorPath([at, ...path], HOUSE_ROOM.width).slice(1) : doorPath(path, HOUSE_ROOM.width);
      if (full.length > 0) at = full[full.length - 1];
      return full;
    };
    actors[id] = {
      ...a,
      ...(vec2(a.pos) ? { pos: map2(a.pos) } : {}),
      steps: a.steps.map((st) => ({
        ...st,
        ...(st.path ? { path: walkFrom(st.path.map(map2)) } : {}),
        ...(vec2(st.look) ? { look: map2(st.look) } : {}),
        ...(st.ev ? { ev: st.ev.map((e) => ({ ...e, ...(vec3(e.pos) ? { pos: map3(e.pos) } : {}), ...(vec2(e.put) ? { put: map2(e.put) } : {}) })) } : {})
      }))
    };
  }
  const props: EventScript['props'] = {};
  for (const [id, p] of Object.entries(sc.props)) props[id] = vec3(p.at) ? { ...p, at: map3(p.at) } : p;
  const effects = sc.effects.map((e) => {
    const out: Record<string, unknown> = { ...e };
    for (const k of ['at', 'to', 'from']) if (vec3(e[k])) out[k] = map3(e[k] as [number, number, number]);
    return out as typeof e;
  });
  const beats = sc.beats ? { ...sc.beats, cam: sc.beats.cam.map((c) => (c.v ? { ...c, v: viewFromOldRoom(c.v) } : c)) } : undefined;
  const cam = sc.cam ? sc.cam.map((c) => (c.v && typeof c.v === 'object' && 'tx' in (c.v as object) ? { ...c, v: viewFromOldRoom(c.v as ScriptView) } : c)) : undefined;
  return { ...sc, actors, props, effects, ...(beats ? { beats } : {}), ...(cam ? { cam } : {}) } as S;
}
