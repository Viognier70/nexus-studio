// ORDER 333 D — vinbarens lokaler i byns ram (Designs D15 kvarterPlatser.js VENUES; avsnitt 8 punkt 4). Vinbarens
// rum (scene/wineBarHouse.ts ROOM, 14,47 × 10,05 m och väggarna 0,2 m) står i lokalens hus med D15:s ram: C är rummets
// mitt och th vinkeln för lokalens x-axel (husets långa sida); världen = C + R(th)·lokal, som vagnens platser.
// door = väggen dörren sitter i enligt D15. Vinbarens entré (lokala +X i interiorLayout.ts) vänds dit.
// Koordinaterna är kartdata och står här, inte i src/sim/ (balance.test.ts).
// Avvikelser från D15, Anders beslut 2026-10-21 (rummet flyttas):
//   - Källaren får vinbarens rum i gatuplan, utan valv och trappa; D15:s källare (2,7 m under gatan, 0,45 m murar)
//     rymmer inte möbleringen (9,79 m mot 10,0 m, wineBarHouse.ts MIN_SIZE).
//   - Salongen och Flygeln får vinbarens rum, inte D15:s egna interiörer (ljuskronorna, glaset). De kommer senare.
import type { PremisesId } from '../../sim/districts';

export interface PremisesFrame {
  id: PremisesId;
  building: string;
  C: readonly [number, number];
  th: number;
  door: 'north' | 'south' | 'east' | 'west';
  /** Vinbarens rum längs lokalens x från C (m): salongen är 29 m lång, och rummet står i änden mot dörren. */
  offsetX: number;
}

// Torget har ingen ram här: vinbaren står där den alltid stått (interiorLayout.ts, w869907975).
export const PREMISES_FRAMES: Record<Exclude<PremisesId, 'torget'>, PremisesFrame> = {
  kallaren: { id: 'kallaren', building: 'w193810970', C: [279.81, 50.42], th: 0.20957, door: 'north', offsetX: 0 },
  salongen: { id: 'salongen', building: 'w193810957', C: [116.72, 58.39], th: -1.61659, door: 'west', offsetX: 7.0 },
  glashornet: { id: 'glashornet', building: 'w193810921', C: [427.75, -87.7], th: 0.90619, door: 'south', offsetX: 0 }
};

/** En punkt i lokalens ram i byns meter (D15: världen = C + R(th)·lokal). */
export function premisesToWorld(f: PremisesFrame, local: readonly [number, number]): [number, number] {
  const c = Math.cos(f.th), s = Math.sin(f.th);
  return [f.C[0] + c * local[0] - s * local[1], f.C[1] + s * local[0] + c * local[1]];
}
