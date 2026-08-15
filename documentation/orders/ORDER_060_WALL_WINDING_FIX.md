# ORDER 060 — Wall winding fix (removes ORDER 059 DoubleSide workaround)

**Version:** 1.0
**Status:** Reserved — filed 2026-08-12 following ORDER 059
**Class:** Rendering-correctness fix (precedence 6)
**Parent:** ORDER 059 (`ensureCCW` + `THREE.DoubleSide` wall bandage)
**Registry:** `documentation/architecture/ORDER_REGISTRY.md` row 060
**Recipient:** Claude Code

## 0. Context

ORDER 059 fixed the "walls invisible, windows floating in air" bug on
31 of 138 procedural houses in two moves:

1. **`ensureCCW`** at entry to `buildFacade` — normalises the input
   polygon so every downstream calculation sees CCW winding.
2. **`THREE.DoubleSide`** on `wallMat` in `ProceduralFacades` —
   renders both sides of every wall triangle so backface culling
   can't hide walls regardless of winding.

Move 1 is correct and stays. Move 2 is a bandage that ships a wrong
face normal to the fragment shader. If the triangle winding in
`quadFromEdgeToTop` were correct, `ensureCCW` alone would be enough,
`THREE.FrontSide` would work, and the diffuse lighting would compute
against the OUTWARD normal — which is what physical shading expects.

Currently the wall face normal (from cross-product of the triangle's
edge vectors) points INWARD for the standard CCW polygon. `DoubleSide`
tells three.js to also render the reverse of the triangle with a
flipped normal, so from outside the camera sees the wall — but it
sees it lit by the inward-facing normal's diffuse response, not the
outward-facing one. On a wall lit by a low sun the difference reads
as "the wall is dim / flat" even when the sun is on the correct side
of the building.

Vision Owner sighting 2026-08-12: facades read as flat even at good
sun angles. Suspect this bug as one contributor.

## 1. What to fix

**File:** `frontend/src/lib/facade/buildFacade.ts`, function
`quadFromEdgeToTop`.

Current:
```ts
const positions = new Float32Array([
  a[0], y0, a[1],
  b[0], y0, b[1],
  b[0], y1, b[1],
  a[0], y1, a[1]
]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
```

Under CCW polygon, outward normal = `(dz, -dx) / len` (rotate edge
tangent 90° clockwise in XZ, since interior sits on the left of the
edge). The triangle `(a-bot, b-bot, b-top)` computes face normal via
`(v1−v0) × (v2−v0) = (0, 0, +something)` — that's `+Z`, opposite of
the correct outward `-Z` for a rectangle at `z=-3`. So the current
winding produces INWARD normals for CCW input.

Fix: reverse the winding so triangles are `(a-bot, b-top, b-bot)`
and `(a-bot, a-top, b-top)`, or equivalently swap the index pattern
to `[0, 2, 1, 0, 3, 2]`. Cross product then flips sign, producing
the correct outward normal.

Alternatively: keep the vertex order but reverse the indices per
triangle. Either produces the same result. Whichever is chosen,
document *why* in the code comment — future editors need to see the
outward-facing convention spelled out.

## 2. What to add back

**File:** `frontend/src/lib/facade/__tests__/buildFacade.test.ts`.

The ORDER 059 test file has a test named
`CW-wound OSM polygon produces equivalent wall geometry to CCW input`
that verifies CCW-and-CW input produce the same wall bucket. That
test stays. What was **removed** in the ORDER 059 fix pass was an
earlier version of the same test that asserted the wall face normal
points outward from the polygon centroid (dot product with
`triangle-centroid − polygon-centroid` must be positive). That
assertion was correct in intent but failed against the current
inward-normal reality; the assertion was silently softened during
the ORDER 059 iteration.

Add it back after the winding fix. Concretely: for both CCW and CW
input, take the first triangle of the wall bucket, compute its face
normal via cross product, and verify positive dot with
`(triangle-centroid − polygon-centroid)`. Both windings should pass
because `ensureCCW` normalises input; the assertion catches future
regressions where either the winding OR `ensureCCW` breaks.

## 3. What to remove

**File:** `frontend/src/strategic/scene/ProceduralFacades.tsx`.

After §1 lands, verify walls render correctly with `THREE.FrontSide`
by momentarily flipping the `wallMat` side in dev. If they do,
remove the `THREE.DoubleSide` bandage:

```ts
// Before (ORDER 059):
const wallMat = getMaterial(KULOR_HEX[data.params.kulor], 0.75, 0, THREE.DoubleSide);

// After (this order):
const wallMat = getMaterial(KULOR_HEX[data.params.kulor], 0.75, 0);
```

The `side` parameter on `getMaterial` becomes vestigial once nothing
requests DoubleSide. Leave it in the signature (still useful for
future glass / cutout materials) but stop passing it from wall
callers.

## 4. Acceptance

1. All tests pass, including the reinstated outward-normal assertion
   for both CCW and CW input.
2. Walls render on all 138 eligible houses under `THREE.FrontSide`.
3. Compare a night-lit wall before/after: with the correct normal,
   diffuse response should read as "the wall face is turned toward
   the sun/window-glow", not the flat average current DoubleSide
   produces.
4. Fill rate improves marginally (one triangle rasterised per wall
   face instead of two).

## 5. Out of scope

- Any other winding cleanup outside `quadFromEdgeToTop` and its
  test. Roof, corner, and window geometry each write explicit
  normals (or are DoubleSide by geometric necessity like glass) —
  they don't share this bug.
- The observed "facades read as flat" complaint may have other
  contributors (material roughness, ambient balance, hemisphere
  ground tint). This order only removes the wall-normal bug from
  the list of suspects; visual verification post-fix is required.
