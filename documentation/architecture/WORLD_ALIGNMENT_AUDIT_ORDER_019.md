# World Alignment Audit — ORDER 019 Phase 1

**Status:** Living  
**Class:** Engineering audit + intervention plan  
**Session:** ORDER 019 (auto-mode, 2026-07-25)  
**Parent:** `ADR_001_DIGITAL_TWIN_PHASE.md`

---

## 1 · Objective

Make localhost visually read as the real Grythyttan without a resident needing Google Maps for reference. This document captures the Phase-1 audit and the systemic interventions selected for execution during this ORDER.

The audit was performed against `feature/strategic-camera` at commit `2283ff0` — post-ORDER 018 road-hierarchy rebuild and post-OSM refetch. The audit does not repeat findings that are already resolved by the recent road/ingest work.

## 2 · Method

- Full read of every `scene/Osm*.tsx` renderer and the shared `content/roadRoles.ts`, `content/world.ts`.
- Live probe of the Overpass API for the current Grythyttan bbox to distinguish "tag is absent upstream" from "we drop it during ingest".
- Enumeration of what the current `grythyttan-world.json` carries versus what the renderers consume.
- Composition read against `StrategicScene.tsx` to confirm no layer that is drawn is being masked by an ordering choice.

## 3 · Findings — signal that is captured but ignored

The recent OSM refetch (commit `2283ff0`) added `surface`, `width`, `maxspeed`, `lanes` to every road record. These are only partially wired through:

| Tag         | Records with data | Currently used | Loss vector |
|-------------|-------------------|----------------|-------------|
| `ref`       | 31 roads          | Yes (primary promotion) | — |
| `maxspeed`  | 104 roads         | **No**         | Traffic distribution is uniform across the pool; a 30 km/h residential lane carries the same probability of a car as an 80 km/h through-route. The player perceives cars as random noise, not as flow reinforcing hierarchy. |
| `surface`   | 211 roads (113 asphalt / 75 unpaved / 21 compacted / 1 fine_gravel / 1 sett) | **No** | Every road tier picks a fixed asphalt colour. A gravel farm track and the paved shoulder of Prästgatan render as the same surface. |
| `width`     | 48 roads          | **No**         | Rendered widths derive from the semantic role only. OSM says Hälleforsvägen is 8 m, we render it as 10 m; some named residentials that OSM tags as 3 m render as 4.6 m. |
| `lanes`     | 25 roads          | **No**         | — |

For buildings, an equivalent Overpass probe shows:

| Tag                  | Records with data | Currently ingested |
|----------------------|-------------------|--------------------|
| `roof:shape`         | 14 (5 gabled, 6 flat, 3 hipped) | **No** |
| `building:levels`    | 0 | n/a |
| `height`             | 0 | n/a |
| `roof:material`      | 0 | n/a |
| `building:material`  | 1 (concrete) | n/a |
| `historic`           | 1 | Yes |

Building-level height and material data is simply not present in the Grythyttan OSM dataset — so procedural inference on kind + area remains the only source. `roof:shape` on the 14 tagged buildings is a real signal we currently ignore.

## 4 · Findings — visual weaknesses that read as "wrong" from the strategic camera

Ranked by their effect on "does this feel like walking through Grythyttan?".

### 4.1 · Traffic reads as random noise, not hierarchy
Vehicles pick a road uniformly from a filtered pool. The primary through-road, the residential grid, and industrial spurs all compete for the same 24 vehicles. A resident's mental model — cars flow along Rv 244, are sparse on Prästgatan, absent on farm tracks — is contradicted by the render. This is the single largest missed reinforcement of the road hierarchy that OsmRoads.tsx already establishes.

### 4.2 · Every road looks like the same asphalt
The five surface classes above collapse to one colour per role tier. Gravel farm roads and paved village streets are visually indistinguishable. Grythyttan reads as "asphalt village in the woods" rather than "small paved centre bleeding into gravel yards and forest tracks."

### 4.3 · Landmark tower prominence is weak at village zoom
The church spire, Måltidens Hus, and Kärnhuset are correctly placed but do not visually pull the eye at village zoom (~900 m camera distance). A resident scanning the render should recognise the church tower silhouette immediately — currently it dissolves into the general roof line at strategic camera altitude. This is not the same as "make everything bigger"; it is a visual-weight problem specifically at the village view level.

### 4.4 · Sky and horizon reduce depth perception
Fog starts at 1000 m; the sky sphere and terrain outside the flat core have restrained tone. The horizon reads flat because there is no visual layering (near/mid/far) beyond fog attenuation. At village zoom this makes Grythyttan look like a diorama on a table.

