// ORDER 332 C och G (synliga halvan) — Grillstugan (Designs D13) ersätter D7:s släpvagn, markisen över kön är ett köp i
// butiken och syns bara när den är köpt, kön i regn med och utan markisen, vagnen och kön på de fem platserna (D15),
// rivalernas vagnar utanför spelarens vagn och kö, och tålamodet i kön i regnet i simuleringen.

import { describe, expect, it } from 'vitest';
import { playMorning, startInFoodtruck } from '../../testHarness/weekHarness';
import { reducer } from '../../simulation/reducer';
import { makeGuest } from '../../simulation/model';
import { firstDayOfWeek } from '../../../sim/calendar';
import { EQUIPMENT, RAIN_QUEUE_BALANCE, TRUCK_WEATHER, VILLAGE } from '../../../sim/balance';
import { equipmentForBusiness, queueAwningOwned } from '../../../sim/goods';
import { rainExposedInQueue, rainQueueLeaver, rainQueuePatience, truckOf, truckRaining, type TruckDayState } from '../../../sim/truckLife';
import { TRUCK_SPOT_IDS, spotToWorld, truckSpotPlacement } from '../../../sim/districts';
import { applyStuganState, makePlayerTrailer, stuganOf, stuganStateFor, TRUCK_LAYOUT } from '../playerTruck';
import { STUGAN, shelterTop, stuganShelters } from '../grillstugan';
import { RAIN_QUEUE, rainQueueDryInLine } from '../truckRain';
import { queueInForce, queueLineAt, toWorld } from '../village/truckGuestFlow';
import { playerTruckPlacement, rivalTruckPlacement, PLAYER_TRUCK_PITCH } from '../../content/villagePlaces';
import { auditTrucks, rivalFootprint } from '../onRoadAudit';
import { polygonsOverlap } from '../../content/roadSurface';
import { inTruckSpotBox, truckSpotBoxCentre } from '../../content/villagePlaces';
import { TREE_CROWN_M, streetTreeInstances } from '../StreetTrees';
import { clearOfTruck } from '../LandmarkGatherers';
import { LANDMARK_BY_ID } from '../../content/world';
const WORLD_LANDMARKS = Object.values(LANDMARK_BY_ID);
import { grillTruckAtTorget } from '../../../sim/truckSituations';
import type { SimulationState } from '../../types';

type V = [number, number];
const TICK = { type: 'TICK', dt: 0.2 } as const;

function evening(seed = 1): SimulationState {
  return reducer(playMorning(startInFoodtruck(seed, firstDayOfWeek(1)), { scenarioAnswer: 'best', ladder: 'never' }), { type: 'START_SERVICE' });
}
function raining(s: SimulationState): SimulationState {
  const t = truckOf(s);
  const truck: TruckDayState = { ...t, weather: 'rain', rainFromE: 0 };
  return { ...s, day: { ...s.day, truck } };
}
function withAwning(s: SimulationState, on: boolean): SimulationState {
  return { ...s, equipment: on ? ['queueAwning'] : [] };
}
/** Fyll kön med n väntande gäster (de enda i kön). */
function withQueue(s: SimulationState, n: number): SimulationState {
  const guests = Array.from({ length: n }, () => ({ ...makeGuest(s.simTime), state: 'waiting' as const, stateTime: s.simTime }));
  return { ...s, guests: [...s.guests.filter((g) => g.state !== 'waiting'), ...guests], waitingIds: guests.map((g) => g.id) };
}

