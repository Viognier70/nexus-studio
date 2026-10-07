// ORDER 317 (Anders 2026-10-07, provspelet: "figurer går rakt igenom väggarna
// i vinbaren, särskilt mellanväggen vid dörren") — ingen plats, ingen
// arbetsplats och ingen gångväg för gäster eller personal får ligga i eller
// korsa en vägg. Mätt med figurens bredd (figureRig.ts FIGURE, samma som
// renderingen): en gäst 0,46 m, personalen 0,40 m.
//
// Väggarna läses ur rummets egna meshar (room.parts.walls och kökets
// halvväggar), i rummets lokala ram, så att provet följer det som ritas.
// Överstycket över dörren (från 2,2 m) är ingen vägg för en figur.
//
// Provet går igenom:
//   1. platserna, ståplatserna, personalens platser, mise en place, köplatserna,
//      entrén och väntplatsen;
//   2. gästernas vägar till och från varje plats, och personalens vägar mellan
//      stationerna och varje bord (serviceFlow.ts staffRoute, groupsFor);
//   3. en full kväll med alla tjugo platser: varje figur regissören ritar
//      (wineBarDirector.ts guestSamples, staffSamples) var tionde sekund;
//   4. Designs händelsemanus och öppningens två scener, översatta till husets
//      möblering (oldRoomMap.ts): skådespelarnas start, vägar och rekvisita.
// Utdata: reports/order317/vaggarna.json (ORDER317_OUT=1).

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { createWineBarRoom, walkPathToSeat, exitPathFromSeat, staffPathKitchenToBar, checkSightLines, setWineWallLevel, type WineBarRoom } from '../wineBarRoom';
import { groupsFor, staffRoute, CORR_X, PICKUP_BAR, POUR_SPOT } from '../serviceFlow';
import { WineBarDirector, PASS_FLOOR, type GuestInput, type FrameInput } from '../wineBarDirector';
import { SEATED_HIP_Y } from '../WineBarFigures';
import { FIGURE } from '../figureRig';
import { EVENTS } from '../events/handelserManus';
import { scriptFromOldRoom } from '../oldRoomMap';
import * as OPENING from '../../opening/oppningManus';
import type { GuestState } from '../../types';

type V2 = [number, number];
interface Rect { name: string; x0: number; x1: number; z0: number; z1: number }

const GUEST_R = FIGURE.guestShoulderWidth / 2;
const STAFF_R = FIGURE.staffShoulderWidth / 2;
// Figurens höjd: en vägg som börjar ovanför den (dörrens överstycke) stoppar ingen.
const FIGURE_HEIGHT_M = 1.8;
const EPS = 0.005;
const SAMPLE_STEP_M = 0.05;

/** Väggarna i rummets lokala XZ, ur rummets meshar (yttre väggar och kökets halvväggar). */
function wallRects(room: WineBarRoom): Rect[] {
  room.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(room.group.matrixWorld).invert();
  const out: Rect[] = [];
  const b = new THREE.Box3();
  const take = (o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    b.setFromObject(m).applyMatrix4(inv);
    if (b.min.y - room.floorY >= FIGURE_HEIGHT_M) return;
    out.push({ name: m.name, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z });
  };
  room.parts.walls.traverse(take);
  room.parts.interior.traverse((o) => { if (/^kitchenWall/.test(o.name)) take(o); });
  return out;
}

function distToRect(p: V2, r: Rect): number {
  const dx = Math.max(r.x0 - p[0], 0, p[0] - r.x1);
  const dz = Math.max(r.z0 - p[1], 0, p[1] - r.z1);
  return Math.hypot(dx, dz);
}

interface Hit { what: string; at: V2; wall: string; clearance: number }

function checkPoint(walls: Rect[], p: V2, radius: number, what: string, hits: Hit[]): void {
  for (const w of walls) {
    const d = distToRect(p, w);
    if (d < radius - EPS) { hits.push({ what, at: [+p[0].toFixed(3), +p[1].toFixed(3)], wall: w.name, clearance: +d.toFixed(3) }); return; }
  }
}

function checkPath(walls: Rect[], path: V2[], radius: number, what: string, hits: Hit[]): void {
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / SAMPLE_STEP_M));
    for (let k = 0; k <= n; k++) {
      const before = hits.length;
      checkPoint(walls, [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], radius, `${what} (sträcka ${i})`, hits);
      if (hits.length > before) return;
    }
  }
}

