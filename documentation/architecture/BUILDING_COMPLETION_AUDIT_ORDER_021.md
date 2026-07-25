# Building Completion Audit — ORDER 021

**Status:** Baseline audit  
**Class:** Building inventory  
**Session:** ORDER 021 (auto-mode, 2026-07-25)  
**Frozen:** World Alignment v1.0 (ORDER 020) — no coordinate-system changes in this ORDER.

---

## 1 · Inventory summary

| Category | Count |
|----------|-------|
| Raw OSM buildings in `grythyttan-world.json` | **274** |
| Runtime `WORLD.buildings` after multi-wing split | **276** (2 subparts from Kärnhuset + industrial `w870510834`) |
| Landmark records total | **18** |
| — with `osmType === 'way'` | 11 |
| — with `osmType === 'node'` | 7 |
| `LANDMARK_BUILDING_IDS` (skip list for OsmBuildings) | **27** |
| Buildings rendered by OsmBuildings (post-split, minus skip, minus church) | **252** |
| Buildings handcrafted by CraftedLandmarks (D1) | **9 components** covering 7 OSM ways + 1 shared container + 1 IP overlay |
| Buildings handcrafted by CraftedLandmarksD2 | **15 components** — main body Kärnhuset + 5 station corridor + 9 school complex |

## 2 · Buildings by OSM `building=*` kind

```
yes           156     university      2
residential    26     detached        2
house          55     apartments      4
industrial     16     hotel           1
school          9     roof            1
train_station   1     church          1
```

## 3 · Handcrafted / procedural cross-check

**D2 skip list vs D2 handcrafted refs:** 15 vs 15 — perfect parity.  
**D1 handcrafted landmark set vs `HANDCRAFTED_LANDMARK_IDS` derived by inspection:** `gry-kyrka`, `gry-campus`, `gry-gastgivaregard`, `gry-pizzanshus`, `gry-herrgard`, `gry-jarnvag`, `gry-skola`, `gry-torget`, `gry-ip` — 9 handcrafted.

**Named OSM buildings NOT in the landmark index** (visible with a name but no landmark record → no click disc / label):
| ID | Name | Kind | Note |
|----|------|------|------|
| `w193810921` | Kärnhuset | university | Consolidated under `gry-campus` landmark; handcrafted by CraftedLandmarksD2 |
| `w1239628613` | Swedecote | industrial | Visible in centre-view screenshot (SE); renders procedurally |
| `w1422743880` | Länsmansgården | yes | Adjacent to Herrgården; renders procedurally |

## 4 · **CRITICAL DEFECT** — silent invisible buildings from ORDER 019R

The ORDER 019R `LANDMARK_BUILDING_IDS` composition:

```typescript
export const LANDMARK_BUILDING_IDS: Set<string> = new Set([
  ...WORLD.landmarks
    .filter((l) => l.source.osmType === 'way' && l.source.osmId != null)
    .map((l) => `w${l.source.osmId}`),   // ← every way-landmark hidden from OsmBuildings
  ...SHARED_CONTAINER_BUILDING_IDS,
  ...D2_HANDCRAFTED_BUILDING_IDS
]);
```

was written on the assumption that every landmark with an OSM way is handcrafted. That assumption was true when the code was written but I broke it in ORDER 019R commit `8937921` by adding `gry-ingo` (way `w614554207`) and `gry-tempo` (way `w1250001245`) as landmark records without adding handcrafted components.

Result: INGO and Tempo have been **silently invisible** ever since — the skip list hides them from OsmBuildings, but no handcrafted component renders them. Two of the most easily-recognisable village landmarks (a petrol station and the grocery store) have been absent from the render.

**Verified via inventory script:** 2/2 landmark-way records with no handcrafted component correspond to real buildings in `WORLD.buildings`.

Torget (`w122157681`) and Grythyttans IP (`w869907952`) are ALSO way-landmarks without dedicated wall components, but both are non-building OSM ways (plaza polygon, sports polygon) — neither is in `WORLD.buildings`, so the skip list has no effect.

## 5 · Missing OSM buildings

Fresh Overpass fetch (ORDER 019R) matches our world data vertex-for-vertex: **0 missing OSM buildings**. Every building tagged with `building=*` in the Grythyttan bbox is present in the ingest.

## 6 · Polygon completeness

**Multi-wing polygons** — `splitAtBridgeEdges` handled:
- Kärnhuset (`w193810921`) — main body (kept as `w193810921`) + wing (`w193810921#p1`, 193 m², renders procedurally)
- Industrial (`w870510834`) — main + wing (`w870510834#p1`, renders procedurally)

Both subparts inherit their parent's `kind` — Kärnhuset wing renders as a `university` procedural (9 m tall, pale plaster). Verified acceptable via the existing render.

Degenerate polygons (`< 4 vertices` or `area < 1 m²`): **0**.

## 7 · Recommended actions (in this ORDER)

1. **B1 · Fix invisible INGO + Tempo** — change `LANDMARK_BUILDING_IDS` to skip only landmarks that HAVE handcrafted components, not every way-landmark. Introduce an explicit `HANDCRAFTED_LANDMARK_IDS` set that both the skip-list and any future handcrafted-composition dispatch can share.
2. **B2 · Named but unlanded buildings** — Swedecote and Länsmansgården render procedurally today. Adding them as `landmark` records (without handcrafted components) is safe once the B1 fix is in place — the procedural render continues, plus they gain click discs and labels.
3. **B3 · Split-subpart kind inheritance** — Kärnhuset `#p1` renders as `university` which may look institutional-plaster where a smaller ancillary is more appropriate. Consider a heuristic: if area < 250 m² and split parent is university/school/hotel, reclassify subpart as `outbuilding`.
4. **B5 · New validator: HANDCRAFTED_LANDMARK_IDS parity** — a Node validator that fails if a way-landmark is in the skip list but has no handcrafted component (i.e., what happened here should have been caught automatically).

## 8 · Zones ready for expansion (deferred — pending B1 fix)

Per ORDER 021 zone list; every zone is spatially complete at the polygon level. Handcrafted density varies:
- Historic centre / Torget — 5 handcrafted (kyrka, gästgivaregård, torget, longhus, glass marker) + procedural residentials
- Campus / Måltidens / Kärnhuset — 2 handcrafted (campus, karnhuset) + procedural + kantin marker
- Pizzans/Ingo eastern approach — 1 handcrafted (pizzans) + INGO ***currently invisible***
- School district — 9 D2 handcrafted school buildings
- Station corridor — 6 D2 handcrafted (station + 5 warehouses)
- Northern/western/southern residential grids — fully procedural
- Torget grocery axis — Tempo ***currently invisible***

---

*Author: Claude Code, ORDER 021 auto-mode. Written to precede the B1 recovery commit.*
