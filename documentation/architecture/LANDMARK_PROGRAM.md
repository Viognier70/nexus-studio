# Landmark Program

**Status:** Living inventory.
**Owner:** Vision Owner (canonical list) + Claude Code (implementation).
**Related:** `PHASE_IV_PRODUCTION_PLAN.md`, `DISTRICT_PRODUCTION_TRACKER.md`.

The landmark set is what makes Grythyttan recognisable at village and district zoom. This file is the single source of truth for which landmarks exist, which need work, which are candidates, and how they map to districts.

## 1 · Existing landmarks (18)

Recorded in `frontend/src/strategic/data/grythyttan-world.json` → `landmarks` array.

### Handcrafted (9 — LANDMARK_TIER, ≥ 0.90 confidence)

| Landmark | ID | OSM source | District | Reference package |
|----------|-----|-----------|----------|-------------------|
| Grythyttans Kyrka | `gry-kyrka` | way 869907961 | D04 Church | `references/district-1/kyrka/` |
| Campus Grythyttan | `gry-campus` | way 193810975 (Måltidens Hus) | D02 Campus | `references/district-1/campus/` |
| Grythyttans Gästgivaregård | `gry-gastgivaregard` | way 869907964 | D15 (edge of D03 Torget by anchor) | `references/district-1/gastgivaregard/` |
| Pizzans Hus | `gry-pizzanshus` | way 598989255 | D08 Hälleforsvägen | — |
| Herrgården Grythyttan | `gry-herrgard` | way 611766160 | D12 Residential East | — |
| Grythyttans Gamla Järnvägsstation | `gry-jarnvag` | way 870510841 | D05 Station | `references/district-2/station-corridor/` |
| Grythyttans skola | `gry-skola` | way 1239584179 (school grounds) | D06 School | `references/district-2/school-complex/` |
| Grythyttans IP | `gry-ip` | way 869907952 (sports polygon) | D06 School | — |
| Torget (plaza) | `gry-torget` | way 122157681 (plaza polygon) | D03 Torget | — |

### D2 handcrafted buildings (15 — via CraftedLandmarksD2, no landmark records)

Kärnhuset + 5 station corridor + 9 school complex. Rendered as handcrafted geometry but not exposed as click-selectable landmarks (their landmark parent covers them).

### Recognition-tier landmark records without handcrafted geometry (5 — ORDER 019R additions)

| Landmark | ID | OSM source | District | Current render |
|----------|-----|-----------|----------|----------------|
| INGO | `gry-ingo` | way 614554207 (amenity=fuel) | D08 Hälleforsvägen | procedural (`roof` kind — flat canopy) |
| Tempo | `gry-tempo` | way 1250001245 (shop=supermarket) | D13 Residential West | procedural (`yes` kind — small commercial block) |
| Direkten | `gry-direkten` | node 2952131327 (shop=convenience) | D08 Hälleforsvägen | click disc only (no building geometry) |
| Kantin Hyttblecket | `gry-kantin-hyttblecket` | node 11516267647 (amenity=restaurant) | D02 Campus | click disc only |
| Bergslagshus AB | `gry-bergslagshus` | node 8828140003 (shop=doityourself) | D10 Residential North | click disc only |

### Node-only tenant markers (4)

Guldkringlan, Cornelis, Grythyttans glass & choklad, Grythyttans antikvariat — physically inside `w869907962` (Torget long house), rendered as tenants of the shared-container building. Click discs exposed by `OsmLandmarks`.

## 2 · Landmark tier definitions

Applied to the whole landmark set:

- **Landmark tier** — Confidence ≥ 0.90. Handcrafted geometry from a verified reference package. Approval gate: three photographs + Vision Owner sign-off.
- **Recognition tier** — Confidence ≥ 0.80. Procedural geometry driven by OSM tags + kind-specific typology. Approval gate: Vision Owner sees the shape at expected position.
- **Ordinary tier** — Confidence ≥ 0.75. Standard procedural rendering. No dedicated review.
- **Approximate tier** — Position estimated from Vision Owner screenshots (no OSM); marked in landmark record as `verification: 'approximate'`.
- **Placeholder tier** — Grey-box marker; `verification: 'placeholder'`.

## 3 · Candidate landmarks (~10) — visible in Vision Owner screenshots, absent from OSM

Deferred pending Vision Owner call on approximate-tier positions estimated by pixel measurement:

| Candidate | Screenshot | Estimated district |
|-----------|-----------|--------------------|
| Sörgårdens Äldreboende | Screenshot 9 | D10 Residential North |
| Jaktakademin | Screenshots 8, 9, 11, 12 | D01 Historic Centre / D10 |
| Grythyttans förskola | Screenshots 9, 11 | D06 School / D10 |
| Grythyttans Församlingshem | Screenshots 8, 9, 11, 12 | D04 Church |
| Grythyttans Kapell | Screenshot 13 | D05 Station |
| Grythyttans Fotbollsplan | Screenshot 10 | D06 School |
| SolidFeet | Screenshot 13 | D07 Industrial |
| Grythyttan Stålmöbler | Screenshot 12 | D07 Industrial |
| Djurskyddet Vilsna Tassar Hällefors | Screenshot 8 | D08 Hälleforsvägen |
| Barbellclub Bergslagen | Screenshots 11, 12 | D01 Historic Centre |

## 4 · Named buildings not yet in landmark index (3)

Present in `world.buildings` with a name, no landmark record:

| Building | OSM ID | District | Kind |
|----------|--------|----------|------|
| Swedecote | w1239628613 | D07 Industrial | industrial (large factory SE of village) |
| Länsmansgården | w1422743880 | D01 Historic Centre / D12 | yes (near Herrgården) |
| Kärnhuset wing #p1 | w193810921#p1 | D02 Campus | university (small secondary wing) |

Each is a natural landmark-record candidate — the barrier is landmark tier assignment + optional handcrafted upgrade.

## 5 · Approval workflow for new landmarks

1. Vision Owner supplies at minimum: (a) OSM id or a reference screenshot with lat/lon, (b) real-world function, (c) suggested tier.
2. Claude Code adds the landmark record to `grythyttan-world.json` via `--previous` refetch.
3. If handcrafted-tier: add a component under `CraftedLandmarks.tsx` or `CraftedLandmarksD2.tsx`, add the OSM way to `HANDCRAFTED_LANDMARK_IDS` in `content/world.ts`.
4. If recognition-tier: no code change beyond the landmark record.
5. Run `node scripts/validate-world.mjs` — V7 catches skip-list drift.
6. Update this file's inventory table.

## 6 · Frozen landmarks

_(Empty. Populated as landmarks are individually approved. Not the same as district freeze — a landmark can be frozen while its containing district is still In Progress.)_

| Landmark | Freeze date | Freeze commit | Reviewer |
|----------|-------------|---------------|----------|

---

*Author: Claude Code, ORDER 024 auto-mode.*
