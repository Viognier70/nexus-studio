// ORDER 056 approval criteria — geometry invariants for buildFacade.
//
//   wall height  = våningar × 2.70 + sockel + takfot(as applicable)
//   roof pitch   = declared takvinkel

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildFacade } from '../buildFacade';
import { SOCKELHOJD_M, VANINGSHOJD_M, TAKFOT_M } from '../schema';
import type { FacadeParams } from '../schema';

// Fixture: a 10 m × 6 m rectangle centred at origin, CCW.
const RECT: readonly [number, number][] = [
  [-5, -3],
  [ 5, -3],
  [ 5,  3],
  [-5,  3]
];

function baseParams(overrides: Partial<FacadeParams> = {}): FacadeParams {
  return {
    kulor: 'falurod',
    panel: 'locklist',
    vaningar: 2,
    takvinkel: 30,
    taktackning: 'tegel',
    knutar: 'vit',
    sockel: 'grasten',
    fonsterrytm: 0.25,
    fonstertyp: 'korspost',
    ...overrides
  };
}

function bboxHeight(geo: THREE.BufferGeometry | null): { min: number; max: number } | null {
  if (!geo) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
  if (!pos) return null;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < min) min = y;
    if (y > max) max = y;
  }
  return { min, max };
}

describe('buildFacade — wall height (ORDER 056 approval §2)', () => {
  it('2-storey with sockel: walls span sockel..(sockel + 2×2.70)', () => {
    const g = buildFacade(RECT, baseParams({ vaningar: 2, sockel: 'grasten' }), 1);
    const b = bboxHeight(g.walls)!;
    // Wall face spans sockel top .. wallTopY = 0.35 + 5.40 = 5.75
    expect(b.min).toBeCloseTo(SOCKELHOJD_M, 3);
    expect(b.max).toBeCloseTo(SOCKELHOJD_M + 2 * VANINGSHOJD_M, 3);
    // Reported top matches.
    expect(g.wallTopY).toBeCloseTo(SOCKELHOJD_M + 2 * VANINGSHOJD_M, 5);
  });

  it('1-storey without sockel: walls span 0..2.70', () => {
    const g = buildFacade(RECT, baseParams({ vaningar: 1, sockel: 'ingen' }), 1);
    const b = bboxHeight(g.walls)!;
    expect(b.min).toBeCloseTo(0, 3);
    expect(b.max).toBeCloseTo(VANINGSHOJD_M, 3);
    expect(g.wallTopY).toBeCloseTo(VANINGSHOJD_M, 5);
  });

  it('1.5-storey with sockel: walls span sockel..(sockel + 1.5×2.70)', () => {
    const g = buildFacade(RECT, baseParams({ vaningar: 1.5, sockel: 'puts' }), 1);
    expect(g.wallTopY).toBeCloseTo(SOCKELHOJD_M + 1.5 * VANINGSHOJD_M, 5);
  });

  it('sockel geometry sits at 0..SOCKELHOJD_M when present', () => {
    const g = buildFacade(RECT, baseParams({ sockel: 'grasten' }), 1);
    const b = bboxHeight(g.sockel)!;
    expect(b.min).toBeCloseTo(0, 3);
    expect(b.max).toBeCloseTo(SOCKELHOJD_M, 3);
  });

  it('sockel bucket is null when sockel = "ingen"', () => {
    const g = buildFacade(RECT, baseParams({ sockel: 'ingen' }), 1);
    expect(g.sockel).toBeNull();
  });
});

describe('buildFacade — roof pitch (ORDER 056 approval §2)', () => {
  it('ridge height matches tan(takvinkel) × (halfShort + takfot)', () => {
    for (const angle of [22, 30, 38, 45]) {
      const g = buildFacade(RECT, baseParams({ takvinkel: angle, sockel: 'grasten', vaningar: 2 }), 1);
      // RECT short axis is 6 m → half-short = 3 m → +takfot = 3.6 m.
      const expectedRise = Math.tan(angle * Math.PI / 180) * (3 + TAKFOT_M);
      const actualRise = g.ridgeY - g.wallTopY;
      expect(actualRise).toBeCloseTo(expectedRise, 3);
    }
  });

  it('roof geometry\'s topmost vertex sits at ridgeY', () => {
    const g = buildFacade(RECT, baseParams({ takvinkel: 30 }), 1);
    const b = bboxHeight(g.roof)!;
    expect(b.max).toBeCloseTo(g.ridgeY, 3);
  });
});

