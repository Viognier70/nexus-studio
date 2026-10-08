// ORDER 319b (Anders 2026-10-08) — "Trängseln: använd personalSpace.ts vid vagnen OCH i vinbaren och
// bistron (där med bara att väja och knuffas isär). Lägg till ett test att ingen gäst eller personal
// kommer närmare en annan än 0,35 m i någon verksamhet."
//
// Varje verksamhet körs en hel kväll i simuleringen (harnessen, tick 0,2 s) och matas till samma kod som
// scenerna ritar med:
//   - foodtrucken: scene/village/truckGuestFlow.ts (gästerna och de nyfikna, väja, hålla till höger,
//     knuffas isär; `shown` är där PlayerTruckCrew.tsx ritar figurerna). Spelaren pratar med de nyfikna
//     och svarar rätt, så att de ställer sig i kön. Personalen i vagnen räknas inte (Designs regel).
//   - vinbaren och bistron: rummets regissör (WineBarFigures.tsx createRoomDirector) och samma
//     PersonalSpace som WineBarFigures.tsx lägger på efter regissören (väja och knuffas isär), med samma
//     massa (roomMass). Gästerna som sitter står på sin stol och flyttas inte (pinned).
// Mätt mellan figurernas mittpunkter i varje tick, alla par av synliga figurer. Utdata (WRITE_REPORTS=1):
// reports/order319b/trangseln.json, med avståndet före trängseln (vägens punkter) och efter.

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { answerScenario, playMorning, startInFoodtruck } from '../../testHarness/weekHarness';
import { reducer } from '../../simulation/reducer';
import { makeNewGameState } from '../../simulation/model';
import { firstDayOfWeek } from '../../../sim/calendar';
import { curiousOf, curiousTalkable } from '../../../sim/curious';
import { curiousQuestion } from '../../../sim/curiousBank';
import { playerTruckPlacement } from '../../content/villagePlaces';
import { applyCameraState } from '../../camera/CameraController';
import { truckCameraState } from '../village/truckCamera';
import { TruckGuestFlow } from '../village/truckGuestFlow';
import { createWineBarRoom } from '../wineBarRoom';
import { setFlowLayout } from '../serviceFlow';
import { createRoomDirector, roomMass } from '../WineBarFigures';
import { PersonalSpace, type SpaceBody } from '../personalSpace';
import type { SimulationState } from '../../types';

const MIN_M = 0.35;
const TICK_S = 0.2;
const MAX_TICKS = 40000;

interface Reading { business: string; ticks: number; pairs: number; rawMinM: number; minM: number; rawBelow: number; below: number }

function pairs(ps: ReadonlyArray<[number, number]>, onPair: (d: number) => void): void {
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) onPair(Math.hypot(ps[i][0] - ps[j][0], ps[i][1] - ps[j][1]));
}

function reading(business: string): Reading {
  return { business, ticks: 0, pairs: 0, rawMinM: Infinity, minM: Infinity, rawBelow: 0, below: 0 };
}

function count(r: Reading, raw: ReadonlyArray<[number, number]>, shown: ReadonlyArray<[number, number]>): void {
  r.ticks++;
  pairs(raw, (d) => { r.rawMinM = Math.min(r.rawMinM, d); if (d < MIN_M) r.rawBelow++; });
  pairs(shown, (d) => { r.pairs++; r.minM = Math.min(r.minM, d); if (d < MIN_M) r.below++; });
}

