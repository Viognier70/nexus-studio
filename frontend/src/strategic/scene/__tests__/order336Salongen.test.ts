// ORDER 336 A och B (Anders 2026-10-22): salongen med åtta runda bord med vit duk i hela rummet, soffgruppen vid
// kakelugnen och vinbarens bar kvar i östra änden; källaren under gatan med dörren i norra långsidan och trappan ned.
// Rummet byggs som i spelet (BrewpubScene: createRoom med lokalens layout och höjd, lokalens interiör).
import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { setCurrentPremises } from '../../content/playerPremises';
import { pointInPolygon } from '../../content/roadSurface';
import { createRoom, roomSizeFor } from '../businessRoom';
import { doorPathFor, getObstacles, type WineBarRoom } from '../wineBarRoom';
import { applyPremisesInterior, cellarHoleWorld, premisesToRoomLocal, PREMISES_LOOK, type VenueId } from '../premisesInterior';
import { CELLAR_PLAN, layoutForPremises, planGroundLift, SALON_PLAN } from '../tablePlans';
import { PREMISES_FRAMES, premisesToWorld } from '../../content/premises';

type V2 = [number, number];
function build(id: VenueId) {
  setCurrentPremises(id);
  const L = computePlayerBusinessInterior()!;
  const room = createRoom('vinbaren', { ...roomSizeFor('vinbaren', L.width, L.depth), layout: layoutForPremises(id), interiorHeight: PREMISES_LOOK[id].heightM });
  const raw = room.raw as WineBarRoom;
  const pi = applyPremisesInterior(raw, id, premisesToRoomLocal(id, L.centre, L.worldAngle));
  return { raw, pi };
}
const names = (o: THREE.Object3D) => { const out: string[] = []; o.traverse((x) => { if ((x as THREE.Mesh).isMesh) out.push(x.name); }); return out; };

afterEach(() => setCurrentPremises('torget'));

describe('ORDER 336 A — salongen', () => {
  it('åtta runda bord med vit duk och soffgruppen, 35 platser; vinbarens bar kvar i östra änden utan pallar, lounger och tvåor', () => {
    const { raw } = build('salongen');
    expect(SALON_PLAN.tables.filter((t) => t.round && t.cloth).length).toBe(8);
    expect(raw.seats.length).toBe(35);
    expect(raw.seats.filter((s) => s.kind === 'lounge').map((s) => s.id).sort()).toEqual(['armchair', 'sofaN', 'sofaS']);
    expect(raw.seats.every((s) => s.kind !== 'bar')).toBe(true);
    const n = names(raw.group);
    expect(n).toEqual(expect.arrayContaining(['barCounterN', 'barCounterS', 'round1Cloth', 'round8Cloth']));
    expect(raw.seats.some((s) => /^lounge[AB]|^two[ABC]|^bar\d/.test(s.id))).toBe(false);
    expect(n.some((x) => /^stool\dSeat|^loungeACushion/.test(x))).toBe(false);
    // Fem bord väster om mellanväggen och tre i vinbarens del.
    expect(SALON_PLAN.tables.filter((t) => t.at[0] < -7.4).length).toBe(5);
  });
});

describe('ORDER 336 B — källaren under gatan', () => {
  it('dörren i norra långsidan (rummets södra vägg), östra väggen hel, kön längs norra fasaden på gatan', () => {
    const { raw } = build('kallaren');
    const d = CELLAR_PLAN.door!;
    expect(raw.entrance).toEqual(d.entrance);
    expect(raw.doorInward).toEqual([0, 1]);
    const east = raw.parts.walls.getObjectByName('wallE')!;
    expect(names(east).filter((x) => /Lower/.test(x)).length).toBe(1);
    const south = raw.parts.walls.getObjectByName('wallS')!;
    expect(names(south).filter((x) => /Lower/.test(x)).length).toBe(2);
    const out = raw.queueSpots.filter((q) => q.side === 'outside');
    expect(out.length).toBeGreaterThanOrEqual(5);
    for (const q of out) expect([q.id, q.local[1] < -raw.depth / 2, planGroundLift(CELLAR_PLAN, q.local[0], q.local[1])]).toEqual([q.id, true, -d.floorY]);
  });

  it('vägen från kön utanför till dörren går nedför trappan: gatans höjd uppe, golvets nere, aldrig genom muren', () => {
    const { raw } = build('kallaren');
    const d = CELLAR_PLAN.door!;
    const q = raw.queueSpots;
    const path = doorPathFor(raw, [q.find((x) => x.id === 'queueOut1')!.local as V2, q.find((x) => x.id === 'queueIn1')!.local as V2]);
    const lifts = path.map((p) => planGroundLift(CELLAR_PLAN, p[0], p[1]));
    expect(lifts[0]).toBeCloseTo(2.7, 5);
    expect(lifts[lifts.length - 1]).toBe(0);
    for (let i = 1; i < lifts.length; i++) expect(lifts[i]).toBeLessThanOrEqual(lifts[i - 1] + 1e-9);
    // Genom muren bara i dörren.
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1], path[i]];
      if ((a[1] < -raw.depth / 2) !== (b[1] < -raw.depth / 2)) expect([b[0] >= d.x0 && b[0] <= d.x1, a[0] >= d.x0 && a[0] <= d.x1]).toEqual([true, true]);
    }
    // I trappan: halvvägs ned mitt på trappan.
    expect(planGroundLift(CELLAR_PLAN, (d.stair.x0 + d.stair.x1) / 2, (d.stair.z0 + d.stair.z1) / 2)).toBeCloseTo(1.35, 5);
  });

  it('murarna står upp till gatan och huset ovanpå tonar ut med taket; hålet i marken rymmer rummet och trappan', () => {
    const { raw, pi } = build('kallaren');
    const pit = pi.group.getObjectByName('cellarPit')!;
    const b = new THREE.Box3().setFromObject(pit);
    expect(b.max.y).toBeGreaterThan(2.7);
    expect(names(pit).filter((x) => x.startsWith('cellarStep')).length).toBe(14);
    expect(pi.ceiling.getObjectByName('cellarHouse')).toBeTruthy();
    const hole = cellarHoleWorld('kallaren', raw)!;
    const f = PREMISES_FRAMES.kallaren, d = CELLAR_PLAN.door!;
    const inside = (p: V2) => pointInPolygon(hole, p[0], p[1]);
    for (const p of [[raw.width / 2, raw.depth / 2], [-raw.width / 2, -raw.depth / 2], [(d.stair.x0 + d.stair.xEnd) / 2, (d.stair.z0 + d.stair.z1) / 2]] as V2[]) expect([p, inside(premisesToWorld(f, p))]).toEqual([p, true]);
    // Kön på gatan står utanför hålet.
    for (const q of raw.queueSpots.filter((x) => x.side === 'outside')) expect([q.id, inside(premisesToWorld(f, q.local as V2))]).toEqual([q.id, false]);
    expect(cellarHoleWorld('salongen')).toBeNull();
  });

  it('inget möbelhinder i trappan och på vilplanet', () => {
    const { raw } = build('kallaren');
    const st = CELLAR_PLAN.door!.stair;
    for (const o of getObstacles(raw)) {
      const hit = o.local[0] + o.halfW > st.x0 && o.local[0] - o.halfW < st.xEnd && o.local[1] + o.halfD > st.z0 && o.local[1] - o.halfD < st.z1;
      expect([o.id, hit]).toEqual([o.id, false]);
    }
  });
});
