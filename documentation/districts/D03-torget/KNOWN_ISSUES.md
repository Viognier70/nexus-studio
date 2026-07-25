# Known issues — D03 Torget

_Candidate defects surfaced by Claude Code pre-review sweep (ORDER 026). Every entry cites what to verify visually + the reference view. Vision Owner reclassifies each row into a formal severity during the visual pass._

## Candidate — data-level

| ID | Severity | Layer | Description | Reference |
|----|----------|-------|-------------|-----------|
| D03-C-01 | ⚪ Low | Landmark topology | `gry-kringlan` (Guldkringlan) node landmark landed in D03 by position, but its containing building `w869907962` (Torget long house) is in D01 Historic Centre. Tenant-in-container split is a subtle inconsistency — landmark's district and building's district disagree. | Assignment JSON |
| D03-C-02 | ⚪ Low | Landmark inventory | `gry-cornelis` (D01) and `gry-antik` (D01) are also long-house tenants but landed in D01 with the container. Rule for tenant landmark → district needs to be consistent. | LANDMARK_PROGRAM |
| D03-C-03 | ⚪ Low | Facade metadata | All 15 D03 buildings fall through to `typology-guess` height (no OSM `building:levels` or `height`). Facade fidelity depends on the ORDER 021A defaults holding visually. | `reports/metadata/facades.json` |

## Candidate — visual (needs Vision Owner review to confirm)

| ID | View | What to check |
|----|------|---------------|
| D03-V-01 | Business preset over Torget | Gästgivaregården renders with 8 m walls, steep gable roof, 2 chimneys, 3 dormers, small-pane windows, entrance door + sign. See `documentation/references/district-1/gastgivaregard/`. |
| D03-V-02 | Kvarteret preset over Torget | Torget plaza reads as a paved plane (not open ground). w122157681 rendered by `TorgetLandmark`. |
| D03-V-03 | Business preset, W of Torget | Long house `w869907962` (Torget long house) — 50.9 × 16.8 m 3-storey Falu-red with 3 tenant storefronts on the +Z facade. Handcrafted by `TorgetLonghusPass2`. Even though the building is in D01, its tenant markers (Kringlan / Cornelis / Antik) appear from D03. |
| D03-V-04 | Business preset — adjacent procedural | 3 apartment blocks (`w1239584171/172/173`, ~200 m² each) N/E of Torget. Should show ORDER 021A window rows above plinth, doors grounded on step, gable overhang. |
| D03-V-05 | Overview preset | 2 large procedural villas (`w869907977` 340 m², `w193810935` 152 m²) — largest procedural buildings in the district. Their facade quality is representative of the whole village. |
| D03-V-06 | Any preset | Named streets in D03: Kyrkogatan, Torget, Lokavägen, Västra Bergvägen. Confirm each renders with its expected role (Torget = village_street, Lokavägen = main). |
| D03-V-07 | Business preset over Glass & choklad | `gry-glass` at (−50.3, −64.9) — currently rendered by `ApproximationMarker`. Its own OSM building `w869907970` (162 m²) also renders as procedural Villa. Vision Owner: check the marker sits ON the building. |
| D03-V-08 | Overview preset | Verify no forest / vegetation lands on Torget plaza. |
| D03-V-09 | Overview preset | Verify no vehicles drive across Torget plaza (Torget is a `residential` road tier but plaza should exclude vehicles per road hierarchy). |
