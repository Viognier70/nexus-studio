// ORDER 056 Del C+D — parametric facade generator.
//
// Pure function. Takes a polygon footprint + FacadeParams (+ seed for
// small local variations like which wall gets which window rhythm
// offset) and returns a bag of BufferGeometry objects grouped by
// material bucket. The wiring layer (ProceduralFacades) then mounts
// each bucket as a mesh with the appropriate material.
//
// Coordinate frame: 1 world unit = 1 m per ORDER 053 unit contract.
// All heights measured from the polygon's Y = 0 baseline. The
// caller lifts / rotates as needed via mesh transform.
//
// Approach: for each wall segment (edge of the footprint polygon),
// build:
//   - one large wall quad from Y=sockel to Y=wallTop
//   - N locklist strips as small boxes standing off the wall face
//   - corner boards at each vertex as vertical prisms
// Then a gable roof spanning the OBB's long axis with pitch
// `takvinkel` and eaves projected TAKFOT_M past each wall.
// Windows are laid out per fonsterrytm along the largest wall(s).
//
// Geometry is returned as pre-merged BufferGeometry per material
// bucket so the render layer can mount one mesh per bucket (small
// draw-call count) or feed the bucket into an InstancedMesh when
// multiple buildings share params.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  FONSTER_BREDD_M,
  FONSTER_HOJD_M,
  FONSTER_SILL_M,
  FODER_BREDD_M,
  FODER_DJUP_M,
  KNUTBRADA_BREDD_M,
  KNUTBRADA_DJUP_M,
  PANELLIST_AVSTAND_M,
  PANELLIST_BREDD_M,
  PANELLIST_DJUP_M,
  SOCKELHOJD_M,
  SPROJS_TJOCK_M,
  TAKFOT_M,
  VANINGSHOJD_M,
  type FacadeParams,
  type Fonstertyp
} from './schema';

export type LodLevel = 0 | 1 | 2;

export interface FacadeGeometry {
  walls: THREE.BufferGeometry;
  corners: THREE.BufferGeometry | null;
  roof: THREE.BufferGeometry;
  sockel: THREE.BufferGeometry | null;
  windowFrames: THREE.BufferGeometry | null;
  windowGlass: THREE.BufferGeometry | null;
  windowSills: THREE.BufferGeometry | null;
  // ORDER 061 Thread A — LOD 1 emissive-quad-per-facade fallback.
  // At strategic zoom every eligible house is LOD 1 (no real window
  // geometry). This bucket holds a simple emissive band per wall edge
  // so night lighting reads as "lit windows glowing in the village"
  // rather than a dark blob. Null at LOD 0 (real windows do the job)
  // and at LOD 1 when the building isn't flagged windowsLit at the
  // wiring layer, but populated for all LOD 1 builds — the wiring
  // layer skips it via material/mesh gating.
  lod1Emissive: THREE.BufferGeometry | null;
  // Derived geometry the caller may want to place lights or gameplay
  // markers against (e.g. "the door is here", "the first-floor window
  // faces southeast so a shaft of sun can land on the floor at 10:00").
  wallTopY: number;
  ridgeY: number;
}

export interface BuildFacadeOptions {
  // Y at which the polygon lies. Default 0.
  baseY?: number;
  // LOD level. 0 = full detail, 1 = no panel relief + no windows,
  // 2 = plain block.
  lod?: LodLevel;
}

// ---------- entry point ------------------------------------------------

/**
 * Build a facade + roof for the given footprint under the given params.
 * Returns a bag of BufferGeometry buckets grouped by material.
 *
 * `footprint` — array of [x, z] world XZ points, oriented counter-
 * clockwise, first ≠ last (closed implicitly). Minimum 3 points.
 * `params` — FacadeParams (see schema.ts).
 * `seed` — 32-bit seed used for the small local variations (window
 * rhythm phase per wall, etc.). Pass the OSM-id-derived hash so the
 * variations are stable per building.
 */
