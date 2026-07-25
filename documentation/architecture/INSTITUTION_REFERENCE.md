# Institution Reference

**Source of truth:** `INSTITUTION_MAP` in `scripts/place-engine.mjs` + `reports/semantic/places.json[i].institution`.

Institutions are the **semantic actors** of Grythyttan — bodies that play a defined role in the village even when their premises change hands. A shell can have many owners over time, but the institution has continuity.

## Institutions currently defined (11)

| ID | Name | Kind | Purpose | District |
|----|------|------|---------|----------|
| `gry-kyrka` | Grythyttans församling | Religious | Parish worship + community rites of passage | D04 Church |
| `gry-campus` | Örebro universitet — RHS Campus Grythyttan | University | RHS gastronomy + hospitality teaching + research | D02 Campus |
| `gry-skola` | Grythyttans skola F-6 | School | Primary education for the village | D06 School |
| `gry-jarnvag` | Grythyttans Gamla Järnvägsstation | Historic | Retired BJ freight-yard station; historic transport identity | D05 Station |
| `gry-gastgivaregard` | Grythyttans Gästgivaregård | Historic + Hospitality | Historic hospitality institution (1641) | D03 Torget |
| `gry-herrgard` | Herrgården Grythyttan | Hospitality | Manor-house hospitality; hosting + retreat centre potential | D12 Residential East |
| `gry-torget` | Torget | Public Space | Central plaza + traditional gathering site | D03 Torget |
| `gry-ip` | Grythyttans IP | Recreational | Sports ground + community events | D06 School |
| `gry-ingo` | INGO Grythyttan | Transport | Village fuel + service point | D08 Hälleforsvägen |
| `gry-tempo` | Tempo Grythyttan | Commercial | Village grocery | D13 Residential West |
| `gry-bergslagshus` | Bergslagshus AB | Commercial | Regional building materials retailer | D10 Residential North |

## Institution ≠ Business

- **Institution** — the body that owns / represents / operates. Continuity through name changes.
- **Business** — the shop / restaurant / service that currently occupies the shell. Fluid.

E.g. Torget long house `w869907962` today hosts Guldkringlan, Cornelis, Antikvariat. Those are BUSINESSES. The Torget long house shell is a PLACE, and if it were to acquire an institutional identity ("Föreningen Torgets Handel") that would be a separate INSTITUTION record.

## Adding an institution

1. Add row to `INSTITUTION_MAP` in `scripts/place-engine.mjs`.
2. Regenerate: `node scripts/place-engine.mjs`.
3. Every Place that resolves to this institution picks up its `kind` + `purpose` in the semantic graph.

## Relation to gameplay

Institutions are the **first tier of gameplay actors** — they can commission quests, receive investment, host events, employ NPCs. Their SHELLS are canonical (fixed footprint); their ACTIVITIES are gameplay-fluid.
