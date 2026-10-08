// ORDER 319c (ORDRAR_319_D9.md punkt 5: "varje föremål på platsen finns med i layoutkontrollen, och ingenting står
// i vägen för gästernas gångvägar") — föremålen vid vagnen (Designs D9 truckProps.ts, villagePlaces.ts
// playerTruckPropShapes) mot vägarna figurerna går (truckGuestFlow.ts, torchRound.ts): gångvägen för de
// förbipasserande, kön (också under markisen i regnet), vägarna till ätplatserna och därifrån via sopkorgen,
// de nyfiknas väg till skylten och vidare, och medhjälparens runda med marschallerna. Och rundan: 42 s i
// Designs gångfart, med marschallerna i ordning.
//
//   WRITE_REPORTS=1 npx vitest run src/strategic/scene/__tests__/order319cPlatsen.test.ts → reports/order319c/platsen.json

import { describe, expect, it } from 'vitest';
import { playerTruckFootprints, playerTruckPlacement, playerTruckPropShapes, truckPlacement, TRUCK_BODY } from '../../content/villagePlaces';
import { CURIOUS_SPOTS, EAT_SPOTS, TRUCK_PROPS, WALKWAY, binPath, eatPath, leavePath } from '../truckProps';
import { TRUCK_LAYOUT } from '../playerTruck';
import { TRUCK_WEATHER } from '../truckWeather';
import { TORCH_ROUTE } from '../torchLighting';
import { torchIgniteTimes, torchRoundPose, torchRoundSpeed, clearRoundPose } from '../village/torchRound';
import { eatSpot } from '../village/truckGuestFlow';
import { TORCH, TRUCK_SEATING } from '../../../sim/balance';

type Vec2 = [number, number];

/** En figur är 0,4 m bred (personalSpace.ts PERSONAL_SPACE): vägen ska gå minst halva bredden från ett föremål. */
const CLEAR_M = 0.2;

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L2 = dx * dx + dz * dz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

