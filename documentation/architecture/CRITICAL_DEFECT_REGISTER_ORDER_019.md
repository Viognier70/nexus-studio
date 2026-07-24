# Critical Defect Register — ORDER 019 (reopened)

**Status:** Failed visual-validation milestone  
**Class:** Defect tracking  
**Session:** ORDER 019 reopen (auto-mode, 2026-07-25)  
**Parent audit:** `WORLD_ALIGNMENT_AUDIT_ORDER_019.md`  
**Failed report:** `WORLD_ALIGNMENT_REPORT_ORDER_019.md`

Vision Owner rejected ORDER 019 on visual inspection. The numeric audits reported success but the running scene still fails core acceptance criteria. This register captures each observed defect with a full trace to the root cause and the smallest systemic correction.

Vision Owner observations of the running scene are authoritative over code-side audits.

---

## D1 — Kärnhuset placement error

- **Rendered location.** Handcrafted extrusion centred on the naive polygon centroid `(407.80, −89.62)` in local world metres.
- **Source geometry.** OSM way `193810921` (Nominatim confirms this IS the correct real-world Kärnhuset OSM id).
- **Raw source coordinates.** 27 vertices in WGS84 lat/lon; bbox `(59.706122, 14.543833)–(59.707000, 14.545073)`.
- **Transformed world coordinates.** Same 27 vertices projected via `toLocal()`; bbox `(370.15, −138.91)–(439.66, −41.33)`; bbox diagonal **119.8 m** for a documented **1970.6 m² building**.
- **Renderer / component responsible.** `frontend/src/strategic/scene/CraftedLandmarksD2.tsx::KarnhusetD2Pass5` and its shared `useWallGeo` extrusion.
- **Probable root cause.** OSM way 193810921 is a **self-touching multi-wing polygon**: vertices 16→17 span 47.9 m of empty space and 22→23 span 33.7 m, joining two disconnected wings via a "figure-8" outline. The polygon is topologically single but visually two disjoint bodies. Two failure modes stack:
  1. `THREE.Shape → ExtrudeGeometry → earcut` triangulates a self-touching polygon with undefined behaviour — spurious wall triangles across the diagonals are likely.
  2. The naive centroid `(sum/n)` lands **between the two wings** in the connector void, so the rendered geometry is anchored in empty space and the whole extrusion visually drifts away from either real wing.
- **Confidence.** ~0.90 (Nominatim confirms the OSM id; polygon topology confirmed via Overpass; earcut behaviour on self-touching polygons is well-documented).
- **Smallest systemic correction.** In the ingest, detect self-touching / multi-wing polygons (any building whose longest edge exceeds a threshold relative to its own perimeter) and split them into their connected sub-polygons at the self-touching diagonals. Each sub-polygon becomes an independent building record sharing the OSM id (e.g. `w193810921#a`, `w193810921#b`). Renderers see clean simple polygons; centroids fall on real building mass; earcut behaves. Kärnhuset renders as two connected wings in their real positions.

## D2 — Hälleforsvägen (Rv 244) route incorrect