export function buildFacade(
  rawFootprint: readonly (readonly [number, number])[],
  params: FacadeParams,
  seed: number,
  options: BuildFacadeOptions = {}
): FacadeGeometry {
  // ORDER 059 §3 — normalise polygon winding to CCW. My wall / roof /
  // window code assumes CCW throughout (outward normal = right of
  // edge direction, quad winding calibrated for outward-facing
  // triangles). OSM polygons ship in either winding — 31 of 138
  // eligible Grythyttan houses ship as CW. Under CW input the wall
  // triangles' normals point INWARD and three.js's default frontface
  // culling hides the walls (leaving only the windows floating in
  // the air, which was the Vision Owner's sighting).
  const footprint = ensureCCW(rawFootprint);

  const baseY = options.baseY ?? 0;
  const lod: LodLevel = options.lod ?? 0;

  const sockelH = params.sockel === 'ingen' ? 0 : SOCKELHOJD_M;
  const wallH = params.vaningar * VANINGSHOJD_M;
  const wallTopY = baseY + sockelH + wallH;

  // ---------- walls (per edge) ---------------------------------------
  const wallGeos: THREE.BufferGeometry[] = [];
  const cornerGeos: THREE.BufferGeometry[] = [];
  const windowFrameGeos: THREE.BufferGeometry[] = [];
  const windowGlassGeos: THREE.BufferGeometry[] = [];
  const windowSillGeos: THREE.BufferGeometry[] = [];
  const sockelGeos: THREE.BufferGeometry[] = [];
  const lod1EmissiveGeos: THREE.BufferGeometry[] = [];

  // Seed is retained on the API for future per-wall variation (window-
  // rhythm phase offsets, panel-list jitter, etc.). Currently unused
  // but part of the contract — do not drop.
  void seed;

  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % footprint.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const tx = dx / len;
    const tz = dz / len;
    // Outward normal (CCW polygon → normal is right of edge direction).
    const nx = tz;
    const nz = -tx;

    // Window openings on this edge (LOD 0 only). Sunlight can only
    // reach the interior through a real hole in the wall, so we
    // compute the openings FIRST and then emit wall geometry that
    // avoids them.
    const openings =
      lod === 0 && len >= FONSTER_BREDD_M + FODER_BREDD_M * 4
        ? windowOpeningsFor(len, baseY + sockelH, params)
        : [];

    // Wall — either a single quad or a set of strips that step
    // around window openings. Both cases go into wallGeos so the
    // material caller can render one merged mesh.
    if (openings.length === 0) {
      wallGeos.push(quadFromEdgeToTop(a, b, baseY + sockelH, wallTopY));
    } else {
      pushWallWithCutouts(
        wallGeos,
        a,
        b,
        len,
        tx,
        tz,
        baseY + sockelH,
        wallTopY,
        openings
      );
    }

    // Panel relief — locklist strips standing off the wall face.
    // Only at LOD 0 (near).
    if (lod === 0 && params.panel === 'locklist') {
      pushLocklistStrips(
        wallGeos,
        a,
        b,
        len,
        tx,
        tz,
        nx,
        nz,
        baseY + sockelH,
        wallTopY
      );
    }

    // Emit window frame + glass + sill for each opening.
    for (const op of openings) {
      addOneWindow(
        {
          frames: windowFrameGeos,
          glass: windowGlassGeos,
          sills: windowSillGeos
        },
        a,
        [tx, tz],
        [nx, nz],
        op.centreAlong,
        op.sillY,
        params.fonstertyp
      );
    }

    // Sockel — a thin wall band under the main wall. Present only
    // when the params say so.
    if (params.sockel !== 'ingen') {
      const sock = quadFromEdgeToTop(a, b, baseY, baseY + sockelH);
      sockelGeos.push(sock);
    }

    // ORDER 061 Thread A — LOD 1 emissive band per facade.
    // At mid distance we don't emit real window geometry (frames /
    // glass / sills are LOD 0-only). Instead we emit a single
    // horizontal band per wall edge, ε outside the wall face, at
    // approximate first-floor window sill height. The wiring layer
    // paints it with the lit-glass emissive material, ramping via
    // skyState.nightFactor. Reading is "each house has a warm strip
    // of lit windows" from village zoom — enough of a sighting to
    // read the settlement as inhabited at night.
    //
    // Skipped when the edge is too short to host a plausible window
    // band (avoids dust on cottages' end-walls). Only emitted at
    // LOD 1 — at LOD 0 the real windows do the job; at LOD 2 the
    // building falls through to OsmBuildings.
    if (lod === 1 && len >= FONSTER_BREDD_M + FODER_BREDD_M * 4) {
      const bandY0 = baseY + sockelH + FONSTER_SILL_M;
      const bandY1 = bandY0 + FONSTER_HOJD_M;
      const margin = 0.4;
      const along0 = margin;
      const along1 = len - margin;
      // Two points along the edge, offset ε OUTWARD from the wall
      // face so the band renders in front of the wall (no z-fighting
      // with the LOD 1 wall mesh).
      const off = 0.02;
      const p0x = a[0] + tx * along0 + nx * off;
      const p0z = a[1] + tz * along0 + nz * off;
      const p1x = a[0] + tx * along1 + nx * off;
      const p1z = a[1] + tz * along1 + nz * off;
      lod1EmissiveGeos.push(
        quadFromEdgeToTop([p0x, p0z], [p1x, p1z], bandY0, bandY1)
      );
    }
  }

  // ---------- corner boards ------------------------------------------
  if (lod === 0 || lod === 1) {
    for (let i = 0; i < footprint.length; i++) {
      const prev = footprint[(i - 1 + footprint.length) % footprint.length];
      const curr = footprint[i];
      const next = footprint[(i + 1) % footprint.length];
      // Only place a corner board where the polygon actually turns
      // outward (interior angle < 180°). Reflex vertices (inward
      // notches) would produce a corner board floating in space.
      if (!isConvexTurn(prev, curr, next)) continue;
      const box = cornerBoardGeometry(prev, curr, next, baseY + sockelH, wallTopY);
      cornerGeos.push(box);
    }
  }

  // ---------- roof ---------------------------------------------------
  // ORDER 058 — roof is derived from the polygon (not an OBB). Returns
  // both the geometry and the computed ridgeY so the caller doesn't
  // need to recompute the height in a parallel formula.
  const { geometry: roof, ridgeY } = buildRoof(
    footprint,
    wallTopY,
    params.takvinkel,
    TAKFOT_M
  );

  // ---------- merge --------------------------------------------------
  const walls = mergeOrEmpty(wallGeos);
  const corners = mergeOrNull(cornerGeos);
  const sockel = mergeOrNull(sockelGeos);
  const windowFrames = mergeOrNull(windowFrameGeos);
  const windowGlass = mergeOrNull(windowGlassGeos);
  const windowSills = mergeOrNull(windowSillGeos);

  // ORDER 058 diagnostic — flag facades whose wall bucket ended up
  // empty. This is the "red-roof house without walls" bug: if a
  // polygon somehow generates zero wall geometry we want it in the
  // dev console instead of silently rendering a floating roof.
  if (import.meta.env.DEV && wallGeos.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[buildFacade] Wall bucket is EMPTY — roof will float. Footprint:',
      footprint
    );
  }

  const lod1Emissive = mergeOrNull(lod1EmissiveGeos);

  return {
    walls,
    corners,
    roof,
    sockel,
    windowFrames,
    windowGlass,
    windowSills,
    lod1Emissive,
    wallTopY,
    ridgeY
  };
}

