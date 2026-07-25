# Building Completion & Facade Fidelity Report — ORDER 021 / 021A

**Status:** CONDITIONAL PASS pending Vision Owner visual verification.
**Class:** Engineering report
**Session:** ORDER 021 + amendment 021A (auto-mode, 2026-07-25)
**Frozen:** World Alignment v1.0 (ORDER 020) — no coordinate-system changes in this ORDER.
**Companion audit:** `BUILDING_COMPLETION_AUDIT_ORDER_021.md`
**Parent report:** `RENDERER_ALIGNMENT_REPORT_ORDER_020.md`

---

## 1 · Total elapsed
This session: ~1 h focused on the ORDER 021 building inventory + INGO/Tempo recovery, then pivoted to ORDER 021A facade-fidelity fixes.

## 2 · Buildings audited
- **274** raw OSM buildings in the ingest.
- **276** runtime `WORLD.buildings` after multi-wing polygon split.
- **252** rendered by OsmBuildings (procedural).
- **9** handcrafted D1 landmarks + **15** handcrafted D2 buildings.
- **1** church, **1** shared container, and **9** landmark-way records dedicated to handcrafted components — all correctly hidden from OsmBuildings via `LANDMARK_BUILDING_IDS`.

## 3 · Missing buildings found
- **2** silently invisible buildings recovered — **INGO** (petrol station, way `w614554207`) and **Tempo** (grocery, way `w1250001245`). Both had been added as landmark records in ORDER 019R commit `8937921` but were hidden from OsmBuildings by the blanket "skip every landmark-way" rule with no handcrafted component to replace them. They have been silently absent from every localhost render since ORDER 019R.
- **0** OSM buildings missing from ingest (Overpass matches vertex-for-vertex).
- **0** degenerate polygons (`< 4 verts` or `area < 1 m²`).

## 4 · Named buildings added or promoted
- No new landmark records added in this ORDER (ORDER 021A explicitly restricts new decorative content).
- 3 named-but-not-landmark buildings continue to render procedurally: Swedecote (industrial), Länsmansgården (residential-adjacent), Kärnhuset wing (Campus). Documented for future ORDER promotion.

## 5 · Clusters completed
Every cluster listed in ORDER 021 was already spatially complete at the polygon level (verified via `BUILDING_COMPLETION_AUDIT_ORDER_021.md`). Handcrafted density remains as it was; recovery of INGO + Tempo closes the two visible cluster gaps at Torget (grocery axis) and Pizzans/Ingo eastern approach.

## 6 · Procedural systems improved (ORDER 021A facade fidelity)

Every one of the 250+ procedurally rendered buildings had three simultaneous geometry defects. All are now systemically fixed:

### 6.1 · Window vertical alignment (`OsmBuildings.windowsFor`)
- **Before.** For 2+ storey buildings the ground-floor window centred at Y=0.90 → bottom at Y=0.22 sat **inside the 0.32–0.65 m plinth**, and the top-floor window's top edge exceeded the wall height by ~0.4 m — visibly poking through the roof line. `windows misaligned vertically & randomly` per the Vision Owner reference.
- **After.** Storey count comes from OSM `building:levels` when tagged, otherwise `floor((wallH − plinth) / 2.7 / 0.9)` clamped 1–4. Storey centres evenly distributed as `plinth + (s + 0.5) · span`. Storey height default reduced from 3.0 → 2.7 m (Bergslag typical). Verified across 6 wall heights and 3 wealth tiers — every window sits above the plinth and below the wall top.

### 6.2 · Door + step grounding (`OsmBuildings.EntranceMarker`)
- **Before.** Door centre Y=1.4, height 2.6 → bottom Y=0.10 buried in the plinth. Door depth 0.06 at Z=ridgeD/2−0.02 put 5 cm of the door mesh INSIDE the wall face. Every entrance read as "floating or not on ground".
- **After.** 0.30 m grounded step projecting 0.5 m from the facade; door bottom sits on the step top with centre Y=1.325, height 2.05 m (standard Swedish domestic proportions); door pushed 0.04 m OUT from the wall face so its full 0.08 m depth reads as attached, not embedded. Lintel + lantern + trim strip lifted proportionally.

### 6.3 · Roof eave overhang (`OsmBuildings.RoofCap`)
- **Before.** 0.18 m INWARD inset → roof cap was 0.36 m NARROWER than the walls it covered — the opposite of the Bergslag 0.3–0.6 m outward eave target. Every gable/hip roof read as a lid clipped inside the wall footprint.
- **After.** 0.35 m outward overhang for gable / hip / shed / barn; industrial parapet keeps 0 (no eave, correct for flat-roofed warehouses). Pitch math unchanged — already produces 25–35° roofs, within the 20–45° target.

## 7 · Commits and hashes

```
635f199 test(world):  B5 — V7 silent-invisible-building check
39d8717 fix(buildings): ORDER 021A — window / door / roof-eave facade fidelity
d35c69c fix(world):   B1 — recover invisible INGO + Tempo (LANDMARK_BUILDING_IDS drift)
```

Plus the earlier ORDER 021 audit doc commit and audit inventory work.

## 8 · Files changed

