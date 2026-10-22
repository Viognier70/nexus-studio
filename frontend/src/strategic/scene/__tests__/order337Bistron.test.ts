// ORDER 337 A (Anders 2026-10-22): bistron får en egen planlösning i varje lokal, med platser efter lokalens storlek.
// Rummet byggs som i spelet (BrewpubScene: createRoom med bistrons layout för lokalen, lokalens höjd och interiör).
// Samma prov som vinbarens planer (order335Planlosningar.test.ts): platserna fria, vägarna inte genom möbler.
// Med WRITE_REPORTS=1 skrivs reports/order337/bistron.json.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { setCurrentPremises } from '../../content/playerPremises';
import { createRoom, roomSizeFor } from '../businessRoom';
import { getObstacles, walkPathToSeat, type WineBarRoom } from '../wineBarRoom';
import { applyPremisesInterior, premisesToRoomLocal, PREMISES_LOOK, type VenueId } from '../premisesInterior';
import { bistroLayoutForPremises, planGroundLift, planOf } from '../tablePlans';
import { groupsFor, setFlowLayout, staffRoute } from '../serviceFlow';
import { premisesSeats } from '../../simulation/service';
import { BISTRO_CAPACITY } from '../bistroHouse';
import type { SimulationState } from '../../types';

type V2 = [number, number];
const VENUES: VenueId[] = ['kallaren', 'salongen', 'glashornet'];

function build(id: VenueId) {
  setCurrentPremises(id);
  const L = computePlayerBusinessInterior()!;
  const room = createRoom('vinbaren', { ...roomSizeFor('vinbaren', L.width, L.depth), layout: bistroLayoutForPremises(id), interiorHeight: PREMISES_LOOK[id].heightM });
  const raw = room.raw as WineBarRoom;
  const pi = applyPremisesInterior(raw, id, premisesToRoomLocal(id, L.centre, L.worldAngle));
  raw.group.updateMatrixWorld(true);
  (raw as unknown as { pi: typeof pi }).pi = pi;
  return raw;
}
function blocked(raw: WineBarRoom, p: V2): string | null {
  for (const o of getObstacles(raw)) {
    if (/^seat_|^chair|Stem|Back|Foot/.test(o.id)) continue;
    if (Math.abs(p[0] - o.local[0]) < o.halfW + 0.15 && Math.abs(p[1] - o.local[1]) < o.halfD + 0.15) return o.id;
  }
  return null;
}
function crossings(raw: WineBarRoom, path: V2[], skipLast = 0.6): string[] {
  const hits: string[] = [];
  const lens = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1]));
  const L = lens.reduce((a, b) => a + b, 0);
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], n = Math.max(1, Math.ceil(lens[i - 1] / 0.1));
    for (let k = 0; k <= n; k++) {
      const d = total + (lens[i - 1] * k) / n;
      if (d < 0.5 || d > L - skipLast) continue;
      const p: V2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      const h = blocked(raw, p);
      if (h) hits.push(`${h}@${p[0].toFixed(1)},${p[1].toFixed(1)}`);
    }
    total += lens[i - 1];
  }
  return [...new Set(hits)];
}
const bistroState = (p: VenueId) => ({ businessClass: 'vinbaren', ladder: { step: 'bistro' }, economy: { businessClass: 'vinbar', premises: p } }) as unknown as SimulationState;

afterEach(() => { setCurrentPremises('torget'); setFlowLayout('winebar'); });

