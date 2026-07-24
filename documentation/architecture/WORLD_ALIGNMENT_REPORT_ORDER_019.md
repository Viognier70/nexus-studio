# World Alignment Report — ORDER 019

**Status:** Final for this ORDER  
**Class:** Engineering report  
**Session:** ORDER 019 (auto-mode, 2026-07-25)  
**Companion audit:** `WORLD_ALIGNMENT_AUDIT_ORDER_019.md`  
**Branch:** `feature/strategic-camera` (7 commits added on top of `2283ff0`)

---

## 1 · Objective recap

Make localhost visually read as the real Grythyttan. The Vision Owner directive was explicit that the target was **perceived spatial truth**, not OSM correctness for its own sake. Every intervention below was chosen against that lens.

## 2 · Phases completed

| Phase | Focus | Outcome |
|-------|-------|---------|
| 1 · Audit | Full read of the renderers + Overpass probe of what tags exist upstream vs what the ingest drops | Written to `WORLD_ALIGNMENT_AUDIT_ORDER_019.md` |
| 2 · Mental map alignment | Rv 244 primary through-road label fixed; horizon forest anchors the eye on Torget as village centre | Landed |
| 3 · Rendering improvements | Traffic weighting, road surface differentiation | Landed |
| 4 · Spatial relationships | OSM ingest extended so building relationships pick up any future roof / height survey with no code change | Landed |
| 5 · Traffic | Density weighted by role × maxspeed × length; heavy-vehicle floor | Landed |
| 6 · World polish | Horizon forest ring restores landscape depth around the village | Landed |

## 3 · Commits (chronological)

```
424cc69 docs(architecture): ORDER 019 Phase 1 — world alignment audit
9b754e5 feat(traffic):      ORDER 019 Block A — hierarchy-weighted vehicle spawning
c248b74 feat(roads):        ORDER 019 Block B — OSM surface differentiates road tone
32174c9 feat(ingest):       ORDER 019 Block C — capture roof:shape + structural OSM tags
b161384 feat(scene):        ORDER 019 Block E — distant Bergslag forest ring
e90b422 fix(labels):        primary road shares 'main' tier with the secondary through-route
c27ffa0 docs(register):     ORDER 019 derivations
```

Typecheck and build were kept green after every commit.

## 4 · Systems improved

### 4.1 · Traffic hierarchy (`scene/OsmTraffic.tsx`)
- `speedWeight(road)` bins `maxspeed` into 5 tiers.
- `ROLE_WEIGHT` amplifies the primary + main through-roads by 3.0 × / 2.0 ×.
- `lengthWeight(road)` prevents short service stubs from over-drawing traffic.
- `weightedPick(pool, weights, rng)` used at both spawn and swap.
- `KIND_SPEED_FLOOR` restricts bus / truck / tourist_bus to roads with `maxspeed ≥ 50`.
- Verified distribution: primary 42 % / main 26 % / residential + local ~30 % / service ~2 % (general traffic); primary 51 % / main 31 % / rest ~18 % (heavy).

### 4.2 · Road surface (`content/roadRoles.ts`, `scene/OsmRoads.tsx`)
- Introduced `SURFACE_TINTS` lookup with per-surface tint colour and blend strength.
- `specFor(road)` now returns a role colour blended with the surface tint.
- `OsmRoads.tsx` suppresses paved sidewalk + kerb strip on `UNPAVED_SURFACES` roads.
- 211/327 Grythyttan roads now render at surface-truthful tones instead of uniform asphalt.

### 4.3 · OSM ingest expansion (`scripts/fetch-grythyttan-osm.mjs`, `content/world.ts`)
- Building records now carry `roofShape`, `roofLevels`, `buildingLevels`, `height`, `roofMaterial`, `roofColour`, `wallMaterial`, `wallColour`.
- Regenerated `grythyttan-world.json`; landmark array preserved via `--previous`.
- 14 buildings now render with their true OSM roof shape; the other 260 fall through to the previous kind-driven inference. Any future OSM survey improves the render without an ingest change.

### 4.4 · Building height honours OSM (`scene/OsmBuildings.tsx`)
- `heightFor(b, kind)` prefers OSM `height` (2 m < h < 60 m) then `building:levels × 3.0 m` then the kind-based default.
- Wobble reduced when storey count is known (± 8 % instead of ± 12 %) so the OSM signal is not overwritten by procedural jitter.

### 4.5 · Roof-shape resolver (`scene/OsmBuildings.tsx`)
- `roofStyleFromOsm(shape)` maps OSM values to internal styles (`flat`, `gable`, `hip`, `shed`); exotic shapes fall through.
- `toExtruded` now: `roofStyleFromOsm(b.roofShape) ?? roofStyleFor(kind)`.

### 4.6 · Distant Bergslag forest ring (`scene/HorizonForest.tsx`)
- Annular ring of ~2 280 silhouette markers between 700 m and 2200 m from Torget.
- 60 % cool conifer (`#3a4a3f`), 40 % warm broadleaf (`#4d5842`).
- Two `drei Instances` draw calls; fog envelope softens the ring before the horizon line.
- Restores landscape depth at village zoom without invented OSM data.