function makeDirector(room: WineBarRoom): WineBarDirector {
  // Kön som WineBarFigures bygger den: rummets köplatser.
  const queueSlots: V2[] = room.queueSpots.slice().sort((a, b) => a.order - b.order).map((q) => [q.local[0], q.local[1]]);
  return new WineBarDirector(
    { seats: room.seats, staffStations: room.staffStations, entrance: room.entrance, waitingSpot: room.waitingSpot,
      floorY: room.floorY, width: room.width, depth: room.depth },
    { walkPathToSeat: (id) => walkPathToSeat(room, id), exitPathFromSeat: (id) => exitPathFromSeat(room, id),
      groups: groupsFor(room), queueSlots, spawn: [room.waitingSpot[0] + 6, 0], poolSize: 36, seatedHipY: SEATED_HIP_Y }
  );
}

const room = createWineBarRoom();
const walls = wallRects(room);
const report: Record<string, unknown> = { guestRadius: GUEST_R, staffRadius: STAFF_R, room: [room.width, room.depth], walls: walls.length };
const write = () => {
  if (!process.env.ORDER317_OUT) return;
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order317/vaggarna.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
};

describe('ORDER 317 — ingenting i väggarna', () => {
  it('väggarna läses ur rummet: fyra yttre väggar med dörren i östra, och kökets halvväggar', () => {
    expect(walls.some((w) => /^wallE/.test(w.name))).toBe(true);
    expect(walls.filter((w) => /^kitchenWall/.test(w.name)).length).toBeGreaterThanOrEqual(4);
    // Dörren är öppen: entrén och väntplatsen förbinds utan att röra en vägg.
    const hits: Hit[] = [];
    checkPath(walls, [room.entrance, room.waitingSpot], GUEST_R, 'dörren', hits);
    expect(hits).toEqual([]);
  });

  it('provet fäller: en plats i väggen och en väg genom väggen bredvid dörren hittas', () => {
    const hits: Hit[] = [];
    const halfW = room.width / 2;
    checkPoint(walls, [room.seats[0].local[0], room.depth / 2 - 0.1], GUEST_R, 'plats i norra väggen', hits);
    // Som före ORDER 317: rakt från köplatsen utanför till köplatsen innanför (z 0,85).
    checkPath(walls, [[halfW + 0.55, 0.1], [halfW - 0.5, 0.85]], GUEST_R, 'genom väggen bredvid dörren', hits);
    expect(hits.map((h) => h.what.replace(/ \(sträcka \d+\)/, ''))).toEqual(['plats i norra väggen', 'genom väggen bredvid dörren']);
  });

  it('platserna, ståplatserna, personalens platser, mise en place, köplatserna, entrén och väntplatsen', () => {
    const hits: Hit[] = [];
    for (const s of room.seats) { checkPoint(walls, s.local, GUEST_R, `plats ${s.id}`, hits); checkPoint(walls, s.approach, GUEST_R, `plats ${s.id} (vägen in)`, hits); }
    for (const s of room.standing) { checkPoint(walls, s.local, GUEST_R, `ståplats ${s.id}`, hits); checkPoint(walls, s.approach, GUEST_R, `ståplats ${s.id} (vägen in)`, hits); }
    for (const s of room.staffStations) checkPoint(walls, s.local, STAFF_R, `station ${s.id}`, hits);
    for (const s of room.miseSpots) checkPoint(walls, s.local, STAFF_R, `mise en place ${s.id}`, hits);
    for (const q of room.queueSpots) checkPoint(walls, q.local, GUEST_R, `kö ${q.id}`, hits);
    checkPoint(walls, room.entrance, GUEST_R, 'entrén', hits);
    checkPoint(walls, room.waitingSpot, GUEST_R, 'väntplatsen', hits);
    for (const p of [PASS_FLOOR, PICKUP_BAR, POUR_SPOT, [CORR_X, 0] as V2]) checkPoint(walls, p, STAFF_R, `arbetsplats ${p.join(',')}`, hits);
    for (const g of groupsFor(room)) checkPoint(walls, g.serveAt, STAFF_R, `servering ${g.id}`, hits);
    report.points = hits;
    expect(hits).toEqual([]);
  });

  it('gästernas vägar till och från varje plats, och personalens vägar', () => {
    const hits: Hit[] = [];
    for (const s of room.seats) {
      checkPath(walls, walkPathToSeat(room, s.id), GUEST_R, `in till ${s.id}`, hits);
      checkPath(walls, exitPathFromSeat(room, s.id), GUEST_R, `ut från ${s.id}`, hits);
    }
    checkPath(walls, staffPathKitchenToBar(), STAFF_R, 'köket till baren', hits);
    const homes = room.staffStations.map((s) => s.local);
    for (const g of groupsFor(room)) {
      for (const h of homes) checkPath(walls, staffRoute(h, g.serveAt), STAFF_R, `personalen till ${g.id}`, hits);
      checkPath(walls, staffRoute(g.serveAt, PASS_FLOOR), STAFF_R, `${g.id} till passet`, hits);
    }
    report.paths = hits;
    expect(hits).toEqual([]);
  });

  it('en full kväll med alla tjugo platser: ingen figur regissören ritar står i en vägg', () => {
    const d = makeDirector(room);
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
        for (const s of d.guestSamples) if (s.visible) { samples++; checkPoint(walls, [s.x, s.z], GUEST_R, `gäst t ${t.toFixed(1)}`, hits); }
        for (const [i, s] of d.staffSamples.entries()) if (s.visible) { samples++; checkPoint(walls, [s.x, s.z], STAFF_R, `personal ${i} t ${t.toFixed(1)}`, hits); }
      }
    };
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
    for (const g of guests) set(g.id, 'leaving', 190);
    step(190, 230);
    report.evening = { samples, hits: hits.length, first: hits.slice(0, 20) };
    expect(samples).toBeGreaterThan(20000);
    expect(hits.slice(0, 10)).toEqual([]);
  });

  it('Designs händelsemanus och öppningen, översatta till husets möblering', () => {
    const hits: Hit[] = [];
    const inScript = (sc: ReturnType<typeof scriptFromOldRoom>, label: string) => {
      for (const [id, a] of Object.entries(sc.actors)) {
        const r = a.kind === 'guest' ? GUEST_R : STAFF_R;
        const seated = a.steps.some((s) => s.seat);
        if (a.pos && !(seated && a.pos[0] === 0 && a.pos[1] === 0)) checkPoint(walls, a.pos, r, `${label} ${id} start`, hits);
        let at: V2 | null = a.pos && !(a.pos[0] === 0 && a.pos[1] === 0) ? a.pos : null;
        for (const st of a.steps) {
          if (st.path && st.path.length > 0) {
            checkPath(walls, at ? [at, ...st.path] : st.path, r, `${label} ${id} ${st.clip}`, hits);
            at = st.path[st.path.length - 1];
          }
          for (const e of st.ev ?? []) if (e.put) checkPoint(walls, e.put, 0, `${label} ${id} ställer ned`, hits);
        }
      }
      for (const [id, p] of Object.entries(sc.props)) if (p.at) checkPoint(walls, [p.at[0], p.at[2]], 0, `${label} rekvisita ${id}`, hits);
    };
    for (const ev of EVENTS) for (const v of ev.variants) inScript(scriptFromOldRoom(ev.build(null, v)), `${ev.id}/${v}`);
    inScript(scriptFromOldRoom(OPENING.emptyBar()), 'öppningen/tomma baren');
    inScript(scriptFromOldRoom(OPENING.glimpses()), 'öppningen/glimtarna');
    report.scripts = hits;
    write();
    expect(hits).toEqual([]);
  });

  // Leveransen §För Code 2: "checkSightLines() bör köras igen … sikten från
  // loungerna mot vinväggen kan ha ändrats." Målet: minst som i Designs
  // ursprungliga rum (15,6 × 11,8 m, reports/order317/sikten-jamforelse.json):
  // alla 20 platser ser vinväggen; barstolarna ser alla hyllplan utom det
  // lägsta, som disken skymmer (3 av 4, 5 av 6); loungerna 1 av 4 och 3 av 6.
  it('sikten: minst som i Designs ursprungliga rum, båda vinväggslägena', () => {
    const out: Record<string, unknown> = {};
    const MIN = { bas: { bar: 3, lounge: 1, dj: 20 }, platina: { bar: 5, lounge: 3, dj: 17 } };
    for (const level of ['bas', 'platina'] as const) {
      setWineWallLevel(room, level);
      const sight = checkSightLines(room);
      out[level] = { seatsSeeingWineWall: sight.seatsSeeingWineWall, seatsSeeingDj: sight.seatsSeeingDj, perSeat: sight.perSeat };
      expect(sight.seatsSeeingWineWall, level).toBe(20);
      expect(sight.seatsSeeingDj, level).toBeGreaterThanOrEqual(MIN[level].dj);
      for (const s of sight.perSeat) {
        if (s.seatId.startsWith('bar')) expect(s.tiers, `${level} ${s.seatId}`).toBeGreaterThanOrEqual(MIN[level].bar);
        if (s.seatId.startsWith('lounge')) expect(s.tiers, `${level} ${s.seatId}`).toBeGreaterThanOrEqual(MIN[level].lounge);
      }
    }
    setWineWallLevel(room, 'bas');
    report.sight = out;
    write();
  });
});