// ---------- helpers ----------------------------------------------------

// ORDER 059 §3 — return the footprint in CCW winding. The signed
// shoelace area is positive for CCW polygons in the XZ plane under
// this file's outward-normal convention (which was calibrated
// against a positive-shoelace test polygon). CW polygons produce
// inward-facing wall normals that three.js's default frontface
// culling hides — the "windows in the air, no wall" bug. Reversing
// the vertex order flips the winding to CCW so all downstream code
// (walls, roof, corners, windows, sockel) generates outward-facing
// geometry.
function ensureCCW(
  poly: readonly (readonly [number, number])[]
): readonly (readonly [number, number])[] {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    s += x1 * z2 - x2 * z1;
  }
  return s >= 0 ? poly : [...poly].reverse();
}

function mergeOrEmpty(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (list.length === 0) return new THREE.BufferGeometry();
  return mergeGeometries(list, false) ?? new THREE.BufferGeometry();
}

function mergeOrNull(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (list.length === 0) return null;
  return mergeGeometries(list, false) ?? null;
}

// A flat quad spanning edge (a → b) from y0 to y1, outward-facing.
//
// Vertex order (positions):
//   0 = a-bot   (a.x, y0, a.z)
//   1 = b-bot   (b.x, y0, b.z)
//   2 = b-top   (b.x, y1, b.z)
//   3 = a-top   (a.x, y1, a.z)
//
// ORDER 060 §1 — index pattern `[0, 2, 1, 0, 3, 2]` winds each
// triangle CW as seen from the polygon INTERIOR, which puts the
// face normal on the EXTERIOR side. For a CCW polygon (which is
// what `ensureCCW` guarantees at buildFacade entry), the outward
// normal per edge is `(dz, 0, -dx) / len` — the right-hand-rule
// cross product of the edges of triangle (a-bot, b-top, b-bot)
// evaluates to `(y1-y0) × (dz, 0, -dx)`, which matches. Verified
// by the reinstated §2 test asserting positive dot with
// `(triangle-centroid − polygon-centroid)`.
//
// Old winding `[0, 1, 2, 0, 2, 3]` produced INWARD-facing normals
// and was masked by DoubleSide on wallMat (ORDER 059 bandage).
// Removed under ORDER 060 §3.
function quadFromEdgeToTop(
  a: readonly [number, number],
  b: readonly [number, number],
  y0: number,
  y1: number
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array([
    a[0], y0, a[1],
    b[0], y0, b[1],
    b[0], y1, b[1],
    a[0], y1, a[1]
  ]);
  const indices = new Uint16Array([0, 2, 1, 0, 3, 2]);
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  return g;
}

// A thin outward-standing box along edge (a → b), at height y0..y1,
// offset outward by `offsetOut` metres from the wall face, sized
// `width × (y1-y0) × depth` in metres. Locklist strips + window
// casing sides use this shape.
function outwardBox(
  a: readonly [number, number],
  edgeT: [number, number],
  edgeNormal: [number, number],
  centreAlong: number,
  y0: number,
  y1: number,
  width: number,
  depth: number,
  offsetOut: number
): THREE.BufferGeometry {
  const [tx, tz] = edgeT;
  const [nx, nz] = edgeNormal;
  const cx = a[0] + tx * centreAlong + nx * (offsetOut + depth / 2);
  const cz = a[1] + tz * centreAlong + nz * (offsetOut + depth / 2);
  const box = new THREE.BoxGeometry(width, y1 - y0, depth);
  // ORDER 058 §1 — correct yaw so box local +X ends up aligned with
  // the edge tangent. rotateY(θ) sends local +X to (cos θ, 0, −sin θ);
  // for that to equal (tx, 0, tz) we need θ = atan2(−tz, tx). The
  // previous formula atan2(tx, tz) was wrong by 90° and swapped the
  // box's width axis with its depth axis, so window frames (1.15 m
  // wide, 0.025 m deep) stood out sideways from the wall instead of
  // lying along it — the "hundreds of frames on the ground in rows"
  // the Vision Owner sighted was this bug seen from above.
  const angle = Math.atan2(-tz, tx);
  box.rotateY(angle);
  box.translate(cx, (y0 + y1) / 2, cz);
  // Strip UV so BoxGeometry merges cleanly with the plain quads
  // (which don't compute UVs). mergeGeometries returns null when
  // attribute sets differ.
  box.deleteAttribute('uv');
  return box;
}