describe('ORDER 332 C — Grillstugan och markisen', () => {
  it('vagnen är Grillstugan: stationerna och golvet ur D13, inga D7-delar kvar', () => {
    const tr = makePlayerTrailer();
    expect(stuganOf(tr)).not.toBeNull();
    expect(tr.getObjectByName('grillstugan')).toBeTruthy();
    for (const n of ['trailerAwning', 'trailerScallop0', 'trailerEndBack', 'trailerHatchShelf']) expect(tr.getObjectByName(n)).toBeUndefined();
    for (const n of ['fridgeCabinet', 'menuStand', 'powerPost', 'stuganFlap', 'payLedge', 'terminal', 'terminalRing', 'trailerGrillDivider', 'sausageBox', 'trailerBinFlap']) expect(tr.getObjectByName(n)).toBeTruthy();
    expect(TRUCK_LAYOUT.stations.grill).toEqual([...STUGAN.stations.grill.pos]);
    expect(TRUCK_LAYOUT.stations.hatch).toEqual([...STUGAN.stations.hatch.pos]);
  });

  it('markisen syns bara när den är köpt (samma funktion som PlayerTruckCrew.tsx: stuganStateFor, applyStuganState)', () => {
    const s = evening();
    const tr = makePlayerTrailer();
    const st = stuganOf(tr)!;
    expect(st.awningGroup.visible).toBe(false);
    applyStuganState(tr, stuganStateFor(withAwning(s, false)), 60);
    expect(st.awningGroup.visible).toBe(false);
    applyStuganState(tr, stuganStateFor(withAwning(s, true)), 60);
    expect(queueAwningOwned(withAwning(s, true))).toBe(true);
    expect(st.awningGroup.visible).toBe(true);
    expect(st.awningGroup.getObjectByName('awningCloth')).toBeTruthy();
    // Taket och duken tonar med husens regel: borta på krogens nivå, stolparna och festongerna står kvar.
    applyStuganState(tr, stuganStateFor(withAwning(s, true)), 24);
    expect(st.canopy.every((m) => !m.visible)).toBe(true);
    expect(st.roof.every((m) => !m.visible && !m.castShadow)).toBe(true);
    expect(st.awningGroup.getObjectByName('awningValance')!.visible).toBe(true);
    applyStuganState(tr, stuganStateFor(withAwning(s, false)), 24);
    expect(st.awningGroup.visible).toBe(false);
  });

  it('markisen står i foodtruckens butik med pris och krav ur balance.ts, inte i vinbarens', () => {
    expect(equipmentForBusiness('foodtruck')).toEqual(['queueAwning']);
    expect(equipmentForBusiness('vinbar')).not.toContain('queueAwning');
    expect(EQUIPMENT.queueAwning.priceSek).toBeGreaterThan(0);
    // Köpet: krediterna öppnar, kassan köper (reducer OPEN_EQUIPMENT, BUY_EQUIPMENT).
    let s: SimulationState = { ...evening(), medals: { kalastorget: 'brons' }, cash: 100000, day: { ...evening().day, period: 'morning' } };
    s = { ...s, knowledgeCredits: { episteme: 20, techne: 20, phronesis: 20 } };
    s = reducer(s, { type: 'OPEN_EQUIPMENT', id: 'queueAwning' });
    s = reducer(s, { type: 'BUY_EQUIPMENT', id: 'queueAwning' });
    expect(queueAwningOwned(s)).toBe(true);
    expect(stuganStateFor(s).awning).toBe(true);
  });

  it('kön i regn: torra med markisen 7, utan 2 (D13), räknat mot skydden som scenen ritar', () => {
    for (const [awning, layout, dry] of [[true, RAIN_QUEUE.withAwning, 7], [false, RAIN_QUEUE.withoutAwning, 2]] as const) {
      const sh = stuganShelters(awning);
      const pts = [layout.order, ...layout.line];
      expect(pts.filter((p) => shelterTop(p[0], p[1], sh) > 0).length).toBe(dry);
      expect(layout.sheltered).toBe(dry);
      expect(rainQueueDryInLine(awning)).toBe(dry - 1);
      // Kön i flödet är D13:s, och längre köer fortsätter utanför markisen.
      const q = queueInForce({ raining: true, awning });
      expect(q.line).toEqual(layout.line);
      const beyond = queueLineAt(q, layout.line.length);
      expect(shelterTop(beyond[0], beyond[1], sh)).toBe(0);
    }
    // Paraplyerna står 0,9 m isär, under markisen 0,55 m; torrt väder D7:s kö.
    expect(RAIN_QUEUE.withoutAwning.pitchM).toBe(0.9);
    expect(RAIN_QUEUE.withAwning.pitchM).toBe(0.55);
    expect(queueInForce({ raining: false }).line).toEqual(TRUCK_LAYOUT.queue.line);
    expect(queueInForce({ raining: true, awning: false }).helperUmbrella).toBe(true);
    expect(queueInForce({ raining: true, awning: true }).helperUmbrella).toBe(false);
  });
});

