// ORDER 332 D — kvarterens gränser efter gatorna (Kvarteren, konkurrensen och spellägena, etapp 1, avsnitt 7:
// "gränserna följer gatorna på kartan; Code ritar ett förslag och Anders godkänner det på en bild").
//
// Varje kvarter är en kedja av ben. Ett gatuben följer en vägs mittlinje i grythyttan-world.json (vägens id och
// namn) mellan två punkter; punkterna projiceras på vägen, så gränsen ligger exakt på gatans mittlinje. Där ingen
// gata finns går gränsen rakt (`gap`) och skälet står i benet: en gata som slutar några tiotal meter från nästa,
// eller kartans kant där byn tar slut (söder om sjön, öster om campus).
//
// Filen är ren (inga importer vid körning), så att scripts/order332-kvarteren.mjs kan importera den direkt med Nodes
// typborttagning och bygga samma polygoner som spelet. Spelets polygoner byggs i content/districts.ts med samma
// funktion (buildDistrictPolys) ur samma vägar (WORLD.roads, som är grythyttan-world.json:s vägar oförändrade).
//
// Kvarteren (avsnitt 7, tabellen; namnen ur D15 d15Strings.js quarter.*):
//   Torget                     — byns mitt: mellan Kyrkogatan och Östra Bergvägen, från Nygatan/Norra Bergvägen
//                                ned till Prästgatan och Torgets södra sida. Spelarens krog w869907975 och vagnens
//                                plats på Torget.
//   Studentkvarteret           — Prästgatans östra del (w122157689, studenternas sträcka med källaren w193810970 och
//                                vagnens plats) mellan Östra Bergvägen/Sjögatan och Lokavägen/Hälleforsvägen, norrut
//                                till Kolargatan. Avvikelse: avsnitt 7 nämner också Magasinsgatan, men Magasinsgatan
//                                på kartan (w287145645, w1329020064) ligger 300–400 m väster om Torget, långt från
//                                Prästgatan. Den är inte med; Anders avgör på bilden.
//   Gästgivaregården och kyrkan — söder om Torget och Prästgatan, innanför Kyrkbacken och Hammargatan (som går runt
//                                kyrkan w869907961) och ned till Lokavägen; österut till Sjögatan.
//   Campus och Måltidens hus   — öster om Hälleforsvägen (Rv 244): Kärnhuset, Måltidens hus, Kantin Hyttblecket och
//                                Grythytte Qvarn.
//   Vid sjön                   — söder om Lokavägen och väster om Rv 244/Rv 205 ned till stranden söder om sjön
//                                r8482507. I etapp 1 en plats för vagnen, inte ett kvarter med en krog.

import type { DistrictId } from '../../sim/districts';

export type Pt = readonly [number, number];

/** Ett ben i gränsen: längs en gata (mittlinjen mellan from och to), eller rakt till en punkt där ingen gata finns. */
export type BorderLeg =
  | { way: string; name: string; from: Pt; to: Pt }
  | { gap: string; to: Pt };

export interface DistrictBorder {
  legs: readonly BorderLeg[];
  /** Var kvarterets namn står på nivån Byn (byns meter). */
  labelAt: Pt;
}