function pushLocklistStrips(
  target: THREE.BufferGeometry[],
  a: readonly [number, number],
  _b: readonly [number, number],
  len: number,
  tx: number,
  tz: number,
  nx: number,
  nz: number,
  y0: number,
  y1: number
): void {
  // Number of strips: floor((len - inset) / spacing) + 1. Inset one
  // spacing at each end so the first / last strip doesn't collide
  // with the corner boards.
  const inset = 0.30;
  const usable = len - inset * 2;
  if (usable <= PANELLIST_AVSTAND_M) return;
  const n = Math.floor(usable / PANELLIST_AVSTAND_M) + 1;
  const step = usable / (n - 1);
  for (let i = 0; i < n; i++) {
    const along = inset + i * step;
    target.push(
      outwardBox(
        a,
        [tx, tz],
        [nx, nz],
        along,
        y0,
        y1,
        PANELLIST_BREDD_M,
        PANELLIST_DJUP_M,
        0.001   // hair off the wall to avoid z-fighting
      )
    );
  }
}

// Pre-compute window positions along a wall edge. Returns openings
// (position + Y range) so the wall geometry can subtract them AND the
// window frames + glass can be placed at the same positions.
interface WindowOpening {
  centreAlong: number;   // metres along the edge from vertex a
  halfWidth: number;     // half of the FODER-outside-width
  sillY: number;         // Y of the bottom of the glass
  topY: number;          // Y of the top of the glass
}

function windowOpeningsFor(
  len: number,
  wallY0: number,
  params: FacadeParams
): WindowOpening[] {
  const marginMin = FONSTER_BREDD_M / 2 + FODER_BREDD_M + 0.15;
  if (len < marginMin * 2) return [];
  const desired = Math.max(1, Math.round(len * params.fonsterrytm));
  const spacing = len / (desired + 0.5);
  const out: WindowOpening[] = [];
  const halfW = FONSTER_BREDD_M / 2 + FODER_BREDD_M;
  const sillY = wallY0 + FONSTER_SILL_M;
  const topY = sillY + FONSTER_HOJD_M;
  for (let i = 0; i < desired; i++) {
    const along = spacing * (i + 0.75);
    if (along < marginMin || along > len - marginMin) continue;
    out.push({ centreAlong: along, halfWidth: halfW, sillY, topY });
  }
  return out;
}

// Emit wall strips that avoid the window openings. For a wall with N
// openings we generate: one below-band (full width), one above-band
// (full width), and N+1 vertical strips at the window Y range
// filling the gaps between/around the openings. Each strip is a flat
// quad; the caller merges everything into a single BufferGeometry.
function pushWallWithCutouts(
  target: THREE.BufferGeometry[],
  a: readonly [number, number],
  b: readonly [number, number],
  len: number,
  tx: number,
  tz: number,
  y0: number,
  y1: number,
  openings: readonly WindowOpening[]
): void {
  // All openings on this wall share sillY / topY (uniform per params).
  const sillY = openings[0].sillY;
  const topY = openings[0].topY;
  // Below-band: full-edge quad from y0 to sillY − FODER (the sill
  // sits BELOW glass, so opening in the wall starts one foder below).
  const openingBottom = sillY - FODER_BREDD_M;
  const openingTop = topY + FODER_BREDD_M;
  target.push(quadFromEdgeToTop(a, b, y0, openingBottom));
  target.push(quadFromEdgeToTop(a, b, openingTop, y1));

  // Between-and-around strips: at Y range openingBottom..openingTop,
  // spanning the edge X ranges that are NOT covered by an opening.
  // Sort openings by centreAlong to be safe.
  const sorted = [...openings].sort((p, q) => p.centreAlong - q.centreAlong);
  let cursor = 0;
  for (const op of sorted) {
    const x0 = op.centreAlong - op.halfWidth;
    const x1 = op.centreAlong + op.halfWidth;
    if (x0 > cursor) {
      const s = pointAlong(a, tx, tz, cursor);
      const e = pointAlong(a, tx, tz, x0);
      target.push(quadFromEdgeToTop(s, e, openingBottom, openingTop));
    }
    cursor = Math.max(cursor, x1);
  }
  if (cursor < len) {
    const s = pointAlong(a, tx, tz, cursor);
    const e = pointAlong(a, tx, tz, len);
    target.push(quadFromEdgeToTop(s, e, openingBottom, openingTop));
  }
}

function pointAlong(
  a: readonly [number, number],
  tx: number,
  tz: number,
  along: number
): [number, number] {
  return [a[0] + tx * along, a[1] + tz * along];
}

