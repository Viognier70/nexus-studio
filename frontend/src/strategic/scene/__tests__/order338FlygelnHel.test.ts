// ORDER 338 (Anders 2026-10-22): bistron i Flygeln tar hela flygeln — en öppning i mellanväggen, den norra delen
// möblerad efter rummets storlek, och gångarna för personal och gäster genom öppningen. Rummet byggs som i spelet.
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { setCurrentPremises } from '../../content/playerPremises';
import { PREMISES_FRAMES } from '../../content/premises';
import { pointInPolygon } from '../../content/roadSurface';
import { createRoom, roomSizeFor } from '../businessRoom';
import { walkPathToSeat, type WineBarRoom } from '../wineBarRoom';
import { applyPremisesInterior, premisesToRoomLocal, PREMISES_LOOK } from '../premisesInterior';
import { WING_OPENING } from '../tablePlans';
import { groupsFor, setFlowLayout, staffRoute } from '../serviceFlow';

type V2 = [number, number];
function build() {
  setCurrentPremises('glashornet');
  const L = computePlayerBusinessInterior()!;
  const room = createRoom('vinbaren', { ...roomSizeFor('vinbaren', L.width, L.depth), layout: 'bistro-flygeln', interiorHeight: PREMISES_LOOK.glashornet.heightM });
  const raw = room.raw as WineBarRoom;
  applyPremisesInterior(raw, 'glashornet', premisesToRoomLocal('glashornet', L.centre, L.worldAngle));
  return raw;
}
const f = PREMISES_FRAMES.glashornet;
// Flygelns insida i rummets lokala ram (lokalens poly − offset; rummets ram är lokalens här).
const wing = f.poly!.map(([x, z]) => [x - f.offsetX, z - f.offsetZ] as V2);
const northOf = (p: V2, raw: WineBarRoom) => p[1] > raw.depth / 2;

afterEach(() => { setCurrentPremises('torget'); setFlowLayout('winebar'); });

describe('ORDER 338 — Flygeln hel', () => {
  it('den norra delen har platser efter sin storlek, alla inne i flygeln', () => {
    const raw = build();
    const north = raw.seats.filter((s) => northOf(s.local as V2, raw));
    // Cirka 105 m² norr om mellanväggen (16,2 × 6,5 m) med bistrons täthet vid Torget (31 på 145 m²): omkring 22.
    expect(north.length).toBe(22);
    for (const s of raw.seats) expect([s.id, pointInPolygon(wing, s.local[0], s.local[1])]).toEqual([s.id, true]);
    if (process.env.WRITE_REPORTS === '1') {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order338');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'platser.json'), JSON.stringify({ definition: 'ORDER 338. Bistrons platser i Flygeln (wineBarRoom.ts med tablePlans.ts BISTRO_WING_PLAN): seats = alla, north = norr om mellanväggen (rummets lokala z över halva djupet), south = i det glasade hörnet som i ORDER 337.', seats: raw.seats.length, north: north.length, south: raw.seats.length - north.length }, null, 2) + '\n');
    }
  });

  it('mellanväggen har en öppning, och gästernas och personalens väg till den norra delen går genom den', () => {
    const raw = build();
    const part = raw.parts.walls.getObjectByName('wingPartition')!;
    expect(part).toBeTruthy();
    const wallZ = raw.depth / 2;
    const crossesAt = (path: V2[]) => {
      const xs: number[] = [];
      for (let i = 1; i < path.length; i++) {
        const [a, b] = [path[i - 1], path[i]];
        if ((a[1] - wallZ) * (b[1] - wallZ) < 0) xs.push(a[0] + ((wallZ - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      return xs;
    };
    setFlowLayout(raw.layout);
    const server = raw.staffStations.find((s) => s.id === 'server')!.local as V2;
    for (const s of raw.seats.filter((x) => northOf(x.local as V2, raw))) {
      const xs = crossesAt(walkPathToSeat(raw, s.id) as V2[]);
      expect([s.id, xs.length > 0 && xs.every((x) => x > WING_OPENING.x0 && x < WING_OPENING.x1)]).toEqual([s.id, true]);
    }
    for (const g of groupsFor(raw).filter((x) => northOf(x.serveAt as V2, raw))) {
      const xs = crossesAt(staffRoute(server, g.serveAt as V2) as V2[]);
      expect([g.id, xs.length > 0 && xs.every((x) => x > WING_OPENING.x0 && x < WING_OPENING.x1)]).toEqual([g.id, true]);
    }
    // Öppningen: inga väggbitar mellan x0 och x1 under överstycket.
    const inv = new THREE.Matrix4().copy(raw.group.matrixWorld).invert();
    part.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.name === 'wingPartLintel') return;
      const b = new THREE.Box3().setFromObject(m).applyMatrix4(inv);
      expect([m.name, b.max.x <= WING_OPENING.x0 + 1e-6 || b.min.x >= WING_OPENING.x1 - 1e-6]).toEqual([m.name, true]);
    });
  });
});
