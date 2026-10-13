// ORDER 332 D — gästerna på gatan per kvarter (avsnitt 7: "olika gäster på gatorna"; Designs D15 §3).
//
// Vilka gående som går i ett kvarter och hur de rör sig. Andelarna, antalen, farten och sällskapens storlek står i
// balance.ts DISTRICT_STREET (D15 STREET_MIX, LAKE_MODES och d15Manus.js streetWalkers). OsmPedestrians.tsx läser
// funktionerna här:
//   - byns gående (det gamla lagret) tar sin grupp ur andelarna i kvarteret där de går och byter bara väg inom
//     kvarteret (streetGroupAt, pickFromMix);
//   - kvarterets eget lager: districtParties ger sällskapen (studenterna i grupper om tre med ryggsäck, var fjärde
//     med bråttom; turisterna långsamt och stannar och tittar; gourmeterna i par; konferensfolket i par som pratar;
//     vid sjön en vuxen och ett barn hand i hand), och districtLanes gångplatserna de går på (byns gångnät, samma
//     routeBetween/sidewalkOffsets/walkerPoint som VillageLife, med trottoarens avstånd ur renderingen).
// Simuleringens gäster per krog ändras inte; det här är bara det som syns på gatan.

import { DISTRICT_STREET, DISTRICTS, type StreetGroupKey } from '../../../sim/balance';
import { calendarFor } from '../../../sim/calendar';
import { truckOf } from '../../../sim/truckLife';
import { DISTRICT_IDS, type DistrictId } from '../../../sim/districts';
import type { SimulationState } from '../../types';
import { DISTRICT_AREAS, districtAt } from '../../content/districts';
import { pointInPoly } from '../../content/districtBorders';
import { routeBetween, routeLength, sidewalkOffsets, walkerPoint, walkNetwork } from '../../content/villageNetwork';
import { createRng } from '../../util/rng';
import type { GuestGroupId } from '../guestGroups';

export type LakeMode = 'autumnWeekday' | 'summerWeekend';

/** Sjöns läge i kväll (D15 LAKE_MODES): sommarhelgen när sjön är öppen, dagen en helgdag och det inte regnar. */
export function lakeModeFor(state: Pick<SimulationState, 'day' | 'seed' | 'prov'>): LakeMode {
  const cal = calendarFor(state.day.dayNumber);
  const open = DISTRICTS.list.sjon.openWeeks?.includes(cal.week) ?? true;
  const busy = DISTRICT_STREET.lake.busyWeekdays.includes(cal.weekday);
  const rain = truckOf(state).weather === 'rain';
  return open && busy && !rain ? 'summerWeekend' : 'autumnWeekday';
}

/** Antalet i kvarterets eget lager (D15: en post per sällskapsmedlem, en familj är en post med ett barn). */
export function districtWalkerCount(d: DistrictId, mode: LakeMode): number {
  return d === 'sjon' ? DISTRICT_STREET.lake[mode].walkers : DISTRICT_STREET.walkers[d];
}

export function streetMixOf(d: DistrictId | null): Partial<Record<StreetGroupKey, number>> | null {
  return d ? DISTRICT_STREET.mix[d] : null;
}

/** En grupp ur andelarna, r i [0, 1). */
export function pickFromMix(mix: Partial<Record<StreetGroupKey, number>>, r: number): StreetGroupKey {
  const e = Object.entries(mix) as [StreetGroupKey, number][];
  const total = e.reduce((a, [, v]) => a + v, 0);
  let x = r * total;
  for (const [k, v] of e) { if (x < v) return k; x -= v; }
  return e[e.length - 1][0];
}

/** Gruppen för en gående i byns lager som går i punkten: kvarterets andelar, eller null utanför kvarteren. Familjen
 *  (bara vid sjön, där byns lager inte går) blir en bybo. */
export function streetGroupAt(x: number, z: number, r: number): GuestGroupId | null {
  const mix = streetMixOf(districtAt(x, z));
  if (!mix) return null;
  const g = pickFromMix(mix, r);
  return g === 'family' ? 'villager' : g;
}