function addOneWindow(
  buckets: {
    frames: THREE.BufferGeometry[];
    glass: THREE.BufferGeometry[];
    sills: THREE.BufferGeometry[];
  },
  a: readonly [number, number],
  edgeT: [number, number],
  edgeN: [number, number],
  centreAlong: number,
  sillY: number,
  fonstertyp: Fonstertyp
): void {
  const w = FONSTER_BREDD_M;
  const h = FONSTER_HOJD_M;
  const y0 = sillY;
  const y1 = sillY + h;
  // 4 foder boards (top, bottom, left, right).
  // top + bottom: horizontal, width = w + 2 × FODER_BREDD, height = FODER_BREDD
  const topBottomW = w + 2 * FODER_BREDD_M;
  buckets.frames.push(
    outwardBox(a, edgeT, edgeN, centreAlong, y1, y1 + FODER_BREDD_M, topBottomW, FODER_DJUP_M, 0.002)
  );
  buckets.frames.push(
    outwardBox(a, edgeT, edgeN, centreAlong, y0 - FODER_BREDD_M, y0, topBottomW, FODER_DJUP_M, 0.002)
  );
  // left + right: vertical, offset ±(w/2 + FODER_BREDD/2) along edge
  const sideOff = w / 2 + FODER_BREDD_M / 2;
  buckets.frames.push(
    outwardBox(a, edgeT, edgeN, centreAlong - sideOff, y0, y1, FODER_BREDD_M, FODER_DJUP_M, 0.002)
  );
  buckets.frames.push(
    outwardBox(a, edgeT, edgeN, centreAlong + sideOff, y0, y1, FODER_BREDD_M, FODER_DJUP_M, 0.002)
  );
  // Sill — slightly wider than foder, projecting a shade further out.
  buckets.sills.push(
    outwardBox(
      a,
      edgeT,
      edgeN,
      centreAlong,
      y0 - FODER_BREDD_M - 0.02,
      y0 - FODER_BREDD_M,
      topBottomW + 0.04,
      FODER_DJUP_M + 0.02,
      -0.003   // slight recess so the sill face steps back into the wall
    )
  );
  // Glass — a thin flat pane at the wall face + a hair inward, so a
  // sunlight ray passing through the geometry can carry into the
  // interior (glass is transmission-material at the render layer).
  //
  // ORDER 058 §1 — correct yaw so the plane's normal faces outward.
  // PlaneGeometry normal is +Z; rotateY(θ) rotates it to
  // (sin θ, 0, cos θ). To align with the wall outward normal
  // (edgeN[0], 0, edgeN[1]) we solve θ = atan2(edgeN[0], edgeN[1]).
  // Old formula used atan2(edgeT[0], edgeT[1]) which sent the plane
  // normal along the wall direction (parallel to wall, not through
  // it) and stretched the pane out sideways.
  const glass = new THREE.PlaneGeometry(w, h);
  const yaw = Math.atan2(edgeN[0], edgeN[1]);
  glass.rotateY(yaw);
  glass.translate(
    a[0] + edgeT[0] * centreAlong + edgeN[0] * 0.001,
    (y0 + y1) / 2,
    a[1] + edgeT[1] * centreAlong + edgeN[1] * 0.001
  );
  buckets.glass.push(glass);
  // Muntins — thin overlay strips on top of the glass. The shape
  // depends on fonstertyp:
  //   korspost: one vertical + one horizontal at the top-third line
  //   tvaluft: one vertical, no horizontal
  //   enluft: no muntins
  const muntinDepth = SPROJS_TJOCK_M;
  if (fonstertyp === 'korspost' || fonstertyp === 'tvaluft') {
    buckets.frames.push(
      outwardBox(a, edgeT, edgeN, centreAlong, y0, y1, muntinDepth, muntinDepth, 0.003)
    );
  }
  if (fonstertyp === 'korspost') {
    // horizontal at ~y0 + 2/3 × h (upper "kors")
    const cy = y0 + (2 / 3) * h;
    buckets.frames.push(
      outwardBox(a, edgeT, edgeN, centreAlong, cy - muntinDepth / 2, cy + muntinDepth / 2, w, muntinDepth, 0.003)
    );
  }
}

// Corner board: a vertical prism straddling the vertex, aligned with
// the exterior angle bisector so it faces outward.
function cornerBoardGeometry(
  prev: readonly [number, number],
  curr: readonly [number, number],
  next: readonly [number, number],
  y0: number,
  y1: number
): THREE.BufferGeometry {
  // Strip UV on the returned box for merge compatibility (see
  // outwardBox comment).
  // Outward direction: negative of the interior angle bisector.
  const inA = normalise([prev[0] - curr[0], prev[1] - curr[1]]);
  const inB = normalise([next[0] - curr[0], next[1] - curr[1]]);
  let bx = inA[0] + inB[0];
  let bz = inA[1] + inB[1];
  const bl = Math.hypot(bx, bz);
  if (bl < 1e-6) {
    // Colinear — use outward normal of edge (curr → next).
    const tx = inB[0];
    const tz = inB[1];
    bx = tz;
    bz = -tx;
  } else {
    // Bisector points inward; flip for outward.
    bx = -bx / bl;
    bz = -bz / bl;
  }
  const w = KNUTBRADA_BREDD_M;
  const d = KNUTBRADA_DJUP_M;
  // Two boards on the two adjacent faces, each offset along the
  // relevant wall's tangent. Approximate with a single box straddling
  // the vertex, aligned with the bisector, width w + w.
  const box = new THREE.BoxGeometry(w * 2, y1 - y0, d + 0.02);
  const yaw = Math.atan2(bx, bz);
  box.rotateY(yaw);
  box.translate(
    curr[0] + bx * (d / 2 + 0.005),
    (y0 + y1) / 2,
    curr[1] + bz * (d / 2 + 0.005)
  );
  box.deleteAttribute('uv');
  return box;
}

