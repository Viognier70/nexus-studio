# Validator Reference

**Status:** Living document
**Class:** Engineering reference
**Owner:** ORDER 023 infrastructure (extended by ORDER 036 §3)

Three Node validators guard the world data, the runtime transform pipeline, and reference-manifest integrity. All are dependency-free — you can run them at any time without a build step.

## `scripts/parity-check.mjs`

Runtime transform-parity guard from ORDER 020. Ensures every shape-based renderer projects OSM `(x, z)` to world `(x, z)` — never mirrored.

**Modes:**
- `node scripts/parity-check.mjs` — human-readable
- `--strict` — exit 1 on any failure

**Checks:**
1. **Empirical.** Simulates the `THREE.Shape → rotateX(-π/2)` transform on a control OSM polygon and asserts Convention A mirrors z while Convention B preserves it.
2. **Static.** Greps every polygon-driven `shape.moveTo` / `shape.lineTo` across the six scene files and requires the second argument to be negated.
3. **Control points.** Projects 10 landmark / building / water centroids through the Convention-B pipeline and requires each to land within 0.01 m of its source.

## `scripts/validate-world.mjs`

World-data + runtime-consistency validator. 14 checks in one pass.

**Modes:**
- `node scripts/validate-world.mjs` — human-readable
- `--json` — machine-readable defect array
- `--strict` — exit 1 on Critical or High

**Per-defect fields:** `severity` (Critical / High / Medium / Low / Info), `id`, `message`, `detail`, `suggestedFix`, `files`.

**Checks:**

| ID | Severity if defective | What it detects | Suggested fix |
|----|----------------------|-----------------|---------------|
| **V1** | Critical | Any OSM forest polygon vertex sits inside a water polygon | Retag / retract the OSM forest polygon; fix in the fetcher if it's a stitching error |
| **V2** | High | HorizonForest ring emits fewer than 90 % of target markers, or emits any within water bodies without the water-exclusion guard | Ensure `HorizonForest.ringPointOK` calls `inAnyWater` and the attempt budget is at least 10× target |
| **V3** | Info | Raw road segments enter buildings — expected to be trimmed by CLIPPED_ROADS + CLIPPED_ROADS_VEHICLE | Runtime handles; only alerts if the trim is bypassed |
| **V4** | Medium | Named residentials within 400 m of Torget missing from VILLAGE_STREET_NAMES | Add the name to `VILLAGE_STREET_NAMES` + `WAYFINDING_ROAD_NAMES` in `roadRoles.ts` |
| **V5** | Low | Landmark position drifts > 5 m from its OSM building centroid | Re-run the fetcher; investigate a bogus polygon override |
| **V6** | Info | Multi-wing polygons with area/bbox < 0.6 and any edge > 25 m — handled by `splitAtBridgeEdges` | Runtime handles |
| **V7** | High | Landmark ID in `LANDMARK_BUILDING_IDS` skip list with no handcrafted component (silent-invisible-building drift) | Move the id out of the skip list or add a handcrafted component under `CraftedLandmarks` / `CraftedLandmarksD2` |
| **V8** | Medium | Pasture-tree candidate cells within 3 m of a car-road centreline without the runtime `nearAnyCarRoad` guard | Add `nearAnyCarRoad(x, z, 3.5)` to `OsmMeadowVegetation` pasture-tree loop |
| **V9** | High | Buildings / water / forest / residential / grass / graveyards with < 4 verts or < 1 m² — would silently drop at triangulation | Filter in the fetcher; skip in the ingest |
| **V10** | High | Two landmark records point at the same OSM `way/id` or `node/id` | Consolidate the duplicate landmark records in `grythyttan-world.json` |
| **V11** | Medium | OSM `height` tag < 2 m or > 60 m — implausible for Grythyttan | Investigate the upstream OSM record; add an override in `heightFor` if it's a mis-entry |
| **V12** | Medium | OSM `building=*` value has no `KIND_COLOUR` entry — falls through to DEFAULT_COLOUR | Add the kind to `KIND_COLOUR` + `roofStyleFor` + `heightFor` + `PLINTH_KINDS` in `OsmBuildings.tsx` |
| **V13** | High | Landmark record references an OSM way that no longer resolves upstream (`resolvedFrom !== 'osm'` fallback) | Re-run the fetcher; retag or downgrade the landmark |
| **V13a** | Info | Landmark record points at a non-building OSM way that resolved fresh — legitimate (plaza / sports / campus polygons) | No action |
| **V14** | High | Landmark ID referenced by runtime code but missing from `world.landmarks` (composition typo or dropped record) | Fix the typo or add the landmark |
| **V15–V20** | Info / Medium / High | Metadata and Place coverage (POI category / Place classification / district identity / landmark → Place). Skip cleanly when the report JSON they depend on is missing | See per-check message when they fire |
| **V21** | High | Two building footprints overlap above the ORDER 039 tier-3 threshold (A ≥ 5 m² AND ≥ 5 % of the smaller footprint) and the pair is not in `V21_ACCEPTED_OVERLAPS`. Uses Sutherland-Hodgman polygon clipping for intersection area | Fix the placement (nudge, shrink or remove) before landing. If the overlap is intentional (attached wing rendered as a separate polygon), add the pair to `V21_ACCEPTED_OVERLAPS` with a comment naming what authorised it. Also fires as Info when a previously-accepted pair has been corrected and can be removed from the exception list. See ORDER 039 §2 for threshold rationale, ORDER 040 §7 for the validator authorisation |

