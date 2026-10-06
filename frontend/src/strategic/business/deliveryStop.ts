// ORDER 312 — var leveransbilen stannar.
//
// interiorLayout.ts lägger lastplatsen (deliveryBay) 2 m bakom krogens bakre
// gavel och infarten (deliveryApproach) 6 m längre ut, rakt bakåt längs
// rummets axel. För vinbaren (w869907975) blev det en sträcka på 7 m över
// gården mellan huset och Prästgatan: bilen körde där ingen väg är ritad.
//
// Här stannar bilen i stället på den ritade körbanan för bilar närmast
// lastplatsen (content/roadSurface.ts, samma yta som OsmRoads ritar), i
// högra körfältet, och kör in längs gatan. Gatan kan bestämmas per hus
// (DELIVERY_STREET). Lastplatsen i interiorLayout står
// kvar som husets baksida; den här modulen räknar bara bilens väg.
//
// Meter, byns ram.

import type { Vec2Tuple } from '../content/world';
import { onCarCarriageway, roadRenderPieces } from '../content/roadSurface';
import type { InteriorLayout } from './interiorLayout';

export interface DeliveryStop {
  /** Där bilen står och lastar av, på gatan. */
  bay: Vec2Tuple;
  /** Där bilen kommer in från och kör ut till, längre bort längs gatan. */
  approach: Vec2Tuple;
  /** Bilens rotation.y (lokala +x, hytten, pekar från approach mot bay). */
  rotationY: number;
}

/** Infartens avstånd längs gatan, meter. */
const APPROACH_ALONG_M = 8;
/** Bilens halva bredd (DeliveryVan VAN_WIDTH_M / 2) plus 0,2 m till kanten. */
const VAN_HALF_PLUS_MARGIN_M = 0.9 + 0.2;

/**
 * Gatan bilen stannar på, per hus (byggnadens id → vägens namn i kartan).
 * Saknas huset här stannar bilen på närmaste bilgata bakom huset.
 * Anders 2026-10-06 (ORDER 312b): vinbarens leveranser kommer från
 * Prästgatan, söder om huset (ORDER 312 lade dem på Västra Bergvägen).
 */
export const DELIVERY_STREET: Readonly<Record<string, string>> = {
  w869907975: 'Prästgatan'
};

const cache = new WeakMap<object, DeliveryStop | null>();

export function deliveryStop(layout: Pick<InteriorLayout, 'building' | 'deliveryBay' | 'entrance' | 'centre'>): DeliveryStop | null {
  const hit = cache.get(layout.building);
  if (hit !== undefined) return hit;
  const [px, pz] = layout.deliveryBay;
  // Baksidan: punkter på gatan som ligger bakom husets mitt (motsatt entrén).
  const back: Vec2Tuple = [layout.centre[0] - layout.entrance[0], layout.centre[1] - layout.entrance[1]];
  let best: { p: Vec2Tuple; dir: Vec2Tuple; half: number; d: number } | null = null;
  const street = DELIVERY_STREET[layout.building.id];
  for (const piece of roadRenderPieces()) {
    if (piece.ped || !piece.road.car) continue;
    if (street && piece.road.name !== street) continue;
    for (let i = 1; i < piece.poly.length; i++) {
      const a = piece.poly[i - 1];
      const b = piece.poly[i];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const L2 = dx * dx + dz * dz;
      if (L2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2));
      const q: Vec2Tuple = [a[0] + dx * t, a[1] + dz * t];
      if ((q[0] - layout.centre[0]) * back[0] + (q[1] - layout.centre[1]) * back[1] <= 0) continue;
      const d = Math.hypot(q[0] - px, q[1] - pz);
      if (!best || d < best.d) {
        const L = Math.sqrt(L2);
        best = { p: q, dir: [dx / L, dz / L], half: piece.half, d };
      }
    }
  }
  if (!best) { cache.set(layout.building, null); return null; }
  // Högra körfältet mot huset: förskjut mot lastplatsens sida av mittlinjen.
  const lane = Math.max(0, Math.min(1.2, best.half - VAN_HALF_PLUS_MARGIN_M));
  const n: Vec2Tuple = [-best.dir[1], best.dir[0]];
  const side = (px - best.p[0]) * n[0] + (pz - best.p[1]) * n[1] >= 0 ? 1 : -1;
  const bay: Vec2Tuple = [best.p[0] + n[0] * lane * side, best.p[1] + n[1] * lane * side];
  // Infarten längs gatan, bakom bilen. Högertrafik: körriktningen väljs så
  // att lastplatsens sida är bilens högra (höger om färdriktningen f är
  // (−f_z, f_x), OsmTraffic); fortsätter inte körbanan dit prövas andra hållet.
  let approach: Vec2Tuple | null = null;
  for (const travel of [side, -side]) {
    const sgn = -travel;
    const c: Vec2Tuple = [bay[0] + best.dir[0] * APPROACH_ALONG_M * sgn, bay[1] + best.dir[1] * APPROACH_ALONG_M * sgn];
    let ok = true;
    for (let s = 0; s <= APPROACH_ALONG_M; s += 0.5) {
      if (!onCarCarriageway(bay[0] + best.dir[0] * s * sgn, bay[1] + best.dir[1] * s * sgn)) { ok = false; break; }
    }
    if (ok) { approach = c; break; }
  }
  if (!approach) approach = [bay[0] - best.dir[0] * APPROACH_ALONG_M, bay[1] - best.dir[1] * APPROACH_ALONG_M];
  const fx = bay[0] - approach[0];
  const fz = bay[1] - approach[1];
  const out: DeliveryStop = { bay, approach, rotationY: Math.atan2(-fz, fx) };
  cache.set(layout.building, out);
  return out;
}
