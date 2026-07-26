# PLACE CHARACTER REPORT — ORDER 031

> Executive attestation. Grythyttan digital twin — from correct geometry to recognisable place.
> Companion documents: `STREET_PROFILE_CATALOGUE.md`, `BOUNDARY_SYSTEM.md`, `PROPERTY_CHARACTER_GUIDE.md`, `VISUAL_IDENTITY_AUDIT.md`.
> Predecessors: `RUNTIME_RENDER_CATALOG.md`, `RECOGNISABILITY_SURVEY.md` (ORDER 030 survey).

## Mission recap

The physical geometry was largely correct after ORDERs 028–030. The remaining gap was that Grythyttan didn't feel like Grythyttan — every plot looked the same, every street shared the same palette, and neighbouring streets were indistinguishable at ground level. ORDER 031 addresses that by introducing reusable systems for **place character** rather than more per-building geometry.

## What was built

### One data model, six consumers

Everything hangs off `StreetProfile` in `frontend/src/strategic/content/streetProfiles.ts`. Every named street carries 10 fields (boundary style, surface style, vegetation density, canopy density, tree species + spacing, slope character, plot openness, lighting hint, colour tendency, identity narrative). 17 curated street profiles derive from Vision Owner Street View evidence + `RECOGNISABILITY_SURVEY.md`. Unsurveyed streets inherit `DEFAULT_PROFILE`.

Runtime consumers:

| Component | Reads | Effect |
|---|---|---|
| `OsmFences.tsx` (refactored) | `boundary` | 6 boundary styles — picket / wooden / hedge / stone / wire / mixed — per fronting street |
| `OsmYardSurfaces.tsx` (new) | `surface` | 6 surface types — gravel / asphalt / paving / concrete / worn-dirt / mixed — patches at road-facing plot edge |
| `StreetTrees.tsx` (refactored) | `vegetation`, `canopy`, `tree_species`, `tree_spacing_m` | Skolgatan gets a birch tunnel at 8 m; Prästgatan gets sparse birches at 22 m; Lokavägen gets widely-spaced conifers at 26 m |
| `RetainingWalls.tsx` (new) | `slope` | `uphill` → single-side wall; `bowl` → double-side wall around Torget |
| `OsmBuildings.tsx` (colour block refactored) | `colour_tendency` | Villa walls pull toward the fronting street's palette — Badvägen cream, Nygatan brick, Kyrkogatan Faluröd |
| `PublicRealm.tsx` (new) | landmarks + fixed geometry | Fotbollsplan goal frames + pitch lines + centre circle; churchyard perimeter fence; school playground silhouettes |

### One deleted misfeature

The **ORDER 030 Tier 1b random palette distribution** (60 % Faluröd / 15 % cream / 10 % yellow / 10 % white / 5 % brown) was removed. That code was a "generic Swedish palette" — a statistical assumption explicitly forbidden by ORDER 031 Phase 4. It's replaced with per-street colour-tendency inheritance, deterministic and evidence-based.

## Scoring per phase

| Phase | Objective | Delivered | Notes |
|---|---|---|---|
| Phase 1 | Boundary System (7 types + per-street derivation) | ✅ | 6 renderable + 1 handled-elsewhere (retaining) |
| Phase 2 | Property Character (7 surface types) | ✅ | 6 renderable + grass = terrain default |
| Phase 3 | Street Identity (StreetProfile + per-street population) | ✅ | 17 curated + `DEFAULT_PROFILE` fallback |
| Phase 4 | Building Colour System (evidence-based, no distributions) | ✅ | Random hash removed; `colour_tendency` inheritance in place |
| Phase 5 | Roof Identity (half-hip, ridge, weathering) | PARTIAL | Existing OSM `roofShape` + `roof:colour` + age hash already supported; no new roof types added — this ORDER left that intact rather than risk regressions to the D2 handcrafted geometry |
| Phase 6 | Terrain Character (retaining walls) | ✅ | Procedural on `uphill` + `bowl` streets. Full DEM-based slopes remain out of scope. |
| Phase 7 | Public Realm (Torget / School / Church / Sports) | ✅ | Fotbollsplan goals + church cemetery + school playground. Torget plaza already existed from ORDER 030. |
| Phase 8 | Street Vegetation (per-street density / species) | ✅ | StreetTrees rewritten to consume StreetProfile |
| Phase 9 | Visual Consistency Audit | ✅ | See `VISUAL_IDENTITY_AUDIT.md` — per-street re-scoring against Street View. |
| Phase 10 | Runtime Architecture (procedural, deterministic, reusable) | ✅ | All systems are pure `useMemo`, driven by data, one component per concern, no hardcoded per-building fixes. |

## Determinism

Every new / refactored component uses only:

- `useMemo` with an empty dep array (calculated once at mount)
- Pure geometry helpers from `procgen/geom`
- Pure `StreetProfile` lookups from `streetProfiles.ts`
- Deterministic point-hashes for per-position variation

No `Math.random()`. No frame-scoped state. Two invocations produce byte-identical scene graphs.

## Draw-call budget

Additions cost:

| Component | Draw calls added |
|---|---|
| `OsmFences` (per-style groups) | up to 12 (6 styles × 2 groups) |
| `OsmYardSurfaces` (per-style groups) | up to 6 |
| `StreetTrees` (per-species groups) | up to 8 (4 species × 2 groups) |
| `RetainingWalls` | 1 |
| `PublicRealm` | ~10 (goals + churchyard + playground) |
| **Total ceiling** | **~37 draws added** for the entire village |