// Punkterna är vägarnas korsningar (avrundade; de projiceras på vägen när polygonen byggs).
const J = {
  kyrkogatanSmedsgatan: [-29.0, -31.8], // Kyrkogatan/Smedsgatan/Kyrkbacken/Prästgatan
  kyrkogatanBend: [-32.3, -46.3],
  kyrkogatanNygatan: [-60.0, -164.0],
  nygatanVastraBerg: [22.0, -164.0],
  vastraNorraBerg: [8.0, -217.0],
  norraBergMid: [68.0, -226.0],
  norraOstraBerg: [105.0, -229.0],
  kolargatanOstraBerg: [156.0, -131.0],
  prastgatanOstraBerg: [150.0, 7.0],
  prastgatanJoin: [168.0, 11.0], // w1329020068 möter w122157689
  prastgatanSjogatan: [207.0, 19.0],
  sjogatanHammargatan: [213.0, 126.0],
  lokavagenSjogatan: [207.0, 196.0], // Lokavägens punkt rakt söder om Sjögatans ände
  lokavagenPrastgatan: [379.0, 51.0],
  rv244Lokavagen: [413.14, -7.01],
  rv244Kolargatan: [365.4, -67.2], // närmaste punkten på Rv 244 från Kolargatans ände
  kolargatanEnd: [348.0, -53.0],
  kolargatanBend: [312.0, -73.0],
  torgetPrastgatan: [58.0, 16.0],
  torgetEast: [47.0, 19.0], // Torget/Västra Bergvägen/Artur Lindqvists gata/Prästgatan
  torgetMid: [31.0, 21.0],
  torgetSmedsgatan: [-20.0, 27.0],
  lokavagenSmedsgatan: [14.0, 235.0],
  hammargatanSmedsgatan: [3.0, 175.0],
  hammargatanKyrkbacken: [-92.0, 30.0],
  rv244NorthFrame: [261.79, -196.15],
  rv244Bend: [513.38, 119.31],
  rv205Start: [525.0, 136.0],
  rv205South: [614.0, 324.0],
  lokavagenService: [127.18, 203.07],
  serviceBend: [105.94, 323.2]
} as const satisfies Record<string, Pt>;