function normalise(v: [number, number]): [number, number] {
  const l = Math.hypot(v[0], v[1]);
  if (l < 1e-9) return [0, 0];
  return [v[0] / l, v[1] / l];
}

// Convex turn test: cross product of (curr - prev) × (next - curr).
// Positive = CCW (convex for a CCW polygon) = we place a corner board.
function isConvexTurn(
  prev: readonly [number, number],
  curr: readonly [number, number],
  next: readonly [number, number]
): boolean {
  const ax = curr[0] - prev[0];
  const az = curr[1] - prev[1];
  const bx = next[0] - curr[0];
  const bz = next[1] - curr[1];
  return ax * bz - az * bx > 0;
}

// ---------- roof -------------------------------------------------------
//
// ORDER 058 refactor — roof derived from the SAME polygon as the walls.
// Old approach used an OBB approximation, which drifted apart from the
// wall silhouette on non-rectangular footprints (33/138 eligible houses).
//
// New approach:
//   1. Compute the eave polygon: each footprint vertex offset OUTWARD
//      along its angle bisector by TAKFOT_M, giving the roof drip line
//      that hangs over the wall.
//   2. Compute the ridge polygon: each footprint vertex offset INWARD
//      by `inset` metres, lifted to wallTopY + ridgeH.
//   3. Build one sloped quad per polygon edge, connecting eave endpoints
//      down at wallTopY to ridge endpoints up at wallTopY + ridgeH.
//   4. Cap the top with a triangle fan over the ridge polygon.
//
// For a rectangle whose short half-width equals `inset`, the two long
// edges' ridge vertices merge into the classic gable ridge line, and
// the two short edges become the gable-end triangles (degenerate quads
// with two of the four corners coincident) — proper gable geometry.
//
// For an arbitrary polygon, the ridge polygon is a smaller version of
// the footprint at height ridgeH, giving a hip roof that follows the
// wall silhouette. Sharp acute corners get their bisector offset
// clamped so ridge points don't run off to infinity.

// The horizontal run from any eave edge to the ridge above it is
// (inset + TAKFOT_M); ridgeH = run × tan(pitch) gives that slope face
// exactly the declared pitch angle.
function ridgeHeightFor(insetM: number, takvinkelDeg: number): number {
  return (insetM + TAKFOT_M) * Math.tan(takvinkelDeg * Math.PI / 180);
}

function roofInsetFor(footprint: readonly (readonly [number, number])[]): number {
  // Use OBB half-short as the inward inset. For rectangles this
  // collapses the ridge to a proper line. For arbitrary polygons it
  // is an approximation — very long-thin arms of an L-shape may see
  // ridge points cross each other, but the eave still follows the
  // wall silhouette (the requirement), and the interior overlap is
  // small enough to be invisible from all normal viewing angles.
  const obb = obbApprox(footprint);
  return Math.min(obb.w, obb.d) / 2;
}

// Offset a polygon vertex by `distance` along its angle bisector.
// `outward = true` gives the exterior bisector (roof eave); `outward =
// false` gives the interior bisector (roof ridge).
//
// For sharp corners the bisector offset formula divides by sin(α/2)
// where α is the interior angle — a 30° corner runs 3.9× further than
// a 90° one. ORDER 058 §2 caps the multiplier at MAX_BISECTOR_SCALE
// so ridge vertices at acute corners can't shoot metres out past the
// building silhouette. The clamp trades geometric accuracy at sharp
// corners (the eave / ridge slightly "chamfers off" the corner) for
// bounded output.
//
// Reflex vertices (interior angle > 180°, e.g. the inside corner of
// an L-shape) get returned unmoved for INWARD offsets — the interior
// bisector at a reflex vertex actually points OUT of the polygon, so
// offsetting inward would push the ridge vertex into empty space
// beyond the concave notch. Returning the vertex as-is keeps the
// ridge polygon geometrically valid.
const MAX_BISECTOR_SCALE = 2;

