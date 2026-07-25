# World Semantics Reference

**Status:** Canonical index of the semantic layer.
**Source of truth:** `reports/semantic/*.json` — regenerate with the four scripts documented below.

The semantic layer sits on top of the spatial layer that ORDERs 019–022 stabilised. Nothing here changes the render; everything here prepares gameplay + AI + economy + education + innovation systems.

## The four canonical data sources

| File | Generator | What it holds |
|------|-----------|----------------|
| `reports/semantic/places.json` | `scripts/place-engine.mjs` | 90 Places × permanent + adaptive + classification + institution + knowledge_domains + transformation + event_capabilities + npc_hints + gameplay_surface |
| `reports/semantic/districts-identity.json` | `scripts/district-identity.mjs` | 15 districts × primary/secondary identity + knowledge/architectural/landscape/gameplay/cultural/economic/educational/historic profiles |
| `reports/semantic/place-graph.json` | `scripts/place-graph.mjs` | 286 nodes / 1139 edges — Place ↔ District / Institution / Knowledge Domain / Landmark / Street / Event / Transformation / NPC-profession |
| `reports/metadata/*.json` | `scripts/metadata-engine.mjs` | Upstream metadata — 274 buildings × families, 46 named streets × intelligence, 18 landmarks × audit, 18 POIs × categories |

## Regeneration order

```
node scripts/district-assign.mjs      # 655/655 world entities → 15 districts
node scripts/metadata-engine.mjs      # 6 upstream metadata files
node scripts/knowledge-graph.mjs      # older graph — still consumed
node scripts/place-engine.mjs         # 90 Places
node scripts/district-identity.mjs    # 15 district identities
node scripts/place-graph.mjs          # semantic super-graph
```

Every step is deterministic — regenerating on an unchanged `world.json` produces bit-identical outputs.

## The layer stack

```
                                    +-----------------------------+
                                    |  future gameplay / AI /     |
                                    |  economy / NPCs / quests    |
                                    +-------------┬---------------+
                                                  |
                                                  ▼
+----------------------------------------------------------------+
|  SEMANTIC LAYER (this ORDER)                                   |
|  places.json ← districts-identity.json ← place-graph.json      |
|  Living World Model — mutable adaptive block, fixed permanent  |
+----------------------------------------------------------------+
                                                  ▲
                                                  |
+----------------------------------------------------------------+
|  METADATA LAYER (ORDER 025)                                    |
|  buildings.json  facades.json  landmarks.json                  |
|  pois.json  streets.json  districts.json  knowledge-graph.json |
+----------------------------------------------------------------+
                                                  ▲
                                                  |
+----------------------------------------------------------------+
|  SPATIAL LAYER (ORDERs 019–022)                                |
|  grythyttan-world.json + shadow-map.svg — canonical, frozen    |
+----------------------------------------------------------------+
                                                  ▲
                                                  |
+----------------------------------------------------------------+
|  RENDERER (ORDER 020 alignment + ORDER 021A facade fidelity)   |
|  Three.js scene at localhost:5173 — World Alignment v1.0       |
+----------------------------------------------------------------+
```

## Canonical rules

- **Never modify the SPATIAL layer** for semantic reasons. Add a document override, extend an engine, log a candidate defect — do not move a footprint to make a Place work.
- **Never write to `permanent` from gameplay** — see `ADAPTIVE_BUILDING_REFERENCE.md`.
- **Every regenerator is deterministic.** If output changes on unchanged input, it's a bug.
- **Every layer above depends on layers below.** Break the metadata engine → the semantic layer breaks → gameplay breaks. Validators V15–V20 guard the vertical.

## Related reference docs

- `PLACE_MODEL_REFERENCE.md` — Place record shape.
- `INSTITUTION_REFERENCE.md` — semantic actors.
- `KNOWLEDGE_DOMAIN_REFERENCE.md` — conceptual axes.
- `DISTRICT_IDENTITY_REFERENCE.md` — per-district signature.
- `ADAPTIVE_BUILDING_REFERENCE.md` — permanent / adaptive split contract.
- `TRANSFORMATION_MODEL_REFERENCE.md` — Places-can-become menu.
- `EVENT_FRAMEWORK_REFERENCE.md` — event capability surface.
- `GAMEPLAY_ANNOTATION_REFERENCE.md` (ORDER 025) — annotation-only hotspot flags.
- `POI_DATABASE_REFERENCE.md` (ORDER 025) — categorised landmarks.
- `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` — canonical statement that governs it all.

## Statistics at ORDER 027 close

- **Spatial:** 274 buildings, 327 roads, 18 landmarks, 6 water, 15 forest, 12 residential, 2 grass, 1 graveyard.
- **Metadata:** 13 building families, 9 POI categories, 46 named streets, 138 knowledge-graph nodes, 157 edges.
- **Semantic:** 90 Places, 7 classes, 11 institutions, 11 knowledge domains, 59 transformation options, 23 event capabilities, 17 NPC professions.
- **Super-graph:** 286 nodes, 1139 edges — the full Living World Model relation surface.
- **Validators:** 20 checks, all Info clean.
