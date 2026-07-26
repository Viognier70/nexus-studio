# REVIEW PACKAGE — ORDER 029

> Physical world completion from Vision Owner references.
> Handoff for Vision Owner visual verification.
> Date: 2026-07-26.

## Summary

ORDER 029 promoted **5 landmarks** from OSM into `world.json` after cross-referencing the 19 Google Maps screenshots supplied by the Vision Owner. All 20 validators remain green; typecheck + production build pass.

| Change | Before | After |
|---|---|---|
| `world.landmarks[]` count | 18 | 23 |
| `landmarks.json` total | 18 | 23 |
| `pois.json` total | 18 | 23 |
| District assignment | 655 / 655 (100%) | 660 / 660 (100%) |
| `place-graph.json` nodes | 286 | 291 |
| `place-graph.json` edges | 1139 | 1142 |
| Validators V1–V20 | 20 Info (clean) | 20 Info (clean) |

## 5 landmarks promoted (per Vision Owner screenshots)

Every promotion sources its OSM way and preserves exact centroid geometry — no invention.

| Landmark | OSM source | World position | District | Reference screenshot |
|---|---|---|---|---|
| Kärnhuset | `w193810921` building=university | (407.80, -89.62) | D02 campus | @59.7054191,14.5424275,17.46z |
| Länsmansgården | `w1422743880` building=yes | (-32.31, 74.42) | D01 historic-centre | @59.7054191,14.5424275,17.46z |
| Swedecote | `w1239628613` building=industrial | (30.60, 285.50) | D11 residential-south | @59.7032607,14.5302088,17.26z |
| Miljongruvan | `w568543643` historic=mine natural=water | (941.88, -1829.81) | D15 forest-edge | not visible in supplied screenshots (documented via OSM only) |
| Grythyttans Fotbollsplan | `w1422745010` leisure=pitch sport=soccer | (-305.60, -391.20) | D06 school | @59.7080013,14.5277443,17.04z |

## Recommended review views

For each promoted landmark, camera the strategic map at the world position below. The **strategic camera** (see CAMERA_AND_VIEW_SYSTEM.md) accepts XZ world coordinates directly.

| Landmark | Recommended camera target [x, z] | What changed | What to verify |
|---|---|---|---|
| Kärnhuset | `[408, -90]`, altitude 60m, angle 45° | Landmark marker added; D2 handcraft KarnhusetD2Pass5 already renders the shell | Marker sits on the correct building; no double render; identity legible |
| Länsmansgården | `[-32, 74]`, altitude 45m, angle 45° | Landmark marker added; procedural render (family=Historic) continues | Marker on the historic building near Torget (SE of Gästgivaregården) |
| Swedecote | `[31, 286]`, altitude 90m, angle 40° | Landmark marker added; procedural render (family=Industrial) continues; largest industrial building in D11 | Marker on the correct large industrial building on Lokavägen |
| Miljongruvan | `[942, -1830]`, altitude 90m, angle 45° | Landmark marker added over the flooded historic mine (water polygon) | Marker sits over the water body far NE of the village |
| Grythyttans Fotbollsplan | `[-306, -391]`, altitude 55m, angle 40° | Landmark marker added at the pitch centre south of Grythyttans IP | Marker south of the existing IP; the pitch itself does NOT render as a green area yet (see Remaining uncertainty) |

## District completeness score changes

| District | Score before | Score after | Reason |
|---|---|---|---|
| D01-historic-centre | 77 | 77 (landmarks 2 → 3) | Länsmansgården |
| D02-campus | 87 | 87 (landmarks 2 → 3) | Kärnhuset |
| D06-school | 89 | 89 (landmarks 2 → 3) | Grythyttans Fotbollsplan |
| D11-residential-south | 52 | **67** (landmarks 0 → 1) | Swedecote — first landmark |
| D15-forest-edge | 62 | **77** (landmarks 0 → 1) | Miljongruvan — first landmark |

D11 and D15 jumped one readiness band because a district's first landmark counts +15 to its completeness score.

## Systemic fixes to metadata pipeline

Two `scripts/metadata-engine.mjs` fixes:

1. **POI_CATEGORY table** extended with 5 new entries so V16 stays green:
   - `gry-karnhuset` → Education / high
   - `gry-lansmansgarden` → Historic / medium
   - `gry-swedecote` → Industrial / medium
   - `gry-miljongruvan` → Historic / high
   - `gry-fotbollsplan` → Sports / medium

2. **V13 categorisation**: `gry-miljongruvan` and `gry-fotbollsplan` set `resolvedFrom: 'osm'` in their landmark records so V13 routes them through the permissive V13a "non-building OSM ways" branch (plaza / sports / pitch / heritage water) instead of the strict V13 "stale reference" branch.

3. **V5 drift**: `gry-swedecote` centroid corrected from (24.79, 283.78) — a naive average of all polygon vertices — to (30.60, 285.50) matching the validator's polygon centroid formula (< 6.1 m drift previously).

