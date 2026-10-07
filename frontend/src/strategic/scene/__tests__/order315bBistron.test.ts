// ORDER 315b del 2 — bistrons rum (Designs tillägg till D7, bistroRoom.ts; bistroHouse.ts):
// 31 platser inom husets mått, och inga platser, vägar eller figurer i väggarna eller i
// möblerna. Samma prov som ORDER 317 (order317Vaggarna.test.ts) med figurens bredd
// (figureRig.ts FIGURE), och dessutom mot borden, stolarna, bänken, baren och hyllan.
// Utdata: reports/order315b-2/bistron.json (ORDER315B_OUT=1).

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { createWineBarRoom, walkPathToSeat, exitPathFromSeat, type WineBarRoom } from '../wineBarRoom';
import { groupsFor, staffRoute, setFlowLayout, PICKUP_BAR, POUR_SPOT, BOTTLE_PICKUP_AT } from '../serviceFlow';
import { WineBarDirector, PASS_FLOOR, type GuestInput, type FrameInput } from '../wineBarDirector';
import { SEATED_HIP_Y } from '../WineBarFigures';
import { FIGURE } from '../figureRig';
import { BISTRO_CAPACITY, BISTRO_SEATS, bistroSeats } from '../bistroHouse';
import type { GuestState } from '../../types';

type V2 = [number, number];
interface Rect { name: string; x0: number; x1: number; z0: number; z1: number }
const GUEST_R = FIGURE.guestShoulderWidth / 2;
const STAFF_R = FIGURE.staffShoulderWidth / 2;
const EPS = 0.005;
const STEP_M = 0.05;
const FIGURE_HEIGHT_M = 1.8;
// Möblerna en gående figur inte får gå i: borden, stolarna, bänken, baren och hyllan.
const FURNITURE = /^(bench\d|four\d|two\d)(Top|Leg|Base)$|^seat_.*(Seat|Back)$|^banquette(Seat|Back)$|^barCounterBistro$|^bistroShelf$|^hostDesk$|^musicSideboard$/;

function rects(room: WineBarRoom, pick: (o: THREE.Object3D) => boolean): Rect[] {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const out: Rect[] = [];
  const b = new THREE.Box3();
  room.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !pick(m)) return;
    b.setFromObject(m).applyMatrix4(inv);
    if (b.min.y - room.floorY >= FIGURE_HEIGHT_M) return;
    out.push({ name: m.name, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
  });
  return out;
}
const dist = (p: V2, r: Rect) => Math.hypot(Math.max(r.x0 - p[0], 0, p[0] - r.x1), Math.max(r.z0 - p[1], 0, p[1] - r.z1));
interface Hit { what: string; at: V2; hit: string; clearance: number }
function point(obs: Rect[], p: V2, r: number, what: string, hits: Hit[], skip?: (o: Rect) => boolean): boolean {
  for (const o of obs) {
    if (skip?.(o)) continue;
    const d = dist(p, o);
    if (d < r - EPS) { hits.push({ what, at: [+p[0].toFixed(3), +p[1].toFixed(3)], hit: o.name, clearance: +d.toFixed(3) }); return true; }
  }
  return false;
}
function path(obs: Rect[], pts: V2[], r: number, what: string, hits: Hit[], skip?: (o: Rect) => boolean): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP_M));
    for (let k = 0; k <= n; k++) if (point(obs, [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], r, `${what} (sträcka ${i})`, hits, skip)) return;
  }
}

const room = createWineBarRoom({ layout: 'bistro' });
setFlowLayout('bistro');
const walls = rects(room, (o) => { let p: THREE.Object3D | null = o; while (p) { if (p === room.parts.walls) return true; p = p.parent; } return /^kitchenWall/.test(o.name); });
const furniture = rects(room, (o) => FURNITURE.test(o.name));
const report: Record<string, unknown> = { seats: room.seats.length, walls: walls.length, furniture: furniture.length };
const write = () => {
  if (!process.env.ORDER315B_OUT) return;
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order315b-2/bistron.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
};
// Den sista biten in till en plats går förbi platsens eget bord och stol.
const ownFurniture = (seatId: string) => {
  const s = BISTRO_SEATS.find((x) => x.id === seatId)!;
  return (o: Rect) => o.name.startsWith(s.furnitureId) || o.name.startsWith('seat_' + seatId) || (s.kind === 'bench' && o.name.startsWith('banquette')) || (s.kind === 'stool' && o.name === 'barCounterBistro');
};