function offsetVertexBisector(
  prev: readonly [number, number],
  curr: readonly [number, number],
  next: readonly [number, number],
  distance: number,
  outward: boolean
): [number, number] {
  const pdx = curr[0] - prev[0];
  const pdz = curr[1] - prev[1];
  const plen = Math.hypot(pdx, pdz) || 1;
  const ptx = pdx / plen;
  const ptz = pdz / plen;
  const ndx = next[0] - curr[0];
  const ndz = next[1] - curr[1];
  const nlen = Math.hypot(ndx, ndz) || 1;
  const ntx = ndx / nlen;
  const ntz = ndz / nlen;
  // Outward normals (CCW polygon → normal is 90° clockwise from edge dir).
  const npx = ptz, npz = -ptx;
  const nnx = ntz, nnz = -ntx;
  // Interior angle at curr — angle from previous-edge-direction to
  // next-edge-direction, in (0, 2π).
  const turnCross = ptx * ntz - ptz * ntx;
  const turnDot = ptx * ntx + ptz * ntz;
  const turnAngle = Math.atan2(turnCross, turnDot);   // (−π, +π]
  const interiorAngle = Math.PI - turnAngle;          // (0, 2π)
  const isReflex = interiorAngle > Math.PI;

  // Sum of outward normals = exterior bisector direction (may be
  // near-zero at colinear or reflex vertices).
  let bx = npx + nnx;
  let bz = npz + nnz;
  const blen = Math.hypot(bx, bz);
  if (blen < 1e-6) {
    // Colinear vertex — bisector aligns with the shared outward normal.
    bx = npx;
    bz = npz;
  } else {
    bx /= blen;
    bz /= blen;
  }
  if (!outward) { bx = -bx; bz = -bz; }

  // ORDER 058 §2 — reflex vertex handling. At a concave corner
  // (interior > 180°) the "outward" bisector actually points INTO
  // the notch, which is not the exterior of the polygon. Offsetting
  // either direction from a reflex vertex produces geometry that
  // spikes past the far side of some polygon edge. For both eave
  // and ridge we return the polygon vertex unchanged — the eave /
  // ridge polygon follows the concave corner in place instead of
  // jutting across the notch.
  if (isReflex) {
    return [curr[0], curr[1]];
  }

  const sinHalf = Math.abs(Math.sin(interiorAngle / 2));
  const rawScale = sinHalf > 1e-3 ? 1 / sinHalf : MAX_BISECTOR_SCALE;
  const scale = Math.min(rawScale, MAX_BISECTOR_SCALE);
  const d = distance * scale;
  return [curr[0] + bx * d, curr[1] + bz * d];
}

// ORDER 058 §2 — clamp an inward-offset vertex so it stays inside
// the polygon. Cast a ray from the origin polygon vertex toward the
// target offset position; if the ray exits the polygon before reaching
// the target, shorten the offset to stay just short of the exit.
//
// `origin` is the polygon vertex the offset started from — the ray's
// origin. `target` is the un-clamped offset position. Returns either
// `target` unchanged (if the whole ray stays inside) or a clamped
// point at 0.85 × exit distance along the ray.
function clampInsideByRay(
  footprint: readonly (readonly [number, number])[],
  origin: readonly [number, number],
  target: readonly [number, number]
): [number, number] {
  const dx = target[0] - origin[0];
  const dz = target[1] - origin[1];
  const rayLen = Math.hypot(dx, dz);
  if (rayLen < 1e-6) return [origin[0], origin[1]];
  const tx = dx / rayLen;
  const tz = dz / rayLen;
  // Find smallest positive intersection parameter with any polygon
  // edge (excluding the two edges adjacent to `origin`, which the
  // ray leaves at t=0). Adjacent edges are the ones that CONTAIN
  // `origin` as an endpoint.
  let minExit = Infinity;
  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % footprint.length];
    // Skip edges adjacent to origin.
    if ((a[0] === origin[0] && a[1] === origin[1]) ||
        (b[0] === origin[0] && b[1] === origin[1])) {
      continue;
    }
    // Ray (origin + t × dir) vs segment (a → b). Solve
    // origin + t × dir = a + s × (b − a) for t ≥ 0, 0 ≤ s ≤ 1.
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const denom = tx * ez - tz * ex;
    if (Math.abs(denom) < 1e-9) continue;   // parallel
    const dxo = a[0] - origin[0];
    const dzo = a[1] - origin[1];
    const t = (dxo * ez - dzo * ex) / denom;
    const s = (dxo * tz - dzo * tx) / denom;
    if (t > 1e-6 && s >= -1e-6 && s <= 1 + 1e-6 && t < minExit) {
      minExit = t;
    }
  }
  // Un-clamped target already inside polygon-safe range? Keep it.
  if (rayLen <= minExit * 0.85) return [target[0], target[1]];
  const safeLen = minExit * 0.85;
  return [origin[0] + tx * safeLen, origin[1] + tz * safeLen];
}

