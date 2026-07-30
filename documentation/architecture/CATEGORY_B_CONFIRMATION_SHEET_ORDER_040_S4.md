# Category B Confirmation Sheet — ORDER 040 §4.1

**Status:** Awaiting Vision Owner marking. **`provenance="vision-owner"` promotion is §8-directive-blocked** until a Superseding Directive on the "appearance vs position" principle exists. This sheet is producible and reviewable now; the marking step lands only when the SD does.
**Class:** Vision Owner input sheet
**Session:** ORDER 040 §4 (2026-07-30)
**Parent order:** `ORDER_040_SYNTHETIC_BUILDING_MARKING.md` §4
**Input:** ORDER 039 §2b classification of `vw-*` buildings into 75 Category A anonymous fill + 12 Category B named-real entities.

---

## 1. Purpose

Each of the 12 handcrafted `vw-*` buildings that carries a real-world named-entity claim (business, institution, historical property) needs the Vision Owner to mark **confirmed**, **wrong — move to X**, or **unsure** for the currently-recorded position. Until marked, the twelve remain at `provenance="synthesised"` (their state after ORDER 040 §2 backfill).

Per ORDER 040 §4.2, no building is moved by this order. The sheet is produced; a later fix-order applies whatever the Vision Owner marks.

The overview image at `documentation/references/order040-s4-category-b-overview-2026-07-30.jpg` (see §3) shows the 12 marked on Bing satellite imagery for spatial reference.

---

## 2. The twelve entries

For each: displayed name, current position (local + lat/lon), footprint area, nearest named street, and a one-line surroundings description drawn from `grythyttan-world.json` — what the data records, not what may be true on the ground.

Column **mark** is where the Vision Owner writes `confirmed`, `wrong — move to (x, z)`, or `unsure`. Positions in local metres.

Local → lat/lon conversion: `lat = 59.70575 − z / 111132.9`, `lon = 14.53723 + x / 56060`.

### 2.1 Overview

| # | vw-id | Displayed name | Centroid (local) | Lat, Lon | Area (m²) | Nearest street | mark |
|---|---|---|---|---|---|---|---|
| 1 | `vw-qvarn` | Grythytte Qvarn | (547.7, 38.9) | 59.70540, 14.54700 | 108 | Kvarnvägen, 34.8 m | ☐ |
| 2 | `vw-pra-djurskyddet` | Djurskyddet Vilsna Tassar Hällefors | (355.0, 15.0) | 59.70562, 14.54357 | 120 | Lokavägen, 24.1 m | ☐ |
| 3 | `vw-sorgarden` | Sörgårdens Äldreboende | (−320.0, −195.0) | 59.70750, 14.53152 | 512 | Hantverksgatan, 18.3 m | ☐ |
| 4 | `vw-jaktakademin` | Jaktakademin | (−265.0, 60.0) | 59.70521, 14.53250 | 150 | Magasinsgatan, 0.0 m | ☐ |
| 5 | `vw-stalmobler` | Grythyttan Stålmöbler | (−350.0, 30.0) | 59.70548, 14.53099 | 336 | Skolgatan, 9.4 m | ☐ |
| 6 | `vw-barbellclub` | Barbellclub Bergslagen | (−280.0, 45.0) | 59.70534, 14.53223 | 180 | Skolgatan, 0.0 m | ☐ |
| 7 | `vw-forskola` | Grythyttans förskola | (−215.0, −250.0) | 59.70800, 14.53339 | 308 | Stationsgatan, 29.4 m | ☐ |
| 8 | `vw-solidfeet` | SolidFeet | (−545.0, 483.0) | 59.70140, 14.52751 | 80 | Lokavägen, 65.8 m | ☐ |
| 9 | `vw-icopal` | Icopal Skifferverk | (−800.0, 684.0) | 59.69960, 14.52296 | 720 | Gruvgatan, 37.6 m | ☐ |
| 10 | `vw-takskiffer` | Takskifferspecialisten AB | (−604.0, 528.0) | 59.70100, 14.52646 | 336 | Gruvgatan, 68.0 m | ☐ |
| 11 | `vw-grythyttevikens-skiffertak` | Grythyttevikens Skiffertak AB | (−464.0, −639.0) | 59.71150, 14.52895 | 308 | Baluns väg, 48.1 m | ☐ |
| 12 | `vw-csvwellness` | CSVWellness | (−882.0, 239.0) | 59.70360, 14.52149 | 160 | Åsgatan, 0.0 m | ☐ |