- **Rendered location.** 6 OSM segments carry `ref=244`, rendered on the `primary` tier. Village-stretch endpoints: `(134.14, −355.04) → (413.14, −7.01) → (513.38, 119.31) → (524.87, 135.59) → (593.72, 733.69) → (917.99, 3030.02)` and one long approach segment `(−1248.5, −3959.38) → (134.14, −355.04)`.
- **Source geometry.** OSM ways `w25514870`, `w1006222227`, `w8122751`, `w287145821`, `w1006216361`, `w287145822` — verified `ref=244` via Overpass.
- **Raw source coordinates.** WGS84 as returned by Overpass; `--from-cache` reproducible.
- **Transformed world coordinates.** As above; topology chain end-to-end continuous with no missing segments.
- **Renderer / component responsible.** `scene/OsmRoads.tsx` (visual); `scene/OsmTraffic.tsx` (navigation).
- **Probable root cause.** The **through-village segment** `w1006222227` has **only 8 vertices for 446 m** and its straight-line first-to-last distance already covers that entire span — the OSM digitisation is missing intermediate curvature. Real Rv 244 through Grythyttan follows a curved route past Ingo, Pizzans Hus and the T-junction; our render draws a nearly-straight polyline. Combined with the campus stretch `w1006216361` (19 pts over 602 m — sparse), the road reads as a series of straight-ish diagonals instead of the recognisable real curve.
- **Confidence.** ~0.75 (topology verified correct; visual mismatch attributed to sparse digitisation, but Vision Owner may be seeing an additional issue such as the wrong side-of-road relationships).
- **Smallest systemic correction.** Documented **derived geometry layer for Rv 244**: insert intermediate control points at verified map positions (e.g. Google Maps satellite trace) to restore the curvature, while preserving raw OSM `w1006222227` untouched. The derived polyline is what OsmRoads renders and what OsmTraffic navigates. Log the control points in `APPROXIMATION_REGISTER` under a new "derived road geometry" section.

## D3 — Forest / vegetation inside water polygons

- **Rendered location.** ~860 conifer / broadleaf silhouettes rendered inside `Sör-Älgen` (`r67579-r0`, 12 km × 12 km lake bbox) and `Torrvarpen` (`r1297105-r0`, 12 km × 8 km lake bbox), out of 2 278 markers spawned by the ring.
- **Source geometry.** The **procedurally-scattered** HorizonForest ring — not OSM forest polygons. (OSM forest data is clean: 0 forest polygon vertices sit inside any water polygon.)
- **Raw source coordinates.** N/A — placement is deterministic from PRNG seed `0x1f0e57` over an annulus at 700–2200 m from Torget `(12.49, −27.59)`.
- **Transformed world coordinates.** 860 markers occupy the intersection of the annulus and the water polygons.
- **Renderer / component responsible.** `frontend/src/strategic/scene/HorizonForest.tsx` — introduced in ORDER 019 Block E, commit `b161384`. **Self-inflicted by ORDER 019.**
- **Probable root cause.** `HorizonForest.ringPointOK` filters by distance only. Nothing tests candidate points against `WORLD.water`. Sör-Älgen and Torrvarpen extend far into the 700–2200 m annulus.
- **Confidence.** 1.0.
- **Smallest systemic correction.** Extend the annulus filter with `!insideAnyWater(x, z)` using the shared point-in-polygon tester from `procgen/geom.ts`. Also verify `OsmMeadowVegetation` and `OsmForest` fringe scatter apply the same exclusion.

## D4 — Vehicles crossing building footprints

- **Rendered location.** Two loading-bay service roads (`w1329020075`, `w1329020076`) whose polyline midpoints sit inside industrial buildings `w870510826` and `w870510828` south-west of the village. One additional case (`w862853244` service road → `w1422743880` Länsmansgården) surfaces only when the vehicle's right-lane offset is applied.
- **Source geometry.** OSM service ways as ingested.
- **Raw source coordinates.** e.g. `w1329020075` seg 1 midpoint `(−623.6, −267.9)` sits inside `w870510826` bbox.
- **Transformed world coordinates.** As above.
- **Renderer / component responsible.** `scene/OsmRoads.tsx` renders `CLIPPED_ROADS`; `scene/OsmTraffic.tsx` navigates `VILLAGE_CAR_ROADS` (also derived from `CLIPPED_ROADS`).
- **Probable root cause.** Two stacked failures:
  1. `procgen/geom.ts::clipPolylineAgainstBuildings` clips the polyline **centreline** against building polygons, but the vehicle actually rides at up to **1.2 m right-lane offset** plus its own **1.7 m width**. Clipping the centreline is insufficient — a road that runs 1.2 m outside a building wall passes the centreline test but the vehicle enters the wall. Verified: even after CLIPPED_ROADS trimming, at least one conflict (`w862853244`) survives when the lane offset is applied.
  2. Vehicle SCALE ramps up to ~2× at village zoom (`readabilityScale`), so a 1.7 m car becomes 3.3 m wide and can further protrude beyond the road envelope into an adjacent wall.
