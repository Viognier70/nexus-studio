# Gameplay Annotation Reference

**Source of truth:** `reports/metadata/knowledge-graph.json` (regenerate with `node scripts/knowledge-graph.mjs`).
**Constraint:** annotations only — no gameplay logic implied or implemented.

Every landmark carries a set of gameplay-hotspot flags. The purpose is preparation, not implementation. When a future ORDER adds NPC / quest / interaction systems, the queries against this annotation surface will be the primary spatial index.

## Hotspot vocabulary

| Flag | Meaning |
|------|---------|
| `conversation` | Everyday casual social contact — Torget etc. |
| `public-gathering` | Formal or seasonal assembly point — Torget, IP, Kyrkan |
| `social` | Restaurants, cafés, community |
| `commercial` | Retail / service transactions |
| `retail` | Specifically shopping |
| `food` | Food service specifically |
| `historical` | Site of documented historic significance |
| `religious` | Church / parish site |
| `educational` | Formal learning institution |
| `teaching` | Front-of-house classroom / campus |
| `research` | Higher-ed research setting |
| `institution` | Formal institutional presence |
| `tourism` | Visitor-magnet |
| `accommodation` | Overnight stay |
| `transport` | Fuel / rail / bus |
| `sports` | Physical activity venue |

## Derived scores (per landmark)

- **`quest_potential`** — high if the landmark has `historical`; medium if `educational`; low otherwise.
- **`investigation_potential`** — high if `historical`; medium if `institution`; low otherwise.
- **`npc_density_hint`** — high if `public-gathering`; medium if `institution` or `commercial`; low otherwise.

These are heuristic hints — a future gameplay system may re-derive.

## Current annotation table

```jsonc
[
  { "id": "gry-torget",           "hotspots": ["conversation","public-gathering","social","tourism"],  "quest_potential": "low",    "npc_density_hint": "high" },
  { "id": "gry-kyrka",            "hotspots": ["historical","religious","social","tourism"],           "quest_potential": "high",   "npc_density_hint": "low" },
  { "id": "gry-campus",           "hotspots": ["educational","teaching","research","institution"],    "quest_potential": "medium", "npc_density_hint": "medium" },
  { "id": "gry-skola",            "hotspots": ["educational","teaching","institution"],                "quest_potential": "medium", "npc_density_hint": "medium" },
  { "id": "gry-jarnvag",          "hotspots": ["historical","transport","tourism"],                    "quest_potential": "high",   "npc_density_hint": "low" },
  { "id": "gry-gastgivaregard",   "hotspots": ["historical","commercial","tourism","social","accommodation"], "quest_potential": "high", "npc_density_hint": "medium" },
  ...
]
```

Full array in `reports/metadata/knowledge-graph.json` `annotations` field.

## Hotspot category totals

Regenerate to see. Snapshot:
- commercial 7, tourism 6, historical 5, food 5, social 5, retail 4, public-gathering 2, educational 2, institution 3, teaching 2, religious 1, research 1, transport 2, accommodation 2, sports 1.

## Adding / editing an annotation

1. Edit the `HOTSPOTS` table in `scripts/knowledge-graph.mjs`.
2. Regenerate: `node scripts/knowledge-graph.mjs`.
3. Values propagate to `reports/metadata/knowledge-graph.json.annotations`.

No validator gate today — annotations are informational.
