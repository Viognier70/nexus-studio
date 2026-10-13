// ORDER 332 C — Designs D13 truckRain.js (documentation/leveranser/nexus-leverans-2026-10-12-grillstugan/): kön vid
// Grillstugan i regn, med och utan markisen, och pölarna. Samma ram som grillstugan.ts. Regnstrecken, pölarna och de
// blöta borden ritar TruckLife.tsx som förut (D9); därifrån slutar strecken på skydden (grillstugan.ts stuganShelters).
// Paraplyet är spelets (tableware.ts 'umbrella', PlayerTruckCrew.tsx UMBRELLA_ARM), inte D13:s buildUmbrella. Ljuset i
// regn (D13 WET: himlen, solen) ändras inte här: byns himmel och sol följer byns väder.
// Talen för tålamodet i kön står i balance.ts RAIN_QUEUE_BALANCE; simuleringen (sim/truckLife.ts) och scenen läser
// hur många som står torrt ur samma tabell (RAIN_QUEUE.*.sheltered).

import type { Vec2 } from './grillstugan';

export interface RainQueueLayout {
  order: Vec2;
  collect: Vec2;
  line: Vec2[];
  /** Avståndet mellan två i kön. */
  pitchM: number;
  /** Medhjälparens väg längs kön (z i vagnens ram). */
  helperZ: number;
  /** Hur många som står torrt: den som beställer och de första i kön. */
  sheltered: number;
  /** Medhjälparen har paraply (utan markis). */
  helperUmbrella: boolean;
}

/** D13 RAIN_QUEUE. `collect` står inte i D13: D9:s hämtplats i regn (truckWeather.ts rain.queue.collect), under luckans
 *  skiva. withAwning: alla under markisen, 0,55 m mellan. withoutAwning: den som beställer och en till under luckans
 *  skiva, sedan paraplyer, 0,9 m mellan. */
export const RAIN_QUEUE: { withAwning: RainQueueLayout; withoutAwning: RainQueueLayout } = {
  withAwning: { order: [-0.5, 1.95], collect: [0.9, 1.95], line: [[-1.25, 2.2], [-1.8, 2.2], [-2.35, 2.2], [-2.9, 2.2], [-3.45, 2.2], [-4.0, 2.2]], pitchM: 0.55, helperZ: 2.72, sheltered: 7, helperUmbrella: false },
  withoutAwning: { order: [-0.5, 1.95], collect: [0.9, 1.95], line: [[-1.12, 1.95], [-2.1, 2.35], [-3.0, 2.35], [-3.9, 2.35]], pitchM: 0.9, helperZ: 3.4, sheltered: 2, helperUmbrella: true }
};

/** Kön i regn som gäller: med eller utan markisen. */
export function rainQueue(awning: boolean): RainQueueLayout {
  return awning ? RAIN_QUEUE.withAwning : RAIN_QUEUE.withoutAwning;
}

/** Hur många i kön (utan den som beställer) som står torrt i regn. Simuleringen läser samma tal. */
export function rainQueueDryInLine(awning: boolean): number {
  return rainQueue(awning).sheltered - 1;
}

/** Står platsen `index` i kön (0 = först efter den som beställer) under tak i regn? */
export function rainQueueSpotSheltered(index: number, awning: boolean): boolean {
  return index < rainQueueDryInLine(awning);
}

/** D13 PUDDLES: [x, z, halva bredden, halva djupet, vridning] i vagnens ram. */
export const PUDDLES: readonly [number, number, number, number, number][] = [[-5.7, 4.1, 0.9, 0.4, 0.2], [-3.1, 3.55, 0.65, 0.28, -0.1], [-0.3, 4.3, 1.1, 0.42, 0.1], [3.0, 3.7, 0.8, 0.33, 0.5], [6.4, 2.4, 0.7, 0.3, 1.2], [-6.9, 0.7, 0.8, 0.36, -0.3], [2.4, -2.6, 0.9, 0.38, 0.3], [-1.9, 6.4, 0.9, 0.35, -0.2]];

/** D13 RAIN: dropparna från skivans och markisens kant (per meter, och fallets fart). */
export const DRIPS = { perM: 6, speedMps: 5.5 } as const;