describe('buildFacade — roof follows polygon (ORDER 058)', () => {
  // XZ bounding box of a THREE.BufferGeometry attribute — used to
  // check that the roof projects OVER the wall polygon rather than
  // shrinking away or drifting sideways.
  function bboxXZ(geo: THREE.BufferGeometry | null) {
    if (!geo) return null;
    const pos = geo.attributes.position;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return { minX, maxX, minZ, maxZ };
  }
  function polyBbox(poly: readonly [number, number][]) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of poly) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return { minX, maxX, minZ, maxZ };
  }

  it('rectangular footprint — roof XZ bounds strictly contain the wall polygon', () => {
    const g = buildFacade(RECT, baseParams(), 1);
    const roof = bboxXZ(g.roof)!;
    const poly = polyBbox(RECT);
    // Roof must extend BEYOND the wall on every side by the eave.
    expect(roof.minX).toBeLessThan(poly.minX);
    expect(roof.maxX).toBeGreaterThan(poly.maxX);
    expect(roof.minZ).toBeLessThan(poly.minZ);
    expect(roof.maxZ).toBeGreaterThan(poly.maxZ);
  });

  it('L-shaped footprint — roof XZ bounds strictly contain the wall polygon', () => {
    // Simple L shape, CCW oriented.
    const L: readonly [number, number][] = [
      [ 0,  0],
      [10,  0],
      [10,  4],
      [ 4,  4],
      [ 4,  8],
      [ 0,  8]
    ];
    const g = buildFacade(L, baseParams({ takvinkel: 30 }), 1);
    const roof = bboxXZ(g.roof)!;
    const poly = polyBbox(L);
    expect(roof.minX).toBeLessThan(poly.minX);
    expect(roof.maxX).toBeGreaterThan(poly.maxX);
    expect(roof.minZ).toBeLessThan(poly.minZ);
    expect(roof.maxZ).toBeGreaterThan(poly.maxZ);
  });

  it('L-shaped footprint — walls are inside roof XZ bounds (regression check)', () => {
    const L: readonly [number, number][] = [
      [ 0,  0],
      [10,  0],
      [10,  4],
      [ 4,  4],
      [ 4,  8],
      [ 0,  8]
    ];
    const g = buildFacade(L, baseParams({ takvinkel: 30, fonsterrytm: 0.20 }), 1);
    const roof = bboxXZ(g.roof)!;
    const walls = bboxXZ(g.walls)!;
    // Every wall vertex must sit inside the roof footprint.
    expect(walls.minX).toBeGreaterThanOrEqual(roof.minX);
    expect(walls.maxX).toBeLessThanOrEqual(roof.maxX);
    expect(walls.minZ).toBeGreaterThanOrEqual(roof.minZ);
    expect(walls.maxZ).toBeLessThanOrEqual(roof.maxZ);
  });

  it('rotated 45° rectangle — roof still aligns with polygon (not axis-aligned)', () => {
    // A rotated rectangle: the old OBB-based roof aligned with the OBB
    // long axis, which for this polygon lands at 45° — new roof follows
    // the polygon edges instead.
    const c = Math.cos(Math.PI / 4), s = Math.sin(Math.PI / 4);
    const R = 5, r = 3;
    const rotated: readonly [number, number][] = [
      [-R * c + r * s, -R * s - r * c],
      [ R * c + r * s,  R * s - r * c],
      [ R * c - r * s,  R * s + r * c],
      [-R * c - r * s, -R * s + r * c]
    ];
    const g = buildFacade(rotated, baseParams(), 1);
    const roof = bboxXZ(g.roof)!;
    const poly = polyBbox(rotated);
    expect(roof.minX).toBeLessThan(poly.minX);
    expect(roof.maxX).toBeGreaterThan(poly.maxX);
    expect(roof.minZ).toBeLessThan(poly.minZ);
    expect(roof.maxZ).toBeGreaterThan(poly.maxZ);
  });

  it('non-rectangular convex footprint — eave sits at exactly TAKFOT_M perpendicular distance from each wall edge (ORDER 057 §3)', async () => {
    // Reads TAKFOT_M via the schema module so the test tracks the
    // canonical value and updates automatically if the constant moves.
    const { TAKFOT_M } = await import('../schema');
    // Convex non-rectangular polygon — a pentagon shaped like a house
    // with a chamfered corner. All interior angles < 180°, so
    // "constant overhang" is strictly satisfiable at every vertex.
    // (Reflex vertices on L-shapes legitimately run longer overhangs
    // because both adjacent edges' outward normals point away from
    // the concave notch — that case is tested implicitly by the
    // AABB-containment test above.)
    const CHAMFERED: readonly [number, number][] = [
      [ 0,  0],
      [10,  0],
      [12,  3],
      [ 8,  8],
      [ 0,  8]
    ];
    const g = buildFacade(CHAMFERED, baseParams({ takvinkel: 30, fonsterrytm: 0.20 }), 1);
    // Extract the roof eave points at y = wallTopY. In the current
    // geometry those are the lower ring of the roof (min-Y vertices).
    const pos = g.roof.attributes.position;
    const eaveY = g.wallTopY;
    // Eave points sit at wallTopY exactly (buildRoof emits them as
    // the bottom edge of each sloped face). Use a small tolerance
    // to survive Float32 round-trip in the BufferAttribute.
    const eavePoints: [number, number][] = [];
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getY(i) - eaveY) < 1e-3) {
        eavePoints.push([pos.getX(i), pos.getZ(i)]);
      }
    }
    expect(eavePoints.length, 'no eave points detected').toBeGreaterThan(0);
    // For each wall edge: the closest eave point that projects onto
    // that edge should sit at ≈ TAKFOT_M outside the edge line, along
    // its outward normal.
    for (let i = 0; i < CHAMFERED.length; i++) {
      const a = CHAMFERED[i];
      const b = CHAMFERED[(i + 1) % CHAMFERED.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      const tx = dx / len, tz = dz / len;
      const nx = tz, nz = -tx;   // outward normal for CCW polygon
      let closestOffset = Infinity;
      for (const [ex, ez] of eavePoints) {
        const d = (ex - a[0]) * nx + (ez - a[1]) * nz;
        const along = (ex - a[0]) * tx + (ez - a[1]) * tz;
        // Two filters: the projection must fall on (or near) the
        // edge span, AND the point must be on the OUTWARD side of
        // the edge (positive d, within a plausible offset range).
        // Without the outward-side filter, points on the far side
        // of the polygon can score as "closest" purely by parametric
        // projection along the infinite line.
        // Widen the along-filter to include the vertex offsets that
        // land ~TAKFOT_M outside the edge endpoints (a right-angle
        // corner offset lands √2 × TAKFOT_M out along both edges'
        // extended axis lines).
        if (along < -TAKFOT_M * 2 || along > len + TAKFOT_M * 2) continue;
        if (d < -0.05 || d > TAKFOT_M * 3) continue;
        if (Math.abs(d - TAKFOT_M) < Math.abs(closestOffset - TAKFOT_M)) {
          closestOffset = d;
        }
      }
      expect(
        Math.abs(closestOffset - TAKFOT_M),
        `edge ${i} (${a}→${b}) offset was ${closestOffset.toFixed(3)}`
      ).toBeLessThan(0.05);
    }
  });

  it('no roof vertex escapes the polygon boundary by more than the bisector-clamp bound (ORDER 058 §2)', async () => {
    const { TAKFOT_M } = await import('../schema');
    // Test intent per the order: bound how far roof vertices can
    // shoot past the building silhouette. The literal
    // "hull + TAKFOT_M" region is stricter than correctly mitered
    // right-angle corners can satisfy (a right angle produces vertex
    // offset TAKFOT × √2 = ~1.4 × TAKFOT from the corner vertex).
    // The generator clamps bisector-offset scale at MAX_BISECTOR_SCALE
    // (currently 2) so no vertex can escape by more than that × the
    // base distance. TAKFOT × 2 = 0.8 m for eaves. Ridge points are
    // inward offsets so never escape the polygon on the outside.
    const MAX_ESCAPE_M = TAKFOT_M * 2 + 0.02;   // matches MAX_BISECTOR_SCALE

    // Signed distance from p to polygon: positive outside (escape
    // distance), negative inside (max inscribed radius toward this
    // point). Ridge points are inside so return negative and pass
    // trivially; eave points are outside so return positive and are
    // bounded by MAX_ESCAPE_M.
    function pointInPolygon(p: [number, number], poly: readonly (readonly [number, number])[]): boolean {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, zi] = poly[i];
        const [xj, zj] = poly[j];
        const hit = (zi > p[1]) !== (zj > p[1]) &&
          p[0] < ((xj - xi) * (p[1] - zi)) / ((zj - zi) || 1e-12) + xi;
        if (hit) inside = !inside;
      }
      return inside;
    }
    function boundaryDistance(p: [number, number], poly: readonly (readonly [number, number])[]): number {
      let best = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len2 = dx * dx + dz * dz;
        if (len2 < 1e-9) continue;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
        const px = a[0] + t * dx;
        const pz = a[1] + t * dz;
        const d = Math.hypot(p[0] - px, p[1] - pz);
        if (d < best) best = d;
      }
      return best;
    }
    function signedDistanceToPolygon(p: [number, number], poly: readonly (readonly [number, number])[]): number {
      const d = boundaryDistance(p, poly);
      return pointInPolygon(p, poly) ? -d : d;
    }

    const cases: readonly (readonly (readonly [number, number])[])[] = [
      RECT,
      [[ 0,  0], [10,  0], [12,  3], [ 8,  8], [ 0,  8]],   // convex pentagon
      [[ 0,  0], [10,  0], [10,  4], [ 4,  4], [ 4,  8], [ 0,  8]],   // L-shape (reflex)
      [[ 0,  0], [ 8,  0], [ 8,  2], [ 6,  2], [ 6,  6], [ 0,  6]],   // step-shape (reflex)
      [[ 0,  0], [20,  0], [22,  1], [ 0,  2]]   // acute-corner sliver
    ];
    for (const poly of cases) {
      const g = buildFacade(poly, baseParams({ takvinkel: 40, sockel: 'grasten' }), 1);
      const pos = g.roof.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const d = signedDistanceToPolygon([x, z], poly);
        expect(
          d,
          `roof vertex ${i} at (${x.toFixed(2)}, ${z.toFixed(2)}) is ${d.toFixed(2)} m outside polygon (poly=${JSON.stringify(poly)})`
        ).toBeLessThanOrEqual(MAX_ESCAPE_M);
      }
    }
  });

  it('every window centre lies within 0.1 m of a wall face (ORDER 058 §1)', () => {
    // Every window frame + glass + sill mesh is emitted with its
    // centre AT a point on (or ε outside) the wall polygon. If any
    // land far from a wall, the addOneWindow / outwardBox math is
    // pushing them off the building — the "hundreds of frames on
    // the ground" bug the Vision Owner sighted.
    const cases: readonly (readonly (readonly [number, number])[])[] = [
      RECT,
      [[ 0,  0], [10,  0], [12,  3], [ 8,  8], [ 0,  8]],   // pentagon
      [[ 0,  0], [10,  0], [10,  4], [ 4,  4], [ 4,  8], [ 0,  8]]  // L-shape
    ];
    for (const poly of cases) {
      const g = buildFacade(poly, baseParams({ fonsterrytm: 0.30 }), 1);
      const buckets = [g.windowFrames, g.windowGlass, g.windowSills];
      for (const geo of buckets) {
        if (!geo) continue;
        const pos = geo.attributes.position;
        // Iterate merged vertices; each face's centroid is a point
        // we want within 0.1 m of some polygon edge. Sample per
        // ~24 vertices (2 tris × 4 vertices per box + boxes-per-
        // window; enough to catch a systematic offset without
        // O(n²) explosion).
        const n = pos.count;
        for (let i = 0; i < n; i++) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          // Distance from (x, z) to the closest polygon edge segment.
          let bestD = Infinity;
          for (let e = 0; e < poly.length; e++) {
            const a = poly[e];
            const b = poly[(e + 1) % poly.length];
            const dx = b[0] - a[0];
            const dz = b[1] - a[1];
            const len2 = dx * dx + dz * dz;
            if (len2 < 1e-6) continue;
            const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
            const px = a[0] + t * dx;
            const pz = a[1] + t * dz;
            const d = Math.hypot(x - px, z - pz);
            if (d < bestD) bestD = d;
          }
          expect(
            bestD,
            `window vertex ${i} at (${x.toFixed(2)}, ${z.toFixed(2)}) is ${bestD.toFixed(2)} m from any wall`
          ).toBeLessThan(0.10);   // ORDER 058 §1 spec: within 0.1 m
        }
      }
    }
  });

  it('CW-wound OSM polygon produces equivalent wall geometry to CCW input (ORDER 059 §3)', () => {
    // 31 of 138 eligible Grythyttan houses ship as CW polygons in
    // WORLD.buildings. Under CW input the code's outward-normal
    // convention flipped, which:
    //   (a) rendered wall face-normals inward (three.js FrontSide
    //       culling hid them — the "windows in the air" bug)
    //   (b) offset eaves INTO the polygon instead of over the walls
    //   (c) placed window frame/sill outward-offsets on the wrong side
    // Fix: `ensureCCW` normalises polygon winding at entry to
    // buildFacade so all downstream code sees a CCW polygon. This
    // test verifies determinism across windings: CW input produces
    // the same wall-triangle count as CCW input, meaning the wall
    // bucket is populated identically.
    const rectCCW: readonly (readonly [number, number])[] = [
      [-5, -3], [5, -3], [5, 3], [-5, 3]
    ];
    const rectCW = [...rectCCW].reverse();
    const gCCW = buildFacade(rectCCW, baseParams(), 1);
    const gCW  = buildFacade(rectCW,  baseParams(), 1);
    // Wall bucket must have the same triangle count for both windings.
    expect(gCW.walls.getIndex()?.count).toBe(gCCW.walls.getIndex()?.count);
    // Eave points must sit OUTSIDE the polygon in both cases (not
    // retracted inward — the CW-without-fix regression). Both eave
    // rings are the same set of points up to ordering.
    const eaveYFor = (g: typeof gCCW) => {
      const pos = g.roof.attributes.position;
      const eave = new Set<string>();
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - g.wallTopY) < 1e-3) {
          eave.add(`${pos.getX(i).toFixed(2)},${pos.getZ(i).toFixed(2)}`);
        }
      }
      return eave;
    };
    const eaveCCW = eaveYFor(gCCW);
    const eaveCW = eaveYFor(gCW);
    expect(eaveCW.size).toBe(eaveCCW.size);
    for (const p of eaveCW) expect(eaveCCW.has(p)).toBe(true);
  });

  it('wall face normals point OUTWARD for CCW and CW input (ORDER 060 §2)', () => {
    // Reinstates the assertion softened during the ORDER 059 fix
    // pass. After ORDER 060 §1 fixed the `quadFromEdgeToTop`
    // winding, every wall-face triangle's face normal must point
    // OUTWARD from the polygon.
    //
    // "Outward" verified by stepping the triangle centroid a small
    // ε along the face normal (in XZ) and asking whether the new
    // point is INSIDE the polygon. If ε · normal moves us into the
    // interior, the normal points inward (fail); if it moves us
    // outside, the normal points outward (pass). This works on
    // convex, reflex, and non-convex polygons where a centroid-
    // based "outward-direction" heuristic breaks down (e.g. the
    // notch edge of an L-shape whose outward normal is orthogonal
    // to the polygon centroid → triangle centroid vector).
    //
    // NOTE — the wall bucket also contains panel-relief boxes
    // (locklist strips) when `panel === 'locklist'`. Each strip is
    // a full BoxGeometry, half of whose faces are inward-facing by
    // construction. To isolate the flat wall-face quads produced by
    // quadFromEdgeToTop, this test uses `panel: 'staende_lockpanel'`
    // which skips locklist strip emission.
    function pointInPoly(px: number, pz: number, poly: readonly (readonly [number, number])[]): boolean {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, zi] = poly[i];
        const [xj, zj] = poly[j];
        const hit = (zi > pz) !== (zj > pz) &&
          px < ((xj - xi) * (pz - zi)) / ((zj - zi) || 1e-12) + xi;
        if (hit) inside = !inside;
      }
      return inside;
    }
    const cases: readonly [string, readonly (readonly [number, number])[]][] = [
      ['rect-CCW', [[-5, -3], [5, -3], [5, 3], [-5, 3]] as const],
      ['rect-CW',  [[-5, 3], [5, 3], [5, -3], [-5, -3]] as const],
      ['pentagon-CCW', [[0, 0], [10, 0], [12, 3], [8, 8], [0, 8]] as const],
      // L-shape CCW — includes a reflex vertex on the concave corner
      ['L-CCW', [[0, 0], [10, 0], [10, 4], [4, 4], [4, 8], [0, 8]] as const]
    ];
    for (const [label, poly] of cases) {
      const g = buildFacade(
        poly,
        baseParams({ panel: 'staende_lockpanel' }),
        1
      );
      const pos = g.walls.attributes.position;
      const idx = g.walls.getIndex();
      expect(idx, `${label}: wall bucket has no index`).not.toBeNull();
      if (!idx) continue;
      const triCount = idx.count / 3;
      // Require a meaningful sample so a future refactor that empties
      // the wall bucket doesn't turn this into a vacuous pass.
      expect(triCount, `${label}: too few wall triangles to test`).toBeGreaterThan(4);
      const EPS = 0.01;
      for (let t = 0; t < triCount; t++) {
        const i0 = idx.getX(t * 3);
        const i1 = idx.getX(t * 3 + 1);
        const i2 = idx.getX(t * 3 + 2);
        const v0 = [pos.getX(i0), pos.getY(i0), pos.getZ(i0)];
        const v1 = [pos.getX(i1), pos.getY(i1), pos.getZ(i1)];
        const v2 = [pos.getX(i2), pos.getY(i2), pos.getZ(i2)];
        // Face normal via right-hand rule.
        const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        const nx = e1[1] * e2[2] - e1[2] * e2[1];
        const ny = e1[2] * e2[0] - e1[0] * e2[2];
        const nz = e1[0] * e2[1] - e1[1] * e2[0];
        const nlenXZ = Math.hypot(nx, nz);
        if (nlenXZ < 1e-6) continue;   // horizontal triangle (top / bottom face)
        void ny;
        // Normalise XZ + step ε from triangle centroid along it.
        const nxN = nx / nlenXZ;
        const nzN = nz / nlenXZ;
        const tcx = (v0[0] + v1[0] + v2[0]) / 3;
        const tcz = (v0[2] + v1[2] + v2[2]) / 3;
        const px = tcx + nxN * EPS;
        const pz = tcz + nzN * EPS;
        const insideOut = pointInPoly(px, pz, poly);
        expect(
          insideOut,
          `${label} triangle ${t}: stepping ε along face-normal (${nxN.toFixed(2)}, ${nzN.toFixed(2)}) from (${tcx.toFixed(2)}, ${tcz.toFixed(2)}) landed INSIDE polygon — normal points inward`
        ).toBe(false);
      }
    }
  });

  it('roof face normals point OUTWARD (upward + ridge-to-eave direction) for CCW and CW input (ORDER 061 §B)', () => {
    // Mirror of the wall-normal test at §2 above, adapted for the
    // sloped roof geometry produced by `buildRoof`. Each sloped roof
    // face has an explicitly-written normal (four vertices per face,
    // all sharing the same face normal — see buildFacade.ts
    // §buildRoof). For a correctly-wound roof:
    //   1. The face-normal's Y component must be POSITIVE (upward —
    //      a roof face turned skyward, not into the attic).
    //   2. The face-normal's XZ component must point from the ridge
    //      toward the eave. This is the natural outward direction of
    //      a sloped roof face: it points down-slope, away from the
    //      building's central axis, over the wall. On a rectangle-
    //      shaped roof it corresponds directly to the outward normal
    //      of the wall edge beneath it; on L-shape reflex corners it
    //      still points into the notch (the eave outlet direction),
    //      which is correct for that face.
    // The buggy `d1 × d2` cross-product inverts both conditions: for
    // the south face of a CCW rectangle the normal evaluates to
    // (0, -42, +14H) — Y negative (DOWN into the attic) and Z
    // positive (NORTH, ridge-ward, away from eave) when "south face"
    // outward = (0, +, -). Sun overhead → dot(normal, -sunDir)
    // clamps to zero → no diffuse contribution → roof reads black.
    // This test locks in the outward convention so a future edit
    // can't silently break it again.
    const cases: readonly [string, readonly (readonly [number, number])[]][] = [
      ['rect-CCW', [[-5, -3], [5, -3], [5, 3], [-5, 3]] as const],
      ['rect-CW',  [[-5, 3], [5, 3], [5, -3], [-5, -3]] as const],
      ['pentagon-CCW', [[0, 0], [10, 0], [12, 3], [8, 8], [0, 8]] as const],
      ['L-CCW', [[0, 0], [10, 0], [10, 4], [4, 4], [4, 8], [0, 8]] as const]
    ];
    for (const [label, poly] of cases) {
      const g = buildFacade(poly, baseParams({ takvinkel: 30 }), 1);
      const pos = g.roof.attributes.position;
      const norms = g.roof.attributes.normal;
      const idx = g.roof.getIndex();
      expect(idx, `${label}: roof bucket has no index`).not.toBeNull();
      expect(norms, `${label}: roof bucket has no normals`).not.toBeUndefined();
      if (!idx || !norms) continue;
      const wallTopY = g.wallTopY;
      const ridgeY = g.ridgeY;
      const triCount = idx.count / 3;
      let slopedChecked = 0;
      for (let t = 0; t < triCount; t++) {
        const i0 = idx.getX(t * 3);
        const i1 = idx.getX(t * 3 + 1);
        const i2 = idx.getX(t * 3 + 2);
        const nx = norms.getX(i0);
        const ny = norms.getY(i0);
        const nz = norms.getZ(i0);
        // Skip the horizontal cap triangles (normal is (0, 1, 0)).
        if (Math.abs(ny - 1) < 1e-3 && Math.abs(nx) < 1e-3 && Math.abs(nz) < 1e-3) continue;
        slopedChecked += 1;
        // Condition 1 — Y component positive (face turned skyward).
        expect(
          ny,
          `${label} tri ${t}: face normal Y = ${ny.toFixed(3)} — roof face points DOWNWARD (into building attic)`
        ).toBeGreaterThan(0);
        // Condition 2 — XZ component points from ridge toward eave.
        // Classify the triangle's three vertices by their Y coord:
        // eave vertices sit at wallTopY, ridge vertices at ridgeY.
        // The ridge → eave direction in XZ is the natural outward
        // direction for the face.
        let eaveXsum = 0, eaveZsum = 0, eaveN = 0;
        let ridgeXsum = 0, ridgeZsum = 0, ridgeN = 0;
        for (const vi of [i0, i1, i2]) {
          const y = pos.getY(vi);
          const x = pos.getX(vi);
          const z = pos.getZ(vi);
          if (Math.abs(y - wallTopY) < 1e-3) { eaveXsum += x; eaveZsum += z; eaveN++; }
          else if (Math.abs(y - ridgeY) < 1e-3) { ridgeXsum += x; ridgeZsum += z; ridgeN++; }
        }
        if (eaveN === 0 || ridgeN === 0) continue;   // degenerate face
        const eaveX = eaveXsum / eaveN, eaveZ = eaveZsum / eaveN;
        const ridgeX = ridgeXsum / ridgeN, ridgeZ = ridgeZsum / ridgeN;
        const rex = eaveX - ridgeX, rez = eaveZ - ridgeZ;
        const relen = Math.hypot(rex, rez);
        if (relen < 1e-6) continue;   // ridge and eave XZ coincide
        const rexN = rex / relen, rezN = rez / relen;
        const nlenXZ = Math.hypot(nx, nz);
        if (nlenXZ < 1e-6) continue;
        const nxN = nx / nlenXZ, nzN = nz / nlenXZ;
        const dot = nxN * rexN + nzN * rezN;
        // Threshold 0 catches the bug (which produces dot ≈ -1) while
        // tolerating reflex-corner faces on L-shapes where the ridge
        // point is pinned to the corner vertex — its ridge→eave XZ
        // direction is dominated by the neighbouring vertex's offset
        // and reads at 60-70° off the local face-normal, but always
        // in the correct hemisphere.
        expect(
          dot,
          `${label} tri ${t}: face-normal XZ (${nxN.toFixed(2)}, ${nzN.toFixed(2)}) vs ridge→eave dir (${rexN.toFixed(2)}, ${rezN.toFixed(2)}) dot = ${dot.toFixed(3)} — normal XZ points backward (toward ridge, into the building)`
        ).toBeGreaterThan(0);
      }
      expect(
        slopedChecked,
        `${label}: no sloped roof triangles checked`
      ).toBeGreaterThan(2);
    }
  });

  it('walls are never empty for a valid polygon (no floating roof)', () => {
    // If this ever fails, some polygon is producing zero wall geometry
    // and the roof would render unsupported — the "red-roof no walls"
    // bug the Vision Owner sighted.
    for (const poly of [
      RECT,
      // Long-thin
      [[0, 0], [30, 0], [30, 4], [0, 4]] as [number, number][],
      // L-shape
      [[0, 0], [10, 0], [10, 4], [4, 4], [4, 8], [0, 8]] as [number, number][],
      // Pentagon
      [[0, 0], [10, 0], [12, 5], [5, 10], [-2, 5]] as [number, number][]
    ]) {
      const g = buildFacade(poly, baseParams(), 1);
      expect(g.walls.attributes.position, `no walls for ${JSON.stringify(poly)}`).toBeDefined();
      expect(g.walls.attributes.position.count).toBeGreaterThan(0);
    }
  });
});

