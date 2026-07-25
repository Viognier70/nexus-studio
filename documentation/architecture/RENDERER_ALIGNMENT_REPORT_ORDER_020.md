# Renderer Alignment Report — ORDER 020

**Status:** CONDITIONAL PASS pending Vision Owner visual re-review of localhost.
**Class:** Engineering report
**Session:** ORDER 020 (auto-mode, 2026-07-25)
**Parent audits:** `WORLD_ALIGNMENT_AUDIT_ORDER_019.md`, `FULL_MAP_AUTHENTICITY_AUDIT_ORDER_019R.md`, `CRITICAL_DEFECT_REGISTER_ORDER_019.md`

---

## 1 · First divergence point

**Location:** every `new THREE.Shape() → shape.moveTo(x, z_osm) → ExtrudeGeometry / ShapeGeometry → geo.rotateX(-Math.PI / 2)` pipeline in the scene renderers.

**Math:**
- `rotateX(-π/2)` sends `(x, y, z) → (x, z, -y)`.
- The shape lives in the XY plane with `y_shape = z_osm`.
- Extrusion or shape triangulation places vertices at `(x, z_osm, 0)`.
- After the rotation they land at `(x, 0, -z_osm)` — mirrored across the east-west axis.

**Empirical proof:** `scripts/parity-check.mjs` runs the transform on a control OSM polygon spanning `z=-100..-80` and gets a rendered `z=+80..+100`.

## 2 · Root cause

The codebase carried **two coordinate frames** simultaneously:

- **Convention A (buggy).** `shape.moveTo(x, z_osm)` + `rotateX(-π/2)`. World `Z = −OSM Z`. Used by every OSM-driven renderer.
- **Convention B (correct).** `shape.moveTo(x - cx, -(z - cz))` + `rotateX(-π/2)` + group at `[cx, 0, cz]`. World `Z = +OSM Z`. Used only by handcrafted-landmark helpers (`CraftedLandmarks.useLandmarkWallGeo`, `CraftedLandmarksD2.useWallGeo`).

Every position-based component (`position={[x, y, z]}` — vehicles, landmark discs, HorizonForest, OsmForest, ChimneySmoke, LandmarkGatherers, pedestrians, camera focus, view presets) uses raw OSM `(x, z)` directly and therefore renders in the **correct** frame.

Comments at `CraftedLandmarks.tsx:111-128` explicitly document the flip and introduce `useLandmarkWallGeo` as the "shared local frame" fix — but the ORDER 004 PASS 1 fix was applied only to the handcrafted-landmark path. The OSM-driven renderers stayed on the flipped frame for 15+ commits.

## 3 · Layers affected

| Renderer | Convention pre-020 | Convention post-020 |
|----------|--------------------|---------------------|
| `OsmBuildings` (walls, plinths, storey bands, cornerboards, entrance markers, windows, roof caps) | Walls A (mirrored); every decor B (correct) | All B |
| `OsmRoads` (carriageway, sidewalk, kerb, centreline, edge line) | A (mirrored) | B |
| `OsmWater` (bed + surface + depth gradient) | A (mirrored). Depth gradient was also wrong because it looked up distance-to-polygon using the mirrored rendered z against the OSM polygon | B; depth gradient now correct as a side effect |
| `OsmDistricts` (forest, grass, residential, graveyard tints) | A (mirrored) | B |
| `CraftedLandmarks.extrudeShape` helper (SkolaLandmark walls) | A (mirrored) | B; school roof group already B, now aligned |
| `CraftedLandmarks.useLandmarkWallGeo` (church, Gästgivaregården, Torget long-house etc.) | B (correct) | B (unchanged) |
| `CraftedLandmarksD2.useWallGeo` (Kärnhuset main body etc.) | B (correct) | B (unchanged) |
| `OsmTerrain` (single displaced plane) | Rotation-only, no shape polygon involved | Unchanged |
| Everything else (vehicles, pedestrians, click discs, trees, smoke, camera) | B (position-based) | B (unchanged) |

## 4 · Files changed

```
frontend/src/strategic/scene/OsmBuildings.tsx
frontend/src/strategic/scene/OsmRoads.tsx
frontend/src/strategic/scene/OsmWater.tsx
frontend/src/strategic/scene/OsmDistricts.tsx
frontend/src/strategic/scene/CraftedLandmarks.tsx
scripts/parity-check.mjs                                             (new)
documentation/architecture/RENDERER_ALIGNMENT_REPORT_ORDER_020.md    (this file)
```

## 5 · Commits