describe('ORDER 315b del 2 — bistron', () => {
  it('31 platser inom husets mått, som Designs bistroRoom.ts', () => {
    expect(bistroSeats()).toBe(31);
    expect(room.seats).toHaveLength(BISTRO_CAPACITY);
    expect(room.capacity).toBe(31);
    expect(room.seats.map((s) => s.seatIndex)).toEqual([...Array(31).keys()]);
    expect(room.layout).toBe('bistro');
    expect(furniture.some((f) => f.name === 'barCounterBistro')).toBe(true);
    // Anders 2026-10-07: musikhörnan med skivspelaren i DJ-hörnets ställe.
    expect(room.parts.turntable.name).toBe('musicTurntable');
    expect(furniture.some((f) => f.name === 'musicSideboard')).toBe(true);
  });

  it('platserna, personalens platser och arbetsplatserna: inte i väggarna', () => {
    const hits: Hit[] = [];
    for (const s of room.seats) point(walls, s.local, GUEST_R, `plats ${s.id}`, hits);
    for (const s of room.staffStations) point(walls, s.local, STAFF_R, `station ${s.id}`, hits);
    for (const p of [PASS_FLOOR, PICKUP_BAR, POUR_SPOT, BOTTLE_PICKUP_AT]) point([...walls, ...furniture], p, STAFF_R, `arbetsplats ${p.join(',')}`, hits);
    for (const g of groupsFor(room)) point([...walls, ...furniture], g.serveAt, STAFF_R, `servering ${g.id}`, hits);
    report.points = hits;
    write();
    expect(hits).toEqual([]);
  });

  it('gästernas vägar till och från varje plats: inte genom väggar eller andras bord och stolar', () => {
    const hits: Hit[] = [];
    for (const s of room.seats) {
      path([...walls, ...furniture], walkPathToSeat(room, s.id), GUEST_R, `in till ${s.id}`, hits, ownFurniture(s.id));
      path([...walls, ...furniture], exitPathFromSeat(room, s.id), GUEST_R, `ut från ${s.id}`, hits, ownFurniture(s.id));
    }
    report.guestPaths = hits;
    write();
    expect(hits).toEqual([]);
  });

  it('personalens vägar från stationerna till borden och passet', () => {
    const hits: Hit[] = [];
    const homes = room.staffStations.filter((s) => s.id !== 'dj').map((s) => [s.id, s.local] as const);
    const bar = (o: Rect) => o.name === 'barCounterBistro' || o.name === 'bistroShelf';
    for (const g of groupsFor(room)) {
      for (const [id, h] of homes) path([...walls, ...furniture], staffRoute(h, g.serveAt), STAFF_R, `${id} till ${g.id}`, hits, id === 'bartender' || g.id === 'bar' ? bar : undefined);
      path([...walls, ...furniture], staffRoute(g.serveAt, PASS_FLOOR), STAFF_R, `${g.id} till passet`, hits, g.id === 'bar' ? bar : undefined);
    }
    report.staffPaths = hits;
    write();
    expect(hits).toEqual([]);
  });

  it('en full kväll med alla 31 platser: ingen figur regissören ritar står i en vägg', () => {
    const queueSlots: V2[] = room.queueSpots.slice().sort((a, b) => a.order - b.order).map((q) => [q.local[0], q.local[1]]);
    const d = new WineBarDirector(
      { seats: room.seats, staffStations: room.staffStations, entrance: room.entrance, waitingSpot: room.waitingSpot, floorY: room.floorY, width: room.width, depth: room.depth, layout: 'bistro' } as never,
      { walkPathToSeat: (id) => walkPathToSeat(room, id), exitPathFromSeat: (id) => exitPathFromSeat(room, id), groups: groupsFor(room), queueSlots, spawn: [room.waitingSpot[0] + 6, 0], poolSize: 48, seatedHipY: SEATED_HIP_Y }
    );
    const guests: GuestInput[] = [];
    const set = (id: string, state: GuestState, t: number, o?: Partial<GuestInput>) => {
      let g = guests.find((x) => x.id === id);
      if (!g) { g = { id, state, seatIndex: null, stateTime: t, satisfaction: 0.8 }; guests.push(g); }
      Object.assign(g, { state, stateTime: t }, o ?? {});
    };
    const frame = (t: number): FrameInput => ({ t, guests, patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover: null });
    const hits: Hit[] = [];
    let samples = 0;
    const step = (t0: number, t1: number) => {
      for (let t = t0; t < t1; t += 0.1) {
        d.update(frame(t));
        for (const s of d.guestSamples) if (s.visible) { samples++; point(walls, [s.x, s.z], GUEST_R, `gäst t ${t.toFixed(1)}`, hits); }
        for (const [i, s] of d.staffSamples.entries()) if (s.visible) { samples++; point(walls, [s.x, s.z], STAFF_R, `personal ${i} t ${t.toFixed(1)}`, hits); }
      }
    };
    for (let i = 0; i < 31; i++) set(`g${i}`, 'arriving', i, { partyId: `p${Math.floor(i / 2)}` });
    step(0, 40);
    for (let i = 0; i < 31; i++) set(`g${i}`, 'seated', 40, { seatIndex: i });
    step(40, 50);
    for (const g of guests) set(g.id, 'ordering', 50);
    step(50, 110);
    for (const g of guests) set(g.id, 'dining', 110);
    step(110, 190);
    for (const g of guests) set(g.id, 'paying', 190);
    step(190, 210);
    for (const g of guests) set(g.id, 'leaving', 210);
    step(210, 260);
    report.evening = { samples, hits: hits.length, first: hits.slice(0, 20) };
    write();
    setFlowLayout('winebar');
    expect(samples).toBeGreaterThan(20000);
    expect(hits.slice(0, 10)).toEqual([]);
  });
});