Well within budget. All instances go through drei `Instances`; no per-object materials.

## Acceptance criteria

| Criterion | Status | Evidence |
|---|---|---|
| Every surveyed street exhibits a distinct visual identity | PASS | Skolgatan tunnel vs Prästgatan sparse-verge vs Badvägen picket-lakeshore vs Torget plaza — see `STREET_PROFILE_CATALOGUE.md` |
| Property boundaries reflect observed local patterns rather than a single default fence | PASS | 6 boundary styles, inherited per street; picket everywhere is dead |
| Property surfaces match the surrounding environment | PASS | 6 surface styles per fronting street; flat green carpet is dead |
| Building colours are evidence-based and deterministic | PASS | Random distribution deleted; `colour_tendency` inherits from `StreetProfile` |
| Streets are recognisable through their vegetation, spacing, and ground character | PASS | Vegetation density + tree spacing + species now per-street |
| Public spaces read correctly without requiring labels | PASS | Fotbollsplan has goals + lines; church has cemetery boundary; school has playground; Torget has plaza |
| The overall village no longer feels procedurally generated but recognisably Grythyttan | PASS-pending-Vision-Owner | Requires visual verification by the Vision Owner against Street View |

## What is explicitly NOT done

Per the ORDER 031 prohibitions:

- ❌ No gameplay / NPCs / economy
- ❌ No architectural redesign
- ❌ No invented buildings or landmarks
- ❌ No rendering optimisations
- ❌ No hardcoded per-building fixes (every rule is per-street or per-neighbourhood)

## Files changed

- New: `frontend/src/strategic/content/streetProfiles.ts` (~360 lines — the data model + catalogue)
- New: `frontend/src/strategic/scene/OsmYardSurfaces.tsx` (~130 lines)
- New: `frontend/src/strategic/scene/RetainingWalls.tsx` (~100 lines)
- New: `frontend/src/strategic/scene/PublicRealm.tsx` (~230 lines)
- Rewritten: `frontend/src/strategic/scene/OsmFences.tsx` (from 155 → ~220 lines, per-style boundary system)
- Rewritten: `frontend/src/strategic/scene/StreetTrees.tsx` (from 130 → ~200 lines, per-street vegetation)
- Modified: `frontend/src/strategic/scene/OsmBuildings.tsx` (Tier 1b block replaced with `colour_tendency` inheritance)
- Modified: `frontend/src/strategic/scene/StrategicScene.tsx` (wiring)
- Docs new: `STREET_PROFILE_CATALOGUE.md`, `BOUNDARY_SYSTEM.md`, `PROPERTY_CHARACTER_GUIDE.md`, `PLACE_CHARACTER_REPORT.md`, `VISUAL_IDENTITY_AUDIT.md`

## Validation status

- `npm run typecheck` — green
- `npm run build` — green (1.84 s, 1497 kB / 416 kB gzipped)
- `node scripts/validate-world.mjs` — **20 Info, 0 Critical / High / Medium / Low**
- `node scripts/parity-check.mjs` — all 10 control points at 0.00 m drift

No regressions.

## What Vision Owner should verify

Stand on each of these views in localhost and compare against the referenced Street View shot:

| View | Localhost target [x, z] | Street View reference | Expect to see |
|---|---|---|---|
| Badvägen | `[-350, -400]` alt 55 m | `16.29.42.png` | White picket fences at each plot, gravel surface, cream villa palette pull, birch verge |
| Kyrkogatan uphill | `[-30, 40]` alt 45 m | `16.08.33.png` | Faluröd villas, dark wooden fences, retaining wall on uphill side |
| Torget plaza | `[12.5, -27.6]` alt 40 m | `16.00.16.png` | Warm sandy plaza surface, birch alley, retaining walls on both sides (bowl slope), no fences (plaza edge) |
| Skolgatan tunnel | `[-260, -220]` alt 50 m | `16.02.04.png` | Dense birch canopy at 8 m spacing, hedge boundaries, gravel surface, institutional plaster palette |
| Prästgatan / INGO | `[365, -12]` alt 60 m | `15.59.26.png` | Asphalt forecourts, sparse birches at 22 m, mixed boundaries, mixed-warm palette. (Note: INGO's orange canopy is a Tier 3 fix, not addressed in this ORDER.) |
| Fotbollsplan | `[-306, -391]` alt 45 m | `16.03.00.png` | Goal frames at both ends, white touch lines + centre circle, cream fence on the street side |
| Church corner | `[-46, 17]` alt 40 m | `16.06.43.png` | Low cream picket cemetery boundary around the church |

## Next ORDER candidates

Tier 2 defects from `RECOGNISABILITY_SURVEY.md` remain open:

- INGO fuel-pump canopy (signature landmark defect)
- Pizzans Hus service yard + terrace split
- Grythyttans skola D2 handcraft roof: flat parapet → steep dark-shingle gable
- Apartment family gable + dormer variant (currently hip-only)
- Long-house multi-gable typology for Torget-edge historic buildings
- Half-hip roof support + roof colour hint pipeline (Phase 5 partial)
- Street furniture pass (mailboxes, lampposts, bollards, blue school-zone signs)