/** Grupperna ur kvarterets andelar, n stycken, största resten först och sedan blandade (D15 pickGroups). */
export function pickStreetGroups(mix: Partial<Record<StreetGroupKey, number>>, n: number, seed: number): StreetGroupKey[] {
  const raw = (Object.entries(mix) as [StreetGroupKey, number][]).map(([k, v]) => [k, v * n] as const);
  const out: StreetGroupKey[] = [];
  raw.forEach(([k, v]) => { for (let i = 0; i < Math.floor(v); i++) out.push(k); });
  raw.slice().sort((a, b) => (b[1] % 1) - (a[1] % 1)).forEach(([k]) => { if (out.length < n) out.push(k); });
  const rng = createRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface StreetMember {
  /** D5-gruppen (tecknet och färgerna), eller 'child' för barnet i familjen. */
  group: GuestGroupId | 'child';
  /** Avstånd åt sidan från sällskapets mitt, meter (bredvid varandra). */
  lateral: number;
  /** Storleken mot en vuxen (barnet DISTRICT_STREET.style.childSizeK, D12:s hm). */
  sizeK: number;
  /** Före sällskapets mitt i gångriktningen, meter (barnet, D12 CHILD_AHEAD). */
  aheadM: number;
}

export interface StreetParty {
  district: DistrictId;
  group: StreetGroupKey;
  members: StreetMember[];
  speedMps: number;
  hurried: boolean;
  /** Turisterna stannar och tittar. */
  stopLook: boolean;
  /** Paret vänder sig mot varandra när det står (konferensfolket pratar). */
  talk: boolean;
}


/** Kvarterets sällskap: n poster ur andelarna, i sällskap efter D15 (studenter upp till tre, gourmeter och
 *  konferensfolk i par, familjen en vuxen och ett barn, de andra ensamma). */
export function districtParties(d: DistrictId, n: number, seed: number): StreetParty[] {
  const mix = DISTRICT_STREET.mix[d];
  const groups = pickStreetGroups(mix, n, seed);
  const rng = createRng((seed * 31 + 7) >>> 0);
  const S = DISTRICT_STREET.style;
  const out: StreetParty[] = [];
  let gi = 0;
  while (gi < groups.length) {
    const g = groups[gi];
    const size = g === 'family' ? 1 : Math.min(S.partySize[g], groups.length - gi);
    const hurried = g === 'student' && rng.next() < S.studentHurriedShare;
    const members: StreetMember[] = g === 'family'
      ? [{ group: 'villager', lateral: -S.childSideM / 2, sizeK: 1, aheadM: 0 }, { group: 'child', lateral: S.childSideM / 2, sizeK: S.childSizeK, aheadM: S.childAheadM }]
      : Array.from({ length: size }, (_, m) => ({ group: g, lateral: (m - (size - 1) / 2) * S.abreastM, sizeK: 1, aheadM: 0 }));
    out.push({
      district: d, group: g, members,
      speedMps: hurried ? S.studentHurriedMps : S.speedMps[g],
      hurried, stopLook: g === 'tourist', talk: g === 'business' && size > 1
    });
    gi += size;
  }
  return out;
}

type V2 = [number, number];
const laneCache = new Map<string, V2[][]>();

/** Gångplatser i kvarteret: rutter i byns gångnät mellan två noder i kvarteret, som polylinjer på trottoaren
 *  (walkerPoint med gångplatsens avstånd ur renderingen, höger sida i gångriktningen). */
export function districtLanes(d: DistrictId, count = 12, seed = 0x332d): V2[][] {
  const key = `${d}:${count}:${seed}`;
  const hit = laneCache.get(key);
  if (hit) return hit;
  const g = walkNetwork();
  const poly = DISTRICT_AREAS[d].poly;
  const inside: number[] = [];
  g.nodes.forEach((p, i) => { if (g.main[i] && pointInPoly(p[0], p[1], poly)) inside.push(i); });
  const rng = createRng(seed ^ (DISTRICT_IDS.indexOf(d) * 2654435761));
  const out: V2[][] = [];
  for (let tries = 0; inside.length > 1 && out.length < count && tries < count * 8; tries++) {
    const a = inside[Math.floor(rng.next() * inside.length)];
    const b = inside[Math.floor(rng.next() * inside.length)];
    if (a === b) continue;
    const route = routeBetween(g, a, b);
    const L = routeLength(route);
    if (route.length < 2 || L < 40 || L > 400) continue;
    const offs = sidewalkOffsets(route);
    const pts: V2[] = [];
    for (let s = 0; s <= L; s += 1) {
      const p = walkerPoint(route, offs, s, -1);
      pts.push([p.x, p.z]);
    }
    // Rutten får gå utanför kvarteret en bit (gatan runt hörnet), men mest inne i det.
    const inShare = pts.filter((p) => pointInPoly(p[0], p[1], poly)).length / pts.length;
    if (inShare >= 0.7) out.push(pts);
  }
  laneCache.set(key, out);
  return out;
}
