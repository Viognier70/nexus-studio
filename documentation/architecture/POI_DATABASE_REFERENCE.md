# POI Database Reference

**Source of truth:** `reports/metadata/pois.json` (regenerate with `node scripts/metadata-engine.mjs`).
**POI table:** `POI_CATEGORY` inside `scripts/metadata-engine.mjs`.

Every landmark is exposed as a POI with `category` and `importance`. Categories align with ORDER 025 §Phase F.

## Categories in use (9 of 14 spec categories)

| Category | Count today | Examples |
|----------|-------------|----------|
| **Food** | 4 | Guldkringlan, Cornelis, Pizzans Hus, Kantin Hyttblecket |
| **Retail** | 4 | Tempo, Direkten, Bergslagshus AB, Antikvariat, Glass&Choklad |
| **Education** | 2 | Campus Grythyttan, Grythyttans skola |
| **Accommodation** | 2 | Gästgivaregården, Herrgården |
| **Religion** | 1 | Grythyttans Kyrka |
| **Historic** | 1 | Gamla Järnvägsstation |
| **Sports** | 1 | Grythyttans IP |
| **Culture** | 1 | Torget |
| **Transport** | 1 | INGO (fuel/transport hub) |

## Categories defined but not populated

Healthcare, Industry, Tourism, Government, Unknown. All are legitimate future targets — Tourism might absorb Herrgården + Gästgivaregården dual-tagging, Industry could annotate Swedecote once it becomes a landmark record.

## Importance levels

- **high** — dominant orientation POI. Every district should have ≥ 1 high-importance POI or a landmark-tier building. 10 landmarks today.
- **medium** — locally-recognisable, secondary orientation. 6 landmarks today.
- **low** — background scenery. 2 today.

## Adding a new POI

1. Add landmark record to `grythyttan-world.json` via `--previous` refetch OR direct edit.
2. Add row to `POI_CATEGORY` in `scripts/metadata-engine.mjs`.
3. Regenerate: `node scripts/metadata-engine.mjs`.
4. V16 confirms no POI has `category: 'Unknown'`.

## Snapshot

18 POIs / 9 categories / 3 importance levels / spread across 10 districts (5 districts have 0 POIs — D07 Industrial, D09 Prästgatan, D11 Residential South, D14 Lakeshore, D15 Forest Edge).

Full data in `reports/metadata/pois.json`.