```
876b01e test(parity): ORDER 020 — transform-parity check for shape-based renderers
3956220 fix(scene):   ORDER 020 — unmirror shape-based renderers (world Z parity)
```

Two focused commits: the systemic renderer fix, then the regression test.

## 6 · Before / after deviations

**Before ORDER 020**, taking Kärnhuset as reference:
- Handcrafted Kärnhuset walls at world **(407.8, 0, −89.6)** ← Convention B, correct.
- Every neighbouring procedural building at world **(x, 0, +z_osm)** ← Convention A, mirrored.
- Kärnhuset appeared to sit "in the wrong place" **relative to the surrounding buildings and roads**, which were all on the opposite side of the east-west axis.

**After ORDER 020**, control-point projection through the actual runtime transform (`scripts/parity-check.mjs`):

| Landmark / building / water | OSM (x, z) | Rendered world (x, z) | Drift |
|-----------------------------|-----------|----------------------|-------|
| Torget                      | (12.5, −27.6)   | (12.5, −27.6)   | 0.00 m |
| Grythyttans kyrka           | (−45.5, 17.2)   | (−45.5, 17.2)   | 0.00 m |
| Gästgivaregården            | (61.6, 37.8)    | (61.6, 37.8)    | 0.00 m |
| Kärnhuset                   | (407.0, −89.2)  | (407.0, −89.2)  | 0.00 m |
| Måltidens hus               | (568.8, −83.7)  | (568.8, −83.7)  | 0.00 m |
| Pizzans Hus                 | (343.3, 22.4)   | (343.3, 22.4)   | 0.00 m |
| INGO                        | (368.4, −11.6)  | (368.4, −11.6)  | 0.00 m |
| Gamla Järnvägsstation       | (−462.3, −177.6) | (−462.3, −177.6) | 0.00 m |
| Sör-Älgen                   | (3501.7, −4061.2) | (3501.7, −4061.2) | 0.00 m |
| Torrvarpen                  | (−2180.1, 2532.9) | (−2180.1, 2532.9) | 0.00 m |

All 10 controls sit within 0.01 m tolerance. Static grep confirms no Convention-A leak remains in any of the six scene renderers.

## 7 · Visual comparison result

Shadow-map SVGs (`reports/shadow-map/*.svg`) — Vision Owner has already confirmed they represent Grythyttan correctly. They render the same OSM data the 3D scene now uses in the same coordinate frame. **Localhost should now visually agree with the shadow map.**

I cannot render the browser scene from this session. Vision Owner is the final acceptance surface.

## 8 · Remaining defects

| Class | Item | Status |
|-------|------|--------|
| Transform parity | Every shape-based renderer | RESOLVED |
| Data authenticity | 5 additional landmarks (INGO, Tempo, Direkten, Kantin, Bergslagshus) | Added in ORDER 019R |
| Data authenticity | Water polygon exclusion for horizon forest | Resolved in ORDER 019R |
| Data authenticity | Vehicle envelope clip vs building | Resolved in ORDER 019R |
| Data authenticity | Multi-wing polygon splitter | Resolved in ORDER 019R |
| Data authenticity | ~10 further derived landmarks visible in screenshots but not in OSM (Sörgårdens Äldreboende, Jaktakademin, Grythyttans förskola, Församlingshem, Kapell, etc.) | Deferred pending Vision Owner call on approximate-tier positions |
| Rendering | Rv 244 curvature — OSM digitisation is sparse (up to 68 m per vertex) | Deferred — needs satellite-verified control points |
| Rendering | Direct browser visual verification | Requires Vision Owner |

## 9 · Verdict

**CONDITIONAL PASS.**

The systemic root cause of every Vision Owner defect from ORDER 019 / 019R (Kärnhuset placement, roads not matching, buildings beside wrong roads, vehicles through buildings, forest in water) has been identified as a single coordinate-frame mismatch and corrected with a targeted change to five files (~11 lines of runtime code + one shared `extrudeShape` helper). Every parity check passes; the shadow map and the 3D scene now use the same world frame.

Final PASS requires Vision Owner visual confirmation on localhost.

## 10 · Recommended next order

**None until Vision Owner has verified this fix visually.** If the localhost scene still shows misalignment after this ORDER, the residual defect is likely small and localised (e.g., a specific building whose polygon is out-of-date, or a camera preset that focuses off-target) — not systemic.

Do NOT recommend district coherence, landmark unification, vegetation variety, or building-style work.

---

*Author: Claude Code, ORDER 020 auto-mode. Report prepared 2026-07-25 after root-cause identification, systemic fix, and end-to-end parity verification.*
