# Place Model Reference

**Source of truth:** `reports/semantic/places.json` (regenerate with `node scripts/place-engine.mjs`).
**Canonical principle:** `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.

The Nexus world stops thinking in "buildings" and starts thinking in **Places**. A Building is an OSM footprint on disk; a Place is what that footprint represents inside the Living World.

## Record shape

```jsonc
{
  "id":               "place-w869907964",
  "building_id":      "w869907964",
  "display":          "Grythyttans Gästgivaregård",
  "district":         "D03-torget",

  "permanent": {                                     // spatial / canonical
    "footprint_area_m2": 566.1,
    "bbox_size":         [43.5, 24.7],
    "centroid":          [61.6, 37.8],
    "structure":         "handcrafted",
    "roof_family":       "gable",
    "facade_family":     "Historic",
    "historic_identity": "Grythyttans Gästgivaregård"
  },

  "adaptive": {                                      // fluid in gameplay
    "owner":                null,
    "business":             "Grythyttans Gästgivaregård",
    "employees":            [],
    "opening_hours":        null,
    "activities":           ["Historic hospitality institution (1641)"],
    "knowledge_production": [],
    "economic_role":        "active",
    "social_role":          "dormant"
  },

  "classification":       "Historic Landmark",
  "institution":          { "name": "…", "kind": "…", "purpose": "…" },
  "knowledge_domains":    ["Gastronomy", "Hospitality", "History"],
  "transformation": {
    "historic_state":            "preserved",
    "present_state":             "Grythyttans Gästgivaregård",
    "possible_transformations":  ["hospitality landmark", "…"],
    "constraints":               ["preserve handcrafted shell", "…"],
    "triggers":                  ["gameplay ownership change", "…"]
  },
  "event_capabilities":   ["Festival", "Cooking event", "…"],
  "npc_hints":            { "professions": ["host", "chef", "…"], "…": "…" },
  "gameplay_surface":     { "conversation": "high", "…": "…" }
}
```

## Which buildings become Places

A building becomes a Place if **any** of:
- it is a handcrafted landmark shell
- it has an OSM `name`
- it has `amenity` / `tourism` / `shop` / `historic` / `religion` tags
- its footprint ≥ 200 m²

Applied to the current world: **90 Places** across 15 districts.

## Permanent vs adaptive

Per `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`:

- **permanent** is the SPATIAL layer — footprint, roof, historic identity. Never mutated by gameplay.
- **adaptive** is the FUNCTIONAL layer — owner, business, hours, activities. Fully mutable by gameplay events.

A player can turn an ordinary Villa Place into a bakery / winery / cooking school by editing only the `adaptive` fields — the `permanent` fields never change.

## Class distribution (2026-07-25)

| Class | Count |
|-------|-------|
| Residential | 54 |
| Industrial | 17 |
| Educational Institution | 11 |
| Historic Landmark | 4 |
| Commercial Space | 2 |
| Hospitality | 1 |
| Religious | 1 |

Full distribution in `reports/semantic/places.json.summary.by_class`.

## Regeneration

```
node scripts/district-assign.mjs
node scripts/metadata-engine.mjs
node scripts/place-engine.mjs
```
