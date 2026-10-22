// ORDER 334 C — lokalernas egna rum (Anders 2026-10-22; Designs D15). Rummet byggs som i spelet: vinbarens rum i det
// tänkta husets mått (BrewpubScene: createRoom med roomSizeFor och lokalens höjd), sedan lokalens interiör
// (premisesInterior.ts) med lokalens ram i rummets lokala ram. Med WRITE_REPORTS=1 skrivs reports/order334/interiorer.json.
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { setCurrentPremises } from '../../content/playerPremises';
import { PREMISES_FRAMES } from '../../content/premises';
import { createRoom, roomSizeFor } from '../businessRoom';
import { getObstacles, type WineBarRoom } from '../wineBarRoom';
import { layoutForPremises } from '../tablePlans';
import { applyPremisesCeiling, applyPremisesInterior, premisesToRoomLocal, PREMISES_LOOK, setAfterWorkSign, type VenueId } from '../premisesInterior';

const VENUES: VenueId[] = ['kallaren', 'salongen', 'glashornet'];

function build(id: VenueId) {
  setCurrentPremises(id);
  const L = computePlayerBusinessInterior()!;
  const room = createRoom('vinbaren', { ...roomSizeFor('vinbaren', L.width, L.depth), layout: layoutForPremises(id), interiorHeight: PREMISES_LOOK[id].heightM });
  const raw = room.raw as WineBarRoom;
  const toLocal = premisesToRoomLocal(id, L.centre, L.worldAngle);
  const pi = applyPremisesInterior(raw, id, toLocal);
  raw.group.updateMatrixWorld(true);
  return { raw, pi, toLocal };
}

const names = (o: THREE.Object3D) => { const out: string[] = []; o.traverse((x) => { if ((x as THREE.Mesh).isMesh) out.push(x.name); }); return out; };
const sizeOf = (o: THREE.Object3D) => { const b = new THREE.Box3().setFromObject(o); return [+(b.max.x - b.min.x).toFixed(2), +(b.max.z - b.min.z).toFixed(2)]; };

afterEach(() => setCurrentPremises('torget'));