describe('ORDER 337 A — bistron per lokal', () => {
  it('platser efter lokalens storlek, i rummet och i simuleringen; Torget som förut', () => {
    const out: Record<string, unknown> = {};
    for (const id of VENUES) {
      const raw = build(id);
      const sim = premisesSeats('vinbaren', bistroState(id))!;
      expect([id, raw.layout, raw.seats.length, sim.capacity]).toEqual([id, bistroLayoutForPremises(id), raw.seats.length, raw.seats.length]);
      expect([id, sim.groups.flat().sort((a, b) => a - b)]).toEqual([id, Array.from({ length: raw.seats.length }, (_, i) => i)]);
      out[id] = { layout: raw.layout, seats: raw.seats.length };
    }
    expect(premisesSeats('vinbaren', bistroState('torget' as VenueId))).toBeNull();
    // Storleken: salongen störst, källaren minst; ingen lokal har bistrons 31 från Torget.
    const n = Object.fromEntries(VENUES.map((id) => [id, (out[id] as { seats: number }).seats]));
    expect(n.salongen).toBeGreaterThan(n.glashornet);
    expect(n.glashornet).toBeGreaterThan(n.kallaren);
    for (const id of VENUES) expect([id, n[id] !== BISTRO_CAPACITY]).toEqual([id, true]);
    if (process.env.WRITE_REPORTS === '1') {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order337');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'bistron.json'), JSON.stringify({ definition: 'ORDER 337 A. seats = bistrons platser i rummet (wineBarRoom.ts med lokalens bistroplan, tablePlans.ts), lika med simuleringens kapacitet (service.ts premisesSeats). Torget: bistroHouse.ts BISTRO_CAPACITY.', torget: BISTRO_CAPACITY, ...out }, null, 2) + '\n');
    }
  });

  it('källarens bistro ligger under gatan med trappan, Flygelns med glaset, salongens med runda bord', () => {
    expect(planOf('bistro-kallaren')!.door?.floorY).toBe(-2.7);
    const k = build('kallaren');
    expect(planGroundLift(planOf(k.layout), -3, -6.5)).toBeCloseTo(2.7, 5);
    const f = build('glashornet');
    expect(f.seats.filter((s) => s.kind === 'bar').every((s) => s.local[1] < -3.9)).toBe(true);
    const s = build('salongen');
    expect(planOf(s.layout)!.tables.filter((t) => t.round && t.cloth).length).toBeGreaterThanOrEqual(8);
    // Bistron har ingen vinvägg; hyllan bakom baren.
    for (const raw of [k, f, s]) expect([raw.layout, !!raw.group.getObjectByName('bistroShelf'), raw.parts.wineWall.bas.children.length]).toEqual([raw.layout, true, 0]);
  });

  it('platserna står fria, och gästernas och personalens vägar går inte genom möbler', () => {
    for (const id of VENUES) {
      const raw = build(id);
      setFlowLayout(raw.layout);
      for (const seat of raw.seats) {
        expect([id, seat.id, blocked(raw, seat.local as V2)]).toEqual([id, seat.id, null]);
        expect([id, seat.id, crossings(raw, walkPathToSeat(raw, seat.id) as V2[])]).toEqual([id, seat.id, []]);
      }
      const from = raw.staffStations.find((x) => x.id === 'server')!.local as V2;
      const bar = raw.staffStations.find((x) => x.id === 'bartender')!.local as V2;
      for (const g of groupsFor(raw)) {
        expect([id, g.id, crossings(raw, staffRoute(from, g.serveAt) as V2[], 0.3)]).toEqual([id, g.id, []]);
        expect([id, g.id, crossings(raw, staffRoute(bar, g.serveAt) as V2[], 0.3)]).toEqual([id, g.id, []]);
      }
    }
  });

  it('lokalens rekvisita (murpelarna, kakelugnen, fönsterbänken, AW-skylten) står inte på bistrons platser', () => {
    for (const id of VENUES) {
      const raw = build(id);
      const pi = (raw as unknown as { pi: { group: THREE.Group } }).pi;
      const inv = new THREE.Matrix4().copy(raw.group.matrixWorld).invert();
      pi.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !o.visible || /Floor|Slab|Rug|Glass|Mullion|Head|Lower|Cap|Upper|Window|cellarPit|cellarStep|cellarLanding|cellarStair|cellarRail|cellarDoor|afterWork/.test(m.name)) return;
        const b = new THREE.Box3().setFromObject(m).applyMatrix4(inv);
        for (const s of raw.seats) {
          const d = Math.max(b.min.x - s.local[0], s.local[0] - b.max.x, b.min.z - s.local[1], s.local[1] - b.max.z);
          expect([id, m.name, s.id, d > 0.3]).toEqual([id, m.name, s.id, true]);
        }
      });
    }
  });
});
