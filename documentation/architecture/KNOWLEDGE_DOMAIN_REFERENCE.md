# Knowledge Domain Reference

**Source of truth:** `DOMAIN_BY_LANDMARK` + `DOMAIN_BY_FAMILY` in `scripts/place-engine.mjs` + `reports/semantic/places.json[i].knowledge_domains`.

Knowledge Domains are the **conceptual axes** the Living World organises understanding around. Every Place carries one or more; every institution + every gameplay quest lattice touches at least one.

## Domains currently in use (11 of 15+ defined)

| Domain | Places | Anchors |
|--------|--------|---------|
| Community | 54 | Every Villa / Apartment / Torget |
| Craftsmanship | 20 | Outbuildings, Garages, Bergslagshus AB |
| Business | 18 | Every Commercial / Retail Place |
| Engineering | 17 | Industrial Places, Warehouses |
| Gastronomy | 6 | Campus, Gästgivaregården, Pizzans, Kringlan, Cornelis, Glass, Kantin, Tempo |
| Hospitality | 4 | Campus, Gästgivaregården, Herrgården |
| Education | 4 | Skola, Campus, School district Places |
| History | 4 | Kyrka, Gästgivaregården, Herrgården, Station, Torget |
| Culture | 3 | Kyrka, Torget, Antikvariat |
| Research | 2 | Campus (RHS food + sensory labs) |
| Transport | 1 | INGO |

## Domains defined but not yet populated

`Innovation`, `Forestry`, `Ecology`, `Design`, `Tourism`, `Health` — legitimate future domains, particularly as gameplay adds tenant surfaces (a Villa Place converted to a design studio picks up `Design`; a Farm Place picks up `Forestry` + `Ecology`).

## Assignment rules

Every Place receives the UNION of:
1. `DOMAIN_BY_LANDMARK[landmark_id]` — explicit per-landmark curation.
2. `DOMAIN_BY_FAMILY[building_family]` — family-level defaults.

Deduplication produces the final `knowledge_domains` array.

## Adding a domain

1. Extend `DOMAIN_BY_FAMILY` (broad) or `DOMAIN_BY_LANDMARK` (per-landmark specific).
2. Regenerate `place-engine.mjs`.
3. Optional: add corresponding gameplay-hint mapping in the future NPC / quest / event surfaces.

## Relation to gameplay

Domains are the **grouping keys** for future gameplay systems:
- **NPC intelligence:** an NPC's interests + expertise map to domains.
- **Quest generation:** quests are typed by their primary domain.
- **Learning progression:** the player's education level per domain becomes a resource.
- **Institution roles:** an institution's `kind` implies preferred domains.

Domains never change spatially. They are the CONCEPTUAL LAYER above the physical world.
