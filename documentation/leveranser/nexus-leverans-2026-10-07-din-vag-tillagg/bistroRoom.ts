// bistroRoom.ts — bistrons rum inom husets mått. Tillägg till D7, 2026-10-07. Ersätter BISTRO i bistroRefit.ts.
//
// Huset w869907975 är 14,47 × 10,05 m. Rummet är lika stort som huset (väggarna 0,2 m inåt), dörren i östra
// väggen som förut och köket i väster. Koordinater i rummets ram som wineBarRoom.ts: x österut, z norrut, mitten i husets
// mitt (obb.centre). Prototypen ritar planen med y = −z.
//
// Under ombyggnaden krymper rummet från vinbarens 15,6 × 11,8 m till huset medan det töms (steget Tömt).
// Vinbarens rum är fortfarande större än huset. Det är inte ändrat här (kartkontrollen 2026-10-06 §1.3, Code avgör).
//
// Gångarna: minst 0,83 m mellan stolarnas kanter, 1,36 m i mittgången från dörren och 1,75 m fritt innanför dörren.

export type Vec2 = [number, number];

export const BISTRO_ROOM = { w: 14.47, d: 10.05, wall: 0.2, door: { wall: 'east', z0: -0.6, z1: 0.6 }, kitchenWallX: -4.6 };

export const BISTRO = {
  shelf: { x0: -2.85, x1: -2.45, z0: -4.6, z1: -1.8 },
  bar: { x0: -2.125, x1: -1.375, z0: -4.4, z1: -1.8 },
  stools: [-2.2, -3.0, -3.8].map((z) => [-0.95, z] as Vec2),
  pass: { x0: -4.65, x1: -4.15, z0: -0.4, z1: 2.6, heatLamps: [2.1, 1.1, 0.1] },
  kitchen: { range: { x0: -6.9, x1: -6.0, z0: -0.2, z1: 2.4 }, prep: { x0: -5.6, x1: -5.0, z0: 0.0, z1: 2.2 }, door: { z0: -4.425, z1: -3.425 } },
  banquette: { x0: -1.4, x1: 5.6, z0: 4.375, z1: 4.825 },
  banquetteTables: [-0.5, 1.1, 2.7, 4.3].map((x) => ({ at: [x, 3.85] as Vec2, w: 0.7, d: 0.6, seats: 2 })),
  fourTops: [[0.6, 1.25], [3.3, 1.25], [2.1, -2.0]].map((p) => ({ at: p as Vec2, w: 1.0, d: 1.0, seats: 4 })),
  twoTops: [[5.9, 1.25], [1.0, -4.1], [3.0, -4.1], [5.0, -4.1]].map((p) => ({ at: p as Vec2, w: 0.7, d: 0.7, seats: 2 })),
  hostDesk: [6.4, -1.3] as Vec2,
  /** Väntplatsen innanför dörren, två platser. Kön utanför är VENUE_OUTSIDE (kartkontrollen). */
  waitInside: [[5.6, -2.3], [6.3, -2.3]] as Vec2[]
};

export function bistroSeats(): number {
  return BISTRO.banquetteTables.length * 2 + BISTRO.fourTops.length * 4 + BISTRO.twoTops.length * 2 + BISTRO.stools.length; // 31
}

/** Vinbaren 20 → bistron 31. Tidigare förslag (D7) var 34 i ett rum som inte rymdes i huset. */
export const SEATS = { winebar: 20, bistro: 31, before: { bistroD7: 34 } };

/** Ombyggnaden: rummet krymper till husets mått under steget Tömt (p 0,5 → 1,0 i prototypen). */
export const FIT_TO_HOUSE = { fromPhase: 'cleared', blend: [0.5, 1.0], showHouseOutline: 'streckad i steget Vinbaren' };
