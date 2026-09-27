// ORDER 271 — kvällens koreografi i vinbaren (wineBarDirector.ts): en kväll
// där figurerna rör sig som i en riktig restaurang, driven av simuleringens
// gäster. Proven läser direktörens egna prov (samma som WineBarFigures ritar).

import { describe, expect, it } from 'vitest';
import {
  createWineBarRoom,
  walkPathToSeat,
  exitPathFromSeat,
  type WineBarRoom
} from '../wineBarRoom';
import { groupsFor, PICKUP_BAR, POUR_SPOT, CORR_X } from '../serviceFlow';
import { WineBarDirector, guestPatience, type GuestInput, type FrameInput, type TakeoverInput, type StaffKey } from '../wineBarDirector';
import { waitStateFor } from '../figureActs';
import { SEATED_HIP_Y } from '../WineBarFigures';
import type { GuestState } from '../../types';

function makeDirector(room: WineBarRoom): WineBarDirector {
  const queueSlots: [number, number][] = [];
  for (let i = 0; i < 10; i++) queueSlots.push([room.waitingSpot[0] + 0.8 * Math.floor(i / 2), i % 2 === 0 ? -0.5 : 0.5]);
  return new WineBarDirector(
    { seats: room.seats, staffStations: room.staffStations, entrance: room.entrance, waitingSpot: room.waitingSpot,
      floorY: room.floorY, width: room.width, depth: room.depth },
    { walkPathToSeat: (id) => walkPathToSeat(room, id), exitPathFromSeat: (id) => exitPathFromSeat(room, id),
      groups: groupsFor(room), queueSlots, spawn: [room.waitingSpot[0] + 6, 0], poolSize: 36, seatedHipY: SEATED_HIP_Y }
  );
}

class FakeSim {
  guests: GuestInput[] = [];
  set(id: string, state: GuestState, t: number, o?: Partial<GuestInput>) {
    let g = this.guests.find((x) => x.id === id);
    if (!g) { g = { id, state, seatIndex: null, stateTime: t, satisfaction: 0.8 }; this.guests.push(g); }
    Object.assign(g, { state, stateTime: t }, o ?? {});
  }
  drop(id: string) { this.guests = this.guests.filter((g) => g.id !== id); }
}

function frame(t: number, sim: FakeSim, takeover: TakeoverInput | null = null): FrameInput {
  return { t, guests: sim.guests, patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover };
}

const near = (a: { x: number; z: number }, p: [number, number], r = 0.15) => Math.hypot(a.x - p[0], a.z - p[1]) < r;

describe('ORDER 271 — tålamodet (F29) och väntans tre lägen', () => {
  it('kön: tålamodet är det som räcker längst av tiden och nöjdheten (service.ts ger upp först när båda är slut)', () => {
    expect(waitStateFor(guestPatience(true, 0, 0.8, 60, 0.35))).toBe('lugn');
    // Väntat länge men nöjd: stannar lugn, som i simuleringen.
    expect(waitStateFor(guestPatience(true, 90, 0.8, 60, 0.35))).toBe('lugn');
    // Väntat halva tiden och nöjdheten nere vid gränsen: otålig.
    expect(waitStateFor(guestPatience(true, 30, 0.4, 60, 0.35))).toBe('otålig');
    // Båda nästan slut: på väg att gå.
    expect(waitStateFor(guestPatience(true, 55, 0.36, 60, 0.35))).toBe('påVägAttGå');
  });

  it('vid bordet: otålig efter lång väntan, men reser sig bara om nöjdheten redan är under gränsen', () => {
    expect(waitStateFor(guestPatience(false, 5, 0.8, 60, 0.35))).toBe('lugn');
    expect(waitStateFor(guestPatience(false, 40, 0.8, 60, 0.35))).toBe('otålig');
    expect(waitStateFor(guestPatience(false, 59, 0.8, 60, 0.35))).toBe('otålig');
    expect(waitStateFor(guestPatience(false, 59, 0.3, 60, 0.35))).toBe('påVägAttGå');
  });
});

