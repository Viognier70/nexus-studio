# World Authenticity Report — ORDER 022

**Status:** CONDITIONAL PASS pending Vision Owner visual verification.
**Class:** Engineering report — sector-by-sector authenticity pass.
**Session:** ORDER 022 (auto-mode, 2026-07-25)
**Frozen:** World Alignment v1.0 (ORDER 020) + facade fidelity (ORDER 021A).

---

## 1 · Session posture

ORDER 022's acceptance surface is **visual correspondence between the running localhost scene and the real Grythyttan.** I cannot open a browser from this session, nor can I fetch high-resolution Google Maps imagery directly. What I *can* do — and did — is:

1. Audit the data-level completeness of every world sector against Overpass + the existing world.json.
2. Add systemic checks that catch classes of runtime artefacts (trees on roads, silent-invisible landmark ways, coordinate-frame mismatches).
3. Fix any systemic defects the automated checks surface.
4. Document exactly which residual issues still require Vision Owner visual review.

I have been explicit throughout this session about which claims are data-verified vs render-verified.

## 2 · Sector coverage (via `scripts/sector-audit.mjs`)

10 sectors defined, centred on landmark reference positions with 180–280 m radii. For each sector the tool reports buildings (total, handcrafted, procedural, named list, by kind), road segments (count by role, named-street list), landmarks in bounds, water bodies, forest patches. Output snapshot:

| Sector | Buildings | Handcrafted | Named roads (sample) | Landmarks |
|--------|-----------|-------------|-----------------------|-----------|
| Campus | 15 | 4 (Måltidens Hus + Kärnhuset + Kantin + Kärnhuset wing) | Kolargatan, Kvarnvägen, Lokavägen, Prästgatan, Sörälgsvägen | gry-campus, gry-pizzanshus, gry-herrgard, gry-ingo, gry-direkten, gry-kantin |
| Torget | 42 | 3 (long house, kyrka, gästgivaregård) | Nygatan, Prästgatan, Torget, Kyrkbacken, Lokavägen | 7 in range (kringlan/cornelis/glass/antik/torget/kyrka/gastgivaregard) |
| Historic centre | 60 | 6 | 17 named streets | 8 in range |
| Ingo-eastern | 29 | 2 (INGO now visible, Pizzans) | 8 named including Rv 244 approach | gry-ingo, gry-pizzanshus, gry-direkten |
| School district | 53 | 9 (D2 school complex) | 6 named | gry-skola, gry-ip |
| Station corridor | 42 | 13 (D2 station + freight yard) | Stationsgatan, Järnvägsgatan, Skiffergatan | gry-jarnvag, gry-skola, gry-ip |
| Residential-N | 49 | 4 in overlap | Norra Bergvägen, Nygatan, Kyrkogatan +5 | 8 in range |
| Residential-W | 39 | 3 in overlap | Hantverksgatan, Magasinsgatan +6 | 8 in range |
| Residential-S | 23 | 2 in overlap | Hammargatan, Prästgatan, Smedsgatan +5 | 4 in range |
| Herrgård | 8 | 1 | Kvarnvägen | gry-herrgard |

Every sector's building count is non-zero, every sector's road hierarchy is populated, every named landmark appears in at least one sector's range. **No sector-level data gaps.**

## 3 · Systemic corrections landed this ORDER

### 3.1 · V8 — trees on roads
`scripts/validate-world.mjs` extended with V8: samples every deterministic pasture-tree grid cell (same hash the runtime uses) and reports any within 3 m of a car-road centreline. Cross-checks the runtime source for the `nearAnyCarRoad` guard so Medium-severity is surfaced only when the runtime lacks exclusion.

Runtime fix: `OsmMeadowVegetation.tsx` now applies `nearAnyCarRoad` on every candidate. 48 previously-emitted trees now excluded — every one of them was within 3 m of a car-road centreline (would have rendered as trees on asphalt). Polygon-based exclusions (water / forest / residential / buildings) already existed; the road check is the missing perpendicular-distance component.

### 3.2 · Sector audit tool
`scripts/sector-audit.mjs` — descriptive per-sector inventory. Reports building count, handcrafted density, named-road list, landmark coverage, water/forest overlap. Not corrective; enables identifying which sector the next fix should target.

### 3.3 · Confirmation of prior-ORDER fixes
- **ORDER 020** — World Alignment v1.0 parity: 10/10 control points at 0.00 m drift.
- **ORDER 021A** — window / door / roof-eave facade fidelity: geometric-math verified across 6 wall heights and 3 wealth tiers.
- **ORDER 021 B1** — INGO + Tempo recovery: V7 clean, no landmark-way silently in the skip list without a handcrafted component.

## 4 · Commits added this ORDER

```
180a6cb feat(world): ORDER 022 — sector audit tool + V8 trees-in-roads check + runtime fix
```

Single commit for the systemic work this session enabled with confidence. Every prior ORDER 020/021 commit remains part of the running total.

## 5 · Validator status

```
Parity check: All 10 controls pass at 0.00 m drift.
World validator:
[ok ] V1  no forest polygon vertex inside water
[ok ] V2  HorizonForest emitted 2278/2278 markers, rejected 1364 for water
[ok ] V3  23 raw road segments enter buildings — trimmed by CLIPPED_ROADS + CLIPPED_ROADS_VEHICLE
[ok ] V4  every named residential ≤400 m from Torget promoted to village_street
[ok ] V5  every landmark position within 5 m of its OSM building centroid
[ok ] V6  23 multi-wing building polygons detected — split by splitAtBridgeEdges
[ok ] V7  no silent invisible building — every landmark-way skip has a handcrafted component
[ok ] V8  48 trees would sit near roads — OsmMeadowVegetation excludes them via nearAnyCarRoad

Summary: 0 Critical, 0 High, 0 Medium, 0 Low, 8 Info
```