describe('buildFacade — windows (ORDER 056 Del D)', () => {
  it('LOD 0 with fonsterrytm > 0 produces window frames + glass', () => {
    const g = buildFacade(RECT, baseParams({ fonsterrytm: 0.3 }), 1);
    expect(g.windowFrames).not.toBeNull();
    expect(g.windowGlass).not.toBeNull();
    expect(g.windowSills).not.toBeNull();
  });

  it('LOD 1 (mid) suppresses windows', () => {
    const g = buildFacade(RECT, baseParams({ fonsterrytm: 0.3 }), 1, { lod: 1 });
    expect(g.windowFrames).toBeNull();
    expect(g.windowGlass).toBeNull();
    expect(g.windowSills).toBeNull();
  });

  it('LOD 2 (far) suppresses windows and corners', () => {
    const g = buildFacade(RECT, baseParams(), 1, { lod: 2 });
    expect(g.windowFrames).toBeNull();
    expect(g.corners).toBeNull();
  });

  it('window glass sits between sill and wallTop, and above sockel', () => {
    const g = buildFacade(RECT, baseParams({ sockel: 'grasten' }), 1);
    const b = bboxHeight(g.windowGlass)!;
    // Sill Y = sockelH + FONSTER_SILL_M = 0.35 + 1.05 = 1.40
    // Window top Y = 1.40 + 1.35 = 2.75
    expect(b.min).toBeGreaterThan(SOCKELHOJD_M);
    expect(b.max).toBeLessThan(g.wallTopY);
  });

  it('LOD 0 walls have cutouts at window Y range (many more triangles than a flat quad)', () => {
    // A wall with cutouts is built as many small strips; a flat wall
    // is a single quad (2 tris = 6 index entries). If windowsCount > 0,
    // wall geometry index length must be substantially larger than
    // the LOD 1 (no windows) equivalent.
    const p = baseParams({ fonsterrytm: 0.35 });
    const g0 = buildFacade(RECT, p, 1, { lod: 0 });
    const g1 = buildFacade(RECT, p, 1, { lod: 1 });
    const idx0 = g0.walls.getIndex()?.count ?? 0;
    const idx1 = g1.walls.getIndex()?.count ?? 0;
    expect(idx0).toBeGreaterThan(idx1);
  });
});

describe('buildFacade — determinism', () => {
  it('same footprint + params + seed → identical vertex data', () => {
    const p = baseParams();
    const g1 = buildFacade(RECT, p, 7);
    const g2 = buildFacade(RECT, p, 7);
    expect(g1.walls.attributes.position.count).toBe(g2.walls.attributes.position.count);
    // Position arrays byte-identical.
    const a1 = g1.walls.attributes.position.array as Float32Array;
    const a2 = g2.walls.attributes.position.array as Float32Array;
    for (let i = 0; i < a1.length; i++) expect(a1[i]).toBe(a2[i]);
  });
});