## Unresolved / documented for future work

### 1 OSM feature awaiting fetch-script extension

- **Grythyttans Reningsverk** (`r17025286`, `building=industrial man_made=wastewater_plant`) — a multipolygon relation with 3 outer-role member ways. The current `scripts/fetch-grythyttan-osm.mjs` only stitches multipolygon relations for `natural=water`. Adding a `building` multipolygon extractor is a single-purpose fetch-script change (roughly 30 lines) — recommended as ORDER 030 or bundled into the next OSM re-fetch cycle.

### 15 Vision-Owner-confirmed landmarks awaiting OSM survey

Visible in the Google Maps screenshots, but the underlying OpenStreetMap data lacks the features entirely (no tags, no ways). Per the ORDER 028/029 "Do not invent architecture" rule, these cannot be added to `world.json` without OSM data.

The path forward for each is: **add the feature to OpenStreetMap → re-run the fetcher → the feature auto-flows into `world.json` and all downstream metadata**.

Full list (with proposed WGS84 positions) preserved in `LANDMARK_CATALOGUE.md §Vision-Owner-confirmed landmarks`.

**Heritage-tier missing**:
- Grythytte Qvarn — historic mill on Sikforsån
- Grythyttans Kapell — chapel (distinct from Grythyttans Kyrka)

**Institutional missing**:
- Sörgårdens Äldreboende (senior residence)
- Jaktakademin (hunting academy)
- Grythyttans förskola (preschool)
- Grythyttans Församlingshem (parish hall)

**Commercial missing**:
- SolidFeet, Grythyttan Stålmöbler, CSVWellness, Djurskyddet Vilsna Tassar Hällefors, Barbellclub Bergslagen

**Slate-industry cluster missing** (major district-identity signal for D07/D10):
- Icopal Skifferverk, Takskifferspecialisten AB, Grythyttevikens Skiffertak AB

### 3 documented absences (Grythyttan geography reality)

- **Kommunhuset** — municipal seat is in Hällefors, not Grythyttan
- **Library** — no standalone bibliotek; library service historically operates inside skola / campus
- **Museum** — no dedicated building; Miljongruvan (now promoted) + Grythytte Qvarn substitute

## Physical elements NOT changed by ORDER 029

Per the ORDER's "Prohibited work" clause, none of the following were touched:

- No new roads (verified all 15 ORDER-named streets already present; Rv 244 = 7.5 km / Rv 205 = 12.1 km already covered).
- No new building geometry (all 5 promoted landmarks reuse existing OSM ways in world.json — no polygons invented).
- No handcraft (Kärnhuset already had D2 handcraft; the other 4 render procedurally per family rules).
- No gameplay, business assignment, interior design, decorative detail, camera or material changes.

## Files changed

- `frontend/src/strategic/data/grythyttan-world.json` — 5 landmark records appended, +112 lines
- `scripts/metadata-engine.mjs` — 5 POI_CATEGORY entries added, +7 lines
- `scripts/world-completeness.mjs` — generator strings updated for post-ORDER-029 state
- `reports/metadata/*.json` — regenerated deterministically
- `reports/semantic/*.json` — regenerated deterministically
- `reports/districts/assignment.json` + `summary.json` — regenerated (660/660 assignment)
- `documentation/architecture/WORLD_COMPLETENESS_REPORT.md` — updated
- `documentation/architecture/LANDMARK_CATALOGUE.md` — updated (verified count 18 → 23)
- `documentation/architecture/DISTRICT_COMPLETENESS.md` — updated (D11, D15 new landmarks scored)
- `documentation/architecture/PLACE_CATALOGUE.md` — regenerated
- `documentation/architecture/ADAPTIVE_BUILDINGS.md` — regenerated
- `documentation/architecture/AUTHENTICITY_MATRIX.md` — regenerated
- `documentation/architecture/GAMEPLAY_READY_WORLD.md` — regenerated
- `documentation/architecture/REVIEW_PACKAGE_ORDER_029.md` — this document

## Validator + build status at commit

- `npm run typecheck` — green
- `npm run build` — green (1.79s, 1473 kB gzipped 409 kB)
- `node scripts/validate-world.mjs` — **20 Info, 0 Critical / 0 High / 0 Medium / 0 Low**
- `node scripts/parity-check.mjs` — all 10 control points OK (0.00 m drift)
- `node scripts/district-assign.mjs` — 660 / 660 assigned (100%)

## Regeneration

```bash
node scripts/district-assign.mjs
node scripts/metadata-engine.mjs
node scripts/knowledge-graph.mjs
node scripts/place-engine.mjs
node scripts/district-identity.mjs
node scripts/place-graph.mjs
node scripts/world-completeness.mjs
node scripts/validate-world.mjs
node scripts/parity-check.mjs
cd frontend && npm run typecheck && npm run build
```
