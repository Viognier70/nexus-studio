// ORDER 319a.1 (Anders 2026-10-07) — "Ingen gäst får uppstå eller försvinna i bild. Gör ett test:
// ingen gäst skapas eller tas bort inom kamerans synfält vid nivå Z, eller närmare än 40 m från
// vagnen." En kväll i foodtrucken (harnessen, en tick = 0,2 s i normal fart) matas till samma flöde
// som PlayerTruckCrew.tsx ritar (scene/village/truckGuestFlow.ts), med krogens kamera ställd som i
// spelet (truckCamera.ts, CameraController applyCameraState) i 16:9 och 4:3.
//
//   WRITE_REPORTS=1 npx vitest run src/strategic/testHarness/__tests__/order319aGaster.test.ts
// skriver reports/order319a/gaster.json.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { playMorning, startInFoodtruck, tickUntil, type MorningPlan } from '../weekHarness';
import { reducer } from '../../simulation/reducer';
import { firstDayOfWeek } from '../../../sim/calendar';
import { PLAYERS } from '../randomness';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { applyCameraState } from '../../camera/CameraController';
import { truckCameraState } from '../../scene/village/truckCamera';
import { TRUCK_GUESTS, TruckGuestFlow, toWorld, type FlowEvent } from '../../scene/village/truckGuestFlow';
import { THEATRE } from '../../../sim/balance';
import { TRUCK_DELIVERY_STOP, pathLength, truckDeliveryPath } from '../../scene/village/truckDelivery';

const TICK_S = 0.2;
const FIGURE_TOP_M = 1.7;
// Framme: högst ett steg i kön från sin plats (kön flyttar sig hela tiden).
const NEAR_M = 1.5;

function zFrustums(): THREE.Frustum[] {
  const at = playerTruckPlacement();
  return [16 / 9, 4 / 3].map((aspect) => {
    const cam = new THREE.PerspectiveCamera(42, aspect, 2, 5000);
    applyCameraState(cam, truckCameraState(at));
    cam.updateMatrixWorld();
    return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  });
}

