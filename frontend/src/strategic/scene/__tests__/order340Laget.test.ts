// ORDER 340 C (Anders 2026-10-23: "Laget syns: fler platser ger fler i personalen i rummet, med befintliga figurer (som
// 330 H)") — regissörens egna prov (samma som WineBarFigures ritar): lokalens servitörer (floor1–floor4) syns efter
// FrameInput.premisesServers, i servitörens kläder och roll, och tar servitörens uppgifter.
import { describe, expect, it } from 'vitest';
import { createWineBarRoom, walkPathToSeat, exitPathFromSeat, type WineBarRoom } from '../wineBarRoom';
import { groupsFor } from '../serviceFlow';
import { FLOOR_KEYS, STAFF_KEYS, WineBarDirector, type FrameInput, type StaffKey } from '../wineBarDirector';
import { ROLE_OF } from '../staffMarks';
import { SEATED_HIP_Y } from '../WineBarFigures';

function makeDirector(room: WineBarRoom): WineBarDirector {
  const queueSlots: [number, number][] = [];
  for (let i = 0; i < 10; i++) queueSlots.push([room.waitingSpot[0] + 0.8 * Math.floor(i / 2), i % 2 === 0 ? -0.5 : 0.5]);
  return new WineBarDirector(
    { seats: room.seats, staffStations: room.staffStations, entrance: room.entrance, waitingSpot: room.waitingSpot,
      floorY: room.floorY, width: room.width, depth: room.depth },
    { walkPathToSeat: (id) => walkPathToSeat(room, id), exitPathFromSeat: (id) => exitPathFromSeat(room, id),
      groups: groupsFor(room), queueSlots, spawn: [room.waitingSpot[0] + 6, 0], poolSize: 36, seatedHipY: SEATED_HIP_Y,
      miseSpots: room.miseSpots }
  );
}
const ix = (k: StaffKey) => STAFF_KEYS.indexOf(k);
const base = (t: number, o: Partial<FrameInput> = {}): FrameInput =>
  ({ t, guests: [], patienceSeconds: 60, giveUpSatisfaction: 0.35, unhappyThreshold: 0.65, takeover: null, ...o });

describe('ORDER 340 C — laget syns', () => {
  it('utan lokalens servitörer (Torget) syns ingen av dem; med två syns floor1 och floor2, som servitörer', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    for (let t = 0; t < 2; t += 0.1) d.update(base(t));
    for (const k of FLOOR_KEYS) expect([k, d.staffSamples[ix(k)].visible]).toEqual([k, false]);
    for (let t = 2; t < 30; t += 0.1) d.update(base(t, { premisesServers: 2 }));
    expect(FLOOR_KEYS.map((k) => d.staffSamples[ix(k)].visible)).toEqual([true, true, false, false]);
    for (const k of FLOOR_KEYS) expect(ROLE_OF[k]).toBe('waiter');
  });

  it('lokalens servitörer står inte på samma plats som servitören när de väntar', () => {
    const room = createWineBarRoom({ width: 14.6, depth: 11.0 });
    const d = makeDirector(room);
    for (let t = 0; t < 40; t += 0.1) d.update(base(t, { premisesServers: 4 }));
    const at = (k: StaffKey) => [d.staffSamples[ix(k)].x, d.staffSamples[ix(k)].z];
    const pts = ['server', ...FLOOR_KEYS].map((k) => at(k as StaffKey));
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])).toBeGreaterThan(0.3);
  });
});

describe('ORDER 340 D — gästerna tittar ut över de tomma borden', () => {
  it('huvudet vänds mot den tomma platsen under blicken, och inte utan tomma platser', async () => {
    const { createFigureRig } = await import('../figureRig');
    const { applyEmptyRoomLook, EMPTY_LOOK } = await import('../figureLife');
    const rig = createFigureRig({ variant: 'guest' });
    rig.root.position.set(0, 0, 0);
    rig.root.rotation.y = 0;
    // Den tomma platsen till höger om gästen (+x): vinkeln atan2(dx, dz) är positiv.
    const empty = [{ x: 3, z: 0 }];
    const yawAt = (t: number, list = empty) => { rig.joints.head.rotation.y = 0; applyEmptyRoomLook(rig, list, t, 0); return rig.joints.head.rotation.y; };
    const ts = Array.from({ length: 70 }, (_, i) => i * 0.1);
    const yaws = ts.map((t) => yawAt(t));
    expect(Math.max(...yaws)).toBeGreaterThan(0.5);
    expect(Math.min(...yaws)).toBeGreaterThanOrEqual(0);
    // En del av cykeln tittar gästen inte (lookS av cycleS).
    expect(yaws.filter((y) => y === 0).length).toBeGreaterThan(0);
    expect(ts.map((t) => yawAt(t, [])).every((y) => y === 0)).toBe(true);
    expect(EMPTY_LOOK.maxYaw).toBeLessThanOrEqual(1.2);
  });
});