function buildRoof(
  footprint: readonly (readonly [number, number])[],
  wallTopY: number,
  takvinkelDeg: number,
  eaveM: number
): { geometry: THREE.BufferGeometry; ridgeY: number } {
  const n = footprint.length;
  const inset = roofInsetFor(footprint);
  const ridgeH = ridgeHeightFor(inset, takvinkelDeg);
  const ridgeY = wallTopY + ridgeH;

  // Per-vertex offsets — eave outward by eaveM, ridge inward by inset.
  // ORDER 058 §2 — for ridge (inward) offsets, additionally clamp the
  // vertex against the polygon geometry so the ridge vertex can't
  // shoot past the far side of a narrow arm. `polygonInwardReach`
  // returns the maximum inward distance available along the bisector
  // before crossing a polygon edge; we clamp to 85 % of that so the
  // ridge stays comfortably inside.
  const eave: [number, number][] = [];
  const ridge: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const prev = footprint[(i - 1 + n) % n];
    const curr = footprint[i];
    const next = footprint[(i + 1) % n];
    eave.push(offsetVertexBisector(prev, curr, next, eaveM, true));
    const ridgeUnclamped = offsetVertexBisector(prev, curr, next, inset, false);
    ridge.push(clampInsideByRay(footprint, curr, ridgeUnclamped));
  }

  // Emit one sloped quad per edge (eA, eB, rB, rA), plus a fan cap of
  // ridge vertices for the flat top (zero-area cap when ridge collapses
  // to a line/point on a rectangle/square footprint).
  //
  // ORDER 057 Del D — write explicit per-face normals. Non-coplanar
  // quads (created by chamfered / L-shape footprints) would otherwise
  // split into two triangles with slightly different normals; on
  // metallic taktäckning (plåt, metalness 0.5) the specular pop
  // between the two halves reads as a "checkered" facet pattern.
  // Sharing the same normal across all 4 vertices of a face fixes it.
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    const eA = eave[i];
    const eB = eave[i1];
    const rA = ridge[i];
    const rB = ridge[i1];
    // Skip zero-length edges (would produce a degenerate slope face
    // and pollute the merged buffer).
    if (Math.hypot(eB[0] - eA[0], eB[1] - eA[1]) < 0.05) continue;
    const base = positions.length / 3;
    // Vertex order: eA (0), eB (1), rB (2), rA (3).
    positions.push(eA[0], wallTopY, eA[1]);
    positions.push(eB[0], wallTopY, eB[1]);
    positions.push(rB[0], ridgeY,   rB[1]);
    positions.push(rA[0], ridgeY,   rA[1]);
    // ORDER 061 §B — face normal points up-and-outward for CCW winding.
    // Cross product `d2 × d1` (NOT `d1 × d2`) gives the plane-fit
    // normal with POSITIVE Y (skyward) and horizontal component
    // pointing AWAY from the polygon. Old `d1 × d2` produced a normal
    // aimed DOWN into the attic and INWARD toward the ridge — sun
    // overhead → dot(normal, -lightDir) < 0 → diffuse clamped to zero
    // → roof read black regardless of taktackning tone. Verified by
    // `roof face normals point OUTWARD` test.
    //
    // Triangle winding swapped to `[0, 2, 1, 0, 3, 2]` to match — the
    // winding-derived cross must agree with the written normal for
    // shadow-map + backface culling to behave.
    const d1x = rB[0] - eA[0], d1y = ridgeY - wallTopY, d1z = rB[1] - eA[1];
    const d2x = rA[0] - eB[0], d2y = ridgeY - wallTopY, d2z = rA[1] - eB[1];
    let nx = d2y * d1z - d2z * d1y;
    let ny = d2z * d1x - d2x * d1z;
    let nz = d2x * d1y - d2y * d1x;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    for (let k = 0; k < 4; k++) normals.push(nx, ny, nz);
    indices.push(base + 0, base + 2, base + 1);
    indices.push(base + 0, base + 3, base + 2);
  }
  // Cap (flat top of the ridge polygon). For a rectangle where two
  // pairs of ridge vertices collapse onto a single line, the cap is
  // a set of zero-area triangles that emit nothing visible. The cap
  // is horizontal so all cap vertices share normal (0, 1, 0).
  const capBase = positions.length / 3;
  for (const r of ridge) {
    positions.push(r[0], ridgeY, r[1]);
    normals.push(0, 1, 0);
  }
  // Fan triangulation from vertex 0. Valid for convex ridge polygons;
  // slight overlap on concave ones — invisible from the intended
  // camera range.
  for (let i = 1; i < n - 1; i++) {
    indices.push(capBase + 0, capBase + i, capBase + i + 1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  // No computeVertexNormals — we wrote them explicitly per face so
  // non-coplanar quads shade as a single plane.
  return { geometry: g, ridgeY };
}

// ---------- OBB approximation -----------------------------------------
//
// Cheap OBB: min-area rotating-calliper on the convex hull would be
// correct but expensive. For our footprints (nearly rectangular
// buildings) an axis-derived OBB from the longest edge is close
// enough — this file already ships a similar approximation
// (`orientedBbox` in strategic/content/world). Rather than import
// across module boundaries we inline a small version here so the
// facade module stays self-contained.

interface OBB {
  centre: [number, number];
  w: number;    // long axis extent
  d: number;    // short axis extent
  angle: number;
}

function obbApprox(footprint: readonly (readonly [number, number])[]): OBB {
  // Longest edge sets the long axis direction.
  let bestLen = 0;
  let bestAngle = 0;
  for (let i = 0; i < footprint.length; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % footprint.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > bestLen) {
      bestLen = l;
      bestAngle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
  }
  // Project all points onto the axis + normal.
  const cosA = Math.cos(bestAngle);
  const sinA = Math.sin(bestAngle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [x, z] of footprint) {
    const u = x * cosA + z * sinA;
    const v = -x * sinA + z * cosA;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const cu = (minU + maxU) / 2;
  const cv = (minV + maxV) / 2;
  const cx = cu * cosA - cv * sinA;
  const cz = cu * sinA + cv * cosA;
  return {
    centre: [cx, cz],
    w: maxU - minU,
    d: maxV - minV,
    angle: bestAngle
  };
}