### 4.7 · Label tier hardening (`scene/StreetLabels.tsx`)
- `role === 'primary'` now maps to `'main'` tier alongside `role === 'main'`.
- Latent bug: Rv 244 was previously staying labelled only because its display name happened to sit in `WAYFINDING_ROAD_NAMES`.

### 4.8 · APPROXIMATION_REGISTER updated
- Every derived weight, tint magnitude, ring radius, and ingest addition documented in `documentation/world/APPROXIMATION_REGISTER.md` under the 2026-07-25 entry.

## 5 · Architectural changes

- **New file:** `frontend/src/strategic/scene/HorizonForest.tsx` — added to `StrategicScene` after `OsmWater` and before `OsmForest`.
- **Extended interface:** `RawBuilding` in `content/world.ts` picked up 8 optional structural fields.
- **No breaking changes:** every downstream consumer still works because the new fields are optional and typed as `string | null | undefined` / `number | null | undefined`.
- **Two shared helpers** added inside `roadRoles.ts` (`blendHex`, `surfaceApplied`) rather than pulling `tintColour` from `world.ts` — kept `roadRoles.ts` free of circular WORLD dependencies.
- **`weightedPick` + weight-table caching** in `OsmTraffic.tsx` — allocation-free after the initial `useMemo`.

## 6 · Explicit anti-scope

The following were considered and deliberately declined during this session:

- **Landmark aura overlays.** VS-03 removed landmark rings on the design principle that the village must read through shape. Adding auras would violate that decision.
- **OSM `width` verbatim on roads.** OSM widths do not preserve the tier hierarchy (e.g. some residentials tag wider than main). Using them would collapse the visual hierarchy the recent tier work established. Deferred pending a mixed weighted-tier approach.
- **Intersection blend meshes.** Nice-to-have polish; no impact on village-zoom recognition. Deferred.
- **Terrain heightfield banking of roads.** Frame-cost risk without proportional gain at strategic zoom. Deferred.
- **Machine-readable APPROXIMATION_REGISTER JSON.** Governance improvement, not visual truth. Deferred.
- **New assets or dependencies.** Prohibited by the branch charter and not needed for any of the interventions above.
- **`documentation/foundation/` and `documentation/world/*.md` edits outside the register.** Vision Owner domain per CLAUDE.md §4.

## 7 · Remaining weaknesses

Ranked as the next ORDER should probably tackle them.

1. **Building height still 12 % procedural noise for the ~260 buildings without OSM `height` / `building:levels`.** The tag population needs an OSM survey pass by a resident with a phone. Until then, height variation is real but not truthful.
2. **Roof-shape signal at 14/274.** Same story — the ingest is ready, the OSM tag population is thin.
3. **Handcrafted vs procedural stylistic clash at street-level zoom.** `CraftedLandmarks.tsx` uses per-building component hierarchies; `OsmBuildings.tsx` uses shared scaled geometries. At district zoom, adjacent handcrafted + procedural sometimes read as two different rendering families rather than one village. Fix would be extracting the procedural detail system (RoofCap, Cornerboards, EntranceMarker) as shared components and retrofitting the handcrafted landmarks to consume them.
4. **Intersection stacking still mechanical at kvarteret zoom.** Deferred but still true — road tiers overlap by Z-offset rather than negotiating at junctions.
5. **`primary` and `main` render at very similar widths** (10 m vs 9 m). At village zoom the width delta is one pixel. Consider whether the `primary` tier should widen further, or whether hierarchy should be signalled through colour saturation as well as width.
6. **Torget plaza polygon is still a placeholder** — the register's older note flagged this. Real Torget shape requires a Vision Owner call on OSM tagging vs handcrafted geometry.

## 8 · Recommended next milestone

**ORDER 020 — District Coherence.** Bring the handcrafted (District 1 + District 2) landmarks onto the same procedural detail system that `OsmBuildings` uses, so a resident cannot tell where the handcrafted zone ends. This is the biggest remaining "walking through Grythyttan" gap; it is systemic; it clears technical debt (two rendering vocabularies for the same object type); and it makes any subsequent OSM survey immediately visible on both procedural and handcrafted buildings.

Secondary milestone: **traffic-flow simulation upgrade** — segment-to-segment routing rather than end-to-end bouncing. Deferred here because it is a big change and the hierarchy improvements from Block A already do most of the perceptual work. But the current bounce is visible on long straight roads.

## 9 · Definition of Done — status

- ✅ Traffic reinforces the road hierarchy at village zoom.
- ✅ Roads no longer read as uniform asphalt: gravel / paved separable at district zoom.
- ✅ Rv 244 label is guaranteed at village zoom irrespective of the wayfinding-name set.
- ✅ Horizon reads as landscape depth rather than a flat pancake.
- ✅ Typecheck and build both green throughout the session.
- ✅ Every derived rule documented in `APPROXIMATION_REGISTER.md`.
- ⚠️ **Landmark visual weight at village zoom** — not addressed in this ORDER (design constraint from VS-03). Sits inside the ORDER 020 handcrafted / procedural unification work.

---

*Author: Claude Code, ORDER 019 auto-mode. Report prepared 2026-07-25 after ~1 production block of auditing followed by 4 blocks of systemic intervention and one block of documentation.*