## `scripts/validate-references.mjs`

Reference-integrity validator from ORDER 036 §3. Ensures every `collectedSources[].path` in every `manifest.json` under `documentation/references/` resolves to a file on disk, relative to the citing manifest.

**Modes:**
- `node scripts/validate-references.mjs` — human-readable, exit 1 on any unresolved citation
- `--json` — machine-readable summary + failure array

**Failure record:** `manifest` (path), `index` (entry index in `collectedSources`), `path` (cited), `resolved` (path as resolved relative to CWD), `reason`.

**Why it exists.** ADR 002 §5.1 requires manifest bindings to be machine-checked. Before this validator, thirteen reference files sat in the repository root while manifests cited them by bare filename — undetected for weeks. A citation that resolves nowhere is a build-blocking defect.

### V21 accepted-exception mechanism

The 39 tier-3 building overlaps that ORDER 039 §2 catalogued predate this validator. To let it land immediately without blocking the build, they are enumerated in `V21_ACCEPTED_OVERLAPS` inside `validate-world.mjs` and pass the check as an Info summary. Each entry is a `"id1|id2"` string with the two OSM/handcraft ids sorted lexicographically (so the check is order-independent). Comments after each entry record the intersection area and fraction so a reviewer can see what is being tolerated.

**Lifecycle.** As ORDER 040 §6 corrections apply and pairs are resolved:

1. The pair is removed from `V21_ACCEPTED_OVERLAPS` in the same commit that applies the fix.
2. The validator confirms the pair no longer produces a tier-3 overlap.
3. Info side-note fires if a pair is still in the exception list but the overlap is gone — flags the exception list for cleanup.

When the exception list is empty, the mechanism itself can be retired — a plain "no tier-3 overlaps" is the target state.

## Adding a new check

1. Append a new `{ ... }` block inside `validate-world.mjs` before the output section.
2. Call `addDefect(severity, id, message, detail, suggestedFix, files)`.
3. Update this table.
4. Run the validator and confirm the new check either fires or lands as Info clean.

## CI wiring (suggested)

The validators are Node-only and take < 1 s. Suggested hooks:
```
pre-commit  → node scripts/parity-check.mjs --strict
pre-push    → node scripts/parity-check.mjs --strict && node scripts/validate-world.mjs --strict && node scripts/validate-references.mjs
```
