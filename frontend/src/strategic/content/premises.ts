// ORDER 333 D — vinbarens lokaler i byns ram (Designs D15 kvarterPlatser.js VENUES; avsnitt 8 punkt 4). Vinbarens
// rum (scene/wineBarHouse.ts ROOM, 14,47 × 10,05 m och väggarna 0,2 m) står i lokalens hus med D15:s ram: C är rummets
// mitt och th vinkeln för lokalens x-axel (husets långa sida); världen = C + R(th)·lokal, som vagnens platser.
// door = väggen dörren sitter i enligt D15. Vinbarens entré (lokala +X i interiorLayout.ts) vänds dit.
// Koordinaterna är kartdata och står här, inte i src/sim/ (balance.test.ts).
// Avvikelser från D15, Anders beslut 2026-10-21 (rummet flyttas) och 2026-10-22 (ORDER 334 C: D15:s egna interiörer,
// källaren i gatuplan går bra):
//   - Vinbarens möblering (20 platser, köket, baren) står i alla lokaler; lokalens rum byggs runt den
//     (scene/premisesInterior.ts): D15:s mått, höjd, golv, väggar och det som ger karaktären.
//   - Källaren ligger i gatuplan, utan trappa ned.
//   - Salongen: vinbarens rum i östra änden (offsetX), D15:s salong med kakelugnen och soffgruppen i den västra.
//   - Flygeln: vinbarens rum i det glasade sydöstra hörnet (offsetX, offsetZ), resten av flygeln norr om det.
import type { PremisesId } from '../../sim/districts';

export interface PremisesFrame {
  id: PremisesId;
  building: string;
  C: readonly [number, number];
  th: number;
  door: 'north' | 'south' | 'east' | 'west';
  /** Vinbarens rum längs lokalens x från C (m): salongen är 29 m lång, och rummet står i änden mot dörren. */
  offsetX: number;
  /** ORDER 334 C — och tvärs (z): i Flygeln står rummet i det glasade sydöstra hörnet. */
  offsetZ: number;
  /** ORDER 334 C — D15:s rum i lokalens ram (kvarterPlatser.js VENUES room, glashörnets poly) och rumshöjden (ceilingM). */
  room: { x0: number; x1: number; z0: number; z1: number };
  poly?: readonly (readonly [number, number])[];
  ceilingM: number;
}

// Torget har ingen ram här: vinbaren står där den alltid stått (interiorLayout.ts, w869907975).
export const PREMISES_FRAMES: Record<Exclude<PremisesId, 'torget'>, PremisesFrame> = {
  kallaren: {
    id: 'kallaren', building: 'w193810970', C: [279.81, 50.42], th: 0.20957, door: 'north', offsetX: 0, offsetZ: 0,
    room: { x0: -7.36, x1: 7.36, z0: -4.87, z1: 4.92 }, ceilingM: 2.35
  },
  salongen: {
    id: 'salongen', building: 'w193810957', C: [116.72, 58.39], th: -1.61659, door: 'west', offsetX: 7.0, offsetZ: 0,
    room: { x0: -14.44, x1: 14.45, z0: -5.12, z1: 5.12 }, ceilingM: 4.2
  },
  // Rummet i sydöstra hörnet: det tänkta husets östra och södra kant (playerPremises.ts PREMISES_ROOM_OUTER, halva
  // 7,435 × 5,225 m) ligger på husets kant vid glaset (D15 outline x 8,25, z −8,67), 1,5 cm innanför.
  glashornet: {
    id: 'glashornet', building: 'w193810921', C: [427.75, -87.7], th: 0.90619, door: 'south', offsetX: 0.8, offsetZ: -3.43,
    room: { x0: -8.09, x1: 8.1, z0: -8.52, z1: 9.26 }, ceilingM: 3.6,
    poly: [[-8.1, 9.26], [-8.09, -8.52], [8.1, -8.52], [8.09, 7.76], [2.57, 7.76]]
  }
};

/** En punkt i lokalens ram i byns meter (D15: världen = C + R(th)·lokal). */
export function premisesToWorld(f: PremisesFrame, local: readonly [number, number]): [number, number] {
  const c = Math.cos(f.th), s = Math.sin(f.th);
  return [f.C[0] + c * local[0] - s * local[1], f.C[1] + s * local[0] + c * local[1]];
}
