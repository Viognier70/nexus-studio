# Adaptive Building Reference

**Source of truth:** the `permanent` / `adaptive` split inside every Place record in `reports/semantic/places.json`.
**Canonical principle:** `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.

Every building in Nexus is a **shell** (permanent) hosting a **function** (adaptive). This document formalises the split so future gameplay systems can mutate only the adaptive side without ever touching the geometry.

## The permanent block

Never modified by gameplay:

| Field | What it is |
|-------|-----------|
| `footprint_area_m2` | OSM polygon area |
| `bbox_size` | oriented bounding box (width, depth) in metres |
| `centroid` | polygon centroid in world coordinates |
| `structure` | `handcrafted` or `procedural` |
| `roof_family` | gable / hip / flat / shed / barn / steep-gable |
| `facade_family` | Villa / Apartment / Historic / … (see `BUILDING_CLASSIFICATION_REFERENCE`) |
| `historic_identity` | landmark tier only — historic-anchor name that never changes |

Editing any of these = editing the SPATIAL layer, which requires a fresh Vision Owner review and re-run of the parity + validate-world validators. It's a "reopen an approved district" event.

## The adaptive block

Fully mutable by gameplay:

| Field | What it is |
|-------|-----------|
| `owner` | current owning entity (institution / player / NPC) |
| `business` | current tenant / business name |
| `employees` | list of NPC ids assigned to this Place |
| `opening_hours` | time-of-day availability |
| `activities` | active gameplay activities |
| `knowledge_production` | which knowledge domains this Place currently produces |
| `economic_role` | `active` / `dormant` / `investing` |
| `social_role` | `active` / `dormant` / `hosting-event` |

Mutating these fields is expected — every gameplay event that "changes what a building does" writes here, never to `permanent`.

## Transformation library

Every Place carries a `transformation.possible_transformations` array — a menu of what its shell can become, drawn from `TRANSFORM_LIBRARY[family]` in `place-engine.mjs`.

Example — a Villa Place's menu:
- bakery / café / boutique hotel / artist studio / cooking school / community kitchen / micro brewery / design studio / writer residence

Every transformation has `constraints` (typically "preserve footprint, preserve roof family") and `triggers` (typically "gameplay ownership change, quest reward, seasonal event, player business decision").

## Contract for gameplay code (future)

A gameplay system that adapts a building MUST:

1. Read the `permanent` block to understand what shell it's working with.
2. Verify the intended transformation is in `possible_transformations`.
3. Verify the constraints are satisfied.
4. Update `adaptive.*` fields only.
5. Never write to `permanent.*`.

The parity validator would fail if a future gameplay code path attempted a permanent-block write — a candidate future validator (V22 candidate) would enforce this.

## Regeneration

```
node scripts/place-engine.mjs
```

Deterministic — regenerating on an unchanged world produces bit-identical `permanent` blocks. Adaptive-block state, once gameplay lands, would live outside this file (session state).
