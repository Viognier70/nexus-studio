# Performance Preparation Reference

**Source of truth:** `reports/metadata/performance.json` (regenerate with `node scripts/performance-audit.mjs`).
**Constraint:** ORDER 025 forbids optimisation edits — this document identifies opportunities only.

Static estimate over the current world data — no browser telemetry. Numbers are rough but bounded.

## Current draw-call estimate (~2 884 total)

| Layer | Estimated draw calls | Notes |
|-------|---------------------|-------|
| OsmBuildings walls + decor | ~1 370 | 274 buildings × 5 meshes (wall + plinth + storey band + cornerboards + roof cap) |
| OsmRoads | ~981 | 327 roads × 3 shape families average |
| CraftedLandmarks (D1) | ~180 | 9 handcrafted landmarks × ~20 meshes each |
| CraftedLandmarksD2 | ~225 | 15 buildings × ~15 meshes each |
| Vehicles | ~48 | 24 vehicles × 2 boxes each |
| Landmark click discs | 18 | one invisible circle per landmark |
| Water | 12 | 6 bodies × (bed + surface) |
| Landcover (forest + grass + residential + graveyards) | ~30 | |
| Instanced (OsmForest / HorizonForest / MeadowVegetation) | 10 | fixed 4 + 2 + 4 draw calls regardless of instance count |
| Sky + terrain + lights | 10 | |

Total: ~2 900 draw calls at village zoom. That's on the high side for a browser scene — modern hardware handles it but a code-split into instanced meshes would materially help.

## Estimated mesh count (~2 786)

Bounded by the runtime — no dynamic mesh creation per frame. The `useMemo` in each scene layer computes geometry once at mount.

## Instancing opportunities

Ranked by priority × risk:

### 1 · `OsmRoads` merge — HIGH priority / MEDIUM risk
- Current: ~981 draw calls for 327 roads.
- Fix: merge same-tier road geometries into one `BufferGeometry` per tier via `THREE.BufferGeometryUtils.mergeGeometries`. 5 tiers × 5 shape families = 25 draw calls.
- Risk: must not regress World Alignment v1.0. Every merged geometry uses the same Convention-B negation.
- Estimated gain: −950 draw calls.

### 2 · `OsmBuildings` neighbourhood-material merge — MEDIUM priority / MEDIUM risk
- Current: ~1 370 draw calls for 274 buildings.
- Fix: group wall meshes by same colour (already computed per building via the neighbourhood tint system) into one merged mesh per neighbourhood.
- Risk: per-building status tints (BUILDING_STATUS_BY_OSM_ID) would need to remain independent.
- Estimated gain: −800 draw calls.

### 3 · `OsmTraffic` vehicle instancing — LOW priority / LOW risk
- Current: 48 draw calls for 24 vehicles.
- Fix: drei-Instance per vehicle kind (7 kinds × 2 mesh types = 14 draw calls).
- Estimated gain: −34 draw calls (small but very safe).

### 4 · `CraftedLandmarks` primitive instancing — LOW priority / HIGH risk
- Per-landmark refactor — per-window / per-dormer / per-chimney instancing.
- Risk: each landmark's composition function would need a rewrite.
- Not recommended until every landmark is Vision-Owner frozen.

## Memory hotspots

- OsmForest: max 1 600 tree instances × 4 geometries = bounded.
- HorizonForest: 2 278 instances × 2 geometries = bounded.
- OsmBuildings: creates ~274 unique BufferGeometries at ingest, one per building's Shape extrusion. Not shared across buildings even when footprints match. Only trivial dedup gain in this dataset.

## No-action-until items

- Texture reuse — the scene uses no textures today (materials are flat colours). Nothing to reuse.
- Large meshes — the terrain plane (12 000 × 12 000, 120 × 120 segments = 14 400 verts) is the largest single mesh. Already generated once at mount.
- Small meshes — every window is a shared boxGeometry via drei Instances; no small-mesh explosion.

## When to spend the optimisation budget

Only after Vision Owner has visually accepted the ORDER 021A / 022 baseline AND at least one district is Frozen. Optimising a scene that hasn't been visually approved risks locking in mistakes.

Full data in `reports/metadata/performance.json`.