### 2.2 Per-entry surroundings as the data records them

Each entry states: what the record says (position + name), the closest identity landmark and its direction, the closest OSM building. **This is what the data shows**; whether the position is real is precisely what the Vision Owner marks.

---

#### 1. `vw-qvarn` — Grythytte Qvarn

- **Position claim:** (547.7, 38.9) local  →  59.70540°N, 14.54700°E. Footprint 108 m², oriented ~east-west.
- **Nearest named street:** Kvarnvägen at 34.8 m. (The street name means "Mill road" — consistent with a historical mill.)
- **Nearest identity landmark:** `Grythytte Qvarn` at 0.0 m — the position is coincident with the `gry-qvarn` landmark record, which itself has `source.osmType=null, source.osmId=null, resolvedFrom="vision-owner-2026-07-26"` (no OSM way; landmark placement is Vision-Owner-supplied, per the 2026-07-30 correction that citation ≠ endorsement).
- **Nearest OSM building:** `w611766156` (kind=yes) at 37.3 m.
- **Vision Owner check:** Is the mill at approximately (547.7, 38.9), i.e. north side of Kvarnvägen where the road name suggests? If yes → **confirmed**. If the mill footprint should sit elsewhere (e.g. next to the mill-race on the water side) → **wrong — move to (x, z)**.

#### 2. `vw-pra-djurskyddet` — Djurskyddet Vilsna Tassar Hällefors

- **Position claim:** (355.0, 15.0) local  →  59.70562°N, 14.54357°E. Footprint 120 m².
- **Nearest named street:** Lokavägen at 24.1 m.
- **Nearest identity landmark:** Pizzans Hus (`w598989255`) at 12.0 m, south-west of it. **Overlap alert:** the ORDER 039 §2 tier-2 list has a 3.97 m² / 3.3% overlap with Pizzans Hus (below tier-3 threshold but noted).
- **Nearest OSM building:** Pizzans Hus (0.0 m — touching or slightly overlapping).
- **Vision Owner check:** Is the animal-welfare organisation actually at ~355, 15 (adjacent to Pizzans Hus)? Address is on Prästgatan (13 Prästgatan per public records). If the actual location is elsewhere on Prästgatan → **wrong — move to X**.

#### 3. `vw-sorgarden` — Sörgårdens Äldreboende

- **Position claim:** (−320.0, −195.0) local  →  59.70750°N, 14.53152°E. Footprint 512 m² (largest of the twelve; consistent with a municipal elderly-care building).
- **Nearest named street:** Hantverksgatan at 18.3 m.
- **Nearest identity landmark:** Grythyttans skola at 79.7 m north-east of it. The elderly-care home sits south-west of the school block.
- **Nearest OSM building:** `w870510878` (kind=school) at 7.7 m — Sörgården is right next to a school building.
- **Vision Owner check:** Is the elderly-care home actually west of the school block on Hantverksgatan? Or is the correct position elsewhere on Hantverksgatan / Skolgatan?

#### 4. `vw-jaktakademin` — Jaktakademin

- **Position claim:** (−265.0, 60.0) local  →  59.70521°N, 14.53250°E. Footprint 150 m². **On Magasinsgatan directly (0.0 m).**
- **Nearest identity landmark:** Tempo at 94.8 m east.
- **Nearest OSM building:** Tempo (`w1250001245`) at 72.1 m.
- **Vision Owner check:** Is the hunting academy sited on Magasinsgatan, west of Tempo? If elsewhere → mark.

#### 5. `vw-stalmobler` — Grythyttan Stålmöbler