describe('ORDER 332 G — vagnen och kön på platsen', () => {
  it('Torget står exakt där vagnen alltid stått; de andra platserna i D15:s ram, och kön följer med', () => {
    const t = playerTruckPlacement('torget');
    expect(t).toEqual({ x: PLAYER_TRUCK_PITCH.centre[0], z: PLAYER_TRUCK_PITCH.centre[1], rotationY: -PLAYER_TRUCK_PITCH.angleDeg * Math.PI / 180 });
    expect(playerTruckPlacement()).toEqual(t);
    for (const spot of TRUCK_SPOT_IDS) {
      const at = playerTruckPlacement(spot), d15 = truckSpotPlacement(spot);
      expect(Math.hypot(at.x - d15.x, at.z - d15.z)).toBeLessThan(1e-9);
      expect(Math.abs(at.rotationY - d15.rotationY)).toBeLessThan(1e-3);
      if (spot === 'torget') continue;
      for (const p of [TRUCK_LAYOUT.queue.order, ...TRUCK_LAYOUT.queue.line, ...RAIN_QUEUE.withoutAwning.line]) {
        const a = toWorld(at, p[0], p[1]), b = spotToWorld(spot, p);
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(1e-6);
      }
    }
  });

  it('rivalernas vagnar står aldrig i spelarens vagn, kö eller ståbord, på någon plats och någon veckodag', () => {
    const box = (spot: (typeof TRUCK_SPOT_IDS)[number]): V[] => ([[-6.5, -1.6], [6.5, -1.6], [6.5, 4.5], [-6.5, 4.5]] as V[]).map((p) => spotToWorld(spot, p));
    for (const spot of TRUCK_SPOT_IDS) {
      for (const [, plan] of Object.entries(VILLAGE.truckSchedule)) {
        for (const rs of new Set(Object.values(plan ?? {}).filter((x): x is (typeof VILLAGE.truckSpots)[number] => !!x))) {
          for (const k of [0, 1]) expect(polygonsOverlap(rivalFootprint(rs, k, spot), box(spot)), `${rs}#${k} vid ${spot}`).toBe(false);
        }
      }
      for (const rs of VILLAGE.truckSpots) for (const k of [0, 1]) expect(polygonsOverlap(rivalFootprint(rs, k, spot), box(spot)), `${rs}#${k} vid ${spot}`).toBe(false);
    }
    // Utan spelarens vagn ute står rivalen på sin vanliga plats.
    expect(rivalTruckPlacement('maltidens-hus', 0, null)).toEqual(rivalTruckPlacement('maltidens-hus', 0, 'torget'));
  });

  it('layoutkontrollen: Grillstugan, däcket och föremålen på alla fem platser inte på en väg, i ett hus eller i en rivals vagn', () => {
    const c = auditTrucks().filter((x) => x.subject.startsWith('spelarens') || x.subject.startsWith('vagn@'));
    expect(c.map((x) => `${x.kind} ${x.subject} ${'other' in x ? x.other : ''}`)).toEqual([]);
  });
});