describe('ORDER 271 — en kväll i vinbaren', () => {
  function evening() {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    const sim = new FakeSim();
    const log: { t: number; key: StaffKey; pose: string; x: number; z: number; stress: number }[] = [];
    const guestPoses = new Map<string, Set<string>>();
    const step = (t0: number, t1: number, takeover: TakeoverInput | null = null) => {
      for (let t = t0; t < t1; t += 0.1) {
        d.update(frame(t, sim, takeover));
        d.staffSamples.forEach((s, i) => log.push({ t, key: (['server', 'server2', 'bartender', 'sommelier', 'cook', 'dish'] as StaffKey[])[i], pose: s.pose, x: s.x, z: s.z, stress: s.stress }));
        d.guestSamples.forEach((s) => { if (s.visible && s.guestId) { const set = guestPoses.get(s.guestId) ?? new Set(); set.add(s.pose); guestPoses.set(s.guestId, set); } });
      }
    };
    return { room, d, sim, log, guestPoses, step };
  }

  it('ett par vid ett tvåbord: in, sätta sig, menyn, beställa, vinet via baren, skåla, äta, notan, betala och gå', () => {
    const { d, sim, log, guestPoses, step } = evening();
    sim.set('g1', 'arriving', 0, { partyId: 'p1' });
    sim.set('g2', 'arriving', 0, { partyId: 'p1' });
    step(0, 3);
    sim.set('g1', 'seated', 3, { seatIndex: 6 });
    sim.set('g2', 'seated', 3, { seatIndex: 7 });
    step(3, 7);
    sim.set('g1', 'ordering', 7); sim.set('g2', 'ordering', 7);
    step(7, 60);
    sim.set('g1', 'dining', 60); sim.set('g2', 'dining', 60);
    step(60, 120);
    sim.set('g1', 'paying', 120); sim.set('g2', 'paying', 120);
    step(120, 128);
    sim.set('g1', 'leaving', 128); sim.set('g2', 'leaving', 128);
    step(128, 131);
    sim.set('g1', 'declined', 131); sim.set('g2', 'declined', 131);
    step(131, 134);
    sim.drop('g1'); sim.drop('g2');
    step(134, 170);

    const poses = guestPoses.get('g1')!;
    for (const p of ['arrive', 'sitDown', 'readMenu', 'order', 'drink', 'toast', 'eat', 'askBill', 'pay', 'standUp', 'leaveHappy']) {
      expect(poses, p).toContain(p);
    }
    // Överlämningen vid baren: bartendern häller vid POUR_SPOT, en servitör hämtar vid PICKUP_BAR.
    expect(log.some((r) => r.key === 'bartender' && r.pose === 'pour' && near(r, POUR_SPOT))).toBe(true);
    expect(log.some((r) => (r.key === 'server' || r.key === 'server2') && near(r, PICKUP_BAR))).toBe(true);
    // Passet: kocken lägger upp, servitören hämtar tallriken.
    expect(log.some((r) => r.key === 'cook' && r.pose === 'serve')).toBe(true);
    expect(log.some((r) => (r.key === 'server' || r.key === 'server2') && r.pose === 'serveWalk')).toBe(true);
    // Avdukningen bär disken tillbaka till passet.
    const lastServe = log.filter((r) => (r.key === 'server' || r.key === 'server2') && r.pose === 'clear');
    expect(lastServe.length).toBeGreaterThan(0);
    // Gästerna är ute och borta ur poolen.
    expect(d.trackOf('g1')).toBeNull();
    // Inga hopp: ingen i personalen flyttar sig mer än gångfarten medger mellan två prov.
    const jumps: unknown[] = [];
    for (const key of ['server', 'server2', 'bartender', 'sommelier', 'cook', 'dish'] as StaffKey[]) {
      const rows = log.filter((r) => r.key === key);
      for (let i = 1; i < rows.length; i++) {
        const dd = Math.hypot(rows[i].x - rows[i - 1].x, rows[i].z - rows[i - 1].z);
        if (dd > 0.2) jumps.push({ key, t: rows[i].t, dd });
      }
    }
    expect(jumps).toEqual([]);
    // Personalen hemma igen när det är lugnt.
    const end = log.filter((r) => r.t > 169);
    expect(end.find((r) => r.key === 'bartender')!.pose).toBe('pour');
  });

  it('personalen går inte genom baren eller vinväggen', () => {
    const { room, sim, log, step } = evening();
    // Tre sällskap på olika bord: tvåbord, lounge och bar.
    [['a', 8], ['b', 0], ['c', 12]].forEach(([id], i) => {
      sim.set(String(id), 'arriving', i, { partyId: String(id) });
    });
    step(0, 3);
    [['a', 8], ['b', 0], ['c', 12]].forEach(([id, seat]) => sim.set(String(id), 'seated', 3, { seatIndex: Number(seat) }));
    step(3, 90);
    const wall = { x0: -2.9, x1: 1.2, z0: -0.22, z1: 0.22 };
    const inWall = log.filter((r) => r.x > wall.x0 && r.x < wall.x1 && r.z > wall.z0 && r.z < wall.z1);
    expect(inWall).toEqual([]);
    // Inom rummets väggar (kön ligger utanför, personalen inte).
    expect(log.every((r) => Math.abs(r.x) <= room.width / 2 && Math.abs(r.z) <= room.depth / 2)).toBe(true);
    // Sommelieren visar flaskan för loungen, bartendern häller vid baren.
    expect(log.some((r) => r.key === 'sommelier' && r.pose === 'present')).toBe(true);
    expect(log.some((r) => r.key === 'bartender' && r.pose === 'takeOrder')).toBe(true);
  });

  it('§49: servitören lämnar sin uppgift, går stressad till raketens bord, stannar till `until` och går tillbaka; andra bord väntar', () => {
    const { d, sim, log, guestPoses, step } = evening();
    // Raketens sällskap vid twoC och ett annat vid twoA.
    sim.set('r1', 'arriving', 0, { partyId: 'r' });
    sim.set('o1', 'arriving', 0, { partyId: 'o' });
    step(0, 2);
    sim.set('r1', 'seated', 2, { seatIndex: 10 });
    sim.set('o1', 'seated', 2, { seatIndex: 6 });
    step(2, 12);
    const takeover: TakeoverInput = { key: 'x', role: 'servitör', until: 12 + 30, guestIds: ['r1'], table: 6 };
    step(12, 60, takeover);
    const serveAtC = groupsFor(createWineBarRoom({ width: 14.6, depth: 11.0 })).find((g) => g.id === 'twoC')!.serveAt;
    const handling = log.filter((r) => r.key === 'server' && r.pose === 'handle');
    expect(handling.length).toBeGreaterThan(0);
    expect(handling.every((r) => near(r, serveAtC))).toBe(true);
    // Stressat tempo under hela övertagandet.
    expect(handling.every((r) => r.stress === 1)).toBe(true);
    // Stannar till simuleringens `until` (30 s), går sedan tillbaka.
    expect(Math.max(...handling.map((r) => r.t))).toBeGreaterThan(41);
    expect(d.awayUntil('server')).toBeGreaterThan(42);
    const after = log.filter((r) => r.key === 'server' && r.t > d.awayUntil('server') + 0.2);
    expect(after.every((r) => r.pose !== 'handle')).toBe(true);
    // Det andra bordet fick vänta synligt medan servitören var borta.
    const o = guestPoses.get('o1')!;
    expect(o.has('waitCalm') || o.has('waitImpatient')).toBe(true);
    void CORR_X;
  });

  it('en gäst i kön visar väntans lägen stående och går missnöjd om hon ger upp', () => {
    const { d, sim, guestPoses, step } = evening();
    sim.set('q', 'arriving', 0);
    step(0, 4);
    sim.set('q', 'waiting', 4, { satisfaction: 0.8 });
    step(4, 10);
    expect(guestPoses.get('q')).toContain('waitCalm');
    const g = sim.guests.find((x) => x.id === 'q')!;
    g.satisfaction = 0.36;
    g.stateTime = -52;
    step(10, 14);
    expect(guestPoses.get('q')).toContain('waitLeaving');
    expect(d.guestSamples.find((s) => s.guestId === 'q')!.seated).toBe(false);
    sim.set('q', 'leaving', 14, { satisfaction: 0.3 });
    step(14, 16);
    expect(guestPoses.get('q')).toContain('leaveUnhappy');
  });
});
