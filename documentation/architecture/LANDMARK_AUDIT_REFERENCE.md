# Landmark Audit Reference

**Source of truth:** `reports/metadata/landmarks.json` (regenerate with `node scripts/metadata-engine.mjs`).
**Related:** `LANDMARK_PROGRAM.md` (canonical inventory + tier definitions).

Per-landmark audit produced by `scripts/metadata-engine.mjs`. Every landmark carries:

```jsonc
{
  "id":                    "gry-torget",
  "display":               "Torget",
  "kind":                  "municipal",
  "verification":          "verified" | "approximate" | "placeholder",
  "osm": { "type": "way" | "node", "id": 122157681, "resolvedFrom": "osm" | null },
  "building_ref":          "w122157681" | null,
  "building_exists":       true | false,
  "building_name":         "Torget" | null,
  "district":              "D03-torget",
  "handcrafted_component": true | false,
  "clickable":             true,
  "reference_package":     null,   // populated as reference packages land
  "tier":                  "landmark" | "recognition" | "approximate"
}
```

## Tier assignment (mirrors LANDMARK_PROGRAM.md §2)

- **landmark** — handcrafted geometry, ≥ 0.90 confidence, verified reference package. 9 landmarks today.
- **recognition** — verified position, procedural geometry. 8 landmarks today (Ingo, Tempo, Direkten, Kantin, Bergslagshus, tenant markers).
- **approximate** — position estimated from Vision Owner screenshots. 0 landmarks today.

## OSM resolution

- `resolvedFrom: 'osm'` — the fetcher confirmed the OSM way/node exists upstream on the last refetch.
- `resolvedFrom: null` — landmark was seeded from `--previous`; OSM lookup did not run or did not resolve.

`building_exists: false` combined with `resolvedFrom: 'osm'` is legitimate for plaza / sports / campus polygons — the OSM way exists but is not a building. V13a acknowledges these; V13 fires only when both are false.

## Snapshot (2026-07-25)

- 18 landmark records total
- by tier: landmark 9, recognition 8, approximate 0, unclassified 1
- by verification: verified 18
- by district: D02 Campus 2, D03 Torget 2, D04 Church 1, D05 Station 1, D06 School 2, D08 Hälleforsvägen 3, D10 Residential North 1, D12 Residential East 1, D13 Residential West 1, D15 Forest Edge 3

Full data in `reports/metadata/landmarks.json`.

## Adding a reference package

1. Create `documentation/references/<district>/<landmark-slug>/` with images + `manifest.json`.
2. Populate `reference_package` field in the landmark audit's future manual layer (currently unmanaged — a future validator will link the paths).
3. Update `LANDMARK_PROGRAM.md` inventory table.