function truckEvening(seed: number): Reading {
  const at = playerTruckPlacement();
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 2, 5000);
  applyCameraState(cam, truckCameraState(at));
  cam.updateMatrixWorld();
  const f = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const p = new THREE.Vector3();
  const flow = new TruckGuestFlow(at, (x, z) => [0, 1.7].some((y) => f.containsPoint(p.set(x, y, z))), 8);
  const r = reading('foodtruck');
  let s: SimulationState = reducer(playMorning(startInFoodtruck(seed, firstDayOfWeek(1)), { scenarioAnswer: 'best', ladder: 'never' }), { type: 'START_SERVICE' });
  for (let i = 0; i < MAX_TICKS && s.day.period === 'dinner'; i++) {
    s = answerScenario(reducer(s, { type: 'TICK', dt: TICK_S }), 'best');
    const c = curiousOf(s).current;
    if (c && curiousTalkable(s) && c.real >= 3) s = reducer(s, { type: 'CURIOUS_OPEN' });
    const card = curiousOf(s).current?.card;
    if (card) s = reducer(s, { type: 'CURIOUS_ANSWER', optionId: curiousQuestion(card.questionId)!.options.find((o) => o.quality === 'right')!.id });
    const cq = s.day.curious;
    flow.update(s.guests, s.waitingIds, TICK_S, cq ? { current: cq.current, last: cq.last } : null);
    const raw = [...flow.walkers.values()].map((w) => [w.x, w.z] as [number, number]);
    count(r, raw, [...flow.shown.values()]);
  }
  return r;
}

function roomEvening(layout: 'winebar' | 'bistro', seed: number): Reading {
  setFlowLayout(layout);
  const room = createWineBarRoom({ layout });
  const d = createRoomDirector(room);
  const space = new PersonalSpace();
  const r = reading(layout === 'winebar' ? 'vinbaren' : 'bistron');
  let s = makeNewGameState(seed);
  s = { ...s, day: { ...s.day, dayNumber: firstDayOfWeek(2) + 3 } };
  if (layout === 'bistro') s = { ...s, ladder: { step: 'bistro', reachedOnDay: {}, offer: null } as SimulationState['ladder'] };
  s = reducer(playMorning(s, {}), { type: 'START_SERVICE' });
  for (let i = 0; i < MAX_TICKS && s.day.period === 'dinner'; i++) {
    s = answerScenario(reducer(s, { type: 'TICK', dt: TICK_S }), 'best');
    d.update({ t: s.simTime, guests: s.guests, patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover: null });
    const bodies: SpaceBody[] = [];
    d.guestSamples.forEach((g, k) => { if (g.visible) bodies.push({ key: g.guestId ?? `g${k}`, x: g.x, z: g.z, kind: roomMass(g, false), pinned: g.seated }); });
    d.staffSamples.forEach((g, k) => { if (g.visible) bodies.push({ key: `staff${k}`, x: g.x, z: g.z, kind: roomMass(g, true) }); });
    const shown = space.step(bodies, TICK_S / Math.max(1, s.speed));
    count(r, bodies.map((b) => [b.x, b.z]), bodies.map((b) => shown.get(b.key)!));
  }
  setFlowLayout('winebar');
  return r;
}

describe('ORDER 319b — trängseln: ingen gäst eller personal närmare en annan än 0,35 m', () => {
  const out: Reading[] = [];
  it('foodtrucken, med de nyfikna', () => {
    for (const seed of [1, 2]) out.push(truckEvening(seed));
    for (const r of out.filter((x) => x.business === 'foodtruck')) { expect(r.pairs).toBeGreaterThan(1000); expect(r.below).toBe(0); }
  }, 300000);
  it('vinbaren och bistron', async () => {
    for (const seed of [3, 4]) { out.push(roomEvening('winebar', seed)); out.push(roomEvening('bistro', seed)); }
    if (process.env.WRITE_REPORTS) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order319b');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'trangseln.json'), JSON.stringify({
        definition: 'En kväll per frö och verksamhet i simuleringen (tick 0,2 s). minM: det minsta avståndet mellan två synliga figurers mittpunkter där scenen ritar dem (foodtrucken: truckGuestFlow.ts shown; rummen: regissörens punkter efter PersonalSpace som i WineBarFigures.tsx). rawMinM: samma utan trängseln (vägens punkter). below/rawBelow: antal par-tick under 0,35 m.',
        minM: MIN_M, readings: out.map((r) => ({ ...r, rawMinM: +r.rawMinM.toFixed(3), minM: +r.minM.toFixed(3) }))
      }, null, 2) + '\n');
    }
    for (const r of out.filter((x) => x.business !== 'foodtruck')) { expect(r.pairs).toBeGreaterThan(1000); expect(r.below).toBe(0); }
  }, 600000);
});