### 4.5 · Intersection stacking is mechanical
Roads intersect by pure Z-offset stacking; at kvarteret zoom the tier boundaries read as flat overlays rather than negotiated junctions. Not urgent — it is a polish problem rather than a mental-map problem — but visible in close-up screenshots.

## 5 · Interventions selected for this ORDER

Ranked by leverage-per-block. The chosen ordering optimises for immediate visual gain at village zoom because that is the view where localhost is compared to reality.

### Block A — Amplify road hierarchy through traffic (highest leverage)
- Weight the traffic road pool by `maxspeed` so a 70 / 80 km/h road is several times more likely to be picked than a 30 / 40 km/h residential lane, and unspecified roads default down.
- Apply per-kind pool restrictions: trucks and buses do not spawn on roads with `maxspeed < 60`; motorcycles avoid tracks; delivery vans still bias toward restaurants but are gated by maxspeed for the through-legs.
- **Files:** `frontend/src/strategic/scene/OsmTraffic.tsx`.

### Block B — Road surface differentiation (highest visual density gain)
- Extend `RoadRoleSpec` with a per-surface colour override lookup. Asphalt keeps the current tier colour; `unpaved` / `compacted` roads pick up a warmer gravel tone; `fine_gravel` gets a pale scatter tone; `sett` (setts / cobbles) picks up a slightly darker cool grey.
- Keep the derivation deterministic per road, no per-way exceptions.
- **Files:** `frontend/src/strategic/content/roadRoles.ts`, `frontend/src/strategic/scene/OsmRoads.tsx`.

### Block C — OSM roof-shape override on procedural buildings
- Extend the ingest to capture `roof:shape` (also `roof:levels` and `building:levels`, so if the tag mix improves in a future refetch we already carry it).
- In `OsmBuildings.tsx`, `roofStyleFor()` prefers the OSM tag when present, falling back to the current kind-driven inference.
- **Files:** `scripts/fetch-grythyttan-osm.mjs`, `frontend/src/strategic/content/world.ts`, `frontend/src/strategic/scene/OsmBuildings.tsx`.

### Block D — Landmark visual weight at village zoom
- The crafted landmarks already have the correct geometry — the problem is silhouette pop against a lightly foggy horizon. Add a subtle procedural landmark aura (a soft, low-alpha vertical column of colour behind the highest crafted point) that fades in at village distance and out at district. Applied only to a whitelist of high-signal landmarks (church, Måltidens Hus, Kärnhuset, station).
- **Files:** `frontend/src/strategic/scene/CraftedLandmarks.tsx` or a new `LandmarkAuras.tsx`; hook into `useCamera` for distance.

### Block E — Horizon and atmospheric depth
- Introduce a mid-distance haze band inside the existing fog envelope: instances of soft dark forest silhouette rings 1200 – 2400 m out, keyed to the terrain colour. Reads as distant Bergslag forest at village zoom rather than the current featureless horizon.
- **Files:** `frontend/src/strategic/scene/Sky.tsx` (or a new `HorizonBand.tsx`), fog constants in `StrategicScene.tsx`.

### Block F — Documentation
- Update `APPROXIMATION_REGISTER.md` with each derived surface-colour, roof-style, maxspeed-density decision.
- Cross-reference this audit from `ADR_001_DIGITAL_TWIN_PHASE.md`.

## 6 · Deliberately deferred

- **Intersection blend meshes.** Real geometry union at road crossings would improve close-up polish but does not change village-zoom recognition. Deferred until after A–E are in.
- **Terrain heightfield banking of roads.** Adds cost and complexity for a mid-district gain. Deferred.
- **Machine-readable APPROXIMATION_REGISTER JSON.** Governance improvement, not visual. Deferred.
- **Building-level facade tag ingest.** Upstream OSM does not yet carry the data. Nothing to wire.

## 7 · Definition of done for this ORDER

- Traffic reinforces road hierarchy: from the village preset a resident perceives that Rv 244 carries most of the flow.
- Roads no longer read as a uniform asphalt grid: gravel and paved roads are visually separable at district zoom.
- Church, Måltidens Hus, Kärnhuset and the old station are individually identifiable at village zoom without relying on the label layer.
- Horizon reads as landscape depth rather than a flat pancake.
- Typecheck and build stay green.
- Every derived rule is documented in APPROXIMATION_REGISTER.

---

*Author: Claude Code, ORDER 019 auto-mode.*