function inside(p: Vec2, poly: Vec2[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

/** Kortaste avståndet från en sträcka till en polygon (0 om den skär den). */
function segPolyDist(a: Vec2, b: Vec2, poly: Vec2[]): number {
  if (inside(a, poly) || inside(b, poly)) return 0;
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    d = Math.min(d, segDist(p, a, b), segDist(q, a, b), segDist(a, p, q), segDist(b, p, q));
    // Skär sträckorna varandra?
    const cross = (o: Vec2, x: Vec2, y: Vec2) => (x[0] - o[0]) * (y[1] - o[1]) - (x[1] - o[1]) * (y[0] - o[0]);
    if (cross(a, b, p) * cross(a, b, q) < 0 && cross(p, q, a) * cross(p, q, b) < 0) return 0;
  }
  return d;
}

/** Vägarna figurerna går, i vagnens ram. `except` är föremålen vägen går till (den som äter vid sitt bord). */
function routes(): { name: string; pts: Vec2[]; except: string[] }[] {
  const out: { name: string; pts: Vec2[]; except: string[] }[] = [];
  out.push({ name: 'gångvägen', pts: WALKWAY, except: [] });
  out.push({ name: 'kön', pts: [TRUCK_LAYOUT.queue.order, ...TRUCK_LAYOUT.queue.line], except: [] });
  out.push({ name: 'kön i regnet', pts: [TRUCK_WEATHER.rain.queue.order as Vec2, ...(TRUCK_WEATHER.rain.queue.line as Vec2[])], except: [] });
  out.push({ name: 'till hämtplatsen', pts: [TRUCK_LAYOUT.queue.order, TRUCK_LAYOUT.queue.collect], except: [] });
  // Till varje ätplats: från hämtplatsen upp på däcket vid ingången och runt borden (truckGuestFlow.ts eatRoute).
  const keys = [...Object.keys(EAT_SPOTS.table), ...EAT_SPOTS.bench.map((_, i) => 'bench' + i), ...EAT_SPOTS.heater.map((_, i) => 'heat' + i), ...EAT_SPOTS.shelf.map((_, i) => 'shelf' + i)];
  for (const k of keys) {
    const s = eatSpot(k)!;
    const own = k.includes('-') ? ['stand table ' + k.split('-')[0]] : k.startsWith('bench') ? ['bench'] : k.startsWith('heat') ? ['heater'] : ['shelf'];
    out.push({ name: 'till ' + k, pts: eatPath(k, TRUCK_LAYOUT.queue.collect, s.at), except: own });
    // Därifrån till sopkorgen och ut på gångvägen åt båda hållen (truckGuestFlow.ts binPath, leaveRoute).
    out.push({ name: k + ' till sopkorgen', pts: binPath(k, s.at), except: [...own, 'bin'] });
  }
  out.push({ name: 'från sopkorgen västerut', pts: [TRUCK_PROPS.bin.approach, ...leavePath(false)], except: ['bin'] });
  out.push({ name: 'från sopkorgen österut', pts: [TRUCK_PROPS.bin.approach, ...leavePath(true)], except: ['bin'] });
  // De nyfikna: till skylten, vidare åt båda hållen och till köns sista plats.
  for (const side of ['west', 'east'] as const) out.push({ name: 'nyfiken från ' + side, pts: [CURIOUS_SPOTS.trigger[side], CURIOUS_SPOTS.readSpot], except: ['menu board'] });
  out.push({ name: 'nyfiken vidare', pts: [CURIOUS_SPOTS.walkOn.west, CURIOUS_SPOTS.readSpot, CURIOUS_SPOTS.walkOn.east], except: ['menu board'] });
  const last = TRUCK_LAYOUT.queue.line[TRUCK_LAYOUT.queue.line.length - 1];
  out.push({ name: 'nyfiken till kön', pts: [CURIOUS_SPOTS.readSpot, [last[0] + CURIOUS_SPOTS.joinVia[0], last[1] + CURIOUS_SPOTS.joinVia[1]], last], except: ['menu board'] });
  // Medhjälparen med marschallerna (Designs TORCH_ROUTE): varje sträcka får gå fram till sin marschall.
  TORCH_ROUTE.legs.forEach((l, i) => out.push({ name: 'marschallerna ' + (i + 1), pts: l.walk, except: l.light !== null ? ['torch ' + (l.light + 1)] : [] }));
  return out;
}

describe('ORDER 319c — föremålen vid vagnen och gångvägarna', () => {
  const props = playerTruckPropShapes();

  it('varje föremål på platsen är med i layoutkontrollen (onRoadAudit.ts), tolv sorter', () => {
    const names = props.map((p) => p.name);
    for (const k of ['stand table A', 'stand table B', 'stand table C', 'bench', 'heater', 'bin', 'shelf', 'menu board']) expect(names).toContain(k);
    expect(names.filter((n) => n.startsWith('torch'))).toHaveLength(TRUCK_PROPS.torch.at.length);
  });

  it('inget står i vägen: varje väg går minst en halv figurbredd från föremålen (utom det den går till)', async () => {
    const tight: { route: string; prop: string; m: number }[] = [];
    // Designs ätplatser som står närmare än en halv figurbredd från ett annat föremål än sitt (gästen står där,
    // går inte förbi): redovisas, men vägen dit prövas fram till en halv figurbredd före platsen.
    const spotsNear: { spot: string; prop: string; m: number }[] = [];
    const keys = [...Object.keys(EAT_SPOTS.table), ...EAT_SPOTS.bench.map((_, i) => 'bench' + i), ...EAT_SPOTS.heater.map((_, i) => 'heat' + i), ...EAT_SPOTS.shelf.map((_, i) => 'shelf' + i)];
    for (const k of keys) for (const p of props) {
      const own = k.includes('-') ? p.name === 'stand table ' + k.split('-')[0] : k.startsWith('bench') ? p.name === 'bench' : k.startsWith('heat') ? p.name === 'heater' : p.name === 'shelf';
      const at = eatSpot(k)!.at;
      const d = segPolyDist(at, at, p.poly);
      if (!own && d < CLEAR_M) spotsNear.push({ spot: k, prop: p.name, m: +d.toFixed(2) });
    }
    let min = Infinity;
    for (const r of routes()) for (const p of props) {
      if (r.except.includes(p.name)) continue;
      for (let i = 1; i < r.pts.length; i++) {
        let a = r.pts[i - 1], b = r.pts[i];
        // Sista biten fram till en ätplats, och första biten från den: en halv figurbredd kortare.
        const spotEnd = r.name.startsWith('till ') && i === r.pts.length - 1, spotStart = r.name.endsWith(' till sopkorgen') && i === 1;
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (spotEnd && L > CLEAR_M) b = [b[0] - ((b[0] - a[0]) / L) * CLEAR_M, b[1] - ((b[1] - a[1]) / L) * CLEAR_M];
        if (spotStart && L > CLEAR_M) a = [a[0] + ((b[0] - a[0]) / L) * CLEAR_M, a[1] + ((b[1] - a[1]) / L) * CLEAR_M];
        const d = segPolyDist(a, b, p.poly);
        min = Math.min(min, d);
        if (d < CLEAR_M) tight.push({ route: r.name, prop: p.name, m: +d.toFixed(2) });
      }
    }
    // Föremålen står inte i varandra, och ätplatserna står utanför föremålen.
    const overlaps: string[] = [];
    for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) {
      if (props[i].poly.some((q) => inside(q, props[j].poly)) || props[j].poly.some((q) => inside(q, props[i].poly))) overlaps.push(`${props[i].name} / ${props[j].name}`);
    }
    // Den andra rivalvagnen på torget står utanför spelarens kö och föremål (villagePlaces.ts SECOND_TRUCK_OFFSET_M).
    const at = playerTruckPlacement();
    const c = Math.cos(at.rotationY), s = Math.sin(at.rotationY);
    const toWorld = (p: Vec2): Vec2 => [at.x + p[0] * c + p[1] * s, at.z - p[0] * s + p[1] * c];
    const second = truckPlacement('torget', 1);
    const len = TRUCK_BODY.zMax - TRUCK_BODY.zMin;
    const mid = (TRUCK_BODY.zMax + TRUCK_BODY.zMin) / 2;
    const axis: Vec2[] = [-1, 1].map((k) => [second.x + Math.sin(second.rotationY) * (mid + (k * len) / 2), second.z + Math.cos(second.rotationY) * (mid + (k * len) / 2)] as Vec2);
    const playerPts: Vec2[] = [...props.flatMap((p) => p.poly).map(toWorld), ...playerTruckFootprints().deck, ...routes().filter((r) => !r.name.startsWith('marschallerna')).flatMap((r) => r.pts.map(toWorld))];
    const rivalGap = Math.min(...playerPts.map((p) => segDist(p, axis[0], axis[1]))) - TRUCK_BODY.width / 2;
    if (process.env.WRITE_REPORTS) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order319c');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'platsen.json'), JSON.stringify({
        definition: 'Föremålen vid spelarens vagn (villagePlaces.ts playerTruckPropShapes, Designs D9 truckProps.ts) mot vägarna figurerna går (order319cPlatsen.test.ts routes), i vagnens ram. minRouteToPropM: kortaste avståndet från en väg till ett föremål den inte går till; clearM: kravet (halv figurbredd). rivalTwoGapM: den andra rivalvagnen på torget (truckPlacement torget 1) till spelarens föremål, däck och vägar. torchRound: rundans tid, gångfarten och när marschallerna tänds (torchRound.ts).',
        clearM: CLEAR_M, minRouteToPropM: +min.toFixed(2), routes: routes().length, props: props.length, tight, overlaps, spotsNear,
        rivalTwoGapM: +rivalGap.toFixed(2),
        torchRound: { seconds: TORCH.roundSimSeconds, speedMps: +torchRoundSpeed(TORCH.roundSimSeconds).toFixed(2), igniteAt: torchIgniteTimes(TORCH.roundSimSeconds).map((x) => +x.toFixed(1)) }
      }, null, 2) + '\n');
    }
    expect(tight).toEqual([]);
    expect(overlaps).toEqual([]);
    expect(rivalGap).toBeGreaterThan(2);
  });

  it('rundan med marschallerna: TORCH.roundSimSeconds i Designs gångfart (1,3 m/s), kön först och sedan medsols, tillbaka i luckan', () => {
    const T = TORCH.roundSimSeconds;
    expect(torchRoundSpeed(T)).toBeGreaterThan(1.2);
    expect(torchRoundSpeed(T)).toBeLessThan(1.4);
    const ignite = torchIgniteTimes(T);
    expect(ignite).toHaveLength(TRUCK_PROPS.torch.at.length);
    for (let i = 1; i < ignite.length; i++) expect(ignite[i]).toBeGreaterThan(ignite[i - 1]);
    expect(ignite[ignite.length - 1]).toBeLessThan(T);
    const end = torchRoundPose(T, T).at;
    expect(Math.hypot(end[0] - TRUCK_LAYOUT.stations.hatch[0], end[1] - TRUCK_LAYOUT.stations.hatch[1])).toBeLessThan(0.01);
    // Vid varje tändning står medhjälparen vid sin marschall (Designs needs torch: 0,5–0,6 m bort).
    ignite.forEach((t, i) => {
      const p = torchRoundPose(t, T);
      expect(p.act).toBe('light');
      expect(Math.hypot(p.at[0] - TRUCK_PROPS.torch.at[i][0], p.at[1] - TRUCK_PROPS.torch.at[i][1])).toBeLessThan(0.65);
    });
  });

  it('städningen av ett bord: ut till bordet, torkar av det och tillbaka i luckan på TRUCK_SEATING.clearSimSeconds', () => {
    const T = TRUCK_SEATING.clearSimSeconds;
    for (const table of ['A', 'B', 'C'] as const) {
      const mid = clearRoundPose(table, T / 2, T);
      expect(mid.act).toBe('wipe');
      const t = TRUCK_PROPS.standTable.at[table];
      expect(Math.hypot(mid.at[0] - t[0], mid.at[1] - t[1])).toBeLessThan(0.7);
      const end = clearRoundPose(table, T, T).at;
      expect(Math.hypot(end[0] - TRUCK_LAYOUT.stations.hatch[0], end[1] - TRUCK_LAYOUT.stations.hatch[1])).toBeLessThan(0.01);
    }
  });
});
