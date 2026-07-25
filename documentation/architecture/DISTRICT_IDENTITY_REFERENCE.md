# District Identity Reference

**Source of truth:** `reports/semantic/districts-identity.json` (regenerate with `node scripts/district-identity.mjs`).
**Related:** `DISTRICT_PRODUCTION_TRACKER.md`, `DISTRICT_METADATA_REFERENCE.md`.

Every one of the 15 districts carries a canonical identity profile — the Vision Owner's answer to "what IS this district in the Living World Model?".

## The 15 identities

| ID | Primary identity | Secondary identity |
|----|------------------|--------------------|
| **D01** Historic Centre | Historic quarter — Prästgatan chain | Tenant-carrier long house + adjoining residential |
| **D02** Campus | Gastronomy campus — Örebro universitet RHS | Research + teaching + student life |
| **D03** Torget | Central plaza — Torget + Gästgivaregården | Historic hospitality + village gathering |
| **D04** Church | Ecclesiastical anchor — Grythyttans Kyrka | Parish + ceremony + community |
| **D05** Station | Historic transport corridor — old BJ freight yard | Industrial-heritage station + preserved building group |
| **D06** School | Educational quarter — Grythyttans skola + IP | Primary schooling + community sports |
| **D07** Industrial | Industrial estate — production + storage | Regional employers + logistics |
| **D08** Hälleforsvägen | Rv 244 approach — INGO + Pizzans Hus corridor | Transport gateway + eastern commercial edge |
| **D09** Prästgatan | Prästgatan connector — Torget ↔ Rv 244 | Historic residential fabric along the main axis |
| **D10** Residential North | Northern residential belt — Nygatan / Norra Bergvägen | Bergslag-typology houses + Bergslagshus commercial |
| **D11** Residential South | Southern residential — Rv 205 shoulder | Sparse — mostly Lokavägen frontage |
| **D12** Residential East | Hospitality quarter — Herrgården Grythyttan | Manor-house + Länsmansgården historic residence |
| **D13** Residential West | Western residential — Tempo + Hantverksgatan | Everyday retail + workshop-adjacent housing |
| **D14** Lakeshore | Torrvarpen shoreline — natural + recreational | Water edge + occasional dwellings |
| **D15** Forest Edge | Outlying rural / forest edge | Farms + isolated dwellings + landscape context |

## Profile fields per district

Each identity record carries:

- `primary_identity` / `secondary_identity` — the two-line signature.
- `knowledge_profile` — dominant knowledge domains + full mix.
- `architectural_profile` — dominant building families, handcrafted ratio, structure mix.
- `landscape_profile` — water bodies, forest patches, one-line landscape note.
- `gameplay_profile` — NPC density hint, count of social/learning/business hotspots.
- `cultural_profile` — cultural places count, dominant event types.
- `economic_profile` — commercial / hospitality / industrial place counts, active economic role count.
- `educational_profile` — educational place count, teaching hotspot count.
- `historic_profile` — historic landmark count, list of institutions.

## Usage

- **Vision Owner reviews** (per `VISION_REVIEW_WORKFLOW.md`) reference the primary identity when scoring recognition — "does this district read as its primary identity?".
- **Future NPC spawning** biases toward each district's primary knowledge domain.
- **Event generation** uses `dominant_events` per district.
- **Player quest lattice** uses institutions per district as anchor points.

## Editing an identity

Curated in `PRIMARY` map inside `scripts/district-identity.mjs`. Change requires evidence (Vision Owner call) — an identity change re-frames the whole district cycle in `DISTRICT_PRODUCTION_TRACKER.md`.
