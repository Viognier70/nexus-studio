import { describe, expect, it } from 'vitest';
import { TOTAL_SEATS, computePlayerBusinessInterior } from '../interiorLayout';
import { inside } from '../../procgen/geom';
import { DEFAULT_POLICIES } from '../../simulation/model';

// The interior layout is deterministic — it derives from a compile-time
// building id + polygon in world.ts.  These tests pin the invariants
// the reducer, PlayerBusiness and InteriorGuests all depend on.

describe('TOTAL_SEATS', () => {
  it('is the Option 1 café sum: four 2-tops + one 4-top + four bar stools = 16', () => {
    expect(TOTAL_SEATS).toBe(16);
  });

  it('is what the reducer uses as its default capacity — no drift', () => {
    expect(DEFAULT_POLICIES.capacity).toBe(TOTAL_SEATS);
  });
});

describe('computePlayerBusinessInterior', () => {
  const layout = computePlayerBusinessInterior();

  it('returns a layout (player building resolves in the fixture world)', () => {
    expect(layout).not.toBeNull();
  });

  if (!layout) return;

  it('OBB dimensions match the known w869907975 footprint (~14.5 × ~10.1 m)', () => {
    // Longest edge of the rotated rectangle is ~14.51 m; perpendicular
    // side is ~10.09 m.  Tolerance keeps the test robust to sub-mm
    // polygon revisions.
    expect(layout.width).toBeGreaterThan(14);
    expect(layout.width).toBeLessThan(15);
    expect(layout.depth).toBeGreaterThan(9.5);
    expect(layout.depth).toBeLessThan(10.5);
  });

  it('OBB angle indicates the polygon is not axis-aligned (guards the AABB regression)', () => {
    // The building is rotated ~7° east of true north; angle is in
    // radians measured CCW from world +X.  Anything within 0.05 rad
    // of an axis would mean an AABB has re-crept in somewhere.
    const nearAxis = [0, Math.PI / 2, Math.PI, -Math.PI / 2].some(
      (a) => Math.abs(layout.worldAngle - a) < 0.05
    );
    expect(nearAxis).toBe(false);
  });

  it('has exactly five tables in the approved mix (four 2-tops + one 4-top)', () => {
    expect(layout.tables).toHaveLength(5);
    const twoTops = layout.tables.filter((t) => t.kind === 'two');
    const fourTops = layout.tables.filter((t) => t.kind === 'four');
    expect(twoTops).toHaveLength(4);
    expect(fourTops).toHaveLength(1);
    expect(twoTops.every((t) => t.seats === 2)).toBe(true);
    expect(fourTops.every((t) => t.seats === 4)).toBe(true);
  });

  it('has four bar stools', () => {
    expect(layout.barStoolPositions).toHaveLength(4);
  });

  it('flat seats array is TOTAL_SEATS entries', () => {
    expect(layout.seats).toHaveLength(TOTAL_SEATS);
  });

  it('every seat that belongs to a table sits inside the OSM building polygon', () => {
    // The last 4 entries in `seats` are bar stools, positioned by
    // design just outside the bar strip (still inside the building).
    // All table seats must be inside; the bar stools test separately.
    const tableSeatCount = TOTAL_SEATS - layout.barStoolPositions.length;
    for (let i = 0; i < tableSeatCount; i++) {
      const [sx, sz] = layout.seats[i];
      const insidePoly = inside(layout.building.poly, sx, sz);
      expect(insidePoly, `seat ${i} at (${sx.toFixed(2)}, ${sz.toFixed(2)}) is outside the polygon`).toBe(true);
    }
  });

  it('every bar stool sits inside the OSM building polygon', () => {
    for (const [sx, sz] of layout.barStoolPositions) {
      const insidePoly = inside(layout.building.poly, sx, sz);
      expect(insidePoly).toBe(true);
    }
  });

  it('the bar strip centre sits inside the polygon', () => {
    const [bx, bz] = layout.bar.worldPosition;
    expect(inside(layout.building.poly, bx, bz)).toBe(true);
  });

  it('the bar rotates with the room (worldAngle matches OBB)', () => {
    expect(layout.bar.worldAngle).toBe(layout.worldAngle);
  });

  it('the bar length is a fraction of the room, not larger', () => {
    expect(layout.bar.lengthM).toBeGreaterThan(0);
    expect(layout.bar.lengthM).toBeLessThan(layout.width);
  });

  it('the entrance sits inside the polygon; the waiting spot sits outside', () => {
    const [ex, ez] = layout.entrance;
    const [wx, wz] = layout.waitingSpot;
    expect(inside(layout.building.poly, ex, ez)).toBe(true);
    expect(inside(layout.building.poly, wx, wz)).toBe(false);
  });

  it('no two seats collapse onto the same point (all distinct within 1 cm)', () => {
    for (let i = 0; i < layout.seats.length; i++) {
      for (let j = i + 1; j < layout.seats.length; j++) {
        const dx = layout.seats[i][0] - layout.seats[j][0];
        const dz = layout.seats[i][1] - layout.seats[j][1];
        const d = Math.hypot(dx, dz);
        expect(d, `seats ${i} and ${j} collapse (${d.toFixed(3)} m apart)`).toBeGreaterThan(0.01);
      }
    }
  });

  it('every table\'s seatWorldPositions has as many entries as its seat count', () => {
    for (const t of layout.tables) {
      expect(t.seatWorldPositions).toHaveLength(t.seats);
    }
  });

  it('totalSeats echoed on the layout equals the compile-time constant', () => {
    expect(layout.totalSeats).toBe(TOTAL_SEATS);
  });
});
