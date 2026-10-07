// ORDER 319a.4 (Anders 2026-10-07) — "En situation utlöses av något som syns: … en leverans kommer."
// Leveransbilen till spelarens vagn: den kör in längs byns bilnät (content/villageNetwork.ts
// driveNetwork) under förvarningen (THEATRE.cueSeconds.delivery), står på gatan bakom vagnen under
// situationen och kör samma väg ut. Den börjar och slutar minst TRUCK_GUESTS.minSpawnM från vagnen
// och utanför bilden, som gästerna (truckGuestFlow.ts).

import { driveNetwork, nearestNode, routeBetween } from '../../content/villageNetwork';
import { villageSources } from '../../content/villagePlaces';
import { TRUCK_GUESTS, toWorld, type TruckFrame } from './truckGuestFlow';

type Vec2 = [number, number];

/** Där bilen stannar: på gatan bakom vagnen (w122157681, parallell med vagnen 6,3 m bakom den i
 * vagnens ram; −Z är bort från luckan), inom krogens bild. Den sista biten kör bilen längs samma gata
 * från bilnätets närmaste nod. */
export const TRUCK_DELIVERY_STOP: Vec2 = [-2, -6.3];

/** Bilens väg in: från en punkt minst minSpawnM bort och utanför bilden till hållplatsen bakom vagnen. */
export function truckDeliveryPath(frame: TruckFrame, inView: (x: number, z: number) => boolean): Vec2[] {
  const g = driveNetwork();
  const want = toWorld(frame, TRUCK_DELIVERY_STOP[0], TRUCK_DELIVERY_STOP[1]);
  const stopNode = nearestNode(g, want[0], want[1]);
  const src = villageSources();
  const route: Vec2[] = [...routeBetween(g, src.driveEntry[0] ?? src.driveParking, stopNode), want];
  const far = (x: number, z: number) => Math.hypot(x - frame.x, z - frame.z) >= TRUCK_GUESTS.minSpawnM && !inView(x, z);
  for (let i = route.length - 1; i > 0; i--) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i];
    const L = Math.hypot(bx - ax, bz - az);
    for (let s = L; s >= 0; s -= TRUCK_GUESTS.searchStepM) {
      const k = L > 0 ? s / L : 0;
      const x = ax + (bx - ax) * k, z = az + (bz - az) * k;
      if (far(x, z)) return [[x, z], ...route.slice(i)];
    }
  }
  return route;
}

/** Punkten och kursen s meter längs vägen. */
export function alongPath(path: Vec2[], s: number): { x: number; z: number; heading: number } {
  let left = Math.max(0, s);
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (left <= L || i === path.length - 1) {
      const k = L > 0 ? Math.min(1, left / L) : 1;
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, heading: Math.atan2(bx - ax, bz - az) };
    }
    left -= L;
  }
  const p = path[path.length - 1] ?? [0, 0];
  return { x: p[0], z: p[1], heading: 0 };
}

export function pathLength(path: Vec2[]): number {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return L;
}