describe('ORDER 334 C — lokalernas rum', () => {
  it('golvet har D15:s mått och form; rummen skiljer sig i storlek, höjd och golv', () => {
    const out: Record<string, unknown> = {};
    for (const id of VENUES) {
      const { pi } = build(id);
      const floor = pi.group.getObjectByName('premisesFloor')!;
      const r = PREMISES_FRAMES[id].room;
      const [a, b] = sizeOf(floor).sort((x, y) => y - x);
      const [ea, eb] = [r.x1 - r.x0, r.z1 - r.z0].sort((x, y) => y - x);
      // Golvet är D15:s rum, mätt längs rummets axlar (lokalens x är rummets x).
      expect([id, Math.abs(a - ea) < 0.1, Math.abs(b - eb) < 0.1]).toEqual([id, true, true]);
      out[id] = { floorM: [a, b], d15: [+ea.toFixed(2), +eb.toFixed(2)], heightM: PREMISES_LOOK[id].heightM, floor: PREMISES_LOOK[id].floor, wall: PREMISES_LOOK[id].wall, pieces: names(pi.group).length, ceiling: names(pi.ceiling).length };
    }
    const looks = VENUES.map((id) => [PREMISES_LOOK[id].floor, PREMISES_LOOK[id].wall, PREMISES_LOOK[id].heightM].join());
    expect(new Set(looks).size).toBe(3);
    if (process.env.WRITE_REPORTS === '1') {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports/order334');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'interiorer.json'), JSON.stringify({ definition: 'ORDER 334 C. floorM = golvets mått (m, längst först) ur premisesInterior.ts premisesFloor; d15 = D15:s rum (content/premises.ts room); heightM, floor, wall = PREMISES_LOOK; pieces = meshar i interiören, ceiling = i taket (valv, ljuskronor, pendlar).', ...out }, null, 2) + '\n');
    }
  });

  it('källaren: tegelvalv på murpelare; salongen: kakelugn och soffgrupp; Flygeln: glas i söder och öster och fönsterbänken', () => {
    const k = build('kallaren');
    expect(names(k.pi.ceiling).filter((n) => n.startsWith('cellarVault')).length).toBe(2);
    expect(names(k.pi.ceiling).filter((n) => n.startsWith('cellarArch')).length).toBe(4);
    expect(names(k.pi.group).filter((n) => n.startsWith('cellarPier')).length).toBe(4);
    const s = build('salongen');
    expect(names(s.pi.group)).toEqual(expect.arrayContaining(['salonStove', 'salonLowTable', 'salonRug']));
    // ORDER 335 D — sofforna och fåtöljen är platser i rummets plan (tablePlans.ts SALON).
    expect(names(s.raw.group)).toEqual(expect.arrayContaining(['seat_sofaNSeat', 'seat_sofaSSeat', 'seat_armchairSeat']));
    expect(names(s.pi.ceiling).filter((n) => n.startsWith('salonChandelier')).length).toBeGreaterThanOrEqual(2);
    const g = build('glashornet');
    // Rummets glasade sidor vetter mot lokalens söder (−z) och öster (+x).
    const f = PREMISES_FRAMES.glashornet;
    const glassSides = new Set<string>();
    g.raw.parts.walls.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && /^wall[NSEW]/.test(m.name) && (m.material as THREE.MeshStandardMaterial).transparent) glassSides.add(m.name[4]); });
    const c = g.toLocal([f.offsetX, f.offsetZ]);
    const toward = (dx: number, dz: number) => { const p = g.toLocal([f.offsetX + dx, f.offsetZ + dz]); const v = [p[0] - c[0], p[1] - c[1]]; return Math.abs(v[0]) > Math.abs(v[1]) ? (v[0] > 0 ? 'E' : 'W') : (v[1] > 0 ? 'N' : 'S'); };
    expect([...glassSides].sort()).toEqual([toward(1, 0), toward(0, -1)].sort());
    expect(names(g.pi.group).filter((n) => n.startsWith('wingStool')).length).toBeGreaterThanOrEqual(4);
    expect(names(g.pi.group)).toEqual(expect.arrayContaining(['wingSouthGlass', 'wingEastGlass', 'wingBench']));
  });

  it('rekvisitan står inte i vinbarens möbler, platser eller gångar', () => {
    for (const id of VENUES) {
      const { raw, pi } = build(id);
      const obstacles = getObstacles(raw);
      const spots = [...raw.seats.map((s) => s.local), ...raw.standing.map((s) => s.local), ...raw.staffStations.map((s) => s.local), ...raw.queueSpots.map((s) => s.local)];
      const inv = new THREE.Matrix4().copy(raw.group.matrixWorld).invert();
      pi.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || /Floor|Slab|Rug|Glass|Mullion|Head|Lower|Cap|Upper|Window/.test(m.name)) return;
        const b = new THREE.Box3().setFromObject(m).applyMatrix4(inv);
        for (const ob of obstacles) {
          const hit = b.min.x < ob.local[0] + ob.halfW && b.max.x > ob.local[0] - ob.halfW && b.min.z < ob.local[1] + ob.halfD && b.max.z > ob.local[1] - ob.halfD;
          expect([id, m.name, ob.id, hit]).toEqual([id, m.name, ob.id, false]);
        }
        for (const p of spots) {
          const d = Math.max(b.min.x - p[0], p[0] - b.max.x, b.min.z - p[1], p[1] - b.max.z);
          expect([id, m.name, d > 0.3]).toEqual([id, m.name, true]);
        }
      });
    }
  });

  it('AW-skylten står utanför källarens dörr de kvällar AW är vald, inte i kön', () => {
    const { raw, pi } = build('kallaren');
    const sign = pi.group.getObjectByName('afterWorkSign')!;
    expect(sign.visible).toBe(false);
    setAfterWorkSign(pi, true);
    expect(sign.visible).toBe(true);
    const at: [number, number] = [sign.position.x, sign.position.z];
    for (const q of raw.queueSpots) expect([q.id, Math.hypot(at[0] - q.local[0], at[1] - q.local[1]) > 1.0]).toEqual([q.id, true]);
    expect(at[0]).toBeGreaterThan(raw.width / 2);
    expect(build('salongen').pi.group.getObjectByName('afterWorkSign')).toBeUndefined();
  });

  it('valven, ljuskronorna och pendlarna tonar ut med taket', () => {
    for (const id of VENUES) {
      const { pi } = build(id);
      applyPremisesCeiling(pi, 0);
      expect([id, pi.ceiling.visible]).toEqual([id, false]);
      applyPremisesCeiling(pi, 1);
      expect([id, pi.ceiling.visible]).toEqual([id, true]);
    }
  });
});