```
frontend/src/strategic/content/world.ts                              — HANDCRAFTED_LANDMARK_IDS, corrected skip-list composition
frontend/src/strategic/scene/OsmBuildings.tsx                        — windowsFor, EntranceMarker, RoofCap overhang
scripts/validate-world.mjs                                           — new V7 silent-invisible-building check
documentation/architecture/BUILDING_COMPLETION_AUDIT_ORDER_021.md    — new
documentation/architecture/BUILDING_COMPLETION_REPORT_ORDER_021.md   — this file
```

## 9 · Validator results

```
$ node scripts/parity-check.mjs
All parity checks passed.

$ node scripts/validate-world.mjs
[ok ] V1: no forest polygon vertex inside water
[ok ] V2: HorizonForest emitted 2278/2278 markers, rejected 1364 for water
[ok ] V3: 23 raw road segments enter buildings — expected to be trimmed
[ok ] V4: every named residential ≤400 m from Torget promoted to village_street
[ok ] V5: every landmark position within 5 m of its OSM building centroid
[ok ] V6: 23 multi-wing building polygons detected — expected to be split
[ok ] V7: no silent invisible building — every landmark-way in the skip list has a handcrafted component

Summary: 0 Critical, 0 High, 0 Medium, 0 Low, 7 Info
```

Typecheck + build clean.

## 10 · Remaining landmark-tier blockers
None. INGO and Tempo are now visible (as procedural buildings with their kind-appropriate treatment — INGO's `roof` kind renders as a low canopy, Tempo's `yes` kind renders as a modest commercial block). Neither meets the "landmark tier ≥ 0.90 confidence" bar for handcrafted geometry, but the ORDER 021 spec explicitly places recognition-tier procedural rendering above landmark-tier handcrafting when reference material is thin.

## 11 · Remaining visible gaps
- **Rv 244 curvature.** Sparse OSM digitisation; unchanged since ORDER 019R. Not a building-fabric issue.
- **~10 named non-OSM landmarks** (Sörgårdens Äldreboende, Jaktakademin, Församlingshem, Kapell, Grythyttans förskola, Fotbollsplan, SolidFeet, Grythyttan Stålmöbler, Djurskyddet Vilsna Tassar Hällefors, Barbellclub Bergslagen) visible in the Vision Owner reference screenshots but not in OSM. Adding them would require approximate-tier positions estimated by pixel measurement — deferred.
- **Procedural window pane detail** — every window is a single flat pane. Muntin / mullion detail (2×2 or 3×3 pane grid typical of Bergslag double-hung windows) would raise recognition quality significantly. Deferred pending Vision Owner call on the extra vertex/instance cost.

## 12 · Best review presets

Suggested camera positions for the Vision Owner visual review pass:

- **Village view** (Torget area, 900 m altitude, pitch 32°) — confirms INGO + Tempo now render, and that neither is missing.
- **Kvarteret view** (Torget area, 210 m altitude, pitch 40°) — verifies window rows on Torget-adjacent buildings sit above the plinth and below the roof line.
- **Business view** (Torget, 55 m altitude, pitch 34°) — verifies door/step/lintel proportions on a residential building's front elevation.
- **Custom pan** to Prästgatan east end (world x=350, z=-10) — INGO petrol station canopy should now be visible.
- **Custom pan** to Skolgatan (world x=-170, z=54) — Tempo grocery should now be visible.
- **Any residential row** — gable roof eaves should project 0.35 m past the wall on all four sides (previously inset 0.18 m inward).

## 13 · PASS / CONDITIONAL PASS / FAIL

**CONDITIONAL PASS.**

All three ORDER 021A facade-fidelity defects (windows misaligned, doors floating, roofs wrong pitch/overhang) have systemic geometric fixes verified numerically. Both invisible ORDER 019R landmark buildings recovered. New V7 validator prevents the drift class from recurring. Validators 0/0/0/0 Critical/High/Medium/Low across parity and world checks.

**Final PASS** requires Vision Owner visual confirmation that:
1. INGO and Tempo are now visible on localhost.
2. Windows sit consistently above the plinth on the ground floor and inside the roof line on the top floor.
3. Doors stand grounded on the step, attached to (not embedded in) the wall face.
4. Roofs have a visible 0.35 m eave overhang past the walls (except industrial parapets, which stay flush).

## 14 · Recommended next milestone

**Wait for Vision Owner visual verification of this ORDER first.** If any of the four checkpoints above still fails visually, the residual defect is likely a specific interaction between the new geometry and a particular building kind (e.g., a "yes" building whose kind maps to a wrong roof style) — a small localised follow-up, not a systemic ORDER.

If visual review passes:
- Landmark tier promotion for INGO (canopy + pump island geometry) and Tempo (front-elevation signage band) — recognition-tier upgrades from procedural to handcrafted.
- Window muntin detail — instanced sub-pane grid.
- ~10 non-OSM landmarks — approximate-tier positions estimated from screenshots, or reference-photograph-driven placement.

**Do NOT** recommend district coherence, decorative context or camera changes until Vision Owner signs off on the current fidelity fix visually.

---

*Author: Claude Code, ORDER 021 / 021A auto-mode. Report prepared 2026-07-25 after the audit, invisible-building recovery, facade-fidelity systemic fixes, and validator extension.*
