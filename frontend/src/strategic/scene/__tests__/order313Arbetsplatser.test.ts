// ORDER 313 §8 (Anders 2026-10-06, provspelet): "Flera servitörer står på
// samma plats vid samma bord." Varje bord har en arbetsplats per servitör
// (wineBarDirector.ts workSpot), och två i personalen står aldrig på samma
// punkt. Provet läser regissörens egna prov (staffSamples), samma som
// WineBarFigures ritar, under en full kväll: alla tjugo platser tagna.

import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWineBarRoom, walkPathToSeat, exitPathFromSeat, type WineBarRoom } from '../wineBarRoom';
import { groupsFor } from '../serviceFlow';
import { WineBarDirector, WORK_SPOT_CLEAR_M, type GuestInput, type FrameInput, type StaffKey } from '../wineBarDirector';
import { SEATED_HIP_Y } from '../WineBarFigures';
import type { GuestState } from '../../types';

const KEYS = ['server', 'server2', 'bartender', 'sommelier', 'cook', 'dish'] as StaffKey[];

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

describe('ORDER 313 §8 — en arbetsplats per servitör vid varje bord', () => {
  it('två i personalen står aldrig stilla på samma punkt under en full kväll', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    const guests: GuestInput[] = [];
    const set = (id: string, state: GuestState, t: number, o?: Partial<GuestInput>) => {
      let g = guests.find((x) => x.id === id);
      if (!g) { g = { id, state, seatIndex: null, stateTime: t, satisfaction: 0.8 }; guests.push(g); }
      Object.assign(g, { state, stateTime: t }, o ?? {});
    };
    const frame = (t: number): FrameInput => ({ t, guests, patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover: null });
    const collisions: Array<{ t: number; a: StaffKey; b: StaffKey; x: number; z: number }> = [];
    let prev: Array<{ x: number; z: number }> | null = null;
    let standingPairsChecked = 0;
    const step = (t0: number, t1: number) => {
      for (let t = t0; t < t1; t += 0.1) {
        d.update(frame(t));
        const now = d.staffSamples.map((s) => ({ x: s.x, z: s.z }));
        if (prev) {
          const still = now.map((p, i) => Math.hypot(p.x - prev![i].x, p.z - prev![i].z) < 0.005);
          for (let i = 0; i < now.length; i++) for (let j = i + 1; j < now.length; j++) {
            if (!still[i] || !still[j]) continue;
            standingPairsChecked++;
            if (Math.hypot(now[i].x - now[j].x, now[i].z - now[j].z) < WORK_SPOT_CLEAR_M * 0.6) collisions.push({ t: Math.round(t * 10) / 10, a: KEYS[i] ?? String(i), b: KEYS[j] ?? String(j), x: now[i].x, z: now[i].z, poses: [d.staffSamples[i].pose, d.staffSamples[j].pose] } as never);
          }
        }
        prev = now;
      }
    };
    // Tio sällskap om två, alla platser, med några sekunders mellanrum.
    for (let p = 0; p < 10; p++) for (const k of [0, 1]) set(`g${p}-${k}`, 'arriving', p * 2, { partyId: `p${p}` });
    step(0, 22);
    for (let p = 0; p < 10; p++) for (const k of [0, 1]) set(`g${p}-${k}`, 'seated', 22, { seatIndex: p * 2 + k });
    step(22, 30);
    for (const g of guests) set(g.id, 'ordering', 30);
    step(30, 90);
    for (const g of guests) set(g.id, 'dining', 90);
    step(90, 170);
    for (const g of guests) set(g.id, 'paying', 170);
    step(170, 190);
    if (process.env.ORDER313_OUT) {
      mkdirSync(dirname(process.env.ORDER313_OUT), { recursive: true });
      writeFileSync(process.env.ORDER313_OUT, JSON.stringify({ standingPairsChecked, collisions: collisions.length, sample: collisions.slice(0, 30) }, null, 2) + '\n');
    }
    expect(standingPairsChecked).toBeGreaterThan(1000);
    expect(collisions.slice(0, 10)).toEqual([]);
  });
});

// ORDER 313 §8 (provspelet: "Inga flaskor syns") — rekvisitan ur tableware.ts:
// tallriken, glaset och flaskan kommer ur regissörens ägarbok
// (theatreStage.ts LEDGER_PROP); flaskorna på bardisken och karaffen på
// borden där något serverats står i dukningen (TheatreStage.dress).
describe('ORDER 313 §8 — flaskorna i baren och på borden', () => {
  it('fyra flaskor på bardisken, och en karaff på bordet så länge något av sällskapets står där', async () => {
    const THREE = await import('three');
    const { TheatreStage } = await import('../theatreStage');
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const group = new THREE.Group();
    const stage = new TheatreStage(group, room.floorY, 0, 0);
    const groups = groupsFor(room);
    stage.dress(groups);
    expect(stage.dressingCount().barBottles).toBe(4);
    const two = groups.find((g) => g.kind === 'two')!;
    const lounge = groups.find((g) => g.kind === 'lounge')!;
    const entry = (g: typeof two, item: 'glass' | 'bottle', id: string) => ({ id, item, owner: { kind: 'table' as const, group: g.id, groupKind: g.kind, at: g.serveAt, facing: g.serveFacing, slot: 0, tableAt: g.tableAt } });
    let ledger: unknown[] = [entry(two, 'glass', 'glass:1'), entry(lounge, 'bottle', 'bottle:2')];
    const director = { propLedger: () => ledger } as never;
    stage.props(director, 1, [], [], [], [], [], []);
    expect(stage.dressingCount().carafes).toBe(2);
    const visible = (name: string) => { let n = 0; group.traverse((o) => { if (o.visible && o.name === name) n++; }); return n; };
    expect(visible('prop:wineBottle')).toBeGreaterThanOrEqual(5);
    ledger = [];
    stage.props(director, 2, [], [], [], [], [], []);
    expect(stage.dressingCount().carafes).toBe(0);
  });
});
