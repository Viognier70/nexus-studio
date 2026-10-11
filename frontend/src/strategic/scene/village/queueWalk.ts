// ORDER 330 G (Anders 2026-10-11) — Nils längs kön de kvällar Jonas står vid grillen (den extra handen,
// HIRE_PREP_HAND): han går från gäst till gäst i kön, stannar en stund vid var och en med blocket (staff.write),
// tar beställningen och säger hur lång väntan är, och går till nästa. Är kön tom står han vid luckans sida. Ren
// TypeScript i vagnens ram (meter); talen i balance.ts FOODTRUCK.queueWalk. Samma lösning som fika-vagn-kon svar A.

import { FOODTRUCK } from '../../../sim/balance';

export type Vec2 = [number, number];

export interface QueueWalkState { at: Vec2; target: number; takeLeft: number; yaw: number }
export interface QueueWalkPose { at: Vec2; yaw: number; act: 'walk' | 'take' | 'idle'; u: number }

export function newQueueWalk(home: Vec2): QueueWalkState {
  return { at: [home[0], home[1]], target: 0, takeLeft: 0, yaw: 0 };
}

/** Ett steg: `spots` är köplatserna som har en gäst (vagnens ram), `home` där han står när kön är tom. Muterar `s`. */
export function stepQueueWalk(s: QueueWalkState, dt: number, spots: readonly Vec2[], home: Vec2, walked: number): QueueWalkPose {
  const W = FOODTRUCK.queueWalk;
  if (spots.length === 0) {
    s.takeLeft = 0;
    return moveTo(s, home, dt, walked, 'idle', 0);
  }
  if (s.target >= spots.length) s.target = 0;
  const spot = spots[s.target];
  const stand: Vec2 = [spot[0], spot[1] + W.outM];
  if (s.takeLeft > 0) {
    s.takeLeft -= dt;
    s.yaw = Math.atan2(spot[0] - s.at[0], spot[1] - s.at[1]);
    if (s.takeLeft <= 0) s.target = (s.target + 1) % spots.length;
    return { at: s.at, yaw: s.yaw, act: 'take', u: W.takeS - Math.max(0, s.takeLeft) };
  }
  const p = moveTo(s, stand, dt, walked, 'walk', 0);
  if (p.act === 'idle') { s.takeLeft = W.takeS; return { at: s.at, yaw: s.yaw, act: 'take', u: 0 }; }
  return p;
}

function moveTo(s: QueueWalkState, to: Vec2, dt: number, walked: number, arrived: 'idle' | 'walk', u: number): QueueWalkPose {
  const dx = to[0] - s.at[0], dz = to[1] - s.at[1], d = Math.hypot(dx, dz);
  const step = FOODTRUCK.queueWalk.speedMps * dt;
  if (d <= step || d < 1e-3) {
    s.at = [to[0], to[1]];
    return { at: s.at, yaw: s.yaw, act: arrived === 'walk' ? 'idle' : 'idle', u };
  }
  s.yaw = Math.atan2(dx, dz);
  s.at = [s.at[0] + (dx / d) * step, s.at[1] + (dz / d) * step];
  return { at: s.at, yaw: s.yaw, act: 'walk', u: walked + step };
}
