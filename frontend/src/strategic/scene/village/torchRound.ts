// ORDER 319c — medhjälparens rundor ut från vagnen, som ren logik (scenen och testerna läser samma kod):
//   - marschallerna (Designs tillägg torchLighting.ts TORCH_ROUTE): ut genom dörren i bakgaveln, kön först,
//     sedan däcket medsols och tillbaka norr om däcket, med staff.walkLighter och staff.lightTorch;
//   - ett bord med skräp (sim/truckLife.ts): ut genom dörren till bordet, torkar av det och tillbaka.
// Rundans tid kommer ur simuleringen (TORCH.roundSimSeconds, TRUCK_SEATING.clearSimSeconds). Gången fyller
// det som blir kvar när tändningarna och avtorkningen är räknade, så att rundan slutar när simuleringen säger.

import { TORCH_ROUTE } from '../torchLighting';
import { TRUCK_PROPS } from '../truckProps';
import { CLIPS } from '../figureClips';

type Vec2 = [number, number];

export interface RoundPose {
  /** Där medhjälparen står, i vagnens ram. */
  at: Vec2;
  /** Vart medhjälparen tittar (rotation.y i vagnens ram). */
  yaw: number;
  /** Går, tänder en marschall eller torkar av ett bord. */
  act: 'walk' | 'light' | 'wipe';
  /** Sekunder in i klippet (light, wipe) eller tillryggalagd sträcka (walk). */
  u: number;
}

interface Step { kind: 'walk'; pts: Vec2[]; len: number }
interface Act { kind: 'light' | 'wipe'; at: Vec2; face: Vec2; seconds: number; torch?: number }

function lengthOf(pts: Vec2[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

function along(pts: Vec2[], d: number): { at: Vec2; dir: Vec2 } {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= L || i === pts.length - 1) {
      const k = L > 0 ? Math.min(1, d / L) : 1;
      return { at: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: L > 0 ? [(b[0] - a[0]) / L, (b[1] - a[1]) / L] : [0, 1] };
    }
    d -= L;
  }
  return { at: pts[pts.length - 1], dir: [0, 1] };
}

function play(seq: (Step | Act)[], elapsed: number, total: number): RoundPose {
  const acts = seq.reduce((a, s) => a + (s.kind === 'walk' ? 0 : s.seconds), 0);
  const walkLen = seq.reduce((a, s) => a + (s.kind === 'walk' ? s.len : 0), 0);
  const speed = walkLen / Math.max(1e-6, total - acts);
  let t = Math.max(0, elapsed);
  let walked = 0;
  for (const s of seq) {
    if (s.kind === 'walk') {
      const T = s.len / speed;
      if (t < T) {
        const p = along(s.pts, t * speed);
        return { at: p.at, yaw: Math.atan2(p.dir[0], p.dir[1]), act: 'walk', u: walked + t * speed };
      }
      t -= T;
      walked += s.len;
      continue;
    }
    if (t < s.seconds) return { at: s.at, yaw: Math.atan2(s.face[0] - s.at[0], s.face[1] - s.at[1]), act: s.kind, u: t };
    t -= s.seconds;
  }
  const last = seq[seq.length - 1];
  const end = last.kind === 'walk' ? last.pts[last.pts.length - 1] : last.at;
  return { at: end, yaw: 0, act: 'walk', u: walked };
}

const LIGHT_S = () => CLIPS['staff.lightTorch'].seconds.normal;

function torchSeq(): (Step | Act)[] {
  const out: (Step | Act)[] = [];
  for (const leg of TORCH_ROUTE.legs) {
    out.push({ kind: 'walk', pts: leg.walk, len: lengthOf(leg.walk) });
    if (leg.light !== null && leg.standAt) out.push({ kind: 'light', at: leg.standAt, face: TRUCK_PROPS.torch.at[leg.light], seconds: LIGHT_S(), torch: leg.light });
  }
  return out;
}

/** Medhjälparen under rundan med marschallerna, `elapsed` sekunder in i en runda på `total` sekunder. */
export function torchRoundPose(elapsed: number, total: number): RoundPose {
  return play(torchSeq(), elapsed, total);
}

/** När varje marschall tänds (sekunder in i rundan): vid u 0,55 av staff.lightTorch (Designs ignite). */
export function torchIgniteTimes(total: number): number[] {
  const seq = torchSeq();
  const acts = seq.reduce((a, s) => a + (s.kind === 'walk' ? 0 : s.seconds), 0);
  const walkLen = seq.reduce((a, s) => a + (s.kind === 'walk' ? s.len : 0), 0);
  const speed = walkLen / Math.max(1e-6, total - acts);
  const ignite = CLIPS['staff.lightTorch'].events.find((e) => e.type === 'ignite')?.u ?? 0;
  const out: number[] = [];
  let t = 0;
  for (const s of seq) {
    if (s.kind === 'walk') { t += s.len / speed; continue; }
    if (s.torch !== undefined) out[s.torch] = t + ignite * s.seconds;
    t += s.seconds;
  }
  return out;
}

/** Gångfarten under rundan med marschallerna (meter per sekund). Designs är 1,3 m/s. */
export function torchRoundSpeed(total: number): number {
  const seq = torchSeq();
  const acts = seq.reduce((a, s) => a + (s.kind === 'walk' ? 0 : s.seconds), 0);
  return seq.reduce((a, s) => a + (s.kind === 'walk' ? s.len : 0), 0) / Math.max(1e-6, total - acts);
}

/** Där medhjälparen står när bordet torkas: på bordets västra sida, närmast dörren. */
function wipeSpot(table: 'A' | 'B' | 'C'): Vec2 {
  const t = TRUCK_PROPS.standTable.at[table];
  return [t[0] - (TRUCK_PROPS.standTable.top.diameter / 2 + WIPE_GAP_M), t[1]];
}
const WIPE_GAP_M = 0.25;

/** Medhjälparen städar ett bord, `elapsed` sekunder in i en runda på `total` sekunder. */
export function clearRoundPose(table: 'A' | 'B' | 'C', elapsed: number, total: number): RoundPose {
  const door = TORCH_ROUTE.door;
  const spot = wipeSpot(table);
  const out: Vec2[] = [[0, 0.45], [2.05, 0.45], door, spot];
  const back = [...out].reverse();
  const wipe = CLIPS['staff.wipeTable'].seconds.normal;
  return play([{ kind: 'walk', pts: out, len: lengthOf(out) }, { kind: 'wipe', at: spot, face: TRUCK_PROPS.standTable.at[table], seconds: wipe }, { kind: 'walk', pts: back, len: lengthOf(back) }], elapsed, total);
}