- **Position claim:** (−350.0, 30.0) local  →  59.70548°N, 14.53099°E. Footprint 336 m² (industrial scale).
- **Nearest named street:** Skolgatan at 9.4 m.
- **Nearest identity landmark:** Tempo at 181.2 m east.
- **Nearest OSM building:** `w882114819` (kind=industrial) at 79.1 m.
- **Vision Owner check:** The steel-furniture manufacturer is historically Grythyttan-associated (since the 1930s). Is its current or historical works actually at ~(−350, 30) on Skolgatan? Or on Sörälgsvägen / one of the industrial streets further out?

#### 6. `vw-barbellclub` — Barbellclub Bergslagen

- **Position claim:** (−280.0, 45.0) local  →  59.70534°N, 14.53223°E. Footprint 180 m². **On Skolgatan directly (0.0 m).**
- **Nearest identity landmark:** Tempo at 110.0 m east.
- **Nearest OSM building:** Tempo (`w1250001245`) at 86.9 m.
- **Vision Owner check:** Is the gym at ~(−280, 45) on Skolgatan? If elsewhere on a different street → mark.

#### 7. `vw-forskola` — Grythyttans förskola

- **Position claim:** (−215.0, −250.0) local  →  59.70800°N, 14.53339°E. Footprint 308 m².
- **Nearest named street:** Stationsgatan at 29.4 m.
- **Nearest identity landmark:** Grythyttans skola at 49.3 m west — the preschool sits east of the school, close to Stationsgatan.
- **Nearest OSM building:** `w948705770` (kind=yes) at 37.5 m.
- **Vision Owner check:** Is the preschool east of the school block? Or elsewhere in the school-district cluster?

#### 8. `vw-solidfeet` — SolidFeet

- **Position claim:** (−545.0, 483.0) local  →  59.70140°N, 14.52751°E. Footprint 80 m².
- **Nearest named street:** Lokavägen at 65.8 m — set back from the main road.
- **Nearest identity landmark:** Tempo at 569.4 m north-east.
- **Nearest OSM building:** `w1239628614` (kind=industrial) at 113.7 m.
- **Vision Owner check:** SolidFeet — is it a retail/service business off Lokavägen at this position? Data has it fairly isolated.

#### 9. `vw-icopal` — Icopal Skifferverk

- **Position claim:** (−800.0, 684.0) local  →  59.69960°N, 14.52296°E. Footprint 720 m² (largest of the twelve — industrial slate works).
- **Nearest named street:** Gruvgatan at 37.6 m — "Mine street", consistent with the slate industry.
- **Nearest identity landmark:** Tempo at 890.5 m north-east — Icopal sits well south-west of village centre.
- **Nearest OSM building:** `w875778821` (kind=yes) at 44.8 m.
- **Vision Owner check:** Slate works south of village — is (−800, 684) the actual Icopal facility on Gruvgatan?

#### 10. `vw-takskiffer` — Takskifferspecialisten AB

- **Position claim:** (−604.0, 528.0) local  →  59.70100°N, 14.52646°E. Footprint 336 m².
- **Nearest named street:** Gruvgatan at 68.0 m.
- **Nearest identity landmark:** Tempo at 642.3 m north-east.
- **Nearest OSM building:** `w1239628614` (kind=industrial) at 166.0 m.
- **Vision Owner check:** Roof-slate specialist — cluster of slate-industry buildings between Gruvgatan and the slate quarry (Miljongruvan lake to the west). Is (−604, 528) right?

#### 11. `vw-grythyttevikens-skiffertak` — Grythyttevikens Skiffertak AB

- **Position claim:** (−464.0, −639.0) local  →  59.71150°N, 14.52895°E. Footprint 308 m². Local **positive z is south**, so z = −639 puts this **~639 m NORTH** of village centre.
- **Nearest named street:** Baluns väg at 48.1 m.
- **Nearest identity landmark:** Grythyttans Fotbollsplan at 294.1 m south-south-east.
- **Nearest OSM building:** `w1239699513` (kind=house) at 22.7 m.
- **Vision Owner check:** Slate-roof company — is (−464, −639) correct? Note this is north of village centre, farther from the other slate-industry cluster (Icopal, Takskifferspecialisten which sit south).

#### 12. `vw-csvwellness` — CSVWellness

