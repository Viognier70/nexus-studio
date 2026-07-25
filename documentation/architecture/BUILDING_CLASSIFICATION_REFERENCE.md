# Building Classification Reference

**Source of truth:** `reports/metadata/buildings.json` (regenerate with `node scripts/metadata-engine.mjs`).
**Classifier:** `scripts/metadata-engine.mjs` → `classifyBuilding(b)`.

## Building families (13 in use, 16 defined)

| Family | Used for | Kind hints |
|--------|----------|------------|
| **Historic** | Landmark-tier historic buildings — Gästgivaregården, Herrgården, Länsmansgården, station | explicit-name rules |
| **Religious** | Church + parish structures | `building=church` or amenity=place_of_worship |
| **Villa** | Detached single-family houses | `building=house`, `building=detached`, area 22-140 m² fallback for `building=yes` |
| **Apartment** | Multi-family residential blocks | `building=residential`, `building=apartments` |
| **School** | Primary + secondary school buildings | `building=school`, amenity=school/kindergarten |
| **University** | Higher-ed (Kärnhuset, Måltidens Hus) | explicit-name + `building=university` |
| **Commercial** | Hotels, canopies, service structures | `building=hotel`, `building=commercial`, `building=roof`, INGO |
| **Restaurant** | Sit-down / pizza / cafe | amenity=restaurant/cafe/pub, Pizzans Hus |
| **Retail** | Grocery / convenience / shops | Tempo, Direkten explicit; Bergslagshus AB |
| **Industrial** | Factory + production halls | `building=industrial`, Swedecote |
| **Warehouse** | Large-footprint storage | area > 800 m² fallback for `building=yes` |
| **Garage** | Small vehicle shelters | area 22-55 m² fallback for `building=yes` |
| **Outbuilding** | Sheds, small annexes | area < 22 m² or 55-140 m² fallback |
| **Farm** | (defined, not yet used) | future |
| **Municipal** | Public admin (station currently mapped here) | `building=train_station` |
| **Unknown** | Fallback — flagged by V15 | (should be empty) |

## Classification priority

1. **Explicit-name rules** — a small set of landmark-tier buildings by exact `name` (Kärnhuset, Måltidens hus, Gästgivaregården, Herrgården, Ingo, Tempo, Pizzans Hus, Swedecote, Länsmansgården, station). Confidence: `high`.
2. **amenity / shop / tourism hints** — Confidence: `medium`.
3. **OSM `building=*` kind mapping** — see `KIND_TO_FAMILY` in the engine. Confidence: `medium` (`low` for `building=yes`).
4. **Area-based reclassification for `building=yes`** — 156 buildings in the current dataset. Confidence: `low`.
5. **Fallback `Unknown`** — must remain empty (V15 enforces).

## Confidence field

- `high` — explicit-name or verified reference package.
- `medium` — OSM tag drives the classification.
- `low` — area heuristic on `building=yes`.

## Handcraft field

- `D1` — landmark handcrafted via `CraftedLandmarks.tsx`.
- `D2` — handcrafted via `CraftedLandmarksD2.tsx`.
- `D1-shared` — Torget long house (shared container).
- `null` — procedural via `OsmBuildings.tsx`.

## Statistics (2026-07-25 snapshot)

- Total buildings: 274
- Distinct families in use: 13 (Villa 88 / Outbuilding 60 / Warehouse 24 / Apartment 33 / …).
- Handcraft split: D1 6 + D1-shared 1 + D2 15 + procedural 252.
- Confidence: high 11, medium ≈ 60, low ≈ 203.

Full breakdown in `reports/metadata/buildings.json`.

## Adding a new family

1. Extend `KIND_TO_FAMILY` in `classifyBuilding` OR add an explicit-name rule.
2. Regenerate: `node scripts/metadata-engine.mjs`.
3. V15 confirms nothing dropped to `Unknown`.
4. If the family requires distinct rendering, extend `OsmBuildings.tsx::KIND_COLOUR` and roof/plinth kinds (V12 will alert if you don't).