describe('ORDER 319a.1 — gästerna vid vagnen kommer och går utanför bild', () => {
  it('en kväll: varje gäst börjar och slutar minst 40 m bort och utanför krogens bild', async () => {
    const at = playerTruckPlacement();
    const frustums = zFrustums();
    const p = new THREE.Vector3();
    const inView = (x: number, z: number) => frustums.some((f) => [0, FIGURE_TOP_M].some((y) => f.containsPoint(p.set(x, y, z))));
    // Kameran ser vagnen (annars prövar testet ingenting).
    expect(inView(at.x, at.z)).toBe(true);
    const flow = new TruckGuestFlow(at, inView, 8);
    const events: FlowEvent[] = [];
    let ticks = 0;
    let lagTicks = 0;
    let atHatchTicks = 0;
    let cueTicks = 0;
    let cueSettled = 0;
    const plan: MorningPlan = { scenarioAnswer: 'best', ladder: 'never' };
    let s = startInFoodtruck(2, firstDayOfWeek(1));
    s = { ...s, medals: { ...PLAYERS.baseline } };
    tickUntil(reducer(playMorning(s, plan), { type: 'START_SERVICE' }), (x) => {
      events.push(...flow.update(x.guests, x.waitingIds, TICK_S));
      ticks++;
      // Hur ofta gästen vid luckan i simuleringen ännu inte är framme i bild.
      for (const g of x.guests) if (g.state === 'ordering') { atHatchTicks++; if (!flow.walkers.get(g.id)?.settled) lagTicks++; }
      // ORDER 319a.4 — står gästen som pekar vid luckan i bild under förvarningen?
      const a = x.incidents?.active;
      if (a?.cue === 'guestAtHatch' && (a.introLeft ?? 0) > 0 && (a.introLeft ?? 0) <= THEATRE.rocketIntroSeconds.askPointMenu && a.context.figure?.guestId) { cueTicks++; const w = flow.walkers.get(a.context.figure.guestId); if (w?.spot && Math.hypot(w.x - w.spot.x, w.z - w.spot.z) < NEAR_M) cueSettled++; }
      return x.day.period === 'evening' || x.day.period === 'morning';
    });
    // Efter stängningen går de sista därifrån.
    for (let i = 0; i < 3000 && flow.walkers.size > 0; i++) events.push(...flow.update([], [], TICK_S));
    expect(flow.walkers.size).toBe(0);
    const spawns = events.filter((e) => e.kind === 'spawn');
    const despawns = events.filter((e) => e.kind === 'despawn');
    expect(spawns.length).toBeGreaterThan(10);
    expect(despawns.length).toBe(spawns.length);
    // ORDER 319a.4 — gästen som pekar står vid luckan under hela förvarningen.
    expect(cueTicks).toBeGreaterThan(0);
    expect(cueSettled).toBe(cueTicks);
    const d = (e: FlowEvent) => Math.hypot(e.x - at.x, e.z - at.z);
    for (const e of events) {
      expect(d(e)).toBeGreaterThanOrEqual(TRUCK_GUESTS.minSpawnM);
      expect(inView(e.x, e.z)).toBe(false);
    }
    if (process.env.WRITE_REPORTS) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order319a');
      mkdirSync(dir, { recursive: true });
      const ds = events.map(d);
      writeFileSync(resolve(dir, 'gaster.json'), JSON.stringify({
        definition: 'En kväll i foodtrucken (seed 2, startInFoodtruck, rätt svar), harnessens tick = 0,2 s i normal fart, matad till scene/village/truckGuestFlow.ts. inView = krogens kamera (truckCamera.ts via CameraController applyCameraState, 42°) i 16:9 och 4:3, fötter och huvud. lagShare = andelen tick då gästen som beställer i simuleringen ännu inte står vid luckan i bild. cueSettledShare = andelen av tick då gästen pekar (guestAtHatch, 0 < introLeft ≤ askPointMenu) då gästen som pekar är högst NEAR_M (1,5 m, ett steg i kön) från sin plats.',
        ticks, spawns: spawns.length, despawns: despawns.length,
        minDistanceM: +Math.min(...ds).toFixed(1), inViewEvents: events.filter((e) => inView(e.x, e.z)).length,
        lagShare: +(lagTicks / Math.max(1, atHatchTicks)).toFixed(3),
        cueTicks, cueSettledShare: +(cueSettled / Math.max(1, cueTicks)).toFixed(3)
      }, null, 2) + '\n');
    }
  }, 600000);

  // ORDER 319a.4 — leveransbilen börjar och slutar (samma väg ut) minst 40 m bort och utanför bilden,
  // och stannar på gatan nära vagnen.
  it('leveransbilen kör in från minst 40 m utanför bild och stannar vid vagnen', () => {
    const at = playerTruckPlacement();
    const frustums = zFrustums();
    const p = new THREE.Vector3();
    const inView = (x: number, z: number) => frustums.some((f) => [0, 2].some((y) => f.containsPoint(p.set(x, y, z))));
    const path = truckDeliveryPath(at, inView);
    const [x0, z0] = path[0];
    expect(Math.hypot(x0 - at.x, z0 - at.z)).toBeGreaterThanOrEqual(TRUCK_GUESTS.minSpawnM);
    expect(inView(x0, z0)).toBe(false);
    const [xe, ze] = path[path.length - 1];
    const want = toWorld(at, TRUCK_DELIVERY_STOP[0], TRUCK_DELIVERY_STOP[1]);
    const stopOffM = Math.hypot(xe - want[0], ze - want[1]);
    expect(pathLength(path)).toBeGreaterThanOrEqual(TRUCK_GUESTS.minSpawnM);
    expect(stopOffM).toBeLessThan(0.01);
    // Leveransen syns när den kommer fram.
    expect(inView(xe, ze)).toBe(true);
  });
});