- **Position claim:** (−882.0, 239.0) local  →  59.70360°N, 14.52149°E. Footprint 160 m². **On Åsgatan directly (0.0 m).**
- **Nearest named street:** Åsgatan (touching).
- **Nearest identity landmark:** Grythyttans gamla järnvägsstation at 591.4 m north-east.
- **Nearest OSM building:** `w611776595` (kind=yes) at 250.7 m.
- **Vision Owner check:** Wellness / spa on Åsgatan — furthest west of the twelve. Is (−882, 239) right?

---

## 3. Overview image

`documentation/references/order040-s4-category-b-overview-2026-07-30.jpg` — Bing satellite z=16, ~2.4 m/px at 60° N, 2048×1828 px, ~900 KB (JPEG, quality 88).

- **Magenta pins with white numbers:** the 12 Category B entities. Numbering matches this sheet's rows 1–12.
- **Cyan crosses:** identity landmarks from `world.landmarks` (church, Tempo, Kärnhuset, Måltidens hus, Gästgivaregård, Grythyttan station, etc.). Included purely for spatial orientation.
- **Yellow text:** entity name beside its pin.
- Footer credits Bing Maps © Microsoft. Diagnostic only; not a runtime asset (see ORDER 036 §4 marking: this render is `reviewState=present-unread` reference-side once you decide whether the confirmation sheet keeps it as-is or a fresh render is preferred).

The image is intended as a spatial orientation aid alongside the per-entry lat/lon; the Vision Owner marks each entry in §2 above from local knowledge, not from the satellite image.

---

## 4. Marking outcomes and follow-up

Once you mark each row, a follow-up order (candidate ORDER 041) does the corresponding schema and data work:

| Marking | Data effect |
|---|---|
| **confirmed** | The entry's `provenance` flips from `synthesised` to `vision-owner`. **§8 SD-blocked** — the promotion can be authored but not applied until the Superseding Directive on the appearance/position principle exists (per ORDER 040 §8). Meanwhile the marking is captured here in this sheet as the pending state. |
| **wrong — move to (x, z)** | A separate fix-order applies the position change, then flips `provenance` to `vision-owner` (also SD-blocked for the flip). The entry may fall into a tier-3 overlap that then needs an entry in `V21_ACCEPTED_OVERLAPS` — or better, a re-run of §6's correction proposal covering the new position. |
| **unsure** | Entry stays at `synthesised`. A separate reference-collection order (candidate: request a Vision-Owner-supplied photo / address / Street View tile) is issued to establish ground truth. |

For entries that come back **wrong — move**: please also indicate whether the current name is right and only the position is wrong, or whether both the name and position need attention (e.g. the entity has moved / closed / renamed). The current 12 names are the ones written into `world.json` by prior commits; the correctness of the name-claim itself is not covered by this sheet.

---

## 5. What this order does NOT do

- **No building moved.** §4.2 constraint.
- **No `provenance` value changed on any of the twelve.** All stay at `synthesised` from the §2 backfill until the sheet is marked AND the §8 Superseding Directive lands.
- **No new field added to the schema.**
- **No change to `world.json`.** The sheet-produce commit adds two documentation files and one image — zero data-file changes.
- **No confirmation on Claude Code's own judgement.** ORDER 040 §9 constraint: *"Confirming any Category B position on Claude Code's own judgement. §4.1 produces a sheet; the Vision Owner marks it."*

---

## 6. Acceptance (§4 wording restated)

- [x] Sheet exists with all twelve entries (§2).
- [x] Each entry has: name, current local coordinates, nearest named street, one-line surroundings description drawn from `grythyttan-world.json`.
- [x] Rendered overview image included (§3), produced without new dependencies (Python + PIL already in use; Bing satellite tiles retrieved with `urllib`, as in ORDER 038).
- [x] No Category B building moved.
- [x] Sheet is awaiting Vision Owner marking.
- [x] `provenance="vision-owner"` promotion side of §4.3 explicitly flagged as §8-SD-blocked; sheet is otherwise complete.

---

*Author: Claude Code, ORDER 040 §4. Read-only Python + Shapely against `grythyttan-world.json` post-§2/§3/§5 state; Bing satellite tiles for the overview.*
