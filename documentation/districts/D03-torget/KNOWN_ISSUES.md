# Known issues — D03 Torget

_Candidate defects surfaced by Claude Code pre-review sweep (ORDER 026). Reclassified against `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md` — HIGH priority = fail approval; MEDIUM = log & ship if only Medium; LOW = waiver-eligible tenant / branding concerns that must not block freeze._

## HIGH priority (footprint / placement / roads / vegetation)

| ID | Layer | View | Description |
|----|-------|------|-------------|
| D03-V-08 | Vegetation | Overview | Verify no forest / meadow vegetation lands on Torget plaza. V8 + V1 assert this at data level; visual confirmation still required. |
| D03-V-09 | Vehicles | Overview | Verify no vehicles drive across Torget plaza (Torget is `residential` road tier; plaza polygon should exclude vehicles). |
| D03-V-06 | Roads | Any | Named streets in D03 — Kyrkogatan, Torget, Lokavägen, Västra Bergvägen — each renders with its expected role tier. Broken tier assignment = HIGH. |
| D03-V-02 | Landmark shell | Kvarteret over Torget | Torget plaza (w122157681) reads as a paved plane. Missing plaza = HIGH (footprint absent). |

## MEDIUM priority (facade character / shell recognition)

| ID | Layer | View | Description |
|----|-------|------|-------------|
| D03-V-01 | Handcrafted shell | Business over Torget | Gästgivaregården shell — 8 m walls, steep gable, 2 chimneys, 3 dormers — recognisable as the historic hospitality shell. Whether the "1641" sign board is legible is LOW; the shell shape is MEDIUM. |
| D03-V-03 | Handcrafted shell | Business W of Torget | Torget long house (w869907962) — 3-storey Falu-red timber massing recognisable. Whether specific tenants (Kringlan/Cornelis/Antik) match current shops is LOW; the long-house shell shape is MEDIUM. |
| D03-V-04 | Procedural facades | Business — adjacent procedural | 3 apartment blocks (w1239584171/172/173, ~200 m² each). ORDER 021A window rows / doors / roof overhang. |
| D03-V-05 | Procedural facades | Overview | 2 large procedural villas (w869907977 340 m², w193810935 152 m²). ORDER 021A defaults determine their read. |

## LOW priority (current tenant / branding — waiver-eligible)

| ID | Layer | View | Description |
|----|-------|------|-------------|
| D03-V-07 | Tenant marker | Business over Glass & Choklad | `gry-glass` marker at (−50.3, −64.9) sits on OSM building w869907970. Whether "Glass & Choklad" specifically is the current tenant is LOW — that shell could equally host a future confectioner, café, or design studio (see `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`). |
| D03-C-01 | Tenant / container topology | (data) | `gry-kringlan` node landmark landed in D03 by position; its container `w869907962` is in D01. Tenant-in-container district split is a subtle inconsistency; documenting only. |
| D03-C-02 | Tenant / container topology | (data) | Same for `gry-cornelis` and `gry-antik`. Ruleset for tenant → district under review, non-blocking. |
| D03-C-03 | Metadata | (data) | All 15 D03 buildings fall through to `typology-guess` height (no OSM `building:levels` or `height`). Not a defect — expected for present-day Grythyttan OSM population; drives MEDIUM-priority facade fidelity per ORDER 021A. |