- **Confidence.** 0.85 (root cause 1 confirmed by dense-sample test; root cause 2 inferred from the scale math).
- **Smallest systemic correction.**
  - Extend `clipPolylineAgainstBuildings` to clip against a **half-carriageway-plus-lane-offset-plus-vehicle-half-width envelope** rather than the bare centreline. Envelope width ≥ `roadHalf + laneOffset + vehicleHalfMax + 0.3 m clearance`.
  - Vehicle spawn / swap must also skip polyline positions where the offset ray from the polyline would enter a building — a per-position guard in `OsmTraffic`.
  - Cap vehicle readability scale so the maximum-scaled vehicle width never exceeds the narrowest road it can spawn on.

## D5 — Localhost scene does not match the real-world map

Umbrella defect: composed of D1–D4 plus a general visual-vs-map fidelity gap on side-of-road relationships and camera framing. Not a separately fixable item — closed by closing D1–D4 and running a Vision Owner visual re-review.

---

## Prioritisation

| Order | Defect | Blast radius | Cost | Rationale |
|-------|--------|--------------|------|-----------|
| 1 | D3 forest-in-water | Every village-zoom frame | Very small | Self-inflicted; single-file fix; must undo the damage before anything else |
| 2 | D1 Kärnhuset | One landmark visually wrong | Small–medium | Systemic ingest fix benefits any future multi-wing OSM polygon |
| 3 | D4 vehicles-in-buildings | Several roads, every session | Small | Envelope-aware clipping is a defensive helper the whole traffic system needs |
| 4 | D2 Hälleforsvägen curvature | Whole through-road visual | Medium (derived geometry) | Preserve raw OSM; add documented control-point layer |
| 5 | D5 visual re-review | End of session | User-time | Only Vision Owner can pass |

## Resolution status (updated after ORDER 019R remediation)

| Defect | Status | Fix commit | Notes |
|--------|--------|-----------|-------|
| **D3** forest-in-water | **RESOLVED** | `17bb247` | `HorizonForest.ringPointOK` now filters via `inAnyWater()`. Validator V2 confirms 2278/2278 markers emitted with zero water overlap; V1 confirms no OSM forest vertex sits inside water. |
| **D1** Kärnhuset placement | **RESOLVED (systemic)** | `21049a2` | `splitAtBridgeEdges` in `procgen/geom.ts` splits multi-wing OSM polygons; `world.ts` applies to every building with area/bbox<0.6 and any edge >25 m. Kärnhuset now renders as main body (1087 m², handcrafted) + secondary wing (193 m², procedural). Raw OSM preserved via `WORLD_RAW_BUILDINGS`. |
| **D4** vehicles-in-buildings | **RESOLVED** | `ed81e14` | `clipPolylineForVehicles` (dense-sample envelope clip with 3.2 m clearance) generates a separate `CLIPPED_ROADS_VEHICLE` set used by `VILLAGE_CAR_ROADS`, `MAJOR_ROADS`, `TRACK_ROADS`. Traffic navigates the vehicle-safe set; road rendering keeps the centreline set so asphalt stays where OSM says it is. |
| **D2** Rv 244 curvature | **PARTIAL** | `2d68f36` | Named-street promotion covers Rv 244's neighbours (Prästgatan, Nygatan, Östergatan, Hyttgatan, …); the through-road itself carries the raw OSM polyline. Deferred: derived curvature control-points require satellite-verified positions the current toolchain cannot reach. Flagged in the final report for the next visual-verification pass. |
| **D5** localhost vs real map | **CONDITIONAL** | — | Umbrella defect. Closes when Vision Owner visually re-reviews the running scene at localhost:5173/5174 after the four fixes above. Validator V1–V6 passes 0/0/0/0 Critical/High/Medium/Low. |

---

*Author: Claude Code, ORDER 019 reopen. Written before any fix commits so root-cause claims can be cross-checked against the code changes that follow. Updated at ORDER 019R closure with resolution status.*