export const DISTRICT_BORDERS: Record<DistrictId, DistrictBorder> = {
  torget: {
    legs: [
      { way: 'w1239628611', name: 'Kyrkogatan', from: J.kyrkogatanSmedsgatan, to: J.kyrkogatanBend },
      { way: 'w1239628612', name: 'Kyrkogatan', from: J.kyrkogatanBend, to: J.kyrkogatanNygatan },
      { way: 'w860753001', name: 'Nygatan', from: J.kyrkogatanNygatan, to: J.nygatanVastraBerg },
      { way: 'w122157687', name: 'Västra Bergvägen', from: J.nygatanVastraBerg, to: J.vastraNorraBerg },
      { way: 'w860753003', name: 'Norra Bergvägen', from: J.vastraNorraBerg, to: J.norraBergMid },
      { way: 'w1329020049', name: 'Norra Bergvägen', from: J.norraBergMid, to: J.norraOstraBerg },
      { way: 'w193810997', name: 'Östra Bergvägen', from: J.norraOstraBerg, to: J.prastgatanOstraBerg },
      { way: 'w1329020068', name: 'Prästgatan', from: J.prastgatanOstraBerg, to: J.torgetPrastgatan },
      { way: 'w122157691', name: 'Prästgatan', from: J.torgetPrastgatan, to: J.torgetEast },
      { way: 'w1329020067', name: 'Torget', from: J.torgetEast, to: J.torgetMid },
      { way: 'w122157685', name: 'Torget', from: J.torgetMid, to: J.torgetSmedsgatan },
      { way: 'w860753012', name: 'Smedsgatan', from: J.torgetSmedsgatan, to: J.kyrkogatanSmedsgatan }
    ],
    // Södra delen av torget: längre norrut ligger namnet under HUD:ens övre rad på nivån Byn (ORDER 332, kontrollen).
    labelAt: [100, -15]
  },
  student: {
    legs: [
      { way: 'w1329020068', name: 'Prästgatan', from: J.prastgatanOstraBerg, to: J.prastgatanJoin },
      { way: 'w122157689', name: 'Prästgatan', from: J.prastgatanJoin, to: J.prastgatanSjogatan },
      { way: 'w193810995', name: 'Sjögatan', from: J.prastgatanSjogatan, to: J.sjogatanHammargatan },
      { gap: 'Sjögatan slutar vid Hammargatan; rakt söderut 70 m till Lokavägen', to: J.lokavagenSjogatan },
      { way: 'w568472820', name: 'Lokavägen', from: J.lokavagenSjogatan, to: J.lokavagenPrastgatan },
      { way: 'w1329020070', name: 'Lokavägen', from: J.lokavagenPrastgatan, to: J.rv244Lokavagen },
      { way: 'w1006222227', name: 'Hälleforsvägen (Rv 244)', from: J.rv244Lokavagen, to: J.rv244Kolargatan },
      { gap: 'Kolargatan slutar 22 m från Hälleforsvägen; rakt till dess ände', to: J.kolargatanEnd },
      { way: 'w956968640', name: 'Kolargatan', from: J.kolargatanEnd, to: J.kolargatanBend },
      { way: 'w862853237', name: 'Kolargatan', from: J.kolargatanBend, to: J.kolargatanOstraBerg },
      { way: 'w193810997', name: 'Östra Bergvägen', from: J.kolargatanOstraBerg, to: J.prastgatanOstraBerg }
    ],
    // Söder om Kolargatan, under HUD:ens övre rad på nivån Byn.
    labelAt: [255, 15]
  },
  gastgivaregarden: {
    legs: [
      { way: 'w860753012', name: 'Smedsgatan', from: J.kyrkogatanSmedsgatan, to: J.torgetSmedsgatan },
      { way: 'w122157685', name: 'Torget', from: J.torgetSmedsgatan, to: J.torgetMid },
      { way: 'w1329020067', name: 'Torget', from: J.torgetMid, to: J.torgetEast },
      { way: 'w122157691', name: 'Prästgatan', from: J.torgetEast, to: J.torgetPrastgatan },
      { way: 'w1329020068', name: 'Prästgatan', from: J.torgetPrastgatan, to: J.prastgatanJoin },
      { way: 'w122157689', name: 'Prästgatan', from: J.prastgatanJoin, to: J.prastgatanSjogatan },
      { way: 'w193810995', name: 'Sjögatan', from: J.prastgatanSjogatan, to: J.sjogatanHammargatan },
      { gap: 'Sjögatan slutar vid Hammargatan; rakt söderut 70 m till Lokavägen', to: J.lokavagenSjogatan },
      { way: 'w568472820', name: 'Lokavägen', from: J.lokavagenSjogatan, to: J.lokavagenSmedsgatan },
      { way: 'w122157683', name: 'Smedsgatan', from: J.lokavagenSmedsgatan, to: J.hammargatanSmedsgatan },
      { way: 'w193810980', name: 'Hammargatan', from: J.hammargatanSmedsgatan, to: J.hammargatanKyrkbacken },
      { way: 'w860753009', name: 'Kyrkbacken', from: J.hammargatanKyrkbacken, to: J.kyrkogatanSmedsgatan }
    ],
    // Västra delen, mot kyrkan: vid [45, 120] täckte Grillvagnens och Torgkrogens skyltar namnet på nivån Byn
    // (reports/order332/kontroll/check.json, byn).
    labelAt: [-20, 150]
  },
  campus: {
    legs: [
      { way: 'w1006222227', name: 'Hälleforsvägen (Rv 244)', from: J.rv244NorthFrame, to: J.rv244Lokavagen },
      { way: 'w8122751', name: 'Hälleforsvägen (Rv 244)', from: J.rv244Lokavagen, to: J.rv244Bend },
      { way: 'w287145821', name: 'Lokavägen (Rv 205)', from: J.rv244Bend, to: J.rv205Start },
      { gap: 'kartans kant: byn slutar öster om campus', to: [660, 136] },
      { gap: 'kartans kant', to: [660, -196.15] },
      { gap: 'kartans kant norr om Kärnhuset', to: J.rv244NorthFrame }
    ],
    // Mot Måltidens hus, under HUD:ens övre rad på nivån Byn.
    labelAt: [560, -40]
  },
  sjon: {
    legs: [
      { way: 'w568472820', name: 'Lokavägen', from: J.lokavagenService, to: J.lokavagenPrastgatan },
      { way: 'w1329020070', name: 'Lokavägen', from: J.lokavagenPrastgatan, to: J.rv244Lokavagen },
      { way: 'w8122751', name: 'Hälleforsvägen (Rv 244)', from: J.rv244Lokavagen, to: J.rv244Bend },
      { way: 'w287145821', name: 'Lokavägen (Rv 205)', from: J.rv244Bend, to: J.rv205Start },
      { way: 'w1006216361', name: 'Lokavägen (Rv 205)', from: J.rv205Start, to: J.rv205South },
      { gap: 'kartans kant söder om sjön och reningsverket', to: [614, 350] },
      { gap: 'kartans kant söder om sjön', to: [105.94, 350] },
      { gap: 'kartans kant', to: J.serviceBend },
      { way: 'w869907956', name: 'servicevägen väster om sjön', from: J.serviceBend, to: J.lokavagenService }
    ],
    labelAt: [378, 270]
  }
};