Typecheck + build remain clean.

## 6 · Remaining issues — ranked

Every item below survived because it requires evidence or judgment beyond the automated data-level checks a headless session can perform.

### A · Requires Vision Owner visual verification (no code change needed)
1. **INGO + Tempo procedural render** — recovered from invisibility (ORDER 021 B1) but their `roof` / `yes` kind renders as generic canopy / commercial block. Landmark-tier handcrafted geometry (INGO's pump island + canopy, Tempo's signage band) is the natural next promotion once Vision Owner confirms the recovery.
2. **Rv 244 curvature** — sparse OSM digitisation (8 vertices per 446 m). Derived control-point layer requires satellite reference the current toolchain cannot capture.
3. **Facade fidelity ORDER 021A fixes** — window Y math, door grounding, roof overhang — geometrically verified but visually unverified.

### B · Named non-OSM landmarks visible in reference screenshots
Sörgårdens Äldreboende, Jaktakademin, Grythyttans förskola, Grythyttans Församlingshem, Grythyttans Kapell, Grythyttans Fotbollsplan, SolidFeet, Grythyttan Stålmöbler, Djurskyddet Vilsna Tassar Hällefors, Barbellclub Bergslagen — all visible in the six Vision Owner Google Maps screenshots, none present in OSM. Approximate-tier positions estimable by pixel measurement but not yet added — deferred pending Vision Owner call.

### C · Procedural quality candidates (not defects, but improvements)
- Window pane subdivision (single flat pane → 2×2 or 3×3 mullion grid typical of Bergslag windows).
- Roof material variation (currently kind-driven; could pick up `roof:material` OSM tag when present — same wiring the ORDER 019 Block C `roof:shape` ingest set up).
- Chimney count / smoke correlation.
- Distinct silhouettes for the 3 named unlanded buildings (Swedecote, Länsmansgården, Kärnhuset wing).

### D · Beyond ORDER 022 scope
Water depth realism, distant forest ring density fine-tune, camera preset spec, LOD system — none required for authenticity.

## 7 · Success criteria audit

| Criterion (from ORDER 022) | Status |
|---------------------------|--------|
| Digital twin recognisable without labels | **NEEDS VISUAL** — building silhouettes are systemically corrected; only Vision Owner can confirm recognition. |
| Road network matches reality | **DATA CLEAN** — 327 segments, all named streets promoted, Rv 244 topology verified vertex-for-vertex against Overpass. Sparse curvature on Rv 244 remains upstream. |
| Buildings resemble real counterparts | **DATA CLEAN + FACADE FIXED** — 276 rendered, 24 handcrafted, INGO+Tempo recovered, windows/doors/roofs geometrically correct. Landmark-tier handcrafted upgrades deferred. |
| Neighbourhoods have distinct identities | Data-clean — sector audit shows named-road diversity per residential belt. |
| Landmarks immediately recognisable | 18 landmark records; 9 handcrafted; ~10 non-OSM named landmarks deferred. |
| No trees inside buildings | Enforced by V1 + OsmMeadowVegetation.nearAnyBuilding. |
| No roads through buildings | Enforced by V3 + CLIPPED_ROADS + CLIPPED_ROADS_VEHICLE. |
| No vegetation inside lakes | Enforced by V1 + V2. |
| No floating geometry | Facade fidelity fixed door grounding (ORDER 021A). |
| No mirrored geometry | Enforced by parity-check + ORDER 020 fix. |
| No obvious procedural repetition | Per-building hash-driven wealth tier / cladding / dormer count / chimney count / colour wobble already deterministic. |
| No major missing buildings supported by verified data | V7 + LANDMARK_BUILDING_IDS composition ensures every landmark-way either handcrafted or procedural. |
| No systematic visual errors | Parity + world validators both clean. |

## 8 · Verdict

**CONDITIONAL PASS.**

Every automated authenticity check passes at Info-only. Every systemic defect surfaced during the session has been fixed with a targeted code change guarded by a regression validator. World Alignment v1.0 remains untouched.

**Final PASS** requires Vision Owner visual confirmation that:
1. Trees no longer render on car roads.
2. INGO + Tempo are visible on localhost at their expected sector positions.
3. Window rows sit above the plinth and below the roof line on every building kind.
4. Doors stand grounded on their step, attached to the wall face.
5. Roofs project 0.35 m past their walls (except industrial parapets).
6. The village as a whole reads as Grythyttan rather than as a generic Bergslag procedural.

## 9 · Recommended next milestone

**Wait for Vision Owner visual verification of the six checkpoints above.**

If any checkpoint fails visually, the residual defect is likely narrow (specific kind, specific instance) — a localised follow-up, not a systemic ORDER.

If visual review passes: proceed to landmark-tier promotion for the two named-but-still-procedural landmarks (INGO canopy + Tempo signage band), or the approximate-tier positions for the ~10 non-OSM named landmarks — either would raise recognition density without requiring further transform-layer work.

**Do NOT** recommend camera changes, LOD systems, or new decorative context until Vision Owner signs off on the current authenticity baseline.

---

*Author: Claude Code, ORDER 022 auto-mode. Report prepared 2026-07-25 after the sector audit tool + V8 trees-in-roads validator + runtime exclusion fix. Working tree clean of my changes; only unrelated Vision Owner files remain untracked.*
