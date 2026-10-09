// ORDER 323 §6 — gatorna: byns människor går med gångrörelse och stannar
// ibland; bilarna saktar in i korsningar och stannar vid övergångsställen;
// inget står stilla och glider.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { advanceGait, easeMoving, legSwing, STREET_GAIT } from '../scene/village/streetGait';
import { cruiseSpeed, routePace, routeStops, stopsAlong, targetSpeed, TRAFFIC_STOPS } from '../scene/trafficStops';
import { eligibleRoads } from '../scene/OsmTraffic';
import { polylineLength } from '../content/world';
import { walkCrossings } from '../content/villageNetwork';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(resolve(SRC, p), 'utf8');

describe('ORDER 323 §6 — gången', () => {
  it('benen svingar med sträckan, åt motsatta håll, och står raka i en paus', () => {
    const p = advanceGait(0, 0.35, 1, 1);
    expect(p).toBeCloseTo(0.35 / STREET_GAIT.cycleM, 6);
    expect(legSwing(p, -1, 1)).toBeCloseTo(-legSwing(p, 1, 1), 9);
    expect(Math.abs(legSwing(p, 1, 1))).toBeGreaterThan(0.2);
    expect(legSwing(p, 1, 0)).toBe(0);
    // Står figuren still går fasen inte vidare.
    expect(advanceGait(0.4, 0, 1, 0.016)).toBe(0.4);
    // Från gång till stillastående på under en halv sekund.
    let m = 1;
    for (let i = 0; i < 30; i++) m = easeMoving(m, false, 1 / 60);
    expect(m).toBeLessThan(0.1);
  });

  it('kadensen har ett tak (byns kvällsklocka går fort)', () => {
    expect(advanceGait(0, 50, 1, 0.1)).toBeCloseTo(STREET_GAIT.maxHz * 0.1, 9);
  });

  it('byns gående, kvällens sällskap och folket vid landmärkena: ben som svingar, pauser, ingen glidning', () => {
    const peds = read('scene/OsmPedestrians.tsx');
    expect(peds).toMatch(/legSwing\(w\.phase, side, w\.moving\)/);
    expect(peds).toMatch(/w\.pauseLeft = r\.range\(PAUSE_S\[0\], PAUSE_S\[1\]\)/);
    // Farten i meter per sekund, inte en andel av vägen.
    expect(peds).toMatch(/\(dt \* walkSpeed \* w\.forward\) \/ w\.len/);
    const life = read('scene/village/VillageLife.tsx');
    expect(life).toMatch(/legsL\.setMatrixAt\(fi, composeLeg\(/);
    expect(life).toMatch(/legsR\.setMatrixAt\(fi, composeLeg\(/);
    const gath = read('scene/LandmarkGatherers.tsx');
    expect(gath).not.toMatch(/a\.offX \+=/);
    expect(gath).not.toMatch(/a\.offZ \+=/);
  });
});

describe('ORDER 323 §6 — bilarna', () => {
  const roads = eligibleRoads('car');
  const all = roads.map((r) => ({ r, stops: stopsAlong(r) }));

  it('vägarna har korsningar och övergångsställen', () => {
    const junctions = all.reduce((a, x) => a + x.stops.filter((s) => s.kind === 'junction').length, 0);
    const crossings = all.reduce((a, x) => a + x.stops.filter((s) => s.kind === 'crossing').length, 0);
    expect(junctions).toBeGreaterThan(20);
    expect(crossings).toBeGreaterThan(5);
    for (const { r, stops } of all) for (const s of stops) {
      expect(s.s).toBeGreaterThan(0);
      expect(s.s).toBeLessThan(polylineLength(r.poly));
    }
  });

  it('saktar in före en korsning och stannar före ett övergångsställe där någon står', () => {
    const cruise = cruiseSpeed({ ...roads[0], maxspeed: 50 }, 1);
    const stops = [{ s: 100, kind: 'junction' as const, x: 0, z: 0 }, { s: 200, kind: 'crossing' as const, x: 0, z: 0 }];
    const free = targetSpeed(stops, 40, 1, 400, cruise, () => false);
    expect(free.v).toBeCloseTo(cruise, 6);
    const atJunction = targetSpeed(stops, 100, 1, 400, cruise, () => false);
    expect(atJunction.v).toBeLessThanOrEqual(Math.max(TRAFFIC_STOPS.minMps, cruise * TRAFFIC_STOPS.junctionShare) + 1e-9);
    const passEmpty = targetSpeed(stops, 199, 1, 400, cruise, () => false);
    expect(passEmpty.v).toBeGreaterThan(0);
    expect(passEmpty.v).toBeLessThan(cruise);
    const stop = targetSpeed(stops, 200 - TRAFFIC_STOPS.stopBeforeM, 1, 400, cruise, () => true);
    expect(stop.v).toBe(0);
    expect(stop.waiting?.kind).toBe('crossing');
    // Åt andra hållet gäller platserna framför bilen.
    expect(targetSpeed(stops, 110, -1, 400, cruise, () => false).v).toBeLessThan(cruise);
  });

  it('kvällens bilar: saktar in i svängarna och mot parkeringen, står vid ett övergångsställe där någon står', () => {
    const route: Array<[number, number]> = [[0, 0], [0, 100], [100, 100]];
    const stops = routeStops(route, [{ p: [50, 100], r: 2 }]);
    expect(stops.map((s) => s.kind)).toEqual(['junction', 'crossing']);
    expect(routePace(stops, 20, 200, () => false)).toBe(1);
    expect(routePace(stops, 95, 200, () => false)).toBeLessThan(0.5);
    expect(routePace(stops, 150 - TRAFFIC_STOPS.stopBeforeM, 200, () => true)).toBe(0);
    expect(routePace(stops, 199, 200, () => false)).toBeLessThan(0.35);
    expect(walkCrossings().length).toBeGreaterThan(0);
  });

  it('trafiken kör i meter per sekund mot platserna längs vägen (OsmTraffic)', () => {
    const src = read('scene/OsmTraffic.tsx');
    expect(src).toMatch(/targetSpeed\(v\.stops, at, v\.forward, v\.len, cruise,/);
    expect(src).toMatch(/v\.t \+= \(dt \* v\.v \* v\.forward\) \/ v\.len/);
  });
});