describe('ORDER 332 G — platserna är fria: inga träd, landmärken eller samlade figurer i D15-lådan', () => {
  it('gatornas träd (med kronan) och Torgets allé står utanför lådan vid alla fem platser', () => {
    const trees = streetTreeInstances();
    expect(trees.length).toBeGreaterThan(0);
    expect(trees.filter((t) => inTruckSpotBox(t.x, t.z, TREE_CROWN_M)).map((t) => [t.x, t.z])).toEqual([]);
  });

  it('landmärkena står inte i lådan', () => {
    expect(WORLD_LANDMARKS.filter((l) => inTruckSpotBox(l.position[0], l.position[1])).map((l) => l.id)).toEqual([]);
  });

  it('de samlade figurerna skjuts ut ur lådan vid alla fem platser', () => {
    for (const spot of TRUCK_SPOT_IDS) {
      const c = truckSpotBoxCentre(spot);
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2, r = (i % 8) * 1.2;
        const [ox, oz] = clearOfTruck(c[0] + 3, c[1] - 2, c[0] - (c[0] + 3) + Math.cos(a) * r, c[1] - (c[1] - 2) + Math.sin(a) * r);
        expect(inTruckSpotBox(c[0] + 3 + ox, c[1] - 2 + oz), `${spot} ${i}`).toBeNull();
      }
    }
  });
});

describe('ORDER 332 G — Grillvagnens skylt (ft13) bara när spelarens vagn står på Torget', () => {
  it('rivalSign kan inte komma när vagnen står på en annan plats', () => {
    const s = evening();
    const at = (spot: (typeof TRUCK_SPOT_IDS)[number]) => grillTruckAtTorget({ ...s, economy: { ...s.economy, truckSpot: spot } });
    for (const spot of TRUCK_SPOT_IDS) if (spot !== 'torget') expect(at(spot)).toBe(false);
  });
});

describe('ORDER 332 C — kön i regnet i simuleringen (RAIN_QUEUE_BALANCE)', () => {
  it('utan markis: den första i kön står torrt, de andra har patienceRain av tålamodet; med markis sex torra', () => {
    const s = withQueue(raining(evening()), 8);
    expect(truckRaining(s)).toBe(true);
    const ids = s.waitingIds;
    expect(rainExposedInQueue(s, ids[0])).toBe(false);
    expect(rainQueuePatience(s, ids[1])).toBe(RAIN_QUEUE_BALANCE.patienceRain);
    const a = withAwning(s, true);
    for (let i = 0; i < 6; i++) expect(rainQueuePatience(a, ids[i])).toBe(1);
    expect(rainQueuePatience(a, ids[6])).toBe(RAIN_QUEUE_BALANCE.patienceRain);
    // Torrt väder: inget.
    const dry = { ...s, day: { ...s.day, truck: { ...truckOf(s), weather: 'sun' as const, rainFromE: null } } };
    expect(rainQueuePatience(dry, ids[3])).toBe(1);
  });

  it('nöjdheten sjunker fortare för den som står i regnet, och den sista går när fler än leaveAt står i regnet', () => {
    const s = withQueue(raining(evening()), RAIN_QUEUE_BALANCE.leaveAt + 2);
    const ids = s.waitingIds;
    expect(rainQueueLeaver(s)).toBe(ids[ids.length - 1]);
    expect(rainQueueLeaver(withAwning(s, true))).toBeNull();
    const after = (x: SimulationState) => reducer(x, TICK);
    const sat = (x: SimulationState, id: string) => x.guests.find((g) => g.id === id)!.satisfaction;
    const wet = after(s), dryUnder = after(withAwning(s, true));
    const id = ids[2], before = sat(s, id);
    if (wet.guests.find((g) => g.id === id)?.state === 'waiting' && dryUnder.guests.find((g) => g.id === id)?.state === 'waiting') {
      expect(before - sat(wet, id)).toBeGreaterThan(before - sat(dryUnder, id));
    }
    expect(wet.guests.find((g) => g.id === ids[ids.length - 1])!.state).toBe('leaving');
    expect(dryUnder.guests.find((g) => g.id === ids[ids.length - 1])!.state).toBe('waiting');
    // Med en kort kö i regnet går ingen (leaveAt).
    const short = withQueue(raining(evening()), RAIN_QUEUE_BALANCE.leaveAt);
    expect(rainQueueLeaver(short)).toBeNull();
    expect(TRUCK_WEATHER.footfall.rain).toBeLessThan(1);
  });
});