export interface BorderRoad { id: string; poly: ReadonlyArray<readonly [number, number]> }

/** Var på polylinjen punkten ligger närmast: segmentets index och andelen längs segmentet. */
function locate(poly: ReadonlyArray<readonly [number, number]>, p: Pt): { i: number; t: number; d: number } {
  let best = { i: 0, t: 0, d: Infinity };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2));
    const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]);
    if (d < best.d) best = { i, t, d };
  }
  return best;
}

const at = (poly: ReadonlyArray<readonly [number, number]>, l: { i: number; t: number }): [number, number] => {
  const a = poly[l.i], b = poly[Math.min(poly.length - 1, l.i + 1)];
  return [a[0] + (b[0] - a[0]) * l.t, a[1] + (b[1] - a[1]) * l.t];
};

/** Mittlinjen mellan två punkter längs vägen (punkterna projicerade på vägen), i benets riktning. */
export function sliceRoad(poly: ReadonlyArray<readonly [number, number]>, from: Pt, to: Pt): { pts: [number, number][]; offRoadM: number } {
  const a = locate(poly, from), b = locate(poly, to);
  const fwd = a.i < b.i || (a.i === b.i && a.t <= b.t);
  const [s, e] = fwd ? [a, b] : [b, a];
  const pts: [number, number][] = [at(poly, s)];
  for (let i = s.i + 1; i <= e.i; i++) pts.push([poly[i][0], poly[i][1]]);
  pts.push(at(poly, e));
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);
  return { pts: fwd ? clean : clean.reverse(), offRoadM: Math.max(a.d, b.d) };
}

export interface BuiltDistrict {
  poly: [number, number][];
  labelAt: [number, number];
  /** Hur långt benens ändpunkter ligger från sin gata (m) — mätningen att gränsen följer gatan. */
  maxOffRoadM: number;
  /** Gränsens längd längs gator och rakt där ingen gata finns (m). */
  streetM: number;
  gapM: number;
}

/** Kvarterens polygoner ur vägarna. Kastar om en väg saknas. */
export function buildDistrictPolys(roads: readonly BorderRoad[], borders: Record<DistrictId, DistrictBorder> = DISTRICT_BORDERS): Record<DistrictId, BuiltDistrict> {
  const byId = new Map(roads.map((r) => [r.id, r]));
  const out = {} as Record<DistrictId, BuiltDistrict>;
  for (const [id, b] of Object.entries(borders) as [DistrictId, DistrictBorder][]) {
    const poly: [number, number][] = [];
    let maxOff = 0, streetM = 0, gapM = 0;
    const push = (p: [number, number]) => {
      const last = poly[poly.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-6) poly.push(p);
    };
    for (const leg of b.legs) {
      if ('way' in leg) {
        const road = byId.get(leg.way);
        if (!road) throw new Error(`districtBorders: ${id} saknar vägen ${leg.way} (${leg.name})`);
        const s = sliceRoad(road.poly, leg.from, leg.to);
        maxOff = Math.max(maxOff, s.offRoadM);
        const before = poly[poly.length - 1];
        if (before) gapM += Math.hypot(s.pts[0][0] - before[0], s.pts[0][1] - before[1]);
        for (let i = 1; i < s.pts.length; i++) streetM += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
        s.pts.forEach(push);
      } else {
        const before = poly[poly.length - 1];
        if (before) gapM += Math.hypot(leg.to[0] - before[0], leg.to[1] - before[1]);
        push([leg.to[0], leg.to[1]]);
      }
    }
    if (poly.length > 1 && Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 1e-6) poly.pop();
    else if (poly.length > 1) gapM += Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]);
    out[id] = { poly, labelAt: [b.labelAt[0], b.labelAt[1]], maxOffRoadM: maxOff, streetM, gapM };
  }
  return out;
}

export function pointInPoly(x: number, z: number, poly: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Kvarteret en punkt ligger i, eller null utanför kvarteren (byns utkanter). Ordningen avgör bara på en gräns. */
export function districtIn(polys: Record<DistrictId, { poly: ReadonlyArray<readonly [number, number]> }>, x: number, z: number): DistrictId | null {
  for (const id of Object.keys(polys) as DistrictId[]) if (pointInPoly(x, z, polys[id].poly)) return id;
  return null;
}
