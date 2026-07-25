# District Metadata Reference

**Source of truth:** `reports/metadata/districts.json` (regenerate with `node scripts/metadata-engine.mjs`).
**Related:** `DISTRICT_PRODUCTION_TRACKER.md`, `PHASE_IV_PRODUCTION_PLAN.md`.

## What each district record carries

Every district (15 total) has a record with the shape:

```jsonc
{
  "id":                    "D03-torget",
  "label":                 "Torget",
  "anchor":                [12.49, -27.59],
  "radius":                100,
  "buildings_total":       14,
  "buildings_handcrafted": 3,
  "buildings_procedural":  11,
  "landmarks":             2,
  "landmark_ids":          ["gry-glass", "gry-torget"],
  "named_streets":         12,
  "family_mix":            { "Villa": 8, "Historic": 2, "Retail": 1, ... },
  "facade_completeness":   {
    "total":               14,
    "with_measured_height": 0,
    "with_osm_levels":     0,
    "typology_guess":      14
  },
  "confidence":            "high" | "medium" | "low",
  "review_readiness":      "ready" | "blocked",
  "freeze_readiness":      "not-started"
}
```

## Fields explained

- **anchor / radius** — district centre + nominal reach. Used by `district-assign.mjs` for nearest-anchor classification.
- **buildings_total** — buildings whose centroid falls in this district.
- **buildings_handcrafted / procedural** — see `LANDMARK_PROGRAM.md` for tier definitions.
- **landmarks / landmark_ids** — landmark records with positions inside the district.
- **named_streets** — streets crossing this district (a street can appear in multiple districts).
- **family_mix** — building-family histogram; see `BUILDING_CLASSIFICATION_REFERENCE.md`.
- **facade_completeness** — how many buildings have measured height / OSM levels / need typology fallback; drives the facade fidelity budget.
- **confidence** — heuristic: high = ≥1 landmark AND handcrafted share > 30 %; medium = ≥1 landmark; low = no landmarks.
- **review_readiness** — 'ready' unless low-confidence.
- **freeze_readiness** — manually advanced per `DISTRICT_FREEZE_GUIDE.md`.

## Regeneration

```
node scripts/district-assign.mjs
node scripts/metadata-engine.mjs
```

Both are deterministic — running with an unchanged `world.json` produces bit-identical output.

## Snapshot (2026-07-25)

15 districts, 655 entities assigned, 0 unclassified. Full data in `reports/metadata/districts.json`. Per-district READMEs in `documentation/districts/<id>/README.md`.
